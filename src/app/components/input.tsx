'use client'
import { useRef, useState } from 'react'

interface CombinedInputProps {
  onFileChange: (file: File) => void
  onQueryChange: (query: string) => void
  queryValue: string
}

export default function Input({
  onFileChange,
  onQueryChange,
  queryValue,
}: CombinedInputProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileUploaded, setFileUploaded] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileUpload = (file: File) => {
    onFileChange(file)
    setFileUploaded(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0])
    }
  }

  return (
    <div className="w-full justify-center">
      <div
        className={`w-full max-w-xl min-h-30 p-6 border-2 rounded-xl transition-all duration-200 flex items-center justify-center text-center ${
          isDragOver
            ? 'border-blue-500 bg-blue-100/40'
            : 'border-dashed border-gray-400 bg-transparent'
        }`}
        onClick={() => {
          if (!fileUploaded) fileInputRef.current?.click()
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!fileUploaded ? (
          <div>
            <div className="text-3xl mb-2"></div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Click or drag & drop your dataset file here
            </p>
            <p className="text-xs text-gray-400 mt-1">(CSV, JSON, Excel, etc.)</p>
          </div>
        ) : (
          <textarea
            value={queryValue}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Write your question or SQL command here..."
            rows={4}
            className="w-full h-full border-none outline-none resize-none text-center font-medium bg-transparent text-black dark:text-white"
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json,.xlsx"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  )
}