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
import { tr } from '@/lib/i18n'

const num = z.string().trim().regex(/^\d+(\.\d+)?$/, tr('A number.'))
const optionalNum = z.union([z.literal(''), num])

const schema = z
  .object({
    name: z.string().trim().min(1, tr('Required.')).max(100),
    program: z.string(),
    max_grade_point: num,
    require_all_subjects_pass: z.boolean(),
    overall_pass_percentage: optionalNum,
    start: z.enum(['neb-style', 'percentage', 'own']),
    bands: z.array(z.object({ min_percentage: num, letter: z.string().trim().min(1, tr('Letter.')).max(10), grade_point: num, remark: z.string().max(100), is_pass: z.boolean() })),
    divisions: z.array(z.object({ min_percentage: num, name: z.string().trim().min(1, tr('Name.')).max(50) })),
  })
  .refine((v) => v.start !== 'own' || v.bands.length > 0, { path: ['bands'], message: tr('Add at least one band, starting from 0%.') })

type Values = z.infer<typeof schema>

function BandsEditor({ control, register, errors, locked }: { control: Control<Values>; register: UseFormRegister<Values>; errors: Record<string, { message?: string }> | undefined; locked: boolean }) {
  const bands = useFieldArray({ control, name: 'bands' })
  const divisions = useFieldArray({ control, name: 'divisions' })
  return (
    <>
      <fieldset disabled={locked} className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{tr('Grade bands')}</legend>
        <p className="text-xs text-muted-foreground">{tr('Each band runs from its percentage up to the next one. The lowest must start at 0.')}</p>
        <div className="grid grid-cols-[5rem_4.5rem_4.5rem_1fr_auto_auto] items-center gap-2 text-xs text-muted-foreground">
          <span>{tr('From %')}</span>
          <span>{tr('Letter')}</span>
          <span>{tr('GP')}</span>
          <span>{tr('Remark')}</span>
          <span>{tr('Pass')}</span>
          <span />
        </div>
        {bands.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[5rem_4.5rem_4.5rem_1fr_auto_auto] items-center gap-2">
            <Input {...register(`bands.${i}.min_percentage`)} inputMode="decimal" aria-label={tr('Band {value} from percentage', { value: i + 1 })} />
            <Input {...register(`bands.${i}.letter`)} aria-label={tr('Band {value} letter', { value: i + 1 })} />
            <Input {...register(`bands.${i}.grade_point`)} inputMode="decimal" aria-label={tr('Band {value} grade point', { value: i + 1 })} />
            <Input {...register(`bands.${i}.remark`)} aria-label={tr('Band {value} remark', { value: i + 1 })} />
            <Controller control={control} name={`bands.${i}.is_pass`} render={({ field }) => <Checkbox checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} aria-label={tr('Band {value} passes', { value: i + 1 })} />} />
            <Button type="button" size="icon" variant="ghost" onClick={() => bands.remove(i)} aria-label={tr('Remove band {value}', { value: i + 1 })}>
              <X aria-hidden />
            </Button>
          </div>
        ))}
        {errors?.bands?.message && <p className="text-sm text-danger">{errors.bands.message}</p>}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => bands.append({ min_percentage: '0', letter: '', grade_point: '0', remark: '', is_pass: true })}>
          <Plus aria-hidden /> {tr('Add band')}
        </Button>
      </fieldset>
      <fieldset disabled={locked} className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">{tr('Divisions (optional)')}</legend>
        {divisions.fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[5rem_1fr_auto] items-center gap-2">
            <Input {...register(`divisions.${i}.min_percentage`)} inputMode="decimal" aria-label={tr('Division {value} from percentage', { value: i + 1 })} />
            <Input {...register(`divisions.${i}.name`)} aria-label={tr('Division {value} name', { value: i + 1 })} placeholder={tr('First division')} />
            <Button type="button" size="icon" variant="ghost" onClick={() => divisions.remove(i)} aria-label={tr('Remove division {value}', { value: i + 1 })}>
              <X aria-hidden />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => divisions.append({ min_percentage: '', name: '' })}>
          <Plus aria-hidden /> {tr('Add division')}
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
      title={record ? tr('Edit grade scale') : tr('New grade scale')}
      description={tr('How a percentage becomes a letter, a grade point and pass or fail.')}
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
        toast.success(record ? tr('Grade scale saved.') : tr('Grade scale added.'))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('Letter grading')} />
            </FormField>
            <FormField label={tr('For program')} error={errors.program?.message} description={tr('Empty: the default for every program without its own.')}>
              {(p) => <Controller control={control} name="program" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Default (all programs)')} options={(programs.data ?? []).map((pr) => ({ value: String(pr.id), label: pr.name }))} />} />}
            </FormField>
            <FormField label={tr('Highest grade point')} error={errors.max_grade_point?.message}>
              <Input {...register('max_grade_point')} inputMode="decimal" />
            </FormField>
            <FormField label={tr('Overall pass (%)')} error={errors.overall_pass_percentage?.message} description={tr('Optional. Below this the whole result fails.')}>
              <Input {...register('overall_pass_percentage')} inputMode="decimal" />
            </FormField>
          </div>
          <Controller
            control={control}
            name="require_all_subjects_pass"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('One failed subject fails the whole result')}
              </label>
            )}
          />
          {!record && (
            <FormField label={tr('Bands')}>
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
                        { value: 'neb-style', label: tr('Letters and GPA (A+ … NG, pass at 35%)') },
                        { value: 'percentage', label: tr('Pass/fail with divisions') },
                        { value: 'own', label: tr('My own bands') },
                      ]}
                    />
                  )}
                />
              )}
            </FormField>
          )}
          {locked && (
            <p className="flex items-center gap-2 rounded-md border border-warning/25 bg-warning-soft p-2 text-sm">
              <Lock className="h-4 w-4" aria-hidden /> {tr('Published results use this scale, so its bands can’t change. Make a new scale for later exams.')}
            </p>
          )}
          {watch('start') === 'own' && <BandsEditor control={control} register={register} errors={errors as never} locked={locked} />}
          <RowErrors errors={errors.bands} label={tr('Band')} />
          <RowErrors errors={errors.divisions} label={tr('Division')} />
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
        title={tr('Grade scales')}
        description={tr('An exam uses its program’s scale, or the default.')}
        action={
          <PermissionGate permission={PERMS.grades.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add grade scale')}
            </Button>
          </PermissionGate>
        }
      />
      {query.isPending ? (
        <TableSkeleton rows={4} columns={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <EmptyState title={tr('No grade scale yet')} description={tr('Exams need one. Add a default scale to start; a ready-made table is offered.')} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {query.data.results.map((s) => (
            <section key={s.id} className="rounded-lg border bg-card">
              <header className="flex items-start gap-2 border-b px-4 py-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {s.program_name ?? tr('Default for all programs')} {'· ' + tr('GP out of {dec}', { dec: dec(s.max_grade_point) })}
                    {s.require_all_subjects_pass ? ' · ' + tr('every subject must pass') : ''}
                    {s.overall_pass_percentage ? ' · ' + tr('overall pass {dec}%', { dec: dec(s.overall_pass_percentage) }) : ''}
                  </p>
                </div>
                {s.in_use && <StatusBadge status="closed" label={tr('In use')} />}
                <RowActions
                  actions={[
                    { label: tr('Edit'), icon: Pencil, permission: PERMS.grades.manage, onSelect: () => crud.openEdit(s) },
                    { label: tr('Delete'), icon: Trash2, permission: PERMS.grades.manage, destructive: true, onSelect: () => crud.openDelete(s) },
                  ]}
                />
              </header>
              <table className="w-full text-sm" aria-label={tr('Bands of {name}', { name: s.name })}>
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-1.5 font-medium">{tr('From')}</th>
                    <th className="px-2 py-1.5 font-medium">{tr('Grade')}</th>
                    <th className="px-2 py-1.5 font-medium">{tr('GP')}</th>
                    <th className="px-2 py-1.5 font-medium">{tr('Remark')}</th>
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
                <p className="border-t px-4 py-2 text-xs text-muted-foreground">{tr('Divisions: {map}', { map: (s.divisions ?? []).map((d) => tr('{name} from {percent}%', { name: d.name, percent: dec(d.min_percentage) })).join(' · ') })}</p>
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
          subject={tr('the grade scale “{name}”', { name: crud.deleting.name })}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Grade scale deleted.'))
          }}
        />
      )}
    </>
  )
}
