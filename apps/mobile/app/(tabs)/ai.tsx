import { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { api } from '../../src/api/client'
import { useAuthStore } from '../../src/store/auth.store'
import { Colors } from '../../src/constants/colors'
import { API_BASE_URL } from '../../src/constants/api'
import * as SecureStore from 'expo-secure-store'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function AIScreen() {
  const { user }   = useAuthStore()
  const [messages,  setMessages]  = useState<Message[]>([])
  const [input,     setInput]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [quota,     setQuota]     = useState<{ remaining: number | null; unlimited: boolean } | null>(null)
  const flatRef = useRef<FlatList>(null)

  useEffect(() => {
    loadQuota()
    // Mensaje de bienvenida
    setMessages([{
      id: '0',
      role: 'assistant',
      content: '¡Hola! Soy tu AI Mentor de Two-Nick Academy. Puedo ayudarte con análisis de gráficos, estrategias SMC/ICT y gestión de riesgo. ¿En qué te puedo ayudar hoy?',
    }])
  }, [])

  async function loadQuota() {
    try {
      const { data } = await api.get('/ai/quota')
      setQuota(data.data)
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim() || sending) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    // Mensaje placeholder del asistente
    const assistantId = (Date.now() + 1).toString()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const token = await SecureStore.getItemAsync('accessToken')
      const response = await fetch(`${API_BASE_URL}/ai/chat`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMsg.content, sessionId }),
      })

      if (!response.body) throw new Error('No stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))

        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6))
            if (json.type === 'session') setSessionId(json.sessionId)
            if (json.type === 'chunk')   fullText += json.content
            if (json.type === 'done')    loadQuota()
            if (json.error)              throw new Error(json.message)

            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: fullText } : m),
            )
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId
          ? { ...m, content: 'Error al conectar con el mentor. Intenta de nuevo.' }
          : m,
        ),
      )
    } finally {
      setSending(false)
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🤖 AI Mentor</Text>
          {quota && (
            <Text style={styles.quota}>
              {quota.unlimited ? '∞ ilimitado' : `${quota.remaining ?? 0} consultas restantes`}
            </Text>
          )}
        </View>
      </View>

      {/* Mensajes */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: msg }) => (
          <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
            {msg.role === 'assistant' && (
              <Text style={styles.bubbleLabel}>🤖 Mentor</Text>
            )}
            {msg.content === '' && msg.role === 'assistant' ? (
              <ActivityIndicator color={Colors.gold} size="small" />
            ) : (
              <Text style={[styles.bubbleText, msg.role === 'user' && styles.bubbleTextUser]}>
                {msg.content}
              </Text>
            )}
          </View>
        )}
      />

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Escribe tu pregunta..."
            placeholderTextColor={Colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendIcon}>{sending ? '⏳' : '➤'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  header:           { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:            { fontSize: 18, fontWeight: '700', color: Colors.text },
  quota:            { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  messageList:      { padding: 16, gap: 12 },
  bubble:           { maxWidth: '85%', borderRadius: 14, padding: 12 },
  bubbleUser:       { backgroundColor: Colors.gold, alignSelf: 'flex-end' },
  bubbleAssistant:  { backgroundColor: Colors.card, alignSelf: 'flex-start', borderWidth: 1, borderColor: Colors.border },
  bubbleLabel:      { fontSize: 11, color: Colors.gold, fontWeight: '700', marginBottom: 4 },
  bubbleText:       { fontSize: 14, color: Colors.text, lineHeight: 20 },
  bubbleTextUser:   { color: '#000', fontWeight: '500' },
  inputRow:         { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'flex-end' },
  input:            { flex: 1, backgroundColor: Colors.card, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: Colors.text, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn:          { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:  { opacity: 0.4 },
  sendIcon:         { fontSize: 18 },
})
