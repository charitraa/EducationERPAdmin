import { CalendarX, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatMoney } from '@/lib/currency'
import { formatDate, parseIsoDate, toIsoDate, todayIso } from '@/lib/dates'
import { enumOptions } from '@/lib/formatters'
import { isoDate } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Scholarship, StudentScholarship } from '../api/finance.api'
import { moneyInput } from '../components/money'
import { useCategoryOptions, useCreateScholarship, useEndGrant, useGrants, useGrantScholarship, useRemoveScholarship, useScholarshipOptions, useScholarships, useUpdateScholarship } from '../hooks/useFinance'
import { tr } from '@/lib/i18n'

const dayAfter = (iso: string) => {
  const d = parseIsoDate(iso)!
  d.setDate(d.getDate() + 1)
  return toIsoDate(d)
}

export const describeScholarship = (s: Pick<Scholarship, 'kind' | 'value' | 'category_name'>) =>
  `${s.kind === 'percentage' ? `${Number(s.value)}% off` : `${formatMoney(s.value)} off`} ${s.category_name ? s.category_name.toLowerCase() : 'every fee'}`

const scholarshipSchema = z
  .object({ name: z.string().trim().min(1, tr('Required.')).max(200), kind: z.string(), value: moneyInput, category: z.string(), is_active: z.boolean() })
  .refine((v) => v.kind !== 'percentage' || Number(v.value) <= 100, { path: ['value'], message: tr('At most 100%.') })

