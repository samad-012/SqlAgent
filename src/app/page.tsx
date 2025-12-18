// src/app/page.tsx

'use client'

import { useState } from 'react'
import Navbar from './components/navbar'
import Input from './components/input'
import SubmitButton from './components/button'
import ResultTable from './components/ResultTable'

// A new component to display simple text results nicely
function SimpleResult({ text }: { text: string }) {
  return (
    <div className="p-4 bg-gray-900 rounded-md shadow border border-gray-700">
      {/* whitespace-pre-wrap preserves newlines and formatting from the agent's response */}
      <p className="text-white whitespace-pre-wrap">{text}</p>
    </div>
  )
}
type RowData = { [key: string]: string | number | null | undefined }

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<RowData[] | string | null>(null)
  const handleResult = (apiOutput: string) => {
    try {
      const parsed = JSON.parse(apiOutput)
      if (Array.isArray(parsed)) {
        setResult(parsed as RowData[])
      } else {
        setResult(apiOutput)
      }
    } catch (err) {
      console.log('Result is not a JSON array, treating as plain text.')
      setResult(apiOutput)
    }
  }

  return (
    <div className='min-h-screen bg-black text-white'>
      <Navbar />
      <div className='flex flex-col items-center justify-center w-full min-h-[calc(100vh-64px)] px-4 py-8'>
        <h1 className='text-2xl font-semibold mb-6 text-center'>
          Upload Your Dataset to Get Started
        </h1>
        <div className='w-full max-w-xl mx-auto space-y-4'>
          <Input
            onFileChange={setFile}
            onQueryChange={setQuery}
            queryValue={query}
          />
          <SubmitButton
            file={file}
            query={query}
            onResult={(res) => {
              setResult(null); // Clear old results first
              handleResult(res);
            }}
          />
        </div>

        {/* This logic now correctly renders either a Table or a simple Text box */}
        {result && (
          <div className='mt-8 w-full max-w-5xl px-4'>
            <h2 className="text-xl font-bold mb-4 text-center">Result</h2>
            {Array.isArray(result) ? (
              <ResultTable data={result} />
            ) : (
              <SimpleResult text={result} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}