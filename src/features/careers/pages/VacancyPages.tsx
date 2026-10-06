import { Lock, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranchFilter, useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useDepartmentOptions } from '@/features/academics/departments/hooks/useDepartments'
import { useApplicationTypes } from '@/features/applications/hooks/useApplications'
import { usePositionOptions } from '@/features/hr/hooks/useHr'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { optionalIsoDate, optionalWholeNumber, wholeNumber } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Vacancy } from '../api/careers.api'
import { useCloseVacancy, useCreateVacancy, useOpenVacancy, useRemoveVacancy, useUpdateVacancy, useVacancies, useVacancy } from '../hooks/useCareers'
import { CandidatesTable } from './CandidatePages'
import { tr, trc } from '@/lib/i18n'

const TONE: Record<string, StatusTone> = { draft: 'neutral', open: 'success', closed: 'muted', filled: 'info' }
export const VacancyStatus = ({ v }: { v: Pick<Vacancy, 'status'> }) => <StatusBadge status={v.status ?? 'draft'} tone={TONE[v.status ?? 'draft']} label={enumLabel('VacancyStatusEnum', v.status)} />

const schema = z
  .object({
    campus: z.string().min(1, tr('Choose a branch.')),
    application_type: z.string().min(1, tr('Choose the job form.')),
    code: z.string().trim().min(1, tr('Required.')).max(50).regex(/^[a-z0-9_-]+$/i, tr('Letters, numbers, - and _ only.')),
    title: z.string().trim().min(1, tr('Required.')).max(200),
    position: z.string(),
    department: z.string(),
    staff_type: z.string(),
    contract_kind: z.string(),
    openings: wholeNumber(),
    description: z.string(),
    requirements: z.string(),
    min_experience_years: optionalWholeNumber,
    salary_range: z.string().max(100),
    closes_on: optionalIsoDate,
    is_public: z.boolean(),
    resume_required: z.boolean(),
  })
  .refine((v) => Number(v.openings) >= 1, { path: ['openings'], message: tr('At least one.') })

