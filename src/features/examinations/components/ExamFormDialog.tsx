import { useEffect, useRef } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { FillWhenEmpty } from '@/components/forms/FillWhenEmpty'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAcademicYearOptions, useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useProgramOptions } from '@/features/academics/programs/hooks/usePrograms'
import { useTerms } from '@/features/academics/terms/hooks/useTerms'
import { toast } from '@/hooks/useToast'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { dec, type Exam, type ExamInput } from '../api/examinations.api'
import { useCreateExam, useExamTypeOptions, useGradeScaleOptions, useUpdateExam } from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

const schema = z.object({
  name: z.string().trim().min(1, tr('Required.')).max(200),
  exam_type: z.string().min(1, tr('Choose a type.')),
  program: z.string().min(1, tr('Choose a program.')),
  academic_year: z.string().min(1, tr('Choose a year.')),
  term: z.string(),
  campus: z.string().min(1, tr('Choose a branch.')),
  grade_scale: z.string(),
  min_attendance_percent: z.union([z.literal(''), z.string().trim().regex(/^\d+(\.\d+)?$/, tr('A percentage.'))]),
  instructions: z.string(),
  on_transcript: z.boolean(),
})

/** Papers decide the dates: an exam's start and end come from them when it's scheduled. */
export function ExamFormDialog({ open, record, onOpenChange, onCreated }: { open: boolean; record: Exam | null; onOpenChange: (o: boolean) => void; onCreated?: (exam: Exam) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const create = useCreateExam()
  const update = useUpdateExam()
  const types = useExamTypeOptions()
  const programs = useProgramOptions()
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const scales = useGradeScaleOptions()
  const structural = record != null && record.levels.length > 0

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? tr('Edit exam') : tr('New exam')}
      description={tr('One exam for one program at one branch and year. Add its papers next.')}
      schema={schema}
      defaultValues={{
        name: record?.name ?? '',
        exam_type: record ? String(record.exam_type) : '',
        program: record ? String(record.program) : '',
        academic_year: String(record?.academic_year ?? current.data?.id ?? years.data?.[0]?.id ?? ''),
        term: record?.term ? String(record.term) : '',
        campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        grade_scale: record?.grade_scale ? String(record.grade_scale) : '',
        min_attendance_percent: record?.min_attendance_percent ? dec(record.min_attendance_percent) : '',
        instructions: record?.instructions ?? '',
        on_transcript: record?.on_transcript ?? false,
      }}
      onSubmit={async (v) => {
        const input: ExamInput = {
          name: v.name,
          exam_type: Number(v.exam_type),
          program: Number(v.program),
          academic_year: Number(v.academic_year),
          term: v.term ? Number(v.term) : null,
          campus: Number(v.campus),
          min_attendance_percent: v.min_attendance_percent || null,
          instructions: v.instructions,
          on_transcript: v.on_transcript,
          ...(v.grade_scale ? { grade_scale: Number(v.grade_scale) } : {}),
        }
        if (record) {
          await update.mutateAsync({ id: record.id, input })
          toast.success(tr('Exam saved.'))
        } else {
          const exam = await create.mutateAsync(input)
          toast.success(tr('Exam created. Add its papers next.'))
          onCreated?.(exam)
        }
      }}
    >
      {({ register, control, watch, setValue, formState: { errors } }) => {
        const program = watch('program')
        const year = watch('academic_year')
        return (
          <>
            <TermReset year={year} clear={() => setValue('term', '')} />
            <FillWhenEmpty value={watch('academic_year')} fallback={String(current.data?.id ?? years.data?.[0]?.id ?? '') || null} fill={(v) => setValue('academic_year', v)} />
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('First terminal 2083')} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('Exam type')} required error={errors.exam_type?.message}>
                {(p) => <Controller control={control} name="exam_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} loading={types.isPending} options={(types.data ?? []).map((t) => ({ value: String(t.id), label: t.name }))} placeholder={types.data?.length === 0 ? tr('Add an exam type first') : tr('Choose…')} />} />}
              </FormField>
              <FormField label={tr('Program')} required error={errors.program?.message} description={structural ? tr('Fixed once papers are added.') : undefined}>
                {(p) => <Controller control={control} name="program" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={structural} options={(programs.data ?? []).map((pr) => ({ value: String(pr.id), label: pr.name }))} />} />}
              </FormField>
              <FormField label={tr('Academic year')} required error={errors.academic_year?.message}>
                {(p) => <Controller control={control} name="academic_year" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={structural} options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.name }))} />} />}
              </FormField>
              <FormField label={tr('Term')} error={errors.term?.message}>
                {(p) => <Controller control={control} name="term" render={({ field }) => <TermSelect {...p} year={year} value={field.value} onChange={field.onChange} />} />}
              </FormField>
              {isMultiBranch && (
                <FormField label={tr('Branch')} required error={errors.campus?.message}>
                  {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={structural} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
                </FormField>
              )}
              <FormField label={tr('Grade scale')} error={errors.grade_scale?.message} description={tr('Empty: the program’s scale, or the default.')}>
                {(p) => (
                  <Controller
                    control={control}
                    name="grade_scale"
                    render={({ field }) => (
                      <SelectControl
                        {...p}
                        value={field.value}
                        onChange={field.onChange}
                        allowEmpty
                        emptyLabel={tr('Automatic')}
                        options={(scales.data ?? []).filter((s) => s.program == null || String(s.program) === program).map((s) => ({ value: String(s.id), label: s.name }))}
                      />
                    )}
                  />
                )}
              </FormField>
              <FormField label={tr('Minimum attendance (%)')} error={errors.min_attendance_percent?.message} description={tr('Below this, the admit card is withheld.')}>
                <Input {...register('min_attendance_percent')} inputMode="decimal" placeholder="75" />
              </FormField>
            </div>
            <FormField label={tr('Instructions')} error={errors.instructions?.message} description={tr('Printed on every admit card.')}>
              <Textarea {...register('instructions')} rows={3} />
            </FormField>
            <Controller
              control={control}
              name="on_transcript"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Show this exam’s own result on transcripts')}
                </label>
              )}
            />
          </>
        )
      }}
    </FormDialog>
  )
}

/** A term belongs to one year: changing the year clears it. */
function TermReset({ year, clear }: { year: string; clear: () => void }) {
  const prev = useRef(year)
  useEffect(() => {
    if (prev.current !== year) clear()
    prev.current = year
  }, [year, clear])
  return null
}

function TermSelect({ year, value, onChange, ...p }: { year: string; value: string; onChange: (v: string) => void; id?: string }) {
  const terms = useTerms({ ...PICKER_PARAMS, academic_year: year || undefined }, { enabled: Boolean(year) })
  return <SelectControl {...p} value={value} onChange={onChange} allowEmpty emptyLabel={tr('Whole year')} options={(terms.data?.results ?? []).map((t) => ({ value: String(t.id), label: t.name }))} />
}
