# Hackbench — Feature Implementation Instructions

> Feed this file to Claude Code. Implement features one at a time and test after each.

---

## 1. Split View

**Goal:** Allow two tools to run side-by-side in the main content area.

**Implementation:**
- Add a "Split View" toggle button in the top bar (use `Columns` icon from lucide-react).
- When active, the main content area splits into two equal panes using `flex` with `w-1/2`.
- Each pane has its own independent tool selector (a mini dropdown or a second sidebar panel header).
- Each pane renders its own `<TabWrapper>` instance with full keep-alive support.
- A draggable divider (`cursor-col-resize`) between panes lets users adjust the split ratio — store ratio in `localStorage('hackbench-split-ratio')`.
- Keyboard shortcut: `Ctrl+\` to toggle split view.
- In split mode, clicking a sidebar item targets the **active/focused pane** (highlighted with an emerald border `border border-emerald-500/40`).
- Disable split view on window width < 900px (sidebar collapse + single pane fallback).

**State to add in `App.tsx`:**
```ts
const [splitView, setSplitView] = useState(false);
const [activeSplitPane, setActiveSplitPane] = useState<'left' | 'right'>('left');
const [rightPanePage, setRightPanePage] = useState<string>('json-formatter');
const [splitRatio, setSplitRatio] = useState(50); // percent
```

---

## 2. Tool Pinning

**Goal:** Users can pin favorite tools to a "Pinned" section at the top of the sidebar.

**Implementation:**
- Add a pin icon (`Pin` from lucide-react) that appears on hover next to each sidebar nav item.
- Pinned tools appear in a new "Pinned" group at the very top of the sidebar (above existing groups), with a `Pin` icon as the group header icon.
- Store pinned tool IDs in `localStorage('hackbench-pinned-tools')` as a JSON array of tool IDs.
- Pin state is toggled — clicking the pin icon again unpins.
- Pinned items in the "Pinned" group still show their category icon and name.
- The original item in its category group remains visible (pinning is a shortcut, not a move).
- Max 8 pinned tools; show a toast if user tries to exceed this.

**Changes needed:**
- `Sidebar.tsx`: Add hover pin button on `NavItem`, render "Pinned" group conditionally at top.
- `App.tsx` or a new `usePinnedTools.ts` hook: manage pin state.

---

## 3. Custom Sidebar Ordering

**Goal:** Users can drag to reorder tools within each sidebar group.

**Implementation:**
- Use the HTML5 Drag and Drop API (no external library) on sidebar `NavItem` components.
- Each `NavItem` gets `draggable={true}` and drag event handlers.
- On drag start, store the dragged item's tool ID and source group.
- On drag over, show a blue/emerald insertion line indicator between items.
- On drop, reorder items within the group (cross-group dragging is NOT supported).
- Persist custom order per group in `localStorage('hackbench-tool-order')` as `Record<groupId, toolId[]>`.
- Add a "Reset Order" button in sidebar footer (small text button) that clears the stored order.
- Dragging is only enabled within the same group — items cannot be moved between groups.

**Changes needed:**
- `Sidebar.tsx`: Add drag handlers to `NavItem`, track `dragOverIndex` state per group, render drop indicator line.

---

## 4. Focus Mode

**Goal:** Distraction-free, full-screen tool view with sidebar hidden.

**Implementation:**
- Toggle with `Ctrl+Shift+F` or a `Maximize2` icon button in the top bar.
- When active:
  - Sidebar is fully hidden (not just collapsed — `display: none`).
  - Top bar is also hidden.
  - Tool content area takes up 100% of the window.
  - A minimal floating pill appears in the top-right corner (appears on mouse hover near top edge, auto-hides after 2s) with: current tool name + `Minimize2` exit button + `Ctrl+Shift+F` hint.
- Persist focus mode state in `localStorage('hackbench-focus-mode')`.
- Exit via `Ctrl+Shift+F`, `Escape`, or the floating exit button.
- The floating pill uses the design system: `bg-[#1a1a1a] border border-[#2a2a2a] text-[#e0e0e0]` with `rounded-full px-4 py-2`.

**State to add in `App.tsx`:**
```ts
const [focusMode, setFocusMode] = useState(false);
```

---

## 5. Embedded Browser Panel (ChatGPT / Claude / Any URL)

**Goal:** Open an embedded web panel alongside tools to access AI assistants or any URL.

**Implementation:**

> ⚠️ This uses Electron's `<webview>` tag. Enable it in `main.ts` via `webviewTag: true` in `BrowserWindow` `webPreferences`.

- Add a "Browser" button in the sidebar footer (use `Globe` icon).
- When clicked, opens a right-side drawer panel (400px wide, resizable) containing:
  - A URL bar at the top (pre-filled with `https://claude.ai` by default).
  - Quick-switch buttons: `Claude`, `ChatGPT`, `Gemini`, `Custom` — each sets the URL.
  - An Electron `<webview>` tag filling the rest of the panel.
  - Navigation buttons: Back (`ChevronLeft`), Forward (`ChevronRight`), Refresh (`RotateCw`), Open External (`ExternalLink`).
  - Close button (`X`) to hide the panel.
- The browser panel can be used alongside the current tool (it sits to the right of the main content, pushing content left — or overlays in split mode).
- Store last URL in `localStorage('hackbench-browser-url')`.
- Store panel open state and width in localStorage.

**`main.ts` change:**
```ts
webPreferences: {
  webviewTag: true,          // ADD THIS
  nodeIntegration: false,
  contextIsolation: true,
}
```

**New component:** `src/components/BrowserPanel.tsx`

```tsx
// Key structure:
<div className="flex flex-col h-full bg-[#111111] border-l border-[#2a2a2a]">
  <UrlBar />
  <QuickLinks /> {/* Claude, ChatGPT, Gemini buttons */}
  <webview src={url} className="flex-1 w-full" allowpopups />
</div>
```

> Note: Some sites (like ChatGPT) may block embedding via `X-Frame-Options`. If blocked, show a friendly message with an "Open in Browser" fallback button using Electron's `shell.openExternal(url)`.

---

## 6. HTML Viewer / Live Preview

**Goal:** A tool where users paste or write HTML+CSS+JS and see a live rendered preview.

**Implementation:**
- Add as a new tool: **HTML Viewer** in the "Formatters" category.
- File: `src/pages/HtmlViewer.tsx`
- Add to `navGroups` in `Sidebar.tsx` under Formatters with `Code` icon.
- Layout: Two-pane horizontal split — left is a code editor textarea, right is live preview.
- Preview uses an `<iframe srcDoc={html}>` that updates in real time (debounced 300ms).
- Toolbar options:
  - `Smartphone` / `Tablet` / `Monitor` buttons to toggle iframe width (375px / 768px / 100%).
  - `RefreshCw` to force refresh the preview.
  - `Copy` to copy the HTML.
  - `Download` to save as `.html` file.
  - `Maximize2` to go full preview (hide editor).
- The editor textarea supports tab key insertion (intercept `Tab` keydown, insert 2 spaces).
- Starter template: pre-fill with a minimal HTML5 boilerplate on first open.
- Use the standard design system — editor area: `bg-[#0a0a0a]`, `font-mono text-sm`, `text-[#e0e0e0]`.

**Starter template to pre-fill:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; }
  </style>
</head>
<body>
  <h1>Hello, Hackbench!</h1>
</body>
</html>
```

---

## Implementation Order (Recommended)

1. **HTML Viewer** — self-contained, no cross-component changes, easiest win.
2. **Tool Pinning** — only touches `Sidebar.tsx` and localStorage.
3. **Focus Mode** — touches `App.tsx` and `Layout.tsx`, straightforward.
4. **Custom Sidebar Ordering** — extends pinning work, drag logic in `Sidebar.tsx`.
5. **Split View** — most complex, touches routing and keep-alive rendering.
6. **Embedded Browser Panel** — requires Electron config change + new component.

---

## Design Consistency Reminders

- All new UI elements must use the hex color system: `#0a0a0a`, `#111111`, `#1a1a1a`, `#2a2a2a`, `#333333`.
- Accent: `emerald-500` (`#10b981`) for active/focus states only.
- Icons: `lucide-react@0.294` only — no other icon libraries.
- Animations: use existing `animate-fade-in` / `animate-slide-up` classes from `index.css`.
- All new localStorage keys must be prefixed with `hackbench-`.
- All new tools must be added to `CommandPalette.tsx` (via `navGroups` export from `Sidebar.tsx`).
