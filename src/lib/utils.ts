import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Indian-format currency — the default for the institutions this serves. */
export function money(value: number | null | undefined, currency = 'INR') {
  const amount = Number(value ?? 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}

/** 128000 -> "1.28L". Long fee totals don't fit in a stat tile otherwise. */
export function compactMoney(value: number | null | undefined, currency = 'INR') {
  const amount = Number(value ?? 0)
  if (Math.abs(amount) >= 1e7) return `₹${(amount / 1e7).toFixed(2)}Cr`
  if (Math.abs(amount) >= 1e5) return `₹${(amount / 1e5).toFixed(2)}L`
  if (Math.abs(amount) >= 1e3) return `₹${(amount / 1e3).toFixed(1)}K`
  return money(amount, currency)
}

export function compactNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact' }).format(Number(value ?? 0))
}

export function percent(value: number | null | undefined, digits = 1) {
  return `${Number(value ?? 0).toFixed(digits)}%`
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Deterministic pastel per name, so the same person keeps the same avatar. */
const AVATAR_TINTS = [
  'bg-butter text-ink',
  'bg-blush text-ink',
  'bg-lilac text-ink',
  'bg-mint text-ink',
  'bg-sky text-ink',
]

export function tintFor(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_TINTS[hash % AVATAR_TINTS.length]
}

/** Honorifics are not names — "Dr. Kalpana Menon" should greet "Kalpana". */
const HONORIFICS = new Set([
  'dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'miss', 'prof', 'prof.',
  'fr', 'fr.', 'sr', 'sr.', 'rev', 'rev.', 'shri', 'smt', 'smt.', 'sri',
])

export function firstName(fullName?: string | null) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)
  const name = parts.find((part) => !HONORIFICS.has(part.toLowerCase()))
  return name ?? parts[0] ?? ''
}

export function titleCase(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** ImageKit resize, so an avatar grid doesn't pull full-size photos. */
export function thumb(url: string | undefined | null, size = 96) {
  if (!url) return ''
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}tr=w-${size},h-${size},c-maintain_ratio,q-80`
}

/**
 * A subject label that stays unambiguous in a flat dropdown.
 *
 * Subjects are per-class, so a school running Class 7 and Class 8 has two rows
 * called "Mathematics". The code is what tells them apart on paper, so it is
 * what tells them apart here.
 */
/** "Class 7 · A" — a section's name alone is "A" in every class that has one. */
export function sectionLabel(section: { name?: string; class_name?: string }): string {
  return [section.class_name, section.name].filter(Boolean).join(' · ') || '—'
}

export function subjectLabel(subject: {
  name?: string
  code?: string
  class_name?: string
}): string {
  const parts = [subject.name ?? '']
  if (subject.class_name) parts.push(subject.class_name)
  if (subject.code) parts.push(subject.code)
  return parts.filter(Boolean).join(' · ')
}
