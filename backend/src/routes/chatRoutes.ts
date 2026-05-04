import { Router } from 'express'
import { getConnectionStatus } from '../whatsapp/whatsappService.js'
import {
  openConversation,
  sendMessage,
  closeConversation,
  getActiveJid,
} from '../chat/chatService.js'

const router = Router()

router.post('/chat/open', async (req, res) => {
  const { jid } = req.body as { jid?: string }
  if (!jid || typeof jid !== 'string') {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  if (getConnectionStatus() !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected' })
  }
  await openConversation(jid)
  res.json({ ok: true })
})

router.post('/chat/send', async (req, res) => {
  const { jid, text } = req.body as { jid?: string; text?: string }
  if (!jid || typeof jid !== 'string' || !text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  if (getConnectionStatus() !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected' })
  }
  if (jid !== getActiveJid()) {
    return res.status(409).json({ error: 'No active conversation for this JID' })
  }
  try {
    await sendMessage(jid, text.trim())
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

router.post('/chat/close', (req, res) => {
  const { jid } = req.body as { jid?: string }
  if (!jid || typeof jid !== 'string') {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  closeConversation(jid)
  res.json({ ok: true })
})

export default router
