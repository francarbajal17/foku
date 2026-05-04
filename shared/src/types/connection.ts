export type ConnectionStatus = 'connecting' | 'qr_pending' | 'connected' | 'disconnected'

export type WSMessage =
  | { type: 'connection_status'; status: ConnectionStatus; qr?: string; pushName?: string }
  | { type: 'contacts_updated' }
