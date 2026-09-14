'use client'

import { Logo } from '@/components/layout/logo'

/**
 * The split screen every signed-out page shares: a marketing panel on the left
 * that collapses away below `lg`, and the form on the right.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* Marketing panel — hidden on small screens where it would just push the form down. */}
      <div className="relative hidden overflow-hidden bg-ink p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5 text-white">
          <Logo className="text-butter" size={28} />
          <span className="text-[19px] font-extrabold tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME ?? 'Scholarly'}
          </span>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-[40px] font-extrabold leading-[1.08] tracking-tight text-white">
            One system for the whole institution.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            Admissions, attendance, examinations, fees, payroll and parent
            communication — for schools, colleges and universities.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Run it as a subscription, or own your deployment outright',
              'Every module gated by role, so people see only their work',
              'Built for Indian fee books, boards and academic calendars',
            ].map((line) => (
              <li key={line} className="flex items-start gap-3 text-[14px] text-white/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-butter" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[12.5px] text-white/40">
          © {new Date().getFullYear()} {process.env.NEXT_PUBLIC_APP_NAME ?? 'Scholarly'}
        </p>

        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full bg-butter/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-10 h-[320px] w-[320px] rounded-full bg-lilac/10 blur-3xl"
        />
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo className="text-ink" size={32} />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
