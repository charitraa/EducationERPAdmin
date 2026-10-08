/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/** Public pages search engines may list. */
const PUBLIC_PAGES = ['/', '/signup', '/login', '/terms', '/privacy']

/**
 * SEO files. VITE_SITE_URL (e.g. https://erp.example.com) fills the canonical
 * and share-image tags in index.html and the sitemap; without it those tags
 * are dropped, since they must be absolute URLs.
 */
function seo(): Plugin {
  let site = ''
  return {
    name: 'seo',
    configResolved(config) {
      site = (loadEnv(config.mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')
    },
    transformIndexHtml(html) {
      return site ? html.replaceAll('%SITE_URL%', site).replace(/<!--\/?site-url-->\n?/g, '') : html.replace(/\s*<!--site-url-->[\s\S]*?<!--\/site-url-->/, '')
    },
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', 'Disallow: /api/', ...(site ? ['', `Sitemap: ${site}/sitemap.xml`] : [])]
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `${robots.join('\n')}\n` })
      if (!site) return
      const today = new Date().toISOString().slice(0, 10)
      const urls = PUBLIC_PAGES.map((p) => `  <url><loc>${site}${p}</loc><lastmod>${today}</lastmod><priority>${p === '/' ? '1.0' : '0.6'}</priority></url>`)
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), seo()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // Dev only: with VITE_API_BASE_URL unset, the app calls /api/v1 on its own
    // origin and Vite forwards it to the backend, so no CORS setup is needed.
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:8000' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query', 'axios'],
          forms: ['react-hook-form', 'zod', '@hookform/resolvers'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
