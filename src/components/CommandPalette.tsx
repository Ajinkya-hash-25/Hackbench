import { useState, useEffect, useRef, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Page } from '../App'
import { navGroups, NavItem } from './Sidebar'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onNavigate: (page: Page) => void
}

interface ToolEntry extends NavItem {
  group: string
}

const allTools: ToolEntry[] = navGroups.flatMap(group =>
  group.items.map(item => ({ ...item, group: group.label }))
)

function fuzzyMatch(query: string, text: string): { match: boolean; score: number } {
  const q = query.toLowerCase()
  const t = text.toLowerCase()

  if (t.includes(q)) return { match: true, score: 100 - t.indexOf(q) }

  let qi = 0
  let score = 0
  let consecutive = 0

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      qi++
      consecutive++
      score += consecutive * 2
    } else {
      consecutive = 0
    }
  }

  return { match: qi === q.length, score }
}

function CommandPalette({ isOpen, onClose, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (!query.trim()) return allTools
    return allTools
      .map(tool => ({ ...tool, ...fuzzyMatch(query, tool.label) }))
      .filter(t => t.match)
      .sort((a, b) => b.score - a.score)
  }, [query])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  useEffect(() => {
    if (!isOpen) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (results[selectedIndex]) {
          onNavigate(results[selectedIndex].id)
        }
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, results, selectedIndex, onNavigate, onClose])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[560px] max-h-[400px] bg-[#111111] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
          <Search className="w-5 h-5 text-[#555555] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools..."
            className="flex-1 bg-transparent text-white text-sm placeholder-[#555555] focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-xs text-[#555555] bg-[#0a0a0a] border border-[#2a2a2a] rounded">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#555555] text-sm">
              No tools found
            </div>
          ) : (
            results.map((tool, index) => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.id}
                  data-index={index}
                  onClick={() => onNavigate(tool.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-[#a0a0a0] hover:bg-[#1a1a1a]'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium text-sm">{tool.label}</span>
                  <span className="ml-auto text-xs text-[#444444]">{tool.group}</span>
                </button>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#2a2a2a] flex items-center gap-4 text-xs text-[#444444]">
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] rounded border border-[#2a2a2a]">&uarr;&darr;</kbd> Navigate
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] rounded border border-[#2a2a2a]">&crarr;</kbd> Open
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] rounded border border-[#2a2a2a]">Esc</kbd> Close
          </span>
        </div>
      </div>
    </>
  )
}

export default CommandPalette
