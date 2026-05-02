import fs from 'fs'
import path from 'path'
import type { AppConfig, ContactConfig } from '@foku/shared'

const CONFIG_PATH = path.resolve(process.cwd(), 'config.json')
const TEMP_PATH = CONFIG_PATH + '.tmp'

const DEFAULT_CONFIG: AppConfig = {
  contacts: [],
  notes: '',
  pinnedVideos: [],
}

export function loadConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AppConfig>
    return {
      contacts: parsed.contacts ?? DEFAULT_CONFIG.contacts,
      notes: parsed.notes ?? DEFAULT_CONFIG.notes,
      pinnedVideos: parsed.pinnedVideos ?? DEFAULT_CONFIG.pinnedVideos,
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: AppConfig): void {
  fs.writeFileSync(TEMP_PATH, JSON.stringify(config, null, 2), 'utf-8')
  fs.renameSync(TEMP_PATH, CONFIG_PATH)
}

export function updateContactConfig(updates: ContactConfig[]): AppConfig {
  const config = loadConfig()
  const configMap = new Map(config.contacts.map((c) => [c.jid, c.enabled]))
  for (const update of updates) {
    configMap.set(update.jid, update.enabled)
  }
  config.contacts = Array.from(configMap.entries()).map(([jid, enabled]) => ({ jid, enabled }))
  saveConfig(config)
  return config
}
