'use client'

import { useQuery } from '@tanstack/react-query'
import { CreditCard } from 'lucide-react'
import { Header }       from '@/components/layout/Header'
import { GlassCard }    from '@/components/ui/GlassCard'
import { PaymentBadge } from '@/components/ui/Badge'
import { apiGet }       from '@/lib/api'

type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'

interface Payment {
  id:            string
  userId:        string
  provider:      string
  amountUsd:     number
  planPurchased: string
  status:        PaymentStatus
  confirmedAt:   string | null
  createdAt:     string
  user:          { displayName: string; email: string }
}

export default function PaymentsPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-payments'],
    queryFn:  () => apiGet<{ data: Payment[]; total: number }>('/payments/admin?limit=50'),
  })

  const payments = data?.data ?? []
  const totalRevenue = payments
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amountUsd), 0)

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header
        title="Pagos"
        subtitle={`${data?.total ?? '…'} transacciones — $${totalRevenue.toFixed(2)} confirmado`}
        onRefresh={() => refetch()}
      />

      <div className="flex-1 p-6">
        <GlassCard className="!p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <CreditCard size={32} className="text-slate-600" />
              <p className="text-sm text-slate-500">Sin pagos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Usuario', 'Plan', 'Monto', 'Proveedor', 'Estado', 'Fecha'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white text-xs font-medium">{p.user?.displayName ?? '—'}</p>
                        <p className="text-slate-500 text-[11px]">{p.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold text-gold-light">{p.planPurchased}</span>
                      </td>
                      <td className="px-4 py-3 text-white font-mono text-xs">
                        ${Number(p.amountUsd).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">{p.provider}</td>
                      <td className="px-4 py-3">
                        <PaymentBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(p.createdAt).toLocaleDateString('es-MX')}
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
