import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { Checkbox } from '@/components/ui/Checkbox'
import { Spinner } from '@/components/ui/Spinner'
import type { Role } from '@/lib/api/roles'
import type { Permission } from '@/lib/api/permissions'
import { useCreateRole, usePermissionCatalogue, useUpdateRole } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'
import { titleCase } from '@/lib/utils'

const schema = z.object({
  code: z.string().min(1, 'Required'),
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function RoleFormDialog({ open, onClose, role }: { open: boolean; onClose: () => void; role?: Role | null }) {
  const isEdit = !!role
  const readOnly = !!role?.is_system

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: role ? { code: role.code, name: role.name, description: role.description } : { code: '', name: '', description: '' },
  })

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(role?.permissions ?? [])
  useEffect(() => setSelectedPermissions(role?.permissions ?? []), [role])

  const { data: catalogue, isLoading: catalogueLoading } = usePermissionCatalogue()
  const create = useCreateRole()
  const update = useUpdateRole()
  const pending = create.isPending || update.isPending

  const grouped = (catalogue ?? []).reduce<Record<string, Permission[]>>((acc, p) => {
    ;(acc[p.module] ??= []).push(p)
    return acc
  }, {})

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const payload = { ...values, description: values.description ?? '', permissions: selectedPermissions }
      if (isEdit) {
        await update.mutateAsync({ id: role.id, payload })
        toast({ title: 'Role updated', variant: 'success' })
      } else {
        await create.mutateAsync(payload)
        toast({ title: 'Role created', variant: 'success' })
      }
      onClose()
      reset()
    } catch (err) {
      toast({ title: 'Save failed', description: toApiError(err).message, variant: 'error' })
    }
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? (readOnly ? `${role.name} (system role)` : 'Edit role') : 'New role'}
      size="lg"
      footer={
        !readOnly && (
          <Button type="submit" form="role-form" loading={pending}>
            {isEdit ? 'Save changes' : 'Create role'}
          </Button>
        )
      }
    >
      <form id="role-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {readOnly && (
          <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text-muted">
            System roles ship with the platform and can't be edited.
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Code" required error={errors.code?.message}>
            <Input {...register('code')} disabled={readOnly} />
          </FormField>
          <FormField label="Name" required error={errors.name?.message}>
            <Input {...register('name')} disabled={readOnly} />
          </FormField>
        </div>
        <FormField label="Description">
          <Textarea rows={2} {...register('description')} disabled={readOnly} />
        </FormField>

        <div>
          <p className="mb-2 text-sm font-medium text-text">Permissions</p>
          {catalogueLoading ? (
            <Spinner />
          ) : (
            <div className="flex max-h-80 flex-col gap-4 overflow-y-auto rounded-md border border-border p-3">
              {Object.entries(grouped).map(([module, perms]) => (
                <div key={module}>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-faint">
                    {titleCase(module)}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {perms.map((p) => (
                      <label key={p.code} className="flex items-center gap-2 text-sm text-text">
                        <Checkbox
                          checked={selectedPermissions.includes(p.code)}
                          onChange={() => togglePermission(p.code)}
                          disabled={readOnly}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
