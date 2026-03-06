import { useState, useEffect, useRef } from 'react'
import { X, Braces, Binary, Key, Fingerprint, Link2, Database } from 'lucide-react'
import { Page } from '../App'

interface ClipboardMonitorProps {
  onNavigate: (page: Page) => void
}

interface DetectionResult {
  type: string
  page: Page
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function detectContentType(text: string): DetectionResult | null {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length < 3) return null

  // JWT
  if (/^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
    return { type: 'JWT', page: 'jwt', label: 'Open in JWT Decoder', icon: Key }
  }

  // JSON
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 2) {
    try {
      JSON.parse(trimmed)
      return { type: 'JSON', page: 'json', label: 'Open in JSON Formatter', icon: Braces }
    } catch { /* not JSON */ }
  }

  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return { type: 'UUID', page: 'uuid', label: 'Open in UUID Generator', icon: Fingerprint }
  }

  // URL
  if (/^https?:\/\//i.test(trimmed)) {
    return { type: 'URL', page: 'url', label: 'Open in URL Encoder', icon: Link2 }
  }

  // Base64
  if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(trimmed.replace(/\s/g, ''))) {
    return { type: 'Base64', page: 'base64', label: 'Open in Base64 Tool', icon: Binary }
  }

  // SQL
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/i.test(trimmed)) {
    return { type: 'SQL', page: 'sql', label: 'Open in SQL Formatter', icon: Database }
  }

  return null
}

interface ToastData {
  id: number
  detection: DetectionResult
}

function ClipboardMonitor({ onNavigate }: ClipboardMonitorProps) {
  const [toast, setToast] = useState<ToastData | null>(null)
  const toastIdRef = useRef(0)

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const text = e.clipboardData?.getData('text/plain')
      if (!text) return

      const detection = detectContentType(text)
      if (!detection) return

      const id = ++toastIdRef.current
      setToast({ id, detection })

      setTimeout(() => {
        setToast(prev => prev?.id === id ? null : prev)
      }, 5000)
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const handleClick = () => {
    if (toast) {
      onNavigate(toast.detection.page)
      setToast(null)
    }
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setToast(null)
  }

  if (!toast) return null

  const Icon = toast.detection.icon

  return (
    <div
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-xl cursor-pointer hover:bg-[#222222] transition-all animate-slide-up max-w-[350px]"
    >
      <div className="p-1.5 bg-emerald-500/20 rounded-md flex-shrink-0">
        <Icon className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{toast.detection.type} detected</p>
        <p className="text-xs text-[#a0a0a0]">{toast.detection.label}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-[#555555] hover:text-white rounded transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default ClipboardMonitor
