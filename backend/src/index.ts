import http from 'http'
import express from 'express'
import { loadConfig } from './config/configService.js'
import { createWsServer, broadcast } from './ws/wsServer.js'
import { initWhatsApp } from './whatsapp/whatsappService.js'
import statusRoutes from './routes/statusRoutes.js'
import contactRoutes from './routes/contactRoutes.js'
import configRoutes from './routes/configRoutes.js'

const app = express()
app.use(express.json())

app.use('/api', statusRoutes)
app.use('/api', contactRoutes)
app.use('/api', configRoutes)

const server = http.createServer(app)
createWsServer(server)

const PORT = 3001
server.listen(PORT, async () => {
  loadConfig()
  console.log(`[foku] Backend listening on http://localhost:${PORT}`)
  await initWhatsApp(broadcast)
})

export { server, app }
