'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface GrowthPoint {
  day:   string  // "Lun 03"
  count: number
}

export function UsersGrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="day"
          tick={{ fill: '#64748B', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={4}
        />
        <YAxis
          tick={{ fill: '#64748B', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          formatter={(v: number) => [v, 'Nuevos usuarios']}
          labelStyle={{ color: '#94A3B8' }}
          itemStyle={{ color: '#3B82F6' }}
        />
        <Bar
          dataKey="count"
          fill="rgba(59,130,246,0.6)"
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
