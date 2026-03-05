import { prisma } from '../../lib/prisma'
import { MembershipLevel } from '@prisma/client'

const LEVEL_RANK: Record<MembershipLevel, number> = {
  GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
}

// ─── Verificar acceso a una sala ─────────────────────────────────

export function canAccessRoom(userLevel: MembershipLevel, roomLevel: MembershipLevel): boolean {
  return (LEVEL_RANK[userLevel] ?? 0) >= (LEVEL_RANK[roomLevel] ?? 0)
}

// ─── Guardar mensaje en DB ────────────────────────────────────────

export async function saveMessage(
  userId:    string,
  roomLevel: MembershipLevel,
  content:   string,
) {
  const msg = await prisma.chatMessage.create({
    data: { userId, roomLevel, content },
    include: {
      user: {
        select: { id: true, displayName: true, avatarUrl: true, membership: { select: { level: true } } },
      },
    },
  })

  return {
    id:          msg.id,
    userId:      msg.userId,
    displayName: msg.user.displayName,
    avatarUrl:   msg.user.avatarUrl,
    level:       msg.user.membership?.level ?? 'GENERAL',
    roomLevel:   msg.roomLevel,
    content:     msg.content,
    createdAt:   msg.createdAt,
  }
}

// ─── Historial paginado (cursor-based, más recientes primero) ─────

export async function getMessages(
  roomLevel: MembershipLevel,
  userLevel: MembershipLevel,
  limit      = 50,
  before?:   string,   // cursor: id del último mensaje recibido
) {
  if (!canAccessRoom(userLevel, roomLevel)) {
    throw Object.assign(
      new Error(`Esta sala requiere membresía ${roomLevel}`),
      { statusCode: 403 },
    )
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      roomLevel,
      isDeleted: false,
      ...(before ? { createdAt: { lt: (await prisma.chatMessage.findUnique({ where: { id: before } }))?.createdAt } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    include: {
      user: {
        select: { id: true, displayName: true, avatarUrl: true, membership: { select: { level: true } } },
      },
    },
  })

  return messages.map((msg) => ({
    id:          msg.id,
    userId:      msg.userId,
    displayName: msg.user.displayName,
    avatarUrl:   msg.user.avatarUrl,
    level:       msg.user.membership?.level ?? 'GENERAL',
    roomLevel:   msg.roomLevel,
    content:     msg.content,
    createdAt:   msg.createdAt,
  })).reverse()  // devolver cronológicamente (más antiguo primero)
}

// ─── Admin: limpiar sala completa (soft delete masivo) ───────────

export async function clearRoom(roomLevel: MembershipLevel) {
  const result = await prisma.chatMessage.updateMany({
    where: { roomLevel, isDeleted: false },
    data:  { isDeleted: true, content: '[Sala limpiada por un administrador]' },
  })
  return { cleared: result.count, roomLevel }
}

// ─── Cron: eliminar mensajes con más de 24h (hard delete) ────────

export async function purgeOldMessages() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const result = await prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  if (result.count > 0) {
    console.log(`[Chat] Purge automático: ${result.count} mensajes eliminados`)
  }
  return result.count
}

// ─── Admin: eliminar mensaje (soft delete) ────────────────────────

export async function deleteMessage(messageId: string) {
  const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } })
  if (!msg) throw Object.assign(new Error('Mensaje no encontrado'), { statusCode: 404 })

  await prisma.chatMessage.update({
    where: { id: messageId },
    data:  { isDeleted: true, content: '[Mensaje eliminado por un moderador]' },
  })

  return { deleted: true, messageId }
}
