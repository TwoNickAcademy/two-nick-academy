'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Users, DollarSign, TrendingUp, Zap, Brain, Trophy,
} from 'lucide-react'
import { Header }          from '@/components/layout/Header'
import { StatCard }        from '@/components/ui/StatCard'
import { GlassCard }       from '@/components/ui/GlassCard'
import { SignalBadge }     from '@/components/ui/Badge'
import { RevenueChart }    from '@/components/charts/RevenueChart'
import { WinRateChart }    from '@/components/charts/WinRateChart'
import { UsersGrowthChart } from '@/components/charts/UsersGrowthChart'
import { apiGet }          from '@/lib/api'

// ── Tipos de respuesta de la API ──────────────────────────────────

interface Overview {
  users:    { total: number; activeMembers: number; newThisMonth: number; growthPct: number | null }
  revenue:  { total: number; thisMonth: number; growthPct: number | null }
  signals:  { active: number; thisMonth: number }
  ai:       { queriesThisMonth: number }
}

interface RevenueStats {
  byMonth: { month: string; total: number }[]
  byPlan:  { plan: string; total: number; count: number }[]
}

interface SignalsStats {
  totals: { win: number; loss: number; cancelled: number; active: number; winRate: number | null }
  recentClosed: {
    id: string; asset: string; direction: string; status: string; pipsResult: number | null
  }[]
}

interface UsersStats {
  growth: { day: string; count: number }[]
  levelDistribution: { GENERAL: number; VIP: number; SUPREMO: number; MASTER: number }
}

// ── Helpers ───────────────────────────────────────────────────────

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function fmtMonth(iso: string) {
  const d = new Date(iso)
  return `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}
function fmtDay(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// ── Página ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: overview,  refetch: refetchAll, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn:  () => apiGet<Overview>('/admin/stats/overview'),
  })
  const { data: revenue } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn:  () => apiGet<RevenueStats>('/admin/stats/revenue'),
  })
  const { data: signals } = useQuery({
    queryKey: ['admin-signals'],
    queryFn:  () => apiGet<SignalsStats>('/admin/stats/signals'),
  })
  const { data: usersStats } = useQuery({
    queryKey: ['admin-users'],
    queryFn:  () => apiGet<UsersStats>('/admin/stats/users'),
  })

  const revenueChartData = (revenue?.byMonth ?? []).map((r) => ({
    month: fmtMonth(r.month as unknown as string),
    total: r.total,
  }))

  const growthChartData = (usersStats?.growth ?? []).map((r) => ({
    day:   fmtDay(r.day as unknown as string),
    count: r.count,
  }))

  function handleRefresh() {
    refetchAll()
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
        onRefresh={handleRefresh}
      />

      <div className="flex-1 p-6 space-y-6">
        {/* ── KPI row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Usuarios Totales"
            value={overview?.users.total ?? '—'}
            sub={`${overview?.users.newThisMonth ?? 0} este mes`}
            trend={overview?.users.growthPct ?? null}
            icon={Users}
            iconColor="text-blue-400"
          />
          <StatCard
            label="Revenue Total"
            value={overview ? `$${overview.revenue.total.toLocaleString()}` : '—'}
            sub={`$${overview?.revenue.thisMonth.toFixed(0) ?? 0} este mes`}
            trend={overview?.revenue.growthPct ?? null}
            icon={DollarSign}
            iconColor="text-gold"
            gold
          />
          <StatCard
            label="Miembros Activos"
            value={overview?.users.activeMembers ?? '—'}
            sub="VIP / SUPREMO / MASTER"
            icon={Trophy}
            iconColor="text-orange-400"
          />
          <StatCard
            label="Señales Activas"
            value={overview?.signals.active ?? '—'}
            sub={`${overview?.signals.thisMonth ?? 0} este mes`}
            icon={TrendingUp}
            iconColor="text-emerald-400"
          />
        </div>

        {/* ── Row 2: Revenue chart + Signals donut ────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-white">Revenue Mensual</p>
                <p className="text-xs text-slate-500 mt-0.5">Últimos 12 meses — pagos confirmados</p>
              </div>
              <Zap size={16} className="text-gold" />
            </div>
            <RevenueChart data={revenueChartData} />
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">Señales</p>
              {signals?.totals.winRate != null && (
                <span className="text-xs font-bold text-emerald-400">
                  {signals.totals.winRate}% WR
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-3">Distribución de resultados</p>
            <WinRateChart
              win={signals?.totals.win ?? 0}
              loss={signals?.totals.loss ?? 0}
              cancelled={signals?.totals.cancelled ?? 0}
            />
          </GlassCard>
        </div>

        {/* ── Row 3: Users growth + Level dist + AI + Recent signals ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Users growth */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Crecimiento</p>
              <Users size={14} className="text-slate-500" />
            </div>
            <p className="text-xs text-slate-500 mb-3">Nuevos usuarios — últimos 30 días</p>
            <UsersGrowthChart data={growthChartData} />
          </GlassCard>

          {/* Level distribution */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Distribución</p>
              <Trophy size={14} className="text-slate-500" />
            </div>
            <div className="space-y-3">
              {usersStats && Object.entries(usersStats.levelDistribution).map(([level, count]) => {
                const colors: Record<string, string> = {
                  GENERAL: 'bg-slate-500',
                  VIP:     'bg-blue-500',
                  SUPREMO: 'bg-orange-500',
                  MASTER:  'bg-gold',
                }
                const max = Math.max(...Object.values(usersStats.levelDistribution), 1)
                return (
                  <div key={level}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">{level}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[level] ?? 'bg-slate-500'} transition-all duration-700`}
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* AI queries */}
            <div className="mt-5 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-purple-400" />
                <p className="text-xs text-slate-400">Consultas AI este mes</p>
              </div>
              <p className="text-xl font-bold text-white mt-1">
                {overview?.ai.queriesThisMonth.toLocaleString() ?? '—'}
              </p>
            </div>
          </GlassCard>

          {/* Revenue por plan */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Revenue por Plan</p>
              <DollarSign size={14} className="text-gold" />
            </div>
            <div className="space-y-3">
              {(revenue?.byPlan ?? []).map((p) => (
                <div key={p.plan} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white">{p.plan}</p>
                    <p className="text-[11px] text-slate-500">{p.count} pagos</p>
                  </div>
                  <p className="text-sm font-bold text-gold-light">
                    ${p.total.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>

            {/* Señales recientes */}
            {(signals?.recentClosed?.length ?? 0) > 0 && (
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <p className="text-xs font-semibold text-slate-400 mb-3">Últimas señales</p>
                <div className="space-y-2">
                  {signals!.recentClosed.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-1 py-0.5 rounded ${
                            s.direction === 'BUY'
                              ? 'text-emerald-400 bg-emerald-400/10'
                              : 'text-red-400 bg-red-400/10'
                          }`}
                        >
                          {s.direction}
                        </span>
                        <span className="text-xs text-white">{s.asset}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.pipsResult != null && (
                          <span className={`text-xs font-medium ${s.pipsResult >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {s.pipsResult >= 0 ? '+' : ''}{s.pipsResult}p
                          </span>
                        )}
                        <SignalBadge status={s.status as 'WIN' | 'LOSS' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
