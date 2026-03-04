import { prisma } from '../../lib/prisma'
import { MembershipLevel } from '@prisma/client'
import type { CreateEventInput, UpdateEventInput } from './events.schema'

// ─── Rango numérico por nivel ─────────────────────────────────────
const LEVEL_RANK: Record<MembershipLevel, number> = {
  GENERAL: 0,
  VIP:     1,
  SUPREMO: 2,
  MASTER:  3,
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS USUARIO
// ═══════════════════════════════════════════════════════════════════

// ─── Listar eventos próximos accesibles por el usuario ────────────

export async function listUpcomingEvents(userId: string, userLevel: MembershipLevel) {
  const userRank = LEVEL_RANK[userLevel]
  const now      = new Date()

  const events = await prisma.event.findMany({
    where:   { isPublished: true, startsAt: { gte: now } },
    orderBy: { startsAt: 'asc' },
    include: { _count: { select: { attendees: true } } },
  })

  // Verificar si el usuario ya se registró en cada evento
  const myRsvpIds = new Set(
    (await prisma.eventAttendee.findMany({
      where:  { userId, eventId: { in: events.map((e) => e.id) } },
      select: { eventId: true },
    })).map((a) => a.eventId),
  )

  return events.map((event) => {
    const isLocked   = (LEVEL_RANK[event.minLevel] ?? 0) > (userRank ?? 0)
    const isFull     = event.maxAttendees !== null
      && event._count.attendees >= event.maxAttendees

    return {
      id:           event.id,
      title:        event.title,
      description:  event.description,
      type:         event.type,
      host:         event.host,
      thumbnailUrl: event.thumbnailUrl,
      startsAt:     event.startsAt,
      endsAt:       event.endsAt,
      minLevel:     event.minLevel,
      maxAttendees: event.maxAttendees,
      attendeeCount: event._count.attendees,
      isLocked,
      isFull,
      isRegistered: myRsvpIds.has(event.id),
      // streamUrl solo se entrega el día del evento (1 hora antes)
      streamUrl:    (!isLocked && isEventLive(event.startsAt, event.endsAt))
        ? event.streamUrl
        : null,
    }
  })
}

// ─── Detalle de un evento ─────────────────────────────────────────

export async function getEvent(eventId: string, userId: string, userLevel: MembershipLevel) {
  const event = await prisma.event.findFirst({
    where:   { id: eventId, isPublished: true },
    include: { _count: { select: { attendees: true } } },
  })

  if (!event) throw Object.assign(new Error('Evento no encontrado'), { statusCode: 404 })

  const isLocked     = (LEVEL_RANK[event.minLevel] ?? 0) > (LEVEL_RANK[userLevel] ?? 0)
  const isRegistered = !!(await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
  }))
  const isFull = event.maxAttendees !== null
    && event._count.attendees >= event.maxAttendees

  return {
    id:           event.id,
    title:        event.title,
    description:  event.description,
    type:         event.type,
    host:         event.host,
    thumbnailUrl: event.thumbnailUrl,
    startsAt:     event.startsAt,
    endsAt:       event.endsAt,
    minLevel:     event.minLevel,
    maxAttendees: event.maxAttendees,
    attendeeCount: event._count.attendees,
    isLocked,
    isFull,
    isRegistered,
    // streamUrl solo disponible cuando el evento está activo
    streamUrl: (!isLocked && isRegistered && isEventLive(event.startsAt, event.endsAt))
      ? event.streamUrl
      : null,
  }
}

// ─── RSVP — registrarse a un evento ──────────────────────────────

