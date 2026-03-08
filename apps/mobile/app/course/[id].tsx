import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { WebView } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

const { width } = Dimensions.get('window')
const VIDEO_HEIGHT = (width * 9) / 16

interface Stream {
  embedUrl: string
  hlsUrl: string
  thumbnail: string
  videoId: string
}

interface Lesson {
  id: string
  title: string
  orderIndex: number
  duration: number | null
  isPreview: boolean
  isCompleted: boolean
  stream: Stream | null
}

interface CourseDetail {
  id: string
  title: string
  description: string
  minLevel: string
  totalLessons: number
  completedLessons: number
  isLocked: boolean
  lessons: Lesson[]
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [completing, setCompleting] = useState(false)

  const fetchCourse = useCallback(async () => {
    try {
      const { data } = await api.get(`/courses/${id}`)
      setCourse(data.data)
      // Auto-seleccionar la primera lección con video disponible
      const firstAvailable = data.data.lessons?.find((l: Lesson) => l.stream !== null)
      if (firstAvailable) setActiveLesson(firstAvailable)
    } catch {
      Alert.alert('Error', 'No se pudo cargar el curso')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCourse()
  }, [fetchCourse])

  const handleCompleteLesson = async () => {
    if (!activeLesson || completing || activeLesson.isCompleted) return
    setCompleting(true)
    try {
      await api.post(`/courses/${id}/lessons/${activeLesson.id}/complete`)
      setCourse(prev => {
        if (!prev) return prev
        return {
          ...prev,
          completedLessons: prev.completedLessons + 1,
          lessons: prev.lessons.map(l =>
            l.id === activeLesson.id ? { ...l, isCompleted: true } : l
          ),
        }
      })
      setActiveLesson(prev => prev ? { ...prev, isCompleted: true } : prev)
    } catch {
      // Ya completada o error — ignorar silenciosamente
    } finally {
      setCompleting(false)
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'VIP':     return Colors.levels.vip
      case 'SUPREMO': return Colors.levels.supremo
      case 'MASTER':  return Colors.levels.master
      default:        return Colors.levels.general
    }
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return ''
    if (minutes < 60) return `${minutes}m`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    )
  }

  if (!course) return null

  const progress = course.totalLessons > 0
    ? course.completedLessons / course.totalLessons
    : 0

  return (
    <>
      <Stack.Screen
        options={{
          title: course.title,
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
          headerTitleStyle: { color: Colors.text, fontSize: 16 },
        }}
      />
      <ScrollView style={styles.container} stickyHeaderIndices={activeLesson ? [0] : []}>
        {/* Video Player */}
        {activeLesson?.stream ? (
          <View style={styles.playerContainer}>
            <WebView
              source={{ uri: activeLesson.stream.embedUrl }}
              style={styles.player}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
            />
          </View>
        ) : (
          <View style={[styles.playerContainer, styles.playerPlaceholder]}>
            <Ionicons name="play-circle-outline" size={64} color={Colors.gold} />
            <Text style={styles.placeholderText}>Selecciona una lección</Text>
          </View>
        )}

        {/* Info lección activa */}
        {activeLesson && (
          <View style={styles.activeLessonInfo}>
            <Text style={styles.activeLessonTitle}>{activeLesson.title}</Text>
            <TouchableOpacity
              style={[
                styles.completeBtn,
                activeLesson.isCompleted && styles.completeBtnDone,
              ]}
              onPress={handleCompleteLesson}
              disabled={activeLesson.isCompleted || completing}
            >
              {completing ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <>
                  <Ionicons
                    name={activeLesson.isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={18}
                    color={Colors.background}
                  />
                  <Text style={styles.completeBtnText}>
                    {activeLesson.isCompleted ? 'Lección completada' : 'Marcar como completada'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Progreso del curso */}
        <View style={styles.courseProgress}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progreso del curso</Text>
            <Text style={styles.progressValue}>
              {course.completedLessons}/{course.totalLessons} lecciones
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.levelBadge}>
            <Text style={[styles.levelText, { color: getLevelColor(course.minLevel) }]}>
              {course.minLevel}
            </Text>
          </View>
        </View>

        {/* Lista de lecciones */}
        <View style={styles.lessonsSection}>
          <Text style={styles.sectionTitle}>Contenido del curso</Text>
          {course.lessons.map((lesson, index) => {
            const isActive   = activeLesson?.id === lesson.id
            const isLocked   = !lesson.stream && !lesson.isPreview

            return (
              <TouchableOpacity
                key={lesson.id}
                style={[
                  styles.lessonItem,
                  isActive && styles.lessonItemActive,
                  lesson.isCompleted && styles.lessonItemCompleted,
                ]}
                onPress={() => {
                  if (isLocked) {
                    Alert.alert(
                      'Lección bloqueada',
                      `Necesitas membresía ${course.minLevel} para acceder a esta lección.`
                    )
                    return
                  }
                  setActiveLesson(lesson)
                }}
                disabled={isLocked}
              >
                <View style={styles.lessonNumber}>
                  {lesson.isCompleted ? (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.gold} />
                  ) : isLocked ? (
                    <Ionicons name="lock-closed" size={20} color={Colors.textMuted} />
                  ) : (
                    <Text style={[styles.lessonNumberText, isActive && { color: Colors.gold }]}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <View style={styles.lessonContent}>
                  <Text style={[
                    styles.lessonTitle,
                    isActive && { color: Colors.gold },
                    isLocked && { color: Colors.textMuted },
                  ]}>
                    {lesson.title}
                  </Text>
                  <View style={styles.lessonMeta}>
                    {lesson.duration && (
                      <Text style={styles.lessonDuration}>
                        <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                        {' '}{formatDuration(lesson.duration)}
                      </Text>
                    )}
                    {lesson.isPreview && (
                      <View style={styles.freeBadge}>
                        <Text style={styles.freeBadgeText}>PREVIEW</Text>
                      </View>
                    )}
                  </View>
                </View>
                {isActive && !isLocked && (
                  <Ionicons name="play-circle" size={22} color={Colors.gold} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  playerContainer: {
    width: '100%',
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
  },
  player: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  activeLessonInfo: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activeLessonTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingVertical: 10,
    gap: 8,
  },
  completeBtnDone: {
    backgroundColor: Colors.success || '#22c55e',
  },
  completeBtnText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
  courseProgress: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  progressValue: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.gold,
    borderRadius: 3,
  },
  levelBadge: {
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lessonsSection: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  lessonItemActive: {
    borderColor: Colors.gold,
    backgroundColor: `${Colors.gold}15`,
  },
  lessonItemCompleted: {
    opacity: 0.85,
  },
  lessonNumber: {
    width: 28,
    alignItems: 'center',
  },
  lessonNumberText: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lessonDuration: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  freeBadge: {
    backgroundColor: `${Colors.gold}25`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeBadgeText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
  },
})
