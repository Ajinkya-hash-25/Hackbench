import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Plus, X } from 'lucide-react'

export interface Tab {
  id: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onTabSelect: (id: string) => void
  onTabClose: (id: string) => void
  onTabAdd: () => void
  onTabRename: (id: string, label: string) => void
}

function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onTabAdd, onTabRename }: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const activeEl = container.querySelector(`[data-tab-id="${activeTabId}"]`) as HTMLElement
    if (activeEl) {
      setIndicator({ left: activeEl.offsetLeft, width: activeEl.offsetWidth })
    }
  }, [activeTabId, tabs])

  const handleDoubleClick = (tab: Tab) => {
    setEditingId(tab.id)
    setEditValue(tab.label)
  }

  const commitRename = () => {
    if (editingId && editValue.trim()) {
      onTabRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }

  const handleMiddleClick = (e: React.MouseEvent, id: string) => {
    if (e.button === 1 && tabs.length > 1) {
      e.preventDefault()
      onTabClose(id)
    }
  }

  return (
    <div className="relative bg-[#0a0a0a] border-b border-[#2a2a2a] shrink-0">
      <div ref={containerRef} className="flex items-center gap-0.5 px-1 pt-1 pb-0.5 overflow-x-auto">
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              onMouseDown={(e) => handleMiddleClick(e, tab.id)}
              onClick={() => onTabSelect(tab.id)}
              onDoubleClick={() => handleDoubleClick(tab)}
              className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer transition-all duration-150 min-w-0 max-w-[160px] ${
                isActive
                  ? 'text-white bg-[#1a1a1a]'
                  : 'text-[#606060] hover:text-[#a0a0a0] hover:bg-[#111111]'
              }`}
            >
              {isActive && (
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
              <span className={isActive ? 'pl-3' : ''}>
                {editingId === tab.id ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="bg-transparent outline-none text-xs w-full min-w-[40px] text-white"
                    maxLength={20}
                  />
                ) : (
                  <span className="truncate">{tab.label}</span>
                )}
              </span>
              {tabs.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); onTabClose(tab.id) }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity shrink-0 p-0.5 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        })}
        {tabs.length < 10 && (
          <button
            onClick={onTabAdd}
            className="p-1.5 text-[#444444] hover:text-emerald-400 hover:bg-[#1a1a1a] rounded-md transition-colors shrink-0 ml-0.5"
            title="New tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {/* Sliding indicator */}
      <div
        className="absolute bottom-0 h-[2px] bg-emerald-500 rounded-full transition-all duration-200 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </div>
  )
}

export default TabBar
