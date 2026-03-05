import { Response, NextFunction } from 'express'
import * as announcementsService from './announcements.service'
import type { AuthRequest } from '../../types'

// GET /announcements
export async function listAnnouncements(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(50, Number(req.query['limit'] ?? 20))
    const data = await announcementsService.listAnnouncements(req.user!.membershipLevel, limit)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// GET /announcements/admin/all
export async function listAllAnnouncements(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await announcementsService.listAllAnnouncements()
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// POST /announcements/admin
export async function createAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await announcementsService.createAnnouncement(req.user!.id, req.body)
    res.status(201).json({ data })
  } catch (err) { next(err) }
}

// PATCH /announcements/admin/:id
export async function updateAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await announcementsService.updateAnnouncement(req.params['id'] as string, req.body)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// DELETE /announcements/admin/:id
export async function deleteAnnouncement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await announcementsService.deleteAnnouncement(req.params['id'] as string)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}
