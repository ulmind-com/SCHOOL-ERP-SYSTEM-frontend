import type { Column } from '@/components/ui/table'

export interface FieldDef {
  name: string
  label: string
  type?:
    | 'text' | 'number' | 'date' | 'email' | 'tel' | 'time'
    | 'select' | 'remote-select' | 'textarea' | 'checkbox'
  options?: { value: string; label: string }[]
  /** API path whose items populate a dropdown, e.g. "/classes". */
  optionsFrom?: string
  optionsQuery?: Record<string, any>
  optionLabel?: (option: any) => string
  placeholder?: string
  hint?: string
  required?: boolean
  defaultValue?: any
  /** Span both columns of the form grid. */
  full?: boolean
  section?: string
}

export interface FilterDef {
  name: string
  label: string
  options?: { value: string; label: string }[]
  optionsFrom?: string
  optionsQuery?: Record<string, any>
  optionLabel?: (option: any) => string
}

export interface ResourceDef<T = any> {
  path: string
  module: string
  title: string
  singular: string
  plural: string
  subtitle?: string
  icon: string
  columns: Column<T>[]
  fields: FieldDef[]
  filters?: FilterDef[]
  searchable?: boolean
  searchPlaceholder?: string
  defaultSort?: string
  defaultSortDir?: 'asc' | 'desc'
  createLabel?: string
  formSubtitle?: string
  formWidth?: 'md' | 'lg'
  emptyTitle?: string
  emptyDescription?: string
  invalidates?: string[]
  onRowClick?: (row: T) => void
}
