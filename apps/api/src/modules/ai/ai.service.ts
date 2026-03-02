import { randomUUID } from 'crypto'
import { openai } from '../../lib/openai'
import { prisma } from '../../lib/prisma'
import { redis, AI_QUOTA } from '../../lib/redis'
import { retrieveRelevantChunks, buildRagContext } from '../../lib/embeddings'
import { AI_QUOTA_BY_LEVEL } from './ai.schema'
import { MembershipLevel } from '@prisma/client'
import type { Response } from 'express'

// ─── Tipos internos ───────────────────────────────────────────────

interface ChatParams {
  userId:       string
  userLevel:    MembershipLevel
  message:      string
  sessionId?:   string
  imageBase64?: string      // imagen del gráfico (opcional)
  imageMime?:   string      // 'image/jpeg' | 'image/png' | 'image/webp'
}

// ─── System Prompt base de la academia ───────────────────────────

const SYSTEM_PROMPT = `Eres el AI Mentor de Two-Nick Academy, una academia de trading de élite.
Tu rol es analizar gráficos y responder preguntas de trading basándote EXCLUSIVAMENTE en la metodología de la academia.

PRINCIPIOS CLAVE:
- Enseñas Smart Money Concept (SMC) e ICT (Inner Circle Trader)
- Identificas Order Blocks, Fair Value Gaps, Liquidity sweeps, BOS/CHoCH
- Gestionas el riesgo con máximo 1-2% por operación
- Operas en FOREX, commodities (XAUUSD), índices y cripto
- Tus respuestas son concisas, directas y educativas
- Si el usuario sube un gráfico, primero describes lo que ves y luego analizas

FORMATO:
- Usa secciones cortas con bullets cuando sea útil
- Máximo 3-4 párrafos por respuesta
- Si no tienes suficiente información visual, pide aclaración`

// ─── Verificar y consumir cuota de IA ────────────────────────────

export async function checkAndConsumeQuota(
  userId: string,
  userLevel: MembershipLevel,
): Promise<{ allowed: boolean; remaining: number | null }> {
  const limit = AI_QUOTA_BY_LEVEL[userLevel]

  // Ilimitado para SUPREMO y MASTER
  if (limit === -1) return { allowed: true, remaining: null }

  const key   = `user:${userId}:ai_quota`
  const used  = parseInt((await redis.get(key)) ?? '0', 10)

  if (used >= limit) {
    return { allowed: false, remaining: 0 }
  }

  // Incrementar contador con TTL al fin del mes
  const count = await redis.incr(key)
  if (count === 1) {
    const now        = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const ttl        = Math.floor((endOfMonth.getTime() - now.getTime()) / 1000)
    await redis.expire(key, ttl)
  }

  return { allowed: true, remaining: limit - count }
}

// ─── Chat con streaming SSE ───────────────────────────────────────

