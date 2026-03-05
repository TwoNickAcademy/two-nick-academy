import { useEffect, useState, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { io, Socket } from 'socket.io-client'
import { Colors } from '../../src/constants/colors'
import { SOCKET_URL } from '../../src/constants/api'
import { getAccessToken } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth.store'
import { api } from '../../src/api/client'

interface ChatMessage {
  id: string
  content: string
  userId: string
  displayName: string
  level: string
  createdAt: string
}

const EMOJIS = [
  '👍','❤️','🔥','😂','🚀','💰','📈','📉','💎','🎯',
  '✅','⚡','🙌','😎','🤝','💪','🧠','⚠️','👀','🎉',
]

const LEVEL_COLOR: Record<string, string> = {
  GENERAL: Colors.levels?.GENERAL ?? '#9ca3af',
  VIP:     Colors.levels?.VIP     ?? Colors.gold,
  SUPREMO: Colors.levels?.SUPREMO ?? '#a78bfa',
  MASTER:  Colors.levels?.MASTER  ?? '#f87171',
}

const ROOMS = [
  { key: 'GENERAL',  label: 'General' },
  { key: 'VIP',      label: 'VIP' },
  { key: 'SUPREMO',  label: 'Supremo' },
  { key: 'MASTER',   label: 'Master' },
]

export default function ChatScreen() {
  const { user } = useAuthStore()
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [sending, setSending]       = useState(false)
  const [activeRoom, setActiveRoom] = useState('GENERAL')
  const [showEmojis, setShowEmojis] = useState(false)
  const [typing, setTyping]         = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const flatRef   = useRef<FlatList>(null)
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cargar historial del room
  const loadHistory = useCallback(async (room: string) => {
    setLoading(true)
    setMessages([])
    try {
      const { data } = await api.get(`/chat/${room}/messages?limit=50`)
      const history = Array.isArray(data.data) ? data.data : []
      setMessages(history.reverse()) // API devuelve DESC, invertimos
    } catch {}
    finally { setLoading(false) }
  }, [])

  // Conectar socket
  useEffect(() => {
    let mounted = true

    async function connect() {
      const token = await getAccessToken()
      if (!token || !mounted) return

      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      })

      socketRef.current = socket

      socket.on('connect', () => {
        socket.emit('chat:join', { roomLevel: activeRoom })
      })

      socket.on('chat:message', (msg: ChatMessage) => {
        if (!mounted) return
        setMessages(prev => [...prev, msg])
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100)
      })

      socket.on('chat:typing', ({ userId: typingUserId }: { userId: string }) => {
        if (!mounted) return
        setTyping(typingUserId === user?.id ? null : 'Alguien')
        if (typingTimer.current) clearTimeout(typingTimer.current)
        typingTimer.current = setTimeout(() => setTyping(null), 3000)
      })

      socket.on('chat:cleared', ({ roomLevel }: { roomLevel: string }) => {
        if (!mounted) return
        if (roomLevel === activeRoom) setMessages([])
      })

      socket.on('connect_error', () => {
        // Silencioso — el historial ya está cargado
      })
    }

    connect()
    return () => {
      mounted = false
      socketRef.current?.disconnect()
      socketRef.current = null
      if (typingTimer.current) clearTimeout(typingTimer.current)
    }
  }, [activeRoom])

  // Cambiar de room
  useEffect(() => {
    loadHistory(activeRoom)
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:join', { roomLevel: activeRoom })
    }
  }, [activeRoom, loadHistory])

  function handleTyping() {
    socketRef.current?.emit('chat:typing', { roomLevel: activeRoom })
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      socketRef.current?.emit('chat:send', { roomLevel: activeRoom, content: text })
    } catch {
      Alert.alert('Error', 'No se pudo enviar el mensaje')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const isMyMessage = (msg: ChatMessage) => msg.userId === user?.id

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = isMyMessage(item)
    const levelColor = LEVEL_COLOR[item.level] ?? Colors.textMuted

    return (
      <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
        {!isMine && (
          <View style={[styles.avatar, { backgroundColor: levelColor + '33' }]}>
            <Text style={[styles.avatarText, { color: levelColor }]}>
              {item.displayName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
          {!isMine && (
            <Text style={[styles.senderName, { color: levelColor }]}>{item.displayName}</Text>
          )}
          <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.content}</Text>
          <Text style={[styles.msgTime, isMine && styles.msgTimeMine]}>
            {new Date(item.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
      </View>

      {/* Room tabs */}
      <View style={styles.roomTabs}>
        {ROOMS.map(room => (
          <TouchableOpacity
            key={room.key}
            style={[styles.roomTab, activeRoom === room.key && styles.roomTabActive]}
            onPress={() => setActiveRoom(room.key)}
          >
            <Text style={[
              styles.roomTabText,
              activeRoom === room.key && { color: LEVEL_COLOR[room.key] },
            ]}>
              {room.label}
            </Text>
            {activeRoom === room.key && (
              <View style={[styles.roomTabDot, { backgroundColor: LEVEL_COLOR[room.key] }]} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Mensajes */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.gold} />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Ionicons name="chatbubbles-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyChatText}>Sé el primero en escribir</Text>
              </View>
            }
          />
        )}

        {/* Typing indicator */}
        {typing && (
          <View style={styles.typingBar}>
            <Text style={styles.typingText}>{typing} está escribiendo...</Text>
          </View>
        )}

        {/* Barra de emojis */}
        {showEmojis && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.emojiBar}
            contentContainerStyle={styles.emojiBarContent}
            keyboardShouldPersistTaps="always"
          >
            {EMOJIS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiBtn}
                onPress={() => setInput(prev => prev + emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.emojiToggle, showEmojis && styles.emojiToggleActive]}
            onPress={() => setShowEmojis(v => !v)}
          >
            <Text style={styles.emojiToggleText}>😊</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={text => { setInput(text); handleTyping() }}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
            onFocus={() => setShowEmojis(false)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Ionicons name="send" size={18} color={Colors.background} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  flex:           { flex: 1 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:         { paddingHorizontal: 20, paddingVertical: 14 },
  title:          { fontSize: 20, fontWeight: '700', color: Colors.text },
  roomTabs:       { flexDirection: 'row', paddingHorizontal: 12, gap: 4, marginBottom: 4 },
  roomTab:        { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, gap: 4 },
  roomTabActive:  { backgroundColor: Colors.surface },
  roomTabText:    { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  roomTabDot:     { width: 4, height: 4, borderRadius: 2 },
  messagesList:   { padding: 12, gap: 10, flexGrow: 1 },
  msgRow:         { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  msgRowMine:     { flexDirection: 'row-reverse' },
  avatar:         { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontSize: 13, fontWeight: '700' },
  bubble:         { maxWidth: '75%', borderRadius: 16, padding: 10, gap: 2 },
  bubbleOther:    { backgroundColor: Colors.surface, borderBottomLeftRadius: 4 },
  bubbleMine:     { backgroundColor: Colors.gold, borderBottomRightRadius: 4 },
  senderName:     { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  msgText:        { fontSize: 14, color: Colors.text, lineHeight: 20 },
  msgTextMine:    { color: Colors.background },
  msgTime:        { fontSize: 10, color: Colors.textMuted, alignSelf: 'flex-end' },
  msgTimeMine:    { color: Colors.background + 'aa' },
  typingBar:      { paddingHorizontal: 16, paddingVertical: 4 },
  typingText:     { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },
  emojiBar:            { borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, maxHeight: 48 },
  emojiBarContent:     { paddingHorizontal: 8, alignItems: 'center', gap: 4 },
  emojiBtn:            { padding: 6 },
  emoji:               { fontSize: 22 },
  inputBar:            { flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  emojiToggle:         { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  emojiToggleActive:   { backgroundColor: Colors.gold + '33' },
  emojiToggleText:     { fontSize: 20 },
  input:               { flex: 1, backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 14, maxHeight: 100 },
  sendBtn:             { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:     { opacity: 0.4 },
  emptyChat:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyChatText:  { color: Colors.textMuted, fontSize: 14 },
})
