/**
 * Token storage.
 *
 * - The access token lives only in memory and is lost on reload.
 * - The refresh token goes in sessionStorage: one tab, same origin only,
 *   cleared when the tab closes. Never localStorage. The backend returns it
 *   in the JSON body (it does not set an httpOnly cookie yet;
 *   CORS_ALLOW_CREDENTIALS is off). When it does, swap this module for a
 *   cookie-backed refresh and nothing else in the app has to change.
 */
const REFRESH_KEY = 'erp.session'

let accessToken: string | null = null

function readRefresh(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export const tokens = {
  getAccess: () => accessToken,
  getRefresh: readRefresh,
  set(next: { access: string; refresh: string }) {
    accessToken = next.access
    try {
      sessionStorage.setItem(REFRESH_KEY, next.refresh)
    } catch {
      // Storage blocked: the session simply won't survive a reload.
    }
  },
  clear() {
    accessToken = null
    try {
      sessionStorage.removeItem(REFRESH_KEY)
    } catch {
      // ignore
    }
  },
}
