import { prisma } from '../../lib/prisma'
import { generateSignalWhy } from '../../lib/openai'
import { emitSignal } from '../../lib/socket'
import { redis } from '../../lib/redis'
import type { WebhookSignalInput, ListSignalsInput, CloseSignalInput } from './signals.schema'
import { MembershipLevel, SignalStatus, type Signal } from '@prisma/client'

// ─── Clave de Redis para la lista de señales activas ──────────────
const ACTIVE_SIGNALS_KEY = 'signals:active'
const ACTIVE_SIGNALS_TTL = 30  // segundos

// ─── Formato de salida público ────────────────────────────────────

function formatSignal(signal: Signal) {
  return {
    id:          signal.id,
    asset:       signal.asset,
    direction:   signal.direction,
    market:      signal.market,
    entryPrice:  Number(signal.entryPrice),
    stopLoss:    Number(signal.stopLoss),
    takeProfits: signal.takeProfits.map(Number),
    whyText:     signal.whyText,
    status:      signal.status,
    minLevel:    signal.minLevel,
    sentAt:      signal.sentAt,
    closedAt:    signal.closedAt,
    pipsResult:  signal.pipsResult ? Number(signal.pipsResult) : null,
  }
}

// ─── WEBHOOK: Recibir señal del VPS MT5 ──────────────────────────

export async function processWebhookSignal(input: WebhookSignalInput) {
  // 1. Guardar señal en DB (sin "why" aún)
  const signal = await prisma.signal.create({
    data: {
      asset:       input.symbol,
      direction:   input.action,
      market:      input.market,
      entryPrice:  input.entry,
      stopLoss:    input.sl,
      takeProfits: input.tp,
      minLevel:    input.minLevel,
      sourceVps:   input.sourceVps,
      status:      'ACTIVE',
    },
  })

  const formatted = formatSignal(signal)

  // 2. Emitir señal INMEDIATAMENTE vía Socket.io (sin esperar IA)
  emitSignal(signal.minLevel, 'signal:new', formatted)

  // 3. Invalidar cache de activas
  await redis.del(ACTIVE_SIGNALS_KEY)

  // 4. Generar "why" en background (no bloquea la respuesta HTTP)
  generateWhyAsync(signal.id, {
    asset:       signal.asset,
    direction:   signal.direction as 'BUY' | 'SELL',
    market:      signal.market,
    entryPrice:  Number(signal.entryPrice),
    stopLoss:    Number(signal.stopLoss),
    takeProfits: signal.takeProfits.map(Number),
  })

  return formatted
}

// ─── Generación de "why" en background ────────────────────────────

async function generateWhyAsync(
  signalId: string,
  params: {
    asset: string
    direction: 'BUY' | 'SELL'
    market: string
    entryPrice: number
    stopLoss: number
    takeProfits: number[]
  }
) {
  try {
    const whyText = await generateSignalWhy(params)

    // Actualizar en DB
    const updated = await prisma.signal.update({
      where: { id: signalId },
      data:  { whyText },
    })

    // Emitir actualización con el "why" ya generado
    emitSignal(updated.minLevel, 'signal:update', {
      id:      signalId,
      whyText,
    })

    // Invalidar cache
    await redis.del(ACTIVE_SIGNALS_KEY)
  } catch (err) {
    console.error(`[Signals] Error generando why para señal ${signalId}:`, err)
  }
}

// ─── GET /signals — Lista paginada filtrada por nivel ─────────────

export async function listSignals(
  userLevel: MembershipLevel,
  filters: ListSignalsInput,
) {
  // Intentar servir desde cache solo si no hay filtros activos
  const isDefaultQuery = !filters.status && !filters.market && !filters.asset && filters.page === 1

  if (isDefaultQuery) {
    const cached = await redis.get(ACTIVE_SIGNALS_KEY)
    if (cached) {
      const all = JSON.parse(cached) as ReturnType<typeof formatSignal>[]
      return { signals: filterByLevel(all, userLevel), fromCache: true }
    }
  }

  // Mapa de rango por nivel
  const levelRank: Record<MembershipLevel, number> = {
    GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
  }

  // Niveles cuyas señales puede ver este usuario
  const visibleLevels = (Object.keys(levelRank) as MembershipLevel[]).filter(
    (l) => (levelRank[l] ?? 0) <= (levelRank[userLevel] ?? 0)
  )

  const where = {
    minLevel:  { in: visibleLevels },
    ...(filters.status ? { status: filters.status as SignalStatus } : { status: 'ACTIVE' as SignalStatus }),
    ...(filters.market ? { market: filters.market as any } : {}),
    ...(filters.asset  ? { asset: { contains: filters.asset, mode: 'insensitive' as const } } : {}),
  }

  const [signals, total] = await Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip:    (filters.page - 1) * filters.limit,
      take:    filters.limit,
    }),
    prisma.signal.count({ where }),
  ])

  const formatted = signals.map(formatSignal)

  // Guardar en cache si es la query por defecto
  if (isDefaultQuery) {
    await redis.setEx(ACTIVE_SIGNALS_KEY, ACTIVE_SIGNALS_TTL, JSON.stringify(formatted))
  }

  return {
    signals:  formatted,
    total,
    page:     filters.page,
    lastPage: Math.ceil(total / filters.limit),
  }
}

