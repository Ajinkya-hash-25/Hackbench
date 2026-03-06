import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { findAllMatches } from '../utils/search'

export function useSearch(searchableText: string) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(
    () => findAllMatches(searchableText, searchTerm, caseSensitive),
    [searchableText, searchTerm, caseSensitive]
  )

  // Reset index when search parameters change
  useEffect(() => {
    setCurrentIndex(0)
  }, [searchTerm, caseSensitive])

  // Clamp index when matches shrink
  useEffect(() => {
    if (matches.length > 0 && currentIndex >= matches.length) {
      setCurrentIndex(0)
    }
  }, [matches.length, currentIndex])

  const goToNext = useCallback(() => {
    if (matches.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % matches.length)
  }, [matches.length])

  const goToPrev = useCallback(() => {
    if (matches.length === 0) return
    setCurrentIndex((prev) => (prev - 1 + matches.length) % matches.length)
  }, [matches.length])

  const close = useCallback(() => {
    setIsOpen(false)
    setSearchTerm('')
    setCurrentIndex(0)
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  // Keyboard shortcuts: Ctrl+F to open, Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Auto-scroll to current match element
  useEffect(() => {
    if (!scrollContainerRef.current || matches.length === 0 || !searchTerm) return

    const timer = setTimeout(() => {
      if (!scrollContainerRef.current) return
      const el = scrollContainerRef.current.querySelector(
        `[data-match-index="${currentIndex}"]`
      )
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 50)

    return () => clearTimeout(timer)
  }, [currentIndex, matches.length, searchTerm])

  return {
    isOpen,
    open,
    close,
    searchTerm,
    setSearchTerm,
    caseSensitive,
    toggleCaseSensitive: useCallback(() => setCaseSensitive((p) => !p), []),
    currentIndex,
    totalMatches: matches.length,
    goToNext,
    goToPrev,
    scrollContainerRef,
  }
}
