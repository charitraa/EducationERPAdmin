import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { SimpleCrudList } from '@/components/common/SimpleCrudList'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useCrudState } from '@/hooks/useCrudState'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { isoDate } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { FiscalYear, LeaveType } from '../api/hr.api'
import {
  useCreateFiscalYear,
  useCreateLeaveType,
  useCreatePosition,
  useFiscalYears,
  useLeaveTypes,
  usePositions,
  useRemoveFiscalYear,
  useRemoveLeaveType,
  useRemovePosition,
  useUpdateFiscalYear,
  useUpdateLeaveType,
  useUpdatePosition,
} from '../hooks/useHr'
import { days } from './LeavePages'

const fiscalYearSchema = z
  .object({ name: z.string().trim().min(1, 'Required.').max(50), start_date: isoDate, end_date: isoDate })
  .refine((v) => v.end_date > v.start_date, { path: ['end_date'], message: 'Must be after the start.' })

function FiscalYears() {
  const query = useFiscalYears({ ...PICKER_PARAMS })
  const create = useCreateFiscalYear()
  const update = useUpdateFiscalYear()
  const remove = useRemoveFiscalYear()
  const crud = useCrudState<FiscalYear>()
  const years = query.data?.results ?? []
  return (
    <section>
      <SectionHeader
        title="Fiscal years"
        description="The leave year, and payroll’s tax year (Shrawan 1 to Asar end)."
        action={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button size="sm" variant="outline" onClick={crud.openCreate}>
              <Plus aria-hidden /> Add year
            </Button>
          </PermissionGate>
        }
      />
      {years.length === 0 ? (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">{query.isPending ? 'Loading…' : 'None yet. Leave and tax both need one.'}</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {years.map((y) => (
            <li key={y.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="flex-1 font-medium">{y.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatDate(y.start_date)} – {formatDate(y.end_date)}
              </span>
              <RowActions
                label={`Actions for ${y.name}`}
                actions={[
                  { label: 'Edit', icon: Pencil, permission: PERMS.hr.manage, onSelect: () => crud.openEdit(y) },
                  { label: 'Delete', icon: Trash2, permission: PERMS.hr.manage, destructive: true, onSelect: () => crud.openDelete(y) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? `Edit ${crud.record.name}` : 'Add fiscal year'}
        schema={fiscalYearSchema}
        defaultValues={{ name: crud.record?.name ?? '', start_date: crud.record?.start_date ?? '', end_date: crud.record?.end_date ?? '' }}
        onSubmit={async (v) => {
          if (crud.record) await update.mutateAsync({ id: crud.record.id, input: v })
          else await create.mutateAsync(v)
          toast.success('Fiscal year saved.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="2083/84" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Starts" required error={errors.start_date?.message}>
                {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label="Ends (inclusive)" required error={errors.end_date?.message}>
                {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
          </>
        )}
      </FormDialog>
      <DeleteDialog
        open={crud.deleting !== null}
        onOpenChange={(o) => !o && crud.closeDelete()}
        subject={crud.deleting?.name ?? 'year'}
        onConfirm={async () => {
          await remove.mutateAsync(crud.deleting!.id)
          toast.success('Deleted.')
        }}
      />
    </section>
  )
}

const halfDays = z.string().trim().regex(/^\d+(\.[05])?$/, 'Whole or half days.')
const leaveTypeSchema = z.object({
  code: z.string().trim().min(1, 'Required.').max(50).regex(/^[a-z0-9_-]+$/i, 'Letters, numbers, - and _ only.'),
  name: z.string().trim().min(1, 'Required.').max(100),
  is_paid: z.boolean(),
  annual_quota: z.union([z.literal(''), halfDays]),
  carry_forward_max: halfDays,
  prorate_for_joiners: z.boolean(),
  allow_half_day: z.boolean(),
  gender: z.string(),
  is_active: z.boolean(),
})

function LeaveTypes() {
  const query = useLeaveTypes({ ...PICKER_PARAMS })
  const create = useCreateLeaveType()
  const update = useUpdateLeaveType()
  const remove = useRemoveLeaveType()
  const crud = useCrudState<LeaveType>()
  const types = query.data?.results ?? []
  const r = crud.record
  return (
    <section className="lg:col-span-2">
      <SectionHeader
        title="Leave types"
        description="Each with a yearly quota, how much carries over, and whether it’s paid."
        action={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button size="sm" variant="outline" onClick={crud.openCreate}>
              <Plus aria-hidden /> Add type
            </Button>
          </PermissionGate>
        }
      />
      {types.length === 0 ? (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">{query.isPending ? 'Loading…' : 'None yet: add casual, sick, home leave, maternity…'}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">A year</th>
                <th className="px-3 py-2 font-medium">Carries over</th>
                <th className="px-3 py-2 font-medium">Rules</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {types.map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{t.name}</span> <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
                    {t.is_active === false && <StatusBadge status="inactive" className="ml-2" />}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{t.annual_quota == null ? 'No limit' : `${days(t.annual_quota)} days`}</td>
                  <td className="px-3 py-2 tabular-nums">{Number(t.carry_forward_max) ? `up to ${days(t.carry_forward_max)}` : '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {[t.is_paid === false ? 'Unpaid' : 'Paid', t.allow_half_day === false && 'whole days only', t.prorate_for_joiners === false && 'full quota for joiners', t.gender && `${enumLabel('GenderEnum', t.gender)} only`].filter(Boolean).join(' · ')}
                  </td>
                  <td className="px-3 py-1">
                    <RowActions
                      label={`Actions for ${t.name}`}
                      actions={[
                        { label: 'Edit', icon: Pencil, permission: PERMS.hr.manage, onSelect: () => crud.openEdit(t) },
                        { label: 'Delete', icon: Trash2, permission: PERMS.hr.manage, destructive: true, onSelect: () => crud.openDelete(t) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={r ? `Edit ${r.name}` : 'Add leave type'}
        schema={leaveTypeSchema}
        defaultValues={{
          code: r?.code ?? '',
          name: r?.name ?? '',
          is_paid: r?.is_paid ?? true,
          annual_quota: r?.annual_quota == null ? (r ? '' : '12') : days(r.annual_quota),
          carry_forward_max: days(r?.carry_forward_max ?? '0'),
          prorate_for_joiners: r?.prorate_for_joiners ?? true,
          allow_half_day: r?.allow_half_day ?? true,
          gender: r?.gender ?? '',
          is_active: r?.is_active ?? true,
        }}
        onSubmit={async (v) => {
          const input = { ...v, annual_quota: v.annual_quota === '' ? null : v.annual_quota, gender: v.gender as LeaveType['gender'] }
          if (r) await update.mutateAsync({ id: r.id, input })
          else await create.mutateAsync(input)
          toast.success('Leave type saved.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <FormField label="Name" required error={errors.name?.message}>
                <Input {...register('name')} placeholder="Sick leave" />
              </FormField>
              <FormField label="Code" required error={errors.code?.message}>
                <Input {...register('code')} className="font-mono" placeholder="sick" />
              </FormField>
              <FormField label="Days a year" error={errors.annual_quota?.message} description="Empty: no limit.">
                <Input {...register('annual_quota')} inputMode="decimal" />
              </FormField>
              <FormField label="Carries over, at most" error={errors.carry_forward_max?.message}>
                <Input {...register('carry_forward_max')} inputMode="decimal" />
              </FormField>
              <FormField label="Only for" description="Maternity, paternity.">
                {(p) => <Controller control={control} name="gender" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Everyone" options={enumOptions('GenderEnum')} />} />}
              </FormField>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {(
                [
                  ['is_paid', 'Paid (unpaid days are deducted by payroll)'],
                  ['allow_half_day', 'Half days allowed'],
                  ['prorate_for_joiners', 'Mid-year joiners get a share'],
                  ['is_active', 'Can be applied for'],
                ] as const
              ).map(([name, label]) => (
                <Controller key={name} control={control} name={name} render={({ field }) => (
                  <label className="flex items-center gap-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} /> {label}
                  </label>
                )} />
              ))}
            </div>
          </>
        )}
      </FormDialog>
      <DeleteDialog
        open={crud.deleting !== null}
        onOpenChange={(o) => !o && crud.closeDelete()}
        subject={crud.deleting?.name ?? 'type'}
        onConfirm={async () => {
          await remove.mutateAsync(crud.deleting!.id)
          toast.success('Deleted.')
        }}
      />
    </section>
  )
}

/** HR setup: positions, fiscal years and leave types. */
export function HrSetupPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <LeaveTypes />
      <FiscalYears />
      <SimpleCrudList
        permission={PERMS.hr.manage}
        title="Positions"
        noun="position"
        fields={[{ name: 'code', label: 'Code', required: true, mono: true }, { name: 'name', label: 'Name', required: true }]}
        query={usePositions({ ...PICKER_PARAMS })}
        create={useCreatePosition() as never}
        update={useUpdatePosition() as never}
        remove={useRemovePosition()}
        label={(p) => `${p.name} (${p.code})`}
      />
    </div>
  )
}
