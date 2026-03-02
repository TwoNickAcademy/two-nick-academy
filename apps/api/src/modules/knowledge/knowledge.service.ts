import { prisma } from '../../lib/prisma'
import { generateEmbedding } from '../../lib/embeddings'
import { KnowledgeCategory } from '@prisma/client'
import type { AddKnowledgeInput } from '../ai/ai.schema'

// ─── Agregar chunk al knowledge base ─────────────────────────────

export async function addChunk(input: AddKnowledgeInput) {
  // Generar embedding del contenido
  const embeddingText = `${input.title}\n\n${input.content}`
  const embedding     = await generateEmbedding(embeddingText)

  const chunk = await prisma.knowledgeChunk.create({
    data: {
      title:     input.title,
      content:   input.content,
      category:  input.category as KnowledgeCategory,
      tags:      input.tags,
      embedding: embedding,  // JSON array de floats
    },
  })

  return { id: chunk.id, title: chunk.title, category: chunk.category }
}

// ─── Listar chunks ────────────────────────────────────────────────

export async function listChunks(category?: KnowledgeCategory) {
  return prisma.knowledgeChunk.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id:        true,
      title:     true,
      category:  true,
      tags:      true,
      isActive:  true,
      createdAt: true,
    },
  })
}

// ─── Eliminar chunk ───────────────────────────────────────────────

export async function deleteChunk(id: string) {
  return prisma.knowledgeChunk.update({
    where: { id },
    data:  { isActive: false },
  })
}

// ─── Re-generar embedding de un chunk ────────────────────────────
// Útil cuando se actualiza el contenido

export async function reembedChunk(id: string) {
  const chunk = await prisma.knowledgeChunk.findUnique({ where: { id } })
  if (!chunk) throw Object.assign(new Error('Chunk no encontrado'), { statusCode: 404 })

  const embeddingText = `${chunk.title}\n\n${chunk.content}`
  const embedding     = await generateEmbedding(embeddingText)

  await prisma.knowledgeChunk.update({
    where: { id },
    data:  { embedding },
  })

  return { id, message: 'Embedding regenerado' }
}
