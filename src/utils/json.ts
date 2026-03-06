export interface JsonValidationResult {
  valid: boolean
  error?: {
    message: string
    line?: number
    column?: number
  }
  parsed?: unknown
}

export function validateJson(input: string): JsonValidationResult {
  if (!input.trim()) {
    return { valid: false, error: { message: 'Input is empty' } }
  }

  try {
    const parsed = JSON.parse(input)
    return { valid: true, parsed }
  } catch (e) {
    const error = e as SyntaxError
    const match = error.message.match(/position (\d+)/)
    let line: number | undefined
    let column: number | undefined

    if (match) {
      const position = parseInt(match[1], 10)
      const lines = input.substring(0, position).split('\n')
      line = lines.length
      column = lines[lines.length - 1].length + 1
    }

    return {
      valid: false,
      error: {
        message: error.message,
        line,
        column
      }
    }
  }
}

export function formatJson(input: string, indent = 2): string {
  const { valid, parsed, error } = validateJson(input)
  if (!valid) {
    throw new Error(error?.message || 'Invalid JSON')
  }
  return JSON.stringify(parsed, null, indent)
}

export function minifyJson(input: string): string {
  const { valid, parsed, error } = validateJson(input)
  if (!valid) {
    throw new Error(error?.message || 'Invalid JSON')
  }
  return JSON.stringify(parsed)
}

export function escapeJsonString(input: string): string {
  return JSON.stringify(input)
}

export function unescapeJsonString(input: string): string {
  try {
    // Handle case where input is already a valid JSON string
    if (input.startsWith('"') && input.endsWith('"')) {
      return JSON.parse(input)
    }
    // Try parsing as-is
    return JSON.parse(`"${input.replace(/"/g, '\\"')}"`)
  } catch {
    // If all else fails, manually unescape common sequences
    return input
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
  }
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface JsonTreeNode {
  key: string
  value: JsonValue
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  children?: JsonTreeNode[]
  expanded?: boolean
}

export function buildJsonTree(value: JsonValue, key = 'root'): JsonTreeNode {
  if (value === null) {
    return { key, value, type: 'null' }
  }

  if (Array.isArray(value)) {
    return {
      key,
      value,
      type: 'array',
      children: value.map((item, index) => buildJsonTree(item, `[${index}]`)),
      expanded: true
    }
  }

  if (typeof value === 'object') {
    return {
      key,
      value,
      type: 'object',
      children: Object.entries(value).map(([k, v]) => buildJsonTree(v as JsonValue, k)),
      expanded: true
    }
  }

  return {
    key,
    value,
    type: typeof value as 'string' | 'number' | 'boolean'
  }
}