function VacancyDialog({ open, record, onOpenChange }: { open: boolean; record: Vacancy | null; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const create = useCreateVacancy()
  const update = useUpdateVacancy()
  const forms = useApplicationTypes({ ...PICKER_PARAMS, kind: 'job', is_active: true }, { enabled: open })
  const positions = usePositionOptions()
  const departments = useDepartmentOptions()
  const { branches, isMultiBranch, selectedBranchId, defaultBranchId } = useBranches()
  const jobForms = forms.data?.results ?? []
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit {title}', { title: record.title }) : tr('New vacancy')}
      description={record ? undefined : tr('Saved as a draft; open it when it’s ready for applications.')}
      wide
      schema={schema}
      defaultValues={{
        campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        application_type: record ? String(record.application_type) : jobForms[0] ? String(jobForms[0].id) : '',
        code: record?.code ?? '',
        title: record?.title ?? '',
        position: record?.position ? String(record.position) : '',
        department: record?.department ? String(record.department) : '',
        staff_type: record?.staff_type ?? 'teaching',
        contract_kind: record?.contract_kind ?? 'probation',
        openings: String(record?.openings ?? 1),
        description: record?.description ?? '',
        requirements: (record?.requirements ?? []).join('\n'),
        min_experience_years: record?.min_experience_years != null ? String(record.min_experience_years) : '',
        salary_range: record?.salary_range ?? '',
        closes_on: record?.closes_on ?? '',
        is_public: record?.is_public ?? true,
        resume_required: record?.resume_required ?? true,
      }}
      onSubmit={async (v) => {
        const input = {
          ...v,
          campus: Number(v.campus),
          application_type: Number(v.application_type),
          position: v.position ? Number(v.position) : null,
          department: v.department ? Number(v.department) : null,
          staff_type: v.staff_type as Vacancy['staff_type'],
          contract_kind: v.contract_kind as Vacancy['contract_kind'],
          openings: Number(v.openings),
          requirements: v.requirements.split('\n').map((l) => l.trim()).filter(Boolean),
          min_experience_years: v.min_experience_years ? Number(v.min_experience_years) : null,
          closes_on: v.closes_on || null,
        }
        if (record) await update.mutateAsync({ id: record.id, input })
        else {
          const created = await create.mutateAsync(input)
          navigate(`/careers/vacancies/${created.id}`)
        }
        toast.success(record ? tr('Vacancy saved.') : tr('Vacancy drafted.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          {jobForms.length === 0 && !forms.isPending && (
            <p className="rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">
              {tr('No job application form yet.')} <Link to="/applications/types?kind=job" className="font-medium underline">{tr('Set one up')}</Link> {tr('(kind “Job application”, last step decided by careers.hire), then come back.')}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
            <FormField label={tr('Title')} required error={errors.title?.message}>
              <Input {...register('title')} placeholder={tr('Lecturer in Mathematics')} />
            </FormField>
            <FormField label={tr('Code')} required error={errors.code?.message}>
              <Input {...register('code')} className="font-mono" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Job form')} required error={errors.application_type?.message} description={tr('Its steps decide candidates.')}>
              {(p) => <Controller control={control} name="application_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={jobForms.map((f) => ({ value: String(f.id), label: f.name }))} />} />}
            </FormField>
            {isMultiBranch && (
              <FormField label={tr('Branch')} required error={errors.campus?.message}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
            <FormField label={tr('Position')}>
              {(p) => <Controller control={control} name="position" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={positions} />} />}
            </FormField>
            <FormField label={tr('Department')}>
              {(p) => <Controller control={control} name="department" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={departments.data ?? []} />} />}
            </FormField>
            <FormField label={tr('Staff type')}>
              {(p) => <Controller control={control} name="staff_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('StaffTypeEnum')} />} />}
            </FormField>
            <FormField label={tr('Contract on hiring')}>
              {(p) => <Controller control={control} name="contract_kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ContractKindEnum')} />} />}
            </FormField>
            <FormField label={tr('Openings')} required error={errors.openings?.message}>
              <Input {...register('openings')} inputMode="numeric" />
            </FormField>
            <FormField label={tr('Last day to apply')} error={errors.closes_on?.message}>
              {(p) => <Controller control={control} name="closes_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label={tr('Salary (as advertised)')} error={errors.salary_range?.message}>
              <Input {...register('salary_range')} placeholder="40,000–55,000" />
            </FormField>
            <FormField label={tr('Experience (years, at least)')} error={errors.min_experience_years?.message}>
              <Input {...register('min_experience_years')} inputMode="numeric" />
            </FormField>
          </div>
          <FormField label={tr('Description')}>
            <Textarea {...register('description')} rows={3} />
          </FormField>
          <FormField label={tr('Requirements')} description={tr('One per line.')}>
            <Textarea {...register('requirements')} rows={3} placeholder={tr('Master’s in Mathematics\nTwo years’ teaching')} />
          </FormField>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {([['is_public', 'On the public careers page'], ['resume_required', 'Résumé required']] as const).map(([name, label]) => (
              <Controller key={name} control={control} name={name} render={({ field }) => (
                <label className="flex items-center gap-3">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> {label}
                </label>
              )} />
            ))}
          </div>
        </>
      )}
    </FormDialog>
  )
}

/** Openings the school is hiring for. */
export function VacanciesPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status', 'staff_type', 'campus'], followBranch: true })
  const branchFilter = useBranchFilter()
  const query = useVacancies(list.query)
  const [creating, setCreating] = useState(false)
  const { isMultiBranch } = useBranches()
  const columns: Column<Vacancy>[] = [
    { id: 'title', header: tr('Vacancy'), mobile: 'title', cell: (v) => <span className="font-medium">{v.title}</span> },
    { id: 'where', header: tr('Department'), cell: (v) => [v.department_name, isMultiBranch && v.campus_name].filter(Boolean).join(' · ') || '—' },
    { id: 'openings', header: tr('Filled'), className: 'tabular-nums', cell: (v) => tr('{hired_count} of {openings}', { hired_count: v.hired_count ?? 0, openings: v.openings }) },
    { id: 'candidates', header: tr('Candidates'), className: 'tabular-nums', cell: (v) => v.candidates ?? 0 },
    { id: 'closes', header: tr('Closes'), mobile: 'hidden', className: 'whitespace-nowrap tabular-nums', cell: (v) => (v.closes_on ? formatDate(v.closes_on) : '—') },
    { id: 'status', header: tr('Status'), cell: (v) => <VacancyStatus v={v} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Vacancies')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(v) => v.id}
        searchPlaceholder={tr('Title or code…')}
        onRowClick={(v) => navigate(`/careers/vacancies/${v.id}`)}
        create={
          <PermissionGate permission={PERMS.careers.manage}>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden /> {tr('New vacancy')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('VacancyStatusEnum') },
          { name: 'staff_type', label: tr('Staff type'), options: enumOptions('StaffTypeEnum') },
          branchFilter,
        ]}
        empty={{ title: tr('No vacancies'), description: tr('Draft a vacancy, open it, and candidates apply from the careers page or their account.') }}
      />
      <VacancyDialog open={creating} record={null} onOpenChange={setCreating} />
    </>
  )
}

/** One vacancy: what it asks for, and everyone who applied. */
export function VacancyDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const vacancy = useVacancy(Number.isFinite(id) ? id : null)
  const open = useOpenVacancy()
  const close = useCloseVacancy()
  const remove = useRemoveVacancy()
  const { can } = usePermissions()
  const [dialog, setDialog] = useState<'edit' | 'close' | 'delete' | null>(null)
  if (vacancy.isPending) return <PageLoader />
  if (vacancy.isError) return <ErrorState error={vacancy.error} onRetry={() => void vacancy.refetch()} />
  const v = vacancy.data
  const manage = can(PERMS.careers.manage)
  return (
    <div>
      <PageHeader
        backTo="/careers"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {v.title} <VacancyStatus v={v} />
          </span>
        }
        description={[v.position_name, v.department_name, v.campus_name, enumLabel('StaffTypeEnum', v.staff_type), tr('{hired_count} of {openings} filled', { hired_count: v.hired_count ?? 0, openings: v.openings })].filter(Boolean).join(' · ')}
        actions={
          manage && (
            <>
              {(v.status === 'draft' || v.status === 'closed') && (
                <Button
                  onClick={() =>
                    open.mutateAsync(v.id).then(
                      () => toast.success(tr('Open for applications.')),
                      (e) => toast.error(errorMessage(e)),
                    )
                  }
                  disabled={open.isPending}
                >
                  <Send aria-hidden /> {trc('verb', 'Open')}
                </Button>
              )}
              {v.status === 'open' && (
                <Button variant="outline" onClick={() => setDialog('close')}>
                  <Lock aria-hidden /> {tr('Close')}
                </Button>
              )}
              <Button variant="outline" onClick={() => setDialog('edit')}>
                <Pencil aria-hidden /> {tr('Edit')}
              </Button>
              {v.status === 'draft' && (
                <Button variant="outline" onClick={() => setDialog('delete')} aria-label={tr('Delete vacancy')}>
                  <Trash2 aria-hidden />
                </Button>
              )}
            </>
          )
        }
      />
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-4 text-sm sm:p-6 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">{tr('About the role')}</h2>
          <p className="whitespace-pre-wrap">{v.description || <span className="text-muted-foreground">{tr('No description.')}</span>}</p>
          {v.requirements.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-sm font-semibold">{tr('Requirements')}</h3>
              <ul className="ml-5 list-disc">
                {v.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="rounded-lg border bg-card p-4 text-sm sm:p-6">
          <dl className="grid gap-2">
            {(
              [
                [tr('Contract'), enumLabel('ContractKindEnum', v.contract_kind)],
                [tr('Salary'), v.salary_range || '—'],
                [tr('Experience'), v.min_experience_years != null ? `${v.min_experience_years}+ years` : '—'],
                [tr('Opened'), v.opens_on ? formatDate(v.opens_on) : '—'],
                [tr('Last day to apply'), v.closes_on ? formatDate(v.closes_on) : '—'],
                [tr('Listed publicly'), v.is_public ? 'Yes' : 'No'],
              ] as const
            ).map(([k, val]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right">{val}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
      <h2 className="mb-2 text-sm font-semibold">{tr('Candidates')}</h2>
      <CandidatesTable vacancy={v.id} />
      <VacancyDialog open={dialog === 'edit'} record={v} onOpenChange={(o) => !o && setDialog(null)} />
      <ConfirmDialog
        open={dialog === 'close'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={tr('Stop taking applications?')}
        description={tr('Candidates already in stay in the process. You can open it again.')}
        confirmLabel={tr('Close')}
        onConfirm={async () => {
          await close.mutateAsync(v.id)
          toast.success(tr('Closed.'))
        }}
      />
      <DeleteDialog
        open={dialog === 'delete'}
        onOpenChange={(o) => !o && setDialog(null)}
        subject={v.title}
        onConfirm={async () => {
          await remove.mutateAsync(v.id)
          toast.success(tr('Deleted.'))
          navigate('/careers')
        }}
      />
    </div>
  )
}
