import { useState, useEffect, useCallback } from 'react'
import type { Contact, ContactConfig } from '@foku/shared'
import { getContacts, patchContactConfig, refreshContacts } from '../../services/api.ts'
import ContactList from './ContactList.tsx'

interface Props {
  onContactSelect: (jid: string) => void
  onClose: () => void
}

export default function ConversarPopup({ onContactSelect, onClose }: Props) {
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editarOpen, setEditarOpen] = useState(false)

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await getContacts()
      setAllContacts(list)
    } catch {
      setError('No se pudo cargar la lista de contactos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const enabledContacts = allContacts.filter((c) => c.enabled)

  const handleToggle = useCallback(async (jid: string, enabled: boolean) => {
    setAllContacts((prev) => prev.map((c) => (c.jid === jid ? { ...c, enabled } : c)))
    try {
      await patchContactConfig([{ jid, enabled }] as ContactConfig[])
    } catch {
      setAllContacts((prev) => prev.map((c) => (c.jid === jid ? { ...c, enabled: !enabled } : c)))
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    try {
      const list = await refreshContacts()
      setAllContacts(list)
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
        }}
      />

      {/* Popup */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(400px, 92vw)',
        maxHeight: '80vh',
        background: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #333',
        zIndex: 101,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #2a2a2a' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Conversar</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setEditarOpen(true)}
              style={{ fontSize: '12px', color: '#4caf50', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
            >
              Editar lista
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px' }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {loading && (
            <p style={{ color: '#888', textAlign: 'center', padding: '24px', margin: 0 }}>Cargando contactos…</p>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: '#f44336', margin: '0 0 12px' }}>{error}</p>
              <button onClick={fetchContacts} style={{ color: '#4caf50', background: 'none', border: '1px solid #4caf50', borderRadius: '6px', padding: '6px 16px', cursor: 'pointer' }}>
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && enabledContacts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ color: '#888', margin: '0 0 12px' }}>No hay contactos habilitados.</p>
              <button onClick={() => setEditarOpen(true)} style={{ color: '#4caf50', background: 'none', border: '1px solid #4caf50', borderRadius: '6px', padding: '6px 16px', cursor: 'pointer' }}>
                Editar lista
              </button>
            </div>
          )}

          {!loading && !error && enabledContacts.map((c) => (
            <button
              key={c.jid}
              onClick={() => { onContactSelect(c.jid); onClose() }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '12px 20px',
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', color: '#f0f0f0',
                borderBottom: '1px solid #222',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#252525' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
            >
              <span style={{ fontSize: '20px' }}>{c.isGroup ? '👥' : '👤'}</span>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Editar lista second overlay */}
      {editarOpen && (
        <>
          <div
            onClick={() => setEditarOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 102 }}
          />
          <div style={{
            position: 'fixed',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(420px, 94vw)',
            maxHeight: '82vh',
            background: '#1a1a1a',
            borderRadius: '12px',
            border: '1px solid #333',
            zIndex: 103,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #2a2a2a' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Editar lista</h2>
              <button
                onClick={() => setEditarOpen(false)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '4px' }}
                aria-label="Volver"
              >
                ×
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
              <ContactList
                contacts={allContacts}
                loading={loading}
                onToggle={handleToggle}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
        </>
      )}
    </>
  )
}
