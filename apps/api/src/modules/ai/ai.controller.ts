import { Response, NextFunction } from 'express'
import { chatMessageSchema } from './ai.schema'
import * as aiService from './ai.service'
import type { AuthRequest } from '../../types'

// ─── POST /ai/chat — Mensaje + imagen opcional ────────────────────
// Responde como SSE (Server-Sent Events) para streaming en tiempo real

export async function chat(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Validar campos de texto (vienen en req.body desde multer)
    const parsed = chatMessageSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        message: 'Datos inválidos',
        errors:  parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      return
    }

    // Configurar cabeceras SSE
    res.setHeader('Content-Type',  'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection',    'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')  // Deshabilitar buffer en Nginx
    res.flushHeaders()

    // Procesar imagen si fue subida (via multer memoryStorage)
    const file         = req.file
    const imageBase64  = file ? file.buffer.toString('base64') : undefined
    const imageMime    = file ? file.mimetype : undefined

    await aiService.streamChat(
      {
        userId:      req.user!.id,
        userLevel:   req.user!.membershipLevel,
        message:     parsed.data.message,
        sessionId:   parsed.data.sessionId,
        imageBase64,
        imageMime,
      },
      res,
    )
  } catch (err) {
    next(err)
  }
}

// ─── GET /ai/sessions — Lista de sesiones ────────────────────────

export async function getSessions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sessions = await aiService.getSessions(req.user!.id)
    res.status(200).json({ data: sessions })
  } catch (err) {
    next(err)
  }
}

// ─── GET /ai/sessions/:sessionId — Mensajes de una sesión ────────

export async function getSessionMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params as { sessionId: string }
    const messages = await aiService.getSessionMessages(req.user!.id, sessionId)
    res.status(200).json({ data: messages })
  } catch (err) {
    next(err)
  }
}

// ─── DELETE /ai/sessions/:sessionId ──────────────────────────────

export async function deleteSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { sessionId } = req.params as { sessionId: string }
    const result = await aiService.deleteSession(req.user!.id, sessionId)
    res.status(200).json({ message: 'Sesión eliminada', data: result })
  } catch (err) {
    next(err)
  }
}

// ─── GET /ai/quota — Cuota restante del usuario ───────────────────

export async function getQuota(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = await aiService.getQuotaStatus(req.user!.id, req.user!.membershipLevel)
    res.status(200).json({ data: status })
  } catch (err) {
    next(err)
  }
}
