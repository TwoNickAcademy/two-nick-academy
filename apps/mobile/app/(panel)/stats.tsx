import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Stack } from 'expo-router'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

export default function StatsPanel() {
  const [overview, setOverview] = useState<any>(null)
  const [revenue, setRevenue]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<'overview' | 'revenue' | 'users'>('overview')

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats/overview'),
      api.get('/admin/stats/revenue'),
    ]).then(([o, r]) => {
      setOverview(o.data.data)
      setRevenue(r.data.data)
    }).finally(() => setLoading(false))
  }, [])

  const KPICard = ({ label, value, sub, color }: any) => (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color: color ?? Colors.gold }]}>{value}</Text>
      {sub && <Text style={styles.kpiSub}>{sub}</Text>}
    </View>
  )

  return (
    <>
      <Stack.Screen options={{ title: 'Estadísticas' }} />
      <View style={styles.tabs}>
        {(['overview', 'revenue', 'users'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && { color: Colors.gold }]}>
              {t === 'overview' ? 'General' : t === 'revenue' ? 'Revenue' : 'Usuarios'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {tab === 'overview' && overview && (
            <>
              <View style={styles.grid}>
                <KPICard label="Usuarios totales"   value={overview.totalUsers}    color={Colors.gold} />
                <KPICard label="Activos 30d"        value={overview.activeUsers}   color='#34d399' />
                <KPICard label="Revenue total"      value={`$${overview.totalRevenue}`} color='#60a5fa' />
                <KPICard label="Señales activas"    value={overview.activeSignals} color='#f59e0b' />
                <KPICard label="Consultas IA hoy"   value={overview.aiToday}       color='#a78bfa' />
                <KPICard label="Nuevos hoy"         value={overview.newUsersToday} color='#fb7185' />
              </View>
              {overview.membershipDistribution && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Distribución membresías</Text>
                  {Object.entries(overview.membershipDistribution).map(([level, count]) => (
                    <View key={level} style={styles.distRow}>
                      <Text style={styles.distLabel}>{level}</Text>
                      <Text style={styles.distValue}>{String(count)} usuarios</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {tab === 'revenue' && revenue && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue mensual</Text>
              {revenue.monthly?.map((m: any) => (
                <View key={m.month} style={styles.distRow}>
                  <Text style={styles.distLabel}>{m.month}</Text>
                  <Text style={[styles.distValue, { color: Colors.gold }]}>${m.revenue}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  tabs:        { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:   { borderBottomWidth: 2, borderBottomColor: Colors.gold },
  tabText:     { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard:     { flex: 1, minWidth: '45%', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  kpiLabel:    { fontSize: 11, color: Colors.textMuted, marginBottom: 4, textAlign: 'center' },
  kpiValue:    { fontSize: 22, fontWeight: '800' },
  kpiSub:      { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  section:     { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  distRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  distLabel:   { fontSize: 13, color: Colors.textMuted },
  distValue:   { fontSize: 13, fontWeight: '600', color: Colors.text },
})
