import { Plus, Trash2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray, type Control, type UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Money, moneyInput } from '@/features/finance/components/money'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { isoDate } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import type { PayComponent, PayrollAdjustment, StaffSalary } from '../api/payroll.api'
import { useAdjustments, useComponentOptions, useCreateAdjustment, useCreateSalary, useRemoveAdjustment, useRemoveSalary, useSalaries, useStructureOptions } from '../hooks/usePayroll'

/** A fixed amount, or a percentage of basic. */
export const componentValue = (c: Pick<PayComponent, 'calculation'> | undefined, value: string) =>
  c?.calculation === 'percent_of_basic' ? `${Number(value)}% of basic` : <Money value={value} tone="none" />

/** Zero or more, up to two decimals. */
export const amountOrZero = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'An amount like 1500 or 12.5.')

export interface LineValues {
  component: string
  value: string
}
export const lineSchema = z.object({ component: z.string().min(1, 'Choose one.'), value: amountOrZero })

/** Component + value rows, shared by salary structures and a person's own salary. */
export function ComponentLines({ control, register, errors, hint }: { control: Control<{ lines: LineValues[] }>; register: UseFormRegister<{ lines: LineValues[] }>; errors?: Array<{ component?: { message?: string }; value?: { message?: string } } | undefined>; hint?: string }) {
  const components = useComponentOptions()
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' })
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Allowances and deductions</legend>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1fr_8rem_auto] items-start gap-2">
          <Controller
            control={control}
            name={`lines.${i}.component`}
            render={({ field }) => (
              <SelectControl
                aria-label={`Component ${i + 1}`}
                value={field.value}
                onChange={field.onChange}
                placeholder="Component…"
                options={components.map((c) => ({ value: String(c.id), label: `${c.name} · ${c.kind === 'earning' ? 'earning' : 'deduction'}${c.calculation === 'percent_of_basic' ? ' (%)' : ''}` }))}
              />
            )}
          />
          <div>
            <Input {...register(`lines.${i}.value`)} aria-label={`Value ${i + 1}`} inputMode="decimal" placeholder="Amount or %" />
            {errors?.[i]?.value?.message && <p className="mt-1 text-xs text-danger">{errors[i]?.value?.message}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove line ${i + 1}`} onClick={() => remove(i)}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ component: '', value: '' })} disabled={components.length === 0}>
          <Plus aria-hidden /> Add line
        </Button>
        {components.length === 0 && <span className="ml-2 text-xs text-muted-foreground">Add pay components under Setup first.</span>}
      </div>
    </fieldset>
  )
}

const salarySchema = z.object({
  staff: z.string().min(1, 'Choose a staff member.'),
  structure: z.string().min(1, 'Choose a structure.'),
  basic: z.union([z.literal(''), amountOrZero]),
  effective_from: isoDate,
  note: z.string().max(255),
  lines: z.array(lineSchema),
})

export function AssignSalaryDialog({ open, staffId, onOpenChange }: { open: boolean; staffId?: Id; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const { structures, options } = useStructureOptions()
  const create = useCreateSalary()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign a salary"
      description="From a date; the salary before it ends the day before. Leave basic empty to use the structure’s."
      wide
      submitLabel="Assign"
      schema={salarySchema}
      defaultValues={{ staff: staffId ? String(staffId) : '', structure: '', basic: '', effective_from: todayIso(), note: '', lines: [] }}
      onSubmit={async (v) => {
        await create.mutateAsync({
          staff: Number(v.staff),
          structure: Number(v.structure),
          basic: v.basic === '' ? null : v.basic,
          effective_from: v.effective_from,
          note: v.note,
          lines: v.lines.map((l) => ({ component: Number(l.component), value: l.value })),
        })
        toast.success('Salary assigned.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => {
        const structure = structures.find((s) => String(s.id) === watch('structure'))
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {!staffId && (
                <FormField label="Staff member" required error={errors.staff?.message}>
                  {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} placeholder="Choose…" />} />}
                </FormField>
              )}
              <FormField label="Structure" required error={errors.structure?.message} description={options.length === 0 ? 'Add salary structures under Setup.' : undefined}>
                {(p) => <Controller control={control} name="structure" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={options} placeholder="Choose…" />} />}
              </FormField>
              <FormField label="Own basic (a month)" error={errors.basic?.message} description={structure ? <>Structure’s: <Money value={structure.basic} tone="none" /></> : undefined}>
                <Input {...register('basic')} inputMode="decimal" />
              </FormField>
              <FormField label="From" required error={errors.effective_from?.message}>
                {(p) => <Controller control={control} name="effective_from" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            {structure && (structure.lines ?? []).length > 0 && (
              <p className="text-xs text-muted-foreground">
                The structure gives: {(structure.lines ?? []).map((l) => `${l.component_name} ${l.value}`).join(', ')}. Lines below replace a component’s value or add one for this person only.
              </p>
            )}
            <ComponentLines control={control as never} register={register as never} errors={errors.lines as never} />
            <FormField label="Note">
              <Input {...register('note')} maxLength={255} placeholder="Annual increment" />
            </FormField>
          </>
        )
      }}
    </FormDialog>
  )
}

const salaryState = (s: StaffSalary) => {
  const today = todayIso()
  if (s.effective_from > today) return { status: 'scheduled', label: 'From later', tone: 'info' as const }
  if (s.effective_to && s.effective_to < today) return { status: 'closed', label: 'Past', tone: 'muted' as const }
  return { status: 'active', label: 'Current', tone: 'success' as const }
}

/** Who is paid on which structure, from when, with any personal overrides. */
export function SalariesPage() {
  const list = useListState({ filters: ['staff', 'structure'] })
  const query = useSalaries(list.query)
  const staff = useStaffOptions()
  const { options } = useStructureOptions()
  const remove = useRemoveSalary()
  const [assigning, setAssigning] = useState(false)
  const [deleting, setDeleting] = useState<StaffSalary | null>(null)
  const columns: Column<StaffSalary>[] = [
    { id: 'who', header: 'Staff member', mobile: 'title', cell: (s) => (
      <span>
        <span className="font-medium">{s.staff_name}</span> <span className="font-mono text-xs text-muted-foreground">{s.employee_number}</span>
      </span>
    ) },
    { id: 'structure', header: 'Structure', cell: (s) => s.structure_name },
    { id: 'basic', header: 'Basic', className: 'text-right', cell: (s) => (
      <span>
        <Money value={s.monthly_basic} tone="none" />
        {s.basic != null && <span className="ml-1 text-xs text-muted-foreground">own</span>}
      </span>
    ) },
    { id: 'own', header: 'Own lines', mobile: 'hidden', cell: (s) => (s.lines ?? []).map((l) => l.component_name).join(', ') || '—' },
    { id: 'period', header: 'Period', className: 'whitespace-nowrap tabular-nums', cell: (s) => `${formatDate(s.effective_from)} – ${s.effective_to ? formatDate(s.effective_to) : 'now'}` },
    { id: 'state', header: '', cell: (s) => { const st = salaryState(s); return <StatusBadge status={st.status} tone={st.tone} label={st.label} /> } },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Staff salaries"
        columns={columns}
        query={query}
        list={list}
        getRowId={(s) => s.id}
        searchPlaceholder="Name or employee no.…"
        toolbar={
          <PermissionGate permission={PERMS.payroll.manage}>
            <Button onClick={() => setAssigning(true)}>
              <Plus aria-hidden /> Assign salary
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'structure', label: 'Structure', options },
          { name: 'staff', label: 'Staff member', options: staff.data ?? [], hidden: !staff.canPick },
        ]}
        rowActions={(s) => <RowActions actions={[{ label: 'Delete', icon: Trash2, permission: PERMS.payroll.manage, destructive: true, onSelect: () => setDeleting(s) }]} />}
        empty={{ title: 'No salaries assigned', description: 'Set up a salary structure, then assign it to each person. Nobody without one is paid by a run.' }}
      />
      <AssignSalaryDialog open={assigning} onOpenChange={setAssigning} />
      <DeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        subject={`${deleting?.staff_name}’s salary from ${formatDate(deleting?.effective_from)}`}
        description="Only one no payslip has used. The salary before it opens again."
        onConfirm={async () => {
          await remove.mutateAsync(deleting!.id)
          toast.success('Salary removed.')
        }}
      />
    </>
  )
}

const adjustmentSchema = z.object({
  staff: z.string().min(1, 'Choose a staff member.'),
  kind: z.string(),
  amount: moneyInput,
  description: z.string().trim().min(1, 'Say what it is; it’s printed on the payslip.').max(200),
  reason: z.string().max(255),
  is_taxable: z.boolean(),
})

export function AdjustmentDialog({ open, staffId, onOpenChange }: { open: boolean; staffId?: Id; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const create = useCreateAdjustment()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add an adjustment"
      description="A one-off amount on this person’s next worked-out payslip: arrears, a bonus, an advance recovered."
      submitLabel="Add"
      schema={adjustmentSchema}
      defaultValues={{ staff: staffId ? String(staffId) : '', kind: 'earning', amount: '', description: '', reason: '', is_taxable: true }}
      onSubmit={async (v) => {
        await create.mutateAsync({ ...v, staff: Number(v.staff), kind: v.kind as PayrollAdjustment['kind'] })
        toast.success('Adjustment added; it goes on the next payslip.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {!staffId && (
              <FormField label="Staff member" required error={errors.staff?.message} className="sm:col-span-2">
                {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} placeholder="Choose…" />} />}
              </FormField>
            )}
            <FormField label="Kind">
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PayslipLineKindEnum')} />} />}
            </FormField>
            <FormField label="Amount" required error={errors.amount?.message}>
              <Input {...register('amount')} inputMode="decimal" />
            </FormField>
          </div>
          <FormField label="On the payslip as" required error={errors.description?.message}>
            <Input {...register('description')} maxLength={200} placeholder="Dashain bonus" />
          </FormField>
          <FormField label="Reason (office only)">
            <Input {...register('reason')} maxLength={255} />
          </FormField>
          {watch('kind') === 'earning' && (
            <Controller control={control} name="is_taxable" render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Taxable income
              </label>
            )} />
          )}
        </>
      )}
    </FormDialog>
  )
}

/** One-off earnings and deductions, waiting for or already on a payslip. */
export function AdjustmentsPage() {
  const list = useListState({ filters: ['staff', 'kind'] })
  const query = useAdjustments(list.query)
  const staff = useStaffOptions()
  const remove = useRemoveAdjustment()
  const crud = useCrudState<PayrollAdjustment>()
  const columns: Column<PayrollAdjustment>[] = [
    { id: 'who', header: 'Staff member', mobile: 'title', cell: (a) => <span className="font-medium">{a.staff_name}</span> },
    { id: 'what', header: 'What', cell: (a) => (
      <span>
        {a.description}
        {a.reason && <span className="block text-xs text-muted-foreground">{a.reason}</span>}
      </span>
    ) },
    { id: 'kind', header: 'Kind', cell: (a) => enumLabel('PayslipLineKindEnum', a.kind) },
    { id: 'amount', header: 'Amount', className: 'text-right', cell: (a) => <Money value={a.kind === 'deduction' ? `-${a.amount}` : a.amount} tone="none" /> },
    { id: 'on', header: 'On payslip', cell: (a) => (a.payslip_number ? <span className="font-mono text-xs">{a.payslip_number}</span> : <span className="text-warning">Waiting</span>) },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Payroll adjustments"
        columns={columns}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        searchable={false}
        toolbar={
          <PermissionGate permission={PERMS.payroll.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add adjustment
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'kind', label: 'Kind', options: enumOptions('PayslipLineKindEnum') },
          { name: 'staff', label: 'Staff member', options: staff.data ?? [], hidden: !staff.canPick },
        ]}
        rowActions={(a) => <RowActions actions={[{ label: 'Withdraw', icon: Undo2, permission: PERMS.payroll.manage, destructive: true, onSelect: () => crud.openDelete(a) }]} />}
        empty={{ title: 'No adjustments', description: 'Arrears, bonuses, advances recovered, or a correction to an approved payslip.' }}
      />
      <AdjustmentDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} />
      <DeleteDialog
        open={crud.deleting !== null}
        onOpenChange={(o) => !o && crud.closeDelete()}
        subject={`“${crud.deleting?.description}”`}
        confirmLabel="Withdraw"
        description="Possible until the payslip carrying it is approved."
        onConfirm={async () => {
          await remove.mutateAsync(crud.deleting!.id)
          toast.success('Adjustment withdrawn.')
        }}
      />
    </>
  )
}
