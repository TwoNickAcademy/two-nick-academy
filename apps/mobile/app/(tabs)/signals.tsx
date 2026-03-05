import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '../../src/api/client'
import { Colors } from '../../src/constants/colors'

type Tab = 'ACTIVE' | 'HISTORY'

interface Signal {
  id: string
  asset: string
  direction: 'BUY' | 'SELL'
  market: string
  entryPrice: string
  stopLoss: string
  takeProfits: string[]
  status: string
  whyText: string | null
  pipsResult: string | null
  minLevel: string
  sentAt: string
}

export default function SignalsScreen() {
  const [tab,        setTab]        = useState<Tab>('ACTIVE')
  const [signals,    setSignals]    = useState<Signal[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded,   setExpanded]   = useState<string | null>(null)

  async function loadSignals() {
    setLoading(true)
    try {
      const status = tab === 'ACTIVE' ? 'ACTIVE' : 'WIN,LOSS,CLOSED'
      const { data } = await api.get(`/signals?status=${status}&limit=20`)
      setSignals(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadSignals() }, [tab])

  async function onRefresh() {
    setRefreshing(true)
    await loadSignals()
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Señales</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['ACTIVE', 'HISTORY'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'ACTIVE' ? 'Activas' : 'Historial'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        >
          {signals.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyText}>No hay señales {tab === 'ACTIVE' ? 'activas' : 'en el historial'}</Text>
            </View>
          ) : (
            signals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                expanded={expanded === signal.id}
                onPress={() => setExpanded(expanded === signal.id ? null : signal.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function SignalCard({ signal, expanded, onPress }: { signal: Signal; expanded: boolean; onPress: () => void }) {
  const isBuy    = signal.direction === 'BUY'
  const isWin    = signal.status === 'WIN'
  const isLoss   = signal.status === 'LOSS'
  const isClosed = ['WIN', 'LOSS', 'CLOSED', 'CANCELLED'].includes(signal.status)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Primera fila */}
      <View style={styles.cardHeader}>
        <View style={[styles.dirBadge, { backgroundColor: isBuy ? Colors.greenBg : Colors.redBg }]}>
          <Text style={[styles.dirText, { color: isBuy ? Colors.green : Colors.red }]}>
            {isBuy ? '🟢 BUY' : '🔴 SELL'}
          </Text>
        </View>
        <Text style={styles.asset}>{signal.asset}</Text>
        <View style={{ flex: 1 }} />
        {isClosed && (
          <View style={[styles.statusBadge, { backgroundColor: isWin ? Colors.greenBg : isLoss ? Colors.redBg : Colors.surface }]}>
            <Text style={[styles.statusText, { color: isWin ? Colors.green : isLoss ? Colors.red : Colors.textSecondary }]}>
              {isWin ? '✅ WIN' : isLoss ? '❌ LOSS' : signal.status}
            </Text>
          </View>
        )}
      </View>

      {/* Precios */}
      <View style={styles.priceRow}>
        {[
          { label: 'Entry', value: Number(signal.entryPrice).toFixed(2), color: Colors.text },
          { label: 'TP',    value: signal.takeProfits[0] ? Number(signal.takeProfits[0]).toFixed(2) : '-', color: Colors.green },
          { label: 'SL',    value: Number(signal.stopLoss).toFixed(2), color: Colors.red },
          ...(signal.pipsResult ? [{ label: 'Pips', value: `${Number(signal.pipsResult) > 0 ? '+' : ''}${Number(signal.pipsResult).toFixed(1)}`, color: Number(signal.pipsResult) > 0 ? Colors.green : Colors.red }] : []),
        ].map((item) => (
          <View key={item.label} style={styles.priceItem}>
            <Text style={styles.priceLabel}>{item.label}</Text>
            <Text style={[styles.priceValue, { color: item.color }]}>{item.value}</Text>
          </View>
        ))}
      </View>

      {/* Expandido: análisis AI */}
      {expanded && signal.whyText && (
        <View style={styles.whyBox}>
          <Text style={styles.whyTitle}>🤖 Análisis</Text>
          <Text style={styles.whyText}>{signal.whyText}</Text>
        </View>
      )}

      <Text style={styles.cardFooter}>
        {signal.market} • {expanded ? 'Ocultar ▲' : 'Ver análisis ▼'}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { paddingHorizontal: 20, paddingVertical: 16 },
  title:        { fontSize: 20, fontWeight: '700', color: Colors.text },
  tabs:         { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.card, borderRadius: 12, padding: 4 },
  tabBtn:       { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: Colors.gold },
  tabText:      { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive:{ color: '#000' },
  empty:        { alignItems: 'center', paddingTop: 60 },
  emptyEmoji:   { fontSize: 40, marginBottom: 12 },
  emptyText:    { color: Colors.textSecondary, fontSize: 15 },
  card:         { backgroundColor: Colors.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  dirBadge:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dirText:      { fontSize: 13, fontWeight: '700' },
  asset:        { fontSize: 16, fontWeight: '700', color: Colors.text },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: 11, fontWeight: '700' },
  priceRow:     { flexDirection: 'row', gap: 12, marginBottom: 8 },
  priceItem:    { flex: 1 },
  priceLabel:   { fontSize: 10, color: Colors.textSecondary, marginBottom: 2 },
  priceValue:   { fontSize: 14, fontWeight: '600' },
  whyBox:       { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 8 },
  whyTitle:     { fontSize: 12, fontWeight: '700', color: Colors.gold, marginBottom: 6 },
  whyText:      { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  cardFooter:   { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
})
