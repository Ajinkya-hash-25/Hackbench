import { useState, useMemo, useRef, useCallback, useEffect, ReactNode } from 'react'
import { GitCompare, Copy, Check, FileText, Columns, AlignJustify, Trash2, ArrowLeftRight, ChevronUp, ChevronDown, Filter, Search } from 'lucide-react'
import Button from '../components/common/Button'
import SearchBar from '../components/common/SearchBar'
import { useSearch } from '../hooks/useSearch'
import { highlightSearchTerm, computeLineMatchOffsets } from '../utils/search'
import { computeDiff, formatUnifiedDiff, DiffLine } from '../utils/diff'
import { copyToClipboard } from '../utils/clipboard'

type ViewMode = 'side-by-side' | 'unified'

function DiffChecker() {
  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [copied, setCopied] = useState(false)
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0)
  const [showOnlyChanges, setShowOnlyChanges] = useState(false)
  const [syncScroll, setSyncScroll] = useState(true)

  const diffContainerRef = useRef<HTMLDivElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const isScrolling = useRef(false)

  const diffResult = useMemo(() => {
    if (!original && !modified) return null
    return computeDiff(original, modified, ignoreWhitespace)
  }, [original, modified, ignoreWhitespace])

  // Build searchable text from diff lines
  const searchableText = useMemo(() => {
    if (!diffResult) return ''
    return diffResult.lines.map(l => l.content).join('\n')
  }, [diffResult])

  const search = useSearch(searchableText)

  // Compute per-line match offsets for highlighting
  const lineMatchData = useMemo(() => {
    if (!diffResult || !search.searchTerm || !search.isOpen) return null
    const lines = diffResult.lines.map(l => l.content)
    return computeLineMatchOffsets(lines, search.searchTerm, search.caseSensitive)
  }, [diffResult, search.searchTerm, search.caseSensitive, search.isOpen])

  // Helper to render highlighted line content
  const renderLineContent = (content: string, lineIdx: number, className: string): ReactNode => {
    if (!lineMatchData || !search.searchTerm || !search.isOpen) {
      return <span className={className}>{content || '\u00A0'}</span>
    }
    const info = lineMatchData[lineIdx]
    if (!info || info.count === 0) {
      return <span className={className}>{content || '\u00A0'}</span>
    }
    const { elements } = highlightSearchTerm(
      content,
      search.searchTerm,
      search.caseSensitive,
      info.offset,
      search.currentIndex
    )
    return <span className={className}>{content ? elements : '\u00A0'}</span>
  }

  // Calculate diff hunks (groups of consecutive changes) for navigation
  const diffHunks = useMemo(() => {
    if (!diffResult) return []
    const hunks: { startIndex: number; endIndex: number }[] = []
    let inHunk = false
    let hunkStart = 0

    diffResult.lines.forEach((line, idx) => {
      const isChange = line.type === 'add' || line.type === 'remove'
      if (isChange && !inHunk) {
        inHunk = true
        hunkStart = idx
      } else if (!isChange && inHunk) {
        inHunk = false
        hunks.push({ startIndex: hunkStart, endIndex: idx - 1 })
      }
    })

    // Close final hunk if file ends with changes
    if (inHunk) {
      hunks.push({ startIndex: hunkStart, endIndex: diffResult.lines.length - 1 })
    }

    return hunks
  }, [diffResult])

  // Check if contents are identical
  const isIdentical = useMemo(() => {
    if (!original || !modified) return false
    return original === modified
  }, [original, modified])

  // Reset current diff index when diff changes
  useEffect(() => {
    setCurrentDiffIndex(0)
  }, [diffResult])

  // Synchronized scrolling for side-by-side view
  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (!syncScroll || isScrolling.current) return

    isScrolling.current = true
    const sourceRef = source === 'left' ? leftPanelRef : rightPanelRef
    const targetRef = source === 'left' ? rightPanelRef : leftPanelRef

    if (sourceRef.current && targetRef.current) {
      targetRef.current.scrollTop = sourceRef.current.scrollTop
    }

    requestAnimationFrame(() => {
      isScrolling.current = false
    })
  }, [syncScroll])

  const scrollToHunk = useCallback((index: number) => {
    if (!diffHunks[index]) return

    const lineIndex = diffHunks[index].startIndex
    const lineHeight = 24 // Approximate line height in pixels

    if (viewMode === 'unified' && diffContainerRef.current) {
      diffContainerRef.current.scrollTop = lineIndex * lineHeight
    } else {
      // For side-by-side, scroll both panels
      if (leftPanelRef.current) {
        leftPanelRef.current.scrollTop = lineIndex * lineHeight
      }
      if (rightPanelRef.current) {
        rightPanelRef.current.scrollTop = lineIndex * lineHeight
      }
    }
  }, [diffHunks, viewMode])

  const goToPreviousDiff = useCallback(() => {
    if (diffHunks.length === 0) return
    const newIndex = currentDiffIndex > 0 ? currentDiffIndex - 1 : diffHunks.length - 1
    setCurrentDiffIndex(newIndex)
    scrollToHunk(newIndex)
  }, [currentDiffIndex, diffHunks.length, scrollToHunk])

  const goToNextDiff = useCallback(() => {
    if (diffHunks.length === 0) return
    const newIndex = currentDiffIndex < diffHunks.length - 1 ? currentDiffIndex + 1 : 0
    setCurrentDiffIndex(newIndex)
    scrollToHunk(newIndex)
  }, [currentDiffIndex, diffHunks.length, scrollToHunk])

  // Keyboard navigation (↑/↓ or j/k to navigate between diffs)
  // Also supports n/N for next/previous (like vim search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in textarea or input
      const activeElement = document.activeElement
      if (activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT') return

      // Only handle navigation keys
      if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'N') {
        e.preventDefault()
        goToPreviousDiff()
      } else if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'n') {
        e.preventDefault()
        goToNextDiff()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [goToPreviousDiff, goToNextDiff])

  const handleCopy = async () => {
    const output = formatUnifiedDiff(original, modified, 'Original', 'Modified', ignoreWhitespace)
    const success = await copyToClipboard(output)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFileUpload = (side: 'original' | 'modified') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.js,.ts,.json,.md,.html,.css,.py,.java,.c,.cpp,.h,.xml,.yaml,.yml'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const text = await file.text()
        if (side === 'original') {
          setOriginal(text)
        } else {
          setModified(text)
        }
      }
    }
    input.click()
  }

  const handleClear = () => {
    setOriginal('')
    setModified('')
  }

  const handleSwap = () => {
    const temp = original
    setOriginal(modified)
    setModified(temp)
  }

  // Check if a line index is within the current hunk
  const isInCurrentHunk = useCallback((lineIdx: number) => {
    if (!diffHunks[currentDiffIndex]) return false
    const hunk = diffHunks[currentDiffIndex]
    return lineIdx >= hunk.startIndex && lineIdx <= hunk.endIndex
  }, [diffHunks, currentDiffIndex])

  const renderSideBySide = () => {
    if (!diffResult) return null

    const leftLines: { line: DiffLine; originalIdx: number }[] = []
    const rightLines: { line: DiffLine; originalIdx: number }[] = []

    diffResult.lines.forEach((line, idx) => {
      if (line.type === 'remove') {
        leftLines.push({ line, originalIdx: idx })
      } else if (line.type === 'add') {
        rightLines.push({ line, originalIdx: idx })
      } else {
        // Skip unchanged lines if showOnlyChanges is enabled
        if (showOnlyChanges) return

        while (leftLines.length < rightLines.length) {
          leftLines.push({ line: { type: 'unchanged', content: '', lineNumber: {} }, originalIdx: -1 })
        }
        while (rightLines.length < leftLines.length) {
          rightLines.push({ line: { type: 'unchanged', content: '', lineNumber: {} }, originalIdx: -1 })
        }
        leftLines.push({ line, originalIdx: idx })
        rightLines.push({ line, originalIdx: idx })
      }
    })

    while (leftLines.length < rightLines.length) {
      leftLines.push({ line: { type: 'unchanged', content: '', lineNumber: {} }, originalIdx: -1 })
    }
    while (rightLines.length < leftLines.length) {
      rightLines.push({ line: { type: 'unchanged', content: '', lineNumber: {} }, originalIdx: -1 })
    }

    return (
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-[#0a0a0a] text-sm font-medium text-[#a0a0a0] border-b border-[#2a2a2a] flex items-center justify-between">
            <span>Original</span>
            <span className="text-xs text-[#666666]">{original.split('\n').length} lines</span>
          </div>
          <div
            ref={leftPanelRef}
            className="flex-1 overflow-auto font-mono text-sm"
            onScroll={() => handleScroll('left')}
          >
            {leftLines.map(({ line, originalIdx }, idx) => (
              <div
                key={idx}
                data-diff-line={idx}
                className={`flex px-2 py-0.5 ${
                  line.type === 'remove'
                    ? isInCurrentHunk(originalIdx)
                      ? 'bg-red-500/20 border-l-2 border-red-400'
                      : 'bg-red-500/10'
                    : ''
                }`}
              >
                <span className="text-[#444444] select-none w-10 text-right pr-3 flex-shrink-0">
                  {line.lineNumber?.left || ''}
                </span>
                {line.type === 'remove' && (
                  <span className="text-red-400 select-none w-4 flex-shrink-0">-</span>
                )}
                {line.type !== 'remove' && <span className="w-4 flex-shrink-0" />}
                {originalIdx >= 0
                  ? renderLineContent(
                      line.content,
                      originalIdx,
                      `${line.type === 'remove' ? 'text-red-300' : 'text-[#c0c0c0]'} whitespace-pre`
                    )
                  : <span className="text-[#c0c0c0] whitespace-pre">{line.content || '\u00A0'}</span>
                }
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-[#0a0a0a] text-sm font-medium text-[#a0a0a0] border-b border-[#2a2a2a] flex items-center justify-between">
            <span>Modified</span>
            <span className="text-xs text-[#666666]">{modified.split('\n').length} lines</span>
          </div>
          <div
            ref={rightPanelRef}
            className="flex-1 overflow-auto font-mono text-sm"
            onScroll={() => handleScroll('right')}
          >
            {rightLines.map(({ line, originalIdx }, idx) => (
              <div
                key={idx}
                data-diff-line={idx}
                className={`flex px-2 py-0.5 ${
                  line.type === 'add'
                    ? isInCurrentHunk(originalIdx)
                      ? 'bg-emerald-500/20 border-l-2 border-emerald-400'
                      : 'bg-emerald-500/10'
                    : ''
                }`}
              >
                <span className="text-[#444444] select-none w-10 text-right pr-3 flex-shrink-0">
                  {line.lineNumber?.right || ''}
                </span>
                {line.type === 'add' && (
                  <span className="text-emerald-400 select-none w-4 flex-shrink-0">+</span>
                )}
                {line.type !== 'add' && <span className="w-4 flex-shrink-0" />}
                {originalIdx >= 0
                  ? renderLineContent(
                      line.content,
                      originalIdx,
                      `${line.type === 'add' ? 'text-emerald-300' : 'text-[#c0c0c0]'} whitespace-pre`
                    )
                  : <span className="text-[#c0c0c0] whitespace-pre">{line.content || '\u00A0'}</span>
                }
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderUnified = () => {
    if (!diffResult) return null

    const linesToRender = showOnlyChanges
      ? diffResult.lines.filter(line => line.type !== 'unchanged')
      : diffResult.lines

    return (
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 bg-[#0a0a0a] text-sm font-medium text-[#a0a0a0] border-b border-[#2a2a2a]">
          Unified Diff
        </div>
        <div ref={diffContainerRef} className="flex-1 overflow-auto font-mono text-sm">
          {linesToRender.map((line, idx) => {
            const originalIdx = diffResult.lines.indexOf(line)
            const inCurrentHunk = isInCurrentHunk(originalIdx)

            return (
              <div
                key={idx}
                data-diff-line={idx}
                className={`flex px-2 py-0.5 ${
                  line.type === 'add'
                    ? inCurrentHunk
                      ? 'bg-emerald-500/20 border-l-2 border-emerald-400'
                      : 'bg-emerald-500/10'
                    : line.type === 'remove'
                    ? inCurrentHunk
                      ? 'bg-red-500/20 border-l-2 border-red-400'
                      : 'bg-red-500/10'
                    : ''
                }`}
              >
                <span className="text-[#444444] select-none w-10 text-right pr-3 flex-shrink-0">
                  {line.lineNumber?.left || line.lineNumber?.right || ''}
                </span>
                <span className={`select-none w-4 flex-shrink-0 ${
                  line.type === 'add' ? 'text-emerald-400' : line.type === 'remove' ? 'text-red-400' : 'text-[#444444]'
                }`}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </span>
                {renderLineContent(
                  line.content,
                  originalIdx,
                  `whitespace-pre ${
                    line.type === 'add'
                      ? 'text-emerald-300'
                      : line.type === 'remove'
                      ? 'text-red-300'
                      : 'text-[#c0c0c0]'
                  }`
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <GitCompare className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Diff Checker</h2>
            <p className="text-xs text-[#666666]">Compare two text blocks</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              className="rounded border-[#333333] bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500/40"
            />
            Ignore whitespace
          </label>

          <button
            onClick={() => setShowOnlyChanges(!showOnlyChanges)}
            className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors ${
              showOnlyChanges
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-[#666666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a]'
            }`}
            title="Show only changed lines"
          >
            <Filter className="w-3.5 h-3.5" />
            Changes only
          </button>

          {viewMode === 'side-by-side' && (
            <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="rounded border-[#333333] bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500/40"
              />
              Sync scroll
            </label>
          )}

          <div className="flex bg-[#1a1a1a] rounded-md p-0.5">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`p-1.5 rounded ${
                viewMode === 'side-by-side'
                  ? 'bg-[#222222] text-white'
                  : 'text-[#666666] hover:text-[#a0a0a0]'
              }`}
              title="Side by side"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`p-1.5 rounded ${
                viewMode === 'unified'
                  ? 'bg-[#222222] text-white'
                  : 'text-[#666666] hover:text-[#a0a0a0]'
              }`}
              title="Unified"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-shrink-0" style={{ height: '35%', minHeight: '150px' }}>
        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#a0a0a0]">Original</span>
            <Button variant="ghost" size="sm" onClick={() => handleFileUpload('original')}>
              <FileText className="w-4 h-4" />
              Load
            </Button>
          </div>
          <textarea
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="Paste original text here..."
            className="flex-1 w-full px-4 py-3 rounded-lg font-mono text-sm leading-relaxed bg-[#111111] border border-[#2a2a2a] text-[#e0e0e0] placeholder-[#444444] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/50 resize-none overflow-auto"
          />
        </div>

        <div className="flex flex-col gap-2 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#a0a0a0]">Modified</span>
            <Button variant="ghost" size="sm" onClick={() => handleFileUpload('modified')}>
              <FileText className="w-4 h-4" />
              Load
            </Button>
          </div>
          <textarea
            value={modified}
            onChange={(e) => setModified(e.target.value)}
            placeholder="Paste modified text here..."
            className="flex-1 w-full px-4 py-3 rounded-lg font-mono text-sm leading-relaxed bg-[#111111] border border-[#2a2a2a] text-[#e0e0e0] placeholder-[#444444] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/50 resize-none overflow-auto"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {diffResult && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-md">
                <span className="text-emerald-400 font-medium text-sm">+{diffResult.stats.additions}</span>
                <span className="text-[#666666] text-xs">additions</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-md">
                <span className="text-red-400 font-medium text-sm">-{diffResult.stats.deletions}</span>
                <span className="text-[#666666] text-xs">deletions</span>
              </div>
              <span className="text-[#666666] text-xs">{diffResult.stats.unchanged} unchanged</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search in diff */}
          {diffResult && !isIdentical && (
            <button
              onClick={search.open}
              className="p-1.5 rounded hover:bg-[#1a1a1a] text-[#666666] hover:text-white transition-colors"
              title="Find in diff (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
            </button>
          )}
          {/* Diff Navigation */}
          {diffHunks.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={goToPreviousDiff}
                className="p-1.5 rounded hover:bg-[#1a1a1a] text-[#666666] hover:text-white transition-colors"
                title="Previous change (↑)"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-xs text-[#a0a0a0] min-w-[4rem] text-center">
                {currentDiffIndex + 1} of {diffHunks.length}
              </span>
              <button
                onClick={goToNextDiff}
                className="p-1.5 rounded hover:bg-[#1a1a1a] text-[#666666] hover:text-white transition-colors"
                title="Next change (↓)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleSwap} disabled={!original && !modified}>
            <ArrowLeftRight className="w-4 h-4" />
            Swap
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <Button size="sm" onClick={handleCopy} disabled={!diffResult}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Diff'}
          </Button>
        </div>
      </div>

      {/* Search bar for diff output */}
      {search.isOpen && diffResult && !isIdentical && (
        <div className="flex justify-end">
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

      {isIdentical && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-medium">Files are identical</span>
          </div>
          <span className="text-[#666666] text-sm">No differences found between the two texts</span>
        </div>
      )}

      {diffResult && !isIdentical && (
        <div ref={search.scrollContainerRef} className="flex-1 min-h-0 flex flex-col">
          {viewMode === 'side-by-side' ? renderSideBySide() : renderUnified()}
        </div>
      )}

      {!diffResult && (original || modified) && !isIdentical && (
        <div className="flex-1 flex items-center justify-center text-[#666666]">
          Enter text in both panels to see the diff
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {diffHunks.length > 0 && !isIdentical && (
        <div className="text-center text-xs text-[#444444] py-1">
          Press <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[#666666]">↑</kbd> / <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[#666666]">↓</kbd> or <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[#666666]">k</kbd> / <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[#666666]">j</kbd> to navigate between changes · <kbd className="px-1.5 py-0.5 bg-[#1a1a1a] rounded text-[#666666]">Ctrl+F</kbd> to search
        </div>
      )}
    </div>
  )
}

export default DiffChecker
