import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth.store'

interface User {
  id: string
  email: string
  displayName: string
  role: string
  isActive: boolean
  createdAt: string
  membership: { level: string; expiryDate: string | null } | null
}

const LEVEL_COLORS: Record<string, string> = {
  GENERAL: '#6B7280', VIP: '#3B82F6', SUPREMO: '#8B5CF6', MASTER: Colors.gold,
}
const ROLE_COLORS: Record<string, string> = {
  USER: Colors.textMuted, TEACHER: '#60a5fa', ADMIN: '#8B5CF6', CREATOR: Colors.gold,
}
const ROLES = ['USER', 'TEACHER', 'ADMIN', 'CREATOR']
const LEVELS = ['GENERAL', 'VIP', 'SUPREMO', 'MASTER']

export default function UsersPanel() {
  const { user: me } = useAuthStore()
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<User | null>(null)
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users?limit=50')
      setUsers(Array.isArray(data.data?.users) ? data.data.users : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function changeRole(userId: string, role: string) {
    if (userId === me?.id) {
      Alert.alert('Error', 'No puedes cambiar tu propio rol')
      return
    }
    setSaving(true)
    try {
      await api.patch(`/admin/users/${userId}/role`, { role })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
      if (selected?.id === userId) setSelected(prev => prev ? { ...prev, role } : prev)
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el rol')
    } finally { setSaving(false) }
  }

  async function changeLevel(userId: string, level: string) {
    setSaving(true)
    try {
      await api.post('/payments/manual', { userId, level, durationDays: 365 })
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, membership: { ...u.membership, level } as any } : u
      ))
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el nivel')
    } finally { setSaving(false) }
  }

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
      <View style={[styles.avatar, { backgroundColor: LEVEL_COLORS[item.membership?.level ?? 'GENERAL'] + '33' }]}>
        <Text style={[styles.avatarText, { color: LEVEL_COLORS[item.membership?.level ?? 'GENERAL'] }]}>
          {item.displayName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.displayName}</Text>
        <Text style={styles.cardEmail} numberOfLines={1}>{item.email}</Text>
        <View style={styles.cardBadges}>
          <View style={[styles.badge, { backgroundColor: LEVEL_COLORS[item.membership?.level ?? 'GENERAL'] + '22' }]}>
            <Text style={[styles.badgeText, { color: LEVEL_COLORS[item.membership?.level ?? 'GENERAL'] }]}>
              {item.membership?.level ?? 'GENERAL'}
            </Text>
          </View>
          {item.role !== 'USER' && (
            <View style={[styles.badge, { backgroundColor: ROLE_COLORS[item.role] + '22' }]}>
              <Text style={[styles.badgeText, { color: ROLE_COLORS[item.role] }]}>{item.role}</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  )

  return (
    <>
      <Stack.Screen options={{ title: 'Usuarios' }} />

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput style={styles.searchInput} placeholder="Buscar usuario..." placeholderTextColor={Colors.textMuted}
          value={search} onChangeText={setSearch} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={u => u.id}
          renderItem={renderUser}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        />
      )}

      {/* Modal detalle usuario */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selected && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selected.displayName}</Text>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Ionicons name="close" size={22} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalEmail}>{selected.email}</Text>

                {/* Cambiar nivel membresía */}
                <Text style={styles.sectionLabel}>Nivel de Membresía</Text>
                <View style={styles.optionRow}>
                  {LEVELS.map(l => (
                    <TouchableOpacity key={l}
                      style={[styles.optionBtn, selected.membership?.level === l && { backgroundColor: LEVEL_COLORS[l] }]}
                      onPress={() => changeLevel(selected.id, l)} disabled={saving}>
                      <Text style={[styles.optionText, selected.membership?.level === l && { color: '#000' }]}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Cambiar rol (solo CREATOR) */}
                {me?.role === 'CREATOR' && (
                  <>
                    <Text style={styles.sectionLabel}>Rol del Sistema</Text>
                    <View style={styles.optionRow}>
                      {ROLES.map(r => (
                        <TouchableOpacity key={r}
                          style={[styles.optionBtn, selected.role === r && { backgroundColor: ROLE_COLORS[r] }]}
                          onPress={() => changeRole(selected.id, r)} disabled={saving}>
                          <Text style={[styles.optionText, selected.role === r && { color: '#fff' }]}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {saving && <ActivityIndicator color={Colors.gold} />}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  searchBar:     { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput:   { flex: 1, color: Colors.text, fontSize: 14 },
  card:          { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  avatar:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 18, fontWeight: '700' },
  cardInfo:      { flex: 1, gap: 4 },
  cardName:      { fontSize: 14, fontWeight: '700', color: Colors.text },
  cardEmail:     { fontSize: 12, color: Colors.textMuted },
  cardBadges:    { flexDirection: 'row', gap: 6 },
  badge:         { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeText:     { fontSize: 10, fontWeight: '700' },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:      { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:    { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalEmail:    { fontSize: 13, color: Colors.textMuted, marginTop: -8 },
  sectionLabel:  { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  optionRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  optionText:    { fontSize: 12, fontWeight: '600', color: Colors.text },
})
