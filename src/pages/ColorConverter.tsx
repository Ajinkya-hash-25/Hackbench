import { useState, useMemo } from 'react'
import { Palette, Copy, Check, RefreshCw } from 'lucide-react'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

interface RGB {
  r: number
  g: number
  b: number
}

interface HSL {
  h: number
  s: number
  l: number
}

function ColorConverter() {
  const [hex, setHex] = useState('#10b981')
  const [rgb, setRgb] = useState<RGB>({ r: 16, g: 185, b: 129 })
  const [hsl, setHsl] = useState<HSL>({ h: 160, s: 82, l: 39 })
  const [copied, setCopied] = useState<string | null>(null)

  // Conversion functions
  const hexToRgb = (hex: string): RGB | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : null
  }

  const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  const rgbToHsl = (r: number, g: number, b: number): HSL => {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  const hslToRgb = (h: number, s: number, l: number): RGB => {
    h /= 360
    s /= 100
    l /= 100
    let r, g, b

    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    }
  }

  // Update all values when hex changes
  const handleHexChange = (value: string) => {
    setHex(value)
    const rgbValue = hexToRgb(value)
    if (rgbValue) {
      setRgb(rgbValue)
      setHsl(rgbToHsl(rgbValue.r, rgbValue.g, rgbValue.b))
    }
  }

  // Update all values when RGB changes
  const handleRgbChange = (key: keyof RGB, value: number) => {
    const newRgb = { ...rgb, [key]: value }
    setRgb(newRgb)
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
    setHsl(rgbToHsl(newRgb.r, newRgb.g, newRgb.b))
  }

  // Update all values when HSL changes
  const handleHslChange = (key: keyof HSL, value: number) => {
    const newHsl = { ...hsl, [key]: value }
    setHsl(newHsl)
    const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l)
    setRgb(newRgb)
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b))
  }

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const generateRandomColor = () => {
    const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
    handleHexChange(randomHex)
  }

  // Color format strings
  const formats = useMemo(() => ({
    hex: hex.toUpperCase(),
    hexLower: hex.toLowerCase(),
    rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    rgba: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    hsla: `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`,
  }), [hex, rgb, hsl])

  // Complementary and related colors
  const relatedColors = useMemo(() => {
    const complementary = (hsl.h + 180) % 360
    const analogous1 = (hsl.h + 30) % 360
    const analogous2 = (hsl.h - 30 + 360) % 360
    const triadic1 = (hsl.h + 120) % 360
    const triadic2 = (hsl.h + 240) % 360

    return {
      complementary: rgbToHex(...Object.values(hslToRgb(complementary, hsl.s, hsl.l)) as [number, number, number]),
      analogous: [
        rgbToHex(...Object.values(hslToRgb(analogous1, hsl.s, hsl.l)) as [number, number, number]),
        rgbToHex(...Object.values(hslToRgb(analogous2, hsl.s, hsl.l)) as [number, number, number]),
      ],
      triadic: [
        rgbToHex(...Object.values(hslToRgb(triadic1, hsl.s, hsl.l)) as [number, number, number]),
        rgbToHex(...Object.values(hslToRgb(triadic2, hsl.s, hsl.l)) as [number, number, number]),
      ],
    }
  }, [hsl])

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Palette className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Color Converter</h2>
            <p className="text-xs text-[#666666]">Convert between HEX, RGB, and HSL</p>
          </div>
        </div>
        <Button variant="secondary" onClick={generateRandomColor}>
          <RefreshCw className="w-4 h-4" />
          Random
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-4">
          {/* Color Preview */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 rounded-lg border border-[#2a2a2a] shadow-lg"
                style={{ backgroundColor: hex }}
              />
              <input
                type="color"
                value={hex}
                onChange={(e) => handleHexChange(e.target.value)}
                className="w-16 h-16 rounded cursor-pointer bg-transparent border-0"
              />
              <div className="flex-1">
                <label className="text-xs text-[#666666] mb-1 block">HEX</label>
                <input
                  type="text"
                  value={hex}
                  onChange={(e) => handleHexChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>
            </div>
          </div>

          {/* RGB Sliders */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">RGB Values</span>
            {(['r', 'g', 'b'] as const).map((channel) => (
              <div key={channel} className="flex items-center gap-3 mb-3">
                <span className="w-8 text-sm font-mono text-[#666666] uppercase">{channel}</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb[channel]}
                  onChange={(e) => handleRgbChange(channel, parseInt(e.target.value))}
                  className="flex-1 accent-emerald-500"
                  style={{
                    background: channel === 'r' ? 'linear-gradient(to right, #000, #f00)' :
                               channel === 'g' ? 'linear-gradient(to right, #000, #0f0)' :
                               'linear-gradient(to right, #000, #00f)'
                  }}
                />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb[channel]}
                  onChange={(e) => handleRgbChange(channel, parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>
            ))}
          </div>

          {/* HSL Sliders */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">HSL Values</span>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 text-sm font-mono text-[#666666]">H</span>
              <input
                type="range"
                min="0"
                max="360"
                value={hsl.h}
                onChange={(e) => handleHslChange('h', parseInt(e.target.value))}
                className="flex-1"
                style={{ background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
              />
              <input
                type="number"
                min="0"
                max="360"
                value={hsl.h}
                onChange={(e) => handleHslChange('h', parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 text-sm font-mono text-[#666666]">S</span>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.s}
                onChange={(e) => handleHslChange('s', parseInt(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={hsl.s}
                onChange={(e) => handleHslChange('s', parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-8 text-sm font-mono text-[#666666]">L</span>
              <input
                type="range"
                min="0"
                max="100"
                value={hsl.l}
                onChange={(e) => handleHslChange('l', parseInt(e.target.value))}
                className="flex-1 accent-emerald-500"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={hsl.l}
                onChange={(e) => handleHslChange('l', parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-white font-mono text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Color Formats */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Color Formats</span>
            <div className="space-y-2">
              {Object.entries(formats).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-[#666666] uppercase">{key}</span>
                  <code className="flex-1 px-3 py-2 bg-[#0a0a0a] rounded text-emerald-400 font-mono text-sm">
                    {value}
                  </code>
                  <button
                    onClick={() => handleCopy(value, key)}
                    className="p-2 hover:bg-[#1a1a1a] rounded transition-colors"
                  >
                    {copied === key ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-[#666666]" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Related Colors */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Related Colors</span>

            <div className="mb-4">
              <span className="text-xs text-[#666666] mb-2 block">Complementary</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded border border-[#2a2a2a] cursor-pointer"
                  style={{ backgroundColor: relatedColors.complementary }}
                  onClick={() => handleHexChange(relatedColors.complementary)}
                />
                <code className="text-xs text-[#a0a0a0] font-mono">{relatedColors.complementary}</code>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-xs text-[#666666] mb-2 block">Analogous</span>
              <div className="flex items-center gap-2">
                {relatedColors.analogous.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded border border-[#2a2a2a] cursor-pointer"
                      style={{ backgroundColor: color }}
                      onClick={() => handleHexChange(color)}
                    />
                    <code className="text-xs text-[#a0a0a0] font-mono">{color}</code>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-[#666666] mb-2 block">Triadic</span>
              <div className="flex items-center gap-2">
                {relatedColors.triadic.map((color, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded border border-[#2a2a2a] cursor-pointer"
                      style={{ backgroundColor: color }}
                      onClick={() => handleHexChange(color)}
                    />
                    <code className="text-xs text-[#a0a0a0] font-mono">{color}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Shades */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 flex-1">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Shades</span>
            <div className="flex gap-1 h-12">
              {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((lightness) => {
                const shadeColor = rgbToHex(...Object.values(hslToRgb(hsl.h, hsl.s, lightness)) as [number, number, number])
                return (
                  <div
                    key={lightness}
                    className="flex-1 rounded cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: shadeColor }}
                    onClick={() => handleHexChange(shadeColor)}
                    title={shadeColor}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ColorConverter
