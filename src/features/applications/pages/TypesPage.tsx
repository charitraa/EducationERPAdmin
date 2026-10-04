import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { usePermissionCatalogue } from '@/features/roles/hooks/useRoles'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { ApplicationKind, ApplicationType, FieldDefinition } from '../api/applications.api'
import { useApplicationTypes, useCreateApplicationType, useRemoveApplicationType, useUpdateApplicationType } from '../hooks/useApplications'

/** The permission a kind's last step must name (kinds.py); approving it acts with that permission. */
export const FINAL_PERMISSION: Partial<Record<ApplicationKind, string>> = {
  admission: 'admissions.review',
  leave: 'hr.approve_leave',
  scholarship: 'finance.manage',
  hostel: 'hostel.manage',
  transport: 'transport.manage',
  event: 'events.manage',
  certificate: 'applications.certify',
  job: 'careers.hire',
}

const QUESTION_TYPES = ['text', 'textarea', 'number', 'date', 'choice', 'boolean'] as const

const schema = z
  .object({
    code: z.string().trim().min(1, 'Required.').max(50).regex(/^[a-z0-9_-]+$/i, 'Letters, numbers, - and _ only.'),
    name: z.string().trim().min(1, 'Required.').max(150),
    kind: z.string().min(1),
    description: z.string(),
    campus: z.string(),
    is_public: z.boolean(),
    is_active: z.boolean(),
    certificate_title: z.string().max(150),
    steps: z.array(z.object({ name: z.string().trim().min(1, 'Name the step.').max(100), permission: z.string().min(1, 'Who decides?') })).min(1, 'Add at least one step.'),
    fields: z.array(z.object({ name: z.string().trim().regex(/^[a-z][a-z0-9_]*$/i, 'Letters, digits and _; starts with a letter.'), label: z.string().trim().min(1, 'Required.'), type: z.string(), required: z.boolean(), choices: z.string() })),
  })
  .superRefine((v, ctx) => {
    const final = FINAL_PERMISSION[v.kind as ApplicationKind]
    if (final && v.steps.length && v.steps[v.steps.length - 1].permission !== final)
      ctx.addIssue({ code: 'custom', path: ['steps', v.steps.length - 1, 'permission'], message: `The last step must be decided by ${final}.` })
    if (v.kind === 'certificate' && !v.certificate_title.trim()) ctx.addIssue({ code: 'custom', path: ['certificate_title'], message: 'The title printed on it.' })
    v.fields.forEach((f, i) => {
      if (f.type === 'choice' && !f.choices.trim()) ctx.addIssue({ code: 'custom', path: ['fields', i, 'choices'], message: 'List the choices, comma-separated.' })
    })
  })
type Values = z.infer<typeof schema>

