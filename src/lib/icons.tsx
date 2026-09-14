'use client'

import * as Lucide from 'lucide-react'
import type { LucideProps } from 'lucide-react'

/**
 * The API names icons as kebab-case strings so navigation and the module
 * catalogue stay data, not code. This resolves those names to components.
 */
const registry = Lucide as unknown as Record<string, React.ComponentType<LucideProps>>

function pascal(name: string) {
  return name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function Icon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Component = registry[pascal(name)] ?? Lucide.Square
  return <Component {...props} />
}

export const {
  ArrowRight, ArrowUpRight, Bell, Check, ChevronDown, ChevronLeft, ChevronRight,
  Download, Filter, LogOut, MoreHorizontal, Plus, Search, Settings, TrendingDown,
  TrendingUp, Upload, X,
} = Lucide
