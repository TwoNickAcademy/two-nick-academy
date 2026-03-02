import { prisma } from '../../lib/prisma'
import { Prisma, PaymentStatus } from '@prisma/client'
import type { UpdateProfileInput, ListUsersQuery } from './users.schema'

// ═══════════════════════════════════════════════════════════════════
// PERFIL DE USUARIO
// ═══════════════════════════════════════════════════════════════════

// ─── GET /users/me ────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:           true,
      email:        true,
      displayName:  true,
      avatarUrl:    true,
      referralCode: true,
      createdAt:    true,
      // membership es 1-a-1 en el schema
      membership: {
        select: {
          level:       true,
          expiryDate:  true,
          startedAt:   true,
        },
      },
    },
  })

  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })

  const mem      = user.membership
  const daysLeft = mem?.expiryDate
    ? Math.ceil((mem.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0
  const isActive = mem?.expiryDate ? mem.expiryDate.getTime() > Date.now() : false

  const referralsCount = await prisma.referral.count({
    where: { referrerId: userId },
  })
  const paidReferrals = await prisma.referral.count({
    where: { referrerId: userId, commissionUsd: { gt: 0 } },
  })

  return {
    id:           user.id,
    email:        user.email,
    displayName:  user.displayName,
    avatarUrl:    user.avatarUrl,
    referralCode: user.referralCode,
    createdAt:    user.createdAt,
    membership: mem
      ? {
          level:      mem.level,
          expiryDate: mem.expiryDate,
          startedAt:  mem.startedAt,
          daysLeft:   isActive ? daysLeft : 0,
          isActive,
        }
      : null,
    stats: {
      totalReferrals: referralsCount,
      paidReferrals,
    },
  }
}

// ─── PATCH /users/me ──────────────────────────────────────────────

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where:  { id: userId },
    data:   input,
    select: {
      id:          true,
      email:       true,
      displayName: true,
      avatarUrl:   true,
    },
  })
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD DE REFERIDOS
// ═══════════════════════════════════════════════════════════════════

// ─── GET /users/me/referrals ──────────────────────────────────────

export async function getReferralDashboard(userId: string) {
  const referrals = await prisma.referral.findMany({
    where:   { referrerId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      referred: {
        select: {
          displayName: true,
          email:       true,
          createdAt:   true,
          membership: {
            select: { level: true, expiryDate: true },
          },
        },
      },
    },
  })

  const totalCommission = referrals.reduce(
    (sum, r) => sum + Number(r.commissionUsd ?? 0),
    0,
  )

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { referralCode: true },
  })

  const referralList = referrals.map((r) => {
    const memActive =
      r.referred.membership?.expiryDate &&
      r.referred.membership.expiryDate.getTime() > Date.now()
    return {
      id:            r.id,
      referredName:  r.referred.displayName ?? 'Sin nombre',
      referredEmail: r.referred.email,
      referredAt:    r.referred.createdAt,
      commissionUsd: Number(r.commissionUsd ?? 0),
      status:        r.status,
      currentLevel:  memActive ? r.referred.membership!.level : 'GENERAL',
      hasPaid:       Number(r.commissionUsd ?? 0) > 0,
    }
  })

  return {
    referralCode:    user?.referralCode ?? '',
    totalReferrals:  referrals.length,
    paidReferrals:   referrals.filter((r) => Number(r.commissionUsd ?? 0) > 0).length,
    totalCommission: Number(totalCommission.toFixed(2)),
    referrals:       referralList,
  }
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESO GLOBAL DE CURSOS
// ═══════════════════════════════════════════════════════════════════

// ─── GET /users/me/progress ───────────────────────────────────────

