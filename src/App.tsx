import { useState, useCallback, useEffect, ComponentType } from 'react'
import Layout from './components/Layout'
import TabWrapper from './components/TabWrapper'
import CommandPalette from './components/CommandPalette'
import ClipboardMonitor from './components/ClipboardMonitor'
import BrowserPanel from './components/BrowserPanel'
import { navGroups } from './components/Sidebar'
import DiffChecker from './pages/DiffChecker'
import JsonFormatter from './pages/JsonFormatter'
import Base64Tool from './pages/Base64Tool'
import HashGenerator from './pages/HashGenerator'
import UuidGenerator from './pages/UuidGenerator'
import JwtDecoder from './pages/JwtDecoder'
import RegexTester from './pages/RegexTester'
import TimestampConverter from './pages/TimestampConverter'
import CronParser from './pages/CronParser'
import MarkdownPreview from './pages/MarkdownPreview'
import SqlFormatter from './pages/SqlFormatter'
import ColorConverter from './pages/ColorConverter'
import UrlEncoder from './pages/UrlEncoder'
import ApiTester from './pages/ApiTester'
import DataGenerator from './pages/DataGenerator'
import QrGenerator from './pages/QrGenerator'
import HtmlViewer from './pages/HtmlViewer'

export type Page = 'json' | 'diff' | 'base64' | 'url' | 'hash' | 'uuid' | 'jwt' | 'timestamp' | 'regex' | 'color' | 'cron' | 'markdown' | 'sql' | 'api' | 'fakedata' | 'qrcode' | 'html'

const toolComponents: Record<Page, ComponentType> = {
  json: JsonFormatter,
  diff: DiffChecker,
  base64: Base64Tool,
  hash: HashGenerator,
  uuid: UuidGenerator,
  jwt: JwtDecoder,
  regex: RegexTester,
  timestamp: TimestampConverter,
  cron: CronParser,
  markdown: MarkdownPreview,
  sql: SqlFormatter,
  color: ColorConverter,
  url: UrlEncoder,
  api: ApiTester,
  fakedata: DataGenerator,
  qrcode: QrGenerator,
  html: HtmlViewer,
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('json')
  const [visitedPages, setVisitedPages] = useState<Set<Page>>(new Set(['json']))
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

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

  // Browser panel
  const [browserOpen, setBrowserOpen] = useState(false)

  // Persist focus mode
  useEffect(() => {
    localStorage.setItem('hackbench-focus-mode', String(focusMode))
  }, [focusMode])

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

  const toggleBrowser = useCallback(() => {
    setBrowserOpen(prev => !prev)
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
        onToggleBrowser={toggleBrowser}
        currentPageLabel={currentPageLabel}
        rightPageLabel={rightPageLabel}
        rightPanePage={rightPanePage}
        onDropOnPane={handleDropOnPane}
        rightPane={splitView ? (
          Array.from(visitedPages).map(page => (
            <div key={`right-${page}`} className={page === rightPanePage ? 'h-full' : 'hidden'}>
              <TabWrapper component={toolComponents[page]} />
            </div>
          ))
        ) : undefined}
      >
        {Array.from(visitedPages).map(page => (
          <div key={page} className={page === currentPage ? 'h-full' : 'hidden'}>
            <TabWrapper component={toolComponents[page]} />
          </div>
        ))}
      </Layout>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(page: Page) => {
          handleNavigate(page)
          setCommandPaletteOpen(false)
        }}
      />
      <ClipboardMonitor onNavigate={handleNavigate} />
      <BrowserPanel isOpen={browserOpen} onClose={() => setBrowserOpen(false)} />
    </>
  )
}

export default App
