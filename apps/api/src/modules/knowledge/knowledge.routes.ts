import { Router, type IRouter, type Request, type Response, type NextFunction } from 'express'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { addKnowledgeSchema } from '../ai/ai.schema'
import * as knowledgeService from './knowledge.service'
import type { AuthRequest } from '../../types'
import { KnowledgeCategory } from '@prisma/client'

const router: IRouter = Router()

// POST /knowledge — Agregar chunk con embedding
router.post('/', authenticate, requireRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const input = addKnowledgeSchema.parse(req.body)
    const chunk = await knowledgeService.addChunk(input)
    res.status(201).json({ message: 'Chunk agregado con embedding', data: chunk })
  } catch (err) { next(err) }
})

// GET /knowledge — Listar chunks
router.get('/', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query['category'] as KnowledgeCategory | undefined
    const chunks   = await knowledgeService.listChunks(category)
    res.status(200).json({ data: chunks })
  } catch (err) { next(err) }
})

// GET /knowledge/:id — Obtener chunk completo (con contenido)
router.get('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chunk = await knowledgeService.getChunk(String(req.params['id']))
    res.status(200).json({ data: chunk })
  } catch (err) { next(err) }
})

// PATCH /knowledge/:id — Editar chunk y regenerar embedding
router.patch('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await knowledgeService.updateChunk(String(req.params['id']), req.body)
    res.status(200).json({ data: result })
  } catch (err) { next(err) }
})

// DELETE /knowledge/:id — Desactivar chunk
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await knowledgeService.deleteChunk(String(req.params['id']))
    res.status(200).json({ message: 'Chunk desactivado' })
  } catch (err) { next(err) }
})

// POST /knowledge/:id/reembed — Regenerar embedding
router.post('/:id/reembed', authenticate, requireRole('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await knowledgeService.reembedChunk(String(req.params['id']))
    res.status(200).json({ data: result })
  } catch (err) { next(err) }
})

export default router
