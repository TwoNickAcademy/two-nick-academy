import { Response, NextFunction } from 'express'
import { updateProfileSchema, listUsersSchema } from './users.schema'
import * as usersService from './users.service'
import type { AuthRequest } from '../../types'

// ═══════════════════════════════════════════════════════════════════
// PERFIL PROPIO
// ═══════════════════════════════════════════════════════════════════

// ─── GET /users/me ────────────────────────────────────────────────

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const profile = await usersService.getProfile(req.user!.id)
    res.status(200).json({ data: profile })
  } catch (err) { next(err) }
}

// ─── PATCH /users/me ──────────────────────────────────────────────

export async function updateMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input   = updateProfileSchema.parse(req.body)
    const updated = await usersService.updateProfile(req.user!.id, input)
    res.status(200).json({ message: 'Perfil actualizado', data: updated })
  } catch (err) { next(err) }
}

// ─── GET /users/me/referrals ──────────────────────────────────────

export async function getMyReferrals(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dashboard = await usersService.getReferralDashboard(req.user!.id)
    res.status(200).json({ data: dashboard })
  } catch (err) { next(err) }
}

// ─── GET /users/me/progress ───────────────────────────────────────

export async function getMyProgress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const progress = await usersService.getCourseProgress(req.user!.id)
    res.status(200).json({ data: progress })
  } catch (err) { next(err) }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════

// ─── GET /admin/users ─────────────────────────────────────────────

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const query  = listUsersSchema.parse(req.query)
    const result = await usersService.listUsers(query)
    res.status(200).json(result)
  } catch (err) { next(err) }
}

// ─── GET /admin/users/:userId ─────────────────────────────────────

export async function getUserDetail(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getUserDetail(req.params['userId'] as string)
    res.status(200).json({ data: user })
  } catch (err) { next(err) }
}
