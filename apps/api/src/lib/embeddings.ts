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
    topK?:      number       // cuántos chunks retornar (default: 4)
    category?:  KnowledgeCategory
    threshold?: number       // similitud mínima (default: 0.35)
  },
): Promise<Array<{ title: string; content: string; score: number }>> {
  const topK      = options?.topK      ?? 4
  const threshold = options?.threshold ?? 0.35

  // 1. Generar embedding de la query
  const queryEmbedding = await generateEmbedding(query)

  // 2. Traer todos los chunks activos (filtrar null embeddings en JS)
  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      isActive: true,
      ...(options?.category ? { category: options.category } : {}),
    },
    select: {
      title:     true,
      content:   true,
      embedding: true,
    },
  })

  // 3. Calcular similitud para cada chunk (ignorar los sin embedding)
  const scored = chunks
    .filter((c) => Array.isArray(c.embedding))
    .map((chunk) => ({
      title:   chunk.title,
      content: chunk.content,
      score:   cosineSimilarity(
        queryEmbedding,
        chunk.embedding as number[],
      ),
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
