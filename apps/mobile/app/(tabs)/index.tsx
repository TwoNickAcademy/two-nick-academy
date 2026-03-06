import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../../src/store/auth.store'
import { api } from '../../src/api/client'
import { Colors } from '../../src/constants/colors'

interface Signal {
  id: string
  asset: string
  direction: 'BUY' | 'SELL'
  entryPrice: string
  stopLoss: string
  takeProfits: string[]
  status: string
}

const LEVEL_BADGE: Record<string, { label: string; color: string }> = {
  GENERAL: { label: 'GENERAL',    color: Colors.levels.GENERAL },
  VIP:     { label: '💎 VIP',     color: Colors.levels.VIP },
  SUPREMO: { label: '💎 SUPREMO', color: Colors.levels.SUPREMO },
  MASTER:  { label: '👑 MASTER',  color: Colors.levels.MASTER },
}

export default function HomeScreen() {
  const { user }  = useAuthStore()
  const router    = useRouter()
  const [signals,    setSignals]    = useState<Signal[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadSignals() {
    try {
      const { data } = await api.get('/signals?status=ACTIVE&limit=3')
      setSignals(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadSignals() }, [])

  async function onRefresh() {
    setRefreshing(true)
    await loadSignals()
    setRefreshing(false)
  }

  const level   = user?.membershipLevel ?? 'GENERAL'
  const badge   = LEVEL_BADGE[level] ?? LEVEL_BADGE['GENERAL']!
  const hour    = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, {user?.displayName?.split(' ')[0]} 👋</Text>
            <View style={[styles.badge, { backgroundColor: badge.color + '22', borderColor: badge.color }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.displayName?.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Señales activas */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📊 Señales Activas</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/signals')}>
              <Text style={styles.seeAll}>Ver todas →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />
          ) : signals.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No hay señales activas</Text>
            </View>
          ) : (
            signals.map((s) => <SignalCard key={s.id} signal={s} />)
          )}
        </View>

        {/* Acceso rápido */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Acceso Rápido</Text>
          <View style={styles.quickGrid}>
            {[
              { emoji: '📚', label: 'Academia',    route: '/(tabs)/courses' },
              { emoji: '🤖', label: 'AI Mentor',   route: '/(tabs)/ai'      },
              { emoji: '🛒', label: 'Tienda',      route: '/(tabs)/store'   },
              { emoji: '📅', label: 'Eventos',     route: '/(tabs)/events'  },
              { emoji: '💬', label: 'Chat',        route: '/(tabs)/chat'    },
              { emoji: '💻', label: 'Cuentas MT5', route: '/(tabs)/profile' },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.quickItem}
                onPress={() => router.push(item.route as any)}
              >
                <Text style={styles.quickEmoji}>{item.emoji}</Text>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function SignalCard({ signal }: { signal: Signal }) {
  const isBuy = signal.direction === 'BUY'
  return (
    <View style={styles.signalCard}>
      <View style={styles.signalHeader}>
        <View style={[styles.dirBadge, { backgroundColor: isBuy ? Colors.greenBg : Colors.redBg }]}>
          <Text style={[styles.dirText, { color: isBuy ? Colors.green : Colors.red }]}>
            {isBuy ? '🟢 BUY' : '🔴 SELL'}
          </Text>
        </View>
        <Text style={styles.signalAsset}>{signal.asset}</Text>
      </View>
      <View style={styles.signalRow}>
        {[
          { label: 'Entry', value: Number(signal.entryPrice).toFixed(2), color: Colors.text },
          { label: 'TP',    value: signal.takeProfits[0] ? Number(signal.takeProfits[0]).toFixed(2) : '-', color: Colors.green },
          { label: 'SL',    value: Number(signal.stopLoss).toFixed(2), color: Colors.red },
        ].map((item) => (
          <View key={item.label} style={styles.signalItem}>
            <Text style={[styles.signalLabel, { color: item.color === Colors.text ? Colors.textSecondary : item.color }]}>{item.label}</Text>
            <Text style={[styles.signalValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  greeting:      { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  badge:         { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:     { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  avatar:        { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 18, fontWeight: '700', color: '#000' },
  section:       { paddingHorizontal: 20, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: Colors.text },
  seeAll:        { fontSize: 13, color: Colors.gold },
  empty:         { backgroundColor: Colors.card, borderRadius: 12, padding: 20, alignItems: 'center' },
  emptyText:     { color: Colors.textSecondary, fontSize: 14 },
  signalCard:    { backgroundColor: Colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  signalHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  dirBadge:      { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dirText:       { fontSize: 13, fontWeight: '700' },
  signalAsset:   { fontSize: 15, fontWeight: '700', color: Colors.text },
  signalRow:     { flexDirection: 'row', gap: 16 },
  signalItem:    { flex: 1 },
  signalLabel:   { fontSize: 11, marginBottom: 2 },
  signalValue:   { fontSize: 14, fontWeight: '600' },
  quickGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  quickItem:     { flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  quickEmoji:    { fontSize: 28, marginBottom: 6 },
  quickLabel:    { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
})
