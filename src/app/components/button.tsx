'use client';
import { useState } from 'react';

interface SubmitButtonProps {
  file: File | null;
  query: string;
  onResult: (result: string) => void;
}

export default function SubmitButton({ file, query, onResult }: SubmitButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!file || !query) {
      setError("Both file and query are required.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('command', query);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Unknown error from backend.');
        return;
      }

      // Ensure output is valid JSON
      let parsedOutput: string;
      if (typeof result.data === 'string') {
        parsedOutput = result.data;
      } else {
        parsedOutput = JSON.stringify(result.data);
      }

      onResult(parsedOutput);
    } catch (err) {
      console.error("Error submitting data:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-2">
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Run Query'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}