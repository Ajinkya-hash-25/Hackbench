import { ReactNode, createElement } from 'react'

export interface SearchMatch {
  start: number
  end: number
}

export function findAllMatches(text: string, term: string, caseSensitive: boolean): SearchMatch[] {
  if (!term || !text) return []
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi')
  const matches: SearchMatch[] = []
  let match
  while ((match = regex.exec(text)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length })
    if (match.index === regex.lastIndex) regex.lastIndex++
  }
  return matches
}

export function countMatches(text: string, term: string, caseSensitive: boolean): number {
  if (!term || !text) return 0
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escaped, caseSensitive ? 'g' : 'gi')
  const matches = text.match(regex)
  return matches ? matches.length : 0
}

/**
 * Highlights search term matches in a text string, returning React elements.
 * @param text - The text to search within
 * @param term - The search term
 * @param caseSensitive - Whether the search is case-sensitive
 * @param matchOffset - The global match index offset for this text segment
 * @param currentGlobalIndex - The currently active match index (highlighted differently)
 * @returns An object with rendered elements and the match count in this segment
 */
export function highlightSearchTerm(
  text: string,
  term: string,
  caseSensitive: boolean,
  matchOffset: number,
  currentGlobalIndex: number
): { elements: ReactNode[]; count: number } {
  if (!term || !text) return { elements: [text], count: 0 }

  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, caseSensitive ? 'g' : 'gi')
  const parts = text.split(regex)

  if (parts.length <= 1) return { elements: [text], count: 0 }

  let matchIdx = matchOffset
  let matchCount = 0
  const elements: ReactNode[] = []

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // Non-match segment
      if (parts[i]) elements.push(parts[i])
    } else {
      // Match segment
      const isCurrent = matchIdx === currentGlobalIndex
      elements.push(
        createElement(
          'mark',
          {
            key: `search-${matchIdx}`,
            'data-match-index': matchIdx,
            style: {
              backgroundColor: isCurrent ? 'rgb(234, 88, 12)' : 'rgba(250, 204, 21, 0.4)',
              color: isCurrent ? 'white' : 'inherit',
              borderRadius: '2px',
              padding: '0 1px',
              boxShadow: isCurrent ? '0 0 0 1px rgba(234, 88, 12, 0.5)' : 'none',
            },
          },
          parts[i]
        )
      )
      matchIdx++
      matchCount++
    }
  }

  return { elements, count: matchCount }
}

/**
 * Computes per-line match offsets for multi-line content.
 * Returns the cumulative match offset and count for each line.
 */
export function computeLineMatchOffsets(
  lines: string[],
  term: string,
  caseSensitive: boolean
): { offset: number; count: number }[] {
  let cumulative = 0
  return lines.map((line) => {
    const count = countMatches(line, term, caseSensitive)
    const result = { offset: cumulative, count }
    cumulative += count
    return result
  })
}