export async function rsvpEvent(eventId: string, userId: string, userLevel: MembershipLevel) {
  const event = await prisma.event.findFirst({
    where:   { id: eventId, isPublished: true },
    include: { _count: { select: { attendees: true } } },
  })

  if (!event) throw Object.assign(new Error('Evento no encontrado'), { statusCode: 404 })

  // Verificar nivel
  if ((LEVEL_RANK[event.minLevel] ?? 0) > (LEVEL_RANK[userLevel] ?? 0)) {
    throw Object.assign(
      new Error(`Este evento requiere membresía ${event.minLevel}`),
      { statusCode: 403 },
    )
  }

  // Verificar si ya pasó
  if (event.startsAt < new Date()) {
    throw Object.assign(new Error('Este evento ya comenzó o finalizó'), { statusCode: 400 })
  }

  // Verificar aforo
  if (event.maxAttendees !== null && event._count.attendees >= event.maxAttendees) {
    throw Object.assign(new Error('El evento está lleno'), { statusCode: 409 })
  }

  // Upsert idempotente
  await prisma.eventAttendee.upsert({
    where:  { eventId_userId: { eventId, userId } },
    create: { eventId, userId },
    update: {},
  })

  return { registered: true, eventId, message: '¡Registro confirmado!' }
}

// ─── Cancelar RSVP ────────────────────────────────────────────────

export async function cancelRsvp(eventId: string, userId: string) {
  const attendee = await prisma.eventAttendee.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })

  if (!attendee) throw Object.assign(new Error('No estás registrado en este evento'), { statusCode: 404 })

  await prisma.eventAttendee.delete({
    where: { eventId_userId: { eventId, userId } },
  })

  return { registered: false, eventId, message: 'Registro cancelado' }
}

// ─── Mis eventos (próximos donde me registré) ─────────────────────

export async function myEvents(userId: string) {
  const now = new Date()

  const attendances = await prisma.eventAttendee.findMany({
    where:   { userId, event: { startsAt: { gte: now }, isPublished: true } },
    orderBy: { event: { startsAt: 'asc' } },
    include: {
      event: {
        select: {
          id: true, title: true, type: true, host: true,
          thumbnailUrl: true, startsAt: true, endsAt: true,
          minLevel: true, streamUrl: true,
        },
      },
    },
  })

  return attendances.map((a) => ({
    ...a.event,
    registeredAt: a.registeredAt,
    // streamUrl disponible solo cuando el evento está activo
    streamUrl: isEventLive(a.event.startsAt, a.event.endsAt)
      ? a.event.streamUrl
      : null,
  }))
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS ADMIN
// ═══════════════════════════════════════════════════════════════════

export async function listAllEvents() {
  return prisma.event.findMany({
    orderBy: { startsAt: 'desc' },
    include: { _count: { select: { attendees: true } } },
  })
}

export async function createEvent(input: CreateEventInput) {
  return prisma.event.create({
    data: {
      title:        input.title,
      description:  input.description,
      type:         input.type,
      host:         input.host,
      thumbnailUrl: input.thumbnailUrl,
      streamUrl:    input.streamUrl,
      startsAt:     new Date(input.startsAt),
      endsAt:       input.endsAt ? new Date(input.endsAt) : null,
      minLevel:     input.minLevel,
      maxAttendees: input.maxAttendees,
      isPublished:  false,
    },
  })
}

export async function updateEvent(eventId: string, input: UpdateEventInput) {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw Object.assign(new Error('Evento no encontrado'), { statusCode: 404 })

  return prisma.event.update({
    where: { id: eventId },
    data:  {
      ...input,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt:   input.endsAt   ? new Date(input.endsAt)   : undefined,
    },
  })
}

export async function deleteEvent(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw Object.assign(new Error('Evento no encontrado'), { statusCode: 404 })

  await prisma.event.delete({ where: { id: eventId } })
  return { message: 'Evento eliminado' }
}

export async function listEventAttendees(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw Object.assign(new Error('Evento no encontrado'), { statusCode: 404 })

  return prisma.eventAttendee.findMany({
    where:   { eventId },
    orderBy: { registeredAt: 'asc' },
    include: {
      event: false,
    },
  })
}

// ─── Helper: verificar si el evento está activo ahora ────────────

function isEventLive(startsAt: Date, endsAt: Date | null): boolean {
  const now    = new Date()
  // Disponible desde 1 hora antes hasta el fin (o 3h después si no hay endsAt)
  const from   = new Date(startsAt.getTime() - 60 * 60 * 1000)
  const until  = endsAt ?? new Date(startsAt.getTime() + 3 * 60 * 60 * 1000)
  return now >= from && now <= until
}
