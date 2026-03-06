import { useState, useMemo, useEffect } from 'react'
import {
  Braces,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  Quote,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Trash2,
  Binary,
  Search
} from 'lucide-react'
import Button from '../components/common/Button'
import SearchBar from '../components/common/SearchBar'
import { useSearch } from '../hooks/useSearch'
import { highlightSearchTerm, computeLineMatchOffsets } from '../utils/search'
import {
  validateJson,
  formatJson,
  minifyJson,
  escapeJsonString,
  unescapeJsonString,
  buildJsonTree,
  JsonTreeNode,
  JsonValue
} from '../utils/json'
import { copyToClipboard } from '../utils/clipboard'

type ViewMode = 'formatted' | 'tree'

function JsonFormatter() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [indent, setIndent] = useState(2)
  const [viewMode, setViewMode] = useState<ViewMode>('formatted')
  const [copied, setCopied] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']))
  const [base64Mode, setBase64Mode] = useState(false)

  const search = useSearch(output)

  const decodeBase64 = (str: string): string => {
    try {
      const cleaned = str.trim().replace(/\s/g, '')
      const binary = atob(cleaned)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return new TextDecoder().decode(bytes)
    } catch {
      return str
    }
  }

  // Detect if input looks like an escaped JSON string
  const isEscapedJson = (str: string): boolean => {
    const trimmed = str.trim()
    // Check if it's a quoted string that could be unescaped
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return true
    }
    // Check for common escape sequences that suggest it's escaped JSON
    if (/\\[nrt"\\]|\\u[0-9a-fA-F]{4}/.test(trimmed)) {
      // Verify it looks like JSON content (has object/array structure when unescaped)
      const unescaped = unescapeJsonString(trimmed)
      return unescaped.trim().startsWith('{') || unescaped.trim().startsWith('[')
    }
    return false
  }

  const processedInput = useMemo(() => {
    if (!input.trim()) return ''

    let processed = input

    // Handle Base64 mode first
    if (base64Mode) {
      processed = decodeBase64(input)
    }

    // Auto-unescape if it looks like escaped JSON
    if (isEscapedJson(processed)) {
      const unescaped = unescapeJsonString(processed)
      // Only use unescaped if it results in valid JSON
      const validation = validateJson(unescaped)
      if (validation.valid) {
        return unescaped
      }
    }

    return processed
  }, [input, base64Mode])

  const validation = useMemo(() => {
    if (!processedInput.trim()) return null
    return validateJson(processedInput)
  }, [processedInput])

  const jsonTree = useMemo(() => {
    if (!validation?.valid || !validation.parsed) return null
    return buildJsonTree(validation.parsed as JsonValue)
  }, [validation])

  useEffect(() => {
    if (validation?.valid && processedInput.trim()) {
      try {
        const formatted = formatJson(processedInput, indent)
        setOutput(formatted)
      } catch {
        // Silently fail
      }
    }
  }, [validation, processedInput, indent])

  const stats = useMemo(() => {
    if (!output) return null
    const lines = output.split('\n').length
    const chars = output.length
    const size = new Blob([output]).size
    return { lines, chars, size }
  }, [output])

  const handleUseOutput = () => {
    if (output.trim()) {
      setInput(output)
    }
  }

  const handleClear = () => {
    setInput('')
    setOutput('')
    setBase64Mode(false)
  }

  const handleFormat = () => {
    try {
      const formatted = formatJson(processedInput, indent)
      setOutput(formatted)
    } catch (e) {
      setOutput(`Error: ${(e as Error).message}`)
    }
  }

  const handleMinify = () => {
    try {
      const minified = minifyJson(processedInput)
      setOutput(minified)
    } catch (e) {
      setOutput(`Error: ${(e as Error).message}`)
    }
  }

  const handleEscape = () => {
    const escaped = escapeJsonString(processedInput)
    setOutput(escaped)
  }

  const handleUnescape = () => {
    const unescaped = unescapeJsonString(processedInput)
    setOutput(unescaped)
  }

  const handleCopy = async () => {
    const textToCopy = output || input
    const success = await copyToClipboard(textToCopy)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleNode = (path: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const expandAll = () => {
    if (!jsonTree) return
    const paths = new Set<string>()
    const collectPaths = (node: JsonTreeNode, path: string) => {
      paths.add(path)
      node.children?.forEach((child, idx) => {
        collectPaths(child, `${path}.${child.key || idx}`)
      })
    }
    collectPaths(jsonTree, 'root')
    setExpandedNodes(paths)
  }

  const collapseAll = () => {
    setExpandedNodes(new Set(['root']))
  }

  // Compute per-line match offsets for code view highlighting
  const outputLines = useMemo(() => output.split('\n'), [output])
  const lineMatchData = useMemo(() => {
    if (!search.searchTerm || !search.isOpen) return null
    return computeLineMatchOffsets(outputLines, search.searchTerm, search.caseSensitive)
  }, [outputLines, search.searchTerm, search.caseSensitive, search.isOpen])

  const renderHighlightedLine = (line: string, lineIdx: number) => {
    if (!lineMatchData || !search.searchTerm) return line
    const info = lineMatchData[lineIdx]
    if (!info || info.count === 0) return line
    const { elements } = highlightSearchTerm(
      line,
      search.searchTerm,
      search.caseSensitive,
      info.offset,
      search.currentIndex
    )
    return elements
  }

  // Highlight text in tree view nodes
  const renderHighlightedText = (text: string) => {
    if (!search.isOpen || !search.searchTerm) return text
    const { elements, count } = highlightSearchTerm(
      text,
      search.searchTerm,
      search.caseSensitive,
      -999, // Use negative offset so no match is marked as "current" in tree view
      search.currentIndex
    )
    if (count === 0) return text
    return elements
  }

  const renderTreeNode = (node: JsonTreeNode, path: string, depth = 0): JSX.Element => {
    const isExpanded = expandedNodes.has(path)
    const hasChildren = node.children && node.children.length > 0
    const indentPx = depth * 20

    return (
      <div key={path}>
        <div
          className="flex items-center py-1 hover:bg-[#1a1a1a] cursor-pointer rounded px-2 group"
          style={{ paddingLeft: indentPx + 8 }}
          onClick={() => hasChildren && toggleNode(path)}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[#666666] mr-1 flex-shrink-0" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[#666666] mr-1 flex-shrink-0" />
            )
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}

          <span className="json-key">{renderHighlightedText(`"${node.key}"`)}</span>
          <span className="text-[#666666] mx-1">:</span>

          {hasChildren ? (
            <span className="text-[#888888]">
              {node.type === 'array'
                ? `Array[${node.children!.length}]`
                : `Object{${node.children!.length}}`}
            </span>
          ) : (
            <span
              className={
                node.type === 'string'
                  ? 'json-string'
                  : node.type === 'number'
                  ? 'json-number'
                  : node.type === 'boolean'
                  ? 'json-boolean'
                  : 'json-null'
              }
            >
              {node.type === 'string'
                ? renderHighlightedText(
                    `"${String(node.value).length > 50 ? String(node.value).slice(0, 50) + '...' : String(node.value)}"`
                  )
                : renderHighlightedText(String(node.value))}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child, idx) =>
              renderTreeNode(child, `${path}.${child.key || idx}`, depth + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Braces className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">JSON Formatter</h2>
            <p className="text-xs text-[#666666]">Format, validate, and transform JSON</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
            Indent:
            <select
              value={indent}
              onChange={(e) => setIndent(Number(e.target.value))}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-[#e0e0e0] text-sm"
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={0}>Tab</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleFormat}>
          <Maximize2 className="w-4 h-4" />
          Format
        </Button>
        <Button variant="secondary" onClick={handleMinify}>
          <Minimize2 className="w-4 h-4" />
          Minify
        </Button>
        <div className="w-px h-6 bg-[#2a2a2a]" />
        <Button variant="secondary" onClick={handleEscape}>
          <Quote className="w-4 h-4" />
          Escape
        </Button>
        <Button variant="secondary" onClick={handleUnescape}>
          <Quote className="w-4 h-4" />
          Unescape
        </Button>
        <div className="w-px h-6 bg-[#2a2a2a]" />
        <Button variant="ghost" onClick={handleClear}>
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {validation && !validation.valid && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
          <p className="text-red-400 text-sm font-medium">Invalid JSON</p>
          <p className="text-red-400/70 text-xs mt-1">
            {validation.error?.message}
            {validation.error?.line && (
              <span> (Line {validation.error.line}, Column {validation.error.column})</span>
            )}
          </p>
        </div>
      )}

      {validation?.valid && stats && (
        <div className="flex items-center gap-4 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <span className="text-emerald-400 text-sm">Valid JSON</span>
          <div className="flex-1" />
          <span className="text-xs text-[#666666]">{stats.lines} lines</span>
          <span className="text-xs text-[#666666]">{stats.chars} chars</span>
          <span className="text-xs text-[#666666]">{formatSize(stats.size)}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#a0a0a0]">Input</span>
            <button
              onClick={() => setBase64Mode(!base64Mode)}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                base64Mode
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-[#666666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a]'
              }`}
              title="Toggle Base64 decode mode"
            >
              <Binary className="w-3 h-3" />
              Base64
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={base64Mode ? "Paste Base64 encoded JSON here..." : "Paste JSON here..."}
            className={`
              flex-1 w-full px-4 py-3 rounded-lg font-mono text-sm leading-relaxed
              bg-[#111111] border border-[#2a2a2a] text-[#e0e0e0] placeholder-[#444444]
              focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/50
              resize-none overflow-auto
              ${validation && !validation.valid ? 'border-red-500/30' : ''}
            `}
          />
        </div>

        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#a0a0a0]">Output</span>
              {output.trim() && (
                <button
                  onClick={handleUseOutput}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#666666] hover:text-emerald-400 hover:bg-[#1a1a1a] rounded transition-colors"
                  title="Use output as input"
                >
                  <ArrowRight className="w-3 h-3" />
                  Use as Input
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {output.trim() && (
                <button
                  onClick={search.open}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#666666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a] rounded transition-colors"
                  title="Find in output (Ctrl+F)"
                >
                  <Search className="w-3 h-3" />
                </button>
              )}
              {jsonTree && (
                <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-md p-0.5">
                  <button
                    onClick={() => setViewMode('formatted')}
                    className={`text-xs px-2 py-1 rounded ${
                      viewMode === 'formatted'
                        ? 'bg-[#222222] text-white'
                        : 'text-[#666666] hover:text-[#a0a0a0]'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setViewMode('tree')}
                    className={`text-xs px-2 py-1 rounded ${
                      viewMode === 'tree'
                        ? 'bg-[#222222] text-white'
                        : 'text-[#666666] hover:text-[#a0a0a0]'
                    }`}
                  >
                    Tree
                  </button>
                </div>
              )}
            </div>
          </div>

          {viewMode === 'formatted' || !jsonTree ? (
            <div
              ref={search.scrollContainerRef}
              className="flex-1 w-full rounded-lg bg-[#111111] border border-[#2a2a2a] overflow-hidden flex flex-col min-h-0 relative"
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
              <div className="flex-1 overflow-auto px-4 py-3">
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
                  <span className="font-mono text-sm text-[#444444]">
                    Formatted output will appear here...
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              ref={search.scrollContainerRef}
              className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden flex flex-col min-h-0"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2a] bg-[#0a0a0a]">
                <button
                  onClick={expandAll}
                  className="text-xs text-[#666666] hover:text-white px-2 py-1 hover:bg-[#1a1a1a] rounded"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="text-xs text-[#666666] hover:text-white px-2 py-1 hover:bg-[#1a1a1a] rounded"
                >
                  Collapse All
                </button>
                <div className="flex-1" />
                {search.isOpen && (
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
                )}
              </div>
              <div className="flex-1 overflow-auto p-2 font-mono text-sm">
                {renderTreeNode(jsonTree, 'root')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JsonFormatter
