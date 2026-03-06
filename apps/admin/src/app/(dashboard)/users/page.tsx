'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'
import { Header }          from '@/components/layout/Header'
import { GlassCard }       from '@/components/ui/GlassCard'
import { MembershipBadge } from '@/components/ui/Badge'
import { apiGet }          from '@/lib/api'

type MembershipLevel = 'GENERAL' | 'VIP' | 'SUPREMO' | 'MASTER'

interface UserRow {
  id:           string
  email:        string
  displayName:  string
  avatarUrl:    string | null
  referralCode: string
  createdAt:    string
  membership:   { level: MembershipLevel; expiryDate: string } | null
  referralsCount: number
}

interface UsersResponse {
  data: UserRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

const LEVEL_FILTERS: (MembershipLevel | 'ALL')[] = ['ALL', 'GENERAL', 'VIP', 'SUPREMO', 'MASTER']

export default function UsersPage() {
  const [page,   setPage]   = useState(1)
  const [search, setSearch] = useState('')
  const [level,  setLevel]  = useState<MembershipLevel | 'ALL'>('ALL')
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users-list', page, search, level],
    queryFn:  () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (level !== 'ALL') params.set('level', level)
      return apiGet<UsersResponse>(`/users/admin/list?${params}`)
    },
  })

  const users     = data?.data ?? []
  const meta      = data?.meta
  const totalPages = meta?.totalPages ?? 1

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPage(1)
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Header
        title="Usuarios"
        subtitle={`${meta?.total ?? '…'} usuarios registrados`}
        onRefresh={() => refetch()}
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="input-glass pl-9"
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </form>

          <div className="flex gap-1 glass rounded-lg p-1">
            {LEVEL_FILTERS.map((l) => (
              <button
                key={l}
                onClick={() => { setLevel(l); setPage(1) }}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  level === l
                    ? 'bg-gold/20 text-gold-light border border-gold/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tabla */}
          <div className="lg:col-span-2">
            <GlassCard className="!p-0 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
                  <Users size={32} className="opacity-30" />
                  <p className="text-sm">No se encontraron usuarios</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {['Usuario', 'Nivel', 'Referidos', 'Registro'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {users.map((u) => (
                          <tr
                            key={u.id}
                            onClick={() => setSelectedUser(u)}
                            className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/60 to-gold/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                  {u.displayName?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <div>
                                  <p className="text-white text-xs font-medium leading-tight">{u.displayName}</p>
                                  <p className="text-slate-500 text-[11px]">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <MembershipBadge level={(u.membership?.level ?? 'GENERAL') as MembershipLevel} />
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">{u.referralsCount}</td>
                            <td className="px-4 py-3 text-slate-500 text-xs">
                              {new Date(u.createdAt).toLocaleDateString('es-MX')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
                    <p className="text-xs text-slate-500">
                      Página {meta?.page} de {totalPages} ({meta?.total} total)
                    </p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </GlassCard>
          </div>

          {/* Detalle lateral */}
          <div>
            {selectedUser ? (
              <GlassCard gold className="animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dim flex items-center justify-center text-space-900 font-bold text-lg">
                    {selectedUser.displayName?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedUser.displayName}</p>
                    <p className="text-xs text-slate-500">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nivel</span>
                    <MembershipBadge level={(selectedUser.membership?.level ?? 'GENERAL') as MembershipLevel} />
                  </div>
                  {selectedUser.membership?.expiryDate && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Expira</span>
                      <span className="text-white">
                        {new Date(selectedUser.membership.expiryDate).toLocaleDateString('es-MX')}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">Código referral</span>
                    <span className="font-mono text-gold-light">{selectedUser.referralCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Referidos</span>
                    <span className="text-white">{selectedUser.referralsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Registro</span>
                    <span className="text-white">
                      {new Date(selectedUser.createdAt).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="flex flex-col items-center justify-center h-48 gap-2">
                <Users size={28} className="text-slate-600" />
                <p className="text-xs text-slate-500">Selecciona un usuario para ver detalles</p>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
