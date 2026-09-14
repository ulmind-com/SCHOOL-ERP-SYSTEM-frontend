import { cn, initials, thumb, tintFor } from '@/lib/utils'

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string
  src?: string | null
  size?: number
  className?: string
}) {
  const dimension = { width: size, height: size }
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={thumb(src, size * 2)}
        alt={name}
        style={dimension}
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-white', className)}
      />
    )
  }
  return (
    <span
      style={{ ...dimension, fontSize: Math.max(11, size * 0.36) }}
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-white',
        tintFor(name || '?'),
        className,
      )}
      aria-hidden
    >
      {initials(name || '?')}
    </span>
  )
}
