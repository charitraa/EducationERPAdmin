import { GraduationCap, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranchFilter, useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
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
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { Money } from '@/features/finance/components/money'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions, pluralize } from '@/lib/formatters'
import { isoDate, optionalIsoDate, optionalWholeNumber } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Id } from '@/shared/types/api'
import type { Achievement, AlumniProfile, Employment, GraduationResult, HigherStudy, Mentorship } from '../api/alumni.api'
import {
  useAchievements,
  useAlumni,
  useAlumnus,
  useCreateAchievement,
  useCreateAlumnus,
  useCreateEmployment,
  useCreateStudy,
  useDonations,
  useEmployments,
  useGraduate,
  useMentorships,
  useRemoveAchievement,
  useRemoveAlumnus,
  useRemoveEmployment,
  useRemoveStudy,
  useStudies,
  useUpdateAchievement,
  useUpdateAlumnus,
  useUpdateEmployment,
  useUpdateStudy,
} from '../hooks/useAlumni'
import { tr } from '@/lib/i18n'

const url = z.union([z.literal(''), z.string().url(tr('A full link, starting https://'))])
const profileSchema = z.object({
  campus: z.string().min(1, tr('Choose a branch.')),
  first_name: z.string().trim().min(1, tr('Required.')).max(150),
  middle_name: z.string().max(150),
  last_name: z.string().trim().min(1, tr('Required.')).max(150),
  gender: z.string(),
  email: z.union([z.literal(''), z.string().email(tr('An email address.'))]),
  phone: z.string().max(32),
  city: z.string().max(100),
  country: z.string().max(100),
  program_name: z.string().max(150),
  academic_year: z.string().max(50),
  graduated_on: optionalIsoDate,
  linkedin_url: url,
  bio: z.string(),
  directory_visible: z.boolean(),
  is_mentor: z.boolean(),
  mentor_topics: z.string().max(255),
  mentor_capacity: optionalWholeNumber,
})

