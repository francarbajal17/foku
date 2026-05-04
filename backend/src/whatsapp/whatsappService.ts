import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidUser,
  isJidGroup,
  jidNormalizedUser,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import path from 'path'
import type { Contact, ContactConfig, WSMessage, ConnectionStatus } from '@foku/shared'
import { loadConfig } from '../config/configService.js'
import {
  loadContactsCache,
  saveContactsCache,
  getCachedContacts,
  upsertCachedContact,
  bulkUpsertCache,
} from '../config/contactsCache.js'
import { onSocketReady as chatOnSocketReady } from '../chat/chatService.js'

const AUTH_DIR = path.resolve(process.cwd(), 'wa_auth')
const MAX_RETRIES = 3
const SESSION_TIMEOUT_MS = 10_000

let currentStatus: ConnectionStatus = 'connecting'
let lastQr: string | undefined
let sock: ReturnType<typeof makeWASocket> | null = null
let broadcastFn: ((msg: WSMessage) => void) | null = null
let retryCount = 0
let contactsReady = false
let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null

export function getConnectionStatus(): ConnectionStatus { return currentStatus }
export function getLastQr(): string | undefined { return lastQr }
export function areContactsReady(): boolean { return contactsReady }

function setStatus(status: ConnectionStatus, qr?: string, pushName?: string) {
  currentStatus = status
  lastQr = qr  // persist so wsServer can include it on new connections
  broadcastFn?.({ type: 'connection_status', status, ...(qr ? { qr } : {}), ...(pushName ? { pushName } : {}) })
}

function clearAuth() {
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }) } catch { /**/ }
}

/** Resolve the real JID from a Baileys contact (handles @lid anonymous IDs). */
function resolveJid(c: { id: string; jid?: string }): string | null {
  if (c.jid && isJidUser(c.jid)) return jidNormalizedUser(c.jid)
  if (c.id && isJidUser(c.id)) return jidNormalizedUser(c.id)
  if (c.id && isJidGroup(c.id)) return c.id
  return null // @lid without jid — skip
}

