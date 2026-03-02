import { Request, Response, NextFunction } from 'express'
import {
  registerMt5Schema,
  updateMt5StatusSchema,
  updateRiskSchema,
} from './mt5.schema'
import * as mt5Service from './mt5.service'
import type { AuthRequest } from '../../types'

// ─── POST /mt5/accounts ───────────────────────────────────────────

export async function registerAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input   = registerMt5Schema.parse(req.body)
    const account = await mt5Service.registerAccount(req.user!.id, req.user!.membershipLevel, input)
    res.status(201).json({ message: 'Cuenta MT5 registrada', data: account })
  } catch (err) { next(err) }
}

// ─── GET /mt5/accounts ────────────────────────────────────────────

export async function listAccounts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const accounts = await mt5Service.listAccounts(req.user!.id, req.user!.membershipLevel)
    res.status(200).json({ data: accounts })
  } catch (err) { next(err) }
}

// ─── GET /mt5/accounts/:id ────────────────────────────────────────

export async function getAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const account = await mt5Service.getAccount(req.user!.id, req.params['id'] as string)
    res.status(200).json({ data: account })
  } catch (err) { next(err) }
}

// ─── PATCH /mt5/accounts/:id/status ──────────────────────────────

export async function updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input   = updateMt5StatusSchema.parse(req.body)
    const account = await mt5Service.updateStatus(req.user!.id, req.params['id'] as string, input)
    res.status(200).json({ message: `Cuenta ${input.status === 'PAUSED' ? 'pausada' : 'activada'}`, data: account })
  } catch (err) { next(err) }
}

// ─── PATCH /mt5/accounts/:id/risk ────────────────────────────────

export async function updateRisk(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input   = updateRiskSchema.parse(req.body)
    const account = await mt5Service.updateRisk(req.user!.id, req.params['id'] as string, input)
    res.status(200).json({ message: 'Riesgo actualizado', data: account })
  } catch (err) { next(err) }
}

// ─── DELETE /mt5/accounts/:id ────────────────────────────────────

export async function revokeAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await mt5Service.revokeAccount(req.user!.id, req.params['id'] as string)
    res.status(200).json(result)
  } catch (err) { next(err) }
}

// ─── GET /mt5/accounts/:id/credentials (VPS — API Key) ───────────
// Endpoint exclusivo para el VPS/EA del equipo Two-Nick
// Devuelve credenciales descifradas — HTTPS obligatorio en producción

export async function getCredentials(req: Request, res: Response, next: NextFunction) {
  try {
    const credentials = await mt5Service.getDecryptedCredentials(req.params['id'] as string)
    res.status(200).json({ data: credentials })
  } catch (err) { next(err) }
}

// ─── GET /mt5/admin/accounts (MASTER) ────────────────────────────

export async function listAllAccounts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const accounts = await mt5Service.listAllActiveAccounts()
    res.status(200).json({ data: accounts })
  } catch (err) { next(err) }
}
