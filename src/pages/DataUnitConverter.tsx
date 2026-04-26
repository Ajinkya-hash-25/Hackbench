import { useState } from 'react'
import { Copy, Check, HardDrive } from 'lucide-react'

type UnitId =
  | 'b' | 'B'
  | 'kb' | 'kB' | 'Kib' | 'KiB' | 'KB'
  | 'Mb' | 'MB' | 'Mib' | 'MiB'
  | 'Gb' | 'GB' | 'Gib' | 'GiB'

interface Unit {
  id: UnitId
  short: string
  name: string
  bits: number
  standard: 'SI' | 'IEC' | 'base'
  type: 'bit' | 'byte'
}

const UNITS: Unit[] = [
  { id: 'b',   short: 'b',   name: 'bit',              bits: 1,               standard: 'base', type: 'bit'  },
  { id: 'B',   short: 'B',   name: 'Byte',             bits: 8,               standard: 'base', type: 'byte' },
  { id: 'kb',  short: 'kb',  name: 'kilobit',          bits: 1_000,           standard: 'SI',   type: 'bit'  },
  { id: 'kB',  short: 'kB',  name: 'kilobyte',         bits: 8_000,           standard: 'SI',   type: 'byte' },
  { id: 'Kib', short: 'Kib', name: 'kibibit',          bits: 1_024,           standard: 'IEC',  type: 'bit'  },
  { id: 'KiB', short: 'KiB', name: 'kibibyte',         bits: 8_192,           standard: 'IEC',  type: 'byte' },
  { id: 'KB',  short: 'KB',  name: 'kilobyte (= KiB)', bits: 8_192,           standard: 'IEC',  type: 'byte' },
  { id: 'Mb',  short: 'Mb',  name: 'megabit',          bits: 1_000_000,       standard: 'SI',   type: 'bit'  },
  { id: 'MB',  short: 'MB',  name: 'megabyte',         bits: 8_000_000,       standard: 'SI',   type: 'byte' },
  { id: 'Mib', short: 'Mib', name: 'mebibit',          bits: 1_048_576,       standard: 'IEC',  type: 'bit'  },
  { id: 'MiB', short: 'MiB', name: 'mebibyte',         bits: 8_388_608,       standard: 'IEC',  type: 'byte' },
  { id: 'Gb',  short: 'Gb',  name: 'gigabit',          bits: 1_000_000_000,   standard: 'SI',   type: 'bit'  },
  { id: 'GB',  short: 'GB',  name: 'gigabyte',         bits: 8_000_000_000,   standard: 'SI',   type: 'byte' },
  { id: 'Gib', short: 'Gib', name: 'gibibit',          bits: 1_073_741_824,   standard: 'IEC',  type: 'bit'  },
  { id: 'GiB', short: 'GiB', name: 'gibibyte',         bits: 8_589_934_592,   standard: 'IEC',  type: 'byte' },
]

const UNIT_MAP = new Map(UNITS.map(u => [u.id, u]))

const ROWS: { label: string; units: UnitId[] }[] = [
  { label: 'Base',  units: ['b', 'B'] },
  { label: 'Kilo',  units: ['kb', 'kB', 'Kib', 'KiB', 'KB'] },
  { label: 'Mega',  units: ['Mb', 'MB', 'Mib', 'MiB'] },
  { label: 'Giga',  units: ['Gb', 'GB', 'Gib', 'GiB'] },
]

