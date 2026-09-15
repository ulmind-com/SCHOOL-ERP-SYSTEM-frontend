'use client'

import { create } from 'zustand'
import { ApiError, api, tokens } from './api'
import type { Institution, LoginResponse, NavGroup, SessionUser } from './types'

interface MeResponse {
  user: SessionUser
  institution: Institution | null
  navigation: NavGroup[]
  deployment_mode: 'saas' | 'dedicated'
}

interface SessionState {
  user: SessionUser | null
  institution: Institution | null
  navigation: NavGroup[]
  deploymentMode: 'saas' | 'dedicated'
  status: 'idle' | 'loading' | 'ready' | 'anonymous'

  /** Set while viewing the app as someone else. */
  viewingAs: { id: string; name: string; email: string } | null

  hydrate: () => Promise<void>
  applyLogin: (response: LoginResponse) => Promise<void>
  signOut: () => Promise<void>
  viewAs: (userId: string, reason?: string) => Promise<void>
  stopViewingAs: () => Promise<void>
  /** Wildcard-aware, matching the server's own check. */
  can: (permission: string) => boolean
  canAny: (...permissions: string[]) => boolean
  moduleEnabled: (key: string) => boolean
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  institution: null,
  navigation: [],
  deploymentMode: 'saas',
  status: 'idle',
  viewingAs: null,

  async hydrate() {
    if (!tokens.access()) {
      set({ status: 'anonymous' })
      return
    }
    set({ status: 'loading' })
    try {
      const me = await api.get<MeResponse>('/auth/me')
      set({
        user: me.user,
        institution: me.institution,
        navigation: me.navigation,
        deploymentMode: me.deployment_mode,
        status: 'ready',
      })
      if (me.institution) tokens.setTenant(me.institution.slug)
      set({ viewingAs: tokens.impersonation()?.viewing ?? null })
    } catch (error) {
      // Only an actual rejection ends the session. A dropped connection is not
      // "you are signed out" — and switching academic year refetches the whole
      // screen at once, which is exactly when a connection gets dropped.
      const rejected = error instanceof ApiError && [401, 403].includes(error.status)
      if (!rejected) {
        set({ status: get().user ? 'ready' : 'anonymous' })
        return
      }
      tokens.clear()
      set({ user: null, institution: null, navigation: [], status: 'anonymous' })
    }
  },

  async applyLogin(response) {
    tokens.set(response.tokens, response.institution?.slug)
    set({ user: response.user, institution: response.institution })
    // The login payload has no navigation — that is derived per user from the
    // permissions and enabled modules, so fetch it before the shell renders or
    // the sidebar comes up empty.
    await get().hydrate()
  },

  async signOut() {
    const refresh = tokens.refresh()
    if (refresh) {
      await api.post('/auth/logout', { refresh_token: refresh }).catch(() => {})
    }
    tokens.clear()
    set({ user: null, institution: null, navigation: [], status: 'anonymous',
          viewingAs: null })
  },

  /**
   * Borrow another account for support. The administrator's own session is
   * parked, not discarded, so stepping back out is one click and not a re-login.
   */
  async viewAs(userId, reason = '') {
    const result = await api.post<{
      access_token: string
      user: { id: string; email: string; full_name: string }
    }>(`/users/${userId}/impersonate`, { reason })
    tokens.beginImpersonation(result.access_token, {
      id: result.user.id,
      name: result.user.full_name,
      email: result.user.email,
    })
    await get().hydrate()
  },

  async stopViewingAs() {
    if (!tokens.endImpersonation()) return
    set({ viewingAs: null })
    await get().hydrate()
  },

  can(permission) {
    const granted = get().user?.permissions ?? []
    if (granted.includes('*') || granted.includes(permission)) return true
    const [module] = permission.split(':')
    return granted.includes(`${module}:*`)
  },

  canAny(...permissions) {
    return permissions.some((p) => get().can(p))
  },

  /**
   * Membership, nothing more.
   *
   * `enabled_modules` arrives already resolved — plan, licence and institution
   * type folded in by the server, which is also what `require()` reads. The
   * client used to re-derive it and got the dedicated case wrong: a school that
   * owned its deployment was shown a college's Faculties.
   */
  moduleEnabled(key) {
    const institution = get().institution
    if (!institution) return true
    return institution.enabled_modules.includes(key)
  },
}))
