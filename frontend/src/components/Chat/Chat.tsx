import { useEffect, useRef, useState, useCallback } from 'react'
import type { Contact } from '@foku/shared'
import { useConnectionStatus, useContactsUpdated } from '../../services/ws.ts'
import { getContacts, refreshContacts, patchContactConfig } from '../../services/api.ts'
import ContactList from './ContactList.tsx'

export default function Chat() {
  const { status, qr, accountName } = useConnectionStatus()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)

  // Render QR code to canvas when qr_pending
  useEffect(() => {
    if (status !== 'qr_pending' || !qr || !canvasRef.current) return
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, qr, { width: 256 })
    })
  }, [status, qr])

  // Fetch contacts when connected
  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      const list = await getContacts()
      setContacts(list)
    } catch {
      // Connection not ready yet — keep loading state
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'connected') {
      fetchContacts()
    }
  }, [status, fetchContacts])

  // Re-fetch silently when the server notifies that contacts were updated
  useContactsUpdated(useCallback(() => {
    if (status === 'connected') fetchContacts()
  }, [status, fetchContacts]))

  const handleToggle = useCallback(async (jid: string, enabled: boolean) => {
    // Optimistic update
    setContacts((prev) =>
      prev.map((c) => (c.jid === jid ? { ...c, enabled } : c))
    )
    try {
      await patchContactConfig([{ jid, enabled }])
    } catch {
      // Revert on failure
      setContacts((prev) =>
        prev.map((c) => (c.jid === jid ? { ...c, enabled: !enabled } : c))
      )
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoadingContacts(true)
    try {
      const list = await refreshContacts()
      setContacts(list)
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  return (
    <div data-testid="chat-module" style={{ padding: '24px' }}>
      {status === 'connecting' && (
        <p style={{ color: '#888' }}>Conectando a WhatsApp…</p>
      )}

      {status === 'qr_pending' && (
        <div>
          <p style={{ marginBottom: '16px' }}>
            Escaneá el código QR con tu teléfono para conectar WhatsApp.
          </p>
          <canvas ref={canvasRef} />
        </div>
      )}

      {status === 'connected' && (
        <div>
          {accountName && (
            <p style={{ color: '#4caf50', marginBottom: '16px' }}>Conectado como {accountName}</p>
          )}
          <ContactList
            contacts={contacts}
            loading={loadingContacts}
            onToggle={handleToggle}
            onRefresh={handleRefresh}
          />
        </div>
      )}

      {status === 'disconnected' && (
        <p style={{ color: '#f44336' }}>
          No se pudo conectar a WhatsApp. Reiniciá la app para intentar de nuevo.
        </p>
      )}
    </div>
  )
}
