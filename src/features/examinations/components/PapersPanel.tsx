import { ListPlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { RowActions } from '@/components/common/RowActions'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useProgramCurriculum } from '@/features/academics/curriculum/hooks/useCurriculum'
import { levelLabel, programLevels } from '@/features/academics/programs/api/programs.api'
import { useProgramOptions } from '@/features/academics/programs/hooks/usePrograms'
import { hhmm } from '@/features/timetable/api/timetable.api'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { optionalIsoDate } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import { dec, type Exam, type Paper, type PaperInput } from '../api/examinations.api'
import { useAddCurriculum, useCreatePaper, usePapers, useRemovePaper, useUpdatePaper } from '../hooks/useExaminations'

const marks = z.string().trim().regex(/^\d+(\.\d+)?$/, 'A number.')
const time = z.union([z.literal(''), z.string().regex(/^\d{2}:\d{2}/, 'HH:MM')])

const paperSchema = z
  .object({
    level: z.string().min(1, 'Choose a level.'),
    subject: z.string().min(1, 'Choose a subject.'),
    date: optionalIsoDate,
    start_time: time,
    end_time: time,
    credit_hours: z.union([z.literal(''), marks]),
    components: z
      .array(z.object({ kind: z.string(), name: z.string().trim().min(1, 'Name it.').max(50), full_marks: marks, pass_marks: marks }))
      .min(1, 'Add at least one component.')
      .refine((cs) => cs.every((c) => Number(c.pass_marks) <= Number(c.full_marks) && Number(c.full_marks) > 0), 'Pass marks must be within the full marks.'),
  })
  .refine((v) => !v.start_time || !v.end_time || v.end_time > v.start_time, { path: ['end_time'], message: 'Must end after it starts.' })

function PaperDialog({ exam, open, record, onOpenChange }: { exam: Exam; open: boolean; record: Paper | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreatePaper()
  const update = useUpdatePaper()
  const programs = useProgramOptions()
  const program = programs.data?.find((p) => p.id === exam.program)
  const curriculum = useProgramCurriculum(exam.program)
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? `Edit ${record.subject_name}` : 'Add a paper'}
      description="One subject at one level. Components are marked separately (theory, practical…). The date and time can wait until you schedule."
      schema={paperSchema}
      defaultValues={{
        level: record ? String(record.level) : String(program?.first_level ?? ''),
        subject: record ? String(record.subject) : '',
        date: record?.date ?? '',
        start_time: hhmm(record?.start_time),
        end_time: hhmm(record?.end_time),
        credit_hours: record?.credit_hours ? dec(record.credit_hours) : '',
        components: record?.components?.length
          ? record.components.map((c) => ({ kind: c.kind ?? 'theory', name: c.name, full_marks: dec(c.full_marks), pass_marks: dec(c.pass_marks ?? '0') }))
          : [{ kind: 'theory', name: 'Theory', full_marks: '100', pass_marks: '35' }],
      }}
      onSubmit={async (v) => {
        const input: PaperInput = {
          exam: exam.id,
          level: Number(v.level),
          subject: Number(v.subject),
          date: v.date || null,
          start_time: v.start_time || null,
          end_time: v.end_time || null,
          credit_hours: v.credit_hours || null,
          components: v.components.map((c, i) => ({ ...c, kind: c.kind as never, order: i })),
        }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Paper saved.' : 'Paper added.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Level" required error={errors.level?.message}>
              {(p) => <Controller control={control} name="level" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={record != null} options={programLevels(program).map((l) => ({ value: String(l), label: levelLabel(program, l) }))} />} />}
            </FormField>
            <FormField label="Subject" required error={errors.subject?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="subject"
                  render={({ field }) => (
                    <SelectControl
                      {...p}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={record != null}
                      loading={curriculum.isPending}
                      options={(curriculum.data?.results ?? []).filter((c) => String(c.level) === watch('level')).map((c) => ({ value: String(c.subject), label: c.subject_name }))}
                      placeholder="From this level’s curriculum…"
                    />
                  )}
                />
              )}
            </FormField>
            <FormField label="Date (AD)" error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Starts" error={errors.start_time?.message}>
                <Input type="time" {...register('start_time')} />
              </FormField>
              <FormField label="Ends" error={errors.end_time?.message}>
                <Input type="time" {...register('end_time')} />
              </FormField>
            </div>
            <FormField label="Credit hours" error={errors.credit_hours?.message} description="GPA weight. Empty: the subject’s, or 1.">
              <Input {...register('credit_hours')} inputMode="decimal" />
            </FormField>
          </div>
          <ComponentsEditor control={control} register={register} error={errors.components?.message ?? errors.components?.root?.message} />
        </>
      )}
    </FormDialog>
  )
}

