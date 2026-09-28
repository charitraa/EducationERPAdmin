import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { NAV_SECTIONS } from './nav-config'

export function Sidebar() {
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission)
  const user = useAuthStore((s) => s.user)
  const organization = useAuthStore((s) => s.user?.organization)
  const location = useLocation()

  return (
    <aside className="menu-sidebar" id="main-sidebar">
      <div className="logo">
        <Link className="logo-link" to="/" aria-label="Education ERP home">
          <span className="logo-mark" aria-hidden="true">
            E
          </span>
          <span className="logo-text">{organization?.name ?? 'Education ERP'}</span>
        </Link>
      </div>

      <div className="menu-sidebar__content js-scrollbar1">
        <nav className="navbar-sidebar">
          {NAV_SECTIONS.map((section) => {
            // TEMP: with no user signed in (auth gating stripped in App.tsx for
            // now), show every nav item regardless of permission so pages are
            // browsable.
            const items = section.items.filter(
              (item) => !item.permission || !user || hasAnyPermission(item.permission),
            )
            if (items.length === 0) return null
            return (
              <ul key={section.section} className="list-unstyled navbar__list">
                <li className="nav-group-label" role="presentation">
                  {section.section}
                </li>
                {items.map((item) => {
                  const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
                  return (
                    <li key={item.to} className={isActive ? 'active' : undefined}>
                      <Link to={item.to}>
                        <i className={item.icon} aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
