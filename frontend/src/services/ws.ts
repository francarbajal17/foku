import { useState, useEffect, useCallback } from 'react'
import type { ConnectionStatus, WSMessage, ChatMessage } from '@foku/shared'

type ConnectionState = { status: ConnectionStatus; qr?: string; accountName?: string }

let socket: WebSocket | null = null
const statusListeners = new Set<(state: ConnectionState) => void>()
const contactsListeners = new Set<() => void>()
const chatHistoryListeners = new Set<(jid: string, messages: ChatMessage[]) => void>()
const chatMessageListeners = new Set<(jid: string, message: ChatMessage) => void>()
let lastState: ConnectionState = { status: 'connecting' }

function getSocket(): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) return socket

  socket = new WebSocket(`ws://${window.location.host}/ws`)

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as WSMessage
      if (msg.type === 'connection_status') {
        lastState = { status: msg.status, qr: msg.qr, accountName: msg.pushName }
        statusListeners.forEach((fn) => fn(lastState))
      } else if (msg.type === 'contacts_updated') {
        contactsListeners.forEach((fn) => fn())
      } else if (msg.type === 'chat_history') {
        chatHistoryListeners.forEach((fn) => fn(msg.jid, msg.messages))
      } else if (msg.type === 'chat_message') {
        chatMessageListeners.forEach((fn) => fn(msg.jid, msg.message))
      }
    } catch {
      // ignore malformed messages
    }
  }

  socket.onclose = () => {
    setTimeout(() => getSocket(), 2000)
  }

  socket.onerror = () => socket?.close()

  return socket
}

// Initialize connection on module load
getSocket()

export function useConnectionStatus(): ConnectionState {
  const [state, setState] = useState<ConnectionState>(lastState)

  useEffect(() => {
    statusListeners.add(setState)
    setState(lastState)
    return () => { statusListeners.delete(setState) }
  }, [])

  return state
}

export function useContactsUpdated(onUpdate: () => void): void {
  const stable = useCallback(onUpdate, [onUpdate])
  useEffect(() => {
    contactsListeners.add(stable)
    return () => { contactsListeners.delete(stable) }
  }, [stable])
}

export function useChatHistory(callback: (jid: string, messages: ChatMessage[]) => void): void {
  const stable = useCallback(callback, [callback])
  useEffect(() => {
    chatHistoryListeners.add(stable)
    return () => { chatHistoryListeners.delete(stable) }
  }, [stable])
}

export function useChatMessage(callback: (jid: string, message: ChatMessage) => void): void {
  const stable = useCallback(callback, [callback])
  useEffect(() => {
    chatMessageListeners.add(stable)
    return () => { chatMessageListeners.delete(stable) }
  }, [stable])
}