async function connect(): Promise<void> {
  // Load persisted contacts immediately — available even before WA connects
  loadContactsCache()
  contactsReady = getCachedContacts().size > 0

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Foku', 'Chrome', '1.0.0'],
    syncFullHistory: true,
  })

  sock.ev.on('creds.update', saveCreds)

  function resolveName(c: { name?: string; notify?: string; verifiedName?: string }, fallback: string): string {
    return c.name ?? c.notify ?? c.verifiedName ?? fallback
  }

  // Fired during fresh QR scan — full contact list arrives here
  sock.ev.on('messaging-history.set', ({ contacts, chats }) => {
    // Build a name map from the contacts array (address book names take priority)
    const contactNameMap = new Map<string, string>()
    for (const c of contacts) {
      const jid = resolveJid(c as { id: string; jid?: string })
      if (!jid) continue
      const n = resolveName(c as { name?: string; notify?: string; verifiedName?: string }, '')
      if (n) contactNameMap.set(jid, n)
    }

    // Build entries from all chats — chat.name is the WhatsApp display name
    const entries: { jid: string; name: string; isGroup: boolean }[] = []
    const seen = new Set<string>()

    for (const chat of chats) {
      const jid = isJidUser(chat.id)
        ? jidNormalizedUser(chat.id)
        : isJidGroup(chat.id)
          ? chat.id
          : null
      if (!jid || seen.has(jid)) continue
      seen.add(jid)

      // Priority: address-book name > chat.name > existing cache > phone number
      const name =
        contactNameMap.get(jid)
        ?? (chat.name as string | null | undefined)
        ?? getCachedContacts().get(jid)?.name
        ?? jid.split('@')[0]

      entries.push({ jid, name, isGroup: isJidGroup(jid) ?? false })
    }

    // Also add any contacts not in chats (rare, but possible)
    for (const [jid, name] of contactNameMap) {
      if (!seen.has(jid)) {
        entries.push({ jid, name, isGroup: isJidGroup(jid) ?? false })
      }
    }

    bulkUpsertCache(entries)
    saveContactsCache()
    contactsReady = true
    broadcastFn?.({ type: 'contacts_updated' })
    console.log(`[contacts] history sync: ${entries.length} contacts (total cache: ${getCachedContacts().size})`)
  })

  // Fired for incremental contact updates
  sock.ev.on('contacts.upsert', (contacts) => {
    let changed = 0
    for (const c of contacts) {
      const jid = resolveJid(c as { id: string; jid?: string })
      if (!jid) continue
      const name = resolveName(
        c as { name?: string; notify?: string; verifiedName?: string },
        getCachedContacts().get(jid)?.name ?? jid.split('@')[0],
      )
      const before = getCachedContacts().get(jid)?.name
      upsertCachedContact(jid, name, isJidGroup(jid) ?? false)
      if (getCachedContacts().get(jid)?.name !== before) changed++
    }
    if (changed > 0) {
      saveContactsCache()
      broadcastFn?.({ type: 'contacts_updated' })
      console.log(`[contacts] upsert: ${changed} updated (total: ${getCachedContacts().size})`)
    }
    if (!contactsReady) contactsReady = true
  })

  sock.ev.on('contacts.update', (updates) => {
    let changed = false
    for (const u of updates) {
      const jid = resolveJid(u as { id: string; jid?: string })
      if (!jid) continue
      const name = resolveName(u as { name?: string; notify?: string; verifiedName?: string }, '')
      if (name) {
        upsertCachedContact(jid, name, isJidGroup(jid) ?? false)
        changed = true
      }
    }
    if (changed) {
      saveContactsCache()
      broadcastFn?.({ type: 'contacts_updated' })
    }
  })

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      if (sessionTimeoutId) { clearTimeout(sessionTimeoutId); sessionTimeoutId = null }
      setStatus('qr_pending', qr)
    }

    if (connection === 'open') {
      if (sessionTimeoutId) { clearTimeout(sessionTimeoutId); sessionTimeoutId = null }
      retryCount = 0
      const pushName = sock?.user?.name
      setStatus('connected', undefined, pushName)
      console.log(`[whatsapp] Connected as: ${pushName ?? 'Unknown'}`)

      // Always refresh groups on connect — they're always fetchable
      try {
        const groups = await sock!.groupFetchAllParticipating()
        const entries = Object.entries(groups).map(([jid, g]) => ({
          jid,
          name: (g as { subject?: string }).subject ?? jid,
          isGroup: true,
        }))
        bulkUpsertCache(entries)
        saveContactsCache()
        broadcastFn?.({ type: 'contacts_updated' })
        console.log(`[contacts] groups: ${entries.length} (total cache: ${getCachedContacts().size})`)
      } catch (err) {
        console.error('[whatsapp] Failed to fetch groups:', err)
      }

      contactsReady = true
      chatOnSocketReady(sock!)
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
      const isLoggedOut = statusCode === DisconnectReason.loggedOut

      if (isLoggedOut) {
        console.log('[whatsapp] Logged out — clearing session')
        clearAuth()
        retryCount = 0
        setStatus('connecting')
        await connect()
        return
      }

      if (retryCount < MAX_RETRIES) {
        retryCount++
        console.log(`[whatsapp] Disconnected — retry ${retryCount}/${MAX_RETRIES}`)
        setStatus('connecting')
        setTimeout(() => connect(), 2000 * retryCount)
      } else {
        console.log('[whatsapp] Max retries reached')
        setStatus('disconnected')
      }
    }
  })
}

export async function initWhatsApp(broadcast: (msg: WSMessage) => void): Promise<void> {
  broadcastFn = broadcast

  if (fs.existsSync(AUTH_DIR)) {
    sessionTimeoutId = setTimeout(() => {
      if (currentStatus !== 'connected') {
        console.log('[whatsapp] Session timeout — falling back to QR')
        clearAuth()
        connect()
      }
    }, SESSION_TIMEOUT_MS)
  }

  await connect()
}

export async function getContacts(): Promise<Contact[]> {
  const config = loadConfig()
  const configMap = new Map<string, boolean>(
    config.contacts.map((c: ContactConfig) => [c.jid, c.enabled])
  )

  return Array.from(getCachedContacts().values())
    .map(({ jid, name, isGroup }) => ({
      jid,
      name,
      isGroup,
      enabled: configMap.get(jid) ?? false,
    }))
    .sort((a, b) => {
      if (a.isGroup !== b.isGroup) return a.isGroup ? 1 : -1
      return a.name.localeCompare(b.name)
    })
}

export async function refreshContacts(): Promise<Contact[]> {
  if (!sock) return getContacts()

  try {
    const groups = await sock.groupFetchAllParticipating()
    const entries = Object.entries(groups).map(([jid, g]) => ({
      jid,
      name: (g as { subject?: string }).subject ?? jid,
      isGroup: true,
    }))
    bulkUpsertCache(entries)
    saveContactsCache()
    console.log(`[contacts] refresh: ${entries.length} groups`)
  } catch (err) {
    console.error('[contacts] refresh error:', err)
  }

  return getContacts()
}

export function getAccountName(): string {
  return sock?.user?.name ?? ''
}

export function getSock(): ReturnType<typeof makeWASocket> | null {
  return sock
}
