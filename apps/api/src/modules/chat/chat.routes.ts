import { Router, type IRouter } from 'express'
import { authenticate, requireLevel } from '../../middleware/authenticate'
import { getMessages, deleteMessage } from './chat.controller'

const router: IRouter = Router()

// GET  /chat/:roomLevel/messages?limit=50&before=msgId
router.get('/:roomLevel/messages', authenticate, getMessages)

// DELETE /chat/admin/messages/:messageId — moderación
router.delete(
  '/admin/messages/:messageId',
  authenticate,
  requireLevel('MASTER'),
  deleteMessage,
)

export default router