function Steps({ control, register, errors }: { control: Control<Values>; register: UseFormRegister<Values>; errors: FieldErrors<Values> }) {
  const perms = usePermissionCatalogue()
  const { fields, append, remove, move } = useFieldArray({ control, name: 'steps' })
  const options = (perms.data ?? []).map((p) => ({ value: p.code, label: `${p.code} · ${p.name}` }))
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Approval steps, in order</legend>
      <p className="text-xs text-muted-foreground">Anyone holding a step’s permission at the applicant’s branch decides it.</p>
      {fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1.5rem_1fr_1.4fr_auto] items-start gap-2">
          <span className="pt-2 text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
          <div>
            <Input {...register(`steps.${i}.name`)} aria-label={`Step ${i + 1} name`} placeholder="Class teacher" />
            {errors.steps?.[i]?.name?.message && <p className="mt-1 text-xs text-danger">{errors.steps[i]?.name?.message}</p>}
          </div>
          <div>
            <Controller control={control} name={`steps.${i}.permission`} render={({ field }) => <SelectControl aria-label={`Step ${i + 1} permission`} value={field.value} onChange={field.onChange} placeholder="Decided by holders of…" options={options} />} />
            {errors.steps?.[i]?.permission?.message && <p className="mt-1 text-xs text-danger">{errors.steps[i]?.permission?.message}</p>}
          </div>
          <div className="flex">
            <Button type="button" variant="ghost" size="icon" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
              <ArrowUp aria-hidden />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={`Move step ${i + 1} down`} disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
              <ArrowDown aria-hidden />
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove step ${i + 1}`} disabled={fields.length === 1} onClick={() => remove(i)}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        </div>
      ))}
      {errors.steps?.message && <p className="text-xs text-danger">{errors.steps.message}</p>}
      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', permission: '' }, { shouldFocus: false })}>
          <Plus aria-hidden /> Add step
        </Button>
      </div>
    </fieldset>
  )
}

function Questions({ control, register, errors, watch }: { control: Control<Values>; register: UseFormRegister<Values>; errors: FieldErrors<Values>; watch: (n: `fields.${number}.type`) => string }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'fields' })
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Extra questions</legend>
      <p className="text-xs text-muted-foreground">Asked on top of what this kind of form always asks.</p>
      {fields.map((f, i) => (
        <div key={f.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_8rem_auto]">
          <div>
            <Input {...register(`fields.${i}.label`)} aria-label={`Question ${i + 1}`} placeholder="Question" />
            {errors.fields?.[i]?.label?.message && <p className="mt-1 text-xs text-danger">{errors.fields[i]?.label?.message}</p>}
          </div>
          <div>
            <Input {...register(`fields.${i}.name`)} aria-label={`Question ${i + 1} key`} className="font-mono" placeholder="key_name" />
            {errors.fields?.[i]?.name?.message && <p className="mt-1 text-xs text-danger">{errors.fields[i]?.name?.message}</p>}
          </div>
          <Controller control={control} name={`fields.${i}.type`} render={({ field }) => <SelectControl aria-label={`Question ${i + 1} type`} value={field.value} onChange={field.onChange} options={QUESTION_TYPES.map((t) => ({ value: t, label: t === 'textarea' ? 'Long text' : t === 'boolean' ? 'Yes / no' : t[0].toUpperCase() + t.slice(1) }))} />} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove question ${i + 1}`} onClick={() => remove(i)}>
            <Trash2 aria-hidden />
          </Button>
          {watch(`fields.${i}.type`) === 'choice' && (
            <div className="sm:col-span-3">
              <Input {...register(`fields.${i}.choices`)} aria-label={`Question ${i + 1} choices`} placeholder="Choices, comma-separated" />
              {errors.fields?.[i]?.choices?.message && <p className="mt-1 text-xs text-danger">{errors.fields[i]?.choices?.message}</p>}
            </div>
          )}
          <Controller control={control} name={`fields.${i}.required`} render={({ field }) => (
            <label className="flex items-center gap-2 text-xs sm:col-span-4">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> Required
            </label>
          )} />
        </div>
      ))}
      <div>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', label: '', type: 'text', required: false, choices: '' }, { shouldFocus: false })}>
          <Plus aria-hidden /> Add question
        </Button>
      </div>
    </fieldset>
  )
}

