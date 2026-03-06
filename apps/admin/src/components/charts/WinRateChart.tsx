'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface WinRateChartProps {
  win:       number
  loss:      number
  cancelled: number
}

const COLORS = ['#22C55E', '#EF4444', '#475569']
const LABELS = ['WIN', 'LOSS', 'CANCELADAS']

export function WinRateChart({ win, loss, cancelled }: WinRateChartProps) {
  const data = [
    { name: LABELS[0], value: win },
    { name: LABELS[1], value: loss },
    { name: LABELS[2], value: cancelled },
  ].filter((d) => d.value > 0)

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[180px] text-slate-500 text-sm">
        Sin señales cerradas aún
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={72}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={COLORS[i % COLORS.length]}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [value, name]}
          itemStyle={{ color: '#F1F5F9' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', color: '#94A3B8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
