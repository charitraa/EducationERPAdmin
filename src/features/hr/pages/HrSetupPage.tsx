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
import { tr } from '@/lib/i18n'

const fiscalYearSchema = z
  .object({ name: z.string().trim().min(1, tr('Required.')).max(50), start_date: isoDate, end_date: isoDate })
  .refine((v) => v.end_date > v.start_date, { path: ['end_date'], message: tr('Must be after the start.') })

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
        title={tr('Fiscal years')}
        description={tr('The leave year, and payroll’s tax year (Shrawan 1 to Asar end).')}
        action={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button size="sm" variant="outline" onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add year')}
            </Button>
          </PermissionGate>
        }
      />
      {years.length === 0 ? (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">{query.isPending ? tr('Loading…') : tr('None yet. Leave and tax both need one.')}</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {years.map((y) => (
            <li key={y.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="flex-1 font-medium">{y.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {formatDate(y.start_date)} – {formatDate(y.end_date)}
              </span>
              <RowActions
                label={tr('Actions for {name}', { name: y.name })}
                actions={[
                  { label: tr('Edit'), icon: Pencil, permission: PERMS.hr.manage, onSelect: () => crud.openEdit(y) },
                  { label: tr('Delete'), icon: Trash2, permission: PERMS.hr.manage, destructive: true, onSelect: () => crud.openDelete(y) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={crud.record ? tr('Edit {name}', { name: crud.record.name }) : tr('Add fiscal year')}
        schema={fiscalYearSchema}
        defaultValues={{ name: crud.record?.name ?? '', start_date: crud.record?.start_date ?? '', end_date: crud.record?.end_date ?? '' }}
        onSubmit={async (v) => {
          if (crud.record) await update.mutateAsync({ id: crud.record.id, input: v })
          else await create.mutateAsync(v)
          toast.success(tr('Fiscal year saved.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder="2083/84" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('Starts')} required error={errors.start_date?.message}>
                {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('Ends (inclusive)')} required error={errors.end_date?.message}>
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
          toast.success(tr('Deleted.'))
        }}
      />
    </section>
  )
}

const halfDays = z.string().trim().regex(/^\d+(\.[05])?$/, tr('Whole or half days.'))
const leaveTypeSchema = z.object({
  code: z.string().trim().min(1, tr('Required.')).max(50).regex(/^[a-z0-9_-]+$/i, tr('Letters, numbers, - and _ only.')),
  name: z.string().trim().min(1, tr('Required.')).max(100),
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
        title={tr('Leave types')}
        description={tr('Each with a yearly quota, how much carries over, and whether it’s paid.')}
        action={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button size="sm" variant="outline" onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add type')}
            </Button>
          </PermissionGate>
        }
      />
      {types.length === 0 ? (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">{query.isPending ? tr('Loading…') : tr('None yet: add casual, sick, home leave, maternity…')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{tr('Type')}</th>
                <th className="px-3 py-2 font-medium">{tr('A year')}</th>
                <th className="px-3 py-2 font-medium">{tr('Carries over')}</th>
                <th className="px-3 py-2 font-medium">{tr('Rules')}</th>
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
                  <td className="px-3 py-2 tabular-nums">{t.annual_quota == null ? tr('No limit') : tr('{days} days', { days: days(t.annual_quota) })}</td>
                  <td className="px-3 py-2 tabular-nums">{Number(t.carry_forward_max) ? tr('up to {days}', { days: days(t.carry_forward_max) }) : '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {[t.is_paid === false ? tr('Unpaid') : tr('Paid'), t.allow_half_day === false && tr('whole days only'), t.prorate_for_joiners === false && tr('full quota for joiners'), t.gender && tr('{enumLabel} only', { enumLabel: enumLabel('GenderEnum', t.gender) })].filter(Boolean).join(' · ')}
                  </td>
                  <td className="px-3 py-1">
                    <RowActions
                      label={tr('Actions for {name}', { name: t.name })}
                      actions={[
                        { label: tr('Edit'), icon: Pencil, permission: PERMS.hr.manage, onSelect: () => crud.openEdit(t) },
                        { label: tr('Delete'), icon: Trash2, permission: PERMS.hr.manage, destructive: true, onSelect: () => crud.openDelete(t) },
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
        title={r ? tr('Edit {name}', { name: r.name }) : tr('Add leave type')}
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
          toast.success(tr('Leave type saved.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <FormField label={tr('Name')} required error={errors.name?.message}>
                <Input {...register('name')} placeholder={tr('Sick leave')} />
              </FormField>
              <FormField label={tr('Code')} required error={errors.code?.message}>
                <Input {...register('code')} className="font-mono" placeholder="sick" />
              </FormField>
              <FormField label={tr('Days a year')} error={errors.annual_quota?.message} description={tr('Empty: no limit.')}>
                <Input {...register('annual_quota')} inputMode="decimal" />
              </FormField>
              <FormField label={tr('Carries over, at most')} error={errors.carry_forward_max?.message}>
                <Input {...register('carry_forward_max')} inputMode="decimal" />
              </FormField>
              <FormField label={tr('Only for')} description={tr('Maternity, paternity.')}>
                {(p) => <Controller control={control} name="gender" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Everyone')} options={enumOptions('GenderEnum')} />} />}
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
          toast.success(tr('Deleted.'))
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
        title={tr('Positions')}
        noun={tr('position')}
        fields={[{ name: 'code', label: tr('Code'), required: true, mono: true }, { name: 'name', label: tr('Name'), required: true }]}
        query={usePositions({ ...PICKER_PARAMS })}
        create={useCreatePosition() as never}
        update={useUpdatePosition() as never}
        remove={useRemovePosition()}
        label={(p) => `${p.name} (${p.code})`}
      />
    </div>
  )
}