function TypeDialog({ open, record, onOpenChange }: { open: boolean; record: ApplicationType | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateApplicationType()
  const update = useUpdateApplicationType()
  const { branches, isMultiBranch } = useBranches()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.name}` : 'New form'}
      description="Steps can only change while no application of this form is open."
      wide
      schema={schema}
      defaultValues={{
        code: record?.code ?? '',
        name: record?.name ?? '',
        kind: record?.kind ?? 'general',
        description: record?.description ?? '',
        campus: record?.campus ? String(record.campus) : '',
        is_public: record?.is_public ?? false,
        is_active: record?.is_active ?? true,
        certificate_title: record?.certificate_title ?? '',
        steps: record?.steps.map((s) => ({ name: s.name, permission: s.permission })) ?? [{ name: '', permission: '' }],
        fields: (record?.fields ?? []).map((f) => ({ name: f.name, label: f.label, type: f.type, required: Boolean(f.required), choices: (f.choices ?? []).join(', ') })),
      }}
      onSubmit={async (v) => {
        const fields: FieldDefinition[] = v.fields.map((f) => ({ name: f.name, label: f.label, type: f.type as FieldDefinition['type'], required: f.required, ...(f.type === 'choice' ? { choices: f.choices.split(',').map((c) => c.trim()).filter(Boolean) } : {}) }))
        const input = { ...v, kind: v.kind as ApplicationKind, campus: v.campus ? Number(v.campus) : null, is_public: (v.kind === 'admission' || v.kind === 'job') && v.is_public, fields }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success('Form saved.')
      }}
    >
      {({ register, control, watch, setValue, formState: { errors } }) => {
        const kind = watch('kind') as ApplicationKind
        const final = FINAL_PERMISSION[kind]
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <FormField label="Name" required error={errors.name?.message}>
                <Input {...register('name')} placeholder="Character certificate" />
              </FormField>
              <FormField label="Code" required error={errors.code?.message}>
                <Input {...register('code')} className="font-mono" />
              </FormField>
              <FormField label="Kind" description="Decides what it asks and what approving it does.">
                {(p) => (
                  <Controller
                    control={control}
                    name="kind"
                    render={({ field }) => (
                      <SelectControl
                        {...p}
                        value={field.value}
                        onChange={(k) => {
                          field.onChange(k)
                          const f = FINAL_PERMISSION[k as ApplicationKind]
                          const steps = watch('steps')
                          if (f && steps.length) setValue(`steps.${steps.length - 1}.permission`, f)
                        }}
                        options={enumOptions('ApplicationKindEnum')}
                      />
                    )}
                  />
                )}
              </FormField>
              {isMultiBranch && (
                <FormField label="Branch">
                  {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Every branch" options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
                </FormField>
              )}
            </div>
            {kind === 'certificate' && (
              <FormField label="Title printed on the certificate" required error={errors.certificate_title?.message}>
                <Input {...register('certificate_title')} placeholder="Character Certificate" />
              </FormField>
            )}
            <FormField label="Description" description="Shown to applicants.">
              <Textarea {...register('description')} rows={2} />
            </FormField>
            {final && <p className="text-xs text-muted-foreground">The last step must be decided by <span className="font-mono">{final}</span>: approving it acts with that permission.</p>}
            <Steps control={control} register={register} errors={errors} />
            <Questions control={control} register={register} errors={errors} watch={watch as never} />
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Controller control={control} name="is_active" render={({ field }) => (
                <label className="flex items-center gap-3">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> Open for applications
                </label>
              )} />
              {(kind === 'admission' || kind === 'job') && (
                <Controller control={control} name="is_public" render={({ field }) => (
                  <label className="flex items-center gap-3">
                    <Switch checked={field.value} onCheckedChange={field.onChange} /> On the public website (no account needed)
                  </label>
                )} />
              )}
            </div>
          </>
        )
      }}
    </FormDialog>
  )
}

/** The forms people can fill in, and the chain of approvals each goes through. */
export function TypesPage() {
  const list = useListState({ filters: ['kind', 'is_active'] })
  const query = useApplicationTypes(list.query)
  const crud = useCrudState<ApplicationType>()
  const remove = useRemoveApplicationType()
  const columns: Column<ApplicationType>[] = [
    { id: 'name', header: 'Form', mobile: 'title', cell: (t) => (
      <span>
        <span className="font-medium">{t.name}</span> <span className="font-mono text-xs text-muted-foreground">{t.code}</span>
      </span>
    ) },
    { id: 'kind', header: 'Kind', cell: (t) => enumLabel('ApplicationKindEnum', t.kind) },
    { id: 'steps', header: 'Decided by', cell: (t) => <span className="text-muted-foreground">{t.steps.map((s) => s.name).join(' → ')}</span> },
    { id: 'campus', header: 'Branch', mobile: 'hidden', cell: (t) => t.campus_name ?? 'Every branch' },
    { id: 'state', header: '', cell: (t) => (
      <span className="flex gap-1">
        {t.is_public && <StatusBadge status="published" label="Public" />}
        {t.is_active === false && <StatusBadge status="inactive" label="Closed" />}
      </span>
    ) },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Application forms"
        columns={columns}
        query={query}
        list={list}
        getRowId={(t) => t.id}
        searchPlaceholder="Name or code…"
        onRowClick={crud.openEdit}
        toolbar={
          <PermissionGate permission={PERMS.applications.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> New form
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'kind', label: 'Kind', options: enumOptions('ApplicationKindEnum') },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Open' }, { value: 'false', label: 'Closed' }] },
        ]}
        rowActions={(t) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.applications.manage, onSelect: () => crud.openEdit(t) },
              { label: 'Delete', icon: Trash2, permission: PERMS.applications.manage, destructive: true, onSelect: () => crud.openDelete(t) },
            ]}
          />
        )}
        empty={{ title: 'No forms yet', description: 'Set up a form for each kind of request: certificates, hostel, transport, leave, or anything general.' }}
      />
      <TypeDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <DeleteDialog open={crud.deleting !== null} onOpenChange={(o) => !o && crud.closeDelete()} subject={crud.deleting?.name ?? 'form'} description="Only a form nobody has applied with; otherwise close it." onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success('Deleted.') }} />
    </>
  )
}
