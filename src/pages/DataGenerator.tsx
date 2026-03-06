import { useState } from 'react'
import { Dices, RefreshCw, Copy, Check, Trash2, Plus } from 'lucide-react'
import Button from '../components/common/Button'
import { copyToClipboard } from '../utils/clipboard'

type FieldType = 'name' | 'email' | 'phone' | 'address' | 'date' | 'uuid' | 'number' | 'boolean' | 'text' | 'url' | 'ip' | 'color'

const fieldTypes: FieldType[] = ['name', 'email', 'phone', 'address', 'date', 'uuid', 'number', 'boolean', 'text', 'url', 'ip', 'color']

const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Emma', 'Olivia', 'Noah', 'Liam', 'Sophia',
  'Ava', 'Isabella', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Daniel', 'Matthew', 'Anthony',
  'Ajinkya', 'Rahul', 'Priya', 'Neha', 'Vikram', 'Ananya']

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'King', 'Wright', 'Scott']

const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com', 'company.org', 'proton.me']

const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Elm St', 'Park Ave', 'Pine Rd',
  'Washington Blvd', 'Lake Shore Dr', 'Sunset Blvd', 'Broadway', '5th Ave']

const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
  'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Portland', 'Seattle',
  'Denver', 'Boston', 'Miami', 'Atlanta', 'Minneapolis']

const loremWords = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua',
  'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud', 'exercitation']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateField(type: FieldType): string | number | boolean {
  switch (type) {
    case 'name':
      return `${pick(firstNames)} ${pick(lastNames)}`
    case 'email':
      return `${pick(firstNames).toLowerCase()}.${pick(lastNames).toLowerCase()}${randInt(1, 99)}@${pick(domains)}`
    case 'phone':
      return `+1-${randInt(200, 999)}-${randInt(100, 999)}-${randInt(1000, 9999)}`
    case 'address':
      return `${randInt(1, 9999)} ${pick(streets)}, ${pick(cities)}`
    case 'date': {
      const start = new Date(2020, 0, 1).getTime()
      const end = new Date().getTime()
      return new Date(start + Math.random() * (end - start)).toISOString().split('T')[0]
    }
    case 'uuid':
      return crypto.randomUUID()
    case 'number':
      return randInt(1, 10000)
    case 'boolean':
      return Math.random() > 0.5
    case 'text':
      return Array.from({ length: randInt(5, 15) }, () => pick(loremWords)).join(' ')
    case 'url':
      return `https://www.${pick(lastNames).toLowerCase()}.${pick(['com', 'org', 'io', 'dev'])}/${pick(loremWords)}`
    case 'ip':
      return `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`
    case 'color':
      return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
  }
}

interface SchemaField {
  id: string
  name: string
  type: FieldType
}

function DataGenerator() {
  const [fields, setFields] = useState<SchemaField[]>([
    { id: crypto.randomUUID(), name: 'id', type: 'uuid' },
    { id: crypto.randomUUID(), name: 'name', type: 'name' },
    { id: crypto.randomUUID(), name: 'email', type: 'email' },
  ])
  const [count, setCount] = useState(5)
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)

  const addField = () => {
    setFields(prev => [...prev, { id: crypto.randomUUID(), name: '', type: 'name' }])
  }

  const removeField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  const updateField = (id: string, updates: Partial<SchemaField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  const handleGenerate = () => {
    const data = Array.from({ length: count }, () => {
      const record: Record<string, string | number | boolean> = {}
      fields.forEach(field => {
        if (field.name.trim()) {
          record[field.name] = generateField(field.type)
        }
      })
      return record
    })
    setOutput(JSON.stringify(data, null, 2))
  }

  const handleCopy = async () => {
    if (output && await copyToClipboard(output)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="h-full flex flex-col gap-3 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <Dices className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Fake Data Generator</h2>
          <p className="text-xs text-[#666666]">Generate dummy data from a schema template</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-[#a0a0a0]">
          Records:
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-20 px-2 py-1.5 bg-[#111111] border border-[#2a2a2a] rounded text-[#e0e0e0] text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
        </label>
        <Button onClick={handleGenerate}>
          <RefreshCw className="w-4 h-4" /> Generate
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" onClick={handleCopy} disabled={!output}>
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* Schema editor */}
        <div className="flex flex-col gap-2 min-h-0">
          <span className="text-sm font-medium text-[#a0a0a0]">Schema ({fields.length} fields)</span>
          <div className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-auto p-3">
            <div className="space-y-2">
              {fields.map((field) => (
                <div key={field.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={field.name}
                    placeholder="Field name"
                    onChange={(e) => updateField(field.id, { name: e.target.value })}
                    className="flex-1 px-2 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-sm text-[#e0e0e0] placeholder-[#444444] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                    className="px-2 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-sm text-[#e0e0e0] focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                  >
                    {fieldTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeField(field.id)}
                    className="p-1 text-[#555555] hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addField}
              className="mt-3 flex items-center gap-1.5 text-xs text-[#666666] hover:text-emerald-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>

          {/* Available types reference */}
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3">
            <span className="text-xs font-medium text-[#666666] mb-2 block">Available Types</span>
            <div className="flex flex-wrap gap-1.5">
              {fieldTypes.map(t => (
                <span key={t} className="px-2 py-0.5 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded text-[#a0a0a0]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2 min-h-0">
          <span className="text-sm font-medium text-[#a0a0a0]">Output</span>
          <div className="flex-1 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-auto">
            {output ? (
              <pre className="p-4 font-mono text-sm text-[#e0e0e0] whitespace-pre-wrap">{output}</pre>
            ) : (
              <div className="flex items-center justify-center h-full text-[#444444] text-sm">
                Define schema and click Generate
              </div>
            )}
          </div>
          {output && (
            <div className="text-xs text-[#666666]">
              {count} records &middot; {output.length.toLocaleString()} chars
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataGenerator
