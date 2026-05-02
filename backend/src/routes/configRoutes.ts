import { Router } from 'express'
import { loadConfig } from '../config/configService.js'

const router = Router()

router.get('/config', (_req, res) => {
  res.json(loadConfig())
})

export default router
