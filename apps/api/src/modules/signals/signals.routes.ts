import { Router, type IRouter } from 'express'
import { authenticate, requireLevel } from '../../middleware/authenticate'
import { requireApiKey } from '../../middleware/apiKey'
import {
  webhookSignal,
  listSignals,
  signalHistory,
  getSignal,
  closeSignal,
} from './signals.controller'

const router: IRouter = Router()

// POST /signals/webhook — VPS MT5 (API Key, sin JWT)
router.post('/webhook', requireApiKey, webhookSignal)

// GET /signals — Lista de activas (cualquier usuario autenticado)
router.get('/', authenticate, listSignals)

// GET /signals/history — Historial con stats
router.get('/history', authenticate, signalHistory)

// GET /signals/:id — Detalle de señal
router.get('/:id', authenticate, getSignal)

// PATCH /signals/:id/close — Solo MASTER puede cerrar señales
router.patch('/:id/close', authenticate, requireLevel('MASTER'), closeSignal)

export default router
