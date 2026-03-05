import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useState } from 'react'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

const ROOMS = [
  { key: 'GENERAL', label: 'General', color: '#6B7280' },
  { key: 'VIP',     label: 'VIP',     color: '#3B82F6' },
  { key: 'SUPREMO', label: 'Supremo', color: '#8B5CF6' },
  { key: 'MASTER',  label: 'Master',  color: Colors.gold },
]

export default function ChatModPanel() {
  const [clearing, setClearing] = useState<string | null>(null)

  async function clearRoom(room: string) {
    Alert.alert('Limpiar sala', `¿Eliminar todos los mensajes de ${room}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpiar', style: 'destructive', onPress: async () => {
        setClearing(room)
        try {
          await api.delete(`/chat/admin/clear/${room}`)
          Alert.alert('Listo', `Sala ${room} limpiada correctamente`)
        } catch {
          Alert.alert('Error', 'No se pudo limpiar la sala')
        } finally { setClearing(null) }
      }},
    ])
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Moderación Chat' }} />
      <View style={styles.container}>
        <Text style={styles.subtitle}>Limpiar salas eliminará todos los mensajes para los usuarios conectados en tiempo real.</Text>
        {ROOMS.map(room => (
          <View key={room.key} style={styles.card}>
            <View style={[styles.roomIcon, { backgroundColor: room.color + '22' }]}>
              <Ionicons name="chatbubbles" size={22} color={room.color} />
            </View>
            <Text style={[styles.roomLabel, { color: room.color }]}>{room.label}</Text>
            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: room.color }]}
              onPress={() => clearRoom(room.key)}
              disabled={!!clearing}
            >
              {clearing === room.key
                ? <ActivityIndicator size="small" color={room.color} />
                : <Text style={[styles.clearText, { color: room.color }]}>Limpiar</Text>
              }
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background, padding: 16, gap: 12 },
  subtitle:   { fontSize: 13, color: Colors.textMuted, lineHeight: 20, marginBottom: 4 },
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  roomIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roomLabel:  { flex: 1, fontSize: 16, fontWeight: '700' },
  clearBtn:   { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5 },
  clearText:  { fontSize: 13, fontWeight: '700' },
})
