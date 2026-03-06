'use client'

import { Bell, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface HeaderProps {
  title:    string
  subtitle?: string
  onRefresh?: () => void
}

export function Header({ title, subtitle, onRefresh }: HeaderProps) {
  const { user } = useAuth()

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
      <div>
        <h1 className="text-lg font-bold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <button onClick={onRefresh} className="btn-ghost">
            <RefreshCw size={14} />
            Actualizar
          </button>
        )}

        <button className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-light to-gold flex items-center justify-center text-space-900 text-xs font-bold">
            {user?.displayName?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <span className="text-xs text-slate-400">{user?.displayName}</span>
        </div>
      </div>
    </header>
  )
}
