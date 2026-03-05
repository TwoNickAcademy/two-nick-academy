import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

interface SettingItem {
  icon: any
  label: string
  description: string
  action: () => void
  color?: string
  danger?: boolean
}

export default function SettingsPanel() {
  const [loading, setLoading] = useState<string | null>(null)

  async function runAction(key: string, endpoint: string, method: 'post' | 'delete', confirmMsg: string) {
    Alert.alert('Confirmación', confirmMsg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar', style: key.includes('purge') || key.includes('clear') ? 'destructive' : 'default',
        onPress: async () => {
          setLoading(key)
          try {
            if (method === 'post') await api.post(endpoint)
            else await api.delete(endpoint)
            Alert.alert('Listo', 'Operación completada exitosamente')
          } catch {
            Alert.alert('Error', 'No se pudo completar la operación')
          } finally { setLoading(null) }
        }
      },
    ])
  }

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Inteligencia Artificial',
      items: [
        {
          icon: 'refresh-circle-outline',
          label: 'Resetear cuotas IA',
          description: 'Reiniciar contadores de uso del AI Mentor para todos los usuarios',
          color: '#a78bfa',
          action: () => runAction('quota', '/admin/ai/reset-quotas', 'post', '¿Resetear todas las cuotas de IA? Los usuarios podrán volver a usar el mentor.'),
        },
      ],
    },
    {
      title: 'Chat',
      items: [
        {
          icon: 'trash-outline',
          label: 'Limpiar chat General',
          description: 'Eliminar todos los mensajes de la sala General',
          danger: true,
          action: () => runAction('clear-general', '/chat/admin/clear/GENERAL', 'delete', '¿Eliminar todos los mensajes del chat General?'),
        },
        {
          icon: 'trash-outline',
          label: 'Limpiar todos los chats',
          description: 'Eliminar mensajes de todas las salas simultáneamente',
          danger: true,
          action: () => Alert.alert('Limpiar todo', '¿Eliminar TODOS los mensajes de TODAS las salas?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Limpiar todo', style: 'destructive', onPress: async () => {
              setLoading('clear-all')
              try {
                await Promise.all(['GENERAL','VIP','SUPREMO','MASTER'].map(r => api.delete(`/chat/admin/clear/${r}`)))
                Alert.alert('Listo', 'Todos los chats limpiados')
              } catch { Alert.alert('Error', 'No se pudo completar') }
              finally { setLoading(null) }
            }},
          ]),
        },
      ],
    },
    {
      title: 'Señales',
      items: [
        {
          icon: 'close-circle-outline',
          label: 'Cancelar señales activas',
          description: 'Marcar todas las señales ACTIVE como CANCELLED',
          danger: true,
          action: () => runAction('cancel-signals', '/admin/signals/cancel-all', 'post', '¿Cancelar todas las señales activas?'),
        },
      ],
    },
    {
      title: 'Sistema',
      items: [
        {
          icon: 'pulse-outline',
          label: 'Estado del sistema',
          description: 'Verificar conectividad con todos los servicios',
          color: '#34d399',
          action: async () => {
            setLoading('health')
            try {
              const { data } = await api.get('/health')
              Alert.alert('Estado del sistema', JSON.stringify(data, null, 2))
            } catch { Alert.alert('Error', 'No se pudo verificar el estado') }
            finally { setLoading(null) }
          },
        },
        {
          icon: 'information-circle-outline',
          label: 'Versión API',
          description: 'Ver información de la versión del servidor',
          color: '#60a5fa',
          action: async () => {
            setLoading('version')
            try {
              const { data } = await api.get('/health')
              Alert.alert('Versión API', `v${data?.version ?? '1.0.0'}\n${data?.environment ?? 'production'}`)
            } catch { Alert.alert('Versión', 'Two-Nick Academy API v1.0.0') }
            finally { setLoading(null) }
          },
        },
      ],
    },
  ]

  return (
    <>
      <Stack.Screen options={{ title: 'Configuración Sistema' }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {sections.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <View key={item.label}>
                  <TouchableOpacity style={styles.settingRow} onPress={item.action} disabled={!!loading}>
                    <View style={[styles.iconBox, { backgroundColor: (item.danger ? Colors.red : (item.color ?? Colors.gold)) + '22' }]}>
                      {loading === item.label ? (
                        <ActivityIndicator size="small" color={item.danger ? Colors.red : (item.color ?? Colors.gold)} />
                      ) : (
                        <Ionicons name={item.icon} size={20} color={item.danger ? Colors.red : (item.color ?? Colors.gold)} />
                      )}
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingLabel, item.danger && { color: Colors.red }]}>{item.label}</Text>
                      <Text style={styles.settingDesc}>{item.description}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                  {idx < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Two-Nick Academy</Text>
          <Text style={styles.footerVersion}>Panel v1.0.0 — Solo visible para CREADOR</Text>
        </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  sectionTitle:  { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  sectionCard:   { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  settingRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  iconBox:       { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingInfo:   { flex: 1 },
  settingLabel:  { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  settingDesc:   { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  divider:       { height: 1, backgroundColor: Colors.border, marginLeft: 66 },
  footer:        { alignItems: 'center', paddingTop: 8, paddingBottom: 24 },
  footerText:    { fontSize: 14, fontWeight: '700', color: Colors.textMuted },
  footerVersion: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
})
