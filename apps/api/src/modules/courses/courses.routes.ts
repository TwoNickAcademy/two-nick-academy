import { Router, type IRouter } from 'express'
import { authenticate, requireLevel, requireRole } from '../../middleware/authenticate'
import {
  // Usuario
  listCourses,
  getCourse,
  completeLesson,
  // Admin
  listAllCourses,
  createCourse,
  updateCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  listBunnyVideos,
} from './courses.controller'

const router: IRouter = Router()

// ═══════════════════════════════════════════════════════════════════
// RUTAS DE USUARIO (cualquier nivel autenticado)
// ═══════════════════════════════════════════════════════════════════

// GET /courses — Lista con progreso y bloqueo por nivel
router.get('/', authenticate, listCourses)

// GET /courses/:courseId — Detalle + lecciones con estado por lección
router.get('/:courseId', authenticate, getCourse)

// POST /courses/:courseId/lessons/:lessonId/complete — Marcar completada
router.post(
  '/:courseId/lessons/:lessonId/complete',
  authenticate,
  completeLesson,
)

// ═══════════════════════════════════════════════════════════════════
// RUTAS ADMIN (ADMIN+)
// ═══════════════════════════════════════════════════════════════════

// GET /courses/admin/all — Ver todos incluyendo borradores
router.get(
  '/admin/all',
  authenticate,
  requireRole('ADMIN'),
  listAllCourses,
)

// GET /courses/admin/bunny-videos — Listar videos de Bunny.net para vincular a lecciones
router.get(
  '/admin/bunny-videos',
  authenticate,
  requireRole('ADMIN'),
  listBunnyVideos,
)

// POST /courses/admin — Crear curso nuevo
router.post(
  '/admin',
  authenticate,
  requireRole('ADMIN'),
  createCourse,
)

// PATCH /courses/admin/:courseId — Editar título, publicar, etc.
router.patch(
  '/admin/:courseId',
  authenticate,
  requireRole('ADMIN'),
  updateCourse,
)

// POST /courses/admin/:courseId/lessons — Agregar lección
router.post(
  '/admin/:courseId/lessons',
  authenticate,
  requireRole('ADMIN'),
  createLesson,
)

// PATCH /courses/admin/:courseId/lessons/:lessonId — Editar lección
router.patch(
  '/admin/:courseId/lessons/:lessonId',
  authenticate,
  requireRole('ADMIN'),
  updateLesson,
)

// DELETE /courses/admin/:courseId/lessons/:lessonId — Eliminar lección
router.delete(
  '/admin/:courseId/lessons/:lessonId',
  authenticate,
  requireRole('ADMIN'),
  deleteLesson,
)

export default router
