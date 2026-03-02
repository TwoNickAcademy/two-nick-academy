import { prisma } from '../../lib/prisma'
import { encrypt, decrypt } from '../../lib/crypto'
import { MembershipLevel, Mt5AccountStatus } from '@prisma/client'
import type { RegisterMt5Input, UpdateMt5StatusInput, UpdateRiskInput } from './mt5.schema'

// ─── Niveles que pueden usar Auto-Trade ───────────────────────────
const ALLOWED_LEVELS: MembershipLevel[] = ['VIP', 'SUPREMO', 'MASTER']

function assertAllowed(level: MembershipLevel) {
  if (!ALLOWED_LEVELS.includes(level)) {
    throw Object.assign(
      new Error('El Trading Automatizado requiere membresía VIP o superior'),
      { statusCode: 403 },
    )
  }
}

// ─── Límite de cuentas por nivel ──────────────────────────────────
const ACCOUNT_LIMIT: Record<MembershipLevel, number> = {
  GENERAL: 0,
  VIP:     1,
  SUPREMO: 3,
  MASTER:  10,
}

// ─── Registrar nueva cuenta MT5 ───────────────────────────────────

export async function registerAccount(
  userId:    string,
  userLevel: MembershipLevel,
  input:     RegisterMt5Input,
) {
  assertAllowed(userLevel)

  // Verificar límite de cuentas activas
  const activeCount = await prisma.mt5Account.count({
    where: { userId, status: { not: 'REVOKED' } },
  })

  const limit = ACCOUNT_LIMIT[userLevel]
  if (activeCount >= limit) {
    throw Object.assign(
      new Error(`Tu plan ${userLevel} permite máximo ${limit} cuenta(s) MT5`),
      { statusCode: 409 },
    )
  }

  // Cifrar credenciales sensibles antes de guardar
  const accountNumberEnc = encrypt(input.accountNumber)
  const passwordEnc      = encrypt(input.password)

  const account = await prisma.mt5Account.create({
    data: {
      userId,
      brokerName:    input.brokerName,
      accountNumber: accountNumberEnc,
      passwordEnc,
      serverName:    input.serverName,
      riskPct:       input.riskPct,
      minLevelReq:   'VIP',
      status:        'ACTIVE',
    },
  })

  // Retornar sin datos sensibles
  return formatAccount(account)
}

// ─── Listar cuentas del usuario (sin credenciales) ────────────────

export async function listAccounts(userId: string, userLevel: MembershipLevel) {
  assertAllowed(userLevel)

  const accounts = await prisma.mt5Account.findMany({
    where:   { userId, status: { not: 'REVOKED' } },
    orderBy: { createdAt: 'desc' },
  })

  return accounts.map(formatAccount)
}

// ─── Obtener una cuenta ───────────────────────────────────────────

export async function getAccount(userId: string, accountId: string) {
  const account = await prisma.mt5Account.findFirst({
    where: { id: accountId, userId },
  })

  if (!account) {
    throw Object.assign(new Error('Cuenta no encontrada'), { statusCode: 404 })
  }

  return formatAccount(account)
}

// ─── Cambiar estado (ACTIVE / PAUSED) ────────────────────────────

export async function updateStatus(
  userId:    string,
  accountId: string,
  input:     UpdateMt5StatusInput,
) {
  const account = await prisma.mt5Account.findFirst({
    where: { id: accountId, userId },
  })

  if (!account) {
    throw Object.assign(new Error('Cuenta no encontrada'), { statusCode: 404 })
  }
  if (account.status === 'REVOKED') {
    throw Object.assign(new Error('No puedes reactivar una cuenta revocada'), { statusCode: 409 })
  }

  const updated = await prisma.mt5Account.update({
    where: { id: accountId },
    data:  { status: input.status as Mt5AccountStatus },
  })

  return formatAccount(updated)
}

// ─── Actualizar porcentaje de riesgo ─────────────────────────────

export async function updateRisk(
  userId:    string,
  accountId: string,
  input:     UpdateRiskInput,
) {
  const account = await prisma.mt5Account.findFirst({
    where: { id: accountId, userId },
  })

  if (!account) {
    throw Object.assign(new Error('Cuenta no encontrada'), { statusCode: 404 })
  }
  if (account.status === 'REVOKED') {
    throw Object.assign(new Error('Cuenta revocada'), { statusCode: 409 })
  }

  const updated = await prisma.mt5Account.update({
    where: { id: accountId },
    data:  { riskPct: input.riskPct },
  })

  return formatAccount(updated)
}

// ─── Revocar cuenta (no se puede deshacer) ────────────────────────

export async function revokeAccount(userId: string, accountId: string) {
  const account = await prisma.mt5Account.findFirst({
    where: { id: accountId, userId },
  })

  if (!account) {
    throw Object.assign(new Error('Cuenta no encontrada'), { statusCode: 404 })
  }
  if (account.status === 'REVOKED') {
    throw Object.assign(new Error('La cuenta ya está revocada'), { statusCode: 409 })
  }

  await prisma.mt5Account.update({
    where: { id: accountId },
    data:  { status: 'REVOKED' },
  })

  return { message: 'Cuenta revocada. El equipo ya no tiene acceso a tus credenciales.' }
}

// ─── VPS / Admin: obtener credenciales descifradas ────────────────
// Solo accesible con API Key del VPS (no JWT de usuario)
// Usado por el equipo de Two-Nick para conectar el EA

export async function getDecryptedCredentials(accountId: string) {
  const account = await prisma.mt5Account.findUnique({
    where: { id: accountId },
  })

  if (!account) {
    throw Object.assign(new Error('Cuenta no encontrada'), { statusCode: 404 })
  }
  if (account.status !== 'ACTIVE') {
    throw Object.assign(
      new Error(`Cuenta ${account.status.toLowerCase()}, no disponible para conexión`),
      { statusCode: 409 },
    )
  }

  // Descifrar en memoria — nunca loguear estos valores
  const accountNumber = decrypt(account.accountNumber)
  const password      = decrypt(account.passwordEnc)

  return {
    id:            account.id,
    brokerName:    account.brokerName,
    accountNumber,          // texto plano — solo para el VPS
    password,               // texto plano — solo para el VPS
    serverName:    account.serverName,
    riskPct:       Number(account.riskPct),
    userId:        account.userId,
  }
}

// ─── Admin: listar todas las cuentas activas ──────────────────────

export async function listAllActiveAccounts() {
  const accounts = await prisma.mt5Account.findMany({
    where:   { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { email: true, displayName: true, membership: { select: { level: true } } },
      },
    },
  })

  // Retornar sin credenciales — el admin usa el endpoint de descifrado separado
  return accounts.map((a) => ({
    ...formatAccount(a),
    user: {
      email:       a.user.email,
      displayName: a.user.displayName,
      level:       a.user.membership?.level,
    },
  }))
}

// ─── Helper: formato público sin credenciales ─────────────────────

function formatAccount(account: {
  id:          string
  brokerName:  string
  serverName:  string
  status:      Mt5AccountStatus
  riskPct:     { toString(): string }
  minLevelReq: MembershipLevel
  createdAt:   Date
  updatedAt:   Date
}) {
  return {
    id:          account.id,
    brokerName:  account.brokerName,
    serverName:  account.serverName,
    status:      account.status,
    riskPct:     Number(account.riskPct),
    minLevelReq: account.minLevelReq,
    createdAt:   account.createdAt,
    updatedAt:   account.updatedAt,
    // accountNumber y password NUNCA se incluyen aquí
  }
}