function ScholarshipDialog({ open, record, onOpenChange }: { open: boolean; record: Scholarship | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateScholarship()
  const update = useUpdateScholarship()
  const categories = useCategoryOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit scholarship') : tr('New scholarship')}
      description={tr('A standing reduction, applied as a line on every invoice generated while a student holds it.')}
      schema={scholarshipSchema}
      defaultValues={{ name: record?.name ?? '', kind: record?.kind ?? 'percentage', value: record?.value ?? '', category: record?.category ? String(record.category) : '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { name: v.name, kind: v.kind as Scholarship['kind'] & string, value: v.value, category: v.category ? Number(v.category) : null, is_active: v.is_active }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Scholarship saved.') : tr('Scholarship added.'))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <FormField label={tr('Name')} required error={errors.name?.message}>
            <Input {...register('name')} placeholder={tr('Merit scholarship, Sibling discount…')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Kind')}>
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ScholarshipKindEnum')} />} />}
            </FormField>
            <FormField label={watch('kind') === 'percentage' ? tr('Percent off') : tr('Amount off')} required error={errors.value?.message}>
              <Input {...register('value')} inputMode="decimal" className="tabular-nums" />
            </FormField>
          </div>
          <FormField label={tr('Applies to')} description={tr('Empty: every fee category.')}>
            {(p) => <Controller control={control} name="category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Every category')} options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />} />}
          </FormField>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Can be granted')}
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

function GrantDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const grant = useGrantScholarship()
  const scholarships = useScholarshipOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={tr('Grant a scholarship')}
      description={tr('It reduces invoices generated from the start date on. Invoices already issued don’t change.')}
      submitLabel={tr('Grant')}
      schema={z.object({ student: z.custom<Student | null>().refine((s) => s != null, tr('Choose a student.')), scholarship: z.string().min(1, tr('Choose one.')), started_on: isoDate, reason: z.string().max(255) })}
      defaultValues={{ student: null, scholarship: '', started_on: todayIso(), reason: '' }}
      onSubmit={async (v) => {
        await grant.mutateAsync({ student: v.student!.id, scholarship: Number(v.scholarship), started_on: v.started_on, reason: v.reason })
        toast.success(tr('Scholarship granted.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label={tr('Student')} required error={errors.student?.message}>
            {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Scholarship')} required error={errors.scholarship?.message}>
              {(p) => <Controller control={control} name="scholarship" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(scholarships.data ?? []).map((s) => ({ value: String(s.id), label: `${s.name} (${describeScholarship(s)})` }))} />} />}
            </FormField>
            <FormField label={tr('From (AD)')} required error={errors.started_on?.message}>
              {(p) => <Controller control={control} name="started_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
          </div>
          <FormField label={tr('Reason')} error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder={tr('Topped the class, staff ward…')} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** Scholarships on offer, and who holds which (ended grants stay on record). */
export default function ScholarshipsPage() {
  const scholarships = useScholarships({ ...PICKER_PARAMS })
  const crud = useCrudState<Scholarship>()
  const remove = useRemoveScholarship()
  const list = useListState({ filters: ['scholarship'] })
  const grants = useGrants(list.query)
  const end = useEndGrant()
  const [granting, setGranting] = useState(false)
  const [ending, setEnding] = useState<StudentScholarship | null>(null)

  const grantColumns: Column<StudentScholarship>[] = [
    { id: 'student', header: tr('Student'), mobile: 'title', cell: (g) => <span className="font-medium">{g.student_name}</span> },
    { id: 'scholarship', header: tr('Scholarship'), cell: (g) => g.scholarship_name },
    { id: 'from', header: tr('From'), className: 'tabular-nums', cell: (g) => formatDate(g.started_on) },
    { id: 'to', header: tr('Until'), className: 'tabular-nums', cell: (g) => (g.ended_on ? formatDate(g.ended_on) : <StatusBadge status="active" label={tr('Current')} />) },
    { id: 'reason', header: tr('Reason'), mobile: 'hidden', cell: (g) => g.reason || <span className="text-muted-foreground">—</span> },
  ]

  return (
    <div className="grid gap-8">
      <section>
        <SectionHeader
          title={tr('Scholarships')}
          action={
            <PermissionGate permission={PERMS.finance.manage}>
              <Button variant="outline" onClick={crud.openCreate}>
                <Plus aria-hidden /> {tr('New scholarship')}
              </Button>
            </PermissionGate>
          }
        />
        {scholarships.data?.results.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('None yet. Add the scholarships and discounts you offer.')}</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(scholarships.data?.results ?? []).map((s) => (
              <li key={s.id} className="flex items-start gap-2 rounded-lg border bg-card p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{describeScholarship(s)}</p>
                </div>
                {s.is_active === false && <StatusBadge status="inactive" label={tr('Closed')} />}
                <RowActions
                  actions={[
                    { label: tr('Edit'), icon: Pencil, permission: PERMS.finance.manage, onSelect: () => crud.openEdit(s) },
                    { label: tr('Delete'), icon: Trash2, permission: PERMS.finance.manage, destructive: true, onSelect: () => crud.openDelete(s) },
                  ]}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <SectionHeader title={tr('Students holding one')} />
        <DataTable
          ariaLabel={tr('Scholarship grants')}
          columns={grantColumns}
          query={grants}
          list={list}
          getRowId={(g) => g.id}
          searchable={false}
          create={
            <PermissionGate permission={PERMS.finance.manage}>
              <Button onClick={() => setGranting(true)} disabled={!scholarships.data?.results.length}>
                <UserPlus aria-hidden /> {tr('Grant')}
              </Button>
            </PermissionGate>
          }
          filters={[{ name: 'scholarship', label: tr('Scholarship'), options: (scholarships.data?.results ?? []).map((s) => ({ value: String(s.id), label: s.name })) }]}
          rowActions={(g) => <RowActions actions={[{ label: tr('End'), icon: CalendarX, permission: PERMS.finance.manage, hidden: g.ended_on != null, onSelect: () => setEnding(g) }]} />}
          empty={{ title: tr('No student holds a scholarship yet') }}
        />
      </section>
      <ScholarshipDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <GrantDialog open={granting} onOpenChange={setGranting} />
      <FormDialog
        open={ending != null}
        onOpenChange={(o) => !o && setEnding(null)}
        title={ending ? tr('End {student_name}’s {scholarship_name}?', { student_name: ending.student_name, scholarship_name: ending.scholarship_name }) : tr('End')}
        description={tr('Invoices generated after this date won’t include it. The grant stays on record.')}
        submitLabel={tr('End scholarship')}
        schema={z.object({ ended_on: isoDate })}
        // It must end after it started: a grant made today can end tomorrow at the earliest.
        defaultValues={{ ended_on: ending && ending.started_on >= todayIso() ? dayAfter(ending.started_on) : todayIso() }}
        onSubmit={async (v) => {
          await end.mutateAsync({ id: ending!.id, ended_on: v.ended_on })
          toast.success(tr('Scholarship ended.'))
        }}
      >
        {({ control, formState: { errors } }) => (
          <FormField label={tr('Last day (AD)')} required error={errors.ended_on?.message}>
            {(p) => <Controller control={control} name="ended_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
        )}
      </FormDialog>
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('the scholarship “{name}”', { name: crud.deleting.name })}
          description={tr('Only possible if no student was ever granted it; otherwise close it instead.')}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Scholarship deleted.'))
          }}
        />
      )}
    </div>
  )
}
