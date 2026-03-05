import { Router, type IRouter } from 'express'
import { authenticate, requireRole } from '../../middleware/authenticate'
import {
  overview,
  revenueStats,
  signalsStats,
  usersStats,
  aiStats,
  listUsers,
  setUserRole,
} from './admin.controller'

const router: IRouter = Router()

// Todos los endpoints de admin requieren rol ADMIN o superior
router.use(authenticate, requireRole('ADMIN'))

// GET /admin/stats/overview  — KPIs del dashboard principal
router.get('/stats/overview', overview)

// GET /admin/stats/revenue   — Revenue mensual + por plan + comisiones
router.get('/stats/revenue',  revenueStats)

// GET /admin/stats/signals   — Win rate + distribución + pips
router.get('/stats/signals',  signalsStats)

// GET /admin/stats/users     — Crecimiento + distribución por nivel
router.get('/stats/users',    usersStats)

// GET /admin/stats/ai        — Uso del mentor IA
router.get('/stats/ai',       aiStats)

// GET  /admin/users          — Listar usuarios (ADMIN+)
router.get('/users',          listUsers)

// PATCH /admin/users/:id/role — Cambiar rol de usuario (solo CREATOR)
router.patch('/users/:id/role', requireRole('CREATOR'), setUserRole)

export default router
