import type { ChatMessage } from '@foku/shared'

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

interface Props { msg: ChatMessage }

export default function MessageBubble({ msg }: Props) {
  const isMe = msg.fromMe

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      marginBottom: '4px',
      padding: '0 12px',
    }}>
      {msg.authorName && (
        <span style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px', paddingLeft: '4px' }}>
          {msg.authorName}
        </span>
      )}
      <div style={{
        maxWidth: '72%',
        background: isMe ? '#1f5c36' : '#2a2a2a',
        borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        padding: '6px 10px',
        wordBreak: 'break-word',
      }}>
        {msg.contentType === 'text' && (
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', color: '#f0f0f0' }}>
            {msg.text}
          </p>
        )}

        {msg.contentType === 'image' && msg.mediaData && (
          <img
            src={msg.mediaData}
            alt="imagen"
            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', display: 'block' }}
            onError={(e) => {
              const t = e.currentTarget
              t.style.display = 'none'
              const p = document.createElement('p')
              p.textContent = '🖼️ Imagen no disponible'
              p.style.color = '#888'
              p.style.margin = '0'
              t.parentNode?.insertBefore(p, t)
            }}
          />
        )}

        {msg.contentType === 'audio' && msg.mediaData && (
          <audio
            controls
            src={msg.mediaData}
            style={{ width: '220px', maxWidth: '100%', height: '36px' }}
          />
        )}

        {(msg.contentType === 'other' || (msg.contentType === 'image' && !msg.mediaData) || (msg.contentType === 'audio' && !msg.mediaData)) && (
          <p style={{ margin: 0, fontSize: '13px', color: '#aaa', fontStyle: 'italic' }}>
            {msg.contentType === 'image' ? '🖼️ ' : msg.contentType === 'audio' ? '🎵 ' : '📎 '}
            {msg.mediaLabel ?? msg.contentType}
          </p>
        )}

        <span style={{ fontSize: '10px', color: isMe ? '#9fc9a8' : '#666', display: 'block', textAlign: 'right', marginTop: '3px' }}>
          {formatTime(msg.timestamp)}
        </span>
      </div>
    </div>
  )
}
