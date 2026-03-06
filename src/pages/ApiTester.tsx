import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  Send, Loader2, Copy, Check, Trash2, Plus, FileOutput,
  Search, Wand2, X, ChevronUp, ChevronDown, Terminal, Minimize2,
} from 'lucide-react'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type BodyType = 'none' | 'json' | 'form-data'

interface KeyValuePair {
  id: string
  key: string
  value: string
  enabled: boolean
}

interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  time: number
  size: number
}

const methodColors: Record<HttpMethod, string> = {
  GET: '#4ade80',
  POST: '#60a5fa',
  PUT: '#fbbf24',
  PATCH: '#c084fc',
  DELETE: '#f87171',
}

const validMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function escapeRegexChars(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const MAX_HIGHLIGHT_SIZE = 100 * 1024

// --- JSON syntax highlighting ---
function syntaxHighlightJson(text: string): React.ReactNode[] {
  if (text.length > MAX_HIGHLIGHT_SIZE) return [text]

  const elements: React.ReactNode[] = []
  const tokenRegex = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(\btrue\b|\bfalse\b)|(\bnull\b)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index))
    }
    if (match[1] && match[2]) {
      elements.push(<span key={key++} className="json-key">{match[1]}</span>)
      elements.push(match[2])
    } else if (match[1]) {
      elements.push(<span key={key++} className="json-string">{match[1]}</span>)
    } else if (match[3] !== undefined) {
      elements.push(<span key={key++} className="json-number">{match[0]}</span>)
    } else if (match[4] !== undefined) {
      elements.push(<span key={key++} className="json-boolean">{match[0]}</span>)
    } else if (match[5] !== undefined) {
      elements.push(<span key={key++} className="json-null">{match[0]}</span>)
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex))
  }
  return elements
}

// --- Search highlighting ---
function renderSearchHighlighted(
  text: string,
  query: string,
  currentIdx: number,
): { nodes: React.ReactNode[]; count: number } {
  if (!query.trim()) return { nodes: [text], count: 0 }

  const escaped = escapeRegexChars(query)
  let regex: RegExp
  try {
    regex = new RegExp(escaped, 'gi')
  } catch {
    return { nodes: [text], count: 0 }
  }

  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let matchIdx = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match[0].length === 0) { regex.lastIndex++; continue }
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }
    const isCurrent = matchIdx === currentIdx
    nodes.push(
      <mark
        key={`m-${matchIdx}`}
        data-search-match=""
        {...(isCurrent ? { 'data-current-match': '' } : {})}
        className={isCurrent
          ? 'bg-amber-400/60 text-white rounded-sm'
          : 'bg-amber-500/20 text-amber-200 rounded-sm'}
      >
        {match[0]}
      </mark>,
    )
    lastIndex = regex.lastIndex
    matchIdx++
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }
  return { nodes, count: matchIdx }
}

// --- cURL parser ---
function parseCurl(curlStr: string): {
  method: HttpMethod
  url: string
  headers: KeyValuePair[]
  bodyType: BodyType
  body: string
} | null {
  const s = curlStr.trim()
  if (!s.toLowerCase().startsWith('curl')) return null

  const normalized = s.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ')

  let method: HttpMethod = 'GET'
  let url = ''
  const headers: KeyValuePair[] = []
  let body = ''
  let bodyType: BodyType = 'none'

  const tokens: string[] = []
  let i = 0
  while (i < normalized.length) {
    while (i < normalized.length && normalized[i] === ' ') i++
    if (i >= normalized.length) break

    let token = ''
    if (normalized[i] === "'" || normalized[i] === '"') {
      const quote = normalized[i]
      i++
      while (i < normalized.length && normalized[i] !== quote) {
        if (normalized[i] === '\\' && i + 1 < normalized.length) {
          token += normalized[i + 1]
          i += 2
        } else {
          token += normalized[i]
          i++
        }
      }
      i++
    } else {
      while (i < normalized.length && normalized[i] !== ' ') {
        token += normalized[i]
        i++
      }
    }
    tokens.push(token)
  }

  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t]
    if (tok === 'curl') continue

    if ((tok === '-X' || tok === '--request') && t + 1 < tokens.length) {
      const m = tokens[++t].toUpperCase()
      if (validMethods.has(m)) method = m as HttpMethod
    } else if ((tok === '-H' || tok === '--header') && t + 1 < tokens.length) {
      const hval = tokens[++t]
      const colonIdx = hval.indexOf(':')
      if (colonIdx > 0) {
        headers.push({
          id: crypto.randomUUID(),
          key: hval.slice(0, colonIdx).trim(),
          value: hval.slice(colonIdx + 1).trim(),
          enabled: true,
        })
      }
    } else if ((tok === '-d' || tok === '--data' || tok === '--data-raw' || tok === '--data-binary') && t + 1 < tokens.length) {
      body = tokens[++t]
      bodyType = 'json'
      if (method === 'GET') method = 'POST'
    } else if (tok.startsWith('http://') || tok.startsWith('https://')) {
      url = tok
    } else if (!tok.startsWith('-') && !url && t > 0) {
      if (tok.includes('.') || tok.includes('localhost')) {
        url = tok
      }
    }
  }

  if (!url) return null
  return { method, url, headers, bodyType, body }
}

