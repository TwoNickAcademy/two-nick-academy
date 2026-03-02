import { Router, type IRouter } from 'express'
import { authenticate, requireLevel } from '../../middleware/authenticate'
import { requireApiKey } from '../../middleware/apiKey'
import {
  registerAccount,
  listAccounts,
  getAccount,
  updateStatus,
  updateRisk,
  revokeAccount,
  getCredentials,
  listAllAccounts,
} from './mt5.controller'

const router: IRouter = Router()

// ─── Rutas de usuario (VIP+) ──────────────────────────────────────

// POST /mt5/accounts — Registrar cuenta MT5 cifrada
router.post(
  '/accounts',
  authenticate,
  requireLevel('VIP'),
  registerAccount,
)

// GET /mt5/accounts — Listar mis cuentas (sin credenciales)
router.get(
  '/accounts',
  authenticate,
  requireLevel('VIP'),
  listAccounts,
)

// GET /mt5/accounts/:id — Ver detalle de una cuenta
router.get(
  '/accounts/:id',
  authenticate,
  requireLevel('VIP'),
  getAccount,
)

// PATCH /mt5/accounts/:id/status — Pausar / Reactivar
router.patch(
  '/accounts/:id/status',
  authenticate,
  requireLevel('VIP'),
  updateStatus,
)

// PATCH /mt5/accounts/:id/risk — Cambiar % de riesgo
router.patch(
  '/accounts/:id/risk',
  authenticate,
  requireLevel('VIP'),
  updateRisk,
)

// DELETE /mt5/accounts/:id — Revocar cuenta (permanente)
router.delete(
  '/accounts/:id',
  authenticate,
  requireLevel('VIP'),
  revokeAccount,
)

// ─── Ruta VPS (API Key) — Solo para el EA de Two-Nick ─────────────
// Descifra y entrega credenciales al VPS para conectar MT5
// NUNCA exponer este endpoint públicamente

router.get(
  '/accounts/:id/credentials',
  requireApiKey,
  getCredentials,
)

// ─── Ruta Admin (MASTER) ──────────────────────────────────────────

router.get(
  '/admin/accounts',
  authenticate,
  requireLevel('MASTER'),
  listAllAccounts,
)

export default router
