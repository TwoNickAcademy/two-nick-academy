import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { connectRedis } from './lib/redis'
import { errorHandler } from './middleware/errorHandler'

// Routers
import authRoutes from './modules/auth/auth.routes'

const app  = express()
const http = createServer(app)
const PORT = process.env.PORT ?? 3000

// ─── Middlewares Globales ──────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:3001',               // Next.js dev
    'https://admin.twonick.academy',       // Admin web
  ],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))   // 10mb para imágenes base64
app.use(express.urlencoded({ extended: true }))

// ─── Health Check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Rutas API v1 ──────────────────────────────────────────────
app.use('/v1/auth', authRoutes)

// ─── Error Handler (debe ir al final) ─────────────────────────
app.use(errorHandler)

// ─── Inicio ────────────────────────────────────────────────────
async function bootstrap() {
  await connectRedis()
  http.listen(PORT, () => {
    console.log(`[Server] Two-Nick API corriendo en puerto ${PORT}`)
    console.log(`[Server] Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
  })
}

bootstrap().catch(console.error)
