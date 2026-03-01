import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { connectRedis } from './lib/redis'
import { initSocket } from './lib/socket'
import { errorHandler } from './middleware/errorHandler'

// Routers
import authRoutes    from './modules/auth/auth.routes'
import signalsRoutes from './modules/signals/signals.routes'

const app  = express()
const http = createServer(app)
const PORT = process.env.PORT ?? 3000

// ─── Middlewares Globales ──────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://admin.twonick.academy',
  ],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Health Check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Rutas API v1 ──────────────────────────────────────────────
app.use('/v1/auth',    authRoutes)
app.use('/v1/signals', signalsRoutes)

// ─── Error Handler ─────────────────────────────────────────────
app.use(errorHandler)

// ─── Bootstrap ─────────────────────────────────────────────────
async function bootstrap() {
  await connectRedis()

  // Inicializar Socket.io sobre el servidor HTTP
  initSocket(http)

  http.listen(PORT, () => {
    console.log(`[Server] Two-Nick API corriendo en puerto ${PORT}`)
    console.log(`[Server] Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
    console.log(`[Socket] Socket.io activo`)
  })
}

bootstrap().catch(console.error)
