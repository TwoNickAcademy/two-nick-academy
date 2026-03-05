import { Router, type IRouter } from 'express'
import { authenticate, requireRole } from '../../middleware/authenticate'
import {
  listAnnouncements, listAllAnnouncements,
  createAnnouncement, updateAnnouncement, deleteAnnouncement,
} from './announcements.controller'

const router: IRouter = Router()

// Usuarios autenticados
router.get('/', authenticate, listAnnouncements)

// ADMIN+
router.get('/admin/all',    authenticate, requireRole('ADMIN'), listAllAnnouncements)
router.post('/admin',       authenticate, requireRole('ADMIN'), createAnnouncement)
router.patch('/admin/:id',  authenticate, requireRole('ADMIN'), updateAnnouncement)
router.delete('/admin/:id', authenticate, requireRole('ADMIN'), deleteAnnouncement)

export default router
