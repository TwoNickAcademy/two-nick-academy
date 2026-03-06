'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, BookOpen, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { Header }    from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge }     from '@/components/ui/Badge'
import { api, apiGet } from '@/lib/api'

interface Lesson {
  id:          string
  title:       string
  videoUrl:    string | null
  duration:    number | null
  orderIndex:  number
  isPublished: boolean
}

interface Course {
  id:          string
  title:       string
  description: string | null
  minLevel:    string
  orderIndex:  number
  isPublished: boolean
  _count:      { lessons: number }
}

interface CourseDetail extends Course {
  lessons: Lesson[]
}

export default function CoursesPage() {
  const qc = useQueryClient()
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [showCreate,   setShowCreate]   = useState(false)
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null)

  const [courseForm, setCourseForm] = useState({ title: '', description: '', minLevel: 'GENERAL', orderIndex: '0' })
  const [lessonForm, setLessonForm] = useState({ title: '', videoUrl: '', duration: '', orderIndex: '0' })

  const { data: courses, isLoading, refetch } = useQuery({
    queryKey: ['admin-courses'],
    queryFn:  () => apiGet<Course[]>('/courses/admin/all'),
  })

  const createCourseMutation = useMutation({
    mutationFn: (body: typeof courseForm) =>
      api.post('/courses/admin', {
        title:      body.title,
        description: body.description || undefined,
        minLevel:   body.minLevel,
        orderIndex: parseInt(body.orderIndex, 10),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-courses'] }); setShowCreate(false) },
  })

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.patch(`/courses/admin/${id}`, { isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-courses'] }),
  })

  const createLessonMutation = useMutation({
    mutationFn: ({ courseId, body }: { courseId: string; body: typeof lessonForm }) =>
      api.post(`/courses/admin/${courseId}/lessons`, {
        title:      body.title,
        videoUrl:   body.videoUrl || undefined,
        duration:   body.duration ? parseInt(body.duration, 10) : undefined,
        orderIndex: parseInt(body.orderIndex, 10),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      qc.invalidateQueries({ queryKey: ['course-detail', showAddLesson] })
      setShowAddLesson(null)
      setLessonForm({ title: '', videoUrl: '', duration: '', orderIndex: '0' })
    },
  })

  // Detalles del curso expandido
  const { data: courseDetail } = useQuery({
    queryKey: ['course-detail', expandedId],
    queryFn:  () => expandedId ? apiGet<CourseDetail>(`/courses/admin/all`) : null,
    enabled:  !!expandedId,
  })

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Cursos" subtitle="Gestión de cursos y lecciones" onRefresh={() => refetch()} />

      <div className="flex-1 p-6 space-y-4">
        {/* Botón crear */}
        <div className="flex justify-end">
          <button onClick={() => setShowCreate((v) => !v)} className="btn-gold">
            <Plus size={15} />
            Nuevo curso
          </button>
        </div>

        {/* Formulario nuevo curso */}
        {showCreate && (
          <GlassCard gold className="animate-slide-in">
            <p className="text-sm font-semibold text-white mb-4">Crear Curso</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Título</label>
                <input className="input-glass" placeholder="Título del curso" value={courseForm.title}
                  onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Descripción</label>
                <textarea className="input-glass resize-none" rows={2} placeholder="Descripción opcional"
                  value={courseForm.description}
                  onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nivel mínimo</label>
                <select className="input-glass" value={courseForm.minLevel}
                  onChange={(e) => setCourseForm((f) => ({ ...f, minLevel: e.target.value }))}>
                  <option>GENERAL</option><option>VIP</option><option>SUPREMO</option><option>MASTER</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Orden</label>
                <input type="number" className="input-glass" value={courseForm.orderIndex}
                  onChange={(e) => setCourseForm((f) => ({ ...f, orderIndex: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => createCourseMutation.mutate(courseForm)}
                disabled={createCourseMutation.isPending} className="btn-gold">
                {createCourseMutation.isPending ? 'Creando...' : 'Crear curso'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancelar</button>
            </div>
          </GlassCard>
        )}

        {/* Lista de cursos */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (courses ?? []).length === 0 ? (
          <GlassCard className="flex flex-col items-center gap-3 py-16">
            <BookOpen size={32} className="text-slate-600" />
            <p className="text-sm text-slate-500">No hay cursos creados aún</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {(courses ?? []).map((course) => (
              <GlassCard key={course.id} className="!p-0 overflow-hidden">
                {/* Cabecera del curso */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white truncate">{course.title}</p>
                      <Badge
                        label={course.isPublished ? 'Publicado' : 'Borrador'}
                        variant={course.isPublished ? 'green' : 'gray'}
                        dot={course.isPublished}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{course._count.lessons} lecciones</span>
                      <span>•</span>
                      <span>Nivel: {course.minLevel}</span>
                      <span>•</span>
                      <span>Orden: #{course.orderIndex}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => togglePublishMutation.mutate({ id: course.id, isPublished: !course.isPublished })}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                        course.isPublished
                          ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                          : 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {course.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                      {course.isPublished ? 'Publicado' : 'Publicar'}
                    </button>

                    <button
                      onClick={() => setExpandedId((id) => id === course.id ? null : course.id)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                    >
                      {expandedId === course.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Lecciones expandidas */}
                {expandedId === course.id && (
                  <div className="border-t border-white/[0.06] px-5 py-4 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lecciones</p>
                      <button
                        onClick={() => setShowAddLesson(course.id)}
                        className="flex items-center gap-1 text-xs text-gold-light hover:text-gold transition-colors"
                      >
                        <Plus size={12} /> Agregar
                      </button>
                    </div>

                    {/* Form añadir lección */}
                    {showAddLesson === course.id && (
                      <div className="glass-gold rounded-lg p-3 mb-3 animate-slide-in">
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="col-span-2">
                            <input className="input-glass" placeholder="Título de la lección"
                              value={lessonForm.title}
                              onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} />
                          </div>
                          <input className="input-glass" placeholder="URL del video"
                            value={lessonForm.videoUrl}
                            onChange={(e) => setLessonForm((f) => ({ ...f, videoUrl: e.target.value }))} />
                          <input type="number" className="input-glass" placeholder="Duración (seg)"
                            value={lessonForm.duration}
                            onChange={(e) => setLessonForm((f) => ({ ...f, duration: e.target.value }))} />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => createLessonMutation.mutate({ courseId: course.id, body: lessonForm })}
                            disabled={createLessonMutation.isPending}
                            className="btn-gold text-xs py-1.5"
                          >
                            {createLessonMutation.isPending ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => setShowAddLesson(null)} className="btn-ghost text-xs py-1.5">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {course._count.lessons === 0 ? (
                      <p className="text-xs text-slate-600 py-2">Sin lecciones todavía</p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {course._count.lessons} lecciones — carga el curso para ver detalles
                      </p>
                    )}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
