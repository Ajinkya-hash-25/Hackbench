import { useState, useEffect } from 'react'
import { Clock, Copy, Check, RefreshCw } from 'lucide-react'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

const timezoneOffsets: Record<string, number> = {
  UTC: 0, GMT: 0, EST: -5, EDT: -4, CST: -6, CDT: -5,
  MST: -7, MDT: -6, PST: -8, PDT: -7, IST: 5.5, JST: 9,
  KST: 9, CST_CN: 8, AEST: 10, AEDT: 11, ACST: 9.5,
  NZST: 12, NZDT: 13, BST: 1, CET: 1, CEST: 2, EET: 2,
  EEST: 3, WET: 0, WEST: 1, HKT: 8, SGT: 8, ICT: 7, PKT: 5,
  BDT: 6, NPT: 5.75, MMT: 6.5, WIB: 7, WITA: 8, WIT: 9,
  GST: 4, AST: -4, ART: -3, BRT: -3, CLT: -4, COT: -5,
  PET: -5, VET: -4, AKST: -9, AKDT: -8, HST: -10, SST: -11,
  CHST: 10, MHT: 12, THA: 7, PHT: 8, MYT: 8, KGT: 6,
}

function parseDateString(input: string): Date | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Try native Date.parse first (handles ISO, RFC2822, etc.)
  const native = new Date(trimmed)
  if (!isNaN(native.getTime()) && trimmed.length > 6) return native

  // Custom: "Thu Feb 19 11:45:02 IST 2026" or "Feb 19 2026 11:45:02 IST"
  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  }

  // Pattern: [Day] Mon DD HH:MM:SS TZ YYYY
  const pat1 = /(?:\w{3}\s+)?(\w{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(\w+)\s+(\d{4})/
  const m1 = trimmed.match(pat1)
  if (m1) {
    const mon = months[m1[1].toLowerCase()]
    if (mon !== undefined) {
      const d = parseInt(m1[2]), h = parseInt(m1[3]), min = parseInt(m1[4]), sec = parseInt(m1[5])
      const tz = m1[6].toUpperCase(), yr = parseInt(m1[7])
      const offset = timezoneOffsets[tz]
      if (offset !== undefined) {
        const utc = Date.UTC(yr, mon, d, h, min, sec) - offset * 3600000
        return new Date(utc)
      }
      return new Date(yr, mon, d, h, min, sec)
    }
  }

  // Pattern: Mon DD YYYY HH:MM:SS TZ
  const pat2 = /(\w{3})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(\w+)?/
  const m2 = trimmed.match(pat2)
  if (m2) {
    const mon = months[m2[1].toLowerCase()]
    if (mon !== undefined) {
      const d = parseInt(m2[2]), yr = parseInt(m2[3])
      const h = parseInt(m2[4]), min = parseInt(m2[5]), sec = parseInt(m2[6])
      const tz = m2[7]?.toUpperCase()
      if (tz && timezoneOffsets[tz] !== undefined) {
        const utc = Date.UTC(yr, mon, d, h, min, sec) - timezoneOffsets[tz] * 3600000
        return new Date(utc)
      }
      return new Date(yr, mon, d, h, min, sec)
    }
  }

  return null
}

function formatCustomString(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const mons = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${days[date.getDay()]} ${mons[date.getMonth()]} ${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${date.getFullYear()}`
}

function TimestampConverter() {
  const [unixSeconds, setUnixSeconds] = useState('')
  const [unixMillis, setUnixMillis] = useState('')
  const [isoString, setIsoString] = useState('')
  const [humanReadable, setHumanReadable] = useState('')
  const [dateString, setDateString] = useState('')
  const [dateStringError, setDateStringError] = useState('')
  const [customFormatted, setCustomFormatted] = useState('')
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [copied, setCopied] = useState<string | null>(null)

  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState('')
  const [minute, setMinute] = useState('')
  const [second, setSecond] = useState('')

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const updateAllFromTimestamp = (timestamp: number, skipDateString?: boolean) => {
    if (isNaN(timestamp)) return
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return

    setUnixSeconds(Math.floor(timestamp / 1000).toString())
    setUnixMillis(timestamp.toString())
    setIsoString(date.toISOString())
    setHumanReadable(date.toLocaleString())
    setCustomFormatted(formatCustomString(date))
    if (!skipDateString) setDateString('')
    setDateStringError('')

    setYear(date.getFullYear().toString())
    setMonth((date.getMonth() + 1).toString().padStart(2, '0'))
    setDay(date.getDate().toString().padStart(2, '0'))
    setHour(date.getHours().toString().padStart(2, '0'))
    setMinute(date.getMinutes().toString().padStart(2, '0'))
    setSecond(date.getSeconds().toString().padStart(2, '0'))
  }

  const handleUnixSecondsChange = (value: string) => {
    setUnixSeconds(value)
    const num = parseInt(value, 10)
    if (!isNaN(num)) updateAllFromTimestamp(num * 1000)
  }

  const handleUnixMillisChange = (value: string) => {
    setUnixMillis(value)
    const num = parseInt(value, 10)
    if (!isNaN(num)) updateAllFromTimestamp(num)
  }

  const handleIsoChange = (value: string) => {
    setIsoString(value)
    const date = new Date(value)
    if (!isNaN(date.getTime())) updateAllFromTimestamp(date.getTime())
  }

  const handleDateStringChange = (value: string) => {
    setDateString(value)
    if (!value.trim()) {
      setDateStringError('')
      return
    }
    const parsed = parseDateString(value)
    if (parsed) {
      setDateStringError('')
      updateAllFromTimestamp(parsed.getTime(), true)
    } else {
      setDateStringError('Could not parse date string')
    }
  }

  const handleDatePartsChange = () => {
    const date = new Date(
      parseInt(year) || 0,
      (parseInt(month) || 1) - 1,
      parseInt(day) || 1,
      parseInt(hour) || 0,
      parseInt(minute) || 0,
      parseInt(second) || 0
    )
    if (!isNaN(date.getTime())) updateAllFromTimestamp(date.getTime())
  }

  const handleNow = () => updateAllFromTimestamp(Date.now())

  const handleCopy = async (text: string, key: string) => {
    if (await copyToClipboard(text)) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const current = (() => {
    const date = new Date(currentTime)
    return {
      unix: Math.floor(currentTime / 1000),
      unixMs: currentTime,
      iso: date.toISOString(),
      local: date.toLocaleString(),
      utc: date.toUTCString()
    }
  })()

  const getRelativeTime = () => {
    if (!unixMillis) return null
    const timestamp = parseInt(unixMillis, 10)
    if (isNaN(timestamp)) return null

    const diff = Date.now() - timestamp
    const absDiff = Math.abs(diff)
    const isFuture = diff < 0

    const seconds = Math.floor(absDiff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    const weeks = Math.floor(days / 7)
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)

    let r = ''
    if (years > 0) r = `${years} year${years > 1 ? 's' : ''}`
    else if (months > 0) r = `${months} month${months > 1 ? 's' : ''}`
    else if (weeks > 0) r = `${weeks} week${weeks > 1 ? 's' : ''}`
    else if (days > 0) r = `${days} day${days > 1 ? 's' : ''}`
    else if (hours > 0) r = `${hours} hour${hours > 1 ? 's' : ''}`
    else if (minutes > 0) r = `${minutes} minute${minutes > 1 ? 's' : ''}`
    else r = `${seconds} second${seconds !== 1 ? 's' : ''}`

    return isFuture ? `in ${r}` : `${r} ago`
  }

  const relativeTime = getRelativeTime()

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => handleCopy(text, id)}
      className="p-2 hover:bg-[#1a1a1a] rounded border border-[#2a2a2a] transition-colors"
    >
      {copied === id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#666666]" />}
    </button>
  )

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Timestamp Converter</h2>
            <p className="text-xs text-[#666666]">Convert between timestamp formats</p>
          </div>
        </div>
        <Button onClick={handleNow}>
          <RefreshCw className="w-4 h-4" /> Now
        </Button>
      </div>

      {/* Current Time */}
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[#a0a0a0]">Current Time</span>
          <span className="text-xs text-[#555555]">Updates every second</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-2 bg-[#0a0a0a] rounded">
            <span className="text-[#666666] text-xs">Unix (s)</span>
            <div className="flex items-center gap-2">
              <code className="text-emerald-400 font-mono text-sm">{current.unix}</code>
              <button onClick={() => handleCopy(current.unix.toString(), 'cur-unix')} className="p-1 hover:bg-[#1a1a1a] rounded">
                {copied === 'cur-unix' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#555555]" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#0a0a0a] rounded">
            <span className="text-[#666666] text-xs">Unix (ms)</span>
            <div className="flex items-center gap-2">
              <code className="text-emerald-400 font-mono text-sm">{current.unixMs}</code>
              <button onClick={() => handleCopy(current.unixMs.toString(), 'cur-ms')} className="p-1 hover:bg-[#1a1a1a] rounded">
                {copied === 'cur-ms' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#555555]" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 bg-[#0a0a0a] rounded col-span-2">
            <span className="text-[#666666] text-xs">ISO 8601</span>
            <div className="flex items-center gap-2">
              <code className="text-emerald-400 font-mono text-xs">{current.iso}</code>
              <button onClick={() => handleCopy(current.iso, 'cur-iso')} className="p-1 hover:bg-[#1a1a1a] rounded">
                {copied === 'cur-iso' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#555555]" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Left column */}
        <div className="flex flex-col gap-3">
          {/* Date String Parser - NEW */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-2 block">Date String Parser</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={dateString}
                onChange={(e) => handleDateStringChange(e.target.value)}
                placeholder="e.g., Thu Feb 19 11:45:02 IST 2026"
                className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
            </div>
            {dateStringError && <p className="text-red-400 text-xs mt-1.5">{dateStringError}</p>}
            <p className="text-[#444444] text-xs mt-1.5">Supports: RFC 2822, ISO 8601, "Thu Feb 19 11:45:02 IST 2026", etc.</p>
          </div>

          {/* Unix */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Unix Timestamp</span>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#555555] mb-1 block">Seconds</label>
                <div className="flex gap-2">
                  <input type="text" value={unixSeconds} onChange={(e) => handleUnixSecondsChange(e.target.value)} placeholder="e.g., 1704067200"
                    className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40" />
                  <CopyBtn text={unixSeconds} id="unix-sec" />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#555555] mb-1 block">Milliseconds</label>
                <div className="flex gap-2">
                  <input type="text" value={unixMillis} onChange={(e) => handleUnixMillisChange(e.target.value)} placeholder="e.g., 1704067200000"
                    className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40" />
                  <CopyBtn text={unixMillis} id="unix-ms" />
                </div>
              </div>
            </div>
          </div>

          {/* ISO */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">ISO 8601 / RFC 3339</span>
            <div className="flex gap-2">
              <input type="text" value={isoString} onChange={(e) => handleIsoChange(e.target.value)} placeholder="e.g., 2024-01-01T00:00:00.000Z"
                className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40" />
              <CopyBtn text={isoString} id="iso" />
            </div>
          </div>

          {/* Human Readable */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Human Readable</span>
            <div className="flex gap-2">
              <input type="text" value={humanReadable} readOnly placeholder="Converted date will appear here"
                className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] text-sm focus:outline-none" />
              <CopyBtn text={humanReadable} id="human" />
            </div>
            {customFormatted && (
              <div className="mt-2 flex items-center justify-between p-2 bg-[#0a0a0a] rounded">
                <code className="text-emerald-400 font-mono text-xs">{customFormatted}</code>
                <button onClick={() => handleCopy(customFormatted, 'custom')} className="p-1 hover:bg-[#1a1a1a] rounded">
                  {copied === 'custom' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#555555]" />}
                </button>
              </div>
            )}
            {relativeTime && (
              <div className="mt-2 text-sm text-emerald-400 font-medium">{relativeTime}</div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          {/* Date Components */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Date & Time Components</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                ['Year', year, setYear, 'YYYY'],
                ['Month', month, setMonth, 'MM'],
                ['Day', day, setDay, 'DD'],
                ['Hour', hour, setHour, 'HH'],
                ['Minute', minute, setMinute, 'mm'],
                ['Second', second, setSecond, 'ss'],
              ] as const).map(([label, val, setter, ph]) => (
                <div key={label}>
                  <label className="text-xs text-[#555555] mb-1 block">{label}</label>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                    onBlur={handleDatePartsChange}
                    placeholder={ph}
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Reference */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 flex-1">
            <h3 className="text-sm font-medium text-[#a0a0a0] mb-3">Quick Reference</h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[#888888] mb-1">Unix Timestamp</div>
                <p className="text-[#555555]">Seconds since January 1, 1970, 00:00:00 UTC</p>
              </div>
              <div>
                <div className="text-[#888888] mb-1">ISO 8601</div>
                <p className="text-[#555555]">Format: YYYY-MM-DDTHH:mm:ss.sssZ</p>
              </div>
              <div>
                <div className="text-[#888888] mb-1">Date String</div>
                <p className="text-[#555555]">Parses timezone abbreviations: IST, EST, PST, UTC, JST, CET, etc.</p>
              </div>
              <div className="pt-2 border-t border-[#2a2a2a]">
                <div className="text-[#888888] mb-1">Common Timestamps</div>
                <div className="space-y-1 text-[#555555]">
                  <div className="flex justify-between"><span>Y2K</span><code className="text-emerald-400/70">946684800</code></div>
                  <div className="flex justify-between"><span>2024-01-01</span><code className="text-emerald-400/70">1704067200</code></div>
                  <div className="flex justify-between"><span>2038 Problem</span><code className="text-emerald-400/70">2147483647</code></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TimestampConverter
