import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, ActivityIndicator,
  Alert, Modal, Linking,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../src/api/client'
import { Colors } from '../../src/constants/colors'

interface Event {
  id: string
  title: string
  description: string | null
  type: 'WEBINAR' | 'WORKSHOP' | 'MENTORSHIP' | 'LIVE_TRADING'
  level: string
  startAt: string
  endAt: string | null
  meetUrl: string | null
  isAttending: boolean
  attendeeCount: number
  isLocked: boolean
}

const TYPE_CONFIG = {
  WEBINAR:      { label: 'Webinar',       icon: 'videocam',          color: '#60a5fa' },
  WORKSHOP:     { label: 'Workshop',      icon: 'build',             color: '#a78bfa' },
  MENTORSHIP:   { label: 'Mentoría',      icon: 'people',            color: '#34d399' },
  LIVE_TRADING: { label: 'Live Trading',  icon: 'trending-up',       color: Colors.gold },
}

const LEVEL_COLOR: Record<string, string> = {
  GENERAL: Colors.levels?.GENERAL ?? '#9ca3af',
  VIP:     Colors.levels?.VIP     ?? Colors.gold,
  SUPREMO: Colors.levels?.SUPREMO ?? '#a78bfa',
  MASTER:  Colors.levels?.MASTER  ?? '#f87171',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

function isUpcoming(iso: string) {
  return new Date(iso) > new Date()
}

export default function EventsScreen() {
  const [events, setEvents]       = useState<Event[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected]   = useState<Event | null>(null)
  const [rsvping, setRsvping]     = useState(false)

  const loadEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/events')
      setEvents(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  async function onRefresh() {
    setRefreshing(true)
    await loadEvents()
    setRefreshing(false)
  }

  async function handleRSVP(event: Event) {
    if (event.isLocked) {
      Alert.alert('Acceso restringido', `Necesitas membresía ${event.level} para inscribirte.`)
      return
    }
    setRsvping(true)
    try {
      if (event.isAttending) {
        await api.delete(`/events/${event.id}/rsvp`)
      } else {
        await api.post(`/events/${event.id}/rsvp`)
      }
      setEvents(prev => prev.map(e =>
        e.id === event.id
          ? {
              ...e,
              isAttending: !e.isAttending,
              attendeeCount: e.isAttending ? e.attendeeCount - 1 : e.attendeeCount + 1,
            }
          : e
      ))
      if (selected?.id === event.id) {
        setSelected(prev => prev ? {
          ...prev,
          isAttending: !prev.isAttending,
          attendeeCount: prev.isAttending ? prev.attendeeCount - 1 : prev.attendeeCount + 1,
        } : prev)
      }
    } catch {
      Alert.alert('Error', 'No se pudo procesar la inscripción')
    } finally {
      setRsvping(false)
    }
  }

  const upcoming = events.filter(e => isUpcoming(e.startAt))
  const past     = events.filter(e => !isUpcoming(e.startAt))

  const EventCard = ({ event }: { event: Event }) => {
    const cfg = TYPE_CONFIG[event.type]
    const upcoming = isUpcoming(event.startAt)

    return (
      <TouchableOpacity
        style={[styles.card, event.isLocked && styles.cardLocked]}
        onPress={() => setSelected(event)}
        activeOpacity={0.85}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.typeIcon, { backgroundColor: cfg.color + '22' }]}>
            <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: cfg.color + '22' }]}>
              <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLOR[event.level] + '22' }]}>
              <Text style={[styles.levelText, { color: LEVEL_COLOR[event.level] }]}>{event.level}</Text>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>

          <View style={styles.cardMeta}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.cardMetaText}>{formatDate(event.startAt)} · {formatTime(event.startAt)}</Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.attendees}>
              <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.attendeesText}>{event.attendeeCount}</Text>
            </View>

            {upcoming && !event.isLocked && (
              <TouchableOpacity
                style={[styles.rsvpBtn, event.isAttending && styles.rsvpBtnActive]}
                onPress={() => handleRSVP(event)}
              >
                <Text style={[styles.rsvpBtnText, event.isAttending && styles.rsvpBtnTextActive]}>
                  {event.isAttending ? '✓ Inscrito' : 'Inscribirme'}
                </Text>
              </TouchableOpacity>
            )}

            {event.isLocked && (
              <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Eventos</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{upcoming.length} próximos</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        >
          {upcoming.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Próximos</Text>
              {upcoming.map(e => <EventCard key={e.id} event={e} />)}
            </>
          )}

          {past.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Pasados</Text>
              {past.map(e => <EventCard key={e.id} event={e} />)}
            </>
          )}

          {events.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No hay eventos programados</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal detalle */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selected && (() => {
              const cfg = TYPE_CONFIG[selected.type]
              const upcoming = isUpcoming(selected.startAt)
              return (
                <>
                  <View style={styles.modalHeader}>
                    <View style={[styles.typeIcon, { backgroundColor: cfg.color + '22' }]}>
                      <Ionicons name={cfg.icon as any} size={22} color={cfg.color} />
                    </View>
                    <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                      <Ionicons name="close" size={22} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalTitle}>{selected.title}</Text>
                  {selected.description && (
                    <Text style={styles.modalDesc}>{selected.description}</Text>
                  )}

                  <View style={styles.modalMeta}>
                    <View style={styles.modalMetaRow}>
                      <Ionicons name="calendar" size={16} color={Colors.gold} />
                      <Text style={styles.modalMetaText}>
                        {formatDate(selected.startAt)} a las {formatTime(selected.startAt)}
                      </Text>
                    </View>
                    {selected.endAt && (
                      <View style={styles.modalMetaRow}>
                        <Ionicons name="time" size={16} color={Colors.gold} />
                        <Text style={styles.modalMetaText}>Hasta las {formatTime(selected.endAt)}</Text>
                      </View>
                    )}
                    <View style={styles.modalMetaRow}>
                      <Ionicons name="people" size={16} color={Colors.gold} />
                      <Text style={styles.modalMetaText}>{selected.attendeeCount} inscritos</Text>
                    </View>
                  </View>

                  {upcoming && !selected.isLocked && (
                    <TouchableOpacity
                      style={[styles.modalRsvpBtn, selected.isAttending && styles.modalRsvpBtnActive]}
                      onPress={() => handleRSVP(selected)}
                      disabled={rsvping}
                    >
                      {rsvping ? (
                        <ActivityIndicator size="small" color={Colors.background} />
                      ) : (
                        <Text style={styles.modalRsvpText}>
                          {selected.isAttending ? 'Cancelar inscripción' : 'Inscribirme al evento'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {selected.isAttending && selected.meetUrl && upcoming && (
                    <TouchableOpacity
                      style={styles.joinBtn}
                      onPress={() => Linking.openURL(selected.meetUrl!)}
                    >
                      <Ionicons name="videocam" size={18} color={Colors.background} />
                      <Text style={styles.joinBtnText}>Unirse al evento</Text>
                    </TouchableOpacity>
                  )}
                </>
              )
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.background },
  header:             { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  title:              { fontSize: 20, fontWeight: '700', color: Colors.text, flex: 1 },
  countBadge:         { backgroundColor: Colors.gold + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  countText:          { color: Colors.gold, fontSize: 12, fontWeight: '600' },
  sectionTitle:       { fontSize: 13, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  card:               { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardLocked:         { opacity: 0.65 },
  cardLeft:           { justifyContent: 'flex-start' },
  typeIcon:           { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardContent:        { flex: 1, gap: 6 },
  cardTopRow:         { flexDirection: 'row', gap: 6 },
  typeBadge:          { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  typeBadgeText:      { fontSize: 10, fontWeight: '700' },
  levelBadge:         { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  levelText:          { fontSize: 10, fontWeight: '700' },
  cardTitle:          { fontSize: 14, fontWeight: '600', color: Colors.text, lineHeight: 20 },
  cardMeta:           { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText:       { fontSize: 12, color: Colors.textMuted },
  cardFooter:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  attendees:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendeesText:      { fontSize: 12, color: Colors.textMuted },
  rsvpBtn:            { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.gold, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5 },
  rsvpBtnActive:      { backgroundColor: Colors.gold },
  rsvpBtnText:        { fontSize: 12, fontWeight: '600', color: Colors.gold },
  rsvpBtnTextActive:  { color: Colors.background },
  empty:              { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText:          { color: Colors.textMuted, fontSize: 15 },
  // Modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent:       { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 14 },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn:           { padding: 4 },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalDesc:          { fontSize: 14, color: Colors.textMuted, lineHeight: 22 },
  modalMeta:          { gap: 10, backgroundColor: Colors.background, borderRadius: 12, padding: 14 },
  modalMetaRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalMetaText:      { fontSize: 14, color: Colors.text },
  modalRsvpBtn:       { backgroundColor: Colors.gold, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalRsvpBtnActive: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  modalRsvpText:      { color: Colors.background, fontWeight: '700', fontSize: 15 },
  joinBtn:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 14 },
  joinBtnText:        { color: Colors.background, fontWeight: '700', fontSize: 15 },
})
