'use client'

import { forwardRef, useId } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leading?: React.ReactNode
  trailing?: React.ReactNode
  /** Styles the wrapper, not the control — needed when a field sits in a
   *  flex row (a filter bar) rather than filling a form column. */
  containerClassName?: string
}

export const Input = forwardRef<HTMLInputElement, FieldProps>(function Input(
  { label, hint, error, leading, trailing, className, containerClassName, id, ...props },
  ref,
) {
  const generated = useId()
  const inputId = id ?? generated
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || hint ? `${inputId}-help` : undefined}
          className={cn(
            'field',
            leading && 'pl-10',
            trailing && 'pr-10',
            error && 'border-danger/40 focus:border-danger/50 focus:ring-danger/15',
            className,
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
            {trailing}
          </span>
        )}
      </div>
      {(error || hint) && (
        <p
          id={`${inputId}-help`}
          className={cn('mt-1.5 text-[12.5px]', error ? 'text-danger' : 'text-muted')}
        >
          {error || hint}
        </p>
      )}
    </div>
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string
    error?: string
    hint?: string
    containerClassName?: string
  }
>(function Select(
  { label, error, hint, className, containerClassName, children, id, ...props },
  ref,
) {
  const generated = useId()
  const selectId = id ?? generated
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn('field appearance-none bg-no-repeat pr-9', error && 'border-danger/40', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%238C9096' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 12px center',
        }}
        {...props}
      >
        {children}
      </select>
      {(error || hint) && (
        <p className={cn('mt-1.5 text-[12.5px]', error ? 'text-danger' : 'text-muted')}>
          {error || hint}
        </p>
      )}
    </div>
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string
    error?: string
    containerClassName?: string
  }
>(function Textarea({ label, error, className, containerClassName, id, ...props }, ref) {
  const generated = useId()
  const areaId = id ?? generated
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label htmlFor={areaId} className="label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        rows={4}
        className={cn('field resize-y', error && 'border-danger/40', className)}
        {...props}
      />
      {error && <p className="mt-1.5 text-[12.5px] text-danger">{error}</p>}
    </div>
  )
})

export function SearchField({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      type="search"
      placeholder="Search here..."
      leading={<Search className="h-4 w-4" aria-hidden />}
      className={cn('rounded-pill border-transparent bg-surface-sunken', className)}
      {...props}
    />
  )
}
