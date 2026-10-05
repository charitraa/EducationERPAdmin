import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useRoleOptions } from '@/features/roles/hooks/useRoles'
import { toast } from '@/hooks/useToast'
import type { Schema } from '@/shared/types/api'
import { userTypeOptions, type User } from '../api/users.api'
import { useCreateUser, useEditUser } from '../hooks/useUsers'
import { tr } from '@/lib/i18n'

const profile = {
  email: z.string().trim().min(1, tr('Required.')).email(tr('Enter a valid email address.')),
  first_name: z.string().trim().max(150),
  middle_name: z.string().trim().max(150),
  last_name: z.string().trim().max(150),
  phone: z.string().trim().max(32),
  user_type: z.string().min(1, tr('Choose one.')),
}
const createSchema = z.object({ ...profile, password: z.string().min(8, tr('At least 8 characters.')), role_codes: z.array(z.string()) })
const editSchema = z.object(profile)
type CreateForm = z.infer<typeof createSchema>

/** New accounts get a starting password and their roles in one step; branch-limited roles are added from the user's page. */
export function UserFormDialog({ open, onOpenChange, record, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; record: User | null; onCreated?: (u: User) => void }) {
  const create = useCreateUser()
  const edit = useEditUser()
  const roles = useRoleOptions(open && !record)

  const defaults: CreateForm = {
    email: record?.email ?? '',
    first_name: record?.first_name ?? '',
    middle_name: record?.middle_name ?? '',
    last_name: record?.last_name ?? '',
    phone: record?.phone ?? '',
    user_type: record?.user_type ?? 'staff',
    password: '',
    role_codes: [],
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit {full_name}', { full_name: record.full_name || record.email }) : tr('Add user')}
      description={record ? undefined : tr('A login account. What they can do comes from their roles, not their type.')}
      submitLabel={record ? tr('Save') : tr('Create account')}
      schema={(record ? editSchema : createSchema) as typeof createSchema}
      // The edit schema drops the create-only fields (password, roles).
      defaultValues={defaults}
      onSubmit={async (v) => {
        const userType = v.user_type as Schema<'UserTypeEnum'>
        if (record) {
          const { password: _p, role_codes: _r, ...input } = v
          await edit.mutateAsync({ id: record.id, input: { ...input, user_type: userType } })
          toast.success(tr('Account updated.'))
        } else {
          const created = await create.mutateAsync({ ...v, user_type: userType })
          toast.success(tr('Account for {email} created.', { email: created.email }))
          onCreated?.(created)
        }
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Email')} required error={errors.email?.message} description={tr('They sign in with this.')}>
              <Input {...register('email')} type="email" autoComplete="off" autoFocus />
            </FormField>
            <FormField label={tr('Type')} required error={errors.user_type?.message} description={tr('A label only; roles decide access.')}>
              {(p) => <Controller control={control} name="user_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={userTypeOptions()} />} />}
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('First name')} error={errors.first_name?.message}>
              <Input {...register('first_name')} autoComplete="off" />
            </FormField>
            <FormField label={tr('Middle name')} error={errors.middle_name?.message}>
              <Input {...register('middle_name')} autoComplete="off" />
            </FormField>
            <FormField label={tr('Last name')} error={errors.last_name?.message}>
              <Input {...register('last_name')} autoComplete="off" />
            </FormField>
          </div>
          <FormField label={tr('Phone')} error={errors.phone?.message} className="sm:max-w-xs">
            <Input {...register('phone')} type="tel" inputMode="tel" />
          </FormField>
          {!record && (
            <>
              <FormField label={tr('Starting password')} required error={errors.password?.message} description={tr('Share it privately; they can change it after signing in.')} className="sm:max-w-xs">
                <Input {...register('password')} type="password" autoComplete="new-password" />
              </FormField>
              <FormField label={tr('Roles')} error={errors.role_codes?.message} description={tr('For the whole organization. To limit a role to one branch, add it from the user’s page.')}>
                {() => (
                  <Controller
                    control={control}
                    name="role_codes"
                    render={({ field }) => (
                      <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                        {roles.isPending && <p className="text-sm text-muted-foreground">{tr('Loading roles…')}</p>}
                        {(roles.data ?? []).map((r) => (
                          <label key={r.id} className="flex items-start gap-2 text-sm">
                            <Checkbox
                              checked={field.value.includes(r.code)}
                              onCheckedChange={(c) => field.onChange(c ? [...field.value, r.code] : field.value.filter((x) => x !== r.code))}
                              className="mt-0.5"
                            />
                            <span>
                              {tr(r.name)}
                              {r.description && <span className="block text-xs text-muted-foreground">{tr(r.description)}</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  />
                )}
              </FormField>
            </>
          )}
        </>
      )}
    </FormDialog>
  )
}
