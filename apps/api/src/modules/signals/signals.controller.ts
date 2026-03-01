import { Request, Response, NextFunction } from 'express'
import {
  webhookSignalSchema,
  listSignalsSchema,
  closeSignalSchema,
} from './signals.schema'
import * as signalsService from './signals.service'
import type { AuthRequest } from '../../types'
import { MembershipLevel } from '@prisma/client'

// ─── POST /signals/webhook ─────────────────────────────────────────
// Protegido por API-Key (no JWT), llamado desde el VPS MT5

export async function webhookSignal(req: Request, res: Response, next: NextFunction) {
  try {
    const input = webhookSignalSchema.parse(req.body)
    const signal = await signalsService.processWebhookSignal(input)
    res.status(201).json({ message: 'Señal procesada', data: signal })
  } catch (err) {
    next(err)
  }
}

// ─── GET /signals ──────────────────────────────────────────────────

export async function listSignals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const filters = listSignalsSchema.parse(req.query)
    const userLevel = req.user!.membershipLevel
    const result = await signalsService.listSignals(userLevel, filters)
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// ─── GET /signals/history ──────────────────────────────────────────

export async function signalHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page  = parseInt(req.query['page'] as string ?? '1', 10)
    const limit = parseInt(req.query['limit'] as string ?? '20', 10)
    const userLevel = req.user!.membershipLevel
    const result = await signalsService.getSignalHistory(userLevel, page, limit)
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// ─── GET /signals/:id ──────────────────────────────────────────────

export async function getSignal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string }
    const userLevel = req.user!.membershipLevel
    const signal = await signalsService.getSignalById(id, userLevel)
    res.status(200).json({ data: signal })
  } catch (err) {
    next(err)
  }
}

// ─── PATCH /signals/:id/close (solo MASTER) ───────────────────────

export async function closeSignal(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string }
    const input = closeSignalSchema.parse(req.body)
    const signal = await signalsService.closeSignal(id, input)
    res.status(200).json({ message: 'Señal cerrada', data: signal })
  } catch (err) {
    next(err)
  }
}
