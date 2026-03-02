import { Response, NextFunction } from 'express'
import * as adminService from './admin.service'
import type { AuthRequest } from '../../types'

// ─── GET /admin/stats/overview ────────────────────────────────────

export async function overview(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getOverview()
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ─── GET /admin/stats/revenue ─────────────────────────────────────

export async function revenueStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getRevenueStats()
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ─── GET /admin/stats/signals ─────────────────────────────────────

export async function signalsStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getSignalsStats()
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ─── GET /admin/stats/users ───────────────────────────────────────

export async function usersStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getUsersStats()
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ─── GET /admin/stats/ai ──────────────────────────────────────────

export async function aiStats(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await adminService.getAiStats()
    res.status(200).json({ data })
  } catch (err) { next(err) }
}
