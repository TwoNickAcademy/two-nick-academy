type BadgeVariant = 'gold' | 'green' | 'red' | 'blue' | 'gray' | 'orange'

const VARIANTS: Record<BadgeVariant, string> = {
  gold:   'bg-yellow-500/10 text-yellow-300  border border-yellow-500/20',
  green:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  red:    'bg-red-500/10     text-red-400     border border-red-500/20',
  blue:   'bg-blue-500/10   text-blue-400    border border-blue-500/20',
  gray:   'bg-white/5       text-slate-400   border border-white/10',
  orange: 'bg-orange-500/10 text-orange-400  border border-orange-500/20',
}

interface BadgeProps {
  label:    string
  variant?: BadgeVariant
  dot?:     boolean
}

export function Badge({ label, variant = 'gray', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${VARIANTS[variant]}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'green'  ? 'bg-emerald-400' :
            variant === 'red'    ? 'bg-red-400'     :
            variant === 'gold'   ? 'bg-yellow-400'  :
            variant === 'blue'   ? 'bg-blue-400'    :
            variant === 'orange' ? 'bg-orange-400'  :
            'bg-slate-400'
          }`}
        />
      )}
      {label}
    </span>
  )
}

// ── Badge específicos del dominio ─────────────────────────────────

type MembershipLevel = 'GENERAL' | 'VIP' | 'SUPREMO' | 'MASTER'
type SignalStatus    = 'ACTIVE' | 'WIN' | 'LOSS' | 'CLOSED' | 'CANCELLED'
type PaymentStatus  = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'

export function MembershipBadge({ level }: { level: MembershipLevel }) {
  const map: Record<MembershipLevel, BadgeVariant> = {
    GENERAL: 'gray',
    VIP:     'blue',
    SUPREMO: 'orange',
    MASTER:  'gold',
  }
  return <Badge label={level} variant={map[level]} />
}

export function SignalBadge({ status }: { status: SignalStatus }) {
  const map: Record<SignalStatus, BadgeVariant> = {
    ACTIVE:    'blue',
    WIN:       'green',
    LOSS:      'red',
    CLOSED:    'gray',
    CANCELLED: 'gray',
  }
  return <Badge label={status} variant={map[status]} dot={status === 'ACTIVE'} />
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, BadgeVariant> = {
    PENDING:   'orange',
    CONFIRMED: 'green',
    FAILED:    'red',
    REFUNDED:  'gray',
  }
  return <Badge label={status} variant={map[status]} />
}
