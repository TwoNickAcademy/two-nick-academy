import { z } from 'zod'

const EVENT_TYPES = ['WEBINAR', 'LIVE_SESSION', 'WORKSHOP', 'MENTORSHIP', 'QA_SESSION'] as const
const LEVELS      = ['GENERAL', 'VIP', 'SUPREMO', 'MASTER'] as const

// ─── Admin: crear evento ──────────────────────────────────────────

export const createEventSchema = z.object({
  title:        z.string().min(3).max(200).trim(),
  description:  z.string().max(2000).optional(),
  type:         z.enum(EVENT_TYPES).default('WEBINAR'),
  host:         z.string().min(2).max(100).trim(),
  thumbnailUrl: z.string().url('URL de miniatura inválida').optional(),
  streamUrl:    z.string().url('URL de stream inválida').optional(),
  startsAt:     z.string().datetime('Fecha inválida'),
  endsAt:       z.string().datetime('Fecha inválida').optional(),
  minLevel:     z.enum(LEVELS).default('GENERAL'),
  maxAttendees: z.number().int().min(1).optional(),
})

// ─── Admin: actualizar evento ─────────────────────────────────────

export const updateEventSchema = createEventSchema.partial().extend({
  isPublished: z.boolean().optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
