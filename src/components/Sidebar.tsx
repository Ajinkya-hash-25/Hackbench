import { useState, useEffect, useCallback, useRef, DragEvent } from 'react'
import {
  GitCompare,
  Braces,
  Binary,
  Hash,
  Fingerprint,
  Shield,
  Key,
  Regex,
  Clock,
  Timer,
  FileText,
  Database,
  Palette,
  Link2,
  ChevronDown,
  ChevronRight,
  Send,
  Dices,
  QrCode,
  Code,
  Pin,
  PinOff,
  Globe,
  GripVertical,
  Columns,
  Maximize2,
} from 'lucide-react'
import { Page } from '../App'

export interface NavItem {
  id: Page
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    id: 'formatters',
    label: 'Formatters',
    items: [
      { id: 'json', label: 'JSON Formatter', icon: Braces },
      { id: 'sql', label: 'SQL Formatter', icon: Database },
      { id: 'markdown', label: 'Markdown Preview', icon: FileText },
      { id: 'html' as Page, label: 'HTML Viewer', icon: Code },
    ],
  },
  {
    id: 'encoders',
    label: 'Encoders / Decoders',
    items: [
      { id: 'base64', label: 'Base64', icon: Binary },
      { id: 'url', label: 'URL Encoder', icon: Link2 },
      { id: 'jwt', label: 'JWT Decoder', icon: Key },
      { id: 'hash', label: 'Hash Generator', icon: Hash },
    ],
  },
  {
    id: 'generators',
    label: 'Generators',
    items: [
      { id: 'uuid', label: 'UUID Generator', icon: Fingerprint },
      { id: 'fakedata', label: 'Fake Data', icon: Dices },
      { id: 'qrcode', label: 'QR Code', icon: QrCode },
    ],
  },
  {
    id: 'testers',
    label: 'Testers',
    items: [
      { id: 'regex', label: 'Regex Tester', icon: Regex },
      { id: 'diff', label: 'Diff Checker', icon: GitCompare },
      { id: 'api', label: 'API Tester', icon: Send },
    ],
  },
  {
    id: 'converters',
    label: 'Converters',
    items: [
      { id: 'timestamp', label: 'Timestamp', icon: Clock },
      { id: 'color', label: 'Color Converter', icon: Palette },
      { id: 'cron', label: 'Cron Parser', icon: Timer },
    ],
  },
]

// Build a flat lookup map from navGroups for quick access by tool id
const toolLookup: Record<string, NavItem> = {}
for (const group of navGroups) {
  for (const item of group.items) {
    toolLookup[item.id] = item
  }
}

interface DragState {
  sourceGroup: string
  sourceId: Page
  overGroup: string
  overIndex: number
}

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  onToggleBrowser: () => void
  splitView: boolean
  onToggleSplitView: () => void
  onToggleFocusMode: () => void
}

