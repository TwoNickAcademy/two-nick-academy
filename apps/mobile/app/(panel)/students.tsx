import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

const LEVEL_COLORS: Record<string, string> = {
  GENERAL: '#6B7280', VIP: '#3B82F6', SUPREMO: '#8B5CF6', MASTER: Colors.gold,
}

interface Student {
  id: string
  displayName: string
  email: string
  level: string
  coursesCompleted: number
  totalLessons: number
  completedLessons: number
  joinedAt: string
}

export default function StudentsPanel() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users?limit=100')
      const list = Array.isArray(data.data?.users) ? data.data.users : []
      setStudents(list.map((u: any) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        level: u.membership?.level ?? 'GENERAL',
        coursesCompleted: u.progress?.coursesCompleted ?? 0,
        totalLessons: u.progress?.totalLessons ?? 0,
        completedLessons: u.progress?.completedLessons ?? 0,
        joinedAt: u.createdAt,
      })))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = students.filter(s =>
    s.displayName.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const progressPct = (s: Student) =>
    s.totalLessons > 0 ? Math.round((s.completedLessons / s.totalLessons) * 100) : 0

  return (
    <>
      <Stack.Screen options={{ title: 'Progreso Alumnos' }} />
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar alumno..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const pct = progressPct(item)
            const isOpen = expanded === item.id
            return (
              <TouchableOpacity style={styles.card} onPress={() => setExpanded(isOpen ? null : item.id)} activeOpacity={0.8}>
                <View style={styles.cardHeader}>
                  <View style={[styles.avatar, { backgroundColor: (LEVEL_COLORS[item.level] ?? Colors.gold) + '22' }]}>
                    <Text style={[styles.avatarText, { color: LEVEL_COLORS[item.level] ?? Colors.gold }]}>
                      {item.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.name}>{item.displayName}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.levelBadge, { backgroundColor: (LEVEL_COLORS[item.level] ?? Colors.gold) + '22' }]}>
                      <Text style={[styles.levelText, { color: LEVEL_COLORS[item.level] ?? Colors.gold }]}>{item.level}</Text>
                    </View>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} style={{ marginTop: 4 }} />
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressRow}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={styles.progressText}>{pct}%</Text>
                </View>

                {isOpen && (
                  <View style={styles.details}>
                    <View style={styles.detailRow}>
                      <Ionicons name="book-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailText}>Cursos completados: <Text style={styles.detailValue}>{item.coursesCompleted}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailText}>Lecciones: <Text style={styles.detailValue}>{item.completedLessons} / {item.totalLessons}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.detailText}>Miembro desde: <Text style={styles.detailValue}>{new Date(item.joinedAt).toLocaleDateString('es-ES')}</Text></Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Sin alumnos encontrados</Text></View>}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  searchBox:     { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput:   { flex: 1, color: Colors.text, fontSize: 14 },
  card:          { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:        { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 18, fontWeight: '800' },
  cardInfo:      { flex: 1 },
  name:          { fontSize: 14, fontWeight: '700', color: Colors.text },
  email:         { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  cardRight:     { alignItems: 'flex-end', gap: 2 },
  levelBadge:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelText:     { fontSize: 10, fontWeight: '700' },
  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar:   { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: Colors.gold, borderRadius: 3 },
  progressText:  { fontSize: 11, fontWeight: '700', color: Colors.gold, minWidth: 32, textAlign: 'right' },
  details:       { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.border },
  detailRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText:    { fontSize: 12, color: Colors.textMuted },
  detailValue:   { color: Colors.text, fontWeight: '600' },
  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyText:     { color: Colors.textMuted, fontSize: 14 },
})
