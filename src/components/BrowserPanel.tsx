import { useState, useRef, useEffect, useCallback } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  ExternalLink,
  Globe,
} from 'lucide-react'

interface BrowserPanelProps {
  isOpen: boolean
  onClose: () => void
}

const QUICK_LINKS = [
  { label: 'Claude', url: 'https://claude.ai' },
  { label: 'ChatGPT', url: 'https://chat.openai.com' },
  { label: 'Gemini', url: 'https://gemini.google.com' },
  { label: 'Custom', url: '' },
]

const STORAGE_KEY = 'hackbench-browser-url'
const WIDTH_KEY = 'hackbench-browser-width'

export default function BrowserPanel({ isOpen, onClose }: BrowserPanelProps) {
  const [url, setUrl] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'https://claude.ai'
    } catch {
      return 'https://claude.ai'
    }
  })
  const [inputUrl, setInputUrl] = useState(url)
  const [loadError, setLoadError] = useState(false)
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      return parseInt(localStorage.getItem(WIDTH_KEY) || '480')
    } catch {
      return 480
    }
  })
  const webviewRef = useRef<any>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Persist URL
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, url) } catch {}
  }, [url])

  // Persist width
  useEffect(() => {
    try { localStorage.setItem(WIDTH_KEY, String(panelWidth)) } catch {}
  }, [panelWidth])

  useEffect(() => { setInputUrl(url) }, [url])

  // Webview events
  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || !isOpen) return

    const onFail = () => setLoadError(true)
    const onCommit = () => setLoadError(false)
    const onNav = (e: any) => {
      if (e.url) { setInputUrl(e.url); setUrl(e.url) }
    }

    webview.addEventListener('did-fail-load', onFail)
    webview.addEventListener('load-commit', onCommit)
    webview.addEventListener('did-navigate', onNav)
    return () => {
      webview.removeEventListener('did-fail-load', onFail)
      webview.removeEventListener('load-commit', onCommit)
      webview.removeEventListener('did-navigate', onNav)
    }
  }, [isOpen])

  const navigateTo = (newUrl: string) => {
    if (!newUrl) return
    let normalized = newUrl.trim()
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized
    }
    // Validate URL protocol before loading
    try {
      const parsed = new URL(normalized)
      if (!['http:', 'https:'].includes(parsed.protocol)) return
    } catch { return }
    setUrl(normalized)
    setInputUrl(normalized)
    setLoadError(false)
  }

  const handleUrlSubmit = (e: React.FormEvent) => { e.preventDefault(); navigateTo(inputUrl) }
  const handleBack = () => webviewRef.current?.goBack?.()
  const handleForward = () => webviewRef.current?.goForward?.()
  const handleRefresh = () => webviewRef.current?.reload?.()
  const handleOpenExternal = () => {
    try {
      const parsed = new URL(url)
      if (['http:', 'https:'].includes(parsed.protocol)) {
        window.open(url, '_blank')
      }
    } catch { /* invalid URL, do nothing */ }
  }

  const handleQuickLink = (linkUrl: string) => {
    if (linkUrl === '') {
      setInputUrl(''); setUrl(''); setLoadError(false)
    } else {
      navigateTo(linkUrl)
    }
  }

  // Resizable left edge drag
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startX = e.clientX
    const startWidth = panelWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startX - ev.clientX
      const newWidth = Math.min(900, Math.max(300, startWidth + delta))
      setPanelWidth(newWidth)
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [panelWidth])

  // Only render webview when open to avoid background resource usage
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (isOpen) setMounted(true)
  }, [isOpen])

  return (
    <div
      ref={panelRef}
      style={{ width: panelWidth }}
      className={`fixed top-0 right-0 h-full bg-[#111111] border-l border-[#2a2a2a] z-50 flex transition-transform duration-200 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleResizeStart}
        className="w-1.5 cursor-col-resize hover:bg-emerald-500/30 bg-transparent transition-colors shrink-0 -ml-0.5"
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2a]">
          <div className="p-1 rounded bg-emerald-500/10">
            <Globe className="w-4 h-4 text-emerald-500" />
          </div>
          <form onSubmit={handleUrlSubmit} className="flex-1 min-w-0">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter URL..."
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-md px-3 py-1.5 text-sm text-[#e0e0e0] placeholder-[#444444] outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
          </form>
          <button onClick={onClose} className="p-1.5 rounded-md text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick links */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#2a2a2a]">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => handleQuickLink(link.url)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                url === link.url ? 'bg-emerald-500/10 text-emerald-500' : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Nav bar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#2a2a2a]">
          <button onClick={handleBack} className="p-1.5 rounded-md text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Back">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handleForward} className="p-1.5 rounded-md text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Forward">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={handleRefresh} className="p-1.5 rounded-md text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Refresh">
            <RotateCw className="w-4 h-4" />
          </button>
          <div className="flex-1" />
          <button onClick={handleOpenExternal} className="p-1.5 rounded-md text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] transition-colors" title="Open externally">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Webview */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {mounted && url ? (
            <webview
              ref={webviewRef}
              src={url}
              className="flex-1 w-full"
              partition="persist:browser-panel"
              style={{ minHeight: 0 }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-[#666666]">Enter a URL to get started</p>
            </div>
          )}

          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111] gap-4">
              <Globe className="w-10 h-10 text-[#444444]" />
              <p className="text-sm text-[#a0a0a0]">This site may block embedding.</p>
              <button
                onClick={handleOpenExternal}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Browser
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
