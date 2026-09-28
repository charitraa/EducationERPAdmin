/** Centralized environment access — the only file that should read `import.meta.env` directly. */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
  /**
   * Dummy-data mode: every `lib/api/*` module serves an in-memory seed dataset
   * (see `src/mocks/`) instead of hitting a real backend, and the app
   * auto-signs-in as a mock superuser so every page/permission gate is
   * visible. Defaults ON so the UI is browsable with zero setup; set
   * VITE_USE_MOCKS=false once a real backend is wired up.
   */
  useMocks: import.meta.env.VITE_USE_MOCKS !== 'false',
}
