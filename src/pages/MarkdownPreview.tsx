import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { FileText, Copy, Check, Eye, Code, Search } from 'lucide-react'
import Button from '../components/common/Button'
import TextArea from '../components/common/TextArea'
import SearchBar from '../components/common/SearchBar'
import { useSearch } from '../hooks/useSearch'
import { copyToClipboard } from '../utils/clipboard'

function MarkdownPreview() {
  const [input, setInput] = useState(`# Welcome to Markdown Preview

## Features

This tool supports common markdown syntax:

- **Bold text** and *italic text*
- \`inline code\` and code blocks
- [Links](https://example.com)
- Lists (ordered and unordered)
- Blockquotes
- Headings (h1-h6)

### Code Block Example

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Blockquote

> This is a blockquote.
> It can span multiple lines.

### Table

| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
| Jane | 25  | LA   |

### Task List

- [x] Completed task
- [ ] Pending task

---

Enjoy writing markdown!`)

  const [viewMode, setViewMode] = useState<'split' | 'preview'>('split')
  const [copied, setCopied] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const parseMarkdown = (md: string): string => {
    let html = md

    // Escape HTML
    html = html.replace(/&/g, '&amp;')
    html = html.replace(/</g, '&lt;')
    html = html.replace(/>/g, '&gt;')

    // Code blocks (must be first)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="code-block"><code class="language-${lang}">${code.trim()}</code></pre>`
    })

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

    // Headers
    html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>')
    html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>')
    html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>')
    html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>')

    // Bold and Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
    html = html.replace(/_(.+?)_/g, '<em>$1</em>')

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

    // Images (must be before links)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_: string, alt: string, src: string) => {
      const safeProtocols = ['http:', 'https:', 'data:']
      try {
        const parsed = new URL(src, 'https://placeholder.com')
        if (!safeProtocols.includes(parsed.protocol)) return alt
      } catch { return alt }
      return `<img src="${src}" alt="${alt}" />`
    })

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_: string, text: string, href: string) => {
      const safeProtocols = ['http:', 'https:', 'mailto:']
      try {
        const parsed = new URL(href, 'https://placeholder.com')
        if (!safeProtocols.includes(parsed.protocol)) return text
      } catch { return text }
      return `<a href="${href}">${text}</a>`
    })

    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr />')
    html = html.replace(/^\*\*\*$/gm, '<hr />')

    // Blockquotes
    html = html.replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

    // Task lists
    html = html.replace(/^- \[x\] (.*)$/gm, '<li class="task checked"><input type="checkbox" checked disabled />$1</li>')
    html = html.replace(/^- \[ \] (.*)$/gm, '<li class="task"><input type="checkbox" disabled />$1</li>')

    // Unordered lists
    html = html.replace(/^- (.*)$/gm, '<li>$1</li>')
    html = html.replace(/^\* (.*)$/gm, '<li>$1</li>')

    // Ordered lists
    html = html.replace(/^\d+\. (.*)$/gm, '<li class="ordered">$1</li>')

    // Wrap consecutive list items
    html = html.replace(/(<li>[\s\S]*?<\/li>)\n(?!<li)/g, '$1</ul>\n')
    html = html.replace(/(?<!<\/ul>)\n(<li>)/g, '\n<ul>$1')
    html = html.replace(/(<li class="ordered">[\s\S]*?<\/li>)\n(?!<li class="ordered")/g, '$1</ol>\n')
    html = html.replace(/(?<!<\/ol>)\n(<li class="ordered">)/g, '\n<ol>$1')

    // Tables
    html = html.replace(/^\|(.+)\|$/gm, (_match, content) => {
      const cells = content.split('|').map((cell: string) => cell.trim())
      if (cells.every((cell: string) => /^[-:]+$/.test(cell))) {
        return '<tr class="separator"></tr>'
      }
      const cellHtml = cells.map((cell: string) => `<td>${cell}</td>`).join('')
      return `<tr>${cellHtml}</tr>`
    })
    html = html.replace(/(<tr>[\s\S]*?<\/tr>)\n(?!<tr)/g, '$1</table>\n')
    html = html.replace(/(?<!<\/table>)\n(<tr>)/g, '\n<table>$1')
    html = html.replace(/<tr class="separator"><\/tr>/g, '')

    // Paragraphs
    html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')

    // Clean up extra newlines
    html = html.replace(/\n\n+/g, '\n')

    return html
  }

  const renderedHtml = useMemo(() => parseMarkdown(input), [input])

  // Extract plain text from rendered HTML for search (using DOMParser to avoid script execution)
  const plainText = useMemo(() => {
    const doc = new DOMParser().parseFromString(renderedHtml, 'text/html')
    return doc.body.textContent || ''
  }, [renderedHtml])

  const search = useSearch(plainText)

  // DOM-based highlighting for the preview pane
  const applyHighlights = useCallback(() => {
    if (!previewRef.current) return

    // First, remove existing search highlights by restoring text nodes
    const existingMarks = previewRef.current.querySelectorAll('mark[data-search-highlight]')
    existingMarks.forEach(mark => {
      const parent = mark.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent || ''), mark)
        parent.normalize()
      }
    })

    if (!search.searchTerm || !search.isOpen) return

    const escaped = search.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, search.caseSensitive ? 'g' : 'gi')

    // Walk all text nodes
    const walker = document.createTreeWalker(
      previewRef.current,
      NodeFilter.SHOW_TEXT,
      null
    )

    const textNodes: Text[] = []
    let node
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text)
    }

    let globalMatchIdx = 0

    textNodes.forEach(textNode => {
      const text = textNode.textContent || ''
      regex.lastIndex = 0
      if (!regex.test(text)) return
      regex.lastIndex = 0

      const fragment = document.createDocumentFragment()
      let lastIndex = 0
      let match

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
        }

        const mark = document.createElement('mark')
        mark.setAttribute('data-search-highlight', 'true')
        mark.setAttribute('data-match-index', String(globalMatchIdx))

        const isCurrent = globalMatchIdx === search.currentIndex
        mark.style.backgroundColor = isCurrent ? 'rgb(234, 88, 12)' : 'rgba(250, 204, 21, 0.4)'
        mark.style.color = isCurrent ? 'white' : 'inherit'
        mark.style.borderRadius = '2px'
        mark.style.padding = '0 1px'
        if (isCurrent) {
          mark.style.boxShadow = '0 0 0 1px rgba(234, 88, 12, 0.5)'
        }

        mark.textContent = match[0]
        fragment.appendChild(mark)
        globalMatchIdx++
        lastIndex = match.index + match[0].length

        if (match.index === regex.lastIndex) regex.lastIndex++
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
      }

      textNode.parentNode?.replaceChild(fragment, textNode)
    })
  }, [search.searchTerm, search.caseSensitive, search.currentIndex, search.isOpen])

  // Apply highlights after render
  useEffect(() => {
    applyHighlights()
  }, [applyHighlights, renderedHtml])

  // Scroll to current match in preview
  useEffect(() => {
    if (!previewRef.current || !search.searchTerm || search.totalMatches === 0) return

    const timer = setTimeout(() => {
      if (!previewRef.current) return
      const el = previewRef.current.querySelector(
        `[data-match-index="${search.currentIndex}"]`
      )
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [search.currentIndex, search.totalMatches, search.searchTerm])

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  const wordCount = useMemo(() => {
    const text = input.replace(/[#*`\[\]()]/g, '')
    return text.split(/\s+/).filter(Boolean).length
  }, [input])

  const lineCount = useMemo(() => input.split('\n').length, [input])

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Markdown Preview</h2>
            <p className="text-xs text-[#666666]">Write and preview markdown in real-time</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#555555]">{wordCount} words · {lineCount} lines</span>
          <div className="flex border border-[#2a2a2a] rounded-lg overflow-hidden ml-2">
            <button
              onClick={() => setViewMode('split')}
              className={`p-2 ${
                viewMode === 'split'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-[#111111] text-[#666666] hover:text-[#e0e0e0]'
              }`}
              title="Split view"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-2 ${
                viewMode === 'preview'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-[#111111] text-[#666666] hover:text-[#e0e0e0]'
              }`}
              title="Preview only"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleCopy(input, 'md')}>
            {copied === 'md' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy MD
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleCopy(renderedHtml, 'html')}>
            {copied === 'html' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy HTML
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 flex-1 min-h-0 ${viewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {viewMode === 'split' && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#a0a0a0]">Markdown</span>
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write your markdown here..."
              mono
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#a0a0a0]">Preview</span>
            <button
              onClick={search.open}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[#666666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a] rounded transition-colors"
              title="Find in preview (Ctrl+F)"
            >
              <Search className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden flex flex-col">
            {search.isOpen && (
              <div className="flex justify-end p-2 border-b border-[#2a2a2a] bg-[#111111]/80 backdrop-blur-sm">
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
            <div className="flex-1 overflow-auto p-6">
              <style>{`
                .markdown-preview h1 { font-size: 2em; font-weight: bold; margin: 0.67em 0; color: #f3f4f6; border-bottom: 1px solid #374151; padding-bottom: 0.3em; }
                .markdown-preview h2 { font-size: 1.5em; font-weight: bold; margin: 0.83em 0; color: #f3f4f6; border-bottom: 1px solid #374151; padding-bottom: 0.3em; }
                .markdown-preview h3 { font-size: 1.17em; font-weight: bold; margin: 1em 0; color: #f3f4f6; }
                .markdown-preview h4 { font-size: 1em; font-weight: bold; margin: 1.33em 0; color: #f3f4f6; }
                .markdown-preview h5 { font-size: 0.83em; font-weight: bold; margin: 1.67em 0; color: #f3f4f6; }
                .markdown-preview h6 { font-size: 0.67em; font-weight: bold; margin: 2.33em 0; color: #9ca3af; }
                .markdown-preview p { margin: 1em 0; color: #d1d5db; line-height: 1.6; }
                .markdown-preview strong { font-weight: bold; color: #f3f4f6; }
                .markdown-preview em { font-style: italic; }
                .markdown-preview del { text-decoration: line-through; color: #9ca3af; }
                .markdown-preview a { color: #34d399; text-decoration: underline; }
                .markdown-preview ul, .markdown-preview ol { margin: 1em 0; padding-left: 2em; color: #d1d5db; }
                .markdown-preview li { margin: 0.5em 0; }
                .markdown-preview li.task { list-style: none; margin-left: -1.5em; }
                .markdown-preview li.task input { margin-right: 0.5em; }
                .markdown-preview blockquote { border-left: 4px solid #4b5563; padding-left: 1em; margin: 1em 0; color: #9ca3af; font-style: italic; }
                .markdown-preview hr { border: none; border-top: 1px solid #4b5563; margin: 2em 0; }
                .markdown-preview .inline-code { background: #1f2937; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #34d399; }
                .markdown-preview .code-block { background: #1f2937; padding: 1em; border-radius: 8px; margin: 1em 0; overflow-x: auto; }
                .markdown-preview .code-block code { font-family: monospace; font-size: 0.9em; color: #d1d5db; white-space: pre; }
                .markdown-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
                .markdown-preview td { border: 1px solid #4b5563; padding: 0.5em 1em; color: #d1d5db; }
                .markdown-preview tr:first-child td { background: #1f2937; font-weight: bold; color: #f3f4f6; }
                .markdown-preview img { max-width: 100%; border-radius: 8px; }
              `}</style>
              <div
                ref={previewRef}
                className="markdown-preview"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarkdownPreview
