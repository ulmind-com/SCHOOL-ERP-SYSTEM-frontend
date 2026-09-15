'use client'

import type { ApiErrorShape, TokenPair } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const PREFIX = '/api/v1'

const ACCESS_KEY = 'scholarly.access'
const REFRESH_KEY = 'scholarly.refresh'
const TENANT_KEY = 'scholarly.tenant'
const YEAR_KEY = 'scholarly.academic-year'
const IMPERSONATION_KEY = 'scholarly.impersonating'

export class ApiError extends Error {
  status: number
  code: string
  meta: Record<string, any>
  /** Field-level messages from the API's 422 shape, ready for react-hook-form. */
  fields: Record<string, string>

  constructor(status: number, body: Partial<ApiErrorShape>) {
    super(body.detail || 'Something went wrong')
    this.name = 'ApiError'
    this.status = status
    this.code = body.code || 'error'
    this.meta = body.meta || {}
    this.fields = Object.fromEntries(
      (this.meta.fields ?? []).map((f: { field: string; message: string }) => [
        f.field,
        f.message,
      ]),
    )
  }
}

export const tokens = {
  access: () => (typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY)),
  refresh: () => (typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY)),
  tenant: () => (typeof window === 'undefined' ? null : localStorage.getItem(TENANT_KEY)),
  /** The academic year staff are reading. Unset means the current one. */
  year: () => (typeof window === 'undefined' ? null : localStorage.getItem(YEAR_KEY)),
  setYear(id: string | null) {
    if (id) localStorage.setItem(YEAR_KEY, id)
    else localStorage.removeItem(YEAR_KEY)
  },
  set(pair: TokenPair, tenantSlug?: string | null) {
    localStorage.setItem(ACCESS_KEY, pair.access_token)
    localStorage.setItem(REFRESH_KEY, pair.refresh_token)
    if (tenantSlug) localStorage.setItem(TENANT_KEY, tenantSlug)
  },
  setTenant(slug: string) {
    localStorage.setItem(TENANT_KEY, slug)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem(TENANT_KEY)
    localStorage.removeItem(YEAR_KEY)
    localStorage.removeItem(IMPERSONATION_KEY)
  },

  /**
   * Step into another account, keeping the real session parked.
   *
   * The impersonation token deliberately comes without a refresh token, so the
   * borrowed session simply expires rather than renewing itself for a month.
   * The administrator's own pair waits in storage until they step back out.
   */
  beginImpersonation(accessToken: string, who: { id: string; name: string; email: string }) {
    const parked = {
      access: localStorage.getItem(ACCESS_KEY),
      refresh: localStorage.getItem(REFRESH_KEY),
      viewing: who,
    }
    localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(parked))
    localStorage.setItem(ACCESS_KEY, accessToken)
    localStorage.removeItem(REFRESH_KEY)
  },

  impersonation(): { viewing: { id: string; name: string; email: string } } | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(IMPERSONATION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  endImpersonation(): boolean {
    const raw = localStorage.getItem(IMPERSONATION_KEY)
    if (!raw) return false
    try {
      const parked = JSON.parse(raw)
      if (parked.access) localStorage.setItem(ACCESS_KEY, parked.access)
      if (parked.refresh) localStorage.setItem(REFRESH_KEY, parked.refresh)
    } catch {
      return false
    } finally {
      localStorage.removeItem(IMPERSONATION_KEY)
    }
    return true
  },
}

/**
 * One in-flight refresh, shared.
 *
 * Without this, a dashboard firing six queries at once on an expired token
 * would kick off six refreshes — five of which rotate a token the sixth is
 * still using, and the user gets logged out mid-session.
 */
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokens.refresh()
  if (!refresh) return null

  refreshing ??= (async () => {
    try {
      const response = await fetch(`${BASE}${PREFIX}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      })
      if (!response.ok) {
        tokens.clear()
        return null
      }
      const pair: TokenPair = await response.json()
      tokens.set(pair)
      return pair.access_token
    } catch {
      return null
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
  auth?: boolean
  raw?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${BASE}${path.startsWith('/api') ? '' : PREFIX}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function request<T>(path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { body, query, auth = true, raw = false, headers, ...rest } = options

  const finalHeaders = new Headers(headers)
  if (!raw && body !== undefined) finalHeaders.set('Content-Type', 'application/json')
  if (auth) {
    const access = tokens.access()
    if (access) finalHeaders.set('Authorization', `Bearer ${access}`)
    const tenant = tokens.tenant()
    if (tenant) finalHeaders.set('X-Tenant', tenant)
    // The server validates this against the institution's own years and falls
    // back to the current one, so a stale id here is harmless.
    const year = tokens.year()
    if (year) finalHeaders.set('X-Academic-Year', year)
  }

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    headers: finalHeaders,
    body: raw ? (body as BodyInit) : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && retry && auth) {
    const fresh = await refreshAccessToken()
    if (fresh) return request<T>(path, options, false)
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
  }

  if (!response.ok) {
    let payload: Partial<ApiErrorShape> = {}
    try {
      payload = await response.json()
    } catch {
      payload = { detail: response.statusText }
    }
    throw new ApiError(response.status, payload)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET', query }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
  upload: <T>(path: string, form: FormData) =>
    request<T>(path, { method: 'POST', body: form, raw: true }),
  public: {
    get: <T>(path: string, query?: RequestOptions['query']) =>
      request<T>(path, { method: 'GET', query, auth: false }),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'POST', body, auth: false }),
  },
}
