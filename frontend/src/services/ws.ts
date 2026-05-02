import { useState, useEffect } from 'react'
import type { ConnectionStatus, WSMessage } from '@foku/shared'

type ConnectionState = { status: ConnectionStatus; qr?: string; accountName?: string }

let socket: WebSocket | null = null
const listeners = new Set<(state: ConnectionState) => void>()
let lastState: ConnectionState = { status: 'connecting' }

function getSocket(): WebSocket {
  if (socket && socket.readyState === WebSocket.OPEN) return socket

  socket = new WebSocket(`ws://${window.location.host}/ws`)

  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as WSMessage
      if (msg.type === 'connection_status') {
        lastState = { status: msg.status, qr: msg.qr }
        listeners.forEach((fn) => fn(lastState))
      }
    } catch {
      // ignore malformed messages
    }
  }

  socket.onclose = () => {
    // Attempt to reconnect after 2s
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
    listeners.add(setState)
    // Sync with latest state in case it changed before mount
    setState(lastState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return state
}
