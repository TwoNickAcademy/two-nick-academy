import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

interface AppError extends Error {
  statusCode?: number
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Errores de validación Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Datos inválidos',
      errors: err.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  const statusCode = err.statusCode ?? 500
  const message    = statusCode < 500 ? err.message : 'Error interno del servidor'

  if (statusCode >= 500) {
    console.error('[Error]', err)
  }

  res.status(statusCode).json({ message })
}
