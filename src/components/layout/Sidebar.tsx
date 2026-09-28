import { NavLink } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { NAV_SECTIONS } from './nav-config'

export function Sidebar() {
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)
  const user = useAuthStore((s) => s.user)
  const organization = useAuthStore((s) => s.user?.organization)

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-(--sidebar-width) flex-col bg-sidebar text-text-on-dark">
      <div className="flex h-(--topbar-height) items-center gap-2.5 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-accent text-white">
          <GraduationCap className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{organization?.name ?? 'Education ERP'}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_SECTIONS.map((section) => {
          // TEMP: with no user signed in (auth gating stripped in App.tsx for now),
          // show every nav item regardless of permission so pages are browsable.
          const items = section.items.filter((item) => !item.permission || !user || hasAnyPermission(item.permission))
          if (items.length === 0) return null
          return (
            <div key={section.section} className="mb-4">
              <p className="px-3 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wide text-white/35">
                {section.section}
              </p>
              <div className="flex flex-col gap-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive ? 'bg-sidebar-soft text-white' : 'text-white/65 hover:bg-sidebar-soft hover:text-white',
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
