import { MembershipLevel } from '@prisma/client'
import { Request } from 'express'

// Usuario autenticado adjunto al Request por el middleware
export interface AuthenticatedUser {
  id: string
  email: string
  displayName: string
  membershipLevel: MembershipLevel
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser
}

// Payload del JWT
export interface JwtAccessPayload {
  sub: string              // user.id
  email: string
  level: MembershipLevel
  iat?: number
  exp?: number
}

export interface JwtRefreshPayload {
  sub: string              // user.id
  tokenId: string          // RefreshToken.id en DB
  iat?: number
  exp?: number
}