function Sidebar({ currentPage, onNavigate, onToggleBrowser, splitView, onToggleSplitView, onToggleFocusMode }: SidebarProps) {
  // --- Expanded groups state (persisted) ---
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('devkit-sidebar-groups')
      if (saved) return new Set(JSON.parse(saved))
    } catch { /* ignore */ }
    return new Set(navGroups.map(g => g.id))
  })

  useEffect(() => {
    localStorage.setItem('devkit-sidebar-groups', JSON.stringify([...expandedGroups]))
  }, [expandedGroups])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // --- Pinned tools state (persisted, ordered array) ---
  const [pinnedTools, setPinnedTools] = useState<Page[]>(() => {
    try {
      const saved = localStorage.getItem('hackbench-pinned-tools')
      if (saved) return JSON.parse(saved) as Page[]
    } catch { /* ignore */ }
    return []
  })
  const pinnedSet = new Set(pinnedTools)

  useEffect(() => {
    localStorage.setItem('hackbench-pinned-tools', JSON.stringify(pinnedTools))
  }, [pinnedTools])

  const togglePin = useCallback((toolId: Page) => {
    setPinnedTools(prev => {
      const idx = prev.indexOf(toolId)
      if (idx !== -1) return prev.filter(id => id !== toolId)
      if (prev.length >= 8) return prev // max 8 pinned
      return [...prev, toolId]
    })
  }, [])

  // --- Tool order state (persisted) ---
  const [toolOrder, setToolOrder] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('hackbench-tool-order')
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return {}
  })

  useEffect(() => {
    localStorage.setItem('hackbench-tool-order', JSON.stringify(toolOrder))
  }, [toolOrder])

  const resetOrder = useCallback(() => {
    localStorage.removeItem('hackbench-tool-order')
    setToolOrder({})
  }, [])

  // --- Drag and drop state ---
  const [dragState, setDragState] = useState<DragState | null>(null)
  const dragCounter = useRef(0)

  const getOrderedItems = useCallback((group: NavGroup): NavItem[] => {
    const order = toolOrder[group.id]
    if (!order) return group.items
    const itemMap = new Map(group.items.map(item => [item.id, item]))
    const ordered: NavItem[] = []
    // First, add items in the stored order
    for (const id of order) {
      const item = itemMap.get(id as Page)
      if (item) {
        ordered.push(item)
        itemMap.delete(id as Page)
      }
    }
    // Then append any items not in the stored order (newly added tools)
    for (const item of itemMap.values()) {
      ordered.push(item)
    }
    return ordered
  }, [toolOrder])

  const handleDragStart = useCallback((e: DragEvent<HTMLButtonElement>, groupId: string, toolId: Page) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', toolId)
    setDragState({ sourceGroup: groupId, sourceId: toolId, overGroup: groupId, overIndex: -1 })
    dragCounter.current = 0
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLButtonElement>, groupId: string, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragState(prev => {
      if (!prev) return prev
      // Only allow reordering within the same group
      if (prev.sourceGroup !== groupId) return prev
      return { ...prev, overGroup: groupId, overIndex: index }
    })
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLButtonElement>, groupId: string, dropIndex: number) => {
    e.preventDefault()
    if (!dragState) return
    if (dragState.sourceGroup !== groupId) {
      setDragState(null)
      return
    }

    // Pinned group reorder
    if (groupId === 'pinned') {
      setPinnedTools(prev => {
        const sourceIndex = prev.indexOf(dragState.sourceId)
        if (sourceIndex === -1 || sourceIndex === dropIndex) return prev
        const next = [...prev]
        const [moved] = next.splice(sourceIndex, 1)
        const adjusted = dropIndex > sourceIndex ? dropIndex - 1 : dropIndex
        next.splice(adjusted, 0, moved)
        return next
      })
      setDragState(null)
      return
    }

    // Find the matching NavGroup to get ordered items
    const group = navGroups.find(g => g.id === groupId)
    if (!group) {
      setDragState(null)
      return
    }

    const items = getOrderedItems(group)
    const sourceIndex = items.findIndex(item => item.id === dragState.sourceId)
    if (sourceIndex === -1 || sourceIndex === dropIndex) {
      setDragState(null)
      return
    }

    // Reorder
    const newItems = [...items]
    const [moved] = newItems.splice(sourceIndex, 1)
    const adjustedIndex = dropIndex > sourceIndex ? dropIndex - 1 : dropIndex
    newItems.splice(adjustedIndex, 0, moved)

    setToolOrder(prev => ({
      ...prev,
      [groupId]: newItems.map(item => item.id),
    }))
    setDragState(null)
  }, [dragState, getOrderedItems])

  const handleDragEnd = useCallback(() => {
    setDragState(null)
  }, [])

  // --- Build pinned items (preserves array order) ---
  const pinnedItems: NavItem[] = pinnedTools
    .map(id => toolLookup[id])
    .filter(Boolean) as NavItem[]

  // --- Render a single nav item ---
  const renderNavItem = (
    item: NavItem,
    groupId: string,
    index: number,
  ) => {
    const { id, label, icon: Icon } = item
    const isActive = currentPage === id
    const isPinned = pinnedSet.has(id)
    const showInsertionBefore =
      dragState &&
      dragState.sourceGroup === groupId &&
      dragState.overGroup === groupId &&
      dragState.overIndex === index &&
      dragState.sourceId !== id

    return (
      <div key={`${groupId}-${id}`}>
        {showInsertionBefore && (
          <div className="h-0.5 bg-emerald-500 mx-3 rounded" />
        )}
        <button
          draggable
          onDragStart={(e) => handleDragStart(e, groupId, id)}
          onDragOver={(e) => handleDragOver(e, groupId, index)}
          onDrop={(e) => handleDrop(e, groupId, index)}
          onDragEnd={handleDragEnd}
          onClick={() => onNavigate(id)}
          className={`group w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-sm ${
            isActive
              ? 'bg-emerald-500/15 text-emerald-400 border-l-2 border-emerald-500'
              : 'text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white border-l-2 border-transparent'
          }`}
        >
          <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-50 shrink-0 cursor-grab" />
          <Icon className="w-4 h-4 shrink-0" />
          <span className="font-medium flex-1 truncate">{label}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              togglePin(id)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-white/10 shrink-0"
            title={isPinned ? 'Unpin tool' : 'Pin tool'}
          >
            {isPinned ? (
              <PinOff className="w-3.5 h-3.5" />
            ) : (
              <Pin className="w-3.5 h-3.5" />
            )}
          </button>
        </button>
      </div>
    )
  }

  // --- Render a group ---
  const renderGroup = (
    groupId: string,
    label: string,
    items: NavItem[],
    options?: {
      icon?: React.ComponentType<{ className?: string }>
      collapsible?: boolean
    }
  ) => {
    const { icon: GroupIcon, collapsible = true } = options || {}
    const isExpanded = expandedGroups.has(groupId)
    const hasActiveTool = items.some(item => item.id === currentPage)

    return (
      <div key={groupId} className="mb-1">
        <button
          onClick={() => collapsible && toggleGroup(groupId)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#555555] hover:text-[#888888] transition-colors"
        >
          {collapsible ? (
            isExpanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
          ) : GroupIcon ? (
            <GroupIcon className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          <span>{label}</span>
          {collapsible && !isExpanded && hasActiveTool && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto" />
          )}
        </button>

        <div
          className="overflow-hidden transition-all duration-200"
          style={{
            maxHeight: !collapsible || isExpanded ? `${items.length * 60 + 20}px` : '0',
          }}
        >
          <div className="space-y-0.5 mt-0.5">
            {items.map((item, index) =>
              renderNavItem(item, groupId, index)
            )}
            {/* Show insertion indicator at end of list if dragging to last position */}
            {dragState &&
              dragState.sourceGroup === groupId &&
              dragState.overGroup === groupId &&
              dragState.overIndex === items.length && (
                <div className="h-0.5 bg-emerald-500 mx-3 rounded" />
              )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside className="w-56 bg-[#111111] border-r border-[#2a2a2a] flex flex-col">
      {/* Brand header */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-semibold text-white">Hackbench</h1>
            <p className="text-xs text-gray-400">Offline Developer Toolkit</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {/* Pinned group at the top (only if there are pinned tools) */}
        {pinnedItems.length > 0 &&
          renderGroup('pinned', 'Pinned', pinnedItems, {
            icon: Pin,
            collapsible: false,
          })
        }

        {/* Standard groups */}
        {navGroups.map(group => {
          const orderedItems = getOrderedItems(group)
          return renderGroup(group.id, group.label, orderedItems)
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#2a2a2a] space-y-1.5">
        {/* View mode buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSplitView}
            className={`flex items-center gap-2 flex-1 px-3 py-1.5 rounded-md text-xs transition-colors ${
              splitView ? 'text-emerald-400 bg-emerald-500/10' : 'text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white'
            }`}
            title="Split View (Ctrl+\)"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button
            onClick={onToggleFocusMode}
            className="flex items-center gap-2 flex-1 px-3 py-1.5 rounded-md text-xs text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white transition-colors"
            title="Focus Mode (Ctrl+Shift+F)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Focus</span>
          </button>
        </div>

        {/* Browser button */}
        <button
          onClick={onToggleBrowser}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-white transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Browser</span>
        </button>

        {/* Reset order */}
        <button
          onClick={resetOrder}
          className="text-xs text-[#555555] hover:text-[#888888] cursor-pointer px-3"
        >
          Reset Order
        </button>

        {/* Hints */}
        <div className="text-xs text-[#666666] text-center space-y-1">
          <p>
            <kbd className="px-1.5 py-0.5 bg-[#0a0a0a] rounded border border-[#2a2a2a] text-[#555555]">Ctrl+K</kbd>
            {' '}Search tools
          </p>
          <p>100% Offline &middot; No data leaves your device</p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
