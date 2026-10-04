import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useWho } from '@/features/self/hooks/useSelf'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/dates'
import { enumLabel, humanize } from '@/lib/formatters'
import { initials } from '@/lib/utils'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      <dl className="divide-y rounded-lg border bg-card px-4">{children}</dl>
    </section>
  )
}

/** The signed-in person, from /auth/me/, and the staff, student, parent or graduate record their account is linked to. */
export default function ProfilePage() {
  const { user } = useAuth()
  const { staff, student, parent, alumnus } = useWho()
  if (!user) return null
  const enrollment = student?.current_enrollment as { section_name?: string; program_name?: string } | null | undefined
  return (
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
      <Card title="Account">
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
      </Card>
      {staff && (
        <Card title="Staff record">
          <Row label="Employee number" value={<span className="font-mono">{staff.employee_number}</span>} />
          <Row label="Designation" value={staff.designation} />
          <Row label="Staff type" value={enumLabel('StaffTypeEnum', staff.staff_type)} />
          <Row label="Branch" value={staff.campus_name} />
          <Row label="Joined" value={formatDate(staff.joined_on)} />
        </Card>
      )}
      {student && (
        <Card title="Student record">
          <Row label="Student number" value={<span className="font-mono">{student.student_number}</span>} />
          <Row label="Class" value={enrollment?.section_name ?? enrollment?.program_name} />
          <Row label="Branch" value={student.campus_name} />
          <Row label="Admitted" value={formatDate(student.admitted_on)} />
          <Row label="Status" value={humanize(student.status)} />
        </Card>
      )}
      {parent && (
        <Card title="Children">
          {parent.children.length === 0 ? (
            <Row label="Linked" value="No children are linked to you yet; ask the school office." />
          ) : (
            parent.children.map((c) => (
              <Row
                key={c.student}
                label={humanize(c.relationship)}
                value={
                  <>
                    <span className="font-medium">{c.full_name}</span> <span className="font-mono text-xs text-muted-foreground">{c.student_number}</span>
                    <span className="text-muted-foreground"> · {c.campus_name}</span>
                    {c.is_primary_contact && <span className="ml-2 rounded border px-1.5 text-xs">Primary contact</span>}
                  </>
                }
              />
            ))
          )}
        </Card>
      )}
      {alumnus && (
        <Card title="Alumni">
          <Row label="Program" value={alumnus.program_name} />
          <Row label="Graduated" value={formatDate(alumnus.graduated_on)} />
          <Row label="Mentoring" value={alumnus.is_mentor ? 'Open to mentees' : 'Not mentoring'} />
        </Card>
      )}
      {!staff && !student && !parent && !alumnus && (
        <p className="text-sm text-muted-foreground">Your account isn’t linked to a staff, student or parent record, so there’s nothing of your own here beyond your applications.</p>
      )}
    </div>
  )
}
