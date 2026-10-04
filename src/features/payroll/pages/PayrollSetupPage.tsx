import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Money } from '@/features/finance/components/money'
import { useFiscalYearOptions } from '@/features/hr/hooks/useHr'
import { useCrudState } from '@/hooks/useCrudState'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { PayComponent, SalaryStructure, TaxScheme } from '../api/payroll.api'
import {
  useComponents,
  useCreateComponent,
  useCreatePayrollSettings,
  useCreateStructure,
  useCreateTaxScheme,
  usePayrollSettings,
  useRemoveComponent,
  useRemoveStructure,
  useRemoveTaxScheme,
  useStructures,
  useTaxSchemes,
  useUpdateComponent,
  useUpdatePayrollSettings,
  useUpdateStructure,
  useUpdateTaxScheme,
} from '../hooks/usePayroll'
import { amountOrZero, ComponentLines, componentValue, lineSchema } from './SalaryPages'

const code = z.string().trim().min(1, 'Required.').max(50).regex(/^[a-z0-9_-]+$/i, 'Letters, numbers, - and _ only.')
const percent = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'A number.').refine((v) => Number(v) <= 100, 'At most 100.')

function Card({ title, description, onAdd, addLabel, children, className }: { title: string; description?: string; onAdd?: () => void; addLabel?: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <SectionHeader
        title={title}
        description={description}
        action={
          onAdd && (
            <PermissionGate permission={PERMS.payroll.manage}>
              <Button size="sm" variant="outline" onClick={onAdd}>
                <Plus aria-hidden /> {addLabel}
              </Button>
            </PermissionGate>
          )
        }
      />
      {children}
    </section>
  )
}

const settingsSchema = z.object({
  absence_basis: z.string(),
  days_basis: z.string(),
  deduct_half_days: z.boolean(),
  overtime_enabled: z.boolean(),
  overtime_multiplier: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Like 1.5.').refine((v) => Number(v) > 0, 'More than zero.'),
  overtime_min_minutes: z.string().trim().regex(/^\d+$/, 'Whole minutes.'),
  default_day_minutes: z.string().trim().regex(/^\d+$/, 'Whole minutes.').refine((v) => Number(v) > 0, 'More than zero.'),
})

