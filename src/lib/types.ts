export type Portal = 'admin' | 'finance' | 'teacher' | 'student' | 'parent' | 'platform'

export interface SessionUser {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  scope: 'tenant' | 'platform'
  portal: Portal
  roles: string[]
  role_keys: string[]
  permissions: string[]
  is_owner: boolean
  student_id?: string | null
  staff_id?: string | null
  guardian_id?: string | null
  last_login_at?: string | null
}

export interface Institution {
  id: string
  slug: string
  name: string
  institution_type: string
  deployment: 'saas' | 'dedicated'
  status: string
  subscription_status: string
  subscription_valid_till?: string | null
  timezone: string
  currency: string
  locale: string
  branding: Record<string, any>
  enabled_modules: string[]
  limits: {
    max_students: number | null
    max_staff: number | null
    max_storage_mb: number | null
    max_admin_users: number | null
  }
  usage: { students: number; staff: number; users: number }
  current_academic_year?: { id: string; name: string } | null
  academic_years?: AcademicYearOption[]
  active_academic_year_id?: string | null
  can_switch_academic_year?: boolean
  onboarding_completed: boolean
}

export interface NavItem {
  key: string
  label: string
  href: string
  icon: string
  module: string
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface LoginResponse {
  tokens: TokenPair
  user: SessionUser
  institution: Institution | null
  must_change_password: boolean
}

export interface PageMeta {
  page: number
  page_size: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface Paged<T> {
  items: T[]
  meta: PageMeta
}

export interface ApiErrorShape {
  detail: string
  code: string
  meta: Record<string, any>
}

export interface InstitutionChoice {
  slug: string
  name: string
  logo_url?: string
  institution_type: string
}


export interface AcademicYearOption {
  id: string
  name: string
  is_current: boolean
  status: string
  start_date: string | null
  end_date: string | null
}
