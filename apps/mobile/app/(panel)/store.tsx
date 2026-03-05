import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Switch, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

interface Product {
  id: string
  name: string
  description: string | null
  type: string
  price: string
  currency: string
  minLevel: string
  isActive: boolean
  isFeatured: boolean
  orderIndex: number
}

const TYPE_OPTIONS = ['MEMBERSHIP', 'SIGNAL_PACK', 'AUTO_TRADING', 'PRIVATE_CLASS', 'OTHER']
const LEVEL_OPTIONS = ['GENERAL', 'VIP', 'SUPREMO', 'MASTER']
const TYPE_LABELS: Record<string, string> = {
  MEMBERSHIP: 'Membresía', SIGNAL_PACK: 'Pack Señales',
  AUTO_TRADING: 'Trading Auto', PRIVATE_CLASS: 'Clase 1 a 1', OTHER: 'Otro',
}
const TYPE_COLORS: Record<string, string> = {
  MEMBERSHIP: Colors.gold, SIGNAL_PACK: '#60a5fa',
  AUTO_TRADING: '#34d399', PRIVATE_CLASS: '#a78bfa', OTHER: '#9ca3af',
}
const EMPTY_FORM = {
  name: '', description: '', type: 'MEMBERSHIP', price: '',
  currency: 'USD', minLevel: 'GENERAL', isActive: true, isFeatured: false, orderIndex: '0',
}

export default function StorePanel() {
  const [items, setItems]     = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/store/admin/all')
      setItems(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null); setForm(EMPTY_FORM); setModal(true)
  }

  function openEdit(item: Product) {
    setEditing(item)
    setForm({
      name: item.name, description: item.description ?? '', type: item.type,
      price: item.price, currency: item.currency, minLevel: item.minLevel,
      isActive: item.isActive, isFeatured: item.isFeatured, orderIndex: String(item.orderIndex),
    })
    setModal(true)
  }

  async function save() {
    if (!form.name.trim() || !form.price) {
      Alert.alert('Error', 'Nombre y precio son obligatorios')
      return
    }
    setSaving(true)
    try {
      const payload = { ...form, price: parseFloat(form.price), orderIndex: parseInt(form.orderIndex) }
      if (editing) {
        await api.patch(`/store/admin/${editing.id}`, payload)
      } else {
        await api.post('/store/admin', payload)
      }
      setModal(false); load()
    } catch {
      Alert.alert('Error', 'No se pudo guardar el producto')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    Alert.alert('Eliminar producto', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/store/admin/${id}`)
          setItems(prev => prev.filter(i => i.id !== id))
        } catch { Alert.alert('Error', 'No se pudo eliminar') }
      }},
    ])
  }

  const renderItem = ({ item }: { item: Product }) => (
    <View style={[styles.card, !item.isActive && styles.cardInactive]}>
      <View style={[styles.typeIcon, { backgroundColor: TYPE_COLORS[item.type] + '22' }]}>
        <Ionicons name="storefront" size={20} color={TYPE_COLORS[item.type]} />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardRow}>
          <Text style={styles.cardName}>{item.name}</Text>
          {item.isFeatured && <Ionicons name="star" size={13} color={Colors.gold} />}
        </View>
        <Text style={styles.cardType}>{TYPE_LABELS[item.type]}</Text>
        <Text style={styles.cardPrice}>${item.price} {item.currency}</Text>
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
  )

  return (
    <>
      <Stack.Screen options={{ title: 'Tienda', headerRight: () => (
        <TouchableOpacity onPress={openCreate} style={{ marginRight: 4 }}>
          <Ionicons name="add-circle" size={28} color={Colors.gold} />
        </TouchableOpacity>
      )}} />

      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
        <FlatList data={items} keyExtractor={i => i.id} renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyText}>Sin productos. Crea el primero.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editing ? 'Editar producto' : 'Nuevo producto'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              <TextInput style={styles.input} placeholder="Nombre del producto" placeholderTextColor={Colors.textMuted}
                value={form.name} onChangeText={t => setForm(p => ({ ...p, name: t }))} />
              <TextInput style={[styles.input, styles.inputMulti]} placeholder="Descripción (opcional)"
                placeholderTextColor={Colors.textMuted} value={form.description}
                onChangeText={t => setForm(p => ({ ...p, description: t }))} multiline numberOfLines={3} />

              <View style={styles.row}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Precio" placeholderTextColor={Colors.textMuted}
                  value={form.price} onChangeText={t => setForm(p => ({ ...p, price: t }))} keyboardType="decimal-pad" />
                <TextInput style={[styles.input, { width: 70 }]} placeholder="USD"
                  placeholderTextColor={Colors.textMuted} value={form.currency}
                  onChangeText={t => setForm(p => ({ ...p, currency: t }))} />
              </View>

              <Text style={styles.fieldLabel}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {TYPE_OPTIONS.map(t => (
                    <TouchableOpacity key={t} style={[styles.optionBtn, form.type === t && { backgroundColor: TYPE_COLORS[t] }]}
                      onPress={() => setForm(p => ({ ...p, type: t }))}>
                      <Text style={[styles.optionText, form.type === t && { color: '#000' }]}>{TYPE_LABELS[t]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.fieldLabel}>Nivel mínimo</Text>
              <View style={styles.optionRow}>
                {LEVEL_OPTIONS.map(l => (
                  <TouchableOpacity key={l} style={[styles.optionBtn, form.minLevel === l && styles.optionActive]}
                    onPress={() => setForm(p => ({ ...p, minLevel: l }))}>
                    <Text style={[styles.optionText, form.minLevel === l && { color: Colors.background }]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Activo</Text>
                <Switch value={form.isActive} onValueChange={v => setForm(p => ({ ...p, isActive: v }))}
                  trackColor={{ true: '#34d399' }} thumbColor="#fff" />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Destacado</Text>
                <Switch value={form.isFeatured} onValueChange={v => setForm(p => ({ ...p, isFeatured: v }))}
                  trackColor={{ true: Colors.gold }} thumbColor="#fff" />
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
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardInactive:  { opacity: 0.5 },
  typeIcon:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo:      { flex: 1, gap: 3 },
  cardRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName:      { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardType:      { fontSize: 11, color: Colors.textMuted },
  cardPrice:     { fontSize: 15, fontWeight: '700', color: Colors.gold },
  cardActions:   { gap: 12 },
  empty:         { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:     { color: Colors.textMuted, fontSize: 14 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:      { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: Colors.text },
  input:         { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  inputMulti:    { height: 80, textAlignVertical: 'top' },
  row:           { flexDirection: 'row', gap: 10 },
  fieldLabel:    { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginBottom: 6 },
  optionRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  optionBtn:     { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  optionActive:  { backgroundColor: Colors.gold, borderColor: Colors.gold },
  optionText:    { fontSize: 11, color: Colors.text, fontWeight: '600' },
  switchRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  switchLabel:   { fontSize: 14, color: Colors.text },
  saveBtn:       { backgroundColor: Colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText:   { color: Colors.background, fontWeight: '800', fontSize: 15 },
})
