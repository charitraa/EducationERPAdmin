import { Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Controller, useFieldArray, type Control, type UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { RowErrors } from '@/components/forms/RowErrors'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useProgramOptions } from '@/features/academics/programs/hooks/usePrograms'
import { useCrudState } from '@/hooks/useCrudState'
import { toast } from '@/hooks/useToast'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import { dec, type GradeScale, type GradeScaleInput } from '../api/examinations.api'
import { useCreateGradeScale, useGradeScales, useRemoveGradeScale, useUpdateGradeScale } from '../hooks/useExaminations'

const num = z.string().trim().regex(/^\d+(\.\d+)?$/, 'A number.')
const optionalNum = z.union([z.literal(''), num])

const schema = z
  .object({
    name: z.string().trim().min(1, 'Required.').max(100),
    program: z.string(),
    max_grade_point: num,
    require_all_subjects_pass: z.boolean(),
    overall_pass_percentage: optionalNum,
    start: z.enum(['neb-style', 'percentage', 'own']),
    bands: z.array(z.object({ min_percentage: num, letter: z.string().trim().min(1, 'Letter.').max(10), grade_point: num, remark: z.string().max(100), is_pass: z.boolean() })),
    divisions: z.array(z.object({ min_percentage: num, name: z.string().trim().min(1, 'Name.').max(50) })),
  })
  .refine((v) => v.start !== 'own' || v.bands.length > 0, { path: ['bands'], message: 'Add at least one band, starting from 0%.' })

type Values = z.infer<typeof schema>

function BandsEditor({ control, register, errors, locked }: { control: Control<Values>; register: UseFormRegister<Values>; errors: Record<string, { message?: string }> | undefined; locked: boolean }) {
  const bands = useFieldArray({ control, name: 'bands' })
  const divisions = useFieldArray({ control, name: 'divisions' })
  return (
    <>
      <fieldset disabled={locked} className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Grade bands</legend>
        <p className="text-xs text-muted-foreground">Each band runs from its percentage up to the next one. The lowest must start at 0.</p>
        <div className="grid grid-cols-[5rem_4.5rem_4.5rem_1fr_auto_auto] items-center gap-2 text-xs text-muted-foreground">
          <span>From %</span>
          <span>Letter</span>
          <span>GP</span>
          <span>Remark</span>
          <span>Pass</span>
          <span />
        </div>
        {bands.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[5rem_4.5rem_4.5rem_1fr_auto_auto] items-center gap-2">
            <Input {...register(`bands.${i}.min_percentage`)} inputMode="decimal" aria-label={`Band ${i + 1} from percentage`} />
            <Input {...register(`bands.${i}.letter`)} aria-label={`Band ${i + 1} letter`} />
            <Input {...register(`bands.${i}.grade_point`)} inputMode="decimal" aria-label={`Band ${i + 1} grade point`} />
            <Input {...register(`bands.${i}.remark`)} aria-label={`Band ${i + 1} remark`} />
            <Controller control={control} name={`bands.${i}.is_pass`} render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} aria-label={`Band ${i + 1} passes`} />} />
            <Button type="button" size="icon" variant="ghost" onClick={() => bands.remove(i)} aria-label={`Remove band ${i + 1}`}>
              <X aria-hidden />
            </Button>
          </div>
        ))}
        {errors?.bands?.message && <p className="text-sm text-danger">{errors.bands.message}</p>}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => bands.append({ min_percentage: '0', letter: '', grade_point: '0', remark: '', is_pass: true })}>
          <Plus aria-hidden /> Add band
        </Button>
      </fieldset>
      <fieldset disabled={locked} className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Divisions (optional)</legend>
        {divisions.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[5rem_1fr_auto] items-center gap-2">
            <Input {...register(`divisions.${i}.min_percentage`)} inputMode="decimal" aria-label={`Division ${i + 1} from percentage`} />
            <Input {...register(`divisions.${i}.name`)} aria-label={`Division ${i + 1} name`} placeholder="First division" />
            <Button type="button" size="icon" variant="ghost" onClick={() => divisions.remove(i)} aria-label={`Remove division ${i + 1}`}>
              <X aria-hidden />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => divisions.append({ min_percentage: '', name: '' })}>
          <Plus aria-hidden /> Add division
        </Button>
      </fieldset>
    </>
  )
}

