'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, TrendingUp, TrendingDown, Filter } from 'lucide-react'
import { Header }     from '@/components/layout/Header'
import { GlassCard }  from '@/components/ui/GlassCard'
import { SignalBadge } from '@/components/ui/Badge'
import { api, apiGet } from '@/lib/api'

type SignalStatus    = 'ACTIVE' | 'WIN' | 'LOSS' | 'CLOSED' | 'CANCELLED'
type SignalDirection = 'BUY' | 'SELL'
type SignalMarket    = 'FOREX' | 'CRYPTO' | 'INDICES' | 'COMMODITIES'

interface Signal {
  id:         string
  asset:      string
  direction:  SignalDirection
  market:     SignalMarket
  entryPrice: number
  stopLoss:   number
  status:     SignalStatus
  minLevel:   string
  whyText:    string | null
  sentAt:     string
  pipsResult: number | null
}

interface SignalsResponse {
  data:  Signal[]
  total: number
  page:  number
}

const STATUS_FILTERS: (SignalStatus | 'ALL')[] = ['ALL', 'ACTIVE', 'WIN', 'LOSS', 'CLOSED']

export default function SignalsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<SignalStatus | 'ALL'>('ALL')
  const [showCreate,   setShowCreate]   = useState(false)

  // Form state
  const [form, setForm] = useState({
    asset:      '',
    direction:  'BUY' as SignalDirection,
    market:     'FOREX' as SignalMarket,
    entryPrice: '',
    stopLoss:   '',
    takeProfit: '',
    minLevel:   'GENERAL',
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['signals', statusFilter],
    queryFn:  () => apiGet<SignalsResponse>(
      `/signals?${statusFilter !== 'ALL' ? `status=${statusFilter}&` : ''}limit=50`,
    ),
  })

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      api.post('/signals', {
        asset:       body.asset.toUpperCase(),
        direction:   body.direction,
        market:      body.market,
        entryPrice:  parseFloat(body.entryPrice),
        stopLoss:    parseFloat(body.stopLoss),
        takeProfits: [parseFloat(body.takeProfit)],
        minLevel:    body.minLevel,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signals'] })
      setShowCreate(false)
      setForm({ asset:'', direction:'BUY', market:'FOREX', entryPrice:'', stopLoss:'', takeProfit:'', minLevel:'GENERAL' })
    },
  })

  const closeMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/signals/${id}/close`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signals'] }),
  })

  const signals = data?.data ?? []

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header
        title="Señales de Trading"
        subtitle={`${data?.total ?? 0} señales en total`}
        onRefresh={() => refetch()}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filtros + botón crear */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 glass rounded-lg p-1">
            <Filter size={13} className="text-slate-500 ml-2" />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-gold/20 text-gold-light border border-gold/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button onClick={() => setShowCreate(true)} className="btn-gold">
            <Plus size={15} />
            Nueva señal
          </button>
        </div>

        {/* Formulario crear señal */}
        {showCreate && (
          <GlassCard gold className="animate-slide-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Nueva Señal</p>
              <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Par / Activo', key: 'asset', placeholder: 'XAUUSD' },
                { label: 'Precio entrada', key: 'entryPrice', placeholder: '1900.50' },
                { label: 'Stop Loss',      key: 'stopLoss',   placeholder: '1890.00' },
                { label: 'Take Profit 1',  key: 'takeProfit', placeholder: '1920.00' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input
                    className="input-glass"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-slate-400 mb-1">Dirección</label>
                <select
                  className="input-glass"
                  value={form.direction}
                  onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value as SignalDirection }))}
                >
                  <option>BUY</option>
                  <option>SELL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Mercado</label>
                <select
                  className="input-glass"
                  value={form.market}
                  onChange={(e) => setForm((f) => ({ ...f, market: e.target.value as SignalMarket }))}
                >
                  <option>FOREX</option>
                  <option>CRYPTO</option>
                  <option>INDICES</option>
                  <option>COMMODITIES</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nivel mínimo</label>
                <select
                  className="input-glass"
                  value={form.minLevel}
                  onChange={(e) => setForm((f) => ({ ...f, minLevel: e.target.value }))}
                >
                  <option>GENERAL</option>
                  <option>VIP</option>
                  <option>SUPREMO</option>
                  <option>MASTER</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending}
                className="btn-gold"
              >
                {createMutation.isPending ? 'Enviando...' : 'Publicar señal'}
              </button>
              <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancelar</button>
            </div>
          </GlassCard>
        )}

        {/* Tabla de señales */}
        <GlassCard className="!p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : signals.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              No hay señales con este filtro
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Par', 'Dir.', 'Mercado', 'Entrada', 'SL', 'Estado', 'Nivel', 'Pips', 'Acciones'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {signals.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-white">{s.asset}</td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 text-xs font-bold ${
                          s.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {s.direction === 'BUY' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {s.direction}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{s.market}</td>
                      <td className="px-4 py-3 font-mono text-white text-xs">{Number(s.entryPrice).toFixed(5)}</td>
                      <td className="px-4 py-3 font-mono text-red-400 text-xs">{Number(s.stopLoss).toFixed(5)}</td>
                      <td className="px-4 py-3"><SignalBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{s.minLevel}</td>
                      <td className="px-4 py-3">
                        {s.pipsResult != null ? (
                          <span className={`text-xs font-medium ${s.pipsResult >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {s.pipsResult >= 0 ? '+' : ''}{s.pipsResult}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {s.status === 'ACTIVE' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => closeMutation.mutate({ id: s.id, status: 'WIN' })}
                              className="text-[11px] px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              WIN
                            </button>
                            <button
                              onClick={() => closeMutation.mutate({ id: s.id, status: 'LOSS' })}
                              className="text-[11px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              LOSS
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
