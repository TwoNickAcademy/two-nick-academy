import { Request, Response, NextFunction } from 'express'
import { createOrderSchema, manualPaymentSchema } from './payments.schema'
import * as paymentsService from './payments.service'
import type { AuthRequest } from '../../types'

// ─── POST /payments/create-order ──────────────────────────────────
// Usuario autenticado solicita una URL de pago Binance

export async function createOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = createOrderSchema.parse(req.body)
    const result = await paymentsService.createPaymentOrder(req.user!.id, input)
    res.status(201).json({ message: 'Orden creada', data: result })
  } catch (err) {
    next(err)
  }
}

// ─── POST /payments/webhook ────────────────────────────────────────
// Binance Pay llama a este endpoint tras confirmar el pago
// IMPORTANTE: usar rawBody (antes de JSON.parse) para verificar la firma

export async function binanceWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const timestamp = req.headers['binancepay-timestamp'] as string
    const nonce     = req.headers['binancepay-nonce'] as string
    const signature = req.headers['binancepay-signature'] as string

    if (!timestamp || !nonce || !signature) {
      res.status(400).json({ message: 'Headers de Binance ausentes' })
      return
    }

    // rawBody se adjunta en index.ts con el middleware de captura de body crudo
    const rawBody = (req as Request & { rawBody?: string }).rawBody
    if (!rawBody) {
      res.status(400).json({ message: 'Body crudo no disponible' })
      return
    }

    const result = await paymentsService.processWebhook(rawBody, {
      timestamp,
      nonce,
      signature,
    })

    // Binance requiere esta respuesta exacta para confirmar recepción
    res.status(200).json({ returnCode: 'SUCCESS', returnMessage: null })

    // Log silencioso del resultado (no bloquea la respuesta)
    console.log('[Payments] Webhook procesado:', result)
  } catch (err) {
    next(err)
  }
}

// ─── GET /payments/history ─────────────────────────────────────────

export async function paymentHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const page  = parseInt(req.query['page'] as string ?? '1', 10)
    const limit = parseInt(req.query['limit'] as string ?? '10', 10)
    const result = await paymentsService.getPaymentHistory(req.user!.id, page, limit)
    res.status(200).json({ data: result })
  } catch (err) {
    next(err)
  }
}

// ─── POST /payments/manual (solo MASTER/admin) ─────────────────────

export async function manualPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const input = manualPaymentSchema.parse(req.body)
    const result = await paymentsService.registerManualPayment(input)
    res.status(201).json({ message: 'Pago manual registrado', data: result })
  } catch (err) {
    next(err)
  }
}
