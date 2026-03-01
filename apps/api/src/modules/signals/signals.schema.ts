import { z } from 'zod'

// ─── Payload que llega desde el VPS / EA de MT5 ─────────────────

export const webhookSignalSchema = z.object({
  // Identificador único del EA (evitar duplicados)
  magic:      z.number().int().optional(),
  symbol:     z.string().min(3).max(20).toUpperCase(),
  action:     z.enum(['BUY', 'SELL']),
  market:     z.enum(['FOREX', 'CRYPTO', 'INDICES', 'COMMODITIES']).default('FOREX'),
  entry:      z.number().positive(),
  sl:         z.number().positive(),
  // Acepta uno o varios TPs
  tp:         z.union([
    z.number().positive(),
    z.array(z.number().positive()).min(1).max(4),
  ]).transform((val) => (Array.isArray(val) ? val : [val])),
  // Nivel mínimo para ver la señal
  minLevel:   z.enum(['GENERAL', 'VIP', 'SUPREMO', 'MASTER']).default('GENERAL'),
  // Identificador del VPS que envía
  sourceVps:  z.string().max(50).optional(),
})

// ─── Filtros para GET /signals ────────────────────────────────────

export const listSignalsSchema = z.object({
  status:  z.enum(['ACTIVE', 'CLOSED', 'WIN', 'LOSS', 'CANCELLED']).optional(),
  market:  z.enum(['FOREX', 'CRYPTO', 'INDICES', 'COMMODITIES']).optional(),
  asset:   z.string().max(20).optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(50).default(20),
})

// ─── Cerrar señal (admin) ─────────────────────────────────────────

export const closeSignalSchema = z.object({
  status:     z.enum(['WIN', 'LOSS', 'CANCELLED']),
  closePrice: z.number().positive().optional(),
  pipsResult: z.number().optional(),
})

export type WebhookSignalInput = z.infer<typeof webhookSignalSchema>
export type ListSignalsInput   = z.infer<typeof listSignalsSchema>
export type CloseSignalInput   = z.infer<typeof closeSignalSchema>
