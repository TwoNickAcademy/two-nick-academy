import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

const CATEGORIES = [
  { key: 'SMC',             label: 'SMC',              icon: '🏗️', color: '#3B82F6' },
  { key: 'ICT',             label: 'ICT',              icon: '📐', color: '#8B5CF6' },
  { key: 'RISK_MANAGEMENT', label: 'Gestión de Riesgo',icon: '🛡️', color: '#f87171' },
  { key: 'PSYCHOLOGY',      label: 'Psicología',       icon: '🧠', color: '#34d399' },
  { key: 'METHODOLOGY',     label: 'Metodología',      icon: '📋', color: Colors.gold },
  { key: 'PATTERNS',        label: 'Patrones',         icon: '📊', color: '#fb923c' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]))

const EMPTY_FORM = { title: '', content: '', category: 'METHODOLOGY', tags: '' }

interface Chunk {
  id: string
  title: string
  category: string
  tags: string[]
  createdAt: string
}

export default function KnowledgePanel() {
  const [chunks, setChunks]     = useState<Chunk[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<string>('ALL')
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState<Chunk | null>(null)
  const [saving, setSaving]     = useState(false)
  const [loadingContent, setLoadingContent] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/knowledge')
      setChunks(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  async function openEdit(chunk: Chunk) {
    setLoadingContent(true)
    setModal(true)
    setEditing(chunk)
    setForm({ title: chunk.title, content: '', category: chunk.category, tags: chunk.tags.join(', ') })
    try {
      const { data } = await api.get(`/knowledge/${chunk.id}`)
      setForm(p => ({ ...p, content: data.data.content }))
    } catch {}
    finally { setLoadingContent(false) }
  }

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Error', 'El título y contenido son obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title:    form.title.trim(),
        content:  form.content.trim(),
        category: form.category,
        tags:     form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }
      if (editing) {
        await api.patch(`/knowledge/${editing.id}`, payload)
        Alert.alert('✅ Listo', 'Conocimiento actualizado y embedding regenerado')
      } else {
        await api.post('/knowledge', payload)
        Alert.alert('✅ Listo', 'Conocimiento guardado — el AI Mentor ya puede usarlo')
      }
      setModal(false)
      load()
    } catch {
      Alert.alert('Error', 'No se pudo guardar. Verifica el contenido.')
    }
    finally { setSaving(false) }
  }

  async function remove(id: string, title: string) {
    Alert.alert('Eliminar', `¿Eliminar "${title}"?\n\nEl AI Mentor dejará de usar este conocimiento.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/knowledge/${id}`)
          setChunks(p => p.filter(c => c.id !== id))
        } catch { Alert.alert('Error', 'No se pudo eliminar') }
      }},
    ])
  }

  const filtered = filter === 'ALL' ? chunks : chunks.filter(c => c.category === filter)

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

  return (
    <>
      <Stack.Screen options={{ title: 'Base de Conocimiento', headerRight: () => (
        <TouchableOpacity onPress={openCreate} style={{ marginRight: 4 }}>
          <Ionicons name="add-circle" size={28} color={Colors.gold} />
        </TouchableOpacity>
      )}} />

      {/* Resumen */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{chunks.length}</Text>
          <Text style={styles.summaryLabel}>Fragmentos</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>{CATEGORIES.filter(c => chunks.some(ch => ch.category === c.key)).length}</Text>
          <Text style={styles.summaryLabel}>Categorías</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: Colors.gold }]}>Activo</Text>
          <Text style={styles.summaryLabel}>Estado</Text>
        </View>
      </View>

      {/* Filtros */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity style={[styles.filterBtn, filter === 'ALL' && styles.filterActive]} onPress={() => setFilter('ALL')}>
          <Text style={[styles.filterText, filter === 'ALL' && { color: Colors.background }]}>Todos ({chunks.length})</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => {
          const count = chunks.filter(c => c.category === cat.key).length
          if (count === 0) return null
          return (
            <TouchableOpacity key={cat.key} style={[styles.filterBtn, filter === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]} onPress={() => setFilter(cat.key)}>
              <Text style={[styles.filterText, filter === cat.key && { color: '#fff' }]}>{cat.icon} {cat.label} ({count})</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const cat = CAT_MAP[item.category] ?? { icon: '📄', color: Colors.textMuted, label: item.category }
            return (
              <View style={styles.card}>
                <View style={[styles.catIcon, { backgroundColor: cat.color + '22' }]}>
                  <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <Text style={styles.cardMeta}>{cat.label} · {new Date(item.createdAt).toLocaleDateString('es-ES')}</Text>
                  {item.tags.length > 0 && (
                    <Text style={styles.cardTags} numberOfLines={1}>🏷️ {item.tags.join(', ')}</Text>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <Ionicons name="pencil" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item.id, item.title)}>
                    <Ionicons name="trash" size={18} color={Colors.red} />
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🧠</Text>
              <Text style={styles.emptyTitle}>Base de conocimiento vacía</Text>
              <Text style={styles.emptyText}>Toca el + para agregar tu primera explicación y enseñarle al AI Mentor tu metodología</Text>
            </View>
          }
        />
      )}

      {/* Modal crear / editar */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? 'Editar conocimiento' : 'Nuevo conocimiento'}</Text>
                <TouchableOpacity onPress={() => setModal(false)}>
                  <Ionicons name="close" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {loadingContent ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator color={Colors.gold} />
                  <Text style={{ color: Colors.textMuted, marginTop: 10 }}>Cargando contenido...</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">
                  <Text style={styles.fieldLabel}>Título del fragmento</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Cómo identificar un soporte válido"
                    placeholderTextColor={Colors.textMuted}
                    value={form.title}
                    onChangeText={t => setForm(p => ({ ...p, title: t }))}
                  />

                  <Text style={styles.fieldLabel}>Categoría</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 12 }}>
                    {CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat.key}
                        style={[styles.catBtn, form.category === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
                        onPress={() => setForm(p => ({ ...p, category: cat.key }))}
                      >
                        <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                        <Text style={[styles.catBtnText, form.category === cat.key && { color: '#fff' }]}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.contentHeader}>
                    <Text style={styles.fieldLabel}>Contenido</Text>
                    <Text style={styles.wordCount}>{wordCount(form.content)} palabras</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.contentInput]}
                    placeholder={'Escribe aquí la explicación completa...\n\nEjemplo:\n"En mi metodología, un soporte válido es aquel que el precio ha tocado al menos 2 veces sin cerrarlo por debajo. Cuando el precio regresa por tercera vez busco una vela de confirmación antes de entrar largo..."'}
                    placeholderTextColor={Colors.textMuted}
                    value={form.content}
                    onChangeText={t => setForm(p => ({ ...p, content: t }))}
                    multiline
                    textAlignVertical="top"
                  />

                  <Text style={styles.fieldLabel}>Etiquetas (separadas por coma)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="soporte, resistencia, entrada, confirmación"
                    placeholderTextColor={Colors.textMuted}
                    value={form.tags}
                    onChangeText={t => setForm(p => ({ ...p, tags: t }))}
                  />

                  <View style={styles.tip}>
                    <Ionicons name="bulb-outline" size={16} color={Colors.gold} />
                    <Text style={styles.tipText}>Tip: Fragmentos de 200-500 palabras dan mejores resultados. Escribe como si le explicaras a un alumno en clase.</Text>
                  </View>
                </ScrollView>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving || loadingContent}>
                {saving
                  ? <ActivityIndicator color={Colors.background} />
                  : <Text style={styles.saveBtnText}>{editing ? 'Guardar cambios' : '🧠 Guardar y enseñar al AI'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  summary:        { flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryNum:     { fontSize: 22, fontWeight: '800', color: Colors.text },
  summaryLabel:   { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: Colors.border },
  filterRow:      { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterActive:   { backgroundColor: Colors.gold, borderColor: Colors.gold },
  filterText:     { fontSize: 12, fontWeight: '600', color: Colors.text },
  card:           { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  catIcon:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo:       { flex: 1, gap: 4 },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: Colors.text, lineHeight: 20 },
  cardMeta:       { fontSize: 12, color: Colors.textMuted },
  cardTags:       { fontSize: 11, color: Colors.textMuted },
  cardActions:    { flexDirection: 'row', gap: 14, paddingTop: 2 },
  empty:          { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle:     { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyText:      { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14, maxHeight: '95%' },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:     { fontSize: 17, fontWeight: '700', color: Colors.text },
  fieldLabel:     { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginBottom: 6 },
  input:          { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, marginBottom: 14, borderWidth: 1, borderColor: Colors.border },
  contentInput:   { height: 200, textAlignVertical: 'top' },
  contentHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  wordCount:      { fontSize: 11, color: Colors.gold, fontWeight: '600' },
  catBtn:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  catBtnText:     { fontSize: 12, fontWeight: '600', color: Colors.text },
  tip:            { flexDirection: 'row', gap: 8, backgroundColor: Colors.gold + '15', borderRadius: 10, padding: 12, marginBottom: 8, alignItems: 'flex-start' },
  tipText:        { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },
  saveBtn:        { backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  saveBtnText:    { color: Colors.background, fontWeight: '800', fontSize: 15 },
})
