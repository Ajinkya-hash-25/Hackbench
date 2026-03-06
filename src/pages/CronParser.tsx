import { useState, useMemo } from 'react'
import { Timer, Copy, Check, AlertTriangle } from 'lucide-react'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

interface CronParts {
  minute: string
  hour: string
  dayOfMonth: string
  month: string
  dayOfWeek: string
}

function CronParser() {
  const [expression, setExpression] = useState('0 9 * * 1-5')
  const [copied, setCopied] = useState(false)

  const parseCronPart = (value: string, type: keyof CronParts): string => {
    if (value === '*') {
      switch (type) {
        case 'minute': return 'every minute'
        case 'hour': return 'every hour'
        case 'dayOfMonth': return 'every day of month'
        case 'month': return 'every month'
        case 'dayOfWeek': return 'every day of week'
      }
    }

    if (value.includes('/')) {
      const [, step] = value.split('/')
      switch (type) {
        case 'minute': return `every ${step} minutes`
        case 'hour': return `every ${step} hours`
        case 'dayOfMonth': return `every ${step} days`
        case 'month': return `every ${step} months`
        case 'dayOfWeek': return `every ${step} days of week`
      }
    }

    if (value.includes('-')) {
      const [start, end] = value.split('-')
      switch (type) {
        case 'minute': return `minutes ${start} through ${end}`
        case 'hour': return `hours ${start} through ${end}`
        case 'dayOfMonth': return `days ${start} through ${end}`
        case 'month': return `months ${start} through ${end}`
        case 'dayOfWeek': {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          return `${days[parseInt(start)] || start} through ${days[parseInt(end)] || end}`
        }
      }
    }

    if (value.includes(',')) {
      const values = value.split(',')
      switch (type) {
        case 'minute': return `at minutes ${values.join(', ')}`
        case 'hour': return `at hours ${values.join(', ')}`
        case 'dayOfMonth': return `on days ${values.join(', ')}`
        case 'month': return `in months ${values.join(', ')}`
        case 'dayOfWeek': {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          return values.map(v => days[parseInt(v)] || v).join(', ')
        }
      }
    }

    switch (type) {
      case 'minute': return `at minute ${value}`
      case 'hour': return `at hour ${value}`
      case 'dayOfMonth': return `on day ${value}`
      case 'month': {
        const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December']
        return `in ${months[parseInt(value)] || value}`
      }
      case 'dayOfWeek': {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return `on ${days[parseInt(value)] || value}`
      }
    }

    return value
  }

  const parsed = useMemo(() => {
    const parts = expression.trim().split(/\s+/)

    if (parts.length < 5 || parts.length > 6) {
      return { valid: false, error: 'Cron expression must have 5 or 6 fields', parts: null, description: '' }
    }

    const isExtended = parts.length === 6
    const [minute, hour, dayOfMonth, month, dayOfWeek] = isExtended ? parts.slice(1) : parts

    const cronParts: CronParts = { minute, hour, dayOfMonth, month, dayOfWeek }

    // Validate each part
    const validatePart = (value: string, min: number, max: number): boolean => {
      if (value === '*') return true
      if (value.includes('/')) {
        const [base, step] = value.split('/')
        if (base !== '*' && (isNaN(parseInt(base)) || parseInt(base) < min || parseInt(base) > max)) return false
        return !isNaN(parseInt(step)) && parseInt(step) > 0
      }
      if (value.includes('-')) {
        const [start, end] = value.split('-')
        return !isNaN(parseInt(start)) && !isNaN(parseInt(end)) &&
               parseInt(start) >= min && parseInt(end) <= max
      }
      if (value.includes(',')) {
        return value.split(',').every(v => !isNaN(parseInt(v)) && parseInt(v) >= min && parseInt(v) <= max)
      }
      return !isNaN(parseInt(value)) && parseInt(value) >= min && parseInt(value) <= max
    }

    if (!validatePart(minute, 0, 59)) {
      return { valid: false, error: 'Invalid minute field (0-59)', parts: cronParts, description: '' }
    }
    if (!validatePart(hour, 0, 23)) {
      return { valid: false, error: 'Invalid hour field (0-23)', parts: cronParts, description: '' }
    }
    if (!validatePart(dayOfMonth, 1, 31)) {
      return { valid: false, error: 'Invalid day of month field (1-31)', parts: cronParts, description: '' }
    }
    if (!validatePart(month, 1, 12)) {
      return { valid: false, error: 'Invalid month field (1-12)', parts: cronParts, description: '' }
    }
    if (!validatePart(dayOfWeek, 0, 6)) {
      return { valid: false, error: 'Invalid day of week field (0-6)', parts: cronParts, description: '' }
    }

    // Generate human-readable description
    let description = 'Runs '

    if (minute === '0' && hour !== '*') {
      description += `at ${hour}:00`
    } else if (minute !== '*' && hour !== '*') {
      description += `at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
    } else {
      description += parseCronPart(minute, 'minute')
      if (hour !== '*') {
        description += `, ${parseCronPart(hour, 'hour')}`
      }
    }

    if (dayOfMonth !== '*') {
      description += `, ${parseCronPart(dayOfMonth, 'dayOfMonth')}`
    }

    if (month !== '*') {
      description += `, ${parseCronPart(month, 'month')}`
    }

    if (dayOfWeek !== '*') {
      description += `, ${parseCronPart(dayOfWeek, 'dayOfWeek')}`
    }

    return { valid: true, error: null, parts: cronParts, description }
  }, [expression])

  const getNextRuns = useMemo(() => {
    if (!parsed.valid || !parsed.parts) return []

    const runs: Date[] = []
    const now = new Date()
    let current = new Date(now)
    current.setSeconds(0)
    current.setMilliseconds(0)

    const matchesCron = (date: Date): boolean => {
      const { minute, hour, dayOfMonth, month, dayOfWeek } = parsed.parts!

      const matchesPart = (value: string, dateValue: number): boolean => {
        if (value === '*') return true
        if (value.includes('/')) {
          const [base, step] = value.split('/')
          const start = base === '*' ? 0 : parseInt(base)
          return (dateValue - start) % parseInt(step) === 0
        }
        if (value.includes('-')) {
          const [start, end] = value.split('-')
          return dateValue >= parseInt(start) && dateValue <= parseInt(end)
        }
        if (value.includes(',')) {
          return value.split(',').some(v => parseInt(v) === dateValue)
        }
        return parseInt(value) === dateValue
      }

      return matchesPart(minute, date.getMinutes()) &&
             matchesPart(hour, date.getHours()) &&
             matchesPart(dayOfMonth, date.getDate()) &&
             matchesPart(month, date.getMonth() + 1) &&
             matchesPart(dayOfWeek, date.getDay())
    }

    let iterations = 0
    while (runs.length < 5 && iterations < 525600) { // Max 1 year of minutes
      current.setMinutes(current.getMinutes() + 1)
      if (matchesCron(current)) {
        runs.push(new Date(current))
      }
      iterations++
    }

    return runs
  }, [parsed])

  const handleCopy = async () => {
    const success = await copyToClipboard(expression)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const presets = [
    { name: 'Every minute', cron: '* * * * *' },
    { name: 'Every hour', cron: '0 * * * *' },
    { name: 'Every day at midnight', cron: '0 0 * * *' },
    { name: 'Every day at 9am', cron: '0 9 * * *' },
    { name: 'Weekdays at 9am', cron: '0 9 * * 1-5' },
    { name: 'Every Sunday at midnight', cron: '0 0 * * 0' },
    { name: 'First day of month', cron: '0 0 1 * *' },
    { name: 'Every 15 minutes', cron: '*/15 * * * *' },
  ]

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Timer className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cron Expression Parser</h2>
            <p className="text-xs text-[#666666]">Parse and validate cron expressions</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="Enter cron expression (e.g., 0 9 * * 1-5)"
            className="flex-1 px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
          <Button variant="ghost" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {!parsed.valid && parsed.error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">{parsed.error}</span>
            </div>
          </div>
        )}

        {parsed.valid && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
            <p className="text-emerald-400">{parsed.description}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-4">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Expression Breakdown</span>
            <div className="grid grid-cols-5 gap-2 text-center">
              {['Minute', 'Hour', 'Day (M)', 'Month', 'Day (W)'].map((label, idx) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-xs text-[#555555]">{label}</span>
                  <div className="p-2 bg-[#0a0a0a] rounded font-mono text-emerald-400">
                    {parsed.parts ? Object.values(parsed.parts)[idx] : '-'}
                  </div>
                  <span className="text-xs text-[#555555]">
                    {idx === 0 && '0-59'}
                    {idx === 1 && '0-23'}
                    {idx === 2 && '1-31'}
                    {idx === 3 && '1-12'}
                    {idx === 4 && '0-6'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 flex-1">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Common Presets</span>
            <div className="grid grid-cols-2 gap-2">
              {presets.map(({ name, cron }) => (
                <button
                  key={cron}
                  onClick={() => setExpression(cron)}
                  className="text-left px-3 py-2 bg-[#0a0a0a] hover:bg-[#1a1a1a] rounded text-sm"
                >
                  <div className="text-[#a0a0a0]">{name}</div>
                  <code className="text-xs text-emerald-400/70">{cron}</code>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <span className="text-sm font-medium text-[#a0a0a0] mb-3 block">Next 5 Runs</span>
            {getNextRuns.length > 0 ? (
              <div className="space-y-2">
                {getNextRuns.map((date, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-[#0a0a0a] rounded">
                    <span className="text-[#555555] text-sm w-6">#{idx + 1}</span>
                    <span className="text-[#a0a0a0] text-sm font-mono">
                      {date.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[#555555] text-sm">
                {parsed.valid ? 'Calculating...' : 'Enter a valid expression'}
              </span>
            )}
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 flex-1">
            <h3 className="text-sm font-medium text-[#a0a0a0] mb-3">Syntax Reference</h3>
            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">*</code>
                <span className="text-[#555555]">Any value</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">,</code>
                <span className="text-[#555555]">Value list separator (1,3,5)</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">-</code>
                <span className="text-[#555555]">Range of values (1-5)</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">/</code>
                <span className="text-[#555555]">Step values (*/15)</span>
              </div>
              <div className="pt-2 mt-2 border-t border-[#2a2a2a]">
                <div className="text-[#666666] mb-1">Days of Week</div>
                <p className="text-[#555555]">
                  0 = Sunday, 1 = Monday, ..., 6 = Saturday
                </p>
              </div>
              <div className="pt-2 mt-2 border-t border-[#2a2a2a]">
                <div className="text-[#666666] mb-1">Format</div>
                <code className="text-emerald-400/70 text-xs">
                  MIN HOUR DOM MON DOW
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CronParser