type PaperValues = z.infer<typeof paperSchema>

function ComponentsEditor({ control, register, error }: { control: import('react-hook-form').Control<PaperValues>; register: import('react-hook-form').UseFormRegister<PaperValues>; error?: string }) {
  const rows = useFieldArray({ control, name: 'components' })
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Marks components</legend>
      <div className="grid grid-cols-[8rem_1fr_5rem_5rem_auto] gap-2 text-xs text-muted-foreground">
        <span>Kind</span>
        <span>Name</span>
        <span>Full</span>
        <span>Pass</span>
        <span />
      </div>
      {rows.fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[8rem_1fr_5rem_5rem_auto] items-center gap-2">
          <Controller control={control} name={`components.${i}.kind`} render={({ field }) => <SelectControl value={field.value} onChange={field.onChange} options={enumOptions('ExamComponentKindEnum')} aria-label={`Component ${i + 1} kind`} />} />
          <Input {...register(`components.${i}.name`)} aria-label={`Component ${i + 1} name`} />
          <Input {...register(`components.${i}.full_marks`)} inputMode="decimal" aria-label={`Component ${i + 1} full marks`} />
          <Input {...register(`components.${i}.pass_marks`)} inputMode="decimal" aria-label={`Component ${i + 1} pass marks`} />
          <Button type="button" size="icon" variant="ghost" onClick={() => rows.remove(i)} disabled={rows.fields.length === 1} aria-label={`Remove component ${i + 1}`}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => rows.append({ kind: 'practical', name: rows.fields.length === 1 ? 'Practical' : '', full_marks: '25', pass_marks: '10' })}>
        <Plus aria-hidden /> Add component
      </Button>
    </fieldset>
  )
}

const curriculumSchema = z.object({
  levels: z.array(z.number()).min(1, 'Pick at least one level.'),
  full_marks: marks,
  pass_marks: marks,
  kind: z.string(),
})

