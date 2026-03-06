import { diffLines, diffWords, Change } from 'diff'

export interface DiffLine {
  type: 'add' | 'remove' | 'unchanged'
  content: string
  lineNumber?: {
    left?: number
    right?: number
  }
}

export interface DiffResult {
  lines: DiffLine[]
  stats: {
    additions: number
    deletions: number
    unchanged: number
  }
}

export function computeDiff(
  original: string,
  modified: string,
  ignoreWhitespace = false
): DiffResult {
  const options = ignoreWhitespace ? { ignoreWhitespace: true } : {}
  const changes = diffLines(original, modified, options)

  const lines: DiffLine[] = []
  const stats = { additions: 0, deletions: 0, unchanged: 0 }

  let leftLine = 1
  let rightLine = 1

  changes.forEach((change: Change) => {
    const content = change.value.replace(/\n$/, '')
    const contentLines = content.split('\n')

    contentLines.forEach((line) => {
      if (change.added) {
        lines.push({
          type: 'add',
          content: line,
          lineNumber: { right: rightLine }
        })
        rightLine++
        stats.additions++
      } else if (change.removed) {
        lines.push({
          type: 'remove',
          content: line,
          lineNumber: { left: leftLine }
        })
        leftLine++
        stats.deletions++
      } else {
        lines.push({
          type: 'unchanged',
          content: line,
          lineNumber: { left: leftLine, right: rightLine }
        })
        leftLine++
        rightLine++
        stats.unchanged++
      }
    })
  })

  return { lines, stats }
}

export function computeWordDiff(original: string, modified: string): Change[] {
  return diffWords(original, modified)
}

export function formatUnifiedDiff(
  original: string,
  modified: string,
  originalName = 'Original',
  modifiedName = 'Modified',
  ignoreWhitespace = false
): string {
  const { lines } = computeDiff(original, modified, ignoreWhitespace)

  const header = [
    `--- ${originalName}`,
    `+++ ${modifiedName}`,
    ''
  ]

  const diffContent = lines.map((line) => {
    if (line.type === 'add') {
      return `+ ${line.content}`
    } else if (line.type === 'remove') {
      return `- ${line.content}`
    } else {
      return `  ${line.content}`
    }
  })

  return [...header, ...diffContent].join('\n')
}
