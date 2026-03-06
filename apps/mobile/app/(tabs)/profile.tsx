import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/auth.store'
import { api } from '../../src/api/client'
import { Colors } from '../../src/constants/colors'

interface Profile {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  referralCode: string
  membership: {
    level: string
    expiryDate: string | null
  } | null
  stats: {
    aiQuotaUsed: number
    aiQuotaTotal: number | null
    coursesCompleted: number
    referralCount: number
    commissionUsd: string
  }
}

const LEVEL_COLORS: Record<string, string> = {
  GENERAL: Colors.levels.GENERAL,
  VIP:     Colors.levels.VIP,
  SUPREMO: Colors.levels.SUPREMO,
  MASTER:  Colors.levels.MASTER,
}

const PLAN_LABELS: Record<string, string> = {
  GENERAL: 'General — Gratis',
  VIP:     '💎 VIP — $49.99/mes',
  SUPREMO: '💎 Supremo — $99.99/mes',
  MASTER:  '👑 Master — $199.99/mes',
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  CREATOR: { label: 'CREADOR',       color: '#fff',    bg: Colors.gold },
  ADMIN:   { label: 'ADMINISTRADOR', color: '#fff',    bg: '#8B5CF6'   },
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const { data } = await api.get('/users/me')
      setProfile(data.data)
    } catch {}
    finally { setLoading(false) }
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ])
  }

  const role       = user?.role ?? 'USER'
  const roleConfig = ROLE_CONFIG[role] ?? null
  const level     = profile?.membership?.level ?? 'GENERAL'
  const levelColor = LEVEL_COLORS[level] ?? Colors.levels.GENERAL
  const expiry    = profile?.membership?.expiryDate
    ? new Date(profile.membership.expiryDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Perfil</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
          {/* Avatar + nombre */}
          <View style={styles.profileCard}>
            <View style={[styles.avatar, { backgroundColor: levelColor }]}>
              <Text style={styles.avatarText}>{user?.displayName?.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.displayName}>{profile?.displayName}</Text>
            {roleConfig && (
              <View style={[styles.roleBadge, { backgroundColor: roleConfig.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleConfig.color }]}>
                  {roleConfig.label}
                </Text>
              </View>
            )}
            <Text style={styles.email}>{profile?.email}</Text>
          </View>

          {/* Membresía */}
          <View style={[styles.memberCard, { borderColor: levelColor }]}>
            <View style={styles.memberHeader}>
              <Text style={[styles.memberLevel, { color: levelColor }]}>
                {PLAN_LABELS[level] ?? level}
              </Text>
            </View>
            {expiry && (
              <Text style={styles.memberExpiry}>Válido hasta {expiry}</Text>
            )}
            {level !== 'MASTER' && role === 'USER' && (
              <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: levelColor }]}>
                <Text style={styles.upgradeBtnText}>ACTUALIZAR PLAN</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Estadísticas */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Consultas AI',   value: profile?.stats.aiQuotaTotal ? `${profile.stats.aiQuotaUsed}/${profile.stats.aiQuotaTotal}` : '∞', emoji: '🤖' },
              { label: 'Cursos',         value: String(profile?.stats.coursesCompleted ?? 0),  emoji: '📚' },
              { label: 'Referidos',      value: String(profile?.stats.referralCount ?? 0),     emoji: '👥' },
              { label: 'Comisiones',     value: `$${profile?.stats.commissionUsd ?? '0.00'}`, emoji: '💰' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statEmoji}>{stat.emoji}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Menú */}
          <View style={styles.menu}>
            {[
              { emoji: '🔗', label: 'Mi código de referido', value: profile?.referralCode },
              { emoji: '📝', label: 'Editar perfil',         value: '' },
              { emoji: '💻', label: 'Cuentas MT5',           value: '' },
              { emoji: '💳', label: 'Historial de pagos',    value: '' },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem}>
                <Text style={styles.menuEmoji}>{item.emoji}</Text>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <View style={{ flex: 1 }} />
                {item.value ? (
                  <Text style={styles.menuValue}>{item.value}</Text>
                ) : (
                  <Text style={styles.menuArrow}>›</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Panel de Control — solo para TEACHER, ADMIN, CREATOR */}
          {(role === 'TEACHER' || role === 'ADMIN' || role === 'CREATOR') && (
            <TouchableOpacity style={styles.panelBtn} onPress={() => router.push('/(panel)/')}>
              <View style={styles.panelBtnLeft}>
                <Ionicons name="settings" size={20} color={Colors.gold} />
                <Text style={styles.panelBtnText}>Panel de Control</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.gold} />
            </TouchableOpacity>
          )}

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>📤 Cerrar sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { paddingHorizontal: 20, paddingVertical: 16 },
  title:          { fontSize: 20, fontWeight: '700', color: Colors.text },
  profileCard:    { alignItems: 'center', marginBottom: 20 },
  avatar:         { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:     { fontSize: 30, fontWeight: '700', color: '#fff' },
  displayName:    { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  roleBadge:      { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  roleBadgeText:  { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  email:          { fontSize: 14, color: Colors.textSecondary },
  memberCard:     { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1.5, gap: 8 },
  memberHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberLevel:    { fontSize: 16, fontWeight: '700' },
  memberExpiry:   { fontSize: 13, color: Colors.textSecondary },
  upgradeBtn:     { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  upgradeBtnText: { fontWeight: '700', fontSize: 13, color: '#fff', letterSpacing: 1 },
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard:       { flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statEmoji:      { fontSize: 22, marginBottom: 4 },
  statValue:      { fontSize: 18, fontWeight: '700', color: Colors.text },
  statLabel:      { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  menu:           { backgroundColor: Colors.card, borderRadius: 14, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  menuItem:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  menuEmoji:      { fontSize: 18 },
  menuLabel:      { fontSize: 14, color: Colors.text },
  menuValue:      { fontSize: 13, color: Colors.gold, fontWeight: '600' },
  menuArrow:      { fontSize: 20, color: Colors.textMuted },
  panelBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: Colors.gold + '55' },
  panelBtnLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelBtnText:   { fontSize: 15, fontWeight: '700', color: Colors.gold },
  logoutBtn:      { backgroundColor: Colors.card, borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  logoutText:     { fontSize: 15, color: Colors.red, fontWeight: '600' },
})
