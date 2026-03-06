import { openai } from './openai'
import { prisma } from './prisma'
import { KnowledgeCategory } from '@prisma/client'

// ─── Generar embedding para un texto ─────────────────────────────
// Usa text-embedding-3-small (1536 dims, ~0.00002 USD/1K tokens)

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),  // límite del modelo
  })
  return response.data[0]!.embedding
}

// ─── Similitud coseno entre dos vectores ─────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot   += a[i]! * b[i]!
    normA += a[i]! * a[i]!
    normB += b[i]! * b[i]!
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// ─── Buscar chunks relevantes (RAG Retrieval) ─────────────────────
// Para MVP: similitud coseno en JS (válido hasta ~1000 chunks)
// Para escalar: migrar a pgvector con índice HNSW

export async function retrieveRelevantChunks(
  query: string,
  options?: {
    topK?:      number
    category?:  KnowledgeCategory
    threshold?: number
  },
): Promise<Array<{ title: string; content: string; score: number; relatedCourseId?: string | null; relatedLessonId?: string | null }>> {
  const topK      = options?.topK      ?? 4
  const threshold = options?.threshold ?? 0.35

  const queryEmbedding = await generateEmbedding(query)

  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      isActive: true,
      ...(options?.category ? { category: options.category } : {}),
    },
    select: {
      title:           true,
      content:         true,
      embedding:       true,
      relatedCourseId: true,
      relatedLessonId: true,
    },
  })

  const scored = chunks
    .filter((c) => Array.isArray(c.embedding))
    .map((chunk) => ({
      title:           chunk.title,
      content:         chunk.content,
      relatedCourseId: chunk.relatedCourseId,
      relatedLessonId: chunk.relatedLessonId,
      score:           cosineSimilarity(queryEmbedding, chunk.embedding as number[]),
    }))
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored
}

// ─── Construir contexto RAG para el prompt ────────────────────────

export function buildRagContext(
  chunks: Array<{ title: string; content: string; score: number }>,
): string {
  if (chunks.length === 0) return ''

  return chunks
    .map((c, i) => `[Referencia ${i + 1} — ${c.title}]\n${c.content}`)
    .join('\n\n---\n\n')
}
