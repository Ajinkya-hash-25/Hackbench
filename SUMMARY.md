# Hackbench — Offline Developer Toolkit

**Author:** Ajinkya Jagtap
**Stack:** Electron 28 + Vite 5 + React 18 + TypeScript + Tailwind CSS 3
**Packaging:** electron-builder (portable .exe for Windows, DMG for Mac, AppImage for Linux)
**License:** MIT

## What It Is

A privacy-first, fully offline desktop app with 16 developer utilities. No data leaves the machine — everything runs locally. Dark theme, single-window app with sidebar navigation and multi-tab support per tool.

## Architecture

```
src/
  App.tsx              — Root: page routing, keep-alive rendering, global shortcuts (Ctrl+K)
  pages/               — 16 tool pages (one component per tool)
  components/
    Layout.tsx          — Flex layout: Sidebar + main content area
    Sidebar.tsx         — Collapsible grouped navigation, exports navGroups/NavItem/NavGroup types
    TabWrapper.tsx      — Multi-tab support per tool (up to 10 tabs, rename, close, keep-alive)
    CommandPalette.tsx  — Ctrl+K fuzzy search overlay, imports navGroups from Sidebar
    ClipboardMonitor.tsx— Paste detection toast, auto-detects content type and suggests tool
    common/
      TabBar.tsx        — Tab strip with sliding emerald indicator, rename, middle-click close
      Button.tsx        — Primary/secondary/ghost variants, sm/md/lg sizes
      TextArea.tsx      — Styled textarea component
      FileDropZone.tsx  — Drag-and-drop file input
      SearchBar.tsx     — Search input component
electron/
  main.ts              — Electron main process, creates BrowserWindow titled "Hackbench"
  preload.ts           — Context bridge (currently minimal)
```

### Key Patterns

- **Keep-alive rendering**: Visited pages stay mounted (hidden with `display: none`), preserving state
- **TabWrapper**: Each tool can have multiple independent tabs, each with its own component instance
- **Visibility detection**: `offsetParent === null` check prevents hidden pages from capturing keyboard shortcuts
- **Sidebar groups**: Collapsible categories stored in `localStorage('devkit-sidebar-groups')`, smooth animated expand/collapse

## 16 Tools

| # | Tool | File | Icon | Category |
|---|------|------|------|----------|
| 1 | JSON Formatter | JsonFormatter.tsx | Braces | Formatters |
| 2 | SQL Formatter | SqlFormatter.tsx | Database | Formatters |
| 3 | Markdown Preview | MarkdownPreview.tsx | FileText | Formatters |
| 4 | Base64 Encoder/Decoder | Base64Tool.tsx | Lock | Encoders/Decoders |
| 5 | URL Encoder/Decoder | UrlEncoder.tsx | Link | Encoders/Decoders |
| 6 | JWT Decoder | JwtDecoder.tsx | Key | Encoders/Decoders |
| 7 | Hash Generator | HashGenerator.tsx | Hash | Encoders/Decoders |
| 8 | UUID Generator | UuidGenerator.tsx | Fingerprint | Generators |
| 9 | Fake Data Generator | DataGenerator.tsx | Dices | Generators |
| 10 | QR Code Generator | QrGenerator.tsx | QrCode | Generators |
| 11 | Regex Tester | RegexTester.tsx | Regex | Testers |
| 12 | Diff Checker | DiffChecker.tsx | GitCompare | Testers |
| 13 | API Tester | ApiTester.tsx | Send | Testers |
| 14 | Timestamp Converter | TimestampConverter.tsx | Clock | Converters |
| 15 | Color Converter | ColorConverter.tsx | Palette | Converters |
| 16 | Cron Parser | CronParser.tsx | Timer | Converters |

## Notable Features Per Tool

- **API Tester**: Smart cURL paste detection in URL bar, Ctrl+Enter send, Ctrl+F find in response, JSON syntax highlighting, cURL export
- **Timestamp Converter**: Parses custom date strings like "Thu Feb 19 11:45:02 IST 2026" with 40+ timezone abbreviations, outputs in multiple formats
- **Diff Checker**: Side-by-side + inline modes, line-level + word-level diff, sync scroll, ignore whitespace
- **JSON Formatter**: Minify/beautify, tree view, syntax highlighting, error detection
- **QR Code Generator**: Customizable error correction, size, colors; download PNG or copy
- **Data Generator**: Schema-based with 12 field types, generates 1-1000 records as JSON

## Design System

- **Background**: `#0a0a0a` (base), `#111111` (cards), `#1a1a1a` (hover/elevated)
- **Borders**: `#2a2a2a` (primary), `#333333` (secondary)
- **Text**: `white` (headings), `#e0e0e0` (body), `#a0a0a0` (labels), `#666666` (muted), `#444444` (placeholders)
- **Accent**: emerald-500 (`#10b981`) for active states, buttons, focus rings
- **Focus rings**: `focus:ring-1 focus:ring-emerald-500/40`
- **Icon backgrounds**: `bg-emerald-500/10`
- **Headers**: `text-lg font-semibold text-white` + `text-xs text-[#666666]` description
- **Custom scrollbars**: 6px dark (`#2a2a2a` thumb, transparent track)
- **Selection**: Emerald-tinted (`rgba(16, 185, 129, 0.3)`)
- **Animations**: `animate-fade-in` (page transitions), `animate-slide-up` (toasts)

## CSS Variables (defined in index.css)

```
--bg-primary: #0a0a0a    --border-primary: #2a2a2a
--bg-secondary: #111111   --border-secondary: #333333
--bg-tertiary: #1a1a1a    --text-primary: #fafafa
--bg-elevated: #222222    --text-secondary: #a0a0a0
--accent: #10b981         --text-muted: #666666
```

## Dependencies

- **react 18**, **react-dom 18** — UI
- **lucide-react 0.294** — Icons (all icons sourced from here)
- **crypto-js** — Hash generation (MD5, SHA-1, SHA-256, SHA-512, etc.)
- **diff** — Diff algorithm for Diff Checker
- **qrcode** — QR code generation
- **uuid** — UUID v4 generation

## Build Commands

```bash
npm run dev              # Vite dev server
npm run electron:dev     # Vite + Electron concurrently
npm run build:win        # Production build → release/Hackbench 1.0.0.exe (portable)
npm run build:mac        # Production build → DMG
npm run build:linux      # Production build → AppImage + deb
```

## What's Been Done (Changelog)

1. Initial app scaffold with Vite + Electron + React + Tailwind
2. Built 13 original tools (JSON, SQL, Markdown, Base64, URL, JWT, Hash, UUID, Regex, Diff, Timestamp, Color, Cron)
3. Added multi-tab support (TabWrapper + TabBar) for all tools
4. Added 3 new tools: API Tester, Fake Data Generator, QR Code Generator
5. Sidebar redesigned with collapsible grouped navigation (5 categories)
6. Command Palette (Ctrl+K) with fuzzy search
7. Clipboard Monitor — paste detection toast that suggests the right tool
8. API Tester enhancements: cURL paste, Ctrl+Enter, find in response, JSON highlighting
9. Timestamp Converter: custom date string parser with timezone abbreviation support
10. TabBar redesign: sliding emerald bottom indicator, active dot, modern flat look
11. Full color migration: all 16 pages unified to hex color system (#111111, #2a2a2a, etc.)
12. CSS polish: custom dark scrollbars, emerald text selection, fade-in page transitions, sidebar collapse animation
13. Sidebar: left border accent on active item, smooth group expand/collapse
14. Overflow fix on all 16 pages (overflow-y-auto)
15. Renamed from DevKit Pro → Hackbench across all configs
