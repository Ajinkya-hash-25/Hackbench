import { useRef, useEffect } from 'react'
import { X, ChevronUp, ChevronDown, Search } from 'lucide-react'

interface SearchBarProps {
  isOpen: boolean
  searchTerm: string
  onSearchChange: (term: string) => void
  currentMatch: number
  totalMatches: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  caseSensitive: boolean
  onToggleCaseSensitive: () => void
}

function SearchBar({
  isOpen,
  searchTerm,
  onSearchChange,
  currentMatch,
  totalMatches,
  onNext,
  onPrev,
  onClose,
  caseSensitive,
  onToggleCaseSensitive,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        onPrev()
      } else {
        onNext()
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1a1a]/95 backdrop-blur-sm border border-[#333333] rounded-lg shadow-xl">
      <Search className="w-3.5 h-3.5 text-[#555555] flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find..."
        className="w-40 px-1.5 py-0.5 bg-[#111111] border border-[#2a2a2a] rounded text-sm text-[#e0e0e0] placeholder-[#555555] focus:outline-none focus:border-emerald-500/50"
      />
      <button
        onClick={onToggleCaseSensitive}
        className={`px-1.5 py-0.5 rounded text-xs font-semibold transition-colors ${
          caseSensitive
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'text-[#555555] hover:text-[#a0a0a0] border border-transparent hover:border-[#333333]'
        }`}
        title="Match case"
      >
        Aa
      </button>

      <span className="text-xs text-[#666666] min-w-[4.5rem] text-center select-none">
        {searchTerm
          ? totalMatches > 0
            ? `${currentMatch + 1} of ${totalMatches}`
            : 'No results'
          : ''}
      </span>

      <button
        onClick={onPrev}
        disabled={totalMatches === 0}
        className="p-0.5 rounded hover:bg-[#222222] text-[#666666] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Previous match (Shift+Enter)"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <button
        onClick={onNext}
        disabled={totalMatches === 0}
        className="p-0.5 rounded hover:bg-[#222222] text-[#666666] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        title="Next match (Enter)"
      >
        <ChevronDown className="w-4 h-4" />
      </button>

      <button
        onClick={onClose}
        className="p-0.5 rounded hover:bg-[#222222] text-[#666666] hover:text-white transition-colors ml-0.5"
        title="Close (Escape)"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default SearchBar
