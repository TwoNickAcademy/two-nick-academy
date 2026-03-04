import { Router, type IRouter } from 'express'
import { authenticate, requireLevel } from '../../middleware/authenticate'
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
// RUTAS ADMIN (MASTER)
// ═══════════════════════════════════════════════════════════════════

// GET    /events/admin/all
router.get('/admin/all', authenticate, requireLevel('MASTER'), listAllEvents)

// POST   /events/admin
router.post('/admin', authenticate, requireLevel('MASTER'), createEvent)

// PATCH  /events/admin/:eventId
router.patch('/admin/:eventId', authenticate, requireLevel('MASTER'), updateEvent)

// DELETE /events/admin/:eventId
router.delete('/admin/:eventId', authenticate, requireLevel('MASTER'), deleteEvent)

// GET    /events/admin/:eventId/attendees
router.get(
  '/admin/:eventId/attendees',
  authenticate,
  requireLevel('MASTER'),
  listEventAttendees,
)

export default router
