import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Switch, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  minLevel: string
  isPinned: boolean
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  createdBy: { displayName: string }
}

const TYPE_OPTIONS = ['INFO', 'WARNING', 'PROMO', 'MAINTENANCE', 'TRADING']
const LEVEL_OPTIONS = ['GENERAL', 'VIP', 'SUPREMO', 'MASTER']
const TYPE_COLORS: Record<string, string> = {
  INFO: '#60a5fa', WARNING: '#f59e0b', PROMO: '#34d399',
  MAINTENANCE: '#9ca3af', TRADING: Colors.gold,
}

const EMPTY_FORM = { title: '', content: '', type: 'INFO', minLevel: 'GENERAL', isPinned: false, isActive: true, expiresAt: '' }

export default function AnnouncementsPanel() {
  const [items, setItems]       = useState<Announcement[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<Announcement | null>(null)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/announcements/admin/all')
      setItems(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(item: Announcement) {
    setEditing(item)
    setForm({
      title: item.title, content: item.content, type: item.type,
      minLevel: item.minLevel, isPinned: item.isPinned,
      isActive: item.isActive, expiresAt: item.expiresAt ?? '',
    })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Error', 'Título y contenido son obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, expiresAt: form.expiresAt || null }
      if (editing) {
        await api.patch(`/announcements/admin/${editing.id}`, payload)
      } else {
        await api.post('/announcements/admin', payload)
      }
      setModal(false)
      load()
    } catch {
      Alert.alert('Error', 'No se pudo guardar el aviso')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    Alert.alert('Eliminar aviso', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/announcements/admin/${id}`)
          setItems(prev => prev.filter(i => i.id !== id))
        } catch { Alert.alert('Error', 'No se pudo eliminar') }
      }},
    ])
  }

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={[styles.card, !item.isActive && styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[item.type] + '22' }]}>
          <Text style={[styles.typeText, { color: TYPE_COLORS[item.type] }]}>{item.type}</Text>
        </View>
        <View style={styles.cardActions}>
          {item.isPinned && <Ionicons name="pin" size={14} color={Colors.gold} />}
          <TouchableOpacity onPress={() => openEdit(item)}>
            <Ionicons name="pencil" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(item.id)}>
            <Ionicons name="trash" size={18} color={Colors.red} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardContent} numberOfLines={2}>{item.content}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>{item.minLevel} · {item.createdBy?.displayName}</Text>
        <Text style={[styles.cardStatus, { color: item.isActive ? '#34d399' : Colors.textMuted }]}>
          {item.isActive ? 'Activo' : 'Inactivo'}
        </Text>
      </View>
    </View>
  )

  return (
    <>
      <Stack.Screen options={{ title: 'Avisos', headerRight: () => (
        <TouchableOpacity onPress={openCreate} style={{ marginRight: 4 }}>
          <Ionicons name="add-circle" size={28} color={Colors.gold} />
        </TouchableOpacity>
      )}} />

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No hay avisos. Crea el primero.</Text>
            </View>
          }
        />
      )}

      {/* Modal crear/editar */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar aviso' : 'Nuevo aviso'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <TextInput style={styles.input} placeholder="Título" placeholderTextColor={Colors.textMuted}
                value={form.title} onChangeText={t => setForm(p => ({ ...p, title: t }))} />
              <TextInput style={[styles.input, styles.inputMulti]} placeholder="Contenido" placeholderTextColor={Colors.textMuted}
                value={form.content} onChangeText={t => setForm(p => ({ ...p, content: t }))} multiline numberOfLines={4} />

              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.optionRow}>
                {TYPE_OPTIONS.map(t => (
                  <TouchableOpacity key={t} style={[styles.optionBtn, form.type === t && { backgroundColor: TYPE_COLORS[t] }]}
                    onPress={() => setForm(p => ({ ...p, type: t }))}>
                    <Text style={[styles.optionText, form.type === t && { color: '#000' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Nivel mínimo</Text>
              <View style={styles.optionRow}>
                {LEVEL_OPTIONS.map(l => (
                  <TouchableOpacity key={l} style={[styles.optionBtn, form.minLevel === l && styles.optionBtnActive]}
                    onPress={() => setForm(p => ({ ...p, minLevel: l }))}>
                    <Text style={[styles.optionText, form.minLevel === l && { color: Colors.background }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={styles.input} placeholder="Expira (YYYY-MM-DD, opcional)" placeholderTextColor={Colors.textMuted}
                value={form.expiresAt} onChangeText={t => setForm(p => ({ ...p, expiresAt: t }))} />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Fijado</Text>
                <Switch value={form.isPinned} onValueChange={v => setForm(p => ({ ...p, isPinned: v }))}
                  trackColor={{ true: Colors.gold }} thumbColor="#fff" />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Activo</Text>
                <Switch value={form.isActive} onValueChange={v => setForm(p => ({ ...p, isActive: v }))}
                  trackColor={{ true: '#34d399' }} thumbColor="#fff" />
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
  card:           { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  cardInactive:   { opacity: 0.5 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  typeBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText:       { fontSize: 10, fontWeight: '700' },
  cardActions:    { flexDirection: 'row', gap: 12, alignItems: 'center' },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardContent:    { fontSize: 13, color: Colors.textMuted, lineHeight: 19, marginBottom: 8 },
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between' },
  cardMeta:       { fontSize: 11, color: Colors.textMuted },
  cardStatus:     { fontSize: 11, fontWeight: '600' },
  empty:          { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:      { color: Colors.textMuted, fontSize: 14 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:     { fontSize: 17, fontWeight: '700', color: Colors.text },
  input:          { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  inputMulti:     { height: 90, textAlignVertical: 'top' },
  fieldLabel:     { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginBottom: 6 },
  optionRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  optionBtn:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  optionBtnActive:{ backgroundColor: Colors.gold, borderColor: Colors.gold },
  optionText:     { fontSize: 11, color: Colors.text, fontWeight: '600' },
  switchRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel:    { fontSize: 14, color: Colors.text },
  saveBtn:        { backgroundColor: Colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:    { color: Colors.background, fontWeight: '800', fontSize: 15 },
})