function AddCurriculumDialog({ exam, open, onOpenChange }: { exam: Exam; open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useAddCurriculum()
  const programs = useProgramOptions()
  const program = programs.data?.find((p) => p.id === exam.program)
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add papers from the curriculum"
      description="One paper per curriculum subject at each level you pick, with a single component. Subjects that already have a paper are skipped. Set dates and times after."
      submitLabel="Add papers"
      schema={curriculumSchema}
      defaultValues={{ levels: programLevels(program), full_marks: '100', pass_marks: '35', kind: 'theory' }}
      onSubmit={async (v) => {
        const papers = await add.mutateAsync({ id: exam.id, levels: v.levels, full_marks: Number(v.full_marks), pass_marks: Number(v.pass_marks), kind: v.kind })
        toast.success(papers.length ? `${papers.length} paper${papers.length === 1 ? '' : 's'} added.` : 'Every curriculum subject already has a paper.')
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          <Controller
            control={control}
            name="levels"
            render={({ field }) => (
              <div className="grid gap-1.5">
                <p id="ac-levels" className="text-sm font-medium">
                  Levels
                </p>
                <div role="group" aria-labelledby="ac-levels" className="flex flex-wrap gap-1.5">
                  {programLevels(program).map((l) => {
                    const on = field.value.includes(l)
                    return (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={on}
                        onClick={() => field.onChange(on ? field.value.filter((x) => x !== l) : [...field.value, l])}
                        className={cn('rounded-md border px-3 py-1 text-sm', on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}
                      >
                        {levelLabel(program, l)}
                      </button>
                    )
                  })}
                </div>
                {errors.levels && <p className="text-sm text-danger">{errors.levels.message}</p>}
              </div>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Kind">
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ExamComponentKindEnum')} />} />}
            </FormField>
            <FormField label="Full marks" error={errors.full_marks?.message}>
              <Input {...register('full_marks')} inputMode="decimal" />
            </FormField>
            <FormField label="Pass marks" error={errors.pass_marks?.message}>
              <Input {...register('pass_marks')} inputMode="decimal" />
            </FormField>
          </div>
        </>
      )}
    </FormDialog>
  )
}

/** The exam's papers by level: when each is sat, and how it's marked. */
export function PapersPanel({ exam }: { exam: Exam }) {
  const papers = usePapers(exam.id)
  const programs = useProgramOptions()
  const program = programs.data?.find((p) => p.id === exam.program)
  const remove = useRemovePaper()
  const { can } = usePermissions()
  const editable = exam.status !== 'published' && can(PERMS.exams.manage)
  const [editing, setEditing] = useState<Paper | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Paper | null>(null)
  const [adding, setAdding] = useState(false)

  if (papers.isPending) return <TableSkeleton rows={5} columns={5} />
  if (papers.isError) return <ErrorState error={papers.error} onRetry={() => void papers.refetch()} />
  const levels = [...new Set(papers.data.map((p) => p.level))].sort((a, b) => a - b)

  return (
    <>
      {editable && (
        <div className="mb-3 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setAdding(true)}>
            <ListPlus aria-hidden /> Add from curriculum
          </Button>
          <Button onClick={() => setEditing('new')}>
            <Plus aria-hidden /> Add paper
          </Button>
        </div>
      )}
      {papers.data.length === 0 ? (
        <EmptyState title="No papers yet" description="Add a paper for each subject sat in this exam; Add from curriculum does every subject at once." />
      ) : (
        <div className="grid gap-4">
          {levels.map((level) => (
            <section key={level} className="overflow-x-auto rounded-lg border bg-card">
              <h3 className="border-b px-4 py-2 text-sm font-semibold">{levelLabel(program, level)}</h3>
              <table className="w-full text-sm" aria-label={`Papers for ${levelLabel(program, level)}`}>
                <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Marks</th>
                    <th className="px-3 py-2 text-right">Full</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {papers.data
                    .filter((p) => p.level === level)
                    .map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2 font-medium">{p.subject_name}</td>
                        <td className={cn('whitespace-nowrap px-3 py-2 tabular-nums', !p.date && 'text-warning')}>{p.date ? formatDate(p.date) : 'No date'}</td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums">{p.start_time ? `${hhmm(p.start_time)}–${hhmm(p.end_time)}` : '—'}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {(p.components ?? []).map((c) => `${c.name} ${dec(c.full_marks)} (pass ${dec(c.pass_marks)})`).join(' · ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.full_marks}</td>
                        <td className="px-2 py-2">
                          {editable && (
                            <RowActions
                              actions={[
                                { label: 'Edit', icon: Pencil, onSelect: () => setEditing(p) },
                                { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => setDeleting(p) },
                              ]}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
      <PaperDialog exam={exam} open={editing !== null} record={editing === 'new' ? null : editing} onOpenChange={(o) => !o && setEditing(null)} />
      <AddCurriculumDialog exam={exam} open={adding} onOpenChange={setAdding} />
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        subject={deleting ? `the ${deleting.subject_name} paper` : 'this paper'}
        onConfirm={async () => {
          await remove.mutateAsync(deleting!.id)
          toast.success('Paper deleted.')
        }}
      />
    </>
  )
}
