import { Router } from 'express'
import type { ContactConfig } from '@foku/shared'
import {
  getContacts,
  refreshContacts,
  getConnectionStatus,
  areContactsReady,
} from '../whatsapp/whatsappService.js'
import { updateContactConfig } from '../config/configService.js'

const router = Router()

router.get('/contacts', async (_req, res) => {
  if (getConnectionStatus() !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected' })
  }
  if (!areContactsReady()) {
    return res.status(202).json({ status: 'loading' })
  }
  const contacts = await getContacts()
  res.json({ contacts })
})

router.post('/contacts/refresh', async (_req, res) => {
  if (getConnectionStatus() !== 'connected') {
    return res.status(503).json({ error: 'WhatsApp not connected' })
  }
  const contacts = await refreshContacts()
  res.json({ contacts })
})

router.patch('/config/contacts', (req, res) => {
  const body = req.body as { contacts?: ContactConfig[] }
  if (!Array.isArray(body?.contacts)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }
  const updated = updateContactConfig(body.contacts)
  res.json({ contacts: updated.contacts })
})

export default router
