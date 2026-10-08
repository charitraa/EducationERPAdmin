/**
 * A return path that stays inside this app, or `/`. `//host` and `/\host`
 * look like paths but browsers read them as other sites; React Router's
 * open-redirect advisory (GHSA-337j-9hxr-rhxg) has no v6 fix.
 */
export function safeBack(to: string): string {
  return to.startsWith('/') && !to.startsWith('//') && !to.includes('\\') ? to : '/'
}
