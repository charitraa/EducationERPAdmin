import { Calculator, Pencil, Plus, Send, Trash2, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FillWhenEmpty } from '@/components/forms/FillWhenEmpty'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { RowErrors } from '@/components/forms/RowErrors'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAcademicYearOptions, useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useProgramOptions } from '@/features/academics/programs/hooks/usePrograms'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import { dec, type ResultCounts, type ResultPlan, type ResultPlanInput } from '../api/examinations.api'
import { resultCountsText } from '../components/ResultBits'
import { useComputePlan, useCreatePlan, useExamOptions, usePlans, usePublishPlan, useRemovePlan, useUnpublishPlan, useUpdatePlan } from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

const weight = z.string().trim().regex(/^\d+(\.\d+)?$/, tr('A percent.'))
const schema = z
  .object({
    name: z.string().trim().min(1, tr('Required.')).max(200),
    program: z.string().min(1, tr('Choose a program.')),
    academic_year: z.string().min(1, tr('Choose a year.')),
    campus: z.string().min(1, tr('Choose a branch.')),
    on_transcript: z.boolean(),
    items: z.array(z.object({ exam: z.string().min(1, tr('Choose an exam.')), weight })).min(1, tr('Add the exams it combines.')),
  })
  .refine((v) => v.items.reduce((s, i) => s + Number(i.weight || 0), 0) <= 100, { path: ['items'], message: tr('The weights add up to more than 100%.') })

function PlanDialog({ open, record, onOpenChange }: { open: boolean; record: ResultPlan | null; onOpenChange: (o: boolean) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const programs = useProgramOptions()
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const create = useCreatePlan()
  const update = useUpdatePlan()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit term result') : tr('New term result')}
      description={tr('Combines several exams of one program, each counting for a share: say unit tests 20% and the terminal 80%.')}
      schema={schema}
      defaultValues={{
        name: record?.name ?? '',
        program: record ? String(record.program) : '',
        academic_year: String(record?.academic_year ?? current.data?.id ?? years.data?.[0]?.id ?? ''),
        campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        on_transcript: record?.on_transcript ?? true,
        items: (record?.items ?? []).map((i) => ({ exam: String(i.exam), weight: dec(i.weight) })),
      }}
      onSubmit={async (v) => {
        const input: ResultPlanInput = {
          name: v.name,
          program: Number(v.program),
          academic_year: Number(v.academic_year),
          campus: Number(v.campus),
          on_transcript: v.on_transcript,
          items: v.items.map((i) => ({ exam: Number(i.exam), weight: i.weight })),
        }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Term result saved.') : tr('Term result added.'))
      }}
    >
      {({ register, control, watch, setValue, formState: { errors } }) => (
        <>
          <FillWhenEmpty value={watch('academic_year')} fallback={String(current.data?.id ?? years.data?.[0]?.id ?? '') || null} fill={(v) => setValue('academic_year', v)} />
          <FormField label={tr('Name')} required error={errors.name?.message}>
            <Input {...register('name')} placeholder={tr('First term result')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('Program')} required error={errors.program?.message}>
              {(p) => <Controller control={control} name="program" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(programs.data ?? []).map((x) => ({ value: String(x.id), label: x.name }))} />} />}
            </FormField>
            <FormField label={tr('Academic year')} required error={errors.academic_year?.message}>
              {(p) => <Controller control={control} name="academic_year" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.name }))} />} />}
            </FormField>
            {isMultiBranch && (
              <FormField label={tr('Branch')} required error={errors.campus?.message}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
          </div>
          <ItemsEditor control={control} register={register} program={watch('program')} year={watch('academic_year')} campus={watch('campus')} error={errors.items?.message ?? errors.items?.root?.message} />
          <RowErrors errors={errors.items} label={tr('Exam')} />
          <Controller
            control={control}
            name="on_transcript"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Show on transcripts')}
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

type PlanValues = z.infer<typeof schema>

function ItemsEditor({ control, register, program, year, campus, error }: { control: import('react-hook-form').Control<PlanValues>; register: import('react-hook-form').UseFormRegister<PlanValues>; program: string; year: string; campus: string; error?: string }) {
  const rows = useFieldArray({ control, name: 'items' })
  const exams = useExamOptions({ program: program || undefined, academic_year: year || undefined, campus: campus || undefined }, Boolean(program && year))
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{tr('Exams and their weight')}</legend>
      {rows.fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
          <Controller control={control} name={`items.${i}.exam`} render={({ field }) => <SelectControl value={field.value} onChange={field.onChange} options={(exams.data ?? []).map((e) => ({ value: String(e.id), label: e.name }))} placeholder={program ? tr('Choose an exam…') : tr('Choose the program first')} aria-label={tr('Exam {value}', { value: i + 1 })} />} />
          <div className="relative">
            <Input {...register(`items.${i}.weight`)} inputMode="decimal" className="pr-7" aria-label={tr('Weight of exam {value}', { value: i + 1 })} />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => rows.remove(i)} aria-label={tr('Remove exam {value}', { value: i + 1 })}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => rows.append({ exam: '', weight: '' })}>
        <Plus aria-hidden /> {tr('Add exam')}
      </Button>
    </fieldset>
  )
}

