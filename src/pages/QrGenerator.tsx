import { useState, useEffect, useRef } from 'react'
import { QrCode, Download, Copy, Check } from 'lucide-react'
import QRCode from 'qrcode'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

function QrGenerator() {
  const [input, setInput] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [size, setSize] = useState(256)
  const [darkColor, setDarkColor] = useState('#000000')
  const [lightColor, setLightColor] = useState('#ffffff')
  const [copied, setCopied] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!input.trim()) {
      setQrDataUrl('')
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const dataUrl = await QRCode.toDataURL(input, {
          width: size,
          margin: 2,
          errorCorrectionLevel: errorLevel,
          color: {
            dark: darkColor,
            light: lightColor,
          },
        })
        setQrDataUrl(dataUrl)
      } catch {
        setQrDataUrl('')
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [input, size, errorLevel, darkColor, lightColor])

  const handleDownload = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = `qrcode-${Date.now()}.png`
    link.href = qrDataUrl
    link.click()
  }

  const handleCopy = async () => {
    if (qrDataUrl && await copyToClipboard(qrDataUrl)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <QrCode className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">QR Code Generator</h2>
          <p className="text-xs text-[#666666]">Generate QR codes from text or URLs</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left: Input and options */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <span className="text-sm font-medium text-[#a0a0a0]">Content</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text or URL to encode..."
              className="flex-1 w-full px-4 py-3 rounded-lg font-mono text-sm leading-relaxed bg-[#111111] border border-[#2a2a2a] text-[#e0e0e0] placeholder-[#444444] focus:outline-none focus:ring-1 focus:ring-emerald-500/40 resize-none overflow-auto"
            />
          </div>

          {/* Options panel */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 space-y-3">
            <span className="text-sm font-medium text-[#a0a0a0] block">Options</span>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#666666] w-28">Error Correction:</span>
              <div className="flex gap-1">
                {(['L', 'M', 'Q', 'H'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setErrorLevel(level)}
                    className={`px-2.5 py-1 text-xs rounded ${
                      errorLevel === level
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-[#1a1a1a] text-[#666666] border border-[#2a2a2a] hover:text-[#a0a0a0]'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#666666] w-28">Size:</span>
              <input
                type="range"
                min={128}
                max={512}
                step={64}
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <span className="text-xs text-[#a0a0a0] w-14 text-right">{size}px</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#666666] w-28">Foreground:</span>
              <input
                type="color"
                value={darkColor}
                onChange={(e) => setDarkColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-[#a0a0a0] font-mono">{darkColor}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#666666] w-28">Background:</span>
              <input
                type="color"
                value={lightColor}
                onChange={(e) => setLightColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-[#a0a0a0] font-mono">{lightColor}</span>
            </div>
          </div>
        </div>

        {/* Right: QR code preview */}
        <div className="flex flex-col items-center justify-center gap-4 min-h-0">
          {qrDataUrl ? (
            <>
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <img src={qrDataUrl} alt="QR Code" style={{ width: size, height: size, maxWidth: '100%' }} />
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4" /> Download PNG
                </Button>
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <p className="text-xs text-[#666666]">
                {input.length} characters &middot; {size}x{size}px &middot; Error correction: {errorLevel}
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-[#444444]">
              <QrCode className="w-16 h-16" />
              <span className="text-sm">Enter text to generate QR code</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QrGenerator
