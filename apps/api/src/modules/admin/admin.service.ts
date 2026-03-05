import { prisma } from '../../lib/prisma'
import { PaymentStatus, SignalStatus, UserRole } from '@prisma/client'

// ─── Helpers de fecha ─────────────────────────────────────────────

function startOf(unit: 'month' | 'day', offset = 0): Date {
  const d = new Date()
  if (unit === 'month') {
    d.setMonth(d.getMonth() + offset, 1)
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(d.getDate() + offset)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

// ═══════════════════════════════════════════════════════════════════
// OVERVIEW — KPIs del dashboard principal
// ═══════════════════════════════════════════════════════════════════

export async function getOverview() {
  const now           = new Date()
  const thisMonthStart = startOf('month')
  const lastMonthStart = startOf('month', -1)

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    activeMembers,
    revenueAll,
    revenueThisMonth,
    revenueLastMonth,
    activeSignals,
    signalsThisMonth,
    aiInteractionsThisMonth,
  ] = await Promise.all([
    // Usuarios
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.user.count({
      where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
    }),

    // Miembros activos (membresía no expirada, nivel > GENERAL)
    prisma.membership.count({
      where: {
        expiryDate: { gt: now },
        level:      { not: 'GENERAL' },
      },
    }),

    // Revenue
    prisma.payment.aggregate({
      where: { status: PaymentStatus.CONFIRMED },
      _sum:  { amountUsd: true },
    }),
    prisma.payment.aggregate({
      where: { status: PaymentStatus.CONFIRMED, createdAt: { gte: thisMonthStart } },
      _sum:  { amountUsd: true },
    }),
    prisma.payment.aggregate({
      where: {
        status:    PaymentStatus.CONFIRMED,
        createdAt: { gte: lastMonthStart, lt: thisMonthStart },
      },
      _sum: { amountUsd: true },
    }),

    // Señales
    prisma.signal.count({ where: { status: SignalStatus.ACTIVE } }),
    prisma.signal.count({ where: { sentAt: { gte: thisMonthStart } } }),

    // IA
    prisma.aiInteraction.count({
      where: { createdAt: { gte: thisMonthStart }, role: 'USER' },
    }),
  ])

  const revenueTotal   = Number(revenueAll._sum.amountUsd ?? 0)
  const revThisMonth   = Number(revenueThisMonth._sum.amountUsd ?? 0)
  const revLastMonth   = Number(revenueLastMonth._sum.amountUsd ?? 0)

  // Variación porcentual mes a mes
  const revGrowth = revLastMonth > 0
    ? Number((((revThisMonth - revLastMonth) / revLastMonth) * 100).toFixed(1))
    : null

  const userGrowth = newUsersLastMonth > 0
    ? Number((((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100).toFixed(1))
    : null

  return {
    users: {
      total:         totalUsers,
      activeMembers,
      newThisMonth:  newUsersThisMonth,
      newLastMonth:  newUsersLastMonth,
      growthPct:     userGrowth,
    },
    revenue: {
      total:        Number(revenueTotal.toFixed(2)),
      thisMonth:    Number(revThisMonth.toFixed(2)),
      lastMonth:    Number(revLastMonth.toFixed(2)),
      growthPct:    revGrowth,
    },
    signals: {
      active:       activeSignals,
      thisMonth:    signalsThisMonth,
    },
    ai: {
      queriesThisMonth: aiInteractionsThisMonth,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// REVENUE STATS — Últimos 12 meses + desglose por plan
// ═══════════════════════════════════════════════════════════════════

type RevenueRow = { month: Date; total: number; count: bigint }

export async function getRevenueStats() {
  // Revenue mensual — usamos $queryRaw para date_trunc de PostgreSQL
  const byMonth = await prisma.$queryRaw<RevenueRow[]>`
    SELECT date_trunc('month', created_at)  AS month,
           SUM(amount_usd)::float            AS total,
           COUNT(*)                          AS count
    FROM   payments
    WHERE  status      = 'CONFIRMED'
      AND  created_at >= NOW() - INTERVAL '12 months'
    GROUP  BY 1
    ORDER  BY 1 ASC
  `

  // Revenue por plan (todos los tiempos)
  const byPlan = await prisma.payment.groupBy({
    by:     ['planPurchased'],
    where:  { status: PaymentStatus.CONFIRMED },
    _sum:   { amountUsd: true },
    _count: { id: true },
  })

  // Comisiones de referidos pagadas
  const commissions = await prisma.referral.aggregate({
    where: { commissionUsd: { gt: 0 } },
    _sum:  { commissionUsd: true },
    _count: { id: true },
  })

  return {
    byMonth: byMonth.map((r) => ({
      month:   r.month,
      total:   Number(r.total ?? 0),
      count:   Number(r.count),
    })),
    byPlan: byPlan.map((r) => ({
      plan:  r.planPurchased,
      total: Number(r._sum.amountUsd ?? 0),
      count: r._count.id,
    })),
    commissions: {
      total: Number(commissions._sum.commissionUsd ?? 0),
      count: commissions._count.id,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// SIGNALS STATS — Win rate + distribución + rendimiento
// ═══════════════════════════════════════════════════════════════════

export async function getSignalsStats() {
  const [byStatus, byMarket, byDirection, pipsStats, recent] = await Promise.all([
    // Distribución por estado
    prisma.signal.groupBy({
      by:     ['status'],
      _count: { id: true },
    }),

    // Por mercado
    prisma.signal.groupBy({
      by:     ['market'],
      _count: { id: true },
    }),

    // Por dirección
    prisma.signal.groupBy({
      by:     ['direction'],
      _count: { id: true },
    }),

    // Pips promedio en señales cerradas con resultado
    prisma.signal.aggregate({
      where: {
        status:     { in: [SignalStatus.WIN, SignalStatus.LOSS] },
        pipsResult: { not: null },
      },
      _avg: { pipsResult: true },
      _sum: { pipsResult: true },
    }),

    // Últimas 10 señales cerradas con resultado
    prisma.signal.findMany({
      where:   { status: { in: [SignalStatus.WIN, SignalStatus.LOSS, SignalStatus.CLOSED] } },
      orderBy: { closedAt: 'desc' },
      take:    10,
      select: {
        id:         true,
        asset:      true,
        direction:  true,
        market:     true,
        status:     true,
        pipsResult: true,
        sentAt:     true,
        closedAt:   true,
      },
    }),
  ])

  const statusMap = Object.fromEntries(
    byStatus.map((s) => [s.status, s._count.id]),
  )
  const wins   = statusMap[SignalStatus.WIN]  ?? 0
  const losses = statusMap[SignalStatus.LOSS] ?? 0
  const winRate = wins + losses > 0
    ? Number(((wins / (wins + losses)) * 100).toFixed(1))
    : null

  return {
    totals: {
      active:    statusMap[SignalStatus.ACTIVE]    ?? 0,
      closed:    statusMap[SignalStatus.CLOSED]    ?? 0,
      win:       wins,
      loss:      losses,
      cancelled: statusMap[SignalStatus.CANCELLED] ?? 0,
      winRate,
    },
    byMarket: byMarket.map((m) => ({ market: m.market, count: m._count.id })),
    byDirection: byDirection.map((d) => ({ direction: d.direction, count: d._count.id })),
    pips: {
      avgResult: Number(pipsStats._avg.pipsResult ?? 0).toFixed(1),
      sumResult: Number(pipsStats._sum.pipsResult ?? 0).toFixed(1),
    },
    recentClosed: recent.map((s) => ({
      ...s,
      pipsResult: s.pipsResult ? Number(s.pipsResult) : null,
    })),
  }
}

// ═══════════════════════════════════════════════════════════════════
// USERS STATS — Crecimiento y distribución por nivel
// ═══════════════════════════════════════════════════════════════════

type GrowthRow = { day: Date; count: bigint }

export async function getUsersStats() {
  const [levelDist, growthRaw, retentionData] = await Promise.all([
    // Distribución de membresías activas por nivel
    prisma.membership.groupBy({
      by:    ['level'],
      where: { expiryDate: { gt: new Date() } },
      _count: { id: true },
    }),

    // Nuevos usuarios por día (últimos 30 días)
    prisma.$queryRaw<GrowthRow[]>`
      SELECT date_trunc('day', created_at) AS day,
             COUNT(*)                       AS count
      FROM   users
      WHERE  created_at >= NOW() - INTERVAL '30 days'
      GROUP  BY 1
      ORDER  BY 1 ASC
    `,

    // Usuarios por estado (activos vs inactivos)
    prisma.user.groupBy({
      by:     ['isActive'],
      _count: { id: true },
    }),
  ])

  // Totales por nivel (incluyendo GENERAL = sin membresía activa)
  const levelMap = Object.fromEntries(
    levelDist.map((l) => [l.level, l._count.id]),
  )

  return {
    levelDistribution: {
      GENERAL:  levelMap['GENERAL']  ?? 0,
      VIP:      levelMap['VIP']      ?? 0,
      SUPREMO:  levelMap['SUPREMO']  ?? 0,
      MASTER:   levelMap['MASTER']   ?? 0,
    },
    growth: growthRaw.map((r) => ({
      day:   r.day,
      count: Number(r.count),
    })),
    activity: {
      active:   retentionData.find((r) => r.isActive)  ?._count.id ?? 0,
      inactive: retentionData.find((r) => !r.isActive) ?._count.id ?? 0,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════
// AI STATS — Uso del mentor IA por nivel y en el tiempo
// ═══════════════════════════════════════════════════════════════════

type AiRow = { day: Date; count: bigint; tokens: bigint }

export async function getAiStats() {
  const thisMonthStart = startOf('month')

  const [dailyRaw, totalTokens, byModel] = await Promise.all([
    // Interacciones por día (últimos 30 días) — solo mensajes del usuario
    prisma.$queryRaw<AiRow[]>`
      SELECT date_trunc('day', created_at)  AS day,
             COUNT(*)                        AS count,
             COALESCE(SUM(tokens_used), 0)   AS tokens
      FROM   ai_interactions
      WHERE  created_at >= NOW() - INTERVAL '30 days'
        AND  role = 'USER'
      GROUP  BY 1
      ORDER  BY 1 ASC
    `,

    // Tokens totales históricos
    prisma.aiInteraction.aggregate({
      _sum: { tokensUsed: true },
      _count: { id: true },
    }),

    // Distribución por modelo
    prisma.aiInteraction.groupBy({
      by:     ['modelUsed'],
      _count: { id: true },
      _sum:   { tokensUsed: true },
    }),
  ])

  // Interacciones este mes vs mes anterior
  const [queriesThisMonth, queriesLastMonth] = await Promise.all([
    prisma.aiInteraction.count({
      where: { createdAt: { gte: thisMonthStart }, role: 'USER' },
    }),
    prisma.aiInteraction.count({
      where: {
        createdAt: { gte: startOf('month', -1), lt: thisMonthStart },
        role:      'USER',
      },
    }),
  ])

  return {
    totals: {
      interactions: totalTokens._count.id,
      tokens:       totalTokens._sum.tokensUsed ?? 0,
      queriesThisMonth,
      queriesLastMonth,
    },
    daily: dailyRaw.map((r) => ({
      day:    r.day,
      count:  Number(r.count),
      tokens: Number(r.tokens),
    })),
    byModel: byModel.map((m) => ({
      model:  m.modelUsed,
      count:  m._count.id,
      tokens: m._sum.tokensUsed ?? 0,
    })),
  }
}

// ─── Listar usuarios ──────────────────────────────────────────────

export async function getUsers(page: number, limit: number) {
  const skip = (page - 1) * limit
  const [total, users] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, displayName: true,
        role: true, isActive: true, createdAt: true,
        membership: { select: { level: true, expiryDate: true } },
      },
    }),
  ])
  return { total, page, limit, users }
}

// ─── Cambiar rol de usuario ───────────────────────────────────────

export async function updateUserRole(userId: string, role: UserRole) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })

  const updated = await prisma.user.update({
    where: { id: userId },
    data:  { role },
    select: { id: true, email: true, displayName: true, role: true },
  })
  return updated
}
