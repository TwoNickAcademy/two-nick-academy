import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth.store'

const LEVEL_OPTIONS = ['GENERAL', 'VIP', 'SUPREMO', 'MASTER']
const EMPTY_FORM = { title: '', description: '', minLevel: 'VIP', startsAt: '', endsAt: '', meetUrl: '' }

export default function LiveSchedulePanel() {
  const { user } = useAuthStore()
  const [events, setEvents]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/events/admin/all?types=LIVE_TRADING,QA_SESSION')
      setEvents(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModal(true) }
  function openEdit(e: any) {
    setEditing(e)
    setForm({ title: e.title, description: e.description ?? '', minLevel: e.minLevel,
      startsAt: e.startsAt?.slice(0, 16) ?? '', endsAt: e.endsAt?.slice(0, 16) ?? '', meetUrl: e.meetUrl ?? '' })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim() || !form.startsAt) { Alert.alert('Error', 'Título y fecha son obligatorios'); return }
    setSaving(true)
    try {
      const payload = { ...form, type: 'LIVE_TRADING', host: user?.displayName ?? 'Profesor' }
      if (editing) await api.patch(`/events/admin/${editing.id}`, payload)
      else await api.post('/events/admin', payload)
      setModal(false); load()
    } catch { Alert.alert('Error', 'No se pudo guardar') }
    finally { setSaving(false) }
  }

  async function remove(id: string) {
    Alert.alert('Eliminar', '¿Eliminar esta sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await api.delete(`/events/admin/${id}`); setEvents(p => p.filter(e => e.id !== id)) }
        catch { Alert.alert('Error', 'No se pudo eliminar') }
      }},
    ])
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Operativa en Vivo', headerRight: () => (
        <TouchableOpacity onPress={openCreate} style={{ marginRight: 4 }}>
          <Ionicons name="add-circle" size={28} color={Colors.gold} />
        </TouchableOpacity>
      )}} />

      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
        <FlatList data={events} keyExtractor={e => e.id} contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.liveIcon, { backgroundColor: Colors.gold + '22' }]}>
                <Ionicons name="trending-up" size={20} color={Colors.gold} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{new Date(item.startsAt).toLocaleString('es-ES')} · {item.minLevel}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(item)}><Ionicons name="pencil" size={18} color={Colors.textMuted} /></TouchableOpacity>
                <TouchableOpacity onPress={() => remove(item.id)}><Ionicons name="trash" size={18} color={Colors.red} /></TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Sin sesiones en vivo programadas</Text></View>}
        />
      )}

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar sesión' : 'Nueva sesión en vivo'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}><Ionicons name="close" size={22} color={Colors.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <TextInput style={styles.input} placeholder="Título de la sesión" placeholderTextColor={Colors.textMuted} value={form.title} onChangeText={t => setForm(p => ({ ...p, title: t }))} />
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} placeholder="Descripción" placeholderTextColor={Colors.textMuted} value={form.description} onChangeText={t => setForm(p => ({ ...p, description: t }))} multiline />
              <TextInput style={styles.input} placeholder="Inicio (YYYY-MM-DDTHH:MM)" placeholderTextColor={Colors.textMuted} value={form.startsAt} onChangeText={t => setForm(p => ({ ...p, startsAt: t }))} />
              <TextInput style={styles.input} placeholder="Fin (opcional)" placeholderTextColor={Colors.textMuted} value={form.endsAt} onChangeText={t => setForm(p => ({ ...p, endsAt: t }))} />
              <TextInput style={styles.input} placeholder="URL de la sesión (Zoom/Meet)" placeholderTextColor={Colors.textMuted} value={form.meetUrl} onChangeText={t => setForm(p => ({ ...p, meetUrl: t }))} />
              <Text style={styles.fieldLabel}>Nivel mínimo</Text>
              <View style={styles.optionRow}>
                {LEVEL_OPTIONS.map(l => (
                  <TouchableOpacity key={l} style={[styles.optionBtn, form.minLevel === l && styles.optionActive]} onPress={() => setForm(p => ({ ...p, minLevel: l }))}>
                    <Text style={[styles.optionText, form.minLevel === l && { color: Colors.background }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
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
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  liveIcon:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo:      { flex: 1 },
  cardTitle:     { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardMeta:      { fontSize: 12, color: Colors.textMuted },
  cardActions:   { flexDirection: 'row', gap: 12 },
  empty:         { alignItems: 'center', paddingTop: 60 },
  emptyText:     { color: Colors.textMuted, fontSize: 14 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:      { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: Colors.text },
  input:         { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  fieldLabel:    { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginBottom: 6 },
  optionRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  optionBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  optionActive:  { backgroundColor: Colors.gold, borderColor: Colors.gold },
  optionText:    { fontSize: 11, color: Colors.text, fontWeight: '600' },
  saveBtn:       { backgroundColor: Colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:   { color: Colors.background, fontWeight: '800', fontSize: 15 },
})
