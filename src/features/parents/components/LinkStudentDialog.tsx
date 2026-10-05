import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Switch } from '@/components/ui/switch'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import type { Student } from '@/features/students/api/students.api'
import { toast } from '@/hooks/useToast'
import { enumOptions } from '@/lib/formatters'
import type { Id } from '@/shared/types/api'
import type { Parent, Relationship } from '../api/parents.api'
import { useLinkStudent } from '../hooks/useParents'
import { tr } from '@/lib/i18n'

const schema = z.object({
  student: z.custom<Student | null>().refine((s) => s != null, tr('Choose a student.')),
  relationship: z.string().min(1, tr('Choose one.')),
  is_primary_contact: z.boolean(),
})

/** Link one of the parent's children. Making them primary contact takes it from whoever had it. */
export function LinkStudentDialog({ parent, linked, open, onOpenChange }: { parent: Parent; linked: readonly Id[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const link = useLinkStudent()

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Link a child to {full_name}', { full_name: parent.full_name })}
      submitLabel={tr('Link')}
      schema={schema}
      defaultValues={{ student: null, relationship: '', is_primary_contact: linked.length === 0 }}
      onSubmit={async (v) => {
        await link.mutateAsync({
          id: parent.id,
          input: { student: v.student!.id, relationship: v.relationship as Relationship, is_primary_contact: v.is_primary_contact },
        })
        toast.success(tr('{full_name} linked.', { full_name: v.student!.full_name }))
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          <FormField label={tr('Student')} required error={errors.student?.message}>
            {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} exclude={linked} />} />}
          </FormField>
          <FormField label={tr('Relationship')} required error={errors.relationship?.message} className="sm:max-w-xs">
            {(p) => (
              <Controller
                control={control}
                name="relationship"
                render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('RelationshipEnum')} />}
              />
            )}
          </FormField>
          <Controller
            control={control}
            name="is_primary_contact"
            render={({ field }) => (
              <label className="flex items-start gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} className="mt-0.5" />
                <span>
                  {tr('Primary contact')}
                  <span className="block text-xs text-muted-foreground">{tr('The first person the school contacts about this student. Replaces any current primary contact.')}</span>
                </span>
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}
