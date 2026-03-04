import { Request, Response, NextFunction } from 'express'
import { createEventSchema, updateEventSchema } from './events.schema'
import * as eventsService from './events.service'
import type { AuthRequest } from '../../types'

// ═══════════════════════════════════════════════════════════════════
// USUARIO
// ═══════════════════════════════════════════════════════════════════

// ─── GET /events ──────────────────────────────────────────────────
export async function listUpcomingEvents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const events = await eventsService.listUpcomingEvents(req.user!.id, req.user!.membershipLevel)
    res.status(200).json({ data: events })
  } catch (err) { next(err) }
}

// ─── GET /events/:eventId ─────────────────────────────────────────
export async function getEvent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const event = await eventsService.getEvent(
      req.params['eventId'] as string,
      req.user!.id,
      req.user!.membershipLevel,
    )
    res.status(200).json({ data: event })
  } catch (err) { next(err) }
}

// ─── POST /events/:eventId/rsvp ───────────────────────────────────
export async function rsvpEvent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await eventsService.rsvpEvent(
      req.params['eventId'] as string,
      req.user!.id,
      req.user!.membershipLevel,
    )
    res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

// ─── DELETE /events/:eventId/rsvp ────────────────────────────────
export async function cancelRsvp(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await eventsService.cancelRsvp(
      req.params['eventId'] as string,
      req.user!.id,
    )
    res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

// ─── GET /events/my ──────────────────────────────────────────────
export async function myEvents(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const events = await eventsService.myEvents(req.user!.id)
    res.status(200).json({ data: events })
  } catch (err) { next(err) }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN (MASTER)
// ═══════════════════════════════════════════════════════════════════

// ─── GET /events/admin/all ────────────────────────────────────────
export async function listAllEvents(_req: Request, res: Response, next: NextFunction) {
  try {
    const events = await eventsService.listAllEvents()
    res.status(200).json({ data: events })
  } catch (err) { next(err) }
}

// ─── POST /events/admin ───────────────────────────────────────────
export async function createEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createEventSchema.parse(req.body)
    const event = await eventsService.createEvent(input)
    res.status(201).json({ message: 'Evento creado', data: event })
  } catch (err) { next(err) }
}

// ─── PATCH /events/admin/:eventId ────────────────────────────────
export async function updateEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateEventSchema.parse(req.body)
    const event = await eventsService.updateEvent(req.params['eventId'] as string, input)
    res.status(200).json({ message: 'Evento actualizado', data: event })
  } catch (err) { next(err) }
}

// ─── DELETE /events/admin/:eventId ───────────────────────────────
export async function deleteEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await eventsService.deleteEvent(req.params['eventId'] as string)
    res.status(200).json(result)
  } catch (err) { next(err) }
}

// ─── GET /events/admin/:eventId/attendees ────────────────────────
export async function listEventAttendees(req: Request, res: Response, next: NextFunction) {
  try {
    const attendees = await eventsService.listEventAttendees(req.params['eventId'] as string)
    res.status(200).json({ data: attendees })
  } catch (err) { next(err) }
}
