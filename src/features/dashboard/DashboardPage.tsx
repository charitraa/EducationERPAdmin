import { ClipboardList, GraduationCap, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardBody } from '@/components/ui/Card'
import { PermissionGate } from '@/components/PermissionGate'
import { useAuthStore } from '@/stores/auth-store'

const SHORTCUTS = [
  { to: '/students', label: 'Students', icon: Users, permission: ['students.view'] },
  { to: '/parents', label: 'Parents', icon: UserRound, permission: ['parents.view'] },
  { to: '/staff', label: 'Staff', icon: GraduationCap, permission: ['staff.view'] },
  { to: '/admissions', label: 'Admissions', icon: ClipboardList, permission: ['admissions.view'] },
]

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.first_name || 'there'}`}
        description={user?.organization ? `${user.organization.name}` : 'Platform administration'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SHORTCUTS.map((shortcut) => (
          <PermissionGate key={shortcut.to} any={shortcut.permission}>
            <Link to={shortcut.to}>
              <Card className="transition-shadow hover:shadow-md">
                <CardBody className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded bg-accent-soft text-accent">
                    <shortcut.icon className="size-5" />
                  </div>
                  <span className="text-sm font-medium text-text">{shortcut.label}</span>
                </CardBody>
              </Card>
            </Link>
          </PermissionGate>
        ))}
      </div>

      <Card className="mt-6">
        <CardBody>
          <p className="text-sm text-text-muted">
            You're signed in with the following roles:{' '}
            <span className="font-medium text-text">
              {user?.roles.length ? user.roles.map((r) => r.name).join(', ') : 'No roles assigned'}
            </span>
            .
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
