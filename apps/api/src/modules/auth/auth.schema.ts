import { z } from 'zod'

export const registerSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .toLowerCase(),
  displayName: z
    .string()
    .min(2, 'Nombre mínimo 2 caracteres')
    .max(50, 'Nombre máximo 50 caracteres')
    .trim(),
  password: z
    .string()
    .min(8, 'Contraseña mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  referralCode: z
    .string()
    .length(8, 'Código de referido inválido')
    .optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase(),
  password: z.string().min(1, 'Contraseña requerida'),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput    = z.infer<typeof loginSchema>
export type RefreshInput  = z.infer<typeof refreshSchema>
