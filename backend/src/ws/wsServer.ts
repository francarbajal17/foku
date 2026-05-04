import { WebSocketServer, WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import type { Server } from 'http'
import type { WSMessage } from '@foku/shared'
import { getConnectionStatus, getAccountName } from '../whatsapp/whatsappService.js'

let wss: WebSocketServer | null = null

export function createWsServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    // Immediately send current status so the client never starts stale
    const currentStatus = getConnectionStatus()
    const pushName = getAccountName()
    ws.send(JSON.stringify({ type: 'connection_status', status: currentStatus, ...(pushName ? { pushName } : {}) } satisfies WSMessage))

    ws.on('error', (err) => console.error('[ws] Client error:', err))
  })

  return wss
}

export function broadcast(msg: WSMessage): void {
  if (!wss) return
  const payload = JSON.stringify(msg)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}
