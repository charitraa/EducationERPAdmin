import { useEffect } from 'react'

type PageMeta = { title: string; description?: string; noindex?: boolean }

/** `<meta>` tags a page may change: [attribute, key] pairs. */
const DESCRIPTION: [string, string][] = [
  ['name', 'description'],
  ['property', 'og:description'],
  ['name', 'twitter:description'],
]
const TITLE: [string, string][] = [
  ['property', 'og:title'],
  ['name', 'twitter:title'],
]

function setMeta(attr: string, key: string, content: string): () => void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  const created = !el
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  const before = el.content
  el.content = content
  return () => (created ? el.remove() : (el.content = before))
}

/**
 * index.html's canonical and og:url name the home page (when the site URL is
 * set at build time). Every route is served that same file, so point them at
 * the page actually shown, or each page would claim to be a copy of `/`.
 */
function setPageUrl(): () => void {
  const link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const og = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')
  if (!link) return () => {}
  const before = link.href
  const ogBefore = og?.content
  const url = new URL(window.location.pathname, before).href
  link.href = url
  if (og) og.content = url
  return () => {
    link.href = before
    if (og && ogBefore != null) og.content = ogBefore
  }
}

/**
 * Title, description and indexing for one page, put back as they were when
 * the page goes away. index.html carries the landing page's tags, so crawlers
 * that don't run JavaScript still get good ones.
 */
export function usePageMeta({ title, description, noindex = false }: PageMeta) {
  useEffect(() => {
    const before = document.title
    document.title = title
    const undo = [
      setPageUrl(),
      ...TITLE.map(([a, k]) => setMeta(a, k, title)),
      ...(description ? DESCRIPTION.map(([a, k]) => setMeta(a, k, description)) : []),
      ...(noindex ? [setMeta('name', 'robots', 'noindex, nofollow')] : []),
    ]
    return () => {
      document.title = before
      undo.forEach((u) => u())
    }
  }, [title, description, noindex])
}
