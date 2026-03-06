import { type ReactNode } from 'react'

interface GlassCardProps {
  children:  ReactNode
  className?: string
  gold?:      boolean   // aplica borde dorado
  onClick?:  () => void
}

export function GlassCard({ children, className = '', gold = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        ${gold ? 'glass-gold' : 'glass'}
        ${onClick ? 'glass-hover cursor-pointer' : ''}
        p-5 animate-fade-in
        ${className}
      `}
    >
      {children}
    </div>
  )
}
