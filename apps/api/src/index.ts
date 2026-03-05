import 'dotenv/config'
import express, { type Request } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { connectRedis } from './lib/redis'
import { initSocket } from './lib/socket'
import { errorHandler } from './middleware/errorHandler'

// Routers
import authRoutes      from './modules/auth/auth.routes'
import signalsRoutes   from './modules/signals/signals.routes'
import paymentsRoutes  from './modules/payments/payments.routes'
import aiRoutes        from './modules/ai/ai.routes'
import knowledgeRoutes from './modules/knowledge/knowledge.routes'
import mt5Routes       from './modules/mt5/mt5.routes'
import coursesRoutes   from './modules/courses/courses.routes'
import eventsRoutes    from './modules/events/events.routes'
import chatRoutes      from './modules/chat/chat.routes'
import usersRoutes     from './modules/users/users.routes'
import adminRoutes     from './modules/admin/admin.routes'
import { purgeOldMessages } from './modules/chat/chat.service'

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

// Captura el rawBody ANTES del parsing JSON (requerido para la firma HMAC de Binance)
// Solo aplica al endpoint del webhook para no afectar el resto
app.use(
  express.json({
    limit: '10mb',
    verify: (req: Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString('utf-8')
    },
  }),
)
app.use(express.urlencoded({ extended: true }))

// ─── Health Check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Rutas API v1 ──────────────────────────────────────────────
app.use('/v1/auth',      authRoutes)
app.use('/v1/signals',   signalsRoutes)
app.use('/v1/payments',  paymentsRoutes)
app.use('/v1/ai',        aiRoutes)
app.use('/v1/knowledge', knowledgeRoutes)
app.use('/v1/mt5',       mt5Routes)
app.use('/v1/courses',   coursesRoutes)
app.use('/v1/events',    eventsRoutes)
app.use('/v1/chat',      chatRoutes)
app.use('/v1/users',     usersRoutes)
app.use('/v1/admin',     adminRoutes)

// ─── Error Handler ─────────────────────────────────────────────
app.use(errorHandler)

// ─── Bootstrap ─────────────────────────────────────────────────
async function bootstrap() {
  await connectRedis()
  initSocket(http)

  // ─── Cron: purgar mensajes de chat con más de 24h ──────────────
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
  setInterval(() => purgeOldMessages().catch(console.error), TWENTY_FOUR_HOURS)
  console.log('[Chat] Purge automático programado cada 24h')

  http.listen(PORT, () => {
    console.log(`[Server] Two-Nick API corriendo en puerto ${PORT}`)
    console.log(`[Server] Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
    console.log(`[Socket] Socket.io activo`)
  })
}

bootstrap().catch(console.error)
