import { Router } from 'express'
import { getConnectionStatus, getAccountName } from '../whatsapp/whatsappService.js'

const router = Router()

router.get('/status', (_req, res) => {
  res.json({
    state: getConnectionStatus(),
    accountName: getAccountName(),
  })
})

export default router
