import { useState, useCallback, useEffect, useRef, lazy, Suspense, ComponentType } from 'react'
import Layout from './components/Layout'
import TabWrapper from './components/TabWrapper'
import ClipboardMonitor from './components/ClipboardMonitor'
import { navGroups } from './components/Sidebar'

const _appLoadTime = performance.now()

const CommandPalette = lazy(() => import('./components/CommandPalette'))

const toolComponents: Record<string, ComponentType> = {
  json:      lazy(() => import('./pages/JsonFormatter')),
  diff:      lazy(() => import('./pages/DiffChecker')),
  base64:    lazy(() => import('./pages/Base64Tool')),
  hash:      lazy(() => import('./pages/HashGenerator')),
  uuid:      lazy(() => import('./pages/UuidGenerator')),
  jwt:       lazy(() => import('./pages/JwtDecoder')),
  regex:     lazy(() => import('./pages/RegexTester')),
  timestamp: lazy(() => import('./pages/TimestampConverter')),
  cron:      lazy(() => import('./pages/CronParser')),
  sql:       lazy(() => import('./pages/SqlFormatter')),
  color:     lazy(() => import('./pages/ColorConverter')),
  url:       lazy(() => import('./pages/UrlEncoder')),
  fakedata:  lazy(() => import('./pages/DataGenerator')),
  qrcode:    lazy(() => import('./pages/QrGenerator')),
  html:      lazy(() => import('./pages/HtmlViewer')),
  dataunit:  lazy(() => import('./pages/DataUnitConverter')),
}

export type Page = 'json' | 'diff' | 'base64' | 'url' | 'hash' | 'uuid' | 'jwt' | 'timestamp' | 'regex' | 'color' | 'cron' | 'sql' | 'fakedata' | 'qrcode' | 'html' | 'dataunit'

const MAX_RECENT = 3

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('json')
  const [visitedPages, setVisitedPages] = useState<Set<Page>>(new Set(['json']))
  const [recentPages, setRecentPages] = useState<Page[]>(() => {
    try {
      const saved = localStorage.getItem('hackbench-recent-pages')
      if (saved) return JSON.parse(saved) as Page[]
    } catch { /* ignore */ }
    return []
  })
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [startupMs, setStartupMs] = useState<number | null>(null)
  const startupCaptured = useRef(false)

  // Focus mode
  const [focusMode, setFocusMode] = useState(() => {
    return localStorage.getItem('hackbench-focus-mode') === 'true'
  })

  // Split view
  const [splitView, setSplitView] = useState(false)
  const [activeSplitPane, setActiveSplitPane] = useState<'left' | 'right'>('left')
  const [rightPanePage, setRightPanePage] = useState<Page>('json')
  const [splitRatio, setSplitRatio] = useState(() => {
    return parseInt(localStorage.getItem('hackbench-split-ratio') || '50')
  })

  // Capture startup time once on first render
  useEffect(() => {
    if (startupCaptured.current) return
    startupCaptured.current = true
    setStartupMs(Math.round(performance.now() - _appLoadTime))
  }, [])

  // Persist focus mode
  useEffect(() => {
    localStorage.setItem('hackbench-focus-mode', String(focusMode))
  }, [focusMode])

  // Persist recent pages
  useEffect(() => {
    localStorage.setItem('hackbench-recent-pages', JSON.stringify(recentPages))
  }, [recentPages])

  // Persist split ratio
  useEffect(() => {
    localStorage.setItem('hackbench-split-ratio', String(splitRatio))
  }, [splitRatio])

  const handleNavigate = useCallback((page: Page) => {
    setVisitedPages(prev => {
      if (prev.has(page)) return prev
      const next = new Set(prev)
      next.add(page)
      return next
    })
    // Track recent (most recent first, deduplicated, max 5)
    setRecentPages(prev => {
      const filtered = prev.filter(p => p !== page)
      return [page, ...filtered].slice(0, MAX_RECENT)
    })
    // In split view, navigate the active pane
    if (splitView && activeSplitPane === 'right') {
      setRightPanePage(page)
    } else {
      setCurrentPage(page)
    }
  }, [splitView, activeSplitPane])

  const toggleFocusMode = useCallback(() => {
    setFocusMode(prev => !prev)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K — command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
      // Ctrl+Shift+F — focus mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        setFocusMode(prev => !prev)
      }
      // Ctrl+\ — split view
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault()
        setSplitView(prev => !prev)
      }
      // Escape — exit focus mode
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [focusMode])

  const allItems = navGroups.flatMap(g => g.items)
  const currentPageLabel = allItems.find(i => i.id === currentPage)?.label || ''
  const rightPageLabel = allItems.find(i => i.id === rightPanePage)?.label || ''

  const handleDropOnPane = useCallback((pane: 'left' | 'right', toolId: string) => {
    const page = toolId as Page
    if (!toolComponents[page]) return
    setVisitedPages(prev => {
      if (prev.has(page)) return prev
      const next = new Set(prev)
      next.add(page)
      return next
    })
    if (pane === 'left') setCurrentPage(page)
    else setRightPanePage(page)
  }, [])

  return (
    <>
      <Layout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        focusMode={focusMode}
        onToggleFocusMode={toggleFocusMode}
        splitView={splitView}
        onToggleSplitView={() => setSplitView(prev => !prev)}
        activeSplitPane={activeSplitPane}
        onSetActiveSplitPane={setActiveSplitPane}
        splitRatio={splitRatio}
        onSplitRatioChange={setSplitRatio}
        currentPageLabel={currentPageLabel}
        rightPageLabel={rightPageLabel}
        rightPanePage={rightPanePage}
        onDropOnPane={handleDropOnPane}
        recentPages={recentPages}
        startupMs={startupMs}
        rightPane={splitView ? (
          Array.from(visitedPages).map(page => (
            <div key={`right-${page}`} className={page === rightPanePage ? 'h-full' : 'hidden'}>
              <Suspense fallback={<div className="h-full" />}>
                <TabWrapper component={toolComponents[page]} />
              </Suspense>
            </div>
          ))
        ) : undefined}
      >
        {Array.from(visitedPages).map(page => (
          <div key={page} className={page === currentPage ? 'h-full' : 'hidden'}>
            <Suspense fallback={<div className="h-full" />}>
              <TabWrapper component={toolComponents[page]} />
            </Suspense>
          </div>
        ))}
      </Layout>
      {commandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
            onNavigate={(page: Page) => {
              handleNavigate(page)
              setCommandPaletteOpen(false)
            }}
          />
        </Suspense>
      )}
      <ClipboardMonitor onNavigate={handleNavigate} />
    </>
  )
}

export default App
