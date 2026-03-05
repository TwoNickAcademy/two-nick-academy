import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { api } from '../../src/api/client'
import { Colors } from '../../src/constants/colors'

interface Course {
  id: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  minLevel: string
  totalLessons: number
  completedLessons: number
  progressPct: number
  isLocked: boolean
  isCompleted: boolean
}

const LEVEL_COLOR: Record<string, string> = {
  GENERAL: Colors.levels.GENERAL,
  VIP:     Colors.levels.VIP,
  SUPREMO: Colors.levels.SUPREMO,
  MASTER:  Colors.levels.MASTER,
}

export default function CoursesScreen() {
  const router   = useRouter()
  const [courses,    setCourses]    = useState<Course[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadCourses() {
    try {
      const { data } = await api.get('/courses')
      setCourses(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadCourses() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await loadCourses()
    setRefreshing(false)
  }

  const completed = courses.filter((c) => c.isCompleted).length
  const total     = courses.filter((c) => !c.isLocked).length
  const globalPct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Academia</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        >
          {/* Progreso global */}
          {total > 0 && (
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Mi progreso</Text>
                <Text style={styles.progressPct}>{globalPct}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${globalPct}%` }]} />
              </View>
              <Text style={styles.progressSub}>{completed} de {total} cursos completados</Text>
            </View>
          )}

          {/* Lista de cursos */}
          {courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={[styles.courseCard, course.isLocked && styles.courseCardLocked]}
              onPress={() => !course.isLocked && router.push(`/course/${course.id}` as any)}
              activeOpacity={course.isLocked ? 1 : 0.8}
            >
              {/* Miniatura placeholder */}
              <View style={[styles.thumbnail, { backgroundColor: LEVEL_COLOR[course.minLevel] + '22' }]}>
                <Text style={styles.thumbnailEmoji}>
                  {course.isLocked ? '🔒' : course.isCompleted ? '✅' : '📖'}
                </Text>
              </View>

              <View style={styles.courseInfo}>
                <View style={styles.courseTopRow}>
                  <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLOR[course.minLevel] + '22' }]}>
                    <Text style={[styles.levelText, { color: LEVEL_COLOR[course.minLevel] }]}>
                      {course.minLevel}
                    </Text>
                  </View>
                  <Text style={styles.lessonsCount}>{course.totalLessons} clases</Text>
                </View>

                <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>

                {!course.isLocked ? (
                  <View style={styles.progressMini}>
                    <View style={styles.progressBarMini}>
                      <View style={[styles.progressFillMini, { width: `${course.progressPct}%` }]} />
                    </View>
                    <Text style={styles.progressPctMini}>{course.progressPct}%</Text>
                  </View>
                ) : (
                  <Text style={styles.lockedText}>Actualiza tu plan para acceder</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {courses.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No hay cursos disponibles</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  header:           { paddingHorizontal: 20, paddingVertical: 16 },
  title:            { fontSize: 20, fontWeight: '700', color: Colors.text },
  progressCard:     { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  progressHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle:    { fontSize: 14, fontWeight: '600', color: Colors.text },
  progressPct:      { fontSize: 14, fontWeight: '700', color: Colors.gold },
  progressBar:      { height: 6, backgroundColor: Colors.surface, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressFill:     { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  progressSub:      { fontSize: 12, color: Colors.textSecondary },
  courseCard:       { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  courseCardLocked: { opacity: 0.7 },
  thumbnail:        { width: 72, height: 72, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  thumbnailEmoji:   { fontSize: 28 },
  courseInfo:       { flex: 1, gap: 6 },
  courseTopRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  levelText:        { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  lessonsCount:     { fontSize: 11, color: Colors.textSecondary },
  courseTitle:      { fontSize: 14, fontWeight: '600', color: Colors.text, lineHeight: 20 },
  progressMini:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBarMini:  { flex: 1, height: 4, backgroundColor: Colors.surface, borderRadius: 2, overflow: 'hidden' },
  progressFillMini: { height: '100%', backgroundColor: Colors.gold, borderRadius: 2 },
  progressPctMini:  { fontSize: 11, color: Colors.gold, fontWeight: '600', width: 32 },
  lockedText:       { fontSize: 11, color: Colors.textMuted },
  empty:            { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:       { fontSize: 40, marginBottom: 12 },
  emptyText:        { color: Colors.textSecondary, fontSize: 15 },
})
