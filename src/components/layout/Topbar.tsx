import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLogout } from '@/features/auth/useAuth'
import { initials } from '@/lib/utils'

export function Topbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-(--topbar-height) items-center justify-end border-b border-border bg-surface pl-(--sidebar-width) pr-6">
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-md py-1.5 pl-1.5 pr-2 hover:bg-surface-2"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
            {initials(user.full_name || user.email)}
          </span>
          <span className="text-sm font-medium text-text">{user.full_name || user.email}</span>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-border bg-surface py-1 shadow-md">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-surface-2"
              >
                <User className="size-4" /> My profile
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
