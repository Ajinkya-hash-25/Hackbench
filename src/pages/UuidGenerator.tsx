import { useState, useCallback } from 'react'
import { Fingerprint, Copy, Check, RefreshCw, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { v1 as uuidv1, v4 as uuidv4, validate as uuidValidate, version as uuidVersion } from 'uuid'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

type UuidVersion = 'v1' | 'v4'

interface GeneratedUuid {
  id: string
  value: string
  version: UuidVersion
  timestamp: number
}

function UuidGenerator() {
  const [uuids, setUuids] = useState<GeneratedUuid[]>([])
  const [version, setVersion] = useState<UuidVersion>('v4')
  const [bulkCount, setBulkCount] = useState(5)
  const [copied, setCopied] = useState<string | null>(null)
  const [validateInput, setValidateInput] = useState('')
  const [uppercase, setUppercase] = useState(false)
  const [noDashes, setNoDashes] = useState(false)

  const generateUuid = useCallback((ver: UuidVersion): string => {
    let uuid = ver === 'v1' ? uuidv1() : uuidv4()
    if (uppercase) {
      uuid = uuid.toUpperCase()
    }
    if (noDashes) {
      uuid = uuid.replace(/-/g, '')
    }
    return uuid
  }, [uppercase, noDashes])

  const handleGenerate = () => {
    const newUuid: GeneratedUuid = {
      id: crypto.randomUUID(),
      value: generateUuid(version),
      version,
      timestamp: Date.now()
    }
    setUuids((prev) => [newUuid, ...prev])
  }

  const handleBulkGenerate = () => {
    const newUuids: GeneratedUuid[] = []
    for (let i = 0; i < bulkCount; i++) {
      newUuids.push({
        id: crypto.randomUUID(),
        value: generateUuid(version),
        version,
        timestamp: Date.now() + i
      })
    }
    setUuids((prev) => [...newUuids, ...prev])
  }

  const handleCopy = async (uuid: string) => {
    const success = await copyToClipboard(uuid)
    if (success) {
      setCopied(uuid)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleCopyAll = async () => {
    const allUuids = uuids.map((u) => u.value).join('\n')
    const success = await copyToClipboard(allUuids)
    if (success) {
      setCopied('all')
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const handleDelete = (id: string) => {
    setUuids((prev) => prev.filter((u) => u.id !== id))
  }

  const handleClear = () => {
    setUuids([])
  }

  const validationResult = validateInput.trim()
    ? {
        valid: uuidValidate(validateInput.trim()),
        version: uuidValidate(validateInput.trim())
          ? uuidVersion(validateInput.trim())
          : null
      }
    : null

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Fingerprint className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">UUID Generator</h2>
            <p className="text-xs text-[#666666]">Generate and validate UUIDs</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#666666]">Version:</span>
          <div className="flex border border-[#2a2a2a] rounded-lg overflow-hidden">
            <button
              onClick={() => setVersion('v4')}
              className={`px-3 py-1.5 text-sm font-medium ${
                version === 'v4'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#222222]'
              }`}
            >
              v4 (Random)
            </button>
            <button
              onClick={() => setVersion('v1')}
              className={`px-3 py-1.5 text-sm font-medium ${
                version === 'v1'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-[#1a1a1a] text-[#a0a0a0] hover:bg-[#222222]'
              }`}
            >
              v1 (Timestamp)
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500/50"
          />
          Uppercase
        </label>

        <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
          <input
            type="checkbox"
            checked={noDashes}
            onChange={(e) => setNoDashes(e.target.checked)}
            className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500/50"
          />
          No dashes
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleGenerate}>
          <RefreshCw className="w-4 h-4" />
          Generate
        </Button>

        <div className="flex items-center gap-2 bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-1">
          <span className="text-xs text-[#666666]">Bulk:</span>
          <input
            type="number"
            min={1}
            max={100}
            value={bulkCount}
            onChange={(e) => setBulkCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-16 bg-transparent text-white text-sm focus:outline-none"
          />
          <Button variant="secondary" size="sm" onClick={handleBulkGenerate}>
            Generate
          </Button>
        </div>

        <div className="flex-1" />

        {uuids.length > 0 && (
          <>
            <Button variant="ghost" onClick={handleCopyAll}>
              {copied === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copy All
            </Button>
            <Button variant="ghost" onClick={handleClear}>
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#a0a0a0]">
            Generated UUIDs ({uuids.length})
          </span>
          <div className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-auto">
            {uuids.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#555555] text-sm">
                Click Generate to create UUIDs
              </div>
            ) : (
              <div className="divide-y divide-[#2a2a2a]">
                {uuids.map((uuid) => (
                  <div
                    key={uuid.id}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#1a1a1a]/50 group"
                  >
                    <code className="flex-1 text-sm font-mono text-emerald-400">
                      {uuid.value}
                    </code>
                    <span className="text-xs text-[#555555] px-2 py-0.5 bg-[#1a1a1a] rounded">
                      {uuid.version}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(uuid.value)}
                        className="p-1 hover:bg-[#222222] rounded"
                        title="Copy"
                      >
                        {copied === uuid.value ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#666666]" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(uuid.id)}
                        className="p-1 hover:bg-[#222222] rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[#666666]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#a0a0a0]">Validate UUID</span>
            <input
              type="text"
              value={validateInput}
              onChange={(e) => setValidateInput(e.target.value)}
              placeholder="Paste UUID to validate..."
              className="px-3 py-2 bg-[#111111] border border-[#2a2a2a] rounded-lg text-white placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
            {validationResult && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  validationResult.valid
                    ? 'bg-emerald-500/10 border border-emerald-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                {validationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-400">
                      Valid UUID (version {validationResult.version})
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Invalid UUID format</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
            <h3 className="text-sm font-medium text-[#a0a0a0] mb-3">UUID Format Reference</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[#666666] mb-1">Standard format:</div>
                <code className="text-emerald-400 font-mono text-xs">
                  xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
                </code>
              </div>
              <div>
                <div className="text-[#666666] mb-1">Version 1 (v1):</div>
                <p className="text-[#555555] text-xs">
                  Time-based UUID using timestamp and MAC address
                </p>
              </div>
              <div>
                <div className="text-[#666666] mb-1">Version 4 (v4):</div>
                <p className="text-[#555555] text-xs">
                  Randomly generated UUID (most common)
                </p>
              </div>
              <div className="pt-2 border-t border-[#2a2a2a]">
                <div className="text-[#666666] mb-1">Quick facts:</div>
                <ul className="text-[#555555] text-xs space-y-1">
                  <li>• 128-bit identifier (32 hex characters)</li>
                  <li>• 5 groups separated by hyphens</li>
                  <li>• M indicates version (1-5)</li>
                  <li>• N indicates variant (8, 9, a, or b)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UuidGenerator