function Settings() {
  const query = usePayrollSettings({})
  const create = useCreatePayrollSettings()
  const update = useUpdatePayrollSettings()
  const { can } = usePermissions()
  const [open, setOpen] = useState(false)
  const s = query.data?.results[0]
  const rows: Array<[string, string]> = [
    ['Absence', enumLabel('AbsenceBasisEnum', s?.absence_basis ?? 'marked')],
    ['A day’s pay', `Monthly ÷ ${(s?.days_basis ?? 'working') === 'working' ? 'working' : 'calendar'} days`],
    ['Half days', s?.deduct_half_days ? 'Cost half a day' : 'Not deducted'],
    ['Overtime', s?.overtime_enabled === false ? 'Off' : `×${Number(s?.overtime_multiplier ?? 1.5)} after ${s?.overtime_min_minutes ?? 30} min`],
    ['Working day', `${(s?.default_day_minutes ?? 480) / 60} hours without a schedule`],
  ]
  return (
    <section>
      <SectionHeader
        title="How attendance counts"
        description={s ? undefined : 'Defaults apply until you change them.'}
        action={can(PERMS.payroll.manage) && <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Pencil aria-hidden /> Change</Button>}
      />
      <dl className="divide-y rounded-lg border bg-card text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 px-3 py-1.5">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Payroll settings"
        schema={settingsSchema}
        defaultValues={{
          absence_basis: s?.absence_basis ?? 'marked',
          days_basis: s?.days_basis ?? 'working',
          deduct_half_days: s?.deduct_half_days ?? false,
          overtime_enabled: s?.overtime_enabled ?? true,
          overtime_multiplier: String(Number(s?.overtime_multiplier ?? '1.5')),
          overtime_min_minutes: String(s?.overtime_min_minutes ?? 30),
          default_day_minutes: String(s?.default_day_minutes ?? 480),
        }}
        onSubmit={async (v) => {
          const input = { ...v, absence_basis: v.absence_basis as 'marked', days_basis: v.days_basis as 'working', overtime_min_minutes: Number(v.overtime_min_minutes), default_day_minutes: Number(v.default_day_minutes) }
          if (s) await update.mutateAsync({ id: s.id, input })
          else await create.mutateAsync(input)
          toast.success('Payroll settings saved.')
        }}
      >
        {({ register, control, watch, formState: { errors } }) => (
          <>
            <FormField label="Who counts as absent">
              {(p) => <Controller control={control} name="absence_basis" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('AbsenceBasisEnum')} />} />}
            </FormField>
            <FormField label="A day’s pay is the monthly amount divided by">
              {(p) => <Controller control={control} name="days_basis" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('DaysBasisEnum')} />} />}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Working day (minutes)" error={errors.default_day_minutes?.message} description="For staff without a schedule.">
                <Input {...register('default_day_minutes')} inputMode="numeric" />
              </FormField>
              {watch('overtime_enabled') && (
                <>
                  <FormField label="Overtime rate" error={errors.overtime_multiplier?.message} description="× the hourly rate.">
                    <Input {...register('overtime_multiplier')} inputMode="decimal" />
                  </FormField>
                  <FormField label="Counted after (min)" error={errors.overtime_min_minutes?.message} description="A day’s extra time below this is ignored.">
                    <Input {...register('overtime_min_minutes')} inputMode="numeric" />
                  </FormField>
                </>
              )}
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {([['deduct_half_days', 'A half day costs half a day’s pay'], ['overtime_enabled', 'Pay overtime']] as const).map(([name, label]) => (
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
    </section>
  )
}

const componentSchema = z.object({ code, name: z.string().trim().min(1, 'Required.').max(100), kind: z.string(), calculation: z.string(), is_taxable: z.boolean(), is_pre_tax: z.boolean(), prorate_for_absence: z.boolean(), is_active: z.boolean() })

function Components() {
  const query = useComponents({ ...PICKER_PARAMS })
  const create = useCreateComponent()
  const update = useUpdateComponent()
  const remove = useRemoveComponent()
  const crud = useCrudState<PayComponent>()
  const r = crud.record
  const rows = query.data?.results ?? []
  return (
    <Card title="Pay components" description="Allowances and deductions: dearness allowance, PF, CIT, SSF…" onAdd={crud.openCreate} addLabel="Add component">
      {rows.length === 0 ? (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">{query.isPending ? 'Loading…' : 'None yet.'}</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map((c) => (
            <li key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="flex-1">
                <span className="font-medium">{c.name}</span> <span className="font-mono text-xs text-muted-foreground">{c.code}</span>
                {c.is_active === false && <StatusBadge status="inactive" className="ml-2" />}
                <span className="block text-xs text-muted-foreground">
                  {[c.kind === 'earning' ? 'Earning' : 'Deduction', c.calculation === 'percent_of_basic' ? '% of basic' : 'fixed', c.kind === 'earning' && (c.is_taxable === false ? 'not taxed' : 'taxed'), c.is_pre_tax && 'before tax', c.kind === 'earning' && c.prorate_for_absence === false && 'not cut for absence'].filter(Boolean).join(' · ')}
                </span>
              </span>
              <RowActions
                label={`Actions for ${c.name}`}
                actions={[
                  { label: 'Edit', icon: Pencil, permission: PERMS.payroll.manage, onSelect: () => crud.openEdit(c) },
                  { label: 'Delete', icon: Trash2, permission: PERMS.payroll.manage, destructive: true, onSelect: () => crud.openDelete(c) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={r ? `Edit ${r.name}` : 'Add pay component'}
        schema={componentSchema}
        defaultValues={{ code: r?.code ?? '', name: r?.name ?? '', kind: r?.kind ?? 'earning', calculation: r?.calculation ?? 'fixed', is_taxable: r?.is_taxable ?? true, is_pre_tax: r?.is_pre_tax ?? false, prorate_for_absence: r?.prorate_for_absence ?? true, is_active: r?.is_active ?? true }}
        onSubmit={async (v) => {
          const input = { ...v, kind: v.kind as PayComponent['kind'], calculation: v.calculation as PayComponent['calculation'], is_pre_tax: v.kind === 'deduction' && v.is_pre_tax }
          if (r) await update.mutateAsync({ id: r.id, input })
          else await create.mutateAsync(input)
          toast.success('Component saved.')
        }}
      >
        {({ register, control, watch, formState: { errors } }) => {
          const earning = watch('kind') === 'earning'
          const toggles = (earning ? [['is_taxable', 'Taxable income'], ['prorate_for_absence', 'Cut for unpaid days, like basic']] : [['is_pre_tax', 'Taken before tax (PF, CIT, SSF)']]) as Array<['is_taxable' | 'prorate_for_absence' | 'is_pre_tax', string]>
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                <FormField label="Name" required error={errors.name?.message}>
                  <Input {...register('name')} placeholder="Dearness allowance" />
                </FormField>
                <FormField label="Code" required error={errors.code?.message}>
                  <Input {...register('code')} className="font-mono" placeholder="da" />
                </FormField>
                <FormField label="Kind">
                  {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PayComponentKindEnum')} />} />}
                </FormField>
                <FormField label="Worked out as">
                  {(p) => <Controller control={control} name="calculation" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('CalculationEnum')} />} />}
                </FormField>
              </div>
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                {[...toggles, ['is_active', 'In use on new payslips'] as const].map(([name, label]) => (
                  <Controller key={name} control={control} name={name} render={({ field }) => (
                    <label className="flex items-center gap-3">
                      <Switch checked={field.value} onCheckedChange={field.onChange} /> {label}
                    </label>
                  )} />
                ))}
              </div>
            </>
          )
        }}
      </FormDialog>
      <DeleteDialog open={crud.deleting !== null} onOpenChange={(o) => !o && crud.closeDelete()} subject={crud.deleting?.name ?? 'component'} onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success('Deleted.') }} />
    </Card>
  )
}

const structureSchema = z.object({ code, name: z.string().trim().min(1, 'Required.').max(150), description: z.string(), basic: amountOrZero, is_active: z.boolean(), lines: z.array(lineSchema) })

function Structures() {
  const query = useStructures({ ...PICKER_PARAMS })
  const components = useComponents({ ...PICKER_PARAMS })
  const create = useCreateStructure()
  const update = useUpdateStructure()
  const remove = useRemoveStructure()
  const crud = useCrudState<SalaryStructure>()
  const r = crud.record
  const rows = query.data?.results ?? []
  const comp = (id: number) => components.data?.results.find((c) => c.id === id)
  return (
    <Card title="Salary structures" description="Pay grades: a monthly basic plus components." onAdd={crud.openCreate} addLabel="Add structure" className="lg:col-span-2">
      {rows.length === 0 ? (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">{query.isPending ? 'Loading…' : 'None yet: add “Lecturer A”, “Office assistant”…'}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((s) => (
            <li key={s.id} className="rounded-lg border bg-card p-3 text-sm">
              <div className="flex items-start gap-2">
                <p className="flex-1">
                  <span className="font-medium">{s.name}</span> <span className="font-mono text-xs text-muted-foreground">{s.code}</span>
                  {s.is_active === false && <StatusBadge status="inactive" className="ml-2" />}
                </p>
                <RowActions
                  label={`Actions for ${s.name}`}
                  actions={[
                    { label: 'Edit', icon: Pencil, permission: PERMS.payroll.manage, onSelect: () => crud.openEdit(s) },
                    { label: 'Delete', icon: Trash2, permission: PERMS.payroll.manage, destructive: true, onSelect: () => crud.openDelete(s) },
                  ]}
                />
              </div>
              <dl className="mt-1 grid gap-0.5">
                <div className="flex justify-between"><dt>Basic</dt><dd><Money value={s.basic} tone="none" /></dd></div>
                {(s.lines ?? []).map((l) => (
                  <div key={l.id} className="flex justify-between text-muted-foreground">
                    <dt>{l.component_name}{comp(l.component)?.kind === 'deduction' ? ' (deduction)' : ''}</dt>
                    <dd>{componentValue(comp(l.component), l.value)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={r ? `Edit ${r.name}` : 'Add salary structure'}
        wide
        schema={structureSchema}
        defaultValues={{ code: r?.code ?? '', name: r?.name ?? '', description: r?.description ?? '', basic: r?.basic ?? '', is_active: r?.is_active ?? true, lines: (r?.lines ?? []).map((l) => ({ component: String(l.component), value: String(Number(l.value)) })) }}
        onSubmit={async (v) => {
          const input = { ...v, lines: v.lines.map((l) => ({ component: Number(l.component), value: l.value })) }
          if (r) await update.mutateAsync({ id: r.id, input })
          else await create.mutateAsync(input)
          toast.success('Structure saved.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem_10rem]">
              <FormField label="Name" required error={errors.name?.message}>
                <Input {...register('name')} placeholder="Lecturer A" />
              </FormField>
              <FormField label="Code" required error={errors.code?.message}>
                <Input {...register('code')} className="font-mono" />
              </FormField>
              <FormField label="Basic (a month)" required error={errors.basic?.message}>
                <Input {...register('basic')} inputMode="decimal" />
              </FormField>
            </div>
            <ComponentLines control={control as never} register={register as never} errors={errors.lines as never} hint="Fixed components take an amount a month; percentage ones a % of basic." />
            <FormField label="Description">
              <Textarea {...register('description')} rows={2} />
            </FormField>
            <Controller control={control} name="is_active" render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Can be assigned
              </label>
            )} />
          </>
        )}
      </FormDialog>
      <DeleteDialog open={crud.deleting !== null} onOpenChange={(o) => !o && crud.closeDelete()} subject={crud.deleting?.name ?? 'structure'} onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success('Deleted.') }} />
    </Card>
  )
}

const taxSchema = z
  .object({
    fiscal_year: z.string().min(1, 'Choose a year.'),
    tax_status: z.string(),
    name: z.string().max(150),
    female_rebate_percent: percent,
    pre_tax_cap_annual: z.union([z.literal(''), amountOrZero]),
    pre_tax_cap_fraction: z.union([z.literal(''), z.string().trim().regex(/^0?\.\d{1,4}$|^1$/, 'A share like 0.3333.')]),
    slabs: z.array(z.object({ upto: z.union([z.literal(''), amountOrZero]), rate: percent })).min(1),
  })
  .superRefine((v, ctx) => {
    v.slabs.forEach((s, i) => {
      const last = i === v.slabs.length - 1
      if (last && s.upto !== '') ctx.addIssue({ code: 'custom', path: ['slabs', i, 'upto'], message: 'The last slab has no limit.' })
      if (!last && s.upto === '') ctx.addIssue({ code: 'custom', path: ['slabs', i, 'upto'], message: 'Required.' })
      if (!last && i > 0 && s.upto !== '' && Number(s.upto) <= Number(v.slabs[i - 1].upto)) ctx.addIssue({ code: 'custom', path: ['slabs', i, 'upto'], message: 'Must rise.' })
    })
  })
type TaxValues = z.infer<typeof taxSchema>

function TaxSlabs({ control, register, errors }: { control: Control<TaxValues>; register: UseFormRegister<TaxValues>; errors: FieldErrors<TaxValues> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'slabs' })
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Slabs (annual taxable income)</legend>
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1fr_7rem_auto] items-start gap-2">
          <div>
            <Input {...register(`slabs.${i}.upto`)} aria-label={`Slab ${i + 1} up to`} inputMode="decimal" placeholder={i === fields.length - 1 ? 'Above that' : 'Up to'} readOnly={i === fields.length - 1} />
            {errors.slabs?.[i]?.upto?.message && <p className="mt-1 text-xs text-danger">{errors.slabs[i]?.upto?.message}</p>}
          </div>
          <div>
            <Input {...register(`slabs.${i}.rate`)} aria-label={`Slab ${i + 1} rate`} inputMode="decimal" placeholder="Rate %" />
            {errors.slabs?.[i]?.rate?.message && <p className="mt-1 text-xs text-danger">{errors.slabs[i]?.rate?.message}</p>}
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove slab ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ upto: '', rate: '' }, { shouldFocus: false })}>
          <Plus aria-hidden /> Add slab
        </Button>
        <span className="ml-2 text-xs text-muted-foreground">The last slab is open-ended.</span>
      </div>
    </fieldset>
  )
}

