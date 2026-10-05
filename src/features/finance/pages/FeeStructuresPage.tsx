import { FilePlus2, Files, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray, type Control, type UseFormRegister } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FillWhenEmpty } from '@/components/forms/FillWhenEmpty'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { RowErrors } from '@/components/forms/RowErrors'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAcademicYearOptions, useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { levelLabel, programLevels } from '@/features/academics/programs/api/programs.api'
import { useProgramOptions } from '@/features/academics/programs/hooks/usePrograms'
import { useTerms } from '@/features/academics/terms/hooks/useTerms'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { sumMoney } from '@/lib/currency'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { code, optionalIsoDate } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { FeeCategory, FeeStructure, FeeStructureInput } from '../api/finance.api'
import { Money, moneyInput } from '../components/money'
import {
  useCategories,
  useCategoryOptions,
  useCreateCategory,
  useCreateStructure,
  useGenerateOneTimeInvoice,
  useGenerateTermInvoices,
  useRemoveCategory,
  useRemoveStructure,
  useStructures,
  useUpdateCategory,
  useUpdateStructure,
} from '../hooks/useFinance'
import { tr } from '@/lib/i18n'

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
const categorySchema = z.object({ code, name: z.string().trim().min(1, tr('Required.')).max(100), is_active: z.boolean() })

