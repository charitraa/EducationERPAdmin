import { GraduationCap, Languages, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import { setLocale, useLocale, tr } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Section anchors on the landing page; other pages link to them as `/#id`. */
const NAV = [
  { href: '#top', label: tr('Home') },
  { href: '#features', label: tr('Features') },
  { href: '#how-it-works', label: tr('How it works') },
  { href: '#benefits', label: tr('Benefits') },
  { href: '#faq', label: tr('FAQ') },
]

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5 font-semibold', className)}>
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', inverted ? 'bg-white/10 text-white' : 'bg-primary text-primary-foreground')}>
        <GraduationCap className="h-[18px] w-[18px]" aria-hidden />
      </span>
      {tr('Education ERP')}
    </span>
  )
}

function LanguageButton({ className }: { className?: string }) {
  const locale = useLocale()
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'en' ? 'ne' : 'en')}
      className={cn('inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', className)}
    >
      <Languages className="h-4 w-4" aria-hidden />
      {/* Each language names itself, so readers find theirs. */}
      <span lang={locale === 'en' ? 'ne' : 'en'}>{locale === 'en' ? 'नेपाली' : 'English'}</span>
    </button>
  )
}

/** `anchors` false: section links point back to the landing page. */
export function SiteHeader({ anchors = true }: { anchors?: boolean }) {
  const [open, setOpen] = useState(false)
  const href = (h: string) => (anchors ? h : `/${h}`)

  useEffect(() => {
    if (!open) return
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [open])

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setOpen(false)}>
          <Logo />
        </Link>
        <nav aria-label={tr('Main')} className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <a key={n.href} href={href(n.href)} className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <LanguageButton />
          <Button asChild variant="ghost">
            <Link to="/login">{tr('Log in')}</Link>
          </Button>
          <Button asChild>
            <Link to="/signup">{tr('Get started free')}</Link>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
          <span className="sr-only">{open ? tr('Close menu') : tr('Open menu')}</span>
        </Button>
      </div>
      {open && (
        <div id="site-menu" className="border-t bg-background lg:hidden">
          <nav aria-label={tr('Main')} className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:px-6">
            {NAV.map((n) => (
              <a key={n.href} href={href(n.href)} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-base font-medium hover:bg-muted">
                {n.label}
              </a>
            ))}
            <LanguageButton className="h-11 justify-start px-3 text-base" />
            <div className="mt-2 grid gap-2 border-t pt-4 sm:grid-cols-2">
              <Button asChild variant="outline" size="lg">
                <Link to="/login">{tr('Log in')}</Link>
              </Button>
              <Button asChild size="lg">
                <Link to="/signup">{tr('Get started free')}</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export function SiteFooter({ anchors = true }: { anchors?: boolean }) {
  const href = (h: string) => (anchors ? h : `/${h}`)
  const links: { label: string; href?: string; to?: string }[] = [
    { label: tr('About'), href: href('#who') },
    { label: tr('Features'), href: href('#features') },
    { label: tr('How it works'), href: href('#how-it-works') },
    { label: tr('FAQ'), href: href('#faq') },
    { label: tr('Privacy Policy'), to: '/privacy' },
    { label: tr('Terms'), to: '/terms' },
    ...(env.contactEmail ? [{ label: tr('Contact'), href: `mailto:${env.contactEmail}` }] : []),
  ]
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">{tr('Simple, powerful and free education management for schools and colleges.')}</p>
        </div>
        <nav aria-label={tr('Footer')}>
          <ul className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-sm sm:grid-cols-3">
            {links.map((l) => (
              <li key={l.label}>
                {l.to ? (
                  <Link to={l.to} className="text-muted-foreground hover:text-foreground">
                    {l.label}
                  </Link>
                ) : (
                  <a href={l.href} className="text-muted-foreground hover:text-foreground">
                    {l.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>{tr('© {fullYear} Education ERP. All rights reserved.', { fullYear: new Date().getFullYear() })}</p>
          <p>
            {/* Split around the name so a translation can put it where its grammar needs. */}
            {tr('Created by {name}')
              .split(/(\{name\})/)
              .map((part, i) =>
                part === '{name}' ? (
                  <span key={i} className="font-medium text-foreground" itemScope itemType="https://schema.org/Person">
                    <span itemProp="name">Charitra Shrestha</span>
                  </span>
                ) : (
                  part
                ),
              )}
          </p>
        </div>
      </div>
    </footer>
  )
}
