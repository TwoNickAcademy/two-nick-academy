import { Router, type IRouter } from 'express'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { getMessages, deleteMessage, clearRoom } from './chat.controller'

const router: IRouter = Router()

// GET  /chat/:roomLevel/messages?limit=50&before=msgId
router.get('/:roomLevel/messages', authenticate, getMessages)

// DELETE /chat/admin/messages/:messageId — moderación (ADMIN+)
router.delete(
  '/admin/messages/:messageId',
  authenticate,
  requireRole('ADMIN'),
  deleteMessage,
)

// DELETE /chat/admin/clear/:roomLevel — limpiar sala completa (ADMIN+)
router.delete(
  '/admin/clear/:roomLevel',
  authenticate,
  requireRole('ADMIN'),
  clearRoom,
)

export default router
