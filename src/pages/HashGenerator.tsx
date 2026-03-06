import { useState, useEffect } from 'react'
import { Hash, Copy, Check, FileText, CheckCircle2, XCircle } from 'lucide-react'
import Button from '../components/common/Button'
import FileDropZone from '../components/common/FileDropZone'
import { hashText, hashFile, compareHashes, HASH_ALGORITHMS, HashAlgorithm } from '../utils/hash'
import { copyToClipboard } from '../utils/clipboard'

interface HashResult {
  algorithm: HashAlgorithm
  hash: string
}

function HashGenerator() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<HashResult[]>([])
  const [compareHash, setCompareHash] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<HashAlgorithm>('SHA256')

  // Auto-hash on input change
  useEffect(() => {
    if (!input.trim()) {
      setResults([])
      return
    }

    setResults([{
      algorithm: selectedAlgorithm,
      hash: hashText(input, selectedAlgorithm)
    }])
  }, [input, selectedAlgorithm])

  const handleGenerateHash = () => {
    if (!input.trim()) {
      setResults([])
      return
    }

    setResults([{
      algorithm: selectedAlgorithm,
      hash: hashText(input, selectedAlgorithm)
    }])
  }

  const handleFileSelect = async (file: File) => {
    setFileName(file.name)
    setIsProcessing(true)
    setInput('')

    try {
      const hash = await hashFile(file, selectedAlgorithm)
      setResults([{ algorithm: selectedAlgorithm, hash }])
    } catch (error) {
      console.error('Failed to hash file:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async (hash: string, algorithm: string) => {
    const success = await copyToClipboard(hash)
    if (success) {
      setCopied(algorithm)
      setTimeout(() => setCopied(null), 2000)
    }
  }


  const selectAlgorithm = (algo: HashAlgorithm) => {
    setSelectedAlgorithm(algo)
    setResults([]) // Clear results when algorithm changes
  }

  const handleClear = () => {
    setInput('')
    setResults([])
    setCompareHash('')
    setFileName(null)
  }

  const getComparisonResult = () => {
    if (!compareHash.trim() || results.length === 0) return null

    const matchingAlgo = results.find((r) =>
      compareHashes(r.hash, compareHash)
    )

    return matchingAlgo
  }

  const comparisonResult = getComparisonResult()

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Hash className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Hash Generator</h2>
            <p className="text-xs text-[#666666]">Generate MD5, SHA-1, SHA-256, SHA-512 hashes</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-[#666666] mr-2">Algorithm:</span>
        <div className="flex bg-[#1a1a1a] rounded-md p-0.5">
          {HASH_ALGORITHMS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => selectAlgorithm(value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                selectedAlgorithm === value
                  ? 'bg-[#222222] text-emerald-400'
                  : 'text-[#666666] hover:text-[#a0a0a0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button variant="ghost" onClick={handleClear}>
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#a0a0a0]">
                Text Input
                {fileName && (
                  <span className="ml-2 text-[#666666]">
                    <FileText className="w-3 h-3 inline mr-1" />
                    {fileName}
                  </span>
                )}
              </span>
              <Button size="sm" onClick={handleGenerateHash} disabled={!input.trim()}>
                Generate Hash
              </Button>
            </div>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                setFileName(null)
              }}
              placeholder="Enter text to hash..."
              className="flex-1 w-full px-4 py-3 rounded-lg font-mono text-sm leading-relaxed bg-[#111111] border border-[#2a2a2a] text-[#e0e0e0] placeholder-[#444444] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/50 resize-none"
            />
          </div>

          <FileDropZone
            onFileSelect={handleFileSelect}
            label={isProcessing ? 'Processing...' : 'Drop file here to hash'}
            className="h-20"
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#a0a0a0]">Compare Hash</span>
            <input
              type="text"
              value={compareHash}
              onChange={(e) => setCompareHash(e.target.value)}
              placeholder="Paste hash to compare..."
              className="px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
            {compareHash && results.length > 0 && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  comparisonResult
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                {comparisonResult ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">Match!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">No match</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#a0a0a0]">Hash Result</span>

          <div className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-auto">
            {results.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#666666] text-sm">
                Enter text or drop a file to generate hash
              </div>
            ) : (
              <div className="p-4">
                {results.map(({ algorithm, hash }) => {
                  const algoInfo = HASH_ALGORITHMS.find((a) => a.value === algorithm)
                  const isMatch = compareHash && compareHashes(hash, compareHash)

                  return (
                    <div key={algorithm} className={`${isMatch ? 'bg-emerald-500/5 -m-4 p-4 rounded-lg' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-[#a0a0a0]">
                          {algoInfo?.label}
                          <span className="text-[#666666] ml-2">({algoInfo?.length} chars)</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(hash, algorithm)}
                        >
                          {copied === algorithm ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          Copy
                        </Button>
                      </div>
                      <code className="text-sm font-mono text-emerald-400 break-all block p-3 bg-[#0a0a0a] rounded-lg">
                        {hash}
                      </code>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HashGenerator
