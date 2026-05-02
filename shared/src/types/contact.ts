export interface Contact {
  jid: string
  name: string
  isGroup: boolean
  enabled: boolean
}

export interface ContactConfig {
  jid: string
  enabled: boolean
}
