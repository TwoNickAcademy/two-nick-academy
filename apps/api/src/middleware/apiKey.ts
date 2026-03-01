import { Request, Response, NextFunction } from 'express'

// Middleware para endpoints protegidos por API Key estática
// Usado en el webhook del VPS MT5 (no requiere JWT de usuario)

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key']

  if (!key || key !== process.env.VPS_API_KEY) {
    res.status(401).json({ message: 'API Key inválida o ausente' })
    return
  }
  next()
}
