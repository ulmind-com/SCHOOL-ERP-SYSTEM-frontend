import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}: {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-sunken">
        <Icon name={icon} className="h-6 w-6 text-muted" strokeWidth={1.8} aria-hidden />
      </span>
      <h3 className="mt-4 text-[15px] font-bold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
