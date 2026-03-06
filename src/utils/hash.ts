import CryptoJS from 'crypto-js'

export type HashAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512'

export function hashText(text: string, algorithm: HashAlgorithm): string {
  switch (algorithm) {
    case 'MD5':
      return CryptoJS.MD5(text).toString()
    case 'SHA1':
      return CryptoJS.SHA1(text).toString()
    case 'SHA256':
      return CryptoJS.SHA256(text).toString()
    case 'SHA512':
      return CryptoJS.SHA512(text).toString()
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`)
  }
}

export function hashWordArray(wordArray: CryptoJS.lib.WordArray, algorithm: HashAlgorithm): string {
  switch (algorithm) {
    case 'MD5':
      return CryptoJS.MD5(wordArray).toString()
    case 'SHA1':
      return CryptoJS.SHA1(wordArray).toString()
    case 'SHA256':
      return CryptoJS.SHA256(wordArray).toString()
    case 'SHA512':
      return CryptoJS.SHA512(wordArray).toString()
    default:
      throw new Error(`Unknown algorithm: ${algorithm}`)
  }
}

export async function hashFile(file: File, algorithm: HashAlgorithm): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer as unknown as number[])
        const hash = hashWordArray(wordArray, algorithm)
        resolve(hash)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export function compareHashes(hash1: string, hash2: string): boolean {
  return hash1.toLowerCase().trim() === hash2.toLowerCase().trim()
}

export const HASH_ALGORITHMS: { value: HashAlgorithm; label: string; length: number }[] = [
  { value: 'MD5', label: 'MD5', length: 32 },
  { value: 'SHA1', label: 'SHA-1', length: 40 },
  { value: 'SHA256', label: 'SHA-256', length: 64 },
  { value: 'SHA512', label: 'SHA-512', length: 128 },
]
