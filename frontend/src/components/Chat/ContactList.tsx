import type { Contact } from '@foku/shared'

interface ContactListProps {
  contacts: Contact[]
  loading: boolean
  onToggle: (jid: string, enabled: boolean) => void
  onRefresh: () => void
}

export default function ContactList({ contacts, loading, onToggle, onRefresh }: ContactListProps) {
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <h3 style={{ margin: 0 }}>Lista de contactos</h3>
        <button onClick={onRefresh} disabled={loading} style={{ cursor: 'pointer' }}>
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {loading && (
        <p style={{ color: '#888' }}>Cargando contactos…</p>
      )}

      {!loading && contacts.length === 0 && (
        <p style={{ color: '#888' }}>No se encontraron contactos.</p>
      )}

      {!loading && contacts.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '400px', overflowY: 'auto' }}>
          {contacts.map((contact) => (
            <li
              key={contact.jid}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 0',
                borderBottom: '1px solid #222',
              }}
            >
              <input
                type="checkbox"
                checked={contact.enabled}
                onChange={(e) => onToggle(contact.jid, e.target.checked)}
                id={`contact-${contact.jid}`}
              />
              <label htmlFor={`contact-${contact.jid}`} style={{ cursor: 'pointer', flex: 1 }}>
                {contact.isGroup ? '👥 ' : ''}{contact.name}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
