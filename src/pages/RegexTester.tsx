import { useState, useMemo } from 'react'
import { Regex, Copy, Check, AlertTriangle } from 'lucide-react'
import Button from '../components/common/Button'
import TextArea from '../components/common/TextArea'
import { copyToClipboard } from '../utils/clipboard'

interface Match {
  match: string
  index: number
  groups: string[]
}

interface RegexFlags {
  global: boolean
  ignoreCase: boolean
  multiline: boolean
  dotAll: boolean
}

function RegexTester() {
  const [pattern, setPattern] = useState('')
  const [testString, setTestString] = useState('')
  const [replaceWith, setReplaceWith] = useState('')
  const [showReplace, setShowReplace] = useState(false)
  const [flags, setFlags] = useState<RegexFlags>({
    global: true,
    ignoreCase: false,
    multiline: false,
    dotAll: false
  })
  const [copied, setCopied] = useState(false)
  const [copiedResult, setCopiedResult] = useState(false)

  const flagString = useMemo(() => {
    let f = ''
    if (flags.global) f += 'g'
    if (flags.ignoreCase) f += 'i'
    if (flags.multiline) f += 'm'
    if (flags.dotAll) f += 's'
    return f
  }, [flags])

  const result = useMemo(() => {
    if (!pattern.trim()) return { matches: [], error: null, regex: null }

    try {
      const regex = new RegExp(pattern, flagString)
      const matches: Match[] = []

      if (flags.global) {
        let match
        while ((match = regex.exec(testString)) !== null) {
          matches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1)
          })
          if (match.index === regex.lastIndex) {
            regex.lastIndex++
          }
        }
      } else {
        const match = regex.exec(testString)
        if (match) {
          matches.push({
            match: match[0],
            index: match.index,
            groups: match.slice(1)
          })
        }
      }

      return { matches, error: null, regex }
    } catch (e) {
      return { matches: [], error: (e as Error).message, regex: null }
    }
  }, [pattern, testString, flagString, flags.global])

  const highlightedText = useMemo(() => {
    if (!result.regex || result.matches.length === 0 || !testString) {
      return null
    }

    const parts: { text: string; isMatch: boolean }[] = []
    let lastIndex = 0

    result.matches.forEach((match) => {
      if (match.index > lastIndex) {
        parts.push({ text: testString.slice(lastIndex, match.index), isMatch: false })
      }
      parts.push({ text: match.match, isMatch: true })
      lastIndex = match.index + match.match.length
    })

    if (lastIndex < testString.length) {
      parts.push({ text: testString.slice(lastIndex), isMatch: false })
    }

    return parts
  }, [result, testString])

  // Calculate replaced text
  const replacedText = useMemo(() => {
    if (!result.regex || !showReplace) return null
    try {
      return testString.replace(result.regex, replaceWith)
    } catch {
      return null
    }
  }, [result.regex, testString, replaceWith, showReplace])

  const handleCopy = async () => {
    const regexStr = `/${pattern}/${flagString}`
    const success = await copyToClipboard(regexStr)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyResult = async () => {
    if (!replacedText) return
    const success = await copyToClipboard(replacedText)
    if (success) {
      setCopiedResult(true)
      setTimeout(() => setCopiedResult(false), 2000)
    }
  }

  const applyReplace = () => {
    if (replacedText) {
      setTestString(replacedText)
    }
  }

  const toggleFlag = (flag: keyof RegexFlags) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }))
  }

  const commonPatterns = [
    { name: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' },
    { name: 'URL', pattern: 'https?:\\/\\/[\\w\\-.]+(:\\d+)?(\\/[\\w\\-._~:/?#[\\]@!$&\'()*+,;=]*)?' },
    { name: 'Phone', pattern: '\\+?[0-9]{1,3}[-.\\s]?\\(?[0-9]{1,4}\\)?[-.\\s]?[0-9]{1,4}[-.\\s]?[0-9]{1,9}' },
    { name: 'IPv4', pattern: '\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b' },
    { name: 'Date (YYYY-MM-DD)', pattern: '\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])' },
    { name: 'Hex Color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b' },
  ]

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Regex className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Regex Tester</h2>
            <p className="text-xs text-[#666666]">Test regular expressions with live matching</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#555555] font-mono text-lg">/</span>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern..."
            className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
          <span className="text-[#555555] font-mono text-lg">/</span>
          <span className="text-emerald-400 font-mono">{flagString}</span>
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!pattern}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Replace input */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showReplace
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#111111] text-[#666666] border border-[#2a2a2a] hover:border-[#2a2a2a]'
            }`}
          >
            Replace
          </button>
          {showReplace && (
            <>
              <input
                type="text"
                value={replaceWith}
                onChange={(e) => setReplaceWith(e.target.value)}
                placeholder="Replace with... (use $1, $2 for groups)"
                className="flex-1 px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-[#e0e0e0] placeholder-[#444444] font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={applyReplace}
                disabled={!replacedText}
                title="Apply replacement to test string"
              >
                Apply
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyResult}
                disabled={!replacedText}
              >
                {copiedResult ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-[#666666]">Flags:</span>
          {[
            { key: 'global' as const, label: 'g', title: 'Global - find all matches' },
            { key: 'ignoreCase' as const, label: 'i', title: 'Case insensitive' },
            { key: 'multiline' as const, label: 'm', title: 'Multiline - ^ and $ match line boundaries' },
            { key: 'dotAll' as const, label: 's', title: 'Dot all - . matches newlines' },
          ].map(({ key, label, title }) => (
            <button
              key={key}
              onClick={() => toggleFlag(key)}
              title={title}
              className={`w-8 h-8 rounded font-mono text-sm border ${
                flags[key]
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                  : 'bg-[#111111] border-[#2a2a2a] text-[#666666] hover:border-[#2a2a2a]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {result.error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">{result.error}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#a0a0a0]">Test String</span>
          <TextArea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Enter text to test against the regex..."
            mono
          />

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3">
            <span className="text-sm font-medium text-[#a0a0a0] mb-2 block">Common Patterns</span>
            <div className="flex flex-wrap gap-2">
              {commonPatterns.map(({ name, pattern: p }) => (
                <button
                  key={name}
                  onClick={() => setPattern(p)}
                  className="px-2 py-1 text-xs bg-[#1a1a1a] hover:bg-[#222222] text-[#a0a0a0] rounded"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-auto">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden flex-shrink-0">
            <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
              <span className="text-sm font-medium text-[#a0a0a0]">
                Matches ({result.matches.length})
              </span>
            </div>
            <div className="p-4 max-h-[200px] overflow-auto">
              {result.matches.length === 0 ? (
                <span className="text-[#555555] text-sm">
                  {pattern ? 'No matches found' : 'Enter a pattern to find matches'}
                </span>
              ) : (
                <div className="space-y-2">
                  {result.matches.map((match, idx) => (
                    <div key={idx} className="flex flex-col gap-1 p-2 bg-[#0a0a0a] rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-[#555555] text-xs">#{idx + 1}</span>
                        <code className="text-emerald-400 font-mono text-sm">"{match.match}"</code>
                        <span className="text-[#555555] text-xs">at index {match.index}</span>
                      </div>
                      {match.groups.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {match.groups.map((group, gIdx) => (
                            <span key={gIdx} className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                              Group {gIdx + 1}: "{group}"
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {highlightedText && (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden flex-1">
              <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
                <span className="text-sm font-medium text-[#a0a0a0]">Highlighted Matches</span>
              </div>
              <div className="p-4 font-mono text-sm whitespace-pre-wrap overflow-auto">
                {highlightedText.map((part, idx) => (
                  <span
                    key={idx}
                    className={
                      part.isMatch
                        ? 'bg-emerald-500/30 text-emerald-300 rounded px-0.5'
                        : 'text-[#a0a0a0]'
                    }
                  >
                    {part.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Replace preview */}
          {showReplace && replacedText !== null && (
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden flex-shrink-0">
              <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center justify-between">
                <span className="text-sm font-medium text-[#a0a0a0]">Replace Preview</span>
                <span className="text-xs text-[#555555]">
                  {result.matches.length} replacement{result.matches.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="p-4 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[150px] text-blue-300">
                {replacedText}
              </div>
            </div>
          )}

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4 flex-shrink-0">
            <h3 className="text-sm font-medium text-[#a0a0a0] mb-3">Quick Reference</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">.</code>
                <span className="text-[#555555]">Any character</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">\\d</code>
                <span className="text-[#555555]">Digit [0-9]</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">\\w</code>
                <span className="text-[#555555]">Word char [a-zA-Z0-9_]</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">\\s</code>
                <span className="text-[#555555]">Whitespace</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">^</code>
                <span className="text-[#555555]">Start of string</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">$</code>
                <span className="text-[#555555]">End of string</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">*</code>
                <span className="text-[#555555]">0 or more</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">+</code>
                <span className="text-[#555555]">1 or more</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">?</code>
                <span className="text-[#555555]">0 or 1</span>
              </div>
              <div className="flex gap-2">
                <code className="text-blue-400 font-mono w-12">()</code>
                <span className="text-[#555555]">Capture group</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegexTester
