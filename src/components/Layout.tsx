import { ReactNode, useState, useRef, useCallback, useEffect } from 'react'
import { Minimize2, GripHorizontal } from 'lucide-react'
import Sidebar from './Sidebar'
import { Page } from '../App'

interface LayoutProps {
  children: ReactNode
  rightPane?: ReactNode
  currentPage: Page
  onNavigate: (page: Page) => void
  focusMode: boolean
  onToggleFocusMode: () => void
  splitView: boolean
  onToggleSplitView: () => void
  activeSplitPane: 'left' | 'right'
  onSetActiveSplitPane: (pane: 'left' | 'right') => void
  splitRatio: number
  onSplitRatioChange: (ratio: number) => void
  onToggleBrowser: () => void
  currentPageLabel: string
  rightPageLabel: string
  rightPanePage: Page
  onDropOnPane: (pane: 'left' | 'right', toolId: string) => void
}

function Layout({
  children,
  rightPane,
  currentPage,
  onNavigate,
  focusMode,
  onToggleFocusMode,
  splitView,
  onToggleSplitView,
  activeSplitPane,
  onSetActiveSplitPane,
  splitRatio,
  onSplitRatioChange,
  onToggleBrowser,
  currentPageLabel,
  rightPageLabel,
  rightPanePage,
  onDropOnPane,
}: LayoutProps) {
  const [pillVisible, setPillVisible] = useState(false)
  const [dragOverPane, setDragOverPane] = useState<'left' | 'right' | null>(null)
  const pillTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Focus mode floating pill
  useEffect(() => {
    if (!focusMode) return
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 40) {
        setPillVisible(true)
        if (pillTimer.current) clearTimeout(pillTimer.current)
        pillTimer.current = setTimeout(() => setPillVisible(false), 2000)
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (pillTimer.current) clearTimeout(pillTimer.current)
    }
  }, [focusMode])

  // Draggable split divider
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const ratio = ((ev.clientX - rect.left) / rect.width) * 100
      onSplitRatioChange(Math.min(75, Math.max(25, ratio)))
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [onSplitRatioChange])

  // Pane drop handlers
  const handlePaneDragOver = useCallback((e: React.DragEvent, pane: 'left' | 'right') => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverPane(pane)
  }, [])

  const handlePaneDrop = useCallback((e: React.DragEvent, pane: 'left' | 'right') => {
    e.preventDefault()
    setDragOverPane(null)
    const toolId = e.dataTransfer.getData('text/plain')
    if (toolId) onDropOnPane(pane, toolId)
  }, [onDropOnPane])

  const handlePaneDragLeave = useCallback(() => {
    setDragOverPane(null)
  }, [])

  // Pane header drag start (to drag a tool from one pane to another)
  const handlePaneHeaderDragStart = useCallback((e: React.DragEvent, toolId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', toolId)
  }, [])

  return (
    <div className="flex h-screen bg-[#0a0a0a]">
      {!focusMode && (
        <Sidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
          onToggleBrowser={onToggleBrowser}
          splitView={splitView}
          onToggleSplitView={onToggleSplitView}
          onToggleFocusMode={onToggleFocusMode}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <div ref={containerRef} className="flex-1 overflow-hidden flex">
          {/* Left pane */}
          <div
            style={{ width: splitView ? `${splitRatio}%` : '100%' }}
            className={`overflow-hidden h-full flex flex-col relative ${
              splitView
                ? dragOverPane === 'left'
                  ? 'border-2 border-emerald-500/50 rounded-lg'
                  : activeSplitPane === 'left'
                    ? 'border border-emerald-500/30 rounded-lg'
                    : 'border border-transparent'
                : dragOverPane === 'left'
                  ? 'ring-2 ring-emerald-500/40 ring-inset rounded-lg'
                  : ''
            }`}
            onClick={() => splitView && onSetActiveSplitPane('left')}
            onDragOver={(e) => handlePaneDragOver(e, 'left')}
            onDrop={(e) => handlePaneDrop(e, 'left')}
            onDragLeave={handlePaneDragLeave}
          >
            {/* Drop overlay */}
            {dragOverPane === 'left' && (
              <div className="absolute inset-0 bg-emerald-500/5 z-10 flex items-center justify-center pointer-events-none">
                <span className="text-emerald-400 text-sm font-medium bg-[#111111] border border-emerald-500/30 rounded-full px-4 py-1.5">Drop to open here</span>
              </div>
            )}
            {/* Pane header (split mode only) */}
            {splitView && (
              <div
                draggable
                onDragStart={(e) => handlePaneHeaderDragStart(e, currentPage)}
                className="flex items-center gap-2 px-3 py-1 border-b border-[#2a2a2a] shrink-0 cursor-grab active:cursor-grabbing bg-[#0a0a0a]"
              >
                <GripHorizontal className="w-3.5 h-3.5 text-[#444444]" />
                <span className="text-xs font-medium text-[#a0a0a0] truncate">{currentPageLabel}</span>
              </div>
            )}
            <div className="flex-1 min-h-0 p-4">
              <div className="h-full">{children}</div>
            </div>
          </div>

          {/* Divider */}
          {splitView && (
            <div
              onMouseDown={handleDividerMouseDown}
              className="w-1 cursor-col-resize hover:bg-emerald-500/30 bg-[#2a2a2a] transition-colors shrink-0"
            />
          )}

          {/* Right pane */}
          {splitView && rightPane && (
            <div
              style={{ width: `${100 - splitRatio}%` }}
              className={`overflow-hidden h-full flex flex-col relative ${
                dragOverPane === 'right'
                  ? 'border-2 border-emerald-500/50 rounded-lg'
                  : activeSplitPane === 'right'
                    ? 'border border-emerald-500/30 rounded-lg'
                    : 'border border-transparent'
              }`}
              onClick={() => onSetActiveSplitPane('right')}
              onDragOver={(e) => handlePaneDragOver(e, 'right')}
              onDrop={(e) => handlePaneDrop(e, 'right')}
              onDragLeave={handlePaneDragLeave}
            >
              {/* Drop overlay */}
              {dragOverPane === 'right' && (
                <div className="absolute inset-0 bg-emerald-500/5 z-10 flex items-center justify-center pointer-events-none">
                  <span className="text-emerald-400 text-sm font-medium bg-[#111111] border border-emerald-500/30 rounded-full px-4 py-1.5">Drop to open here</span>
                </div>
              )}
              {/* Right pane header */}
              <div
                draggable
                onDragStart={(e) => handlePaneHeaderDragStart(e, rightPanePage)}
                className="flex items-center gap-2 px-3 py-1 border-b border-[#2a2a2a] shrink-0 cursor-grab active:cursor-grabbing bg-[#0a0a0a]"
              >
                <GripHorizontal className="w-3.5 h-3.5 text-[#444444]" />
                <span className="text-xs font-medium text-[#a0a0a0] truncate">{rightPageLabel}</span>
              </div>
              <div className="flex-1 min-h-0 p-4">
                <div className="h-full">{rightPane}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Focus mode pill */}
      {focusMode && (
        <div
          className={`fixed top-3 right-3 bg-[#1a1a1a] border border-[#2a2a2a] text-[#e0e0e0] rounded-full px-4 py-2 flex items-center gap-3 z-50 transition-opacity duration-300 ${
            pillVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <span className="text-sm font-medium">{currentPageLabel}</span>
          <span className="text-xs text-[#555555]">Ctrl+Shift+F</span>
          <button onClick={onToggleFocusMode} className="p-1 hover:bg-[#2a2a2a] rounded transition-colors">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default Layout
