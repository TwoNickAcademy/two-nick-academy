import { z } from 'zod'

// ─── Actualizar perfil propio ─────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().min(2, 'Mínimo 2 caracteres').max(100).trim().optional(),
  avatarUrl:   z.string().url('URL de avatar inválida').optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

// ─── Filtros para admin: listar usuarios ──────────────────────────

export const listUsersSchema = z.object({
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),  // buscar por email o displayName
  level:  z.enum(['GENERAL', 'VIP', 'SUPREMO', 'MASTER']).optional(),
})

export type ListUsersQuery = z.infer<typeof listUsersSchema>
