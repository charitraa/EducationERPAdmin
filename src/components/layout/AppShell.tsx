import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/lib/i18n'
import { CommandMenu } from './CommandMenu'
import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'
import { Sidebar } from './Sidebar'

export function AppShell() {
  useLocale() // re-render the shell when the language changes
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-background focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 lg:block">
        <Sidebar />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 border-none p-0 [&>button]:text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-60">
        <Header onOpenMenu={() => setMenuOpen(true)} onOpenSearch={() => setSearchOpen(true)} />
        <main id="main" className="mx-auto max-w-[1600px] px-3 pb-24 pt-5 sm:px-5 md:pb-10">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav onOpenMenu={() => setMenuOpen(true)} />
      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
