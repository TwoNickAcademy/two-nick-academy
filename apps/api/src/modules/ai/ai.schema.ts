import { z } from 'zod'
import { MembershipLevel } from '@prisma/client'

// ─── Cuotas de IA por plan ────────────────────────────────────────
export const AI_QUOTA_BY_LEVEL: Record<MembershipLevel, number> = {
  GENERAL: 15,
  VIP:     30,
  SUPREMO: -1,   // -1 = ilimitado
  MASTER:  -1,
}

// ─── Validación del body de chat ─────────────────────────────────
// El mensaje puede ser solo texto o texto + imagen (multipart)

export const chatMessageSchema = z.object({
  message:   z.string().min(1, 'Mensaje vacío').max(2000, 'Mensaje demasiado largo'),
  sessionId: z.string().uuid('Session ID inválido').optional(),
})

// ─── Agregar chunk de conocimiento (admin) ────────────────────────
export const addKnowledgeSchema = z.object({
  title:    z.string().min(3).max(200),
  content:  z.string().min(10),
  category: z.enum(['SMC', 'ICT', 'RISK_MANAGEMENT', 'PSYCHOLOGY', 'METHODOLOGY', 'PATTERNS']),
  tags:     z.array(z.string()).default([]),
})

export type ChatMessageInput  = z.infer<typeof chatMessageSchema>
export type AddKnowledgeInput = z.infer<typeof addKnowledgeSchema>
