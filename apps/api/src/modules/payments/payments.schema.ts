import { z } from 'zod'

// ─── Crear orden de pago ──────────────────────────────────────────

export const createOrderSchema = z.object({
  plan: z.enum(['VIP', 'SUPREMO', 'MASTER'], {
    errorMap: () => ({ message: 'Plan inválido. Opciones: VIP, SUPREMO, MASTER' }),
  }),
  returnUrl: z.string().url('URL de retorno inválida').optional(),
  cancelUrl: z.string().url('URL de cancelación inválida').optional(),
})

// ─── Pago manual (registrado por admin) ──────────────────────────

export const manualPaymentSchema = z.object({
  userId:      z.string().uuid(),
  plan:        z.enum(['VIP', 'SUPREMO', 'MASTER']),
  amountUsd:   z.number().positive(),
  durationDays: z.number().int().positive().default(30),
  notes:       z.string().max(255).optional(),
})

// ─── Webhook Binance Pay ──────────────────────────────────────────
// El cuerpo viene tal como Binance lo envía (validamos la firma primero,
// luego parseamos con este schema)

export const binanceWebhookSchema = z.object({
  bizType:   z.string(),           // 'PAY'
  bizId:     z.string(),           // ID único de Binance (proveedor)
  bizStatus: z.string(),           // 'PAY_SUCCESS' | 'PAY_CLOSED'
  data:      z.string(),           // JSON string con detalles del pago
})

// Datos dentro del campo `data` (parseado aparte)
export const binanceWebhookDataSchema = z.object({
  merchantTradeNo: z.string(),     // Nuestro ID de orden
  totalFee:        z.string(),     // Monto en USDT
  currency:        z.string(),
  merchantUserId:  z.string(),     // user.id que pusimos al crear la orden
  transactionId:   z.string(),     // ID de transacción Binance
})

export type CreateOrderInput   = z.infer<typeof createOrderSchema>
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>
