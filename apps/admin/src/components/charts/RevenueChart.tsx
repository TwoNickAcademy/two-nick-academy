'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface RevenuePoint {
  month: string   // e.g. "Ene"
  total: number
}

interface RevenueChartProps {
  data: RevenuePoint[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#D4AF37" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#64748B', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#64748B', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `$${v}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(0)}`, 'Revenue']}
          labelStyle={{ color: '#94A3B8' }}
          itemStyle={{ color: '#D4AF37' }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#D4AF37"
          strokeWidth={2}
          fill="url(#goldGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#D4AF37', stroke: '#0A0A0F', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
