import { Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { AuthRequest, JwtAccessPayload } from '../types'
import { MembershipLevel, UserRole } from '@prisma/client'

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
      displayName:     '',
      membershipLevel: payload.level,
      role:            payload.role ?? 'USER',
    }
    next()
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' })
  }
}

// ─── Middleware: RBAC — requerir nivel mínimo de membresía ─────

const LEVEL_RANK: Record<MembershipLevel, number> = {
  GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
}

export function requireLevel(minLevel: MembershipLevel) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' })
      return
    }
    const userRank = LEVEL_RANK[req.user.membershipLevel]
    const required = LEVEL_RANK[minLevel]

    if ((userRank ?? 0) < (required ?? 0)) {
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

// ─── Middleware: RBAC — requerir rol administrativo ────────────

const ROLE_RANK: Record<UserRole, number> = {
  USER:    0,
  TEACHER: 1,
  ADMIN:   2,
  CREATOR: 3,
}

export function requireRole(minRole: UserRole) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'No autenticado' })
      return
    }
    const userRank = ROLE_RANK[req.user.role] ?? 0
    const required = ROLE_RANK[minRole] ?? 0

    if (userRank < required) {
      res.status(403).json({
        message: `Acceso restringido — se requiere rol ${minRole}`,
        requiredRole: minRole,
        currentRole:  req.user.role,
      })
      return
    }
    next()
  }
}
