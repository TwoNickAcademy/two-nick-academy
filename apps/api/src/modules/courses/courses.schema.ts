import { z } from 'zod'

// ─── Admin: crear curso ───────────────────────────────────────────

export const createCourseSchema = z.object({
  title:        z.string().min(3, 'Mínimo 3 caracteres').max(200).trim(),
  description:  z.string().max(2000).optional(),
  thumbnailUrl: z.string().url('URL de miniatura inválida').optional(),
  minLevel:     z.enum(['GENERAL', 'VIP', 'SUPREMO', 'MASTER']).default('GENERAL'),
  orderIndex:   z.number().int().min(0).default(0),
})

// ─── Admin: actualizar curso ──────────────────────────────────────

export const updateCourseSchema = createCourseSchema.partial().extend({
  isPublished: z.boolean().optional(),
})

// ─── Admin: crear lección ─────────────────────────────────────────

export const createLessonSchema = z.object({
  title:      z.string().min(3).max(200).trim(),
  videoUrl:   z.string().uuid('GUID de video de Bunny.net inválido').optional(),
  // Duración en segundos
  duration:   z.number().int().min(1).optional(),
  orderIndex: z.number().int().min(0).default(0),
})

// ─── Admin: actualizar lección ────────────────────────────────────

export const updateLessonSchema = createLessonSchema.partial().extend({
  isPublished: z.boolean().optional(),
})

// ─── Filtros para listar cursos ───────────────────────────────────

export const listCoursesSchema = z.object({
  includeAll: z
    .string()
    .optional()
    .transform((v) => v === 'true'),  // admin: incluir no publicados
})

export type CreateCourseInput  = z.infer<typeof createCourseSchema>
export type UpdateCourseInput  = z.infer<typeof updateCourseSchema>
export type CreateLessonInput  = z.infer<typeof createLessonSchema>
export type UpdateLessonInput  = z.infer<typeof updateLessonSchema>
