import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../src/constants/colors'
import { api } from '../../src/api/client'

type ProductType = 'COURSE' | 'EBOOK' | 'TOOL' | 'MENTORSHIP' | 'OTHER'

interface Product {
  id: string
  name: string
  description: string | null
  type: ProductType
  price: number
  currency: string
  minLevel: string
  isFeatured: boolean
  imageUrl: string | null
  isAccessible: boolean
}

const TYPE_META: Record<ProductType, { label: string; icon: any; color: string }> = {
  COURSE:     { label: 'Curso',       icon: 'book-outline',          color: '#3B82F6' },
  EBOOK:      { label: 'eBook',       icon: 'document-text-outline', color: '#8B5CF6' },
  TOOL:       { label: 'Herramienta', icon: 'build-outline',         color: '#34d399' },
  MENTORSHIP: { label: 'Mentoría',    icon: 'people-outline',        color: Colors.gold },
  OTHER:      { label: 'Otro',        icon: 'bag-handle-outline',    color: '#9ca3af' },
}

const FILTERS: { key: ProductType | 'ALL'; label: string }[] = [
  { key: 'ALL',        label: 'Todos' },
  { key: 'COURSE',     label: 'Cursos' },
  { key: 'EBOOK',      label: 'eBooks' },
  { key: 'TOOL',       label: 'Herramientas' },
  { key: 'MENTORSHIP', label: 'Mentoría' },
]

const LEVEL_COLORS: Record<string, string> = {
  GENERAL: '#6B7280', VIP: '#3B82F6', SUPREMO: '#8B5CF6', MASTER: Colors.gold,
}

