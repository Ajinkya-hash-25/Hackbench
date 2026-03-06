import { useState, useEffect } from 'react'
import { Binary, Copy, Check, ArrowRightLeft, FileText } from 'lucide-react'
import Button from '../components/common/Button'
import TextArea from '../components/common/TextArea'
import FileDropZone from '../components/common/FileDropZone'
import { copyToClipboard } from '../utils/clipboard'

type Mode = 'encode' | 'decode'

function Base64Tool() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<Mode>('encode')
  const [autoDetect, setAutoDetect] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const isBase64 = (str: string): boolean => {
    if (!str || str.length === 0) return false
    // Check if string matches base64 pattern
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    return base64Regex.test(str.replace(/\s/g, '')) && str.length % 4 === 0
  }

  // Auto-detect mode based on input
  useEffect(() => {
    if (autoDetect && input) {
      const trimmed = input.trim()
      if (isBase64(trimmed) && trimmed.length > 20) {
        setMode('decode')
      }
    }
  }, [input, autoDetect])

  // Auto-process on input change
  useEffect(() => {
    if (!input.trim()) {
      setOutput('')
      setError(null)
      return
    }

    try {
      if (mode === 'encode') {
        setOutput(encode(input))
        setError(null)
      } else {
        setOutput(decode(input))
        setError(null)
      }
    } catch (e) {
      setError((e as Error).message)
      setOutput('')
    }
  }, [input, mode])

  const encode = (text: string): string => {
    try {
      // Handle Unicode properly
      const encoder = new TextEncoder()
      const data = encoder.encode(text)
      let binary = ''
      data.forEach((byte) => {
        binary += String.fromCharCode(byte)
      })
      return btoa(binary)
    } catch {
      throw new Error('Failed to encode text')
    }
  }

  const decode = (base64: string): string => {
    try {
      const binary = atob(base64.trim())
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      const decoder = new TextDecoder()
      return decoder.decode(bytes)
    } catch {
      throw new Error('Invalid Base64 string')
    }
  }

  const handleProcess = () => {
    setError(null)
    if (!input.trim()) {
      setOutput('')
      return
    }

    try {
      if (mode === 'encode') {
        setOutput(encode(input))
      } else {
        setOutput(decode(input))
      }
    } catch (e) {
      setError((e as Error).message)
      setOutput('')
    }
  }

  const handleSwap = () => {
    setInput(output)
    setOutput(input)
    setMode(mode === 'encode' ? 'decode' : 'encode')
    setError(null)
  }

  const handleCopy = async () => {
    if (!output) return
    const success = await copyToClipboard(output)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFileSelect = async (file: File) => {
    setFileName(file.name)
    setError(null)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        // Remove data URL prefix to get just the base64
        const base64 = result.split(',')[1]
        setInput(base64)
        setMode('decode')
        setOutput('')
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Failed to read file')
    }
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
    setError(null)
    setFileName(null)
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Binary className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Base64 Encoder/Decoder</h2>
            <p className="text-xs text-[#666666]">Encode and decode Base64 strings</p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
          <input
            type="checkbox"
            checked={autoDetect}
            onChange={(e) => setAutoDetect(e.target.checked)}
            className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500/40"
          />
          Auto-detect mode
        </label>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex border border-[#2a2a2a] rounded-lg overflow-hidden">
          <button
            onClick={() => setMode('encode')}
            className={`px-4 py-2 text-sm font-medium ${
              mode === 'encode'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#222222]'
            }`}
          >
            Encode
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`px-4 py-2 text-sm font-medium ${
              mode === 'decode'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#222222]'
            }`}
          >
            Decode
          </button>
        </div>

        <Button onClick={handleProcess}>
          {mode === 'encode' ? 'Encode' : 'Decode'}
        </Button>

        <Button variant="secondary" onClick={handleSwap} disabled={!output}>
          <ArrowRightLeft className="w-4 h-4" />
          Swap
        </Button>

        <Button variant="secondary" onClick={handleClear}>
          Clear
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" onClick={handleCopy} disabled={!output}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#a0a0a0]">
              Input {mode === 'encode' ? '(Text)' : '(Base64)'}
              {fileName && (
                <span className="ml-2 text-[#555555]">
                  <FileText className="w-3 h-3 inline mr-1" />
                  {fileName}
                </span>
              )}
            </span>
          </div>
          <TextArea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setFileName(null)
            }}
            placeholder={
              mode === 'encode'
                ? 'Enter text to encode...'
                : 'Enter Base64 string to decode...'
            }
            mono
          />
          <FileDropZone
            onFileSelect={handleFileSelect}
            label="Drop file to convert to Base64"
            className="h-20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#a0a0a0]">
            Output {mode === 'encode' ? '(Base64)' : '(Text)'}
          </span>
          <TextArea
            value={output}
            readOnly
            placeholder="Result will appear here..."
            mono
          />
          {output && (
            <div className="text-xs text-[#555555]">
              {mode === 'encode'
                ? `${output.length} characters`
                : `${new TextEncoder().encode(output).length} bytes`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Base64Tool
