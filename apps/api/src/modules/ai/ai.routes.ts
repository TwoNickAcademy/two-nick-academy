import { Router, type IRouter } from 'express'
import multer from 'multer'
import { authenticate } from '../../middleware/authenticate'
import { chat, getSessions, getSessionMessages, deleteSession, getQuota } from './ai.controller'

// ─── Multer: memoria (sin disco) ──────────────────────────────────
// Límite 5 MB, solo imágenes

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imágenes JPEG, PNG, WEBP o GIF'))
    }
  },
})

const router: IRouter = Router()

// POST /ai/chat — multipart/form-data: { message, sessionId?, chart? }
router.post('/chat', authenticate, upload.single('chart'), chat)

// GET /ai/quota — cuota restante del usuario
router.get('/quota', authenticate, getQuota)

// GET /ai/sessions — lista de conversaciones
router.get('/sessions', authenticate, getSessions)

// GET /ai/sessions/:sessionId — mensajes de una sesión
router.get('/sessions/:sessionId', authenticate, getSessionMessages)

// DELETE /ai/sessions/:sessionId — borrar sesión
router.delete('/sessions/:sessionId', authenticate, deleteSession)

export default router
