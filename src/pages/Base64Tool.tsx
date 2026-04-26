import { useState, useEffect, useMemo } from 'react'
import { Binary, Copy, Check, ArrowRightLeft, FileText, Search } from 'lucide-react'
import Button from '../components/common/Button'
import TextArea from '../components/common/TextArea'
import FileDropZone from '../components/common/FileDropZone'
import SearchBar from '../components/common/SearchBar'
import { useSearch } from '../hooks/useSearch'
import { highlightSearchTerm, computeLineMatchOffsets } from '../utils/search'
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

  const search = useSearch(output)
  const outputLines = useMemo(() => output.split('\n'), [output])
  const lineMatchData = useMemo(() => {
    if (!search.searchTerm || !search.isOpen) return null
    return computeLineMatchOffsets(outputLines, search.searchTerm, search.caseSensitive)
  }, [outputLines, search.searchTerm, search.caseSensitive, search.isOpen])

  const renderHighlightedLine = (line: string, lineIdx: number) => {
    if (!lineMatchData || !search.searchTerm) return line
    const info = lineMatchData[lineIdx]
    if (!info || info.count === 0) return line
    const { elements } = highlightSearchTerm(line, search.searchTerm, search.caseSensitive, info.offset, search.currentIndex)
    return elements
  }

  const isBase64 = (str: string): boolean => {
    if (!str || str.length < 24) return false
    const cleaned = str.replace(/\s/g, '')
    if (cleaned.length % 4 !== 0) return false
    // Must match base64 pattern AND contain non-alphanumeric base64 chars or padding
    // to reduce false positives on plain English text
    const base64Regex = /^[A-Za-z0-9+/]+=*$/
    if (!base64Regex.test(cleaned)) return false
    // Require at least one char that's only valid in base64, not plain text (+, /, or =)
    return /[+/=]/.test(cleaned)
  }

  // Auto-detect mode based on input
  useEffect(() => {
    if (autoDetect && input) {
      const trimmed = input.trim()
      if (isBase64(trimmed)) {
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
    <div className="h-full flex flex-col gap-4 overflow-hidden">
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
        <div className="flex flex-col gap-2 min-h-0">
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

        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#a0a0a0]">
              Output {mode === 'encode' ? '(Base64)' : '(Text)'}
            </span>
            {output && (
              <button
                onClick={search.open}
                className="flex items-center gap-1 px-2 py-1 text-xs text-[#666666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a] rounded transition-colors"
                title="Find in output (Ctrl+F)"
              >
                <Search className="w-3 h-3" />
              </button>
            )}
          </div>
          <div
            ref={search.scrollContainerRef}
            className="flex-1 w-full rounded-lg bg-[#111111] border border-[#2a2a2a] overflow-hidden flex flex-col min-h-0"
          >
            {search.isOpen && (
              <div className="sticky top-0 z-10 flex justify-end p-2 bg-[#111111]/80 backdrop-blur-sm border-b border-[#2a2a2a]">
                <SearchBar
                  isOpen={search.isOpen}
                  searchTerm={search.searchTerm}
                  onSearchChange={search.setSearchTerm}
                  currentMatch={search.currentIndex}
                  totalMatches={search.totalMatches}
                  onNext={search.goToNext}
                  onPrev={search.goToPrev}
                  onClose={search.close}
                  caseSensitive={search.caseSensitive}
                  onToggleCaseSensitive={search.toggleCaseSensitive}
                />
              </div>
            )}
            <div className="flex-1 overflow-auto px-3 py-3">
              {output ? (
                <pre className="font-mono text-sm leading-relaxed text-[#e0e0e0] whitespace-pre-wrap break-words m-0">
                  {search.isOpen && search.searchTerm
                    ? outputLines.map((line, idx) => (
                        <span key={idx}>
                          {renderHighlightedLine(line, idx)}
                          {idx < outputLines.length - 1 ? '\n' : ''}
                        </span>
                      ))
                    : output}
                </pre>
              ) : (
                <span className="font-mono text-sm text-[#555555]">Result will appear here...</span>
              )}
            </div>
          </div>
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
