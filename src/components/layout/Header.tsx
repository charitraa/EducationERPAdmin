import { Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { NotificationsMenu } from '@/features/notifications/components/NotificationsMenu'
import { BranchSelector } from './BranchSelector'
import { Breadcrumbs } from './Breadcrumbs'
import { ProfileMenu } from './ProfileMenu'

interface HeaderProps {
  onOpenMenu: () => void
  onOpenSearch: () => void
}

export function Header({ onOpenMenu, onOpenSearch }: HeaderProps) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label="Open menu">
        <Menu />
      </Button>
      <div className="hidden min-w-0 flex-1 md:block">
        <Breadcrumbs />
      </div>
      <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-8 items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-sm text-muted-foreground hover:bg-muted sm:w-56"
          aria-label="Search (Ctrl+K)"
        >
          <Search className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden flex-1 text-left sm:inline">{t('header.search')}</span>
          <kbd className="hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>
        <BranchSelector />
        <NotificationsMenu />
        <ProfileMenu />
      </div>
    </header>
  )
}
