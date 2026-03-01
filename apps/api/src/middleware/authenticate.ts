import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { AuthRequest, JwtAccessPayload } from '../types'
import { MembershipLevel } from '@prisma/client'

// ─── Middleware: Verificar JWT ─────────────────────────────────

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Token de acceso requerido' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtAccessPayload
    req.user = {
      id:              payload.sub,
      email:           payload.email,
      displayName:     '',       // no necesario en el token
      membershipLevel: payload.level,
    }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

// ─── Middleware: RBAC — requerir nivel mínimo ──────────────────

const LEVEL_RANK: Record<MembershipLevel, number> = {
  GENERAL: 0,
  VIP:     1,
  SUPREMO: 2,
  MASTER:  3,
}

export function requireLevel(minLevel: MembershipLevel) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' })
      return
    }
    const userRank = LEVEL_RANK[req.user.membershipLevel]
    const required = LEVEL_RANK[minLevel]

    if ((userRank ?? 0) >= (required ?? 0)) {
      res.status(403).json({
        message: `Esta función requiere membresía ${minLevel} o superior`,
        requiredLevel: minLevel,
        currentLevel:  req.user.membershipLevel,
      })
      return
    }
    next()
  }
}
