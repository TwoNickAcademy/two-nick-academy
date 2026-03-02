import { Router, type IRouter } from 'express'
import { authenticate, requireLevel } from '../../middleware/authenticate'
import {
  overview,
  revenueStats,
  signalsStats,
  usersStats,
  aiStats,
} from './admin.controller'

const router: IRouter = Router()

// Todos los endpoints de stats son exclusivos de MASTER
router.use(authenticate, requireLevel('MASTER'))

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

export default router
