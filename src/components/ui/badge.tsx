import { cn } from '@/lib/utils'
import { titleCase } from '@/lib/utils'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink/[0.06] text-ink-soft',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  accent: 'bg-butter text-ink',
}

/** Status vocabularies shared across the product, mapped to one colour language. */
const STATUS_TONES: Record<string, Tone> = {
  active: 'success', present: 'success', paid: 'success', approved: 'success',
  published: 'success', issued: 'info', ongoing: 'info', in_progress: 'info',
  trial: 'warning', trialing: 'warning', pending: 'warning', partially_paid: 'warning',
  late: 'warning', draft: 'neutral', scheduled: 'neutral', submitted: 'info',
  absent: 'danger', overdue: 'danger', suspended: 'danger', rejected: 'danger',
  cancelled: 'danger', expired: 'danger', failed: 'danger',
  lifetime: 'accent', dedicated: 'accent',
}

export function Badge({
  children,
  tone,
  status,
  className,
}: {
  children?: React.ReactNode
  tone?: Tone
  status?: string
  className?: string
}) {
  const resolved = tone ?? (status ? STATUS_TONES[status] ?? 'neutral' : 'neutral')
  return (
    <span className={cn('chip', TONES[resolved], className)}>
      {children ?? titleCase(status ?? '')}
    </span>
  )
}