function CategoryDialog({ open, record, onOpenChange }: { open: boolean; record: FeeCategory | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateCategory()
  const update = useUpdateCategory()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit fee category') : tr('Add fee category')}
      schema={categorySchema}
      defaultValues={{ code: record?.code ?? '', name: record?.name ?? '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        if (record) await update.mutateAsync({ id: record.id, input: v })
        else await create.mutateAsync(v)
        toast.success(record ? tr('Category saved.') : tr('Category added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label={tr('Code')} required error={errors.code?.message}>
              <Input {...register('code')} placeholder="tuition" />
            </FormField>
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('Tuition fee')} />
            </FormField>
          </div>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('In use')}
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

function Categories() {
  const query = useCategories({ ...PICKER_PARAMS, ordering: 'name' })
  const remove = useRemoveCategory()
  const [editing, setEditing] = useState<FeeCategory | 'new' | null>(null)
  const [deleting, setDeleting] = useState<FeeCategory | null>(null)
  return (
    <section>
      <SectionHeader
        title={tr('Fee categories')}
        description={tr('The kinds of charge: tuition, admission, exam fee…')}
        action={
          <PermissionGate permission={PERMS.finance.manage}>
            <Button variant="outline" onClick={() => setEditing('new')}>
              <Tags aria-hidden /> {tr('Add category')}
            </Button>
          </PermissionGate>
        }
      />
      {query.isPending ? (
        <TableSkeleton rows={2} columns={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('No categories yet. Add one before making a fee structure.')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {query.data.results.map((c) => (
            <li key={c.id} className="flex items-center gap-1 rounded-full border bg-card py-0.5 pl-3 pr-1 text-sm">
              <span className={c.is_active === false ? 'text-muted-foreground line-through' : undefined}>{c.name}</span>
              <RowActions
                label={tr('Actions for {name}', { name: c.name })}
                actions={[
                  { label: tr('Edit'), icon: Pencil, permission: PERMS.finance.manage, onSelect: () => setEditing(c) },
                  { label: tr('Delete'), icon: Trash2, permission: PERMS.finance.manage, destructive: true, onSelect: () => setDeleting(c) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
      <CategoryDialog open={editing !== null} record={editing === 'new' ? null : editing} onOpenChange={(o) => !o && setEditing(null)} />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        subject={deleting ? tr('the category “{name}”', { name: deleting.name }) : tr('this category')}
        onConfirm={async () => {
          await remove.mutateAsync(deleting!.id)
          toast.success(tr('Category deleted.'))
        }}
      />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Structures
// ---------------------------------------------------------------------------
const structureSchema = z.object({
  program: z.string().min(1, tr('Choose a program.')),
  level: z.string().min(1, tr('Choose a level.')),
  academic_year: z.string().min(1, tr('Choose a year.')),
  name: z.string().max(200),
  is_active: z.boolean(),
  items: z
    .array(z.object({ category: z.string().min(1, tr('Choose a category.')), amount: moneyInput, frequency: z.string() }))
    .min(1, tr('Add what it charges.'))
    .refine((items) => new Set(items.map((i) => i.category)).size === items.length, tr('A category is listed twice.')),
})
type StructureValues = z.infer<typeof structureSchema>

function ItemsEditor({ control, register, error, locked }: { control: Control<StructureValues>; register: UseFormRegister<StructureValues>; error?: string; locked: boolean }) {
  const rows = useFieldArray({ control, name: 'items' })
  const categories = useCategoryOptions()
  return (
    <fieldset disabled={locked} className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{tr('Charges')}</legend>
      {rows.fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1fr_8rem_10rem_auto] items-center gap-2">
          <Controller control={control} name={`items.${i}.category`} render={({ field }) => <SelectControl value={field.value} onChange={field.onChange} disabled={locked} options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} aria-label={tr('Charge {value} category', { value: i + 1 })} />} />
          <Input {...register(`items.${i}.amount`)} inputMode="decimal" className="tabular-nums" aria-label={tr('Charge {value} amount', { value: i + 1 })} />
          <Controller control={control} name={`items.${i}.frequency`} render={({ field }) => <SelectControl value={field.value} onChange={field.onChange} disabled={locked} options={enumOptions('FrequencyEnum')} aria-label={tr('Charge {value} frequency', { value: i + 1 })} />} />
          <Button type="button" size="icon" variant="ghost" onClick={() => rows.remove(i)} aria-label={tr('Remove charge {value}', { value: i + 1 })}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => rows.append({ category: '', amount: '', frequency: 'per_term' })}>
        <Plus aria-hidden /> {tr('Add charge')}
      </Button>
    </fieldset>
  )
}

function StructureDialog({ open, record, onOpenChange }: { open: boolean; record: FeeStructure | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateStructure()
  const update = useUpdateStructure()
  const programs = useProgramOptions()
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit fee structure') : tr('New fee structure')}
      description={tr('What one level of a program costs in one academic year. Once invoices are generated from it, its charges can’t change.')}
      schema={structureSchema}
      defaultValues={{
        program: record ? String(record.program) : '',
        level: record ? String(record.level) : '',
        academic_year: String(record?.academic_year ?? current.data?.id ?? years.data?.[0]?.id ?? ''),
        name: record?.name ?? '',
        is_active: record?.is_active ?? true,
        items: (record?.items ?? []).map((i) => ({ category: String(i.category), amount: i.amount, frequency: i.frequency ?? 'per_term' })),
      }}
      onSubmit={async (v) => {
        const input: FeeStructureInput = {
          program: Number(v.program),
          level: Number(v.level),
          academic_year: Number(v.academic_year),
          name: v.name,
          is_active: v.is_active,
          items: v.items.map((i) => ({ category: Number(i.category), amount: i.amount, frequency: i.frequency as 'per_term' | 'one_time' })),
        }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Fee structure saved.') : tr('Fee structure added.'))
      }}
    >
      {({ register, control, watch, setValue, formState: { errors } }) => {
        const program = programs.data?.find((p) => String(p.id) === watch('program'))
        return (
          <>
            <FillWhenEmpty value={watch('academic_year')} fallback={String(current.data?.id ?? years.data?.[0]?.id ?? '') || null} fill={(v) => setValue('academic_year', v)} />
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={tr('Program')} required error={errors.program?.message}>
                {(p) => <Controller control={control} name="program" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(programs.data ?? []).map((x) => ({ value: String(x.id), label: x.name }))} />} />}
              </FormField>
              <FormField label={tr('Level')} required error={errors.level?.message}>
                {(p) => <Controller control={control} name="level" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={!program} options={programLevels(program).map((l) => ({ value: String(l), label: levelLabel(program, l) }))} />} />}
              </FormField>
              <FormField label={tr('Academic year')} required error={errors.academic_year?.message}>
                {(p) => <Controller control={control} name="academic_year" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.name }))} />} />}
              </FormField>
            </div>
            <FormField label={tr('Name')} error={errors.name?.message} description={tr('Optional. Shown instead of program, level and year.')}>
              <Input {...register('name')} maxLength={200} />
            </FormField>
            <ItemsEditor control={control} register={register} error={errors.items?.message ?? errors.items?.root?.message} locked={false} />
            <RowErrors errors={errors.items} label={tr('Charge')} />
            <Controller control={control} name="is_active" render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('In use')}
              </label>
            )} />
          </>
        )
      }}
    </FormDialog>
  )
}

const termSchema = z.object({ term: z.string().min(1, tr('Choose a term.')), section: z.string(), due_date: optionalIsoDate })

function GenerateTermDialog({ structure, onClose }: { structure: FeeStructure | null; onClose: () => void }) {
  const generate = useGenerateTermInvoices()
  const terms = useTerms({ ...PICKER_PARAMS, academic_year: structure?.academic_year }, { enabled: structure != null })
  const classes = useClasses({ ...PICKER_PARAMS, academic_year: structure?.academic_year, program: structure?.program, level: structure?.level })
  return (
    <FormDialog
      open={structure != null}
      onOpenChange={(o) => !o && onClose()}
      title={tr('Bill a term')}
      description={tr('One invoice for each student placed in a matching class, with the per-term charges and their scholarships. Students already billed for the term are skipped, so it’s safe to run again.')}
      submitLabel={tr('Generate invoices')}
      schema={termSchema}
      defaultValues={{ term: '', section: '', due_date: '' }}
      onSubmit={async (v) => {
        const r = await generate.mutateAsync({ id: structure!.id, term: Number(v.term), ...(v.section ? { section: Number(v.section) } : {}), ...(v.due_date ? { due_date: v.due_date } : {}) })
        toast.success(tr('{created} invoice{value} generated{value2}.', { created: r.created, value: r.created === 1 ? '' : 's', value2: r.skipped ? ', ' + tr('{skipped} already billed', { skipped: r.skipped }) : '' }))
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          <FormField label={tr('Term')} required error={errors.term?.message}>
            {(p) => <Controller control={control} name="term" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(terms.data?.results ?? []).map((t) => ({ value: String(t.id), label: t.name }))} placeholder={terms.data?.results.length === 0 ? tr('Add terms to the year first') : tr('Choose…')} />} />}
          </FormField>
          <FormField label={tr('Class')} description={tr('Empty: every matching class.')}>
            {(p) => <Controller control={control} name="section" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Every class')} options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.display_name }))} />} />}
          </FormField>
          <FormField label={tr('Due date (AD)')} error={errors.due_date?.message} description={tr('Empty: 15 days from today.')}>
            {(p) => <Controller control={control} name="due_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

function OneTimeDialog({ structure, onClose }: { structure: FeeStructure | null; onClose: () => void }) {
  const generate = useGenerateOneTimeInvoice()
  const navigate = useNavigate()
  return (
    <FormDialog
      open={structure != null}
      onOpenChange={(o) => !o && onClose()}
      wide
      title={tr('One-time invoice')}
      description={tr('The one-time charges (admission and the like) for one student placed in a class this structure covers. Each student gets it once.')}
      submitLabel={tr('Generate invoice')}
      schema={z.object({ student: z.custom<Student | null>().refine((s) => s != null, tr('Choose a student.')), due_date: optionalIsoDate })}
      defaultValues={{ student: null, due_date: '' }}
      onSubmit={async (v) => {
        const inv = await generate.mutateAsync({ id: structure!.id, student: v.student!.id, ...(v.due_date ? { due_date: v.due_date } : {}) })
        toast.success(tr('Invoice {invoice_number} generated.', { invoice_number: inv.invoice_number }))
        navigate(`/finance/invoices/${inv.id}`)
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          <FormField label={tr('Student')} required error={errors.student?.message}>
            {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
          </FormField>
          <FormField label={tr('Due date (AD)')} error={errors.due_date?.message}>
            {(p) => <Controller control={control} name="due_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** Fee categories, and what each program level costs per year, with invoice generation. */
export default function FeeStructuresPage() {
  const query = useStructures({ ...PICKER_PARAMS })
  const years = useAcademicYearOptions()
  const programs = useProgramOptions()
  const remove = useRemoveStructure()
  const { can } = usePermissions()
  const manage = can(PERMS.finance.manage)
  const [editing, setEditing] = useState<FeeStructure | 'new' | null>(null)
  const [deleting, setDeleting] = useState<FeeStructure | null>(null)
  const [billing, setBilling] = useState<FeeStructure | null>(null)
  const [oneTime, setOneTime] = useState<FeeStructure | null>(null)
  const yearName = (id: number) => years.data?.find((y) => y.id === id)?.name ?? ''
  const program = (id: number) => programs.data?.find((p) => p.id === id)

  return (
    <div className="grid gap-8">
      <Categories />
      <section>
        <SectionHeader
          title={tr('Fee structures')}
          action={
            manage && (
              <Button onClick={() => setEditing('new')}>
                <Plus aria-hidden /> {tr('New fee structure')}
              </Button>
            )
          }
        />
        {query.isPending ? (
          <TableSkeleton rows={4} columns={4} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : query.data.results.length === 0 ? (
          <EmptyState title={tr('No fee structures yet')} description={tr('Say what each level of each program costs this year, then bill a term in one go.')} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {query.data.results.map((s) => {
              const items = s.items ?? []
              const perTerm = items.filter((i) => i.frequency !== 'one_time')
              const once = items.filter((i) => i.frequency === 'one_time')
              return (
                <section key={s.id} className="rounded-lg border bg-card">
                  <header className="flex items-start gap-2 border-b px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{s.name || `${s.program_name} · ${levelLabel(program(s.program), s.level)}`}</h3>
                      <p className="text-xs text-muted-foreground">
                        {s.program_name} · {levelLabel(program(s.program), s.level)} · {yearName(s.academic_year)}
                      </p>
                    </div>
                    {s.is_active === false && <StatusBadge status="inactive" label={tr('Not in use')} />}
                    <RowActions
                      actions={[
                        { label: tr('Bill a term'), icon: Files, permission: PERMS.finance.manage, hidden: perTerm.length === 0, onSelect: () => setBilling(s) },
                        { label: tr('One-time invoice'), icon: FilePlus2, permission: PERMS.finance.manage, hidden: once.length === 0, onSelect: () => setOneTime(s) },
                        { label: tr('Edit'), icon: Pencil, permission: PERMS.finance.manage, onSelect: () => setEditing(s) },
                        { label: tr('Delete'), icon: Trash2, permission: PERMS.finance.manage, destructive: true, onSelect: () => setDeleting(s) },
                      ]}
                    />
                  </header>
                  <table className="w-full text-sm" aria-label={tr('Charges of {name}', { name: s.name || s.program_name })}>
                    <tbody className="divide-y">
                      {items.map((i) => (
                        <tr key={i.id}>
                          <td className="px-4 py-1.5">{i.category_name}</td>
                          <td className="px-2 py-1.5 text-xs text-muted-foreground">{enumLabel('FrequencyEnum', i.frequency)}</td>
                          <td className="px-4 py-1.5 text-right">
                            <Money value={i.amount} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t text-xs text-muted-foreground">
                      <tr>
                        <td className="px-4 py-1.5" colSpan={2}>
                          {tr('Per term')}
                        </td>
                        <td className="px-4 py-1.5 text-right font-medium text-foreground">
                          <Money value={sumMoney(perTerm.map((i) => i.amount))} />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </section>
              )
            })}
          </div>
        )}
      </section>
      <StructureDialog open={editing !== null} record={editing === 'new' ? null : editing} onOpenChange={(o) => !o && setEditing(null)} />
      <GenerateTermDialog structure={billing} onClose={() => setBilling(null)} />
      <OneTimeDialog structure={oneTime} onClose={() => setOneTime(null)} />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        subject={tr('this fee structure')}
        description={tr('Only possible before any invoice is generated from it.')}
        onConfirm={async () => {
          await remove.mutateAsync(deleting!.id)
          toast.success(tr('Fee structure deleted.'))
        }}
      />
    </div>
  )
}
