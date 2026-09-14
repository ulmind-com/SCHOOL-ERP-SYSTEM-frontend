import { Icon } from '@/lib/icons'

/**
 * An honest placeholder. It names what the screen will do and which API
 * already backs it, rather than pretending to be a finished feature.
 */
export function NotBuiltYet({
  icon,
  title,
  description,
  endpoints,
  dark,
}: {
  icon: string
  title: string
  description: string
  endpoints?: string[]
  dark?: boolean
}) {
  return (
    <div
      className={
        dark
          ? 'rounded-card bg-white/[0.04] px-6 py-14 text-center'
          : 'card px-6 py-14 text-center'
      }
    >
      <span
        className={
          dark
            ? 'mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/10'
            : 'mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-sunken'
        }
      >
        <Icon
          name={icon}
          className={dark ? 'h-6 w-6 text-white/60' : 'h-6 w-6 text-muted'}
          strokeWidth={1.8}
          aria-hidden
        />
      </span>
      <h2 className={dark ? 'mt-4 text-[17px] font-bold text-white' : 'mt-4 text-[17px] font-bold text-ink'}>
        {title}
      </h2>
      <p
        className={
          dark
            ? 'mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-white/50'
            : 'mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-muted'
        }
      >
        {description}
      </p>
      {endpoints?.length ? (
        <div className="mt-5">
          <p className={dark ? 'text-[11.5px] font-bold uppercase tracking-wide text-white/35' : 'text-[11.5px] font-bold uppercase tracking-wide text-muted'}>
            Already available in the API
          </p>
          <ul className="mt-2 flex flex-wrap justify-center gap-1.5">
            {endpoints.map((endpoint) => (
              <li
                key={endpoint}
                className={
                  dark
                    ? 'tabular rounded-pill bg-white/[0.06] px-2.5 py-1 text-[11.5px] text-white/60'
                    : 'tabular rounded-pill bg-surface-sunken px-2.5 py-1 text-[11.5px] text-ink-soft'
                }
              >
                {endpoint}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
