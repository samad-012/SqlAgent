export const runtime = 'nodejs';

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Tool } from "@langchain/core/tools";
import { AgentExecutor, createToolCallingAgent } from "@langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import fs from "fs";
import path from "path";
import os from "os";
import busboy from "busboy";
import { parse } from "csv-parse/sync";
import { NextResponse } from "next/server";
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

let db: Awaited<ReturnType<typeof open>>;

// A simple type definition for our parsed CSV records.
interface CsvRecord { [key: string]: string | null; }

class CustomSqlTool extends Tool {
    name = "sql-query-tool";
    description = "Useful for running a SQL query against the database to answer a question. Input should be a valid SQL query.";
    

    constructor() { super(); }

    async _call(input: string): Promise<string> {
        console.log(`[CustomSqlTool] Executing: ${input}`);
        try {
            const result = await db.all(input);
            return JSON.stringify(result);
        } catch (error) {
            if (error instanceof Error) { return `[CustomSqlTool] Error: ${error.message}`; }
            return "[CustomSqlTool] An unknown error occurred.";
        }
    }
}

const parseFormWithBusboy = (req: Request): Promise<{ fields: { [key: string]: string }, filePath: string }> => {
    return new Promise((resolve, reject) => {
        const headers = req.headers;
        const bb = busboy({ headers: { 'content-type': headers.get('content-type') ?? '' } });
        const fields: { [key: string]: string } = {};
        let filePath = '';
        let fileSavePromise: Promise<void> | null = null;

        bb.on('field', (name, val) => { fields[name] = val; });
        bb.on('file', (name, fileStream, info) => {
            if (name === 'file') {
                const tempFilePath = path.join(os.tmpdir(), `upload-${Date.now()}-${info.filename}`);
                filePath = tempFilePath;
                const writeStream = fs.createWriteStream(tempFilePath);
                fileSavePromise = new Promise((resolveFile, rejectFile) => {
                    writeStream.on('finish', resolveFile);
                    writeStream.on('error', rejectFile);
                });
                fileStream.pipe(writeStream);
            } else { fileStream.resume(); }
        });

        bb.on('close', async () => {
            if (fileSavePromise) {
                try {
                    await fileSavePromise;
                    resolve({ fields, filePath });
                } catch (err) { reject(err); }
            } else { reject(new Error("No file named 'file' was found in the form.")); }
        });

        bb.on('error', (err) => reject(err));

        (async () => {
          if (req.body) {
            const reader = req.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              bb.write(value);
            }
            bb.end();
          }
        })();
    });
};

export async function POST(req: Request) {
  let tempFilePath: string | undefined;
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("CRITICAL: GOOGLE_API_KEY is not defined in the environment. Check your .env.local file and restart the server.");
    }
    const { fields, filePath } = await parseFormWithBusboy(req);
    tempFilePath = filePath;
    const command = fields.command;
    if (!filePath || !command) {
      return NextResponse.json({ error: "A file and a command are required." }, { status: 400 });
    }
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records: CsvRecord[] = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true })
      .filter((record: CsvRecord) => Object.values(record).some(value => value !== null && value !== ''));
    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or contains no valid data rows." }, { status: 400 });
    }
    const originalHeaders = Object.keys(records[0]);
    const columnMapping = originalHeaders
        .map(header => ({
            original: header,
            sanitized: header.replace(/[^a-zA-Z0-9_]/g, '')
        }))
        .filter(mapping => mapping.sanitized.length > 0);
    if (columnMapping.length === 0) {
        return NextResponse.json({ error: "All column headers in the CSV were invalid or empty after sanitization." }, { status: 400 });
    }

    db = await open({ filename: ':memory:', driver: sqlite3.Database });
    const sanitizedDbColumns = columnMapping.map((m) => m.sanitized);
    const tableName = "dataset";
    const createTableQuery = `CREATE TABLE "${tableName}" (${sanitizedDbColumns.map(col => `"${col}" TEXT`).join(", ")});`;
    await db.exec(createTableQuery);
    const insertQuery = `INSERT INTO "${tableName}" ("${sanitizedDbColumns.join('", "')}") VALUES (${sanitizedDbColumns.map(() => '?').join(',')});`;
    await db.exec('BEGIN');
    for (const record of records) {
        const values = columnMapping.map(mapping => record[mapping.original]);
        await db.run(insertQuery, values);
    }
    await db.exec('COMMIT');
    console.log(`Successfully loaded ${records.length} records into in-memory table '${tableName}'.`);


    const llm = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: "gemini-1.5-flash-latest",
      temperature: 0,
    });
    const tools = [new CustomSqlTool()];
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are a SQL data assistant. A user has provided a dataset in a table named "dataset". The table has the following columns: ${sanitizedDbColumns.join(", ")}. Your task is to answer the user's question about this data by generating and executing a SQL query.`],
      ["user", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    
    const agent = await createToolCallingAgent({ llm, tools, prompt });
    const agentExecutor = new AgentExecutor({ agent, tools, verbose: true });
    
    const result = await agentExecutor.invoke({ input: command });

    return NextResponse.json({
      sqlQuery: "Extracted from agent's thoughts (see server log)",
      data: result.output,
    });
  } catch (error) {
    console.error("API Route Error:", error);
    const errorMessage = error instanceof Error ? `An error occurred: ${error.message}` : "An unknown error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    if (db) {
      await db.close();
      console.log("In-memory database connection closed.");
    }
    if (tempFilePath) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error("Error deleting temporary file:", err);
        else console.log("Temporary file deleted successfully:", tempFilePath);
      });
    }
  }
}