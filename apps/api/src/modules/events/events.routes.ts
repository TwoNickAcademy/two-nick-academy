import { Router, type IRouter } from 'express'
import { authenticate, requireLevel, requireRole } from '../../middleware/authenticate'
import {
  // Usuario
  listUpcomingEvents,
  getEvent,
  rsvpEvent,
  cancelRsvp,
  myEvents,
  // Admin
  listAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listEventAttendees,
} from './events.controller'

const router: IRouter = Router()

// ═══════════════════════════════════════════════════════════════════
// RUTAS DE USUARIO
// ═══════════════════════════════════════════════════════════════════

// GET  /events         — próximos eventos (filtrado por nivel)
router.get('/', authenticate, listUpcomingEvents)

// GET  /events/my      — mis eventos registrados
router.get('/my', authenticate, myEvents)

// GET  /events/:eventId
router.get('/:eventId', authenticate, getEvent)

// POST /events/:eventId/rsvp — registrarse
router.post('/:eventId/rsvp', authenticate, rsvpEvent)

// DELETE /events/:eventId/rsvp — cancelar registro
router.delete('/:eventId/rsvp', authenticate, cancelRsvp)

// ═══════════════════════════════════════════════════════════════════
// RUTAS ADMIN (TEACHER+)
// ═══════════════════════════════════════════════════════════════════

// GET    /events/admin/all
router.get('/admin/all', authenticate, requireRole('TEACHER'), listAllEvents)

// POST   /events/admin
router.post('/admin', authenticate, requireRole('TEACHER'), createEvent)

// PATCH  /events/admin/:eventId
router.patch('/admin/:eventId', authenticate, requireRole('TEACHER'), updateEvent)

// DELETE /events/admin/:eventId
router.delete('/admin/:eventId', authenticate, requireRole('TEACHER'), deleteEvent)

// GET    /events/admin/:eventId/attendees
router.get(
  '/admin/:eventId/attendees',
  authenticate,
  requireRole('TEACHER'),
  listEventAttendees,
)

export default router
