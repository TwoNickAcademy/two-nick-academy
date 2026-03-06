import { type LucideIcon } from 'lucide-react'

interface StatCardProps {
  label:      string
  value:      string | number
  sub?:       string           // texto secundario debajo del valor
  trend?:     number | null    // % de variación (positivo = verde, negativo = rojo)
  icon:       LucideIcon
  iconColor?: string
  gold?:      boolean
}

export function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  iconColor = 'text-slate-400',
  gold = false,
}: StatCardProps) {
  const trendPositive = trend !== null && trend !== undefined && trend > 0
  const trendNegative = trend !== null && trend !== undefined && trend < 0

  return (
    <div className={`${gold ? 'glass-gold' : 'glass'} p-5 animate-fade-in`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`p-2 rounded-lg bg-white/5 ${iconColor}`}>
          <Icon size={16} />
        </div>
      </div>

      <p className={`text-2xl font-bold mb-1 ${gold ? 'text-gold-light' : 'text-white'}`}>
        {value}
      </p>

      <div className="flex items-center gap-2">
        {trend !== null && trend !== undefined && (
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              trendPositive
                ? 'text-emerald-400 bg-emerald-400/10'
                : trendNegative
                ? 'text-red-400 bg-red-400/10'
                : 'text-slate-400 bg-white/5'
            }`}
          >
            {trendPositive ? '+' : ''}{trend}%
          </span>
        )}
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}
