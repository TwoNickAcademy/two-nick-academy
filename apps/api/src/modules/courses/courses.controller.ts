import { Request, Response, NextFunction } from 'express'
import {
  createCourseSchema,
  updateCourseSchema,
  createLessonSchema,
  updateLessonSchema,
} from './courses.schema'
import * as coursesService from './courses.service'
import type { AuthRequest } from '../../types'

// ═══════════════════════════════════════════════════════════════════
// USUARIO
// ═══════════════════════════════════════════════════════════════════

// ─── GET /courses ─────────────────────────────────────────────────

export async function listCourses(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const courses = await coursesService.listCourses(
      req.user!.id,
      req.user!.membershipLevel,
    )
    res.status(200).json({ data: courses })
  } catch (err) { next(err) }
}

// ─── GET /courses/:courseId ───────────────────────────────────────

export async function getCourse(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const course = await coursesService.getCourse(
      req.params['courseId'] as string,
      req.user!.id,
      req.user!.membershipLevel,
    )
    res.status(200).json({ data: course })
  } catch (err) { next(err) }
}

// ─── POST /courses/:courseId/lessons/:lessonId/complete ───────────

export async function completeLesson(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await coursesService.completeLesson(
      req.params['courseId'] as string,
      req.params['lessonId'] as string,
      req.user!.id,
      req.user!.membershipLevel,
    )
    res.status(200).json({ data: result })
  } catch (err) { next(err) }
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN (MASTER)
// ═══════════════════════════════════════════════════════════════════

// ─── GET /courses/admin/all ───────────────────────────────────────

export async function listAllCourses(_req: Request, res: Response, next: NextFunction) {
  try {
    const courses = await coursesService.listAllCourses()
    res.status(200).json({ data: courses })
  } catch (err) { next(err) }
}

// ─── POST /courses/admin ──────────────────────────────────────────

export async function createCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const input  = createCourseSchema.parse(req.body)
    const course = await coursesService.createCourse(input)
    res.status(201).json({ message: 'Curso creado', data: course })
  } catch (err) { next(err) }
}

// ─── PATCH /courses/admin/:courseId ──────────────────────────────

export async function updateCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const input  = updateCourseSchema.parse(req.body)
    const course = await coursesService.updateCourse(req.params['courseId'] as string, input)
    res.status(200).json({ message: 'Curso actualizado', data: course })
  } catch (err) { next(err) }
}

// ─── POST /courses/admin/:courseId/lessons ────────────────────────

export async function createLesson(req: Request, res: Response, next: NextFunction) {
  try {
    const input  = createLessonSchema.parse(req.body)
    const lesson = await coursesService.createLesson(req.params['courseId'] as string, input)
    res.status(201).json({ message: 'Lección creada', data: lesson })
  } catch (err) { next(err) }
}

// ─── PATCH /courses/admin/:courseId/lessons/:lessonId ─────────────

export async function updateLesson(req: Request, res: Response, next: NextFunction) {
  try {
    const input  = updateLessonSchema.parse(req.body)
    const lesson = await coursesService.updateLesson(
      req.params['courseId'] as string,
      req.params['lessonId'] as string,
      input,
    )
    res.status(200).json({ message: 'Lección actualizada', data: lesson })
  } catch (err) { next(err) }
}

// ─── DELETE /courses/admin/:courseId/lessons/:lessonId ────────────

export async function deleteLesson(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await coursesService.deleteLesson(
      req.params['courseId'] as string,
      req.params['lessonId'] as string,
    )
    res.status(200).json(result)
  } catch (err) { next(err) }
}
