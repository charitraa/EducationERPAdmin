import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell() {
  return (
    <div className="page-wrapper">
      <Sidebar />
      <div className="page-container">
        <Topbar />
        <main className="main-content">
          <div className="section__content section__content--p30">
            <div className="container-fluid">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
