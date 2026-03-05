import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

type UserRole = 'USER' | 'TEACHER' | 'ADMIN' | 'CREATOR'

const ROLES: UserRole[] = ['USER', 'TEACHER', 'ADMIN', 'CREATOR']
const ROLE_COLORS: Record<UserRole, string> = {
  USER: '#6B7280', TEACHER: '#34d399', ADMIN: '#8B5CF6', CREATOR: Colors.gold,
}
const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Usuario', TEACHER: 'Profesor', ADMIN: 'Administrador', CREATOR: 'Creador',
}
const ROLE_ICONS: Record<UserRole, any> = {
  USER: 'person-outline', TEACHER: 'school-outline', ADMIN: 'shield-outline', CREATOR: 'star-outline',
}

interface UserItem {
  id: string
  displayName: string
  email: string
  role: UserRole
  level: string
}

export default function RolesPanel() {
  const [users, setUsers]     = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users?limit=200')
      const list = Array.isArray(data.data?.users) ? data.data.users : []
      setUsers(list.map((u: any) => ({
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        role: u.role ?? 'USER',
        level: u.membership?.level ?? 'GENERAL',
      })))
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function changeRole(userId: string, newRole: UserRole) {
    setUpdating(userId)
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el rol')
    } finally {
      setUpdating(null)
    }
  }

  function confirmChange(user: UserItem, role: UserRole) {
    if (role === user.role) return
    Alert.alert(
      'Cambiar rol',
      `¿Asignar rol "${ROLE_LABELS[role]}" a ${user.displayName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => changeRole(user.id, role) },
      ]
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Gestión de Roles' }} />
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar usuario..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={u => u.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.userRow}>
                <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[item.role] + '22' }]}>
                  <Ionicons name={ROLE_ICONS[item.role]} size={20} color={ROLE_COLORS[item.role]} />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.displayName}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                {updating === item.id && <ActivityIndicator size="small" color={Colors.gold} />}
              </View>

              <View style={styles.roleRow}>
                {ROLES.map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleBtn, item.role === role && { backgroundColor: ROLE_COLORS[role], borderColor: ROLE_COLORS[role] }]}
                    onPress={() => confirmChange(item, role)}
                    disabled={!!updating}
                  >
                    <Text style={[styles.roleText, item.role === role && { color: Colors.background }]}>
                      {ROLE_LABELS[role]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Sin usuarios encontrados</Text></View>}
        />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  searchBox:  { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  searchInput:{ flex: 1, color: Colors.text, fontSize: 14 },
  card:       { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  userRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  userInfo:   { flex: 1 },
  userName:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  userEmail:  { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  roleRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roleBtn:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  roleText:   { fontSize: 11, fontWeight: '700', color: Colors.text },
  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyText:  { color: Colors.textMuted, fontSize: 14 },
})
