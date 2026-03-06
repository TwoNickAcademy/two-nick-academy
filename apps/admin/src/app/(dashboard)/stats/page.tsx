'use client'

import { useQuery } from '@tanstack/react-query'
import { BarChart3, Brain, TrendingUp, Users } from 'lucide-react'
import { Header }          from '@/components/layout/Header'
import { GlassCard }       from '@/components/ui/GlassCard'
import { StatCard }        from '@/components/ui/StatCard'
import { RevenueChart }    from '@/components/charts/RevenueChart'
import { WinRateChart }    from '@/components/charts/WinRateChart'
import { UsersGrowthChart } from '@/components/charts/UsersGrowthChart'
import { apiGet }          from '@/lib/api'

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function fmtMonth(iso: string) {
  const d = new Date(iso)
  return `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}
function fmtDay(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function StatsPage() {
  const { data: revenue, isLoading: loadRev, refetch: refRev } = useQuery({
    queryKey: ['stats-revenue'],
    queryFn:  () => apiGet<{
      byMonth: { month: string; total: number; count: number }[]
      byPlan:  { plan: string; total: number; count: number }[]
      commissions: { total: number; count: number }
    }>('/admin/stats/revenue'),
  })

  const { data: signals, isLoading: loadSig } = useQuery({
    queryKey: ['stats-signals'],
    queryFn:  () => apiGet<{
      totals: { win: number; loss: number; cancelled: number; active: number; closed: number; winRate: number | null }
      byMarket:    { market: string; count: number }[]
      byDirection: { direction: string; count: number }[]
      pips: { avgResult: string; sumResult: string }
    }>('/admin/stats/signals'),
  })

  const { data: users, isLoading: loadUsers } = useQuery({
    queryKey: ['stats-users'],
    queryFn:  () => apiGet<{
      levelDistribution: { GENERAL: number; VIP: number; SUPREMO: number; MASTER: number }
      growth: { day: string; count: number }[]
      activity: { active: number; inactive: number }
    }>('/admin/stats/users'),
  })

  const { data: ai, isLoading: loadAi } = useQuery({
    queryKey: ['stats-ai'],
    queryFn:  () => apiGet<{
      totals: { interactions: number; tokens: number; queriesThisMonth: number; queriesLastMonth: number }
      byModel: { model: string; count: number; tokens: number }[]
    }>('/admin/stats/ai'),
  })

  const revenueChartData = (revenue?.byMonth ?? []).map((r) => ({
    month: fmtMonth(r.month),
    total: r.total,
  }))
  const growthChartData = (users?.growth ?? []).map((r) => ({
    day:   fmtDay(r.day),
    count: r.count,
  }))

  const loading = loadRev || loadSig || loadUsers || loadAi

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header title="Estadísticas" subtitle="Métricas completas de la plataforma"
        onRefresh={() => refRev()} />

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Revenue section */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Revenue
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <GlassCard className="lg:col-span-2">
                  <p className="text-sm font-semibold text-white mb-4">Revenue Mensual (12 meses)</p>
                  <RevenueChart data={revenueChartData} />
                </GlassCard>
                <div className="space-y-3">
                  {(revenue?.byPlan ?? []).map((p) => (
                    <GlassCard key={p.plan} gold className="!py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-gold-light">{p.plan}</p>
                          <p className="text-[11px] text-slate-500">{p.count} pagos confirmados</p>
                        </div>
                        <p className="text-lg font-bold text-white">${p.total.toFixed(0)}</p>
                      </div>
                    </GlassCard>
                  ))}
                  <GlassCard className="!py-3">
                    <p className="text-xs text-slate-500">Comisiones referidos</p>
                    <p className="text-lg font-bold text-white mt-0.5">
                      ${revenue?.commissions.total.toFixed(2) ?? 0}
                    </p>
                    <p className="text-[11px] text-slate-500">{revenue?.commissions.count ?? 0} referidos pagados</p>
                  </GlassCard>
                </div>
              </div>
            </section>

            {/* Signals section */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Señales
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatCard label="Win Rate"
                  value={signals?.totals.winRate != null ? `${signals.totals.winRate}%` : '—'}
                  icon={TrendingUp} iconColor="text-emerald-400" gold />
                <StatCard label="Total WIN"  value={signals?.totals.win ?? 0}  icon={TrendingUp}  iconColor="text-emerald-400" />
                <StatCard label="Total LOSS" value={signals?.totals.loss ?? 0} icon={TrendingUp}  iconColor="text-red-400" />
                <StatCard label="Pips promedio"
                  value={signals?.pips.avgResult ?? '0'}
                  icon={BarChart3} iconColor="text-blue-400" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GlassCard>
                  <p className="text-sm font-semibold text-white mb-3">Distribución por resultado</p>
                  <WinRateChart
                    win={signals?.totals.win ?? 0}
                    loss={signals?.totals.loss ?? 0}
                    cancelled={signals?.totals.cancelled ?? 0}
                  />
                </GlassCard>
                <GlassCard>
                  <p className="text-sm font-semibold text-white mb-3">Por mercado</p>
                  <div className="space-y-2">
                    {(signals?.byMarket ?? []).map((m) => {
                      const total = (signals?.byMarket ?? []).reduce((s, x) => s + x.count, 0)
                      return (
                        <div key={m.market}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">{m.market}</span>
                            <span className="text-white">{m.count}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full">
                            <div
                              className="h-full bg-blue-500/60 rounded-full transition-all"
                              style={{ width: `${total > 0 ? (m.count / total) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </GlassCard>
              </div>
            </section>

            {/* Users & AI section */}
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Usuarios y AI
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GlassCard>
                  <p className="text-sm font-semibold text-white mb-3">Nuevos usuarios — 30 días</p>
                  <UsersGrowthChart data={growthChartData} />
                  <div className="flex gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                    <div>
                      <p className="text-[11px] text-slate-500">Activos</p>
                      <p className="text-sm font-bold text-white">{users?.activity.active ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Inactivos</p>
                      <p className="text-sm font-bold text-white">{users?.activity.inactive ?? 0}</p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard>
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={16} className="text-purple-400" />
                    <p className="text-sm font-semibold text-white">AI Mentor</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-[11px] text-slate-500">Consultas este mes</p>
                      <p className="text-2xl font-bold text-white">{ai?.totals.queriesThisMonth.toLocaleString() ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500">Tokens totales</p>
                      <p className="text-2xl font-bold text-white">
                        {((ai?.totals.tokens ?? 0) / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                    <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Por modelo</p>
                    {(ai?.byModel ?? []).map((m) => (
                      <div key={m.model} className="flex justify-between text-xs">
                        <span className="text-slate-400 font-mono">{m.model}</span>
                        <span className="text-white">{m.count} msgs · {(m.tokens / 1000).toFixed(1)}K tk</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                    <p className="text-xs text-slate-500">vs mes anterior</p>
                    {ai && (
                      <span className={`text-xs font-bold ${
                        ai.totals.queriesThisMonth >= ai.totals.queriesLastMonth
                          ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {ai.totals.queriesLastMonth > 0
                          ? `${(((ai.totals.queriesThisMonth - ai.totals.queriesLastMonth) / ai.totals.queriesLastMonth) * 100).toFixed(1)}%`
                          : '—'}
                      </span>
                    )}
                  </div>
                </GlassCard>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
