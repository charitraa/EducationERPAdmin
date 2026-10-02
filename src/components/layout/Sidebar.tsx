import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useNavigation } from '@/hooks/useNavigation'
import { SidebarSection } from './SidebarSection'

/** Built from `me.permissions` via navigation.ts — never a hardcoded menu. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const sections = useNavigation()
  const { user } = useAuth()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <Link to="/" onClick={onNavigate} className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10">
          <GraduationCap className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-tight">{user?.organization?.name ?? 'Education ERP'}</span>
          <span className="block text-[11px] leading-tight text-sidebar-muted">School management</span>
        </span>
      </Link>
      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-4 [scrollbar-width:thin]">
        {sections.map((section) => (
          <SidebarSection key={section.label} section={section} onNavigate={onNavigate} />
        ))}
      </nav>
    </div>
  )
}
