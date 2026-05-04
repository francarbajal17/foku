import fs from 'fs'
import path from 'path'

const CACHE_PATH = path.resolve(process.cwd(), 'contacts_cache.json')
const TEMP_PATH = CACHE_PATH + '.tmp'

interface CachedContact {
  jid: string
  name: string
  isGroup: boolean
}

let cache = new Map<string, CachedContact>()

export function loadContactsCache(): Map<string, CachedContact> {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8')
    const list = JSON.parse(raw) as CachedContact[]
    cache = new Map(list.map((c) => [c.jid, c]))
    console.log(`[contacts-cache] loaded ${cache.size} contacts from disk`)
  } catch {
    cache = new Map()
  }
  return cache
}

export function saveContactsCache(): void {
  try {
    const list = Array.from(cache.values())
    fs.writeFileSync(TEMP_PATH, JSON.stringify(list, null, 2), 'utf-8')
    fs.renameSync(TEMP_PATH, CACHE_PATH)
  } catch (err) {
    console.error('[contacts-cache] save error:', err)
  }
}

export function getCachedContacts(): Map<string, CachedContact> {
  return cache
}

function looksLikePhoneNumber(name: string): boolean {
  return /^\d+$/.test(name)
}

export function upsertCachedContact(jid: string, name: string, isGroup: boolean): void {
  const existing = cache.get(jid)
  if (existing) {
    if (existing.name === name) return
    // Don't downgrade a real name to a phone number
    if (looksLikePhoneNumber(name) && !looksLikePhoneNumber(existing.name)) return
  }
  cache.set(jid, { jid, name, isGroup })
}

export function bulkUpsertCache(entries: CachedContact[]): void {
  for (const e of entries) {
    const existing = cache.get(e.jid)
    // Don't overwrite a real name with a phone-number fallback
    if (existing && looksLikePhoneNumber(e.name) && !looksLikePhoneNumber(existing.name)) continue
    cache.set(e.jid, e)
  }
}