/** Term results: several exams combined by weight into one result per student. */
export default function TermResultsPage() {
  const list = useListState({ filters: ['status'] })
  const query = usePlans(list.query)
  const crud = useCrudState<ResultPlan>()
  const remove = useRemovePlan()
  const compute = useComputePlan()
  const publish = usePublishPlan()
  const unpublish = useUnpublishPlan()
  const [acting, setActing] = useState<{ kind: 'compute' | 'publish' | 'unpublish'; plan: ResultPlan } | null>(null)

  const columns: Column<ResultPlan>[] = [
    { id: 'name', header: tr('Term result'), mobile: 'title', cell: (p) => <span className="font-medium">{p.name}</span> },
    { id: 'items', header: tr('Combines'), cell: (p) => (p.items ?? []).map((i) => `${i.exam_name} ${dec(i.weight)}%`).join(' + ') || '—' },
    { id: 'total', header: tr('Weights'), className: 'tabular-nums', cell: (p) => <span className={p.weights_total !== 100 ? 'text-warning' : undefined}>{p.weights_total}%</span> },
    { id: 'status', header: tr('Status'), cell: (p) => <StatusBadge status={p.status} label={enumLabel('TermResultStatusEnum', p.status)} /> },
  ]

  return (
    <>
      <DataTable
        ariaLabel={tr('Term results')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(p) => p.id}
        searchable={false}
        toolbar={
          <PermissionGate permission={PERMS.exams.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('New term result')}
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'status', label: tr('Status'), options: [{ value: 'draft', label: tr('Draft') }, { value: 'published', label: tr('Published') }] }]}
        rowActions={(p) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.exams.manage, hidden: p.status === 'published', onSelect: () => crud.openEdit(p) },
              { label: tr('Work out results'), icon: Calculator, permission: PERMS.exams.manage, hidden: p.status === 'published', onSelect: () => setActing({ kind: 'compute', plan: p }) },
              { label: tr('Publish'), icon: Send, permission: PERMS.exams.publish, hidden: p.status === 'published', onSelect: () => setActing({ kind: 'publish', plan: p }) },
              { label: tr('Unpublish'), icon: Undo2, permission: PERMS.exams.publish, hidden: p.status !== 'published', onSelect: () => setActing({ kind: 'unpublish', plan: p }) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.exams.manage, destructive: true, hidden: p.status === 'published', onSelect: () => crud.openDelete(p) },
            ]}
          />
        )}
        empty={{ title: tr('No term results yet'), description: tr('Combine exams by weight, say unit tests 20% and the terminal 80%, into one result.') }}
      />
      <PlanDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('the term result “{name}”', { name: crud.deleting.name })}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Term result deleted.'))
          }}
        />
      )}
      <ConfirmDialog
        open={acting?.kind === 'compute' || acting?.kind === 'publish'}
        onOpenChange={(o) => !o && setActing(null)}
        title={acting?.kind === 'publish' ? tr('Publish this term result?') : tr('Work out the term results?')}
        description={acting?.kind === 'publish' ? tr('Students and parents are notified and can see it.') : tr('From the exams’ results so far. Nothing is published.')}
        confirmLabel={acting?.kind === 'publish' ? tr('Publish') : tr('Work out')}
        onConfirm={async () => {
          const fn = acting!.kind === 'publish' ? publish : compute
          const r = (await fn.mutateAsync(acting!.plan.id)) as { results: ResultCounts }
          toast.success(`${acting!.kind === 'publish' ? 'Published' : 'Worked out'}: ${resultCountsText(r.results) || 'no results'}.`)
        }}
      />
      <FormDialog
        open={acting?.kind === 'unpublish'}
        onOpenChange={(o) => !o && setActing(null)}
        title={tr('Withdraw this term result?')}
        submitLabel={tr('Unpublish')}
        schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await unpublish.mutateAsync({ id: acting!.plan.id, reason: v.reason })
          toast.success(tr('Withdrawn.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} />
          </FormField>
        )}
      </FormDialog>
    </>
  )
}