function ScaleDialog({ open, record, onOpenChange }: { open: boolean; record: GradeScale | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateGradeScale()
  const update = useUpdateGradeScale()
  const programs = useProgramOptions()
  const locked = record?.in_use ?? false
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? 'Edit grade scale' : 'New grade scale'}
      description="How a percentage becomes a letter, a grade point and pass or fail."
      schema={schema}
      defaultValues={{
        name: record?.name ?? '',
        program: record?.program ? String(record.program) : '',
        max_grade_point: dec(record?.max_grade_point ?? '4'),
        require_all_subjects_pass: record?.require_all_subjects_pass ?? true,
        overall_pass_percentage: record?.overall_pass_percentage ? dec(record.overall_pass_percentage) : '',
        start: (record ? 'own' : 'neb-style') as Values['start'],
        bands: (record?.bands ?? []).map((b) => ({ min_percentage: dec(b.min_percentage), letter: b.letter, grade_point: dec(b.grade_point ?? '0'), remark: b.remark ?? '', is_pass: b.is_pass ?? true })),
        divisions: (record?.divisions ?? []).map((d) => ({ min_percentage: dec(d.min_percentage), name: d.name })),
      }}
      onSubmit={async (v) => {
        const input: GradeScaleInput = {
          name: v.name,
          program: v.program ? Number(v.program) : null,
          max_grade_point: v.max_grade_point,
          require_all_subjects_pass: v.require_all_subjects_pass,
          overall_pass_percentage: v.overall_pass_percentage || null,
          ...(v.start === 'own' ? (locked ? {} : { bands: v.bands, divisions: v.divisions }) : { preset: v.start as Exclude<Values['start'], 'own'> }),
        }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Grade scale saved.' : 'Grade scale added.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Letter grading" />
            </FormField>
            <FormField label="For program" error={errors.program?.message} description="Empty: the default for every program without its own.">
              {(p) => <Controller control={control} name="program" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Default (all programs)" options={(programs.data ?? []).map((pr) => ({ value: String(pr.id), label: pr.name }))} />} />}
            </FormField>
            <FormField label="Highest grade point" error={errors.max_grade_point?.message}>
              <Input {...register('max_grade_point')} inputMode="decimal" />
            </FormField>
            <FormField label="Overall pass (%)" error={errors.overall_pass_percentage?.message} description="Optional. Below this the whole result fails.">
              <Input {...register('overall_pass_percentage')} inputMode="decimal" />
            </FormField>
          </div>
          <Controller
            control={control}
            name="require_all_subjects_pass"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> One failed subject fails the whole result
              </label>
            )}
          />
          {!record && (
            <FormField label="Bands">
              {(p) => (
                <Controller
                  control={control}
                  name="start"
                  render={({ field }) => (
                    <SelectControl
                      {...p}
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: 'neb-style', label: 'Letters and GPA (A+ … NG, pass at 35%)' },
                        { value: 'percentage', label: 'Pass/fail with divisions' },
                        { value: 'own', label: 'My own bands' },
                      ]}
                    />
                  )}
                />
              )}
            </FormField>
          )}
          {locked && (
            <p className="flex items-center gap-2 rounded-md border border-warning/25 bg-warning-soft p-2 text-sm">
              <Lock className="h-4 w-4" aria-hidden /> Published results use this scale, so its bands can’t change. Make a new scale for later exams.
            </p>
          )}
          {watch('start') === 'own' && <BandsEditor control={control} register={register} errors={errors as never} locked={locked} />}
          <RowErrors errors={errors.bands} label="Band" />
          <RowErrors errors={errors.divisions} label="Division" />
        </>
      )}
    </FormDialog>
  )
}

/** Grade scales: the organization's default, and any a program has of its own. */
export default function GradeScalesPage() {
  const query = useGradeScales(PICKER_PARAMS)
  const crud = useCrudState<GradeScale>()
  const remove = useRemoveGradeScale()
  return (
    <>
      <SectionHeader
        title="Grade scales"
        description="An exam uses its program’s scale, or the default."
        action={
          <PermissionGate permission={PERMS.grades.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add grade scale
            </Button>
          </PermissionGate>
        }
      />
      {query.isPending ? (
        <TableSkeleton rows={4} columns={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <EmptyState title="No grade scale yet" description="Exams need one. Add a default scale to start; a ready-made table is offered." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.results.map((s) => (
            <section key={s.id} className="rounded-lg border bg-card">
              <header className="flex items-start gap-2 border-b px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {s.program_name ?? 'Default for all programs'} · GP out of {dec(s.max_grade_point)}
                    {s.require_all_subjects_pass ? ' · every subject must pass' : ''}
                    {s.overall_pass_percentage ? ` · overall pass ${dec(s.overall_pass_percentage)}%` : ''}
                  </p>
                </div>
                {s.in_use && <StatusBadge status="closed" label="In use" />}
                <RowActions
                  actions={[
                    { label: 'Edit', icon: Pencil, permission: PERMS.grades.manage, onSelect: () => crud.openEdit(s) },
                    { label: 'Delete', icon: Trash2, permission: PERMS.grades.manage, destructive: true, onSelect: () => crud.openDelete(s) },
                  ]}
                />
              </header>
              <table className="w-full text-sm" aria-label={`Bands of ${s.name}`}>
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-1.5 font-medium">From</th>
                    <th className="px-2 py-1.5 font-medium">Grade</th>
                    <th className="px-2 py-1.5 font-medium">GP</th>
                    <th className="px-2 py-1.5 font-medium">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(s.bands ?? []).map((b) => (
                    <tr key={b.min_percentage} className={b.is_pass === false ? 'text-danger' : undefined}>
                      <td className="px-4 py-1.5 tabular-nums">{dec(b.min_percentage)}%</td>
                      <td className="px-2 py-1.5 font-medium">{b.letter}</td>
                      <td className="px-2 py-1.5 tabular-nums">{dec(b.grade_point)}</td>
                      <td className="px-2 py-1.5">{b.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(s.divisions ?? []).length > 0 && (
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">Divisions: {(s.divisions ?? []).map((d) => `${d.name} from ${dec(d.min_percentage)}%`).join(' · ')}</p>
              )}
            </section>
          ))}
        </div>
      )}
      <ScaleDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the grade scale “${crud.deleting.name}”`}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Grade scale deleted.')
          }}
        />
      )}
    </>
  )
}
