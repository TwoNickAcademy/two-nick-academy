import { prisma } from '../../lib/prisma'
import { MembershipLevel } from '@prisma/client'
import { generateStreamUrls, listBunnyVideos } from '../../lib/bunny'
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CreateLessonInput,
  UpdateLessonInput,
} from './courses.schema'

// ─── Rango numérico por nivel ─────────────────────────────────────
const LEVEL_RANK: Record<MembershipLevel, number> = {
  GENERAL: 0,
  VIP:     1,
  SUPREMO: 2,
  MASTER:  3,
}

// ─── Formatear duración en mm:ss ─────────────────────────────────
function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS USUARIO
// ═══════════════════════════════════════════════════════════════════

// ─── Listar cursos con progreso y estado de bloqueo ───────────────

export async function listCourses(userId: string, userLevel: MembershipLevel) {
  const userRank = LEVEL_RANK[userLevel]

  // Traer todos los cursos publicados con sus lecciones publicadas
  const courses = await prisma.course.findMany({
    where:   { isPublished: true },
    orderBy: { orderIndex: 'asc' },
    include: {
      lessons: {
        where:   { isPublished: true },
        select:  { id: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (courses.length === 0) return []

  // Traer progreso del usuario de una sola query
  const allLessonIds = courses.flatMap((c) => c.lessons.map((l) => l.id))
  const completedSet = new Set(
    (
      await prisma.userProgress.findMany({
        where:  { userId, lessonId: { in: allLessonIds } },
        select: { lessonId: true },
      })
    ).map((p) => p.lessonId),
  )

  return courses.map((course) => {
    const totalLessons     = course.lessons.length
    const completedLessons = course.lessons.filter((l) => completedSet.has(l.id)).length
    const isLocked         = (LEVEL_RANK[course.minLevel] ?? 0) > (userRank ?? 0)
    const progressPct      = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0

    return {
      id:           course.id,
      title:        course.title,
      description:  course.description,
      thumbnailUrl: course.thumbnailUrl,
      minLevel:     course.minLevel,
      orderIndex:   course.orderIndex,
      totalLessons,
      completedLessons,
      progressPct,
      isLocked,
      isCompleted:  !isLocked && completedLessons === totalLessons && totalLessons > 0,
    }
  })
}

// ─── Detalle de un curso con lecciones y estado por lección ───────

export async function getCourse(courseId: string, userId: string, userLevel: MembershipLevel) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    include: {
      lessons: {
        where:   { isPublished: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  })

  if (!course) {
    throw Object.assign(new Error('Curso no encontrado'), { statusCode: 404 })
  }

  const isLocked = (LEVEL_RANK[course.minLevel] ?? 0) > (LEVEL_RANK[userLevel] ?? 0)

  // Traer progreso del usuario en este curso
  const completedIds = new Set(
    (
      await prisma.userProgress.findMany({
        where:  { userId, lessonId: { in: course.lessons.map((l) => l.id) } },
        select: { lessonId: true },
      })
    ).map((p) => p.lessonId),
  )

  const lessons = course.lessons.map((lesson, index) => {
    // Generar URLs firmadas de Bunny.net si el usuario tiene acceso y hay videoId
    const stream = (!isLocked && lesson.videoUrl)
      ? generateStreamUrls(lesson.videoUrl)
      : null

    return {
      id:          lesson.id,
      title:       lesson.title,
      stream,                                          // { embedUrl, hlsUrl, thumbnail, videoId } | null
      duration:    lesson.duration,
      durationFmt: formatDuration(lesson.duration),
      orderIndex:  lesson.orderIndex,
      isCompleted: completedIds.has(lesson.id),
      isPreview:   index === 0,
    }
  })

  const totalLessons     = lessons.length
  const completedLessons = lessons.filter((l) => l.isCompleted).length

  return {
    id:              course.id,
    title:           course.title,
    description:     course.description,
    thumbnailUrl:    course.thumbnailUrl,
    minLevel:        course.minLevel,
    isLocked,
    totalLessons,
    completedLessons,
    progressPct:     totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0,
    lessons,
  }
}

// ─── Marcar lección como completada ──────────────────────────────

export async function completeLesson(
  courseId: string,
  lessonId: string,
  userId:   string,
  userLevel: MembershipLevel,
) {
  // Verificar que la lección pertenece al curso
  const lesson = await prisma.lesson.findFirst({
    where:   { id: lessonId, courseId, isPublished: true },
    include: { course: { select: { minLevel: true, isPublished: true } } },
  })

  if (!lesson || !lesson.course.isPublished) {
    throw Object.assign(new Error('Lección no encontrada'), { statusCode: 404 })
  }

  // Verificar acceso por nivel
  const courseRank = LEVEL_RANK[lesson.course.minLevel] ?? 0
  const userRank   = LEVEL_RANK[userLevel] ?? 0
  if (userRank < courseRank) {
    throw Object.assign(
      new Error(`Este curso requiere membresía ${lesson.course.minLevel}`),
      { statusCode: 403 },
    )
  }

  // upsert: idempotente — si ya existe no lanza error
  await prisma.userProgress.upsert({
    where:  { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},  // no actualizar si ya existe
  })

  // Calcular progreso actualizado del curso
  const [totalLessons, completedLessons] = await Promise.all([
    prisma.lesson.count({ where: { courseId, isPublished: true } }),
    prisma.userProgress.count({
      where: {
        userId,
        lesson: { courseId, isPublished: true },
      },
    }),
  ])

  const progressPct  = Math.round((completedLessons / totalLessons) * 100)
  const isCompleted  = completedLessons === totalLessons

  return {
    lessonId,
    courseId,
    completedLessons,
    totalLessons,
    progressPct,
    isCompleted,
    message: isCompleted ? '¡Curso completado!' : 'Lección marcada como completada',
  }
}

// ═══════════════════════════════════════════════════════════════════
// ENDPOINTS ADMIN (MASTER)
// ═══════════════════════════════════════════════════════════════════

// ─── Crear curso ──────────────────────────────────────────────────

export async function createCourse(input: CreateCourseInput) {
  return prisma.course.create({
    data: {
      title:        input.title,
      description:  input.description,
      thumbnailUrl: input.thumbnailUrl,
      minLevel:     input.minLevel,
      orderIndex:   input.orderIndex,
      isPublished:  false,
    },
  })
}

// ─── Actualizar curso ─────────────────────────────────────────────

export async function updateCourse(courseId: string, input: UpdateCourseInput) {
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw Object.assign(new Error('Curso no encontrado'), { statusCode: 404 })

  return prisma.course.update({
    where: { id: courseId },
    data:  input,
  })
}

// ─── Agregar lección a un curso ───────────────────────────────────

export async function createLesson(courseId: string, input: CreateLessonInput) {
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw Object.assign(new Error('Curso no encontrado'), { statusCode: 404 })

  return prisma.lesson.create({
    data: {
      courseId,
      title:       input.title,
      videoUrl:    input.videoUrl,
      duration:    input.duration,
      orderIndex:  input.orderIndex,
      isPublished: false,
    },
  })
}

// ─── Actualizar lección ───────────────────────────────────────────

export async function updateLesson(
  courseId: string,
  lessonId: string,
  input:    UpdateLessonInput,
) {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId } })
  if (!lesson) throw Object.assign(new Error('Lección no encontrada'), { statusCode: 404 })

  return prisma.lesson.update({
    where: { id: lessonId },
    data:  input,
  })
}

// ─── Eliminar lección ─────────────────────────────────────────────

export async function deleteLesson(courseId: string, lessonId: string) {
  const lesson = await prisma.lesson.findFirst({ where: { id: lessonId, courseId } })
  if (!lesson) throw Object.assign(new Error('Lección no encontrada'), { statusCode: 404 })

  await prisma.lesson.delete({ where: { id: lessonId } })
  return { message: 'Lección eliminada' }
}

// ─── Admin: listar TODOS los cursos (publicados y borradores) ─────

export async function listAllCourses() {
  return prisma.course.findMany({
    orderBy: { orderIndex: 'asc' },
    include: {
      _count: { select: { lessons: true } },
    },
  })
}

// ─── Admin: listar videos de Bunny.net para vincular a lecciones ──

export async function listBunnyVideosAdmin(page?: number, search?: string) {
  return listBunnyVideos(page, search)
}
