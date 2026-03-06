'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  BookOpen,
  CreditCard,
  Brain,
  BarChart3,
  LogOut,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/signals',    label: 'Señales',          icon: TrendingUp      },
  { href: '/users',      label: 'Usuarios',         icon: Users           },
  { href: '/courses',    label: 'Cursos',           icon: BookOpen        },
  { href: '/payments',   label: 'Pagos',            icon: CreditCard      },
  { href: '/knowledge',  label: 'Base de Conocimiento', icon: Brain       },
  { href: '/stats',      label: 'Estadísticas',     icon: BarChart3       },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside
      className="flex flex-col w-60 min-h-screen shrink-0 border-r border-white/[0.06]"
      style={{ background: 'rgba(5,5,10,0.8)', backdropFilter: 'blur(20px)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #F4CF47, #D4AF37)' }}>
          <Zap size={16} className="text-space-900" fill="currentColor" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Two-Nick</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Admin</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Usuario + logout */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="glass rounded-lg p-3 mb-2">
          <p className="text-xs font-medium text-white truncate">{user?.displayName ?? '—'}</p>
          <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