// --- cURL exporter ---
function exportCurl(
  method: HttpMethod,
  url: string,
  headers: KeyValuePair[],
  bodyType: BodyType,
  body: string,
): string {
  const parts: string[] = ['curl']
  if (method !== 'GET') parts.push(`-X ${method}`)
  parts.push(`'${url}'`)
  headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
    parts.push(`-H '${h.key}: ${h.value}'`)
  })
  if (method !== 'GET' && bodyType !== 'none' && body.trim()) {
    parts.push(`-d '${body.replace(/'/g, "'\\''")}'`)
  }
  return parts.join(' \\\n  ')
}

function ApiTester() {
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('')
  const [headers, setHeaders] = useState<KeyValuePair[]>([
    { id: crypto.randomUUID(), key: 'Content-Type', value: 'application/json', enabled: true },
  ])
  const [bodyType, setBodyType] = useState<BodyType>('none')
  const [bodyContent, setBodyContent] = useState('')
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'headers' | 'body'>('headers')
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body')
  const [copied, setCopied] = useState(false)
  const [curlCopied, setCurlCopied] = useState(false)

  // New states
  const [curlImported, setCurlImported] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchVisible, setSearchVisible] = useState(false)
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0)

  const rootRef = useRef<HTMLDivElement>(null)
  const responseBodyRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const sendRef = useRef<() => void>(() => {})

  const formattedResponseBody = useMemo(() => {
    if (!response?.body) return ''
    try {
      return JSON.stringify(JSON.parse(response.body), null, 2)
    } catch {
      return response.body
    }
  }, [response])

  const isJsonResponse = useMemo(() => {
    if (!response?.body) return false
    try { JSON.parse(response.body); return true } catch { return false }
  }, [response])

  // Search results
  const searchResults = useMemo(() => {
    if (!searchVisible || !searchQuery.trim() || !formattedResponseBody) {
      return { nodes: null as React.ReactNode[] | null, count: 0 }
    }
    return renderSearchHighlighted(formattedResponseBody, searchQuery, currentMatchIdx)
  }, [searchVisible, searchQuery, formattedResponseBody, currentMatchIdx])

  // Reset match index when query changes
  useEffect(() => {
    setCurrentMatchIdx(0)
  }, [searchQuery])

  // Scroll current match into view
  useEffect(() => {
    if (!responseBodyRef.current || searchResults.count === 0) return
    const current = responseBodyRef.current.querySelector('[data-current-match]')
    if (current) {
      current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentMatchIdx, searchResults.count])

  const handleSend = useCallback(async () => {
    if (!url.trim() || loading) return

    setLoading(true)
    setError(null)
    setResponse(null)
    setSearchVisible(false)
    setSearchQuery('')

    const startTime = performance.now()

    try {
      const requestHeaders: Record<string, string> = {}
      headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
        requestHeaders[h.key] = h.value
      })

      const options: RequestInit = {
        method,
        headers: requestHeaders,
      }

      if (method !== 'GET' && bodyType !== 'none' && bodyContent.trim()) {
        options.body = bodyContent
      }

      const res = await fetch(url, options)
      const endTime = performance.now()
      const responseText = await res.text()

      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseText,
        time: Math.round(endTime - startTime),
        size: new Blob([responseText]).size,
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [url, method, headers, bodyType, bodyContent, loading])

  // Keep ref in sync for keyboard handler
  useEffect(() => {
    sendRef.current = handleSend
  }, [handleSend])

  // Global keyboard shortcuts (only when this tool is visible)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!rootRef.current || rootRef.current.offsetParent === null) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        sendRef.current()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setSearchVisible(true)
        setTimeout(() => searchInputRef.current?.focus(), 0)
      }
      if (e.key === 'Escape' && searchVisible) {
        setSearchVisible(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchVisible])

  // Smart cURL paste in URL bar
  const handleUrlPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain').trim()
    if (text.toLowerCase().startsWith('curl ')) {
      e.preventDefault()
      const result = parseCurl(text)
      if (result) {
        setMethod(result.method)
        setUrl(result.url)
        if (result.headers.length > 0) setHeaders(result.headers)
        setBodyType(result.bodyType)
        setBodyContent(result.body)
        setCurlImported(true)
        setTimeout(() => setCurlImported(false), 3000)
      }
    }
  }

  // Beautify / compact JSON body
  const handleBeautify = () => {
    try { setBodyContent(JSON.stringify(JSON.parse(bodyContent), null, 2)) } catch { /* invalid */ }
  }
  const handleCompact = () => {
    try { setBodyContent(JSON.stringify(JSON.parse(bodyContent))) } catch { /* invalid */ }
  }

  // Search navigation
  const searchNext = () => {
    if (searchResults.count > 0) setCurrentMatchIdx(prev => (prev + 1) % searchResults.count)
  }
  const searchPrev = () => {
    if (searchResults.count > 0) setCurrentMatchIdx(prev => (prev - 1 + searchResults.count) % searchResults.count)
  }

  const addHeader = () => {
    setHeaders(prev => [...prev, { id: crypto.randomUUID(), key: '', value: '', enabled: true }])
  }
  const removeHeader = (id: string) => {
    setHeaders(prev => prev.filter(h => h.id !== id))
  }
  const updateHeader = (id: string, field: 'key' | 'value', value: string) => {
    setHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h))
  }
  const toggleHeader = (id: string) => {
    setHeaders(prev => prev.map(h => h.id === id ? { ...h, enabled: !h.enabled } : h))
  }

  const handleCopyResponse = async () => {
    if (formattedResponseBody && await copyToClipboard(formattedResponseBody)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleExportCurl = async () => {
    const curl = exportCurl(method, url, headers, bodyType, bodyContent)
    if (await copyToClipboard(curl)) {
      setCurlCopied(true)
      setTimeout(() => setCurlCopied(false), 2000)
    }
  }

  return (
    <div ref={rootRef} className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Send className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">API Tester</h2>
            <p className="text-xs text-[#666666]">Send HTTP requests and inspect responses &middot; Powered by fetch()</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {curlImported && (
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 rounded-md border border-emerald-500/20 animate-slide-up">
              <Terminal className="w-3.5 h-3.5" /> cURL imported
            </span>
          )}
          <button
            onClick={handleExportCurl}
            disabled={!url.trim()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md text-[#666666] hover:text-[#a0a0a0] bg-[#1a1a1a] border border-[#2a2a2a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {curlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileOutput className="w-3.5 h-3.5" />}
            {curlCopied ? 'Copied!' : 'Export cURL'}
          </button>
        </div>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as HttpMethod)}
          className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          style={{ color: methodColors[method] }}
        >
          {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handleUrlPaste}
          placeholder="Enter URL or paste cURL command"
          className="flex-1 px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.ctrlKey) handleSend() }}
        />

        <Button onClick={handleSend} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Sending...' : 'Send'}
        </Button>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="flex items-center gap-3 text-[10px] text-[#444444] -mt-1">
        <span>
          <kbd className="px-1 py-0.5 bg-[#0a0a0a] rounded border border-[#2a2a2a] text-[#555555]">Ctrl+Enter</kbd> Send
        </span>
        <span>
          <kbd className="px-1 py-0.5 bg-[#0a0a0a] rounded border border-[#2a2a2a] text-[#555555]">Ctrl+F</kbd> Find in response
        </span>
        <span className="text-[#333333]">&middot;</span>
        <span>Paste cURL to auto-import</span>
      </div>

      {/* Request/Response grid */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Request */}
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-md p-0.5">
            {(['headers', 'body'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded text-xs font-medium capitalize ${
                  activeTab === tab ? 'bg-[#1a1a1a] text-white' : 'text-[#666666] hover:text-[#a0a0a0]'
                }`}
              >
                {tab === 'headers' ? `Headers (${headers.filter(h => h.enabled).length})` : tab}
              </button>
            ))}
          </div>

          {activeTab === 'headers' && (
            <div className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-auto p-3">
              <div className="space-y-2">
                {headers.map(header => (
                  <div key={header.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={header.enabled}
                      onChange={() => toggleHeader(header.id)}
                      className="rounded border-[#333333] bg-[#1a1a1a] text-emerald-500 w-4 h-4 accent-emerald-500"
                    />
                    <input
                      type="text"
                      value={header.key}
                      placeholder="Key"
                      onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-sm text-[#e0e0e0] placeholder-[#444444] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                    />
                    <input
                      type="text"
                      value={header.value}
                      placeholder="Value"
                      onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-sm text-[#e0e0e0] placeholder-[#444444] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                    />
                    <button
                      onClick={() => removeHeader(header.id)}
                      className="p-1 text-[#555555] hover:text-red-400 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addHeader}
                className="mt-2 flex items-center gap-1.5 text-xs text-[#666666] hover:text-emerald-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Header
              </button>
            </div>
          )}

          {activeTab === 'body' && (
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <div className="flex items-center gap-2">
                {(['none', 'json', 'form-data'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setBodyType(type)}
                    className={`px-3 py-1 text-xs rounded capitalize ${
                      bodyType === type
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#1a1a1a] text-[#666666] border border-[#2a2a2a] hover:text-[#a0a0a0]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
                {bodyType === 'json' && bodyContent.trim() && (
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={handleBeautify}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded text-[#666666] hover:text-emerald-400 transition-colors"
                      title="Beautify JSON"
                    >
                      <Wand2 className="w-3 h-3" /> Beautify
                    </button>
                    <button
                      onClick={handleCompact}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded text-[#666666] hover:text-emerald-400 transition-colors"
                      title="Compact JSON"
                    >
                      <Minimize2 className="w-3 h-3" /> Compact
                    </button>
                  </div>
                )}
              </div>
              {bodyType !== 'none' ? (
                <textarea
                  value={bodyContent}
                  onChange={(e) => setBodyContent(e.target.value)}
                  placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'key=value&key2=value2'}
                  className="flex-1 w-full px-4 py-3 rounded-lg font-mono text-sm leading-relaxed bg-[#111111] border border-[#2a2a2a] text-[#e0e0e0] placeholder-[#444444] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none overflow-auto"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center bg-[#111111] border border-[#2a2a2a] rounded-lg text-[#444444] text-sm">
                  No body for this request
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Response */}
        <div className="flex flex-col gap-2 min-h-0">
          {/* Status bar */}
          {response && (
            <div className="flex items-center gap-3 px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg">
              <span className={`text-sm font-semibold ${
                response.status < 300 ? 'text-emerald-400' :
                response.status < 400 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {response.status} {response.statusText}
              </span>
              <span className="text-xs text-[#666666]">{response.time}ms</span>
              <span className="text-xs text-[#666666]">{formatSize(response.size)}</span>
              <div className="flex-1" />
              <button
                onClick={() => {
                  if (searchVisible) {
                    setSearchVisible(false)
                    setSearchQuery('')
                  } else {
                    setSearchVisible(true)
                    setTimeout(() => searchInputRef.current?.focus(), 0)
                  }
                }}
                className={`p-1 transition-colors ${searchVisible ? 'text-emerald-400' : 'text-[#666666] hover:text-white'}`}
                title="Find in response (Ctrl+F)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleCopyResponse} className="p-1 text-[#666666] hover:text-white transition-colors" title="Copy response">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* Search bar */}
          {searchVisible && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
              <Search className="w-3.5 h-3.5 text-[#555555] flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in response..."
                className="flex-1 bg-transparent text-sm text-[#e0e0e0] placeholder-[#444444] focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.shiftKey ? searchPrev() : searchNext()
                  }
                  if (e.key === 'Escape') {
                    setSearchVisible(false)
                    setSearchQuery('')
                  }
                }}
              />
              {searchQuery && (
                <span className="text-xs text-[#666666] flex-shrink-0">
                  {searchResults.count > 0
                    ? `${currentMatchIdx + 1}/${searchResults.count}`
                    : 'No matches'}
                </span>
              )}
              <button onClick={searchPrev} disabled={searchResults.count === 0} className="p-0.5 text-[#555555] hover:text-white disabled:opacity-30 transition-colors">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button onClick={searchNext} disabled={searchResults.count === 0} className="p-0.5 text-[#555555] hover:text-white disabled:opacity-30 transition-colors">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setSearchVisible(false); setSearchQuery('') }}
                className="p-0.5 text-[#555555] hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Response tabs */}
          <div className="flex items-center gap-1 bg-[#0a0a0a] rounded-md p-0.5">
            {(['body', 'headers'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setResponseTab(tab)}
                className={`px-3 py-1.5 rounded text-xs font-medium capitalize ${
                  responseTab === tab ? 'bg-[#1a1a1a] text-white' : 'text-[#666666] hover:text-[#a0a0a0]'
                }`}
              >
                {tab === 'headers' && response ? `Headers (${Object.keys(response.headers).length})` : tab}
              </button>
            ))}
          </div>

          {/* Response body */}
          <div ref={responseBodyRef} className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-auto">
            {error ? (
              <div className="p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  <p className="text-red-400 text-sm font-medium">Request Failed</p>
                  <p className="text-red-400/70 text-xs mt-1">{error}</p>
                </div>
              </div>
            ) : response ? (
              responseTab === 'body' ? (
                <pre className="p-4 font-mono text-sm text-[#e0e0e0] whitespace-pre-wrap break-words">
                  {searchVisible && searchQuery.trim()
                    ? searchResults.nodes
                    : isJsonResponse
                      ? syntaxHighlightJson(formattedResponseBody)
                      : formattedResponseBody}
                </pre>
              ) : (
                <div className="p-4 space-y-1">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-sm">
                      <span className="text-emerald-400 font-mono">{key}:</span>
                      <span className="text-[#a0a0a0] font-mono break-all">{value}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-[#444444] text-sm">
                Send a request to see the response
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiTester
