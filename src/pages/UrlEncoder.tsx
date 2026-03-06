import { useState, useMemo, useEffect } from 'react'
import { Link2, Copy, Check, Trash2, ArrowRightLeft, Plus, X } from 'lucide-react'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

interface QueryParam {
  id: string
  key: string
  value: string
}

function UrlEncoder() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [copied, setCopied] = useState<string | null>(null)
  const [autoProcess, setAutoProcess] = useState(true)
  const [encodeComponent, setEncodeComponent] = useState(true)

  // URL Parser state
  const [urlInput, setUrlInput] = useState('')
  const [queryParams, setQueryParams] = useState<QueryParam[]>([])

  // Auto-process on input change
  useEffect(() => {
    if (!autoProcess || !input.trim()) {
      if (!input.trim()) setOutput('')
      return
    }

    try {
      if (mode === 'encode') {
        setOutput(encodeComponent ? encodeURIComponent(input) : encodeURI(input))
      } else {
        setOutput(encodeComponent ? decodeURIComponent(input) : decodeURI(input))
      }
    } catch (e) {
      setOutput(`Error: ${(e as Error).message}`)
    }
  }, [input, mode, autoProcess, encodeComponent])

  // Parse URL when URL input changes
  useEffect(() => {
    if (!urlInput.trim()) {
      setQueryParams([])
      return
    }

    try {
      const url = new URL(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`)
      const params: QueryParam[] = []
      url.searchParams.forEach((value, key) => {
        params.push({ id: crypto.randomUUID(), key, value })
      })
      setQueryParams(params)
    } catch {
      // Invalid URL, keep existing params
    }
  }, [urlInput])

  const parsedUrl = useMemo(() => {
    if (!urlInput.trim()) return null
    try {
      const url = new URL(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`)
      return {
        protocol: url.protocol,
        host: url.host,
        hostname: url.hostname,
        port: url.port,
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
        origin: url.origin
      }
    } catch {
      return null
    }
  }, [urlInput])

  const handleSwap = () => {
    setInput(output)
    setOutput(input)
    setMode(mode === 'encode' ? 'decode' : 'encode')
  }

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
  }

  // Query params management
  const addQueryParam = () => {
    setQueryParams([...queryParams, { id: crypto.randomUUID(), key: '', value: '' }])
  }

  const updateQueryParam = (id: string, field: 'key' | 'value', value: string) => {
    setQueryParams(queryParams.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const removeQueryParam = (id: string) => {
    setQueryParams(queryParams.filter(p => p.id !== id))
  }

  const buildUrl = useMemo(() => {
    if (!parsedUrl) return ''
    try {
      const url = new URL(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`)
      // Clear existing params
      url.search = ''
      // Add params from our state
      queryParams.forEach(({ key, value }) => {
        if (key.trim()) {
          url.searchParams.append(key, value)
        }
      })
      return url.toString()
    } catch {
      return ''
    }
  }, [urlInput, queryParams, parsedUrl])

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Link2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">URL Encoder/Decoder</h2>
            <p className="text-xs text-[#666666]">Encode, decode, and parse URLs</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Encode/Decode */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="flex bg-[#1a1a1a] rounded-md p-0.5">
              <button
                onClick={() => setMode('encode')}
                className={`px-3 py-1.5 text-sm rounded ${
                  mode === 'encode'
                    ? 'bg-[#222222] text-emerald-400'
                    : 'text-[#666666] hover:text-[#a0a0a0]'
                }`}
              >
                Encode
              </button>
              <button
                onClick={() => setMode('decode')}
                className={`px-3 py-1.5 text-sm rounded ${
                  mode === 'decode'
                    ? 'bg-[#222222] text-emerald-400'
                    : 'text-[#666666] hover:text-[#a0a0a0]'
                }`}
              >
                Decode
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
              <input
                type="checkbox"
                checked={encodeComponent}
                onChange={(e) => setEncodeComponent(e.target.checked)}
                className="rounded border-[#333333] bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500/40"
              />
              Component
            </label>

            <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
              <input
                type="checkbox"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="rounded border-[#333333] bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500/40"
              />
              Auto
            </label>

            <div className="flex-1" />

            <Button variant="ghost" size="sm" onClick={handleSwap} disabled={!output}>
              <ArrowRightLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#a0a0a0]">Input</span>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter URL-encoded text to decode...'}
              className="flex-1 w-full px-4 py-3 rounded-lg font-mono text-sm leading-relaxed bg-[#111111] border border-[#2a2a2a] text-[#e0e0e0] placeholder-[#444444] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#a0a0a0]">Output</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(output, 'output')}
                disabled={!output || output.startsWith('Error')}
              >
                {copied === 'output' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy
              </Button>
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="Result will appear here..."
              className={`flex-1 w-full px-4 py-3 rounded-lg font-mono text-sm leading-relaxed bg-[#111111] border border-[#2a2a2a] placeholder-[#444444] resize-none ${
                output.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'
              }`}
            />
          </div>

          {/* Reference */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3">
            <span className="text-xs text-[#666666] block mb-2">Common URL-encoded characters:</span>
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {[
                ['space', '%20'],
                ['!', '%21'],
                ['#', '%23'],
                ['$', '%24'],
                ['&', '%26'],
                ["'", '%27'],
                ['(', '%28'],
                [')', '%29'],
                ['*', '%2A'],
                ['+', '%2B'],
                ['/', '%2F'],
                [':', '%3A'],
                ['?', '%3F'],
                ['@', '%40'],
              ].map(([char, encoded]) => (
                <span key={char} className="px-2 py-1 bg-[#0a0a0a] rounded text-[#a0a0a0]">
                  {char} → <span className="text-emerald-400">{encoded}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: URL Parser */}
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-[#a0a0a0]">URL Parser & Builder</span>

          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL to parse (e.g., https://example.com/path?key=value)"
              className="flex-1 px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(buildUrl || urlInput, 'url')}
              disabled={!urlInput}
            >
              {copied === 'url' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>

          {parsedUrl && (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3">
              <span className="text-xs text-[#666666] mb-2 block">URL Components</span>
              <div className="space-y-1 text-xs font-mono">
                {Object.entries(parsedUrl).map(([key, value]) => (
                  value && (
                    <div key={key} className="flex">
                      <span className="w-20 text-[#666666]">{key}:</span>
                      <span className="text-emerald-400 break-all">{value}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters */}
          <div className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#666666]">Query Parameters</span>
              <Button variant="ghost" size="sm" onClick={addQueryParam}>
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>

            <div className="flex-1 overflow-auto space-y-2">
              {queryParams.length === 0 ? (
                <div className="text-xs text-[#444444] text-center py-4">
                  No query parameters. Click "Add" to create one.
                </div>
              ) : (
                queryParams.map((param) => (
                  <div key={param.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => updateQueryParam(param.id, 'key', e.target.value)}
                      placeholder="key"
                      className="w-1/3 px-2 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-[#e0e0e0] placeholder-[#444444] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                    />
                    <span className="text-[#666666]">=</span>
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => updateQueryParam(param.id, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 px-2 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-[#e0e0e0] placeholder-[#444444] font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                    />
                    <button
                      onClick={() => removeQueryParam(param.id)}
                      className="p-1 hover:bg-[#1a1a1a] rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-[#666666]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Built URL */}
          {buildUrl && (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#666666]">Built URL</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(buildUrl, 'builtUrl')}
                >
                  {copied === 'builtUrl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              <code className="text-xs text-emerald-400 font-mono break-all block">
                {buildUrl}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UrlEncoder
