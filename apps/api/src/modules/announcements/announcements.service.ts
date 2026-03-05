import { prisma } from '../../lib/prisma'
import { MembershipLevel, AnnouncementType } from '@prisma/client'

const LEVEL_RANK: Record<MembershipLevel, number> = {
  GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
}

// ─── Listar avisos activos para el nivel del usuario ─────────────

export async function listAnnouncements(userLevel: MembershipLevel, limit = 20) {
  const userRank = LEVEL_RANK[userLevel] ?? 0
  const now = new Date()

  const all = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      createdBy: { select: { displayName: true, avatarUrl: true } },
    },
  })

  // Filtrar por nivel accesible
  return all.filter(a => (LEVEL_RANK[a.minLevel] ?? 0) <= userRank)
}

// ─── Admin: listar todos ──────────────────────────────────────────

export async function listAllAnnouncements() {
  return prisma.announcement.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    include: {
      createdBy: { select: { displayName: true } },
    },
  })
}

// ─── Admin: crear aviso ───────────────────────────────────────────

export async function createAnnouncement(createdById: string, data: {
  title: string
  content: string
  type?: AnnouncementType
  minLevel?: MembershipLevel
  isPinned?: boolean
  expiresAt?: string
}) {
  return prisma.announcement.create({
    data: {
      title:       data.title,
      content:     data.content,
      type:        data.type ?? 'INFO',
      minLevel:    data.minLevel ?? 'GENERAL',
      isPinned:    data.isPinned ?? false,
      expiresAt:   data.expiresAt ? new Date(data.expiresAt) : null,
      createdById,
    },
  })
}

// ─── Admin: actualizar aviso ──────────────────────────────────────

export async function updateAnnouncement(id: string, data: Partial<{
  title: string
  content: string
  type: AnnouncementType
  minLevel: MembershipLevel
  isPinned: boolean
  isActive: boolean
  expiresAt: string | null
}>) {
  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) throw Object.assign(new Error('Aviso no encontrado'), { statusCode: 404 })

  return prisma.announcement.update({
    where: { id },
    data: {
      ...data,
      expiresAt: data.expiresAt !== undefined
        ? (data.expiresAt ? new Date(data.expiresAt) : null)
        : undefined,
    },
  })
}

// ─── Admin: eliminar aviso ────────────────────────────────────────

export async function deleteAnnouncement(id: string) {
  const existing = await prisma.announcement.findUnique({ where: { id } })
  if (!existing) throw Object.assign(new Error('Aviso no encontrado'), { statusCode: 404 })

  await prisma.announcement.delete({ where: { id } })
  return { deleted: true, id }
}