export default function StoreScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<ProductType | 'ALL'>('ALL')
  const [selected, setSelected] = useState<Product | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/store')
      setProducts(Array.isArray(data.data) ? data.data : [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const filtered = filter === 'ALL'
    ? products
    : products.filter(p => p.type === filter)

  const featured = products.filter(p => p.isFeatured && p.isAccessible)

  function formatPrice(p: Product) {
    return p.price === 0 ? 'Gratis' : `$${Number(p.price).toFixed(2)} ${p.currency}`
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Tienda</Text>
        <Ionicons name="bag-handle" size={22} color={Colors.gold} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.gold} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* Destacados */}
          {featured.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⭐ Destacados</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
                {featured.map(p => {
                  const meta = TYPE_META[p.type]
                  return (
                    <TouchableOpacity key={p.id} style={styles.featuredCard} onPress={() => setSelected(p)} activeOpacity={0.85}>
                      <View style={[styles.featuredIcon, { backgroundColor: meta.color + '22' }]}>
                        <Ionicons name={meta.icon} size={28} color={meta.color} />
                      </View>
                      <Text style={styles.featuredName} numberOfLines={2}>{p.name}</Text>
                      <Text style={[styles.featuredPrice, { color: meta.color }]}>{formatPrice(p)}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          )}

          {/* Filtros */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterText, filter === f.key && { color: Colors.background }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Lista */}
          <View style={styles.listContainer}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Sin productos disponibles</Text>
              </View>
            ) : (
              filtered.map(p => {
                const meta = TYPE_META[p.type]
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.card, !p.isAccessible && styles.cardLocked]}
                    onPress={() => setSelected(p)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.cardIcon, { backgroundColor: meta.color + '22' }]}>
                      <Ionicons name={p.isAccessible ? meta.icon : 'lock-closed'} size={22} color={p.isAccessible ? meta.color : Colors.textMuted} />
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.cardRow}>
                        <Text style={[styles.cardName, !p.isAccessible && { color: Colors.textMuted }]} numberOfLines={1}>{p.name}</Text>
                        {p.isFeatured && <Ionicons name="star" size={12} color={Colors.gold} />}
                      </View>
                      <Text style={styles.cardDesc} numberOfLines={1}>{p.description ?? meta.label}</Text>
                      <View style={styles.cardBottom}>
                        <View style={[styles.typeBadge, { backgroundColor: meta.color + '22' }]}>
                          <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        {!p.isAccessible && (
                          <View style={[styles.typeBadge, { backgroundColor: (LEVEL_COLORS[p.minLevel] ?? Colors.gold) + '22' }]}>
                            <Text style={[styles.typeText, { color: LEVEL_COLORS[p.minLevel] ?? Colors.gold }]}>{p.minLevel}+</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.cardPrice, { color: p.isAccessible ? Colors.gold : Colors.textMuted }]}>
                      {formatPrice(p)}
                    </Text>
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal detalle */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selected && (() => {
              const meta = TYPE_META[selected.type]
              return (
                <>
                  <View style={styles.modalHeader}>
                    <View style={[styles.modalIcon, { backgroundColor: meta.color + '22' }]}>
                      <Ionicons name={meta.icon} size={32} color={meta.color} />
                    </View>
                    <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                      <Ionicons name="close" size={22} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                    <Text style={styles.modalTitle}>{selected.name}</Text>

                    <View style={styles.modalBadgeRow}>
                      <View style={[styles.typeBadge, { backgroundColor: meta.color + '22' }]}>
                        <Text style={[styles.typeText, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                      <View style={[styles.typeBadge, { backgroundColor: (LEVEL_COLORS[selected.minLevel] ?? Colors.gold) + '22' }]}>
                        <Text style={[styles.typeText, { color: LEVEL_COLORS[selected.minLevel] ?? Colors.gold }]}>Nivel {selected.minLevel}+</Text>
                      </View>
                      {selected.isFeatured && (
                        <View style={[styles.typeBadge, { backgroundColor: Colors.gold + '22' }]}>
                          <Text style={[styles.typeText, { color: Colors.gold }]}>⭐ Destacado</Text>
                        </View>
                      )}
                    </View>

                    {selected.description ? (
                      <Text style={styles.modalDesc}>{selected.description}</Text>
                    ) : null}
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <Text style={styles.modalPrice}>{formatPrice(selected)}</Text>
                    {selected.isAccessible ? (
                      <TouchableOpacity
                        style={styles.buyBtn}
                        onPress={() => {
                          setSelected(null)
                          // TODO: integrar con flujo de pago Binance Pay
                        }}
                      >
                        <Ionicons name="bag-handle" size={18} color={Colors.background} />
                        <Text style={styles.buyBtnText}>
                          {selected.price === 0 ? 'Acceder gratis' : 'Comprar ahora'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.lockedBtnRow}>
                        <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
                        <Text style={styles.lockedText}>Requiere membresía {selected.minLevel}</Text>
                      </View>
                    )}
                  </View>
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
  container:      { flex: 1, backgroundColor: Colors.background },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title:          { fontSize: 20, fontWeight: '700', color: Colors.text },
  section:        { marginBottom: 8 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, marginBottom: 12 },
  featuredCard:   { width: 160, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  featuredIcon:   { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featuredName:   { fontSize: 13, fontWeight: '700', color: Colors.text, lineHeight: 18 },
  featuredPrice:  { fontSize: 15, fontWeight: '800' },
  filterRow:      { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  filterBtnActive:{ backgroundColor: Colors.gold, borderColor: Colors.gold },
  filterText:     { fontSize: 12, fontWeight: '600', color: Colors.text },
  listContainer:  { paddingHorizontal: 16, gap: 10, paddingBottom: 24 },
  card:           { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardLocked:     { opacity: 0.7 },
  cardIcon:       { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardInfo:       { flex: 1, gap: 3 },
  cardRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName:       { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  cardDesc:       { fontSize: 12, color: Colors.textMuted },
  cardBottom:     { flexDirection: 'row', gap: 6, marginTop: 2 },
  typeBadge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  typeText:       { fontSize: 10, fontWeight: '700' },
  cardPrice:      { fontSize: 14, fontWeight: '800' },
  empty:          { alignItems: 'center', paddingTop: 60 },
  emptyText:      { color: Colors.textMuted, fontSize: 14 },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalIcon:      { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeBtn:       { padding: 4 },
  modalTitle:     { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  modalBadgeRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  modalDesc:      { fontSize: 14, color: Colors.textMuted, lineHeight: 22 },
  modalFooter:    { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 14, gap: 10 },
  modalPrice:     { fontSize: 22, fontWeight: '800', color: Colors.gold },
  buyBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 14, gap: 8 },
  buyBtnText:     { color: Colors.background, fontWeight: '800', fontSize: 16 },
  lockedBtnRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  lockedText:     { fontSize: 14, color: Colors.textMuted, fontWeight: '600' },
})
