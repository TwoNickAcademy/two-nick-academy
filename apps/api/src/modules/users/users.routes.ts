import { Router, type IRouter } from 'express'
import { authenticate, requireLevel } from '../../middleware/authenticate'
import {
  // Perfil propio
  getMe,
  updateMe,
  getMyReferrals,
  getMyProgress,
  // Admin
  listUsers,
  getUserDetail,
} from './users.controller'

const router: IRouter = Router()

// ═══════════════════════════════════════════════════════════════════
// RUTAS DE USUARIO (cualquier nivel autenticado)
// ═══════════════════════════════════════════════════════════════════

// GET /users/me — Perfil completo + membresía activa
router.get('/me', authenticate, getMe)

// PATCH /users/me — Actualizar nombre / avatar
router.patch('/me', authenticate, updateMe)

// GET /users/me/referrals — Dashboard de comisiones
router.get('/me/referrals', authenticate, getMyReferrals)

// GET /users/me/progress — Progreso global de cursos
router.get('/me/progress', authenticate, getMyProgress)

// ═══════════════════════════════════════════════════════════════════
// RUTAS ADMIN (MASTER únicamente)
// ═══════════════════════════════════════════════════════════════════

// GET /users/admin/list — Listar todos los usuarios con paginación
router.get(
  '/admin/list',
  authenticate,
  requireLevel('MASTER'),
  listUsers,
)

// GET /users/admin/:userId — Detalle de un usuario
router.get(
  '/admin/:userId',
  authenticate,
  requireLevel('MASTER'),
  getUserDetail,
)

export default router
