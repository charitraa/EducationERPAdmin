import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { useLogout } from '@/features/auth/useAuth'
import { initials } from '@/lib/utils'

export function Topbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) return null

  return (
    <header className="header-desktop">
      <div className="section__content section__content--p30">
        <div className="container-fluid">
          <div className="header-wrap">
            <div className={`account-wrap${menuOpen ? ' show-dropdown' : ''}`} style={{ marginLeft: 'auto', position: 'relative' }}>
              <div
                className="account-item clearfix js-item-menu"
                role="button"
                tabIndex={0}
                aria-haspopup="true"
                aria-label="Account menu"
                onClick={() => setMenuOpen((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              >
                <span className="account-avatar">{initials(user.full_name || user.email)}</span>
                <div className="content">
                  <span className="js-acc-btn">{user.full_name || user.email}</span>
                </div>
              </div>

              {menuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setMenuOpen(false)} />
                  <div className="account-dropdown js-dropdown" style={{ zIndex: 20 }}>
                    <div className="account-dropdown__body">
                      <div className="account-dropdown__item">
                        <Link to="/profile" onClick={() => setMenuOpen(false)}>
                          <i className="fa-solid fa-user" aria-hidden="true" />
                          My profile
                        </Link>
                      </div>
                    </div>
                    <div className="account-dropdown__footer">
                      <a
                        href="#logout"
                        onClick={(e) => {
                          e.preventDefault()
                          logout()
                        }}
                      >
                        <i className="fa-solid fa-power-off" aria-hidden="true" />
                        Sign out
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
