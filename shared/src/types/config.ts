import type { ContactConfig } from './contact.js'

export interface AppConfig {
  contacts: ContactConfig[]
  notes: string
  pinnedVideos: string[]
}
