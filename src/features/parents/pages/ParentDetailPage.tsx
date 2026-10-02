import { Link2, Pencil, Star, Trash2, Unlink } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader, TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { Child, Parent } from '../api/parents.api'
import { LinkStudentDialog } from '../components/LinkStudentDialog'
import { ParentFormDialog } from '../components/ParentFormDialog'
import { useParent, useParentChildren, useRemoveParent, useUnlinkStudent } from '../hooks/useParents'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  )
}

function Children({ parent }: { parent: Parent }) {
  const children = useParentChildren(parent.id)
  const { isMultiBranch } = useBranches()
  const { can } = usePermissions()
  const unlink = useUnlinkStudent()
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState<Child | null>(null)

  const linkButton = (
    <PermissionGate permission={PERMS.parents.update}>
      <Button size="sm" variant="outline" onClick={() => setLinking(true)}>
        <Link2 aria-hidden /> Link a child
      </Button>
    </PermissionGate>
  )

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Children</h2>
        {children.data && children.data.length > 0 && linkButton}
      </div>
      {children.isPending ? (
        <TableSkeleton rows={2} columns={3} />
      ) : children.isError ? (
        <ErrorState error={children.error} onRetry={() => void children.refetch()} />
      ) : children.data.length === 0 ? (
        <div className="flex flex-col items-start gap-3 p-4 text-sm text-muted-foreground">
          Not linked to any student yet.
          {linkButton}
        </div>
      ) : (
        <ul className="divide-y">
          {children.data.map((c) => (
            <li key={c.student} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  {can(PERMS.students.view) ? (
                    <Link to={`/students/${c.student}`} className="font-medium hover:underline">
                      {c.full_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{c.full_name}</span>
                  )}
                  {c.is_primary_contact && (
                    <span className="inline-flex items-center gap-1 text-xs text-warning">
                      <Star className="h-3 w-3 fill-current" aria-hidden /> Primary contact
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {enumLabel('RelationshipEnum', c.relationship)} · <span className="font-mono">{c.student_number}</span>
                  {isMultiBranch ? ` · ${c.campus_name}` : ''}
                </p>
              </div>
              <StatusBadge status={c.status} label={enumLabel('StudentStatusEnum', c.status)} />
              <RowActions
                label={`Actions for ${c.full_name}`}
                actions={[{ label: 'Unlink', icon: Unlink, permission: PERMS.parents.update, destructive: true, onSelect: () => setUnlinking(c) }]}
              />
            </li>
          ))}
        </ul>
      )}
      <LinkStudentDialog parent={parent} linked={children.data?.map((c) => c.student) ?? []} open={linking} onOpenChange={setLinking} />
      {unlinking && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setUnlinking(null)}
          tone="destructive"
          title={`Unlink ${unlinking.full_name}?`}
          description={`${parent.full_name} will no longer be listed as their ${enumLabel('RelationshipEnum', unlinking.relationship).toLowerCase()}${unlinking.is_primary_contact ? ', and the student will have no primary contact' : ''}.`}
          confirmLabel="Unlink"
          onConfirm={async () => {
            await unlink.mutateAsync({ id: parent.id, student: unlinking.student })
            toast.success(`${unlinking.full_name} unlinked.`)
          }}
        />
      )}
    </section>
  )
}

export default function ParentDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const parent = useParent(id)
  const remove = useRemoveParent()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (parent.isPending) return <PageLoader />
  if (parent.isError) return <ErrorState error={parent.error} onRetry={() => void parent.refetch()} />
  const p = parent.data

  return (
    <>
      <PageHeader
        backTo="/parents"
        title={p.full_name}
        description={p.occupation || 'Parent / guardian'}
        actions={
          <>
            <PermissionGate permission={PERMS.parents.update}>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden /> Edit
              </Button>
            </PermissionGate>
            <RowActions label="More actions" actions={[{ label: 'Delete', icon: Trash2, permission: PERMS.parents.delete, destructive: true, onSelect: () => setDeleting(true) }]} />
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Children parent={p} />
        </div>
        <section className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">Contact</h2>
          <dl className="grid gap-4">
            <Field label="Phone">{p.phone && <a href={`tel:${p.phone}`} className="tabular-nums hover:underline">{p.phone}</a>}</Field>
            <Field label="Email">{p.email && <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a>}</Field>
            <Field label="Address">{p.address}</Field>
            <Field label="Portal login">{p.user ? 'Linked' : 'No login account'}</Field>
          </dl>
        </section>
      </div>
      <ParentFormDialog open={editing} onOpenChange={setEditing} record={p} />
      <DeleteDialog
        open={deleting}
        onOpenChange={setDeleting}
        subject={p.full_name}
        description="They disappear from their children’s records. The students themselves are not affected."
        onConfirm={async () => {
          await remove.mutateAsync(p.id)
          toast.success('Parent deleted.')
          navigate('/parents', { replace: true })
        }}
      />
    </>
  )
}