function ProfileDialog({ open, record, onOpenChange }: { open: boolean; record: AlumniProfile | null; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate()
  const create = useCreateAlumnus()
  const update = useUpdateAlumnus()
  const { branches, isMultiBranch, selectedBranchId, defaultBranchId } = useBranches()
  const r = record
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={r ? tr('Edit {full_name}', { full_name: r.full_name }) : tr('Add an alumnus')}
      description={r ? undefined : tr('For someone who graduated before the system. Current students become alumni by graduating.')}
      wide
      schema={profileSchema}
      defaultValues={{
        campus: String(r?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        first_name: r?.first_name ?? '',
        middle_name: r?.middle_name ?? '',
        last_name: r?.last_name ?? '',
        gender: r?.gender ?? '',
        email: r?.email ?? '',
        phone: r?.phone ?? '',
        city: r?.city ?? '',
        country: r?.country ?? '',
        program_name: r?.program_name ?? '',
        academic_year: r?.academic_year ?? '',
        graduated_on: r?.graduated_on ?? '',
        linkedin_url: r?.linkedin_url ?? '',
        bio: r?.bio ?? '',
        directory_visible: r?.directory_visible ?? false,
        is_mentor: r?.is_mentor ?? false,
        mentor_topics: r?.mentor_topics ?? '',
        mentor_capacity: r?.mentor_capacity != null ? String(r.mentor_capacity) : '3',
      }}
      onSubmit={async (v) => {
        const input = { ...v, campus: Number(v.campus), gender: v.gender as AlumniProfile['gender'], graduated_on: v.graduated_on || null, mentor_capacity: v.mentor_capacity ? Number(v.mentor_capacity) : 3 }
        if (r) await update.mutateAsync({ id: r.id, input })
        else {
          const p = await create.mutateAsync(input)
          navigate(`/alumni/${p.id}`)
        }
        toast.success(tr('Saved.'))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('First name')} required error={errors.first_name?.message}>
              <Input {...register('first_name')} />
            </FormField>
            <FormField label={tr('Middle name')}>
              <Input {...register('middle_name')} />
            </FormField>
            <FormField label={tr('Last name')} required error={errors.last_name?.message}>
              <Input {...register('last_name')} />
            </FormField>
            <FormField label={tr('Email')} error={errors.email?.message}>
              <Input {...register('email')} inputMode="email" />
            </FormField>
            <FormField label={tr('Phone')}>
              <Input {...register('phone')} inputMode="tel" />
            </FormField>
            <FormField label={tr('Gender')}>
              {(p) => <Controller control={control} name="gender" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={enumOptions('GenderEnum')} />} />}
            </FormField>
            <FormField label={tr('Programme')}>
              <Input {...register('program_name')} disabled={Boolean(r?.student)} />
            </FormField>
            <FormField label={tr('Batch (year)')}>
              <Input {...register('academic_year')} placeholder="2079/80" disabled={Boolean(r?.student)} />
            </FormField>
            <FormField label={tr('Graduated on')} error={errors.graduated_on?.message}>
              {(p) => <Controller control={control} name="graduated_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} disabled={Boolean(r?.student)} />} />}
            </FormField>
            <FormField label={tr('City')}>
              <Input {...register('city')} />
            </FormField>
            <FormField label={tr('Country')}>
              <Input {...register('country')} />
            </FormField>
            {isMultiBranch && (
              <FormField label={tr('Studied at')} required error={errors.campus?.message}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
          </div>
          <FormField label={tr('LinkedIn')} error={errors.linkedin_url?.message}>
            <Input {...register('linkedin_url')} inputMode="url" />
          </FormField>
          <FormField label={tr('About')}>
            <Textarea {...register('bio')} rows={2} />
          </FormField>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            {([['directory_visible', 'Listed in the alumni directory'], ['is_mentor', 'Takes mentees']] as const).map(([name, label]) => (
              <Controller key={name} control={control} name={name} render={({ field }) => (
                <label className="flex items-center gap-3">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> {label}
                </label>
              )} />
            ))}
          </div>
          {watch('is_mentor') && (
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <FormField label={tr('Mentors on')}>
                <Input {...register('mentor_topics')} placeholder={tr('Careers in software, studying abroad')} />
              </FormField>
              <FormField label={tr('Mentees at once')} error={errors.mentor_capacity?.message}>
                <Input {...register('mentor_capacity')} inputMode="numeric" />
              </FormField>
            </div>
          )}
        </>
      )}
    </FormDialog>
  )
}

function GraduateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const classes = useClasses({ ...PICKER_PARAMS, ordering: 'name' }, { enabled: open })
  const graduate = useGraduate()
  const [result, setResult] = useState<GraduationResult | null>(null)
  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={onOpenChange}
        title={tr('Graduate a class')}
        description={tr('Everyone placed in the class becomes an alumnus: they leave as graduated, and an alumni profile is made from their record.')}
        submitLabel={tr('Graduate')}
        schema={z.object({ section: z.string().min(1, tr('Choose a class.')), on_date: isoDate, reason: z.string().max(255) })}
        defaultValues={{ section: '', on_date: todayIso(), reason: '' }}
        onSubmit={async (v) => {
          const r = await graduate.mutateAsync({ section: Number(v.section), on_date: v.on_date, reason: v.reason })
          setResult(r)
          toast.success(tr('{pluralize} graduated.', { pluralize: pluralize(r.graduated, 'student') }))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label={tr('Class')} required error={errors.section?.message}>
              {(p) => <Controller control={control} name="section" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} placeholder={tr('Choose…')} options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: `${c.display_name} · ${c.academic_year_name}` }))} />} />}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('On')} required error={errors.on_date?.message}>
                {(p) => <Controller control={control} name="on_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('Note')}>
                <Input {...register('reason')} placeholder={tr('Completed Grade 12')} />
              </FormField>
            </div>
          </>
        )}
      </FormDialog>
      {result && result.skipped.length > 0 && (
        <div role="status" className="mb-4 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm">
          <p className="font-medium">{pluralize(result.skipped.length, 'student')} {tr('not graduated') + ':'}</p>
          <ul className="ml-5 list-disc">
            {result.skipped.map((s) => (
              <li key={s.student}>
                {s.name}: {s.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

/** Everyone who studied here: graduated through the system or added by hand. */
export function AlumniListPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['academic_year', 'is_mentor', 'directory_visible', 'campus'], followBranch: true })
  const branchFilter = useBranchFilter()
  const query = useAlumni(list.query)
  const [dialog, setDialog] = useState<'add' | 'graduate' | null>(null)
  const columns: Column<AlumniProfile>[] = [
    { id: 'name', header: tr('Name'), mobile: 'title', cell: (p) => (
      <span>
        <span className="font-medium">{p.full_name}</span>
        {p.student_number && <span className="ml-1 font-mono text-xs text-muted-foreground">{p.student_number}</span>}
      </span>
    ) },
    { id: 'batch', header: tr('Batch'), cell: (p) => [p.program_name, p.academic_year].filter(Boolean).join(' · ') || '—' },
    { id: 'now', header: tr('Now'), cell: (p) => (p.current_job ? `${p.current_job.title}, ${p.current_job.employer}` : '—') },
    { id: 'where', header: tr('Lives in'), mobile: 'hidden', cell: (p) => [p.city, p.country].filter(Boolean).join(', ') || '—' },
    { id: 'flags', header: '', cell: (p) => (
      <span className="flex gap-1">
        {p.is_mentor && <StatusBadge status="active" label={tr('Mentor')} />}
        {p.directory_visible && <StatusBadge status="published" tone="info" label={tr('Listed')} />}
      </span>
    ) },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Alumni')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(p) => p.id}
        searchPlaceholder={tr('Name, email, phone or student no.…')}
        onRowClick={(p) => navigate(`/alumni/${p.id}`)}
        create={
          <PermissionGate permission={PERMS.alumni.manage}>
            <Button variant="outline" onClick={() => setDialog('add')}>
              <UserPlus aria-hidden /> {tr('Add alumnus')}
            </Button>
            <Button onClick={() => setDialog('graduate')}>
              <GraduationCap aria-hidden /> {tr('Graduate a class')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'is_mentor', label: tr('Mentor'), options: [{ value: 'true', label: tr('Mentors') }] },
          { name: 'directory_visible', label: tr('Directory'), options: [{ value: 'true', label: tr('Listed') }, { value: 'false', label: tr('Not listed') }] },
          branchFilter,
        ]}
        empty={{ title: tr('No alumni yet'), description: tr('Graduate a class at the end of its final year, or add earlier graduates by hand.') }}
      />
      <ProfileDialog open={dialog === 'add'} record={null} onOpenChange={(o) => !o && setDialog(null)} />
      <GraduateDialog open={dialog === 'graduate'} onOpenChange={(o) => !o && setDialog(null)} />
    </>
  )
}

/** Sub-records on a profile (jobs, studies, achievements): a list with add, edit and delete. */
function Rows<T extends { id: Id }>({ title, rows, render, onAdd, onEdit, onDelete, empty }: { title: string; rows: T[]; render: (r: T) => ReactNode; onAdd: () => void; onEdit: (r: T) => void; onDelete: (r: T) => void; empty: string }) {
  const { can } = usePermissions()
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {can(PERMS.alumni.manage) && (
          <Button size="sm" variant="outline" className="h-7" onClick={onAdd}>
            <Plus aria-hidden /> {tr('Add')}
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-2 py-2">
              <div className="min-w-0 flex-1">{render(r)}</div>
              <RowActions
                actions={[
                  { label: tr('Edit'), icon: Pencil, permission: PERMS.alumni.manage, onSelect: () => onEdit(r) },
                  { label: tr('Delete'), icon: Trash2, permission: PERMS.alumni.manage, destructive: true, onSelect: () => onDelete(r) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

type Sub = { kind: 'job'; r: Employment | null } | { kind: 'study'; r: HigherStudy | null } | { kind: 'award'; r: Achievement | null }
type Deleting = { kind: 'job' | 'study' | 'award'; id: Id; label: string }

/** One alumnus: who they are, what they've done since, and what they've given. */
export function AlumnusPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const profile = useAlumnus(Number.isFinite(id) ? id : null)
  const jobs = useEmployments({ ...PICKER_PARAMS, profile: id })
  const studies = useStudies({ ...PICKER_PARAMS, profile: id })
  const awards = useAchievements({ ...PICKER_PARAMS, profile: id })
  const { can } = usePermissions()
  const gifts = useDonations({ ...PICKER_PARAMS, donor: id }, can(PERMS.alumni.view))
  const createJob = useCreateEmployment()
  const updateJob = useUpdateEmployment()
  const removeJob = useRemoveEmployment()
  const createStudy = useCreateStudy()
  const updateStudy = useUpdateStudy()
  const removeStudy = useRemoveStudy()
  const createAward = useCreateAchievement()
  const updateAward = useUpdateAchievement()
  const removeAward = useRemoveAchievement()
  const removeProfile = useRemoveAlumnus()
  const [editing, setEditing] = useState(false)
  const [deletingProfile, setDeletingProfile] = useState(false)
  const [sub, setSub] = useState<Sub | null>(null)
  const [deleting, setDeleting] = useState<Deleting | null>(null)
  if (profile.isPending) return <PageLoader />
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
  const p = profile.data
  const close = (o: boolean) => !o && setSub(null)
  const job = sub?.kind === 'job' ? sub.r : null
  const study = sub?.kind === 'study' ? sub.r : null
  const award = sub?.kind === 'award' ? sub.r : null
  return (
    <div>
      <PageHeader
        backTo="/alumni"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {p.full_name}
            {p.is_mentor && <StatusBadge status="active" label={tr('Mentor')} />}
          </span>
        }
        description={[p.program_name, p.academic_year && tr('batch {academic_year}', { academic_year: p.academic_year }), p.graduated_on && tr('graduated {date}', { date: formatDate(p.graduated_on) }), p.campus_name].filter(Boolean).join(' · ')}
        actions={
          can(PERMS.alumni.manage) && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden /> {tr('Edit')}
              </Button>
              {!p.student && (
                <Button variant="outline" aria-label={tr('Delete alumnus')} onClick={() => setDeletingProfile(true)}>
                  <Trash2 aria-hidden />
                </Button>
              )}
            </>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border bg-card p-4 text-sm sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">{tr('Contact')}</h2>
          <dl className="grid gap-2">
            {(
              [
                [tr('Email'), p.email && <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a>],
                [tr('Phone'), p.phone && <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>],
                [tr('Lives in'), [p.city, p.country].filter(Boolean).join(', ')],
                [tr('LinkedIn'), p.linkedin_url && <a href={p.linkedin_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{tr('Profile')}</a>],
                [tr('Directory'), p.directory_visible ? 'Listed' : 'Not listed'],
                [tr('Mentoring'), p.is_mentor ? `${p.mentor_topics || 'Yes'} · up to ${p.mentor_capacity}` : 'No'],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right">{v || '—'}</dd>
              </div>
            ))}
          </dl>
          {p.bio && <p className="mt-3 whitespace-pre-wrap border-t pt-3">{p.bio}</p>}
        </section>
        <div className="grid content-start gap-4 lg:col-span-2">
          <Rows
            title={tr('Work')}
            rows={jobs.data?.results ?? []}
            empty={tr('No jobs recorded.')}
            render={(j) => (
              <>
                <p className="font-medium">
                  {j.title}, {j.employer}
                </p>
                <p className="text-muted-foreground">
                  {[j.location, `${formatDate(j.start_date)} – ${j.end_date ? formatDate(j.end_date) : 'now'}`].filter(Boolean).join(' · ')}
                </p>
              </>
            )}
            onAdd={() => setSub({ kind: 'job', r: null })}
            onEdit={(r) => setSub({ kind: 'job', r })}
            onDelete={(r) => setDeleting({ kind: 'job', id: r.id, label: `${r.title}, ${r.employer}` })}
          />
          <Rows
            title={tr('Further study')}
            rows={studies.data?.results ?? []}
            empty={tr('None recorded.')}
            render={(s) => (
              <>
                <p className="font-medium">
                  {s.qualification}
                  {s.field && ' ' + tr('in {field}', { field: s.field })}, {s.institution}
                </p>
                <p className="text-muted-foreground">
                  {[s.country, `${s.start_year}–${s.end_year ?? ''}`, enumLabel('StudyStatusEnum', s.status)].filter(Boolean).join(' · ')}
                </p>
              </>
            )}
            onAdd={() => setSub({ kind: 'study', r: null })}
            onEdit={(r) => setSub({ kind: 'study', r })}
            onDelete={(r) => setDeleting({ kind: 'study', id: r.id, label: `${r.qualification}, ${r.institution}` })}
          />
          <Rows
            title={tr('Achievements')}
            rows={awards.data?.results ?? []}
            empty={tr('None recorded.')}
            render={(a) => (
              <>
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground">{[a.achieved_on && formatDate(a.achieved_on), a.description].filter(Boolean).join(' · ')}</p>
              </>
            )}
            onAdd={() => setSub({ kind: 'award', r: null })}
            onEdit={(r) => setSub({ kind: 'award', r })}
            onDelete={(r) => setDeleting({ kind: 'award', id: r.id, label: r.title })}
          />
          {(gifts.data?.results ?? []).length > 0 && (
            <section className="rounded-lg border bg-card p-4 sm:p-6">
              <h2 className="mb-3 text-sm font-semibold">{tr('Gifts')}</h2>
              <ul className="divide-y text-sm">
                {gifts.data!.results.map((g) => (
                  <li key={g.id} className="flex justify-between gap-3 py-1.5">
                    <span>
                      {formatDate(g.received_on)} · {g.campaign_name ?? tr('General')}
                    </span>
                    <Money value={g.amount} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <ProfileDialog open={editing} record={p} onOpenChange={setEditing} />
      <FormDialog
        open={sub?.kind === 'job'}
        onOpenChange={close}
        title={job ? tr('Edit job') : tr('Add a job')}
        schema={z.object({ employer: z.string().trim().min(1, tr('Required.')).max(200), title: z.string().trim().min(1, tr('Required.')).max(150), location: z.string().max(150), start_date: isoDate, end_date: optionalIsoDate })}
        defaultValues={{ employer: job?.employer ?? '', title: job?.title ?? '', location: job?.location ?? '', start_date: job?.start_date ?? '', end_date: job?.end_date ?? '' }}
        onSubmit={async (v) => {
          const input = { ...v, profile: p.id, end_date: v.end_date || null }
          if (job) await updateJob.mutateAsync({ id: job.id, input })
          else await createJob.mutateAsync(input)
          toast.success(tr('Saved.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Job title')} required error={errors.title?.message}>
              <Input {...register('title')} />
            </FormField>
            <FormField label={tr('Employer')} required error={errors.employer?.message}>
              <Input {...register('employer')} />
            </FormField>
            <FormField label={tr('Location')} className="sm:col-span-2">
              <Input {...register('location')} />
            </FormField>
            <FormField label={tr('From')} required error={errors.start_date?.message}>
              {(pp) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...pp} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label={tr('To')} error={errors.end_date?.message} description={tr('Empty: works there now.')}>
              {(pp) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...pp} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
          </div>
        )}
      </FormDialog>
      <FormDialog
        open={sub?.kind === 'study'}
        onOpenChange={close}
        title={study ? tr('Edit study') : tr('Add further study')}
        schema={z.object({ institution: z.string().trim().min(1, tr('Required.')).max(200), qualification: z.string().trim().min(1, tr('Required.')).max(150), field: z.string().max(150), country: z.string().max(100), start_year: z.string().regex(/^\d{4}$/, tr('A year.')), end_year: z.union([z.literal(''), z.string().regex(/^\d{4}$/, tr('A year.'))]), status: z.string() })}
        defaultValues={{ institution: study?.institution ?? '', qualification: study?.qualification ?? '', field: study?.field ?? '', country: study?.country ?? '', start_year: study ? String(study.start_year) : '', end_year: study?.end_year ? String(study.end_year) : '', status: study?.status ?? 'ongoing' }}
        onSubmit={async (v) => {
          const input = { ...v, profile: p.id, start_year: Number(v.start_year), end_year: v.end_year ? Number(v.end_year) : null, status: v.status as HigherStudy['status'] }
          if (study) await updateStudy.mutateAsync({ id: study.id, input })
          else await createStudy.mutateAsync(input)
          toast.success(tr('Saved.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Qualification')} required error={errors.qualification?.message}>
              <Input {...register('qualification')} placeholder={tr('MSc')} />
            </FormField>
            <FormField label={tr('Field')}>
              <Input {...register('field')} placeholder={tr('Computer Science')} />
            </FormField>
            <FormField label={tr('Institution')} required error={errors.institution?.message}>
              <Input {...register('institution')} />
            </FormField>
            <FormField label={tr('Country')}>
              <Input {...register('country')} />
            </FormField>
            <FormField label={tr('From (year)')} required error={errors.start_year?.message}>
              <Input {...register('start_year')} inputMode="numeric" />
            </FormField>
            <FormField label={tr('To (year)')} error={errors.end_year?.message}>
              <Input {...register('end_year')} inputMode="numeric" />
            </FormField>
            <FormField label={tr('Status')}>
              {(pp) => <Controller control={control} name="status" render={({ field }) => <SelectControl {...pp} value={field.value} onChange={field.onChange} options={enumOptions('StudyStatusEnum')} />} />}
            </FormField>
          </div>
        )}
      </FormDialog>
      <FormDialog
        open={sub?.kind === 'award'}
        onOpenChange={close}
        title={award ? tr('Edit achievement') : tr('Add an achievement')}
        schema={z.object({ title: z.string().trim().min(1, tr('Required.')).max(200), description: z.string(), achieved_on: optionalIsoDate, url })}
        defaultValues={{ title: award?.title ?? '', description: award?.description ?? '', achieved_on: award?.achieved_on ?? '', url: award?.url ?? '' }}
        onSubmit={async (v) => {
          const input = { ...v, profile: p.id, achieved_on: v.achieved_on || null }
          if (award) await updateAward.mutateAsync({ id: award.id, input })
          else await createAward.mutateAsync(input)
          toast.success(tr('Saved.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label={tr('Title')} required error={errors.title?.message}>
              <Input {...register('title')} placeholder={tr('National science award')} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('On')} error={errors.achieved_on?.message}>
                {(pp) => <Controller control={control} name="achieved_on" render={({ field }) => <DatePicker {...pp} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('Link')} error={errors.url?.message}>
                <Input {...register('url')} inputMode="url" />
              </FormField>
            </div>
            <FormField label={tr('Description')}>
              <Textarea {...register('description')} rows={2} />
            </FormField>
          </>
        )}
      </FormDialog>
      <DeleteDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        subject={deleting?.label ?? ''}
        onConfirm={async () => {
          const d = deleting!
          await (d.kind === 'job' ? removeJob : d.kind === 'study' ? removeStudy : removeAward).mutateAsync(d.id)
          toast.success(tr('Deleted.'))
        }}
      />
      <DeleteDialog
        open={deletingProfile}
        onOpenChange={setDeletingProfile}
        subject={p.full_name}
        onConfirm={async () => {
          await removeProfile.mutateAsync(p.id)
          toast.success(tr('Deleted.'))
          navigate('/alumni')
        }}
      />
    </div>
  )
}

const MENTOR_TONE: Record<string, StatusTone> = { pending: 'warning', accepted: 'success', declined: 'danger', ended: 'muted', cancelled: 'muted' }

/** Alumni who take mentees, and every mentoring pair. Pairs are made and ended by the two people, from their portals. */
export function MentorsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status'] })
  const mentors = useAlumni({ ...PICKER_PARAMS, is_mentor: true })
  const pairs = useMentorships(list.query)
  const columns: Column<Mentorship>[] = [
    { id: 'mentor', header: tr('Mentor'), mobile: 'title', cell: (m) => <span className="font-medium">{m.mentor_name}</span> },
    { id: 'mentee', header: tr('Mentee'), cell: (m) => m.mentee_name },
    { id: 'topic', header: tr('About'), cell: (m) => m.topic },
    { id: 'since', header: tr('Asked'), mobile: 'hidden', className: 'whitespace-nowrap tabular-nums', cell: (m) => formatDate(m.created_at) },
    { id: 'status', header: tr('Status'), cell: (m) => <StatusBadge status={m.status ?? 'pending'} tone={MENTOR_TONE[m.status ?? 'pending']} label={enumLabel('MentorshipStatusEnum', m.status)} /> },
  ]
  const rows = mentors.data?.results ?? []
  return (
    <>
      <h2 className="mb-2 text-sm font-semibold">{tr('Mentors')}</h2>
      {rows.length === 0 ? (
        <p className="mb-6 rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('No mentors yet. Mark an alumnus as taking mentees on their profile; alumni can also offer themselves from their portal.')}</p>
      ) : (
        <ul className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => navigate(`/alumni/${m.id}`)} className="w-full rounded-lg border bg-card p-3 text-left text-sm hover:bg-muted/50">
                <p className="font-medium">{m.full_name}</p>
                <p className="text-muted-foreground">{m.current_job ? `${m.current_job.title}, ${m.current_job.employer}` : [m.program_name, m.academic_year].filter(Boolean).join(' · ')}</p>
                {m.mentor_topics && <p className="mt-1">{m.mentor_topics}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{tr('Up to')} {m.mentor_capacity} {tr('mentees')}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mb-2 text-sm font-semibold">{tr('Mentoring')}</h2>
      <DataTable
        ariaLabel={tr('Mentoring')}
        columns={columns}
        query={pairs}
        list={list}
        getRowId={(m) => m.id}
        searchable={false}
        filters={[{ name: 'status', label: tr('Status'), options: enumOptions('MentorshipStatusEnum') }]}
        empty={{ title: tr('No mentoring yet'), description: tr('Students and young alumni ask a mentor from their portal; the mentor accepts or declines.') }}
      />
    </>
  )
}
