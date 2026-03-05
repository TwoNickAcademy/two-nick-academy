import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

interface Signal {
  id: string
  asset: string
  direction: 'BUY' | 'SELL'
  market: string
  status: string
  minLevel: string
  entryPrice: string
  sentAt: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#34d399', CLOSED: Colors.textMuted,
  WIN: Colors.gold, LOSS: Colors.red, CANCELLED: '#9ca3af',
}

export default function SignalsPanel() {
  const [signals, setSignals]   = useState<Signal[]>([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/signals?limit=50')
      setSignals(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function closeSignal(id: string, result: 'WIN' | 'LOSS' | 'CANCELLED') {
    Alert.alert('Cerrar señal', `¿Marcar como ${result}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        setUpdating(id)
        try {
          await api.patch(`/signals/${id}/close`, { status: result })
          setSignals(prev => prev.map(s => s.id === id ? { ...s, status: result } : s))
        } catch { Alert.alert('Error', 'No se pudo actualizar') }
        finally { setUpdating(null) }
      }},
    ])
  }

  const renderSignal = ({ item }: { item: Signal }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.dirBadge, { backgroundColor: item.direction === 'BUY' ? '#34d39922' : '#f8717122' }]}>
          <Ionicons name={item.direction === 'BUY' ? 'arrow-up' : 'arrow-down'} size={16}
            color={item.direction === 'BUY' ? '#34d399' : Colors.red} />
        </View>
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardRow}>
          <Text style={styles.cardAsset}>{item.asset}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.cardDetail}>{item.market} · {item.minLevel} · ${item.entryPrice}</Text>
        <Text style={styles.cardDate}>{new Date(item.sentAt).toLocaleDateString('es-ES')}</Text>
      </View>
      {item.status === 'ACTIVE' && (
        <View style={styles.actions}>
          {updating === item.id ? <ActivityIndicator size="small" color={Colors.gold} /> : (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#34d39922' }]}
                onPress={() => closeSignal(item.id, 'WIN')}>
                <Text style={[styles.actionText, { color: '#34d399' }]}>WIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f8717122' }]}
                onPress={() => closeSignal(item.id, 'LOSS')}>
                <Text style={[styles.actionText, { color: Colors.red }]}>LOSS</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  )

  return (
    <>
      <Stack.Screen options={{ title: 'Señales' }} />
      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
        <FlatList data={signals} keyExtractor={s => s.id} renderItem={renderSignal}
          contentContainerStyle={{ padding: 16, gap: 8 }} />
      )}
    </>
  )
}

const styles = StyleSheet.create({
  card:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  cardLeft:     {},
  dirBadge:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo:     { flex: 1, gap: 3 },
  cardRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardAsset:    { fontSize: 15, fontWeight: '700', color: Colors.text },
  statusBadge:  { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  statusText:   { fontSize: 10, fontWeight: '700' },
  cardDetail:   { fontSize: 12, color: Colors.textMuted },
  cardDate:     { fontSize: 11, color: Colors.textMuted },
  actions:      { gap: 6 },
  actionBtn:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionText:   { fontSize: 11, fontWeight: '700' },
})
