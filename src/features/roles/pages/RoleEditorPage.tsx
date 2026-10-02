import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Lock, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { FormSection } from '@/components/forms/FormSection'
import { UnsavedChangesDialog } from '@/components/forms/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { applyServerErrors } from '@/lib/errors'
import { code } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Role } from '../api/roles.api'
import { PermissionPicker } from '../components/PermissionPicker'
import { useCreateRole, usePermissionCatalogue, useRemoveRole, useRole, useUpdateRole } from '../hooks/useRoles'

const schema = z.object({
  name: z.string().trim().min(1, 'Required.').max(150),
  code,
  description: z.string(),
  permissions: z.array(z.string()),
})
type RoleForm = z.infer<typeof schema>

const defaults = (r: Role | null | undefined): RoleForm => ({ name: r?.name ?? '', code: r?.code ?? '', description: r?.description ?? '', permissions: [...(r?.permissions ?? [])].sort() })
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)

/** /roles/new and /roles/:id. System roles open read-only. */
export default function RoleEditorPage() {
  const { id } = useParams()
  const roleId = id ? Number(id) : null
  const role = useRole(roleId)
  const catalogue = usePermissionCatalogue()
  if ((roleId != null && role.isPending) || catalogue.isPending) return <PageLoader />
  if (role.isError) return <ErrorState error={role.error} onRetry={() => void role.refetch()} />
  if (catalogue.isError) return <ErrorState error={catalogue.error} onRetry={() => void catalogue.refetch()} />
  return <RoleEditor record={roleId == null ? null : role.data!} catalogue={catalogue.data} />
}

function RoleEditor({ record, catalogue }: { record: Role | null; catalogue: NonNullable<ReturnType<typeof usePermissionCatalogue>['data']> }) {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const create = useCreateRole()
  const update = useUpdateRole()
  const remove = useRemoveRole()
  const [serverError, setServerError] = useState<string | null>(null)
  const [savedTo, setSavedTo] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const form = useForm<RoleForm>({ resolver: zodResolver(schema), defaultValues: defaults(record) })
  const { register, control, formState, watch, setValue } = form
  const { errors } = formState
  const readOnly = record?.is_system || !can(record ? PERMS.roles.update : PERMS.roles.create)
  const blocker = useUnsavedChanges(formState.isDirty && !savedTo)

  // New roles: suggest a code from the name until the code is typed by hand.
  const name = watch('name')
  useEffect(() => {
    if (!record && !formState.dirtyFields.code) setValue('code', slugify(name))
  }, [name, record, formState.dirtyFields.code, setValue])

  useEffect(() => {
    if (savedTo) navigate(savedTo)
  }, [savedTo, navigate])

  const submit = form.handleSubmit(async (v) => {
    setServerError(null)
    try {
      if (record) {
        const saved = await update.mutateAsync({ id: record.id, input: v })
        form.reset(defaults(saved))
        toast.success('Role saved. Everyone holding it gets the change at their next page load.')
      } else {
        const saved = await create.mutateAsync(v)
        toast.success(`Role ${saved.name} created. Give it to users from their page.`)
        setSavedTo(`/roles/${saved.id}`)
      }
    } catch (err) {
      setServerError(applyServerErrors(err, form.setError, Object.keys(schema.shape)))
    }
  })

  return (
    <>
      <PageHeader
        backTo="/roles"
        title={record ? record.name : 'New role'}
        description={
          record
            ? `${record.assigned_user_count ?? 0} ${record.assigned_user_count === 1 ? 'person holds' : 'people hold'} this role.`
            : 'A named set of permissions you can give to users, e.g. “Accountant” or “Exam coordinator”.'
        }
        actions={
          record && !record.is_system && can(PERMS.roles.delete) ? (
            <Button variant="outline" size="sm" onClick={() => setDeleting(true)}>
              <Trash2 aria-hidden /> Delete
            </Button>
          ) : undefined
        }
      />
      {record?.is_system && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          Built-in role, managed by the platform. To change what it allows, create your own role instead.
        </div>
      )}
      <form onSubmit={submit} noValidate className="max-w-4xl">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <FormError message={serverError} className="mb-4" />
          <fieldset disabled={readOnly} className="contents">
            <FormSection title="About the role">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Name" required error={errors.name?.message}>
                  <Input {...register('name')} autoFocus={!record} placeholder="Accountant" />
                </FormField>
                <FormField label="Code" required error={errors.code?.message} description="Short and unique; letters, numbers, - and _.">
                  <Input {...register('code')} className="font-mono" />
                </FormField>
              </div>
              <FormField label="Description" error={errors.description?.message}>
                <Textarea {...register('description')} rows={2} placeholder="Who should get this role and why." />
              </FormField>
            </FormSection>
            <FormSection title="What it allows" description="Tick what people with this role may do. You can only grant permissions you hold yourself.">
              <FormField label="Permissions" error={errors.permissions?.message}>
                {() => (
                  <Controller
                    control={control}
                    name="permissions"
                    render={({ field }) => <PermissionPicker catalogue={catalogue} value={field.value} onChange={field.onChange} disabled={readOnly} />}
                  />
                )}
              </FormField>
            </FormSection>
          </fieldset>
        </div>
        {!readOnly && (
          <div className="sticky bottom-16 mt-4 flex justify-end gap-2 md:bottom-4">
            <Button type="button" variant="outline" onClick={() => navigate('/roles')}>
              Cancel
            </Button>
            <Button type="submit" disabled={formState.isSubmitting || (record != null && !formState.isDirty)}>
              {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              {record ? 'Save changes' : 'Create role'}
            </Button>
          </div>
        )}
      </form>
      <UnsavedChangesDialog blocker={blocker} />
      {record && (
        <DeleteDialog
          open={deleting}
          onOpenChange={setDeleting}
          subject={`the role ${record.name}`}
          description={record.assigned_user_count ? `${record.assigned_user_count} people lose the permissions it gives them.` : undefined}
          onConfirm={async () => {
            await remove.mutateAsync(record.id)
            toast.success('Role deleted.')
            setSavedTo('/roles')
          }}
        />
      )}
    </>
  )
}
