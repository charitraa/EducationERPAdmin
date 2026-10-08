export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1',
  /** Shown on the public site's Contact link and legal pages; hidden when unset. */
  contactEmail: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || null,
}
