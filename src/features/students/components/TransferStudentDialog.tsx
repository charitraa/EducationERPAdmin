import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/useToast'
import { optionalIsoDate, requiredId } from '@/lib/validation'
import type { Student } from '../api/students.api'
import { useTransferStudent } from '../hooks/useStudents'
import { tr, trc } from '@/lib/i18n'

const schema = z.object({ campus: requiredId(tr('Choose a branch.')), on_date: optionalIsoDate, reason: z.string().trim().max(255) })

/** Only reachable with two or more branches. The student arrives unplaced and needs a class at the new branch. */
export function TransferStudentDialog({ student, open, onOpenChange }: { student: Student; open: boolean; onOpenChange: (o: boolean) => void }) {
  const transfer = useTransferStudent()
  const { branches, branchName } = useBranches()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Transfer {full_name}', { full_name: student.full_name })}
      description={tr('From {campus_name}. Their class there is closed; place them in a class at the new branch afterwards.', { campus_name: student.campus_name })}
      submitLabel={trc('student', 'Transfer')}
      schema={schema}
      defaultValues={{ campus: '', on_date: '', reason: '' }}
      onSubmit={async (v) => {
        await transfer.mutateAsync({ id: student.id, input: { campus: Number(v.campus), reason: v.reason, ...(v.on_date ? { on_date: v.on_date } : {}) } })
        toast.success(tr('{full_name} transferred to {branchName}.', { full_name: student.full_name, branchName: branchName(Number(v.campus)) }))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label={tr('To branch')} required error={errors.campus?.message}>
            {(p) => (
              <Controller
                control={control}
                name="campus"
                render={({ field }) => (
                  <SelectControl
                    {...p}
                    value={field.value}
                    onChange={field.onChange}
                    options={branches.filter((b) => b.id !== student.campus).map((b) => ({ value: String(b.id), label: b.name }))}
                  />
                )}
              />
            )}
          </FormField>
          <FormField label={tr('Effective date (AD)')} error={errors.on_date?.message} description={tr('Leave empty for today.')}>
            {(p) => <Controller control={control} name="on_date" render={({ field }) => <DatePicker {...p} {...field} />} />}
          </FormField>
          <FormField label={tr('Reason')} error={errors.reason?.message}>
            <Textarea {...register('reason')} rows={2} maxLength={255} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}
