'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Brain, Trash2, Zap } from 'lucide-react'
import { Header }    from '@/components/layout/Header'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge }     from '@/components/ui/Badge'
import { api, apiGet } from '@/lib/api'

type KnowledgeCategory = 'SMC' | 'ICT' | 'RISK_MANAGEMENT' | 'PSYCHOLOGY' | 'METHODOLOGY' | 'PATTERNS'

interface Chunk {
  id:        string
  title:     string
  content:   string
  category:  KnowledgeCategory
  tags:      string[]
  isActive:  boolean
  embedding: boolean   // true = tiene embedding generado
  createdAt: string
}

const CATEGORIES: KnowledgeCategory[] = ['SMC','ICT','RISK_MANAGEMENT','PSYCHOLOGY','METHODOLOGY','PATTERNS']
const CAT_COLOR: Record<KnowledgeCategory, 'blue'|'orange'|'red'|'green'|'gold'|'gray'> = {
  SMC:             'blue',
  ICT:             'orange',
  RISK_MANAGEMENT: 'red',
  PSYCHOLOGY:      'green',
  METHODOLOGY:     'gold',
  PATTERNS:        'gray',
}

export default function KnowledgePage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: 'METHODOLOGY' as KnowledgeCategory, tags: '' })

  const { data: chunks, isLoading, refetch } = useQuery({
    queryKey: ['knowledge'],
    queryFn:  () => apiGet<{ data: Chunk[]; total: number }>('/knowledge?limit=100'),
  })

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      api.post('/knowledge', {
        title:    body.title,
        content:  body.content,
        category: body.category,
        tags:     body.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge'] })
      setShowCreate(false)
      setForm({ title: '', content: '', category: 'METHODOLOGY', tags: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/knowledge/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  })

  const embedMutation = useMutation({
    mutationFn: (id: string) => api.post(`/knowledge/${id}/embed`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge'] }),
  })

  const list = chunks?.data ?? []

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header
        title="Base de Conocimiento"
        subtitle={`${chunks?.total ?? 0} chunks — contexto del AI Mentor`}
        onRefresh={() => refetch()}
      />

      <div className="flex-1 p-6 space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setShowCreate((v) => !v)} className="btn-gold">
            <Plus size={15} />
            Nuevo chunk
          </button>
        </div>

        {showCreate && (
          <GlassCard gold className="animate-slide-in">
            <p className="text-sm font-semibold text-white mb-4">Agregar Chunk de Conocimiento</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Título</label>
                <input className="input-glass" placeholder="Ej: Concepto BOS en SMC" value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contenido</label>
                <textarea className="input-glass resize-none" rows={5}
                  placeholder="Explica el concepto en detalle..."
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Categoría</label>
                  <select className="input-glass" value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as KnowledgeCategory }))}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tags (separados por coma)</label>
                  <input className="input-glass" placeholder="bos, smc, liquidity" value={form.tags}
                    onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending} className="btn-gold">
                {createMutation.isPending ? 'Guardando...' : 'Guardar y generar embedding'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancelar</button>
            </div>
          </GlassCard>
        )}

        {/* Grid de chunks */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <GlassCard className="flex flex-col items-center gap-3 py-20">
            <Brain size={32} className="text-slate-600" />
            <p className="text-sm text-slate-500">Base de conocimiento vacía</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {list.map((chunk) => (
              <GlassCard key={chunk.id} className="flex flex-col gap-2 glass-hover">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-tight line-clamp-2">{chunk.title}</p>
                  <div className="flex gap-1 shrink-0">
                    {!chunk.embedding && (
                      <button
                        onClick={() => embedMutation.mutate(chunk.id)}
                        title="Generar embedding"
                        className="p-1 rounded hover:bg-gold/10 text-gold/50 hover:text-gold transition-colors"
                      >
                        <Zap size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(chunk.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 line-clamp-3 flex-1">{chunk.content}</p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge label={chunk.category} variant={CAT_COLOR[chunk.category]} />
                  {chunk.embedding && (
                    <span className="text-[10px] text-emerald-500 flex items-center gap-0.5">
                      <Zap size={9} fill="currentColor" /> embedding
                    </span>
                  )}
                </div>

                {chunk.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {chunk.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
