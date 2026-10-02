import { PageHeader } from '@/components/common/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/dates'
import { humanize } from '@/lib/formatters'
import { initials } from '@/lib/utils'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  )
}

/** The signed-in person, straight from /auth/me/. */
export default function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null
  return (
    <>
      <PageHeader title="My profile" />
      <div className="grid max-w-3xl gap-5">
        <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">{initials(user.full_name || user.email)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <dl className="divide-y rounded-lg border bg-card px-4">
          <Row label="Phone" value={user.phone} />
          <Row label="Organization" value={user.organization?.name} />
          <Row label="Account type" value={humanize(user.user_type)} />
          <Row
            label="Roles"
            value={
              user.roles.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {user.roles.map((r) => (
                    <li key={`${r.code}-${r.campus ?? ''}`} className="rounded border px-2 py-0.5 text-xs">
                      {r.name}
                      {r.campus && <span className="text-muted-foreground"> · {r.campus}</span>}
                    </li>
                  ))}
                </ul>
              ) : null
            }
          />
          <Row label="Last sign-in" value={formatDateTime(user.last_login)} />
        </dl>
      </div>
    </>
  )
}
