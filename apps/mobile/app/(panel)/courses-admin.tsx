import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, ScrollView, Switch } from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

const LEVEL_OPTIONS = ['GENERAL', 'VIP', 'SUPREMO', 'MASTER']
const EMPTY_FORM = { title: '', description: '', level: 'GENERAL', thumbnail: '', isPublished: false }

interface Course {
  id: string
  title: string
  description: string
  level: string
  thumbnail: string | null
  isPublished: boolean
  _count?: { lessons: number }
}

export default function CoursesAdminPanel() {
  const [courses, setCourses]   = useState<Course[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<Course | null>(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/courses/admin/all')
      setCourses(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  function openEdit(c: Course) {
    setEditing(c)
    setForm({ title: c.title, description: c.description ?? '', level: c.level, thumbnail: c.thumbnail ?? '', isPublished: c.isPublished })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim()) { Alert.alert('Error', 'El título es obligatorio'); return }
    setSaving(true)
    try {
      if (editing) await api.patch(`/courses/admin/${editing.id}`, form)
      else await api.post('/courses/admin', form)
      setModal(false); load()
    } catch { Alert.alert('Error', 'No se pudo guardar') }
    finally { setSaving(false) }
  }

  async function togglePublish(course: Course) {
    try {
      await api.patch(`/courses/admin/${course.id}`, { isPublished: !course.isPublished })
      setCourses(prev => prev.map(c => c.id === course.id ? { ...c, isPublished: !c.isPublished } : c))
    } catch { Alert.alert('Error', 'No se pudo actualizar') }
  }

  async function remove(id: string) {
    Alert.alert('Eliminar', '¿Eliminar este curso?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await api.delete(`/courses/admin/${id}`); setCourses(p => p.filter(c => c.id !== id)) }
        catch { Alert.alert('Error', 'No se pudo eliminar') }
      }},
    ])
  }

  const LEVEL_COLORS: Record<string, string> = {
    GENERAL: '#6B7280', VIP: '#3B82F6', SUPREMO: '#8B5CF6', MASTER: Colors.gold,
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Gestión Cursos', headerRight: () => (
        <TouchableOpacity onPress={openCreate} style={{ marginRight: 4 }}>
          <Ionicons name="add-circle" size={28} color={Colors.gold} />
        </TouchableOpacity>
      )}} />

      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
        <FlatList data={courses} keyExtractor={c => c.id} contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[item.level] ?? Colors.gold }]} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardMeta}>{item.level} · {item._count?.lessons ?? 0} lecciones</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Ionicons name="pencil" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item.id)}>
                    <Ionicons name="trash" size={18} color={Colors.red} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.publishRow}>
                <Text style={styles.publishLabel}>{item.isPublished ? 'Publicado' : 'Borrador'}</Text>
                <Switch
                  value={item.isPublished}
                  onValueChange={() => togglePublish(item)}
                  trackColor={{ false: Colors.border, true: Colors.gold + '88' }}
                  thumbColor={item.isPublished ? Colors.gold : '#9ca3af'}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Sin cursos creados</Text></View>}
        />
      )}

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar curso' : 'Nuevo curso'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              <TextInput style={styles.input} placeholder="Título del curso" placeholderTextColor={Colors.textMuted} value={form.title} onChangeText={t => setForm(p => ({ ...p, title: t }))} />
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Descripción" placeholderTextColor={Colors.textMuted} value={form.description} onChangeText={t => setForm(p => ({ ...p, description: t }))} multiline />
              <TextInput style={styles.input} placeholder="URL Thumbnail (opcional)" placeholderTextColor={Colors.textMuted} value={form.thumbnail} onChangeText={t => setForm(p => ({ ...p, thumbnail: t }))} />
              <Text style={styles.fieldLabel}>Nivel mínimo</Text>
              <View style={styles.optionRow}>
                {LEVEL_OPTIONS.map(l => (
                  <TouchableOpacity key={l} style={[styles.optionBtn, form.level === l && styles.optionActive]} onPress={() => setForm(p => ({ ...p, level: l }))}>
                    <Text style={[styles.optionText, form.level === l && { color: Colors.background }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Publicar al guardar</Text>
                <Switch
                  value={form.isPublished}
                  onValueChange={v => setForm(p => ({ ...p, isPublished: v }))}
                  trackColor={{ false: Colors.border, true: Colors.gold + '88' }}
                  thumbColor={form.isPublished ? Colors.gold : '#9ca3af'}
                />
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color={Colors.background} /> : <Text style={styles.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  card:          { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelDot:      { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  cardInfo:      { flex: 1 },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  cardMeta:      { fontSize: 12, color: Colors.textMuted },
  cardActions:   { flexDirection: 'row', gap: 14 },
  publishRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8 },
  publishLabel:  { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyText:     { color: Colors.textMuted, fontSize: 14 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:      { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: Colors.text },
  input:         { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  fieldLabel:    { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginBottom: 6 },
  optionRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  optionBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  optionActive:  { backgroundColor: Colors.gold, borderColor: Colors.gold },
  optionText:    { fontSize: 11, color: Colors.text, fontWeight: '600' },
  switchRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  saveBtn:       { backgroundColor: Colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:   { color: Colors.background, fontWeight: '800', fontSize: 15 },
})
