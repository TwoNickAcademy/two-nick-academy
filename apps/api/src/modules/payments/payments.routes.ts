import { Router, type IRouter } from 'express'
import { authenticate, requireLevel } from '../../middleware/authenticate'
import {
  createOrder,
  binanceWebhook,
  paymentHistory,
  manualPayment,
} from './payments.controller'

const router: IRouter = Router()

// POST /payments/create-order — Usuario solicita URL de pago
router.post('/create-order', authenticate, createOrder)

// POST /payments/webhook — Binance Pay callback (sin JWT, firma HMAC)
router.post('/webhook', binanceWebhook)

// GET /payments/history — Historial del usuario autenticado
router.get('/history', authenticate, paymentHistory)

// POST /payments/manual — Admin registra pago manual (solo MASTER)
router.post('/manual', authenticate, requireLevel('MASTER'), manualPayment)

export default router
