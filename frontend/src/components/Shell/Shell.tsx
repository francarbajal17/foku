import { useState } from 'react'
import type { ReactNode } from 'react'

type Module = 'chat' | 'focus' | 'timer' | 'notes'

interface ShellProps {
  chat: ReactNode
  focus: ReactNode
  timer: ReactNode
  notes: ReactNode
}

const TABS: { id: Module; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'focus', label: 'Focus' },
  { id: 'timer', label: 'Timer' },
  { id: 'notes', label: 'Notes' },
]

export default function Shell({ chat, focus, timer, notes }: ShellProps) {
  const [active, setActive] = useState<Module>('chat')

  const modules: Record<Module, ReactNode> = { chat, focus, timer, notes }

  return (
    <div>
      <nav style={{ display: 'flex', gap: '8px', padding: '12px', borderBottom: '1px solid #333' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={active === tab.id ? 'tab-active' : 'tab'}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: active === tab.id ? 'bold' : 'normal',
              borderBottom: active === tab.id ? '2px solid #fff' : '2px solid transparent',
              background: 'none',
              color: active === tab.id ? '#fff' : '#888',
              border: 'none',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>
        {TABS.map((tab) => (
          <div
            key={tab.id}
            style={{ display: active === tab.id ? 'block' : 'none' }}
          >
            {modules[tab.id]}
          </div>
        ))}
      </main>
    </div>
  )
}