function convert(value: number, fromId: UnitId, toId: UnitId): string {
  if (isNaN(value) || value < 0) return ''
  const from = UNIT_MAP.get(fromId)!
  const to   = UNIT_MAP.get(toId)!
  const result = (value * from.bits) / to.bits
  if (result === 0) return '0'
  if (!isFinite(result)) return '∞'
  const abs = Math.abs(result)
  if (abs >= 1e-6 && abs < 1e18)
    return result.toPrecision(15).replace(/\.?0+$/, '')
  return result.toPrecision(15)
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  if (!value || value === '—') return null
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/5 text-[#444] hover:text-emerald-400 transition-opacity"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

export default function DataUnitConverter() {
  const [fromUnit, setFromUnit] = useState<UnitId>('MiB')
  const [inputValue, setInputValue] = useState('1')

  const numVal   = parseFloat(inputValue)
  const hasValue = inputValue !== '' && !isNaN(numVal) && numVal >= 0
  const from     = UNIT_MAP.get(fromUnit)!

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d] text-white">

      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3 border-b border-[#1a1a1a] shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-md bg-emerald-500/10">
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-sm font-semibold">Data Unit Converter</h2>
        </div>

        {/* Input row */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            min="0"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="0"
            className="w-32 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xl font-mono text-white focus:outline-none focus:border-emerald-500 placeholder-[#2a2a2a] transition-colors"
          />
          {/* Active unit badge */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xl text-emerald-400">{from.short}</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-[#555]">{from.name}</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${from.standard === 'IEC' ? 'bg-violet-500/15 text-violet-400' : from.standard === 'SI' ? 'bg-blue-500/15 text-blue-400' : 'bg-[#1a1a1a] text-[#666]'}`}>
                  {from.standard === 'IEC' ? 'IEC ×1024' : from.standard === 'SI' ? 'SI ×1000' : 'base'}
                </span>
                <span className="text-[10px] text-[#444]">{from.type === 'byte' ? 'B = 8 bits' : 'b = 1 bit'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Unit selector pills */}
        <div className="mt-3 flex gap-4 flex-wrap">
          {/* IEC column */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#3a3a3a] uppercase tracking-wider">IEC ×1024</span>
            <div className="flex gap-1 flex-wrap">
              {(['KB', 'KiB', 'MiB', 'GiB', 'Kib', 'Mib', 'Gib'] as UnitId[]).map(uid => {
                const u = UNIT_MAP.get(uid)!
                const active = fromUnit === uid
                const isByte = u.type === 'byte'
                return (
                  <button key={uid} onClick={() => setFromUnit(uid)}
                    title={u.name}
                    className={`px-2 py-0.5 rounded text-xs font-mono border transition-all ${
                      active
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : isByte
                          ? 'bg-[#111] border-violet-500/40 text-violet-300 hover:border-violet-400/70'
                          : 'bg-[#111] border-violet-500/20 text-violet-400/60 hover:border-violet-500/40'
                    }`}
                  >{u.short}</button>
                )
              })}
            </div>
          </div>
          {/* SI column */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#3a3a3a] uppercase tracking-wider">SI ×1000</span>
            <div className="flex gap-1 flex-wrap">
              {(['kB', 'MB', 'GB', 'kb', 'Mb', 'Gb'] as UnitId[]).map(uid => {
                const u = UNIT_MAP.get(uid)!
                const active = fromUnit === uid
                const isByte = u.type === 'byte'
                return (
                  <button key={uid} onClick={() => setFromUnit(uid)}
                    title={u.name}
                    className={`px-2 py-0.5 rounded text-xs font-mono border transition-all ${
                      active
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : isByte
                          ? 'bg-[#111] border-blue-500/35 text-blue-300/80 hover:border-blue-400/60'
                          : 'bg-[#111] border-blue-500/15 text-blue-400/50 hover:border-blue-500/30'
                    }`}
                  >{u.short}</button>
                )
              })}
            </div>
          </div>
          {/* Base */}
          <div className="flex flex-col gap-1">
            <span className="text-[9px] text-[#3a3a3a] uppercase tracking-wider">Base</span>
            <div className="flex gap-1">
              {(['B', 'b'] as UnitId[]).map(uid => {
                const active = fromUnit === uid
                return (
                  <button key={uid} onClick={() => setFromUnit(uid)}
                    className={`px-2 py-0.5 rounded text-xs font-mono border transition-all ${
                      active ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-[#111] border-[#2a2a2a] text-[#666] hover:border-[#444] hover:text-[#aaa]'
                    }`}
                  >{uid}</button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="flex-1 px-5 py-3 overflow-y-auto">
        {ROWS.map(row => (
          <div key={row.label} className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] text-[#3a3a3a] uppercase tracking-wider w-8 shrink-0">{row.label}</span>
              <div className="flex-1 h-px bg-[#1a1a1a]" />
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.units.length}, minmax(0,1fr))` }}>
              {row.units.map(uid => {
                const u      = UNIT_MAP.get(uid)!
                const val    = hasValue ? convert(numVal, fromUnit, uid) : '—'
                const isFrom = uid === fromUnit
                const accent = isFrom
                  ? 'border-emerald-500/50 bg-emerald-500/5'
                  : u.standard === 'IEC'
                    ? 'border-violet-500/20 bg-[#0f0f14]'
                    : u.standard === 'SI'
                      ? 'border-blue-500/15 bg-[#0e0e14]'
                      : 'border-[#1e1e1e] bg-[#111]'
                const symColor = isFrom
                  ? 'text-emerald-400'
                  : u.standard === 'IEC' ? 'text-violet-400' : u.standard === 'SI' ? 'text-blue-400' : 'text-[#888]'

                return (
                  <div
                    key={uid}
                    onClick={() => setFromUnit(uid)}
                    className={`group rounded-md border px-2.5 py-2 cursor-pointer transition-all hover:brightness-110 ${accent}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-mono text-xs font-bold ${symColor}`}>{u.short}</span>
                      {isFrom && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-mono text-sm text-white truncate flex-1" title={val}>{val}</span>
                      <CopyBtn value={val} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
