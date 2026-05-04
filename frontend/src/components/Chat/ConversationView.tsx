import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChatMessage } from '@foku/shared'
import { useConnectionStatus, useChatHistory, useChatMessage } from '../../services/ws.ts'
import { openConversation, sendMessage, closeConversation } from '../../services/chat.ts'
import MessageBubble from './MessageBubble.tsx'

const SCROLL_THRESHOLD = 60
const HISTORY_TIMEOUT_MS = 10_000

interface Props {
  jid: string
  onClose: () => void
}

export default function ConversationView({ jid, onClose }: Props) {
  const { status } = useConnectionStatus()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [inputText, setInputText] = useState('')
  const [sendError, setSendError] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDisconnected = status === 'disconnected'

  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
      setHasNewMessage(false)
    }
  }, [])

  const startFetch = useCallback(async () => {
    setIsLoading(true)
    setFetchError(false)
    setMessages([])
    try {
      await openConversation(jid)
    } catch {
      setIsLoading(false)
      setFetchError(true)
      return
    }
    // Timeout: if chat_history hasn't arrived in 10s, show retry
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      setFetchError(true)
    }, HISTORY_TIMEOUT_MS)
  }, [jid])

  useEffect(() => {
    startFetch()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      closeConversation(jid)
    }
  }, [jid, startFetch])

  useChatHistory(useCallback((incomingJid: string, msgs: ChatMessage[]) => {
    if (incomingJid !== jid) return
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    setMessages(msgs)
    setIsLoading(false)
    setFetchError(false)
    // auto-scroll after history renders
    setTimeout(scrollToBottom, 0)
  }, [jid, scrollToBottom]))

  useChatMessage(useCallback((incomingJid: string, msg: ChatMessage) => {
    if (incomingJid !== jid) return
    setMessages((prev) => [...prev, msg])
    if (atBottomRef.current) {
      setTimeout(scrollToBottom, 0)
    } else {
      setHasNewMessage(true)
    }
  }, [jid, scrollToBottom]))

  const handleScroll = useCallback(() => {
    const el = listRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD
    if (atBottomRef.current) setHasNewMessage(false)
  }, [])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isDisconnected) return
    setInputText('')
    setSendError(false)
    try {
      await sendMessage(jid, text)
    } catch {
      setSendError(true)
      setTimeout(() => setSendError(false), 3000)
    }
  }, [inputText, jid, isDisconnected])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleClose = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    onClose()
  }, [onClose])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        <button
          onClick={handleClose}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px', flexShrink: 0 }}
          aria-label="Volver"
        >
          ←
        </button>
        <span style={{ fontSize: '14px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {jid.split('@')[0]}
        </span>
      </div>

      {/* Disconnection banner — T022 */}
      {isDisconnected && (
        <div style={{ background: '#3a1010', color: '#f87171', fontSize: '13px', padding: '8px 16px', textAlign: 'center', flexShrink: 0 }}>
          WhatsApp desconectado. Reconectando…
        </div>
      )}

      {/* Loading state — T014 */}
      {isLoading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#888', margin: 0 }}>Cargando mensajes…</p>
        </div>
      )}

      {/* Fetch error / retry — T023 */}
      {!isLoading && fetchError && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <p style={{ color: '#f44336', margin: 0 }}>No se pudo cargar el chat.</p>
          <button
            onClick={startFetch}
            style={{ color: '#4caf50', background: 'none', border: '1px solid #4caf50', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Message list */}
      {!isLoading && !fetchError && (
        <div
          ref={listRef}
          onScroll={handleScroll}
          style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column' }}
        >
          {messages.length === 0 && (
            <p style={{ color: '#555', textAlign: 'center', margin: 'auto 0', fontSize: '13px' }}>Sin mensajes recientes</p>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}
        </div>
      )}

      {/* New message indicator — T019 */}
      {hasNewMessage && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute', bottom: '72px', left: '50%', transform: 'translateX(-50%)',
            background: '#1f5c36', color: '#fff', border: 'none', borderRadius: '20px',
            padding: '6px 16px', cursor: 'pointer', fontSize: '12px', zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          ⬇ nuevo mensaje
        </button>
      )}

      {/* Send error indicator */}
      {sendError && (
        <div style={{ padding: '6px 16px', background: '#3a1010', color: '#f87171', fontSize: '12px', textAlign: 'center', flexShrink: 0 }}>
          Error al enviar. Verificá la conexión.
        </div>
      )}

      {/* Input area — T017 */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #2a2a2a', flexShrink: 0, display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisconnected}
          placeholder={isDisconnected ? 'Desconectado…' : 'Escribí un mensaje…'}
          rows={1}
          style={{
            flex: 1, background: '#252525', border: '1px solid #333', borderRadius: '8px',
            color: '#f0f0f0', padding: '8px 12px', fontSize: '14px', resize: 'none',
            outline: 'none', fontFamily: 'inherit', lineHeight: '1.4',
            opacity: isDisconnected ? 0.5 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isDisconnected}
          style={{
            background: !inputText.trim() || isDisconnected ? '#2a2a2a' : '#1f5c36',
            color: !inputText.trim() || isDisconnected ? '#555' : '#fff',
            border: 'none', borderRadius: '8px', padding: '8px 14px',
            cursor: !inputText.trim() || isDisconnected ? 'default' : 'pointer',
            fontSize: '14px', flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
