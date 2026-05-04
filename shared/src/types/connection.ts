import type { ChatMessage } from './chat.js'

export type ConnectionStatus = 'connecting' | 'qr_pending' | 'connected' | 'disconnected'

export type WSMessage =
  | { type: 'connection_status'; status: ConnectionStatus; qr?: string; pushName?: string }
  | { type: 'contacts_updated' }
  | { type: 'chat_history'; jid: string; messages: ChatMessage[] }
  | { type: 'chat_message'; jid: string; message: ChatMessage }
