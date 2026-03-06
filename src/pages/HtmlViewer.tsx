import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Code,
  Copy,
  Check,
  Download,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

const STARTER_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; }
  </style>
</head>
<body>
  <h1>Hello, Hackbench!</h1>
</body>
</html>`

type DeviceMode = 'mobile' | 'tablet' | 'desktop'

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  mobile: '375px',
  tablet: '768px',
  desktop: '100%',
}

export default function HtmlViewer() {
  const [html, setHtml] = useState(STARTER_TEMPLATE)
  const [debouncedHtml, setDebouncedHtml] = useState(STARTER_TEMPLATE)
  const [iframeKey, setIframeKey] = useState(0)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [isFullPreview, setIsFullPreview] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce HTML updates to the preview
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedHtml(html)
    }, 300)
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [html])

  const handleRefresh = useCallback(() => {
    setIframeKey((prev) => prev + 1)
  }, [])

  const handleCopy = useCallback(async () => {
    await copyToClipboard(html)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [html])

  const handleDownload = useCallback(() => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'preview.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [html])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const textarea = textareaRef.current
        if (!textarea) return
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const value = textarea.value
        const newValue = value.substring(0, start) + '  ' + value.substring(end)
        setHtml(newValue)
        // Restore cursor position after inserting spaces
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2
          textarea.selectionEnd = start + 2
        })
      }
    },
    []
  )

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <Code className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">HTML Viewer</h1>
            <p className="text-xs text-[#666666]">Live HTML/CSS/JS preview</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        {/* Device preview buttons */}
        <div className="flex items-center gap-1 border border-[#2a2a2a] rounded-lg p-1">
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`p-1.5 rounded-md transition-colors ${
              deviceMode === 'mobile'
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
            }`}
            title="Mobile (375px)"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeviceMode('tablet')}
            className={`p-1.5 rounded-md transition-colors ${
              deviceMode === 'tablet'
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
            }`}
            title="Tablet (768px)"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`p-1.5 rounded-md transition-colors ${
              deviceMode === 'desktop'
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
            }`}
            title="Desktop (100%)"
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            title="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            title="Copy HTML"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            title="Download as .html"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullPreview((prev) => !prev)}
            title={isFullPreview ? 'Show editor' : 'Full preview'}
          >
            {isFullPreview ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Editor + Preview split */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* Editor pane */}
        {!isFullPreview && (
          <div className="flex-1 flex flex-col min-w-0 border border-[#2a2a2a] rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-[#2a2a2a] bg-[#111111]">
              <span className="text-xs text-[#a0a0a0] font-mono">index.html</span>
            </div>
            <textarea
              ref={textareaRef}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="flex-1 w-full resize-none bg-[#0a0a0a] font-mono text-sm text-[#e0e0e0] p-4 outline-none focus:ring-1 focus:ring-emerald-500/40 placeholder-[#444444]"
              placeholder="Enter your HTML here..."
            />
          </div>
        )}

        {/* Preview pane */}
        <div className="flex-1 flex flex-col min-w-0 border border-[#2a2a2a] rounded-lg overflow-hidden bg-white">
          <div className="px-3 py-2 border-b border-[#2a2a2a] bg-[#111111] flex items-center justify-between">
            <span className="text-xs text-[#a0a0a0]">Preview</span>
            <span className="text-xs text-[#444444]">
              {deviceMode === 'mobile'
                ? '375px'
                : deviceMode === 'tablet'
                  ? '768px'
                  : '100%'}
            </span>
          </div>
          <div className="flex-1 flex items-start justify-center bg-[#1a1a1a] p-2 overflow-auto">
            <iframe
              key={iframeKey}
              srcDoc={debouncedHtml}
              title="HTML Preview"
              sandbox="allow-scripts"
              className="bg-white h-full border-0"
              style={{
                width: DEVICE_WIDTHS[deviceMode],
                maxWidth: '100%',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