export async function streamChat(params: ChatParams, res: Response): Promise<void> {
  const { userId, userLevel, message, imageBase64, imageMime } = params
  const sessionId = params.sessionId ?? randomUUID()

  // 1. Verificar cuota
  const quota = await checkAndConsumeQuota(userId, userLevel)
  if (!quota.allowed) {
    res.write(`data: ${JSON.stringify({
      error: true,
      message: `Alcanzaste tu límite de ${AI_QUOTA_BY_LEVEL[userLevel]} consultas este mes. Actualiza tu plan para obtener más.`,
      upgradeRequired: true,
    })}\n\n`)
    res.end()
    return
  }

  // 2. Recuperar historial de la sesión (últimos 6 mensajes para contexto)
  const history = await prisma.aiInteraction.findMany({
    where:   { userId, sessionId },
    orderBy: { createdAt: 'asc' },
    take:    6,
    select:  { role: true, contentText: true },
  })

  // 3. RAG — buscar chunks relevantes de la metodología
  let ragContext = ''
  try {
    const chunks = await retrieveRelevantChunks(message, { topK: 3 })
    ragContext   = buildRagContext(chunks)
  } catch {
    // RAG falla silenciosamente (sin chunks el mentor igual responde)
    console.warn('[AI] RAG retrieval falló, continuando sin contexto')
  }

  // 4. Construir el array de mensajes para GPT-4o
  const systemContent = ragContext
    ? `${SYSTEM_PROMPT}\n\n--- METODOLOGÍA DE REFERENCIA ---\n${ragContext}`
    : SYSTEM_PROMPT

  // Historial de la sesión formateado para OpenAI
  const conversationHistory = history.map((h) => ({
    role:    h.role.toLowerCase() as 'user' | 'assistant',
    content: h.contentText ?? '',
  }))

  // Mensaje actual del usuario (con imagen si aplica)
  type UserContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' | 'auto' } }

  const userContent: UserContentPart[] = [{ type: 'text', text: message }]

  if (imageBase64 && imageMime) {
    userContent.unshift({
      type:      'image_url',
      image_url: {
        url:    `data:${imageMime};base64,${imageBase64}`,
        detail: 'high',
      },
    })
  }

  // 5. Guardar mensaje del usuario en DB
  await prisma.aiInteraction.create({
    data: {
      userId,
      sessionId,
      role:        'USER',
      contentText: message,
      imageUrl:    imageBase64 ? `[chart-image]` : null,
    },
  })

  // 6. Llamar a GPT-4o con streaming
  let fullResponse = ''
  let tokensUsed   = 0

  try {
    const stream = await openai.chat.completions.create({
      model:       'gpt-4o',
      stream:      true,
      max_tokens:  600,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemContent },
        ...conversationHistory,
        { role: 'user',   content: userContent as any },
      ],
    })

    // Emitir metadatos de la sesión primero
    res.write(`data: ${JSON.stringify({ sessionId, type: 'session' })}\n\n`)

    // Streamear cada chunk de texto
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        fullResponse += delta
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: delta })}\n\n`)
      }
      // Capturar usage si viene en el último chunk
      if (chunk.usage) {
        tokensUsed = chunk.usage.total_tokens
      }
    }

    // Señal de fin de stream
    res.write(`data: ${JSON.stringify({ type: 'done', remaining: quota.remaining })}\n\n`)
    res.end()

    // 7. Guardar respuesta del asistente en DB (sin bloquear)
    prisma.aiInteraction.create({
      data: {
        userId,
        sessionId,
        role:        'ASSISTANT',
        contentText: fullResponse,
        tokensUsed,
        modelUsed:   'gpt-4o',
      },
    }).catch((err) => console.error('[AI] Error guardando respuesta:', err))

  } catch (err) {
    console.error('[AI] Error en streaming GPT-4o:', err)
    res.write(`data: ${JSON.stringify({ error: true, message: 'Error del servidor de IA. Intenta de nuevo.' })}\n\n`)
    res.end()
  }
}

// ─── Historial de sesiones del usuario ───────────────────────────

export async function getSessions(userId: string) {
  // Traer el primer mensaje de cada sesión
  const interactions = await prisma.aiInteraction.findMany({
    where:    { userId, role: 'USER' },
    orderBy:  { createdAt: 'desc' },
    distinct: ['sessionId'],
    select: {
      sessionId:   true,
      contentText: true,
      createdAt:   true,
    },
    take: 20,
  })

  return interactions.map((i) => ({
    sessionId:   i.sessionId,
    preview:     (i.contentText ?? '').slice(0, 80),
    createdAt:   i.createdAt,
  }))
}

// ─── Mensajes de una sesión ───────────────────────────────────────

export async function getSessionMessages(userId: string, sessionId: string) {
  const messages = await prisma.aiInteraction.findMany({
    where:   { userId, sessionId },
    orderBy: { createdAt: 'asc' },
    select: {
      id:          true,
      role:        true,
      contentText: true,
      imageUrl:    true,
      tokensUsed:  true,
      createdAt:   true,
    },
  })

  return messages
}

// ─── Eliminar sesión ──────────────────────────────────────────────

export async function deleteSession(userId: string, sessionId: string) {
  const deleted = await prisma.aiInteraction.deleteMany({
    where: { userId, sessionId },
  })
  return { deleted: deleted.count }
}

// ─── Cuota restante del usuario ───────────────────────────────────

export async function getQuotaStatus(userId: string, userLevel: MembershipLevel) {
  const limit = AI_QUOTA_BY_LEVEL[userLevel]
  if (limit === -1) {
    return { unlimited: true, used: null, limit: null, remaining: null }
  }

  const key  = `user:${userId}:ai_quota`
  const used = parseInt((await redis.get(key)) ?? '0', 10)

  return {
    unlimited: false,
    used,
    limit,
    remaining: Math.max(0, limit - used),
  }
}
