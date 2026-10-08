/**
 * Token storage.
 *
 * - The access token lives only in memory and is lost on reload.
 * - The refresh token goes in sessionStorage by default: one tab, same origin
 *   only, cleared when the tab closes. Only when the user ticks "Remember me"
 *   does it go to localStorage instead, so the session survives closing the
 *   browser and is shared by every tab. The backend returns it in the JSON
 *   body (it does not set an httpOnly cookie yet; CORS_ALLOW_CREDENTIALS is
 *   off). When it does, swap this module for a cookie-backed refresh and
 *   nothing else in the app has to change.
 */
const REFRESH_KEY = 'erp.session'

let accessToken: string | null = null

const read = (store: () => Storage): string | null => {
  try {
    return store().getItem(REFRESH_KEY)
  } catch {
    return null
  }
}
const remove = (store: () => Storage) => {
  try {
    store().removeItem(REFRESH_KEY)
  } catch {
    // ignore
  }
}
const session = () => sessionStorage
const local = () => localStorage

/** A remembered session is one already in localStorage; the login form can opt in. */
let remember = read(local) != null

export const tokens = {
  getAccess: () => accessToken,
  getRefresh: () => (remember ? read(local) : read(session)),
  /** Set before signing in: true keeps the session after the browser closes. */
  remember(on: boolean) {
    remember = on
  },
  set(next: { access: string; refresh: string }) {
    accessToken = next.access
    try {
      ;(remember ? local : session)().setItem(REFRESH_KEY, next.refresh)
    } catch {
      // Storage blocked: the session simply won't survive a reload.
    }
    remove(remember ? session : local)
  },
  clear() {
    accessToken = null
    remove(session)
    remove(local)
    remember = false
  },
}
