import { useState, useMemo } from 'react'
import { Key, Copy, Check, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Button from '../components/common/Button'
import TextArea from '../components/common/TextArea'
import { copyToClipboard } from '../utils/clipboard'

interface JwtParts {
  header: Record<string, unknown> | null
  payload: Record<string, unknown> | null
  signature: string
  headerRaw: string
  payloadRaw: string
}

function JwtDecoder() {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const decodeBase64Url = (str: string): string => {
    try {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
      return atob(padded)
    } catch {
      return ''
    }
  }

  const decoded = useMemo((): JwtParts | null => {
    const token = input.trim()
    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    try {
      const headerRaw = decodeBase64Url(parts[0])
      const payloadRaw = decodeBase64Url(parts[1])

      return {
        header: headerRaw ? JSON.parse(headerRaw) : null,
        payload: payloadRaw ? JSON.parse(payloadRaw) : null,
        signature: parts[2],
        headerRaw,
        payloadRaw
      }
    } catch {
      return null
    }
  }, [input])

  const isExpired = useMemo(() => {
    if (!decoded?.payload) return null
    const exp = decoded.payload.exp as number | undefined
    if (!exp) return null
    return Date.now() / 1000 > exp
  }, [decoded])

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const renderJsonValue = (value: unknown, key: string): JSX.Element => {
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    const isTimestamp = ['exp', 'iat', 'nbf'].includes(key) && typeof value === 'number'

    return (
      <span className="text-emerald-400 font-mono">
        {typeof value === 'string' ? `"${value}"` : String(value)}
        {isTimestamp && (
          <span className="text-[#555555] ml-2 text-xs">
            ({formatTimestamp(value as number)})
          </span>
        )}
      </span>
    )
  }

  const renderSection = (
    title: string,
    data: Record<string, unknown> | null,
    copyKey: string
  ) => (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <span className="text-sm font-medium text-[#a0a0a0]">{title}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCopy(JSON.stringify(data, null, 2), copyKey)}
        >
          {copied === copyKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
      <div className="p-4 space-y-2">
        {data ? (
          Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-blue-400 font-mono">"{key}":</span>
              {renderJsonValue(value, key)}
            </div>
          ))
        ) : (
          <span className="text-[#555555]">Invalid data</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Key className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">JWT Decoder</h2>
            <p className="text-xs text-[#666666]">Decode and inspect JSON Web Tokens</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#a0a0a0]">JWT Token</span>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your JWT token here..."
            mono
          />

          {input.trim() && !decoded && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">Invalid JWT format</span>
              </div>
              <p className="text-red-300/70 text-xs mt-1">
                JWT should have 3 parts separated by dots (header.payload.signature)
              </p>
            </div>
          )}

          {decoded && isExpired !== null && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isExpired
                  ? 'bg-red-500/10 border border-red-500/30'
                  : 'bg-emerald-500/10 border border-emerald-500/30'
              }`}
            >
              {isExpired ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">Token has expired</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm">Token is not expired</span>
                </>
              )}
            </div>
          )}

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 mt-auto">
            <h3 className="text-sm font-medium text-[#a0a0a0] mb-3">Common JWT Claims</h3>
            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono w-12">iss</span>
                <span className="text-[#555555]">Issuer - who created the token</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono w-12">sub</span>
                <span className="text-[#555555]">Subject - who the token is about</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono w-12">aud</span>
                <span className="text-[#555555]">Audience - who should accept the token</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono w-12">exp</span>
                <span className="text-[#555555]">Expiration time (Unix timestamp)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono w-12">iat</span>
                <span className="text-[#555555]">Issued at (Unix timestamp)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-blue-400 font-mono w-12">nbf</span>
                <span className="text-[#555555]">Not before (Unix timestamp)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-auto">
          {decoded ? (
            <>
              {renderSection('Header', decoded.header, 'header')}
              {renderSection('Payload', decoded.payload, 'payload')}

              <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
                  <span className="text-sm font-medium text-[#a0a0a0]">Signature</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(decoded.signature, 'signature')}
                  >
                    {copied === 'signature' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="p-4">
                  <code className="text-emerald-400 font-mono text-sm break-all">
                    {decoded.signature}
                  </code>
                  <p className="text-[#555555] text-xs mt-2">
                    Note: Signature verification requires the secret key
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[#555555] text-sm">
              Paste a JWT token to decode
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JwtDecoder
