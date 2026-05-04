import makeWASocket, {
  downloadMediaMessage,
  isJidGroup,
  isJidUser,
  jidNormalizedUser,
} from '@whiskeysockets/baileys'
import type { WAMessage } from '@whiskeysockets/baileys'
import type { WSMessage, ChatMessage } from '@foku/shared'

type WASocket = ReturnType<typeof makeWASocket>

let activeJid: string | null = null
let sock: WASocket | null = null
let broadcastFn: ((msg: WSMessage) => void) | null = null

// Track IDs sent as history to avoid duplicates in real-time handler
const historyMessageIds = new Set<string>()

export function initChatService(broadcast: (msg: WSMessage) => void): void {
  broadcastFn = broadcast
}

export function getActiveJid(): string | null {
  return activeJid
}

export function closeConversation(jid: string): void {
  if (activeJid === jid) {
    activeJid = null
    historyMessageIds.clear()
  }
}

// T010: replaced stub
export async function openConversation(jid: string): Promise<void> {
  activeJid = jid
  historyMessageIds.clear()
  sock!.fetchMessageHistory(100, null as never, Date.now())
}

// T016: replaced stub
export async function sendMessage(jid: string, text: string): Promise<void> {
  if (activeJid !== jid) throw new Error('No active conversation for this JID')
  await sock!.sendMessage(jid, { text })
}

// T020: full media-aware message builder
async function buildChatMessage(msg: WAMessage): Promise<ChatMessage> {
  const id = msg.key.id ?? ''
  const fromMe = msg.key.fromMe ?? false
  const timestamp = Number(msg.messageTimestamp ?? 0)
  const remoteJid = msg.key.remoteJid ?? ''
  const isGroup = remoteJid.endsWith('@g.us')
  const authorName = (!fromMe && isGroup && msg.pushName) ? msg.pushName : undefined

  const content = msg.message
  if (!content) return { id, fromMe, timestamp, contentType: 'other', mediaLabel: 'Unknown', authorName }

  if (content.conversation || content.extendedTextMessage) {
    const text = content.conversation ?? content.extendedTextMessage?.text ?? ''
    return { id, fromMe, timestamp, contentType: 'text', text, authorName }
  }

  if (content.imageMessage) {
    try {
      const buf = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
      const mime = content.imageMessage.mimetype ?? 'image/jpeg'
      return { id, fromMe, timestamp, contentType: 'image', mediaData: `data:${mime};base64,${buf.toString('base64')}`, authorName }
    } catch {
      return { id, fromMe, timestamp, contentType: 'other', mediaLabel: 'Image', authorName }
    }
  }

  if (content.audioMessage) {
    try {
      const buf = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
      const mime = content.audioMessage.mimetype ?? 'audio/ogg; codecs=opus'
      return { id, fromMe, timestamp, contentType: 'audio', mediaData: `data:${mime};base64,${buf.toString('base64')}`, authorName }
    } catch {
      return { id, fromMe, timestamp, contentType: 'other', mediaLabel: 'Audio', authorName }
    }
  }

  let mediaLabel = 'Media'
  if (content.videoMessage) mediaLabel = 'Video'
  else if (content.documentMessage) mediaLabel = content.documentMessage.fileName ?? 'Document'
  else if (content.stickerMessage) mediaLabel = 'Sticker'
  else if (content.locationMessage) mediaLabel = 'Location'
  else if (content.contactMessage) mediaLabel = 'Contacto'
  else if (content.reactionMessage) mediaLabel = 'Reacción'

  return { id, fromMe, timestamp, contentType: 'other', mediaLabel, authorName }
}

function normalizeJid(jid: string): string {
  if (isJidUser(jid)) return jidNormalizedUser(jid)
  return jid
}

// T011 + T018: registered on each new socket
export function onSocketReady(socket: WASocket): void {
  sock = socket

  // T011: deliver history after fetchMessageHistory call
  socket.ev.on('messaging-history.set', async ({ messages: msgs }) => {
    if (!activeJid || !msgs?.length) return
    const jid = activeJid
    const out: ChatMessage[] = []
    for (const msg of msgs) {
      const remoteJid = msg.key.remoteJid
      if (!remoteJid) continue
      if (normalizeJid(remoteJid) !== jid) continue
      historyMessageIds.add(msg.key.id ?? '')
      out.push(await buildChatMessage(msg))
    }
    out.sort((a, b) => a.timestamp - b.timestamp)
    broadcastFn?.({ type: 'chat_history', jid, messages: out })
    console.log(`[chat] history sent: ${out.length} messages for ${jid}`)
  })

  // T018: real-time incoming + sent messages
  socket.ev.on('messages.upsert', async ({ messages: msgs, type }) => {
    if (!activeJid) return
    for (const msg of msgs) {
      // Process 'notify' (incoming) and 'append' fromMe (sent confirmation)
      if (type !== 'notify' && !(type === 'append' && msg.key.fromMe)) continue
      const remoteJid = msg.key.remoteJid
      if (!remoteJid) continue
      if (normalizeJid(remoteJid) !== activeJid) continue
      const msgId = msg.key.id ?? ''
      if (historyMessageIds.has(msgId)) continue // skip already-sent history
      historyMessageIds.add(msgId)
      const chatMsg = await buildChatMessage(msg)
      broadcastFn?.({ type: 'chat_message', jid: activeJid, message: chatMsg })
    }
  })
}