function TaxSchemes() {
  const query = useTaxSchemes({ ...PICKER_PARAMS })
  const years = useFiscalYearOptions()
  const create = useCreateTaxScheme()
  const update = useUpdateTaxScheme()
  const remove = useRemoveTaxScheme()
  const crud = useCrudState<TaxScheme>()
  const r = crud.record
  const rows = query.data?.results ?? []
  return (
    <Card title="Income tax" description="Each fiscal year’s slabs, for single and couple filers." onAdd={crud.openCreate} addLabel="Add scheme" className="lg:col-span-2">
      {rows.length === 0 ? (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">{query.isPending ? 'Loading…' : 'None yet: without a scheme, payslips withhold no tax.'}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((t) => (
            <li key={t.id} className="rounded-lg border bg-card p-3 text-sm">
              <div className="flex items-start gap-2">
                <p className="flex-1 font-medium">
                  {t.fiscal_year_name} · {enumLabel('TaxStatusEnum', t.tax_status)}
                  {t.name && <span className="block text-xs font-normal text-muted-foreground">{t.name}</span>}
                </p>
                <RowActions
                  label={`Actions for ${t.fiscal_year_name} ${t.tax_status}`}
                  actions={[
                    { label: 'Edit', icon: Pencil, permission: PERMS.payroll.manage, onSelect: () => crud.openEdit(t) },
                    { label: 'Delete', icon: Trash2, permission: PERMS.payroll.manage, destructive: true, onSelect: () => crud.openDelete(t) },
                  ]}
                />
              </div>
              <table className="mt-1 w-full">
                <tbody>
                  {t.slabs.map((s, i) => (
                    <tr key={s.sequence} className="text-muted-foreground">
                      <td className="py-0.5">{s.upto == null ? <>Above <Money value={t.slabs[i - 1]?.upto ?? 0} tone="none" /></> : <>Up to <Money value={s.upto} tone="none" /></>}</td>
                      <td className="py-0.5 text-right tabular-nums">{Number(s.rate)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {Number(t.female_rebate_percent ?? 0) > 0 && <p className="mt-1 text-xs text-muted-foreground">{Number(t.female_rebate_percent)}% rebate for women</p>}
            </li>
          ))}
        </ul>
      )}
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={r ? 'Edit tax scheme' : 'Add tax scheme'}
        wide
        schema={taxSchema}
        defaultValues={{
          fiscal_year: r ? String(r.fiscal_year) : years.current ? String(years.current.id) : '',
          tax_status: r?.tax_status ?? 'single',
          name: r?.name ?? '',
          female_rebate_percent: String(Number(r?.female_rebate_percent ?? 0)),
          pre_tax_cap_annual: r?.pre_tax_cap_annual ?? '',
          pre_tax_cap_fraction: r?.pre_tax_cap_fraction ? String(Number(r.pre_tax_cap_fraction)) : '',
          slabs: r ? r.slabs.map((s) => ({ upto: s.upto ?? '', rate: String(Number(s.rate)) })) : [{ upto: '', rate: '' }],
        }}
        onSubmit={async (v) => {
          const input = {
            ...v,
            fiscal_year: Number(v.fiscal_year),
            tax_status: v.tax_status as TaxScheme['tax_status'],
            pre_tax_cap_annual: v.pre_tax_cap_annual || null,
            pre_tax_cap_fraction: v.pre_tax_cap_fraction || null,
            slabs: v.slabs.map((s) => ({ upto: s.upto || null, rate: s.rate })),
          }
          if (r) await update.mutateAsync({ id: r.id, input })
          else await create.mutateAsync(input)
          toast.success('Tax scheme saved.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Fiscal year" required error={errors.fiscal_year?.message}>
                {(p) => <Controller control={control} name="fiscal_year" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={years.options} />} />}
              </FormField>
              <FormField label="For" error={errors.tax_status?.message}>
                {(p) => <Controller control={control} name="tax_status" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('TaxStatusEnum')} />} />}
              </FormField>
              <FormField label="Name">
                <Input {...register('name')} placeholder="Finance Act 2083" />
              </FormField>
            </div>
            <TaxSlabs control={control} register={register} errors={errors} />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Rebate for women (%)" error={errors.female_rebate_percent?.message}>
                <Input {...register('female_rebate_percent')} inputMode="decimal" />
              </FormField>
              <FormField label="Pre-tax cap a year" error={errors.pre_tax_cap_annual?.message} description="Empty: no cap.">
                <Input {...register('pre_tax_cap_annual')} inputMode="decimal" />
              </FormField>
              <FormField label="…and share of income" error={errors.pre_tax_cap_fraction?.message} description="e.g. 0.3333">
                <Input {...register('pre_tax_cap_fraction')} inputMode="decimal" />
              </FormField>
            </div>
          </>
        )}
      </FormDialog>
      <DeleteDialog open={crud.deleting !== null} onOpenChange={(o) => !o && crud.closeDelete()} subject="this tax scheme" onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success('Deleted.') }} />
    </Card>
  )
}

/** Payroll setup: attendance rules, components, structures and tax. */
export function PayrollSetupPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Components />
      <Settings />
      <Structures />
      <TaxSchemes />
    </div>
  )
}
