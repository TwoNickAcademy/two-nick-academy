import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
// 1. IMPORTANTE: Añade Prisma aquí para que reconozca los tipos de la DB
import { Prisma } from '@prisma/client' 
import { invalidateMembershipCache } from '../../lib/redis'
import type { RegisterInput, LoginInput } from './auth.schema'
import type { JwtAccessPayload, JwtRefreshPayload } from '../../types'

// ─── Constantes ────────────────────────────────────────────────
const ACCESS_TOKEN_TTL  = '15m'
const REFRESH_TOKEN_TTL = '7d'
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const BCRYPT_ROUNDS = 12

// ─── Helpers internos ──────────────────────────────────────────
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function generateAccessToken(payload: Omit<JwtAccessPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: ACCESS_TOKEN_TTL,
  })
}

function generateRefreshToken(payload: Omit<JwtRefreshPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_TTL,
  })
}

// ─── Register ──────────────────────────────────────────────────
export async function registerUser(
  input: RegisterInput,
  userAgent?: string,
  ipAddress?: string,
) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  if (existing) {
    throw Object.assign(new Error('El email ya está registrado'), { statusCode: 409 })
  }

  let referredById: string | undefined
  if (input.referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: input.referralCode },
      select: { id: true },
    })
    if (!referrer) {
      throw Object.assign(new Error('Código de referido inválido'), { statusCode: 400 })
    }
    referredById = referrer.id
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  const newReferralCode = nanoid(8).toUpperCase()

  // 2. CORRECCIÓN: Usamos Prisma.TransactionClient para el tipado de 'tx'
  const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash,
        referralCode: newReferralCode,
        referredById,
        membership: {
          create: {
            level: 'GENERAL',
          },
        },
      },
      include: {
        membership: true,
      },
    })
    return created
  })

  const tokens = await createTokenPair(user.id, user.email, 'GENERAL', userAgent, ipAddress)

  return {
    user: {
      id:           user.id,
      email:        user.email,
      displayName:  user.displayName,
      referralCode: user.referralCode,
      membershipLevel: user.membership!.level,
    },
    ...tokens,
  }
}

// ─── Login ─────────────────────────────────────────────────────
export async function loginUser(
  input: LoginInput,
  userAgent?: string,
  ipAddress?: string,
) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { membership: true },
  })

  if (!user || !user.isActive) {
    throw Object.assign(
      new Error('Credenciales inválidas'),
      { statusCode: 401 },
    )
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash)
  if (!valid) {
    throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 })
  }

  const level = user.membership?.level ?? 'GENERAL'
  if (
    user.membership?.expiryDate &&
    user.membership.expiryDate < new Date() &&
    level !== 'GENERAL'
  ) {
    await prisma.membership.update({
      where: { userId: user.id },
      data: { level: 'GENERAL', expiryDate: null },
    })
    await invalidateMembershipCache(user.id)
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeen: new Date() },
  })

  const tokens = await createTokenPair(user.id, user.email, level, userAgent, ipAddress)

  return {
    user: {
      id:               user.id,
      email:           user.email,
      displayName:     user.displayName,
      avatarUrl:       user.avatarUrl,
      referralCode:    user.referralCode,
      membershipLevel: level,
    },
    ...tokens,
  }
}

// ─── Refresh Token ─────────────────────────────────────────────
export async function refreshAccessToken(
  rawRefreshToken: string,
  userAgent?: string,
  ipAddress?: string,
) {
  let payload: JwtRefreshPayload
  try {
    payload = jwt.verify(rawRefreshToken, process.env.JWT_REFRESH_SECRET!) as JwtRefreshPayload
  } catch {
    throw Object.assign(new Error('Refresh token inválido o expirado'), { statusCode: 401 })
  }

  const tokenHash = hashToken(rawRefreshToken)
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { membership: true } } },
  })

  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token inválido'), { statusCode: 401 })
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { isRevoked: true },
  })

  const level = stored.user.membership?.level ?? 'GENERAL'
  const tokens = await createTokenPair(
    stored.user.id,
    stored.user.email,
    level,
    userAgent,
    ipAddress,
  )

  return tokens
}

// ─── Logout ────────────────────────────────────────────────────
export async function logoutUser(rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken)
  await prisma.refreshToken.updateMany({
    where: { tokenHash },
    data: { isRevoked: true },
  })
}

// ─── Helper: crear par de tokens ───────────────────────────────
async function createTokenPair(
  userId: string,
  email: string,
  level: string,
  userAgent?: string,
  ipAddress?: string,
) {
  const dbToken = await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: 'PLACEHOLDER',
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      userAgent,
      ipAddress,
    },
  })

  const accessToken  = generateAccessToken({ sub: userId, email, level: level as any })
  const refreshToken = generateRefreshToken({ sub: userId, tokenId: dbToken.id })

  await prisma.refreshToken.update({
    where: { id: dbToken.id },
    data: { tokenHash: hashToken(refreshToken) },
  })

  return { accessToken, refreshToken }
}