export async function getCourseProgress(userId: string) {
  const courses = await prisma.course.findMany({
    where:   { isPublished: true },
    orderBy: { orderIndex: 'asc' },
    include: {
      lessons: {
        where:  { isPublished: true },
        select: { id: true },
      },
    },
  })

  if (courses.length === 0) return { courses: [], overallPct: 0, totalLessons: 0, completedLessons: 0 }

  const allLessonIds = courses.flatMap((c) => c.lessons.map((l) => l.id))
  const completedSet = new Set(
    (
      await prisma.userProgress.findMany({
        where:  { userId, lessonId: { in: allLessonIds } },
        select: { lessonId: true },
      })
    ).map((p) => p.lessonId),
  )

  let totalGlobal     = 0
  let completedGlobal = 0

  const courseSummary = courses.map((course) => {
    const total     = course.lessons.length
    const completed = course.lessons.filter((l) => completedSet.has(l.id)).length
    totalGlobal     += total
    completedGlobal += completed
    return {
      courseId:    course.id,
      title:       course.title,
      total,
      completed,
      progressPct: total > 0 ? Math.round((completed / total) * 100) : 0,
      isCompleted: total > 0 && completed === total,
    }
  })

  return {
    overallPct:       totalGlobal > 0 ? Math.round((completedGlobal / totalGlobal) * 100) : 0,
    totalLessons:     totalGlobal,
    completedLessons: completedGlobal,
    courses:          courseSummary,
  }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN — GESTIÓN DE USUARIOS
// ═══════════════════════════════════════════════════════════════════

// ─── GET /users/admin/list ────────────────────────────────────────

export async function listUsers(query: ListUsersQuery) {
  const { page, limit, search, level } = query
  const skip = (page - 1) * limit

  const where: Prisma.UserWhereInput = {}

  if (search) {
    where.OR = [
      { email:       { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ]
  }

  // Membership es 1-a-1: filtramos por nivel y que no haya expirado
  if (level) {
    where.membership = { level, expiryDate: { gt: new Date() } }
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id:           true,
        email:        true,
        displayName:  true,
        avatarUrl:    true,
        referralCode: true,
        createdAt:    true,
        membership: {
          select: { level: true, expiryDate: true },
        },
        _count: {
          select: { referralsGiven: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users.map((u) => {
      const memActive =
        u.membership?.expiryDate &&
        u.membership.expiryDate.getTime() > Date.now()
      return {
        id:           u.id,
        email:        u.email,
        displayName:  u.displayName,
        avatarUrl:    u.avatarUrl,
        referralCode: u.referralCode,
        createdAt:    u.createdAt,
        membership:   memActive ? u.membership : null,
        referralsCount: u._count.referralsGiven,
      }
    }),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}

// ─── GET /users/admin/:userId ─────────────────────────────────────

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      id:           true,
      email:        true,
      displayName:  true,
      avatarUrl:    true,
      referralCode: true,
      isActive:     true,
      isVerified:   true,
      lastSeen:     true,
      createdAt:    true,
      membership: {
        select: {
          level:      true,
          expiryDate: true,
          startedAt:  true,
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take:    10,
        select: {
          id:            true,
          planPurchased: true,
          amountUsd:     true,
          status:        true,
          createdAt:     true,
        },
      },
      _count: {
        select: {
          referralsGiven:  true,
          aiInteractions:  true,
          courseProgress:  true,
          mt5Accounts:     true,
        },
      },
    },
  })

  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })

  const mem      = user.membership
  const isActive = mem?.expiryDate ? mem.expiryDate.getTime() > Date.now() : false

  const totalPaid = user.payments
    .filter((p) => p.status === PaymentStatus.CONFIRMED)
    .reduce((sum, p) => sum + Number(p.amountUsd), 0)

  return {
    id:           user.id,
    email:        user.email,
    displayName:  user.displayName,
    avatarUrl:    user.avatarUrl,
    referralCode: user.referralCode,
    isActive:     user.isActive,
    isVerified:   user.isVerified,
    lastSeen:     user.lastSeen,
    createdAt:    user.createdAt,
    membership:   mem ? { ...mem, isActive } : null,
    recentPayments: user.payments.map((p) => ({
      ...p,
      amountUsd: Number(p.amountUsd),
    })),
    stats: {
      totalPaid:        Number(totalPaid.toFixed(2)),
      referrals:        user._count.referralsGiven,
      aiInteractions:   user._count.aiInteractions,
      lessonsCompleted: user._count.courseProgress,
      mt5Accounts:      user._count.mt5Accounts,
    },
  }
}
