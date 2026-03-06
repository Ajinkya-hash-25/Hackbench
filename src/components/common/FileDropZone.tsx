import { useCallback, useState, DragEvent } from 'react'
import { Upload } from 'lucide-react'

interface FileDropZoneProps {
  onFileSelect: (file: File) => void
  accept?: string
  label?: string
  className?: string
}

function FileDropZone({ onFileSelect, accept, label = 'Drop file here or click to browse', className = '' }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        onFileSelect(file)
      }
    }
    input.click()
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex flex-col items-center justify-center gap-3 p-6
        border-2 border-dashed rounded-lg cursor-pointer
        transition-colors
        ${isDragging
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-[#2a2a2a] hover:border-[#333333] bg-[#111111]/50'
        }
        ${className}
      `}
    >
      <Upload className={`w-6 h-6 ${isDragging ? 'text-emerald-400' : 'text-[#666666]'}`} />
      <p className={`text-sm ${isDragging ? 'text-emerald-400' : 'text-[#666666]'}`}>
        {label}
      </p>
    </div>
  )
}

export default FileDropZone
