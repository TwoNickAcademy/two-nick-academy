import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { useAuthStore } from '../../src/store/auth.store'

type Role = 'USER' | 'TEACHER' | 'ADMIN' | 'CREATOR'

interface PanelSection {
  title: string
  items: PanelItem[]
  minRole: Role
}

interface PanelItem {
  icon: string
  label: string
  description: string
  route: string
  color: string
  minRole: Role
}

const ROLE_RANK: Record<Role, number> = {
  USER: 0, TEACHER: 1, ADMIN: 2, CREATOR: 3,
}

const SECTIONS: PanelSection[] = [
  {
    title: 'Profesor',
    minRole: 'TEACHER',
    items: [
      { icon: 'calendar',       label: 'Agenda de Clases',         description: 'Crea y edita tu calendario de clases',         route: '/(panel)/schedule',      color: '#60a5fa', minRole: 'TEACHER' },
      { icon: 'trending-up',    label: 'Operativa en Vivo',        description: 'Agenda sesiones de trading en vivo',           route: '/(panel)/live-schedule', color: Colors.gold, minRole: 'TEACHER' },
      { icon: 'people',         label: 'Progreso de Alumnos',      description: 'Visualiza el avance de tus estudiantes',       route: '/(panel)/students',      color: '#34d399', minRole: 'TEACHER' },
    ],
  },
  {
    title: 'Administrador',
    minRole: 'ADMIN',
    items: [
      { icon: 'analytics',      label: 'Señales',                  description: 'Activa/desactiva señales de trading',          route: '/(panel)/signals',       color: '#f59e0b', minRole: 'ADMIN' },
      { icon: 'book',           label: 'Cursos',                   description: 'Gestiona cursos y lecciones',                 route: '/(panel)/courses-admin', color: '#a78bfa', minRole: 'ADMIN' },
      { icon: 'people-circle',  label: 'Usuarios',                 description: 'Ver, editar y gestionar usuarios',            route: '/(panel)/users',         color: '#fb7185', minRole: 'ADMIN' },
      { icon: 'storefront',     label: 'Tienda',                   description: 'Gestiona productos y precios',                route: '/(panel)/store',         color: '#34d399', minRole: 'ADMIN' },
      { icon: 'megaphone',      label: 'Avisos',                   description: 'Crea y gestiona anuncios para usuarios',      route: '/(panel)/announcements', color: '#f97316', minRole: 'ADMIN' },
      { icon: 'bulb',           label: 'Base de Conocimiento',     description: 'Enseña tu metodología al AI Mentor',          route: '/(panel)/knowledge',     color: '#a78bfa', minRole: 'ADMIN' },
      { icon: 'chatbubbles',    label: 'Moderar Chat',             description: 'Limpia salas y elimina mensajes',             route: '/(panel)/chat-mod',      color: '#60a5fa', minRole: 'ADMIN' },
    ],
  },
  {
    title: 'Creador',
    minRole: 'CREATOR',
    items: [
      { icon: 'shield',         label: 'Gestión de Roles',         description: 'Asigna roles a profesores y admins',          route: '/(panel)/roles',         color: Colors.gold, minRole: 'CREATOR' },
      { icon: 'bar-chart',      label: 'Estadísticas',             description: 'Revenue, usuarios y uso de IA',               route: '/(panel)/stats',         color: '#34d399', minRole: 'CREATOR' },
      { icon: 'settings',       label: 'Configuración',            description: 'Ajustes generales del sistema',               route: '/(panel)/settings',      color: '#9ca3af', minRole: 'CREATOR' },
    ],
  },
]

const ROLE_LABELS: Record<Role, { label: string; color: string }> = {
  USER:    { label: 'Usuario',        color: Colors.textMuted },
  TEACHER: { label: 'Profesor',       color: '#60a5fa' },
  ADMIN:   { label: 'Administrador',  color: '#8B5CF6' },
  CREATOR: { label: 'Creador',        color: Colors.gold },
}

export default function PanelIndex() {
  const router = useRouter()
  const { user } = useAuthStore()
  const userRole = (user?.role ?? 'USER') as Role
  const userRank = ROLE_RANK[userRole]
  const roleInfo = ROLE_LABELS[userRole]

  const visibleSections = SECTIONS.filter(s => userRank >= ROLE_RANK[s.minRole])

  return (
    <>
      <Stack.Screen options={{ title: 'Panel de Control', headerBackTitle: 'Perfil' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 20 }}>

          {/* Header rol */}
          <View style={styles.roleCard}>
            <View style={[styles.roleIcon, { backgroundColor: roleInfo.color + '22' }]}>
              <Ionicons name="shield-checkmark" size={28} color={roleInfo.color} />
            </View>
            <View>
              <Text style={styles.roleCardLabel}>Accediendo como</Text>
              <Text style={[styles.roleCardRole, { color: roleInfo.color }]}>{roleInfo.label}</Text>
            </View>
          </View>

          {/* Secciones */}
          {visibleSections.map(section => (
            <View key={section.title}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
              <View style={styles.grid}>
                {section.items
                  .filter(item => userRank >= ROLE_RANK[item.minRole])
                  .map(item => (
                    <TouchableOpacity
                      key={item.route}
                      style={styles.card}
                      onPress={() => router.push(item.route as any)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.cardIcon, { backgroundColor: item.color + '22' }]}>
                        <Ionicons name={item.icon as any} size={24} color={item.color} />
                      </View>
                      <Text style={styles.cardLabel}>{item.label}</Text>
                      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          ))}

        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  roleCard:        { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  roleIcon:        { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roleCardLabel:   { fontSize: 12, color: Colors.textMuted, marginBottom: 2 },
  roleCardRole:    { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  sectionTitle:    { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card:            { width: '47%', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, gap: 8, borderWidth: 1, borderColor: Colors.border },
  cardIcon:        { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardLabel:       { fontSize: 13, fontWeight: '700', color: Colors.text },
  cardDesc:        { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
})
