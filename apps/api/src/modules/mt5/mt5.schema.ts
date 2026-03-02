import { z } from 'zod'

// ─── Registrar cuenta MT5 ─────────────────────────────────────────

export const registerMt5Schema = z.object({
  brokerName:    z.string().min(2).max(100).trim(),
  accountNumber: z
    .string()
    .min(4, 'Número de cuenta demasiado corto')
    .max(20, 'Número de cuenta demasiado largo')
    .regex(/^\d+$/, 'El número de cuenta solo debe contener dígitos'),
  password: z
    .string()
    .min(4, 'Contraseña MT5 demasiado corta')
    .max(100),
  serverName: z
    .string()
    .min(2, 'Servidor inválido')
    .max(100)
    .trim(),
  riskPct: z
    .number()
    .min(0.1, 'Riesgo mínimo: 0.1%')
    .max(5.0, 'Riesgo máximo: 5%')
    .default(1.0),
})

// ─── Actualizar estado ────────────────────────────────────────────

export const updateMt5StatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED'], {
    errorMap: () => ({ message: 'Estado inválido. Usa ACTIVE o PAUSED' }),
  }),
})

// ─── Actualizar riesgo ────────────────────────────────────────────

export const updateRiskSchema = z.object({
  riskPct: z.number().min(0.1).max(5.0),
})

export type RegisterMt5Input    = z.infer<typeof registerMt5Schema>
export type UpdateMt5StatusInput = z.infer<typeof updateMt5StatusSchema>
export type UpdateRiskInput     = z.infer<typeof updateRiskSchema>