// ─── GET /signals/:id ─────────────────────────────────────────────

export async function getSignalById(id: string, userLevel: MembershipLevel) {
  const signal = await prisma.signal.findUnique({ where: { id } })

  if (!signal) {
    throw Object.assign(new Error('Señal no encontrada'), { statusCode: 404 })
  }

  // Verificar que el usuario tiene nivel suficiente
  const levelRank: Record<MembershipLevel, number> = {
    GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
  }
  if ((levelRank[userLevel] ?? 0) < (levelRank[signal.minLevel] ?? 0)) {
    throw Object.assign(
      new Error(`Esta señal requiere membresía ${signal.minLevel}`),
      { statusCode: 403 },
    )
  }

  return formatSignal(signal)
}

// ─── GET /signals/history ─────────────────────────────────────────

export async function getSignalHistory(
  userLevel: MembershipLevel,
  page = 1,
  limit = 20,
) {
  const levelRank: Record<MembershipLevel, number> = {
    GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
  }
  const visibleLevels = (Object.keys(levelRank) as MembershipLevel[]).filter(
    (l) => (levelRank[l] ?? 0) <= (levelRank[userLevel] ?? 0)
  )

  const where = {
    minLevel: { in: visibleLevels },
    status:   { in: ['WIN', 'LOSS', 'CLOSED', 'CANCELLED'] as SignalStatus[] },
  }

  const [signals, total] = await Promise.all([
    prisma.signal.findMany({
      where,
      orderBy: { closedAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.signal.count({ where }),
  ])

  // Stats agregadas de win rate
  const [wins, losses] = await Promise.all([
    prisma.signal.count({ where: { ...where, status: 'WIN' } }),
    prisma.signal.count({ where: { ...where, status: 'LOSS' } }),
  ])
  const total_closed = wins + losses
  const winRate = total_closed > 0 ? ((wins / total_closed) * 100).toFixed(1) : null

  return {
    signals:  signals.map(formatSignal),
    total,
    page,
    lastPage: Math.ceil(total / limit),
    stats:    { wins, losses, winRate },
  }
}

// ─── PATCH /signals/:id/close (solo MASTER/admin) ─────────────────

export async function closeSignal(id: string, input: CloseSignalInput) {
  const signal = await prisma.signal.findUnique({ where: { id } })
  if (!signal) {
    throw Object.assign(new Error('Señal no encontrada'), { statusCode: 404 })
  }
  if (['WIN', 'LOSS', 'CANCELLED', 'CLOSED'].includes(signal.status)) {
    throw Object.assign(new Error('La señal ya está cerrada'), { statusCode: 409 })
  }

  const updated = await prisma.signal.update({
    where: { id },
    data:  {
      status:     input.status,
      closePrice: input.closePrice,
      pipsResult: input.pipsResult,
      closedAt:   new Date(),
    },
  })

  const formatted = formatSignal(updated)

  // Notificar a todos los niveles que pueden ver la señal
  emitSignal(updated.minLevel, 'signal:closed', formatted)
  await redis.del(ACTIVE_SIGNALS_KEY)

  return formatted
}

// ─── Helper interno ───────────────────────────────────────────────

function filterByLevel(
  signals: ReturnType<typeof formatSignal>[],
  userLevel: MembershipLevel,
) {
  const levelRank: Record<MembershipLevel, number> = {
    GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
  }
  return signals.filter(
    (s) => (levelRank[s.minLevel as MembershipLevel] ?? 0) <= (levelRank[userLevel] ?? 0)
  )
}
