import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { useRoleOptions } from '@/features/roles/hooks/useRoles'
import { toast } from '@/hooks/useToast'
import type { User } from '../api/users.api'
import { useAssignRole } from '../hooks/useUsers'
import { tr } from '@/lib/i18n'

const schema = z.object({ role: z.string().min(1, tr('Choose a role.')), campus: z.string() })

export function AssignRoleDialog({ user, open, onOpenChange }: { user: User; open: boolean; onOpenChange: (o: boolean) => void }) {
  const assign = useAssignRole()
  const roles = useRoleOptions(open)
  const { isMultiBranch, branches } = useBranches()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Give {full_name} a role', { full_name: user.full_name || user.email })}
      description={tr('They get every permission in the role at their next page load.')}
      submitLabel={tr('Assign')}
      schema={schema}
      defaultValues={{ role: '', campus: '' }}
      onSubmit={async (v) => {
        await assign.mutateAsync({ id: user.id, input: { role: Number(v.role), campus: v.campus ? Number(v.campus) : null } })
        toast.success(tr('Role assigned.'))
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          <FormField label={tr('Role')} required error={errors.role?.message}>
            {(p) => (
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <SelectControl {...p} value={field.value} onChange={field.onChange} loading={roles.isPending} options={(roles.data ?? []).map((r) => ({ value: String(r.id), label: r.name }))} />
                )}
              />
            )}
          </FormField>
          {isMultiBranch && (
            <FormField label={tr('Where')} error={errors.campus?.message} description={tr('Limit the role to one branch, or grant it everywhere.')}>
              {(p) => (
                <Controller
                  control={control}
                  name="campus"
                  render={({ field }) => (
                    <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('All branches')} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />
                  )}
                />
              )}
            </FormField>
          )}
        </>
      )}
    </FormDialog>
  )
}
