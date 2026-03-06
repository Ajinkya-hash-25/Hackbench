import { useState, useMemo } from 'react'
import { Database, Copy, Check, Minimize2, Maximize2, Search, FileCode } from 'lucide-react'
import Button from '../components/common/Button'
import TextArea from '../components/common/TextArea'
import SearchBar from '../components/common/SearchBar'
import { useSearch } from '../hooks/useSearch'
import { highlightSearchTerm, computeLineMatchOffsets } from '../utils/search'
import { copyToClipboard } from '../utils/clipboard'

type OutputLanguage = 'sql' | 'java' | 'javascript' | 'python' | 'csharp' | 'go'

/** Extract raw SQL from source code strings (Java, Python, JS, C#, Go, etc.) */
function extractSqlFromCode(code: string): string {
  const trimmed = code.trim()

  // Already plain SQL — starts with a SQL keyword
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH|MERGE|TRUNCATE|REPLACE)\b/i.test(trimmed)) {
    return trimmed
  }

  let extracted: string | null = null

  // 1. Java/Spring @Query, @NamedQuery, @NativeQuery annotations
  const annotationMatch = trimmed.match(
    /@(?:Query|NamedQuery|NativeQuery)\s*\(\s*(?:value\s*=\s*)?["']([\s\S]*?)["']\s*[,)]/
  )
  if (annotationMatch) extracted = annotationMatch[1]

  // 2. JPA createQuery / createNativeQuery / .query() / .execute()
  if (!extracted) {
    const methodMatch = trimmed.match(
      /(?:createQuery|createNativeQuery|nativeQuery|query|execute|prepareStatement|prepare|rawQuery)\s*\(\s*["'`]([\s\S]*?)["'`]\s*[,)]/
    )
    if (methodMatch) extracted = methodMatch[1]
  }

  // 3. Python triple-quoted strings """...""" or '''...'''
  if (!extracted) {
    const pyMatch = trimmed.match(/(?:"""|''')([\s\S]*?)(?:"""|''')/)
    if (pyMatch) extracted = pyMatch[1]
  }

  // 4. C# verbatim string @"..."
  if (!extracted) {
    const csMatch = trimmed.match(/@"([\s\S]*?)"/)
    if (csMatch) extracted = csMatch[1].replace(/""/g, '"')
  }

  // 5. Template literals / Go raw strings `...`
  if (!extracted) {
    const tmplMatch = trimmed.match(/`([\s\S]*?)`/)
    if (tmplMatch) {
      extracted = tmplMatch[1].replace(/\$\{[^}]*\}/g, '?')
    }
  }

  // 6. Concatenated double-quoted strings: "..." + "..." or StringBuilder .append("...")
  if (!extracted) {
    const dblQuotes = [...trimmed.matchAll(/"((?:[^"\\]|\\.)*)"/g)]
    if (dblQuotes.length > 0) {
      extracted = dblQuotes
        .map(m => m[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\t/g, ' '))
        .join(' ')
    }
  }

  // 7. Single-quoted strings (PHP, Ruby, etc.)
  if (!extracted) {
    const sglQuotes = [...trimmed.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
    if (sglQuotes.length > 1) {
      extracted = sglQuotes.map(m => m[1].replace(/\\'/g, "'")).join(' ')
    }
  }

  if (!extracted) return trimmed

  // Clean up: normalize whitespace, trim leading/trailing space per line
  return extracted
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function SqlFormatter() {
  const [input, setInput] = useState('SELECT u.id, u.name, u.email, o.order_id, o.total FROM users u INNER JOIN orders o ON u.id = o.user_id WHERE u.status = \'active\' AND o.created_at > \'2024-01-01\' ORDER BY o.total DESC LIMIT 10')
  const [indent, setIndent] = useState(2)
  const [uppercase, setUppercase] = useState(true)
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>('sql')
  const [copied, setCopied] = useState(false)

  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING',
    'LIMIT', 'OFFSET', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN',
    'OUTER JOIN', 'CROSS JOIN', 'ON', 'AS', 'INSERT', 'INTO', 'VALUES', 'UPDATE',
    'SET', 'DELETE', 'CREATE', 'TABLE', 'INDEX', 'VIEW', 'DROP', 'ALTER', 'ADD',
    'COLUMN', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'UNIQUE', 'NOT NULL',
    'DEFAULT', 'CHECK', 'CONSTRAINT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'EXISTS', 'IN', 'NOT', 'LIKE',
    'BETWEEN', 'IS NULL', 'IS NOT NULL', 'ASC', 'DESC', 'DISTINCT', 'ALL',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'CAST',
    'WITH', 'RECURSIVE', 'OVER', 'PARTITION BY', 'ROW_NUMBER', 'RANK', 'DENSE_RANK'
  ]

  const formatSql = (sql: string): string => {
    if (!sql.trim()) return ''

    let formatted = sql.trim()

    // Normalize whitespace
    formatted = formatted.replace(/\s+/g, ' ')

    // Handle case
    if (uppercase) {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
        formatted = formatted.replace(regex, keyword)
      })
    } else {
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
        formatted = formatted.replace(regex, keyword.toLowerCase())
      })
    }

    const indentStr = indent === 0 ? '\t' : ' '.repeat(indent)
    const kw = uppercase ? (k: string) => k : (k: string) => k.toLowerCase()

    // Add newlines before major keywords
    formatted = formatted.replace(new RegExp(`\\b(${kw('SELECT')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('FROM')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('WHERE')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('AND')})\\b`, 'gi'), `\n${indentStr}$1`)
    formatted = formatted.replace(new RegExp(`\\b(${kw('OR')})\\b`, 'gi'), `\n${indentStr}$1`)
    formatted = formatted.replace(new RegExp(`\\b(${kw('ORDER BY')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('GROUP BY')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('HAVING')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('LIMIT')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('OFFSET')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL JOIN|CROSS JOIN|JOIN)\\b`, 'gi'), `\n$1`)
    formatted = formatted.replace(new RegExp(`\\b(${kw('UNION ALL')}|${kw('UNION')}|${kw('INTERSECT')}|${kw('EXCEPT')})\\b`, 'gi'), '\n$1\n')
    formatted = formatted.replace(new RegExp(`\\b(${kw('INSERT INTO')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('VALUES')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('UPDATE')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('SET')})\\b`, 'gi'), '\n$1')
    formatted = formatted.replace(new RegExp(`\\b(${kw('DELETE FROM')})\\b`, 'gi'), '\n$1')

    // Clean up
    formatted = formatted.replace(/^\n+/, '')
    formatted = formatted.replace(/\n\s*\n/g, '\n')

    return formatted
  }

  const minifySql = (sql: string): string => {
    if (!sql.trim()) return ''
    return sql.trim().replace(/\s+/g, ' ')
  }

  const wrapForLanguage = (sql: string, lang: OutputLanguage): string => {
    const lines = sql.split('\n')

    switch (lang) {
      case 'sql':
        return sql

      case 'java':
        return lines.map((line, idx) => {
          const escaped = line.replace(/"/g, '\\"')
          if (idx === 0) return `String sql = "${escaped}"`
          if (idx === lines.length - 1) return `    + "${escaped}";`
          return `    + "${escaped}"`
        }).join('\n')

      case 'javascript':
        return `const sql = \`\n${sql}\n\`;`

      case 'python':
        return `sql = """\n${sql}\n"""`

      case 'csharp':
        return `string sql = @"\n${sql}\n";`

      case 'go':
        return `sql := \`\n${sql}\n\``

      default:
        return sql
    }
  }

  const formatted = useMemo(() => formatSql(input), [input, indent, uppercase])
  const output = useMemo(() => wrapForLanguage(formatted, outputLanguage), [formatted, outputLanguage])

  const search = useSearch(output)

  // Compute per-line match offsets for highlighting
  const outputLines = useMemo(() => output.split('\n'), [output])
  const lineMatchData = useMemo(() => {
    if (!search.searchTerm || !search.isOpen) return null
    return computeLineMatchOffsets(outputLines, search.searchTerm, search.caseSensitive)
  }, [outputLines, search.searchTerm, search.caseSensitive, search.isOpen])

  const renderHighlightedLine = (line: string, lineIdx: number) => {
    if (!lineMatchData || !search.searchTerm) return line
    const info = lineMatchData[lineIdx]
    if (!info || info.count === 0) return line
    const { elements } = highlightSearchTerm(
      line,
      search.searchTerm,
      search.caseSensitive,
      info.offset,
      search.currentIndex
    )
    return elements
  }

  const handleFormat = () => {
    setInput(formatted)
  }

  const handleMinify = () => {
    setInput(minifySql(input))
  }

  const handleExtract = () => {
    const extracted = extractSqlFromCode(input)
    setInput(extracted)
  }

  const handleCopy = async () => {
    const success = await copyToClipboard(output)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const languages: { value: OutputLanguage; label: string }[] = [
    { value: 'sql', label: 'SQL' },
    { value: 'java', label: 'Java' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
  ]

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">SQL Formatter</h2>
            <p className="text-xs text-[#666666]">Format, beautify & extract SQL from code</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Button onClick={handleFormat}>
          <Maximize2 className="w-4 h-4" />
          Format
        </Button>
        <Button variant="secondary" onClick={handleMinify}>
          <Minimize2 className="w-4 h-4" />
          Minify
        </Button>
        <Button variant="secondary" onClick={handleExtract} title="Extract raw SQL from Java, Python, JS, C#, Go source code">
          <FileCode className="w-4 h-4" />
          Extract SQL
        </Button>

        <div className="w-px h-6 bg-[#1a1a1a]" />

        <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
          Indent:
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="bg-[#111111] border border-[#2a2a2a] rounded px-2 py-1 text-[#e0e0e0]"
          >
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
            <option value={0}>Tab</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
          <input
            type="checkbox"
            checked={uppercase}
            onChange={(e) => setUppercase(e.target.checked)}
            className="rounded border-[#2a2a2a] bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500/40"
          />
          Uppercase keywords
        </label>

        <div className="flex-1" />

        <Button variant="ghost" onClick={handleCopy}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          Copy
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#a0a0a0]">Input SQL</span>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste SQL or source code (Java, Python, JS, C#, Go)..."
            mono
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#a0a0a0]">Output</span>
            <div className="flex items-center gap-2">
              {output.trim() && (
                <button
                  onClick={search.open}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[#666666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a] rounded transition-colors"
                  title="Find in output (Ctrl+F)"
                >
                  <Search className="w-3 h-3" />
                </button>
              )}
              <span className="text-xs text-[#555555]">Language:</span>
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value as OutputLanguage)}
                className="bg-[#111111] border border-[#2a2a2a] rounded px-2 py-1 text-[#e0e0e0] text-sm"
              >
                {languages.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div
            ref={search.scrollContainerRef}
            className="flex-1 w-full rounded-lg bg-[#111111] border border-[#2a2a2a] overflow-hidden flex flex-col min-h-0"
          >
            {search.isOpen && (
              <div className="sticky top-0 z-10 flex justify-end p-2 bg-[#111111]/80 backdrop-blur-sm border-b border-[#2a2a2a]">
                <SearchBar
                  isOpen={search.isOpen}
                  searchTerm={search.searchTerm}
                  onSearchChange={search.setSearchTerm}
                  currentMatch={search.currentIndex}
                  totalMatches={search.totalMatches}
                  onNext={search.goToNext}
                  onPrev={search.goToPrev}
                  onClose={search.close}
                  caseSensitive={search.caseSensitive}
                  onToggleCaseSensitive={search.toggleCaseSensitive}
                />
              </div>
            )}
            <div className="flex-1 overflow-auto px-3 py-3">
              {output ? (
                <pre className="font-mono text-sm leading-relaxed text-[#e0e0e0] whitespace-pre-wrap break-words m-0">
                  {search.isOpen && search.searchTerm
                    ? outputLines.map((line, idx) => (
                        <span key={idx}>
                          {renderHighlightedLine(line, idx)}
                          {idx < outputLines.length - 1 ? '\n' : ''}
                        </span>
                      ))
                    : output}
                </pre>
              ) : (
                <span className="font-mono text-sm text-[#555555]">
                  Formatted SQL will appear here...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#a0a0a0] mb-3">Quick Reference</h3>
        <div className="grid grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-[#666666] mb-1">Query</div>
            <div className="text-[#555555] space-y-1">
              <div><code className="text-emerald-400/70">SELECT</code> columns</div>
              <div><code className="text-emerald-400/70">FROM</code> table</div>
              <div><code className="text-emerald-400/70">WHERE</code> condition</div>
            </div>
          </div>
          <div>
            <div className="text-[#666666] mb-1">Joins</div>
            <div className="text-[#555555] space-y-1">
              <div><code className="text-emerald-400/70">INNER JOIN</code></div>
              <div><code className="text-emerald-400/70">LEFT JOIN</code></div>
              <div><code className="text-emerald-400/70">RIGHT JOIN</code></div>
            </div>
          </div>
          <div>
            <div className="text-[#666666] mb-1">Aggregates</div>
            <div className="text-[#555555] space-y-1">
              <div><code className="text-emerald-400/70">COUNT()</code></div>
              <div><code className="text-emerald-400/70">SUM()</code></div>
              <div><code className="text-emerald-400/70">AVG()</code></div>
            </div>
          </div>
          <div>
            <div className="text-[#666666] mb-1">Modifiers</div>
            <div className="text-[#555555] space-y-1">
              <div><code className="text-emerald-400/70">ORDER BY</code></div>
              <div><code className="text-emerald-400/70">GROUP BY</code></div>
              <div><code className="text-emerald-400/70">LIMIT</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SqlFormatter
