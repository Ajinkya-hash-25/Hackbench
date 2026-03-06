import { useState, useCallback, ComponentType } from 'react'
import TabBar, { Tab } from './common/TabBar'

interface TabWrapperProps {
  component: ComponentType
}

let nextId = 1
const generateId = () => String(nextId++)

function TabWrapper({ component: Component }: TabWrapperProps) {
  const [tabs, setTabs] = useState<Tab[]>(() => [{ id: generateId(), label: 'Tab 1' }])
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id)

  const addTab = useCallback(() => {
    const id = generateId()
    const label = `Tab ${tabs.length + 1}`
    setTabs(prev => [...prev, { id, label }])
    setActiveTabId(id)
  }, [tabs.length])

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex(t => t.id === id)
      const next = prev.filter(t => t.id !== id)
      if (id === activeTabId) {
        const newIdx = Math.min(idx, next.length - 1)
        setActiveTabId(next[newIdx].id)
      }
      return next
    })
  }, [activeTabId])

  const renameTab = useCallback((id: string, label: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, label } : t))
  }, [])

  return (
    <div className="h-full flex flex-col">
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTabId}
        onTabClose={closeTab}
        onTabAdd={addTab}
        onTabRename={renameTab}
      />
      <div className="flex-1 min-h-0 relative pt-2">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={tab.id === activeTabId ? 'h-full animate-fade-in' : 'hidden'}
          >
            <Component />
          </div>
        ))}
      </div>
    </div>
  )
}

export default TabWrapper
