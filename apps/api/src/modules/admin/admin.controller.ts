import { Response, NextFunction } from 'express'
import * as adminService from './admin.service'
import type { AuthRequest } from '../../types'
import { UserRole } from '@prisma/client'

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

// ─── GET /admin/users ─────────────────────────────────────────────

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page  = Math.max(1, Number(req.query['page']  ?? 1))
    const limit = Math.min(50, Number(req.query['limit'] ?? 20))
    const data  = await adminService.getUsers(page, limit)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// ─── PATCH /admin/users/:id/role ─────────────────────────────────
// Solo CREATOR puede cambiar roles

export async function setUserRole(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { id }   = req.params as { id: string }
    const { role } = req.body as { role: UserRole }

    const VALID_ROLES: UserRole[] = ['USER', 'ADMIN', 'CREATOR']
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Rol inválido. Valores: USER, ADMIN, CREATOR' })
    }

    // CREATOR no puede degradarse a sí mismo
    if (id === req.user!.id && role !== 'CREATOR') {
      return res.status(400).json({ message: 'No puedes cambiar tu propio rol' })
    }

    const data = await adminService.updateUserRole(id, role)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

