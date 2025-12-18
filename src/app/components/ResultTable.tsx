'use client';

interface ResultTableProps {
  data: any[];
}

export default function ResultTable({ data }: ResultTableProps) {
  if (!Array.isArray(data) || data.length === 0) {
    return <p className="text-center text-gray-400 mt-4">No data to display.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-auto rounded-md shadow border border-gray-700">
      <table className="min-w-full divide-y divide-gray-600 text-sm text-left text-white">
        <thead className="bg-gray-800">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium text-gray-300">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-700">
          {data.map((row, i) => (
            <tr key={i}>
              {headers.map((header) => (
                <td key={header} className="px-4 py-2 whitespace-nowrap">
                  {row[header] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}