import { useState } from 'react'
import { useConnectionStatus } from '../../services/ws.ts'
import ConversarPopup from './ConversarPopup.tsx'
import ConversationView from './ConversationView.tsx'

export default function Chat() {
  const { status, qr, accountName } = useConnectionStatus()
  const [conversarOpen, setConversarOpen] = useState(false)
  const [activeJid, setActiveJid] = useState<string | null>(null)

  const containerStyle: React.CSSProperties = {
    height: 'calc(100vh - 50px)',
    display: 'flex',
    flexDirection: 'column',
  }

  return (
    <div data-testid="chat-module" style={containerStyle}>
      {status === 'connecting' && (
        <div style={{ padding: '24px', color: '#888' }}>
          <p style={{ margin: 0 }}>Conectando a WhatsApp…</p>
        </div>
      )}

      {status === 'qr_pending' && (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <p style={{ margin: 0, color: '#aaa' }}>Escaneá el código QR con tu teléfono para conectar WhatsApp.</p>
          {qr && <QRCanvas qr={qr} />}
        </div>
      )}

      {status === 'disconnected' && (
        <div style={{ padding: '24px' }}>
          <p style={{ color: '#f44336', margin: 0 }}>No se pudo conectar a WhatsApp. Reiniciá la app para intentar de nuevo.</p>
        </div>
      )}

      {status === 'connected' && !activeJid && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          {accountName && (
            <p style={{ color: '#4caf50', margin: 0, fontSize: '13px' }}>Conectado como {accountName}</p>
          )}
          <button
            onClick={() => setConversarOpen(true)}
            style={{
              background: '#1f5c36', color: '#fff', border: 'none',
              borderRadius: '10px', padding: '14px 36px', fontSize: '16px',
              fontWeight: 600, cursor: 'pointer', letterSpacing: '0.3px',
            }}
          >
            Conversar
          </button>
        </div>
      )}

      {status === 'connected' && activeJid && (
        <ConversationView
          jid={activeJid}
          onClose={() => setActiveJid(null)}
        />
      )}

      {conversarOpen && (
        <ConversarPopup
          onContactSelect={(jid) => {
            setActiveJid(jid)
            setConversarOpen(false)
          }}
          onClose={() => setConversarOpen(false)}
        />
      )}
    </div>
  )
}

function QRCanvas({ qr }: { qr: string }) {
  const canvasRef = (canvas: HTMLCanvasElement | null) => {
    if (!canvas || !qr) return
    import('qrcode').then((QRCode) => {
      QRCode.toCanvas(canvas, qr, { width: 256, margin: 2 })
    })
  }
  return <canvas ref={canvasRef} />
}
