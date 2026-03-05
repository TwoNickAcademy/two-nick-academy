import { Request, Response, NextFunction } from 'express'
import { MembershipLevel } from '@prisma/client'
import * as chatService from './chat.service'
import type { AuthRequest } from '../../types'
import { getIO } from '../../lib/socket'

const VALID_LEVELS = ['GENERAL', 'VIP', 'SUPREMO', 'MASTER'] as const

// ─── GET /chat/:roomLevel/messages ────────────────────────────────
export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const roomLevel = (req.params['roomLevel'] as string).toUpperCase() as MembershipLevel
    if (!VALID_LEVELS.includes(roomLevel as typeof VALID_LEVELS[number])) {
      return res.status(400).json({ message: 'Sala inválida' })
    }

    const limit  = Math.min(Number(req.query['limit'] ?? 50), 100)
    const before = req.query['before'] as string | undefined

    const messages = await chatService.getMessages(
      roomLevel,
      req.user!.membershipLevel,
      limit,
      before,
    )
    res.status(200).json({ data: messages })
  } catch (err) { next(err) }
}

// ─── DELETE /chat/admin/messages/:messageId ───────────────────────
export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await chatService.deleteMessage(req.params['messageId'] as string)
    res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

// ─── DELETE /chat/admin/clear/:roomLevel ──────────────────────────
export async function clearRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const roomLevel = (req.params['roomLevel'] as string).toUpperCase() as MembershipLevel
    if (!(['GENERAL', 'VIP', 'SUPREMO', 'MASTER'] as string[]).includes(roomLevel)) {
      return res.status(400).json({ message: 'Sala inválida' })
    }
    const result = await chatService.clearRoom(roomLevel)
    // Notificar a los usuarios conectados en la sala que fue limpiada
    getIO().to(`chat:${roomLevel}`).emit('chat:cleared', { roomLevel })
    res.status(200).json({ data: result })
  } catch (err) { next(err) }
}
