import { Check, ExternalLink, Lock, Pencil, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { optionalIsoDate } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { JobPosting } from '../api/careers.api'
import { useClosePosting, useCreatePosting, usePostings, useReviewPosting, useUpdatePosting } from '../hooks/useCareers'
import { tr } from '@/lib/i18n'

const TONE: Record<string, StatusTone> = { pending: 'warning', approved: 'success', rejected: 'danger', closed: 'muted' }

const schema = z
  .object({
    title: z.string().trim().min(1, tr('Required.')).max(200),
    company: z.string().trim().min(1, tr('Required.')).max(200),
    location: z.string().max(150),
    kind: z.string(),
    audience: z.string(),
    description: z.string().trim().min(1, tr('Describe the job.')),
    apply_url: z.union([z.literal(''), z.string().url(tr('A full link, starting https://'))]),
    contact_email: z.union([z.literal(''), z.string().email(tr('An email address.'))]),
    how_to_apply: z.string(),
    closes_on: optionalIsoDate,
  })
  .refine((v) => v.apply_url || v.contact_email || v.how_to_apply.trim(), { path: ['how_to_apply'], message: tr('Say how to apply: a link, an email, or instructions.') })

function PostingDialog({ open, record, onOpenChange }: { open: boolean; record: JobPosting | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreatePosting()
  const update = useUpdatePosting()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit {title}', { title: record.title }) : tr('Post a job')}
      description={tr('Another employer’s job or internship, for students and alumni. The office’s own postings are listed straight away.')}
      wide
      schema={schema}
      defaultValues={{ title: record?.title ?? '', company: record?.company ?? '', location: record?.location ?? '', kind: record?.kind ?? 'full_time', audience: record?.audience ?? 'both', description: record?.description ?? '', apply_url: record?.apply_url ?? '', contact_email: record?.contact_email ?? '', how_to_apply: record?.how_to_apply ?? '', closes_on: record?.closes_on ?? '' }}
      onSubmit={async (v) => {
        const input = { ...v, kind: v.kind as JobPosting['kind'], audience: v.audience as JobPosting['audience'], closes_on: v.closes_on || null }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Posting saved.') : tr('Posted.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Job title')} required error={errors.title?.message}>
              <Input {...register('title')} />
            </FormField>
            <FormField label={tr('Employer')} required error={errors.company?.message}>
              <Input {...register('company')} />
            </FormField>
            <FormField label={tr('Location')}>
              <Input {...register('location')} placeholder={tr('Kathmandu / remote')} />
            </FormField>
            <FormField label={tr('Kind')}>
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PostingKindEnum')} />} />}
            </FormField>
            <FormField label={tr('For')}>
              {(p) => <Controller control={control} name="audience" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PostingAudienceEnum')} />} />}
            </FormField>
            <FormField label={tr('Closes on')} error={errors.closes_on?.message}>
              {(p) => <Controller control={control} name="closes_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
          </div>
          <FormField label={tr('Description')} required error={errors.description?.message}>
            <Textarea {...register('description')} rows={4} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Apply at (link)')} error={errors.apply_url?.message}>
              <Input {...register('apply_url')} inputMode="url" />
            </FormField>
            <FormField label={tr('Or email')} error={errors.contact_email?.message}>
              <Input {...register('contact_email')} inputMode="email" />
            </FormField>
          </div>
          <FormField label={tr('How to apply')} error={errors.how_to_apply?.message}>
            <Textarea {...register('how_to_apply')} rows={2} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** Outside jobs and internships for students and alumni; alumni posts wait for approval here. */
export function BoardPage() {
  const list = useListState({ filters: ['status', 'kind', 'audience'] })
  const query = usePostings(list.query)
  const review = useReviewPosting()
  const close = useClosePosting()
  const crud = useCrudState<JobPosting>()
  const [rejecting, setRejecting] = useState<JobPosting | null>(null)
  const act = (p: Promise<unknown>, done: string) => p.then(() => toast.success(done), (e) => toast.error(errorMessage(e)))
  const columns: Column<JobPosting>[] = [
    { id: 'title', header: tr('Job'), mobile: 'title', cell: (p) => (
      <span>
        <span className="font-medium">{p.title}</span>
        <span className="block text-xs text-muted-foreground">{[p.company, p.location].filter(Boolean).join(' · ')}</span>
      </span>
    ) },
    { id: 'kind', header: tr('Kind'), cell: (p) => enumLabel('PostingKindEnum', p.kind) },
    { id: 'for', header: tr('For'), mobile: 'hidden', cell: (p) => enumLabel('PostingAudienceEnum', p.audience) },
    { id: 'closes', header: tr('Closes'), mobile: 'hidden', className: 'whitespace-nowrap tabular-nums', cell: (p) => (p.closes_on ? formatDate(p.closes_on) : '—') },
    { id: 'apply', header: '', mobile: 'hidden', cell: (p) => p.apply_url && (
      <a href={p.apply_url} target="_blank" rel="noreferrer" className="text-primary" aria-label={tr('Open the application link')} onClick={(e) => e.stopPropagation()}>
        <ExternalLink className="h-4 w-4" aria-hidden />
      </a>
    ) },
    { id: 'status', header: tr('Status'), cell: (p) => <StatusBadge status={p.status ?? 'pending'} tone={TONE[p.status ?? 'pending']} label={enumLabel('PostingStatusEnum', p.status)} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Job board')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(p) => p.id}
        searchable={false}
        create={
          <Button onClick={crud.openCreate}>
            <Plus aria-hidden /> {tr('Post a job')}
          </Button>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('PostingStatusEnum') },
          { name: 'kind', label: tr('Kind'), options: enumOptions('PostingKindEnum') },
          { name: 'audience', label: tr('For'), options: enumOptions('PostingAudienceEnum') },
        ]}
        rowActions={(p) => (
          <RowActions
            actions={[
              { label: tr('Approve'), icon: Check, permission: PERMS.careers.board, hidden: p.status !== 'pending', onSelect: () => void act(review.mutateAsync({ id: p.id, approve: true }), 'Listed.') },
              { label: tr('Reject'), icon: X, permission: PERMS.careers.board, hidden: p.status !== 'pending', onSelect: () => setRejecting(p) },
              { label: tr('Edit'), icon: Pencil, permission: PERMS.careers.board, hidden: p.status === 'rejected' || p.status === 'closed', onSelect: () => crud.openEdit(p) },
              { label: tr('Take down'), icon: Lock, permission: PERMS.careers.board, hidden: p.status !== 'approved', destructive: true, onSelect: () => void act(close.mutateAsync(p.id), 'Taken down.') },
            ]}
          />
        )}
        empty={{ title: tr('Nothing on the board'), description: tr('Post outside jobs and internships; alumni can post too, and theirs wait for approval here.') }}
      />
      <PostingDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <FormDialog
        open={rejecting !== null}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={tr('Don’t list this posting?')}
        submitLabel={tr('Reject')}
        schema={z.object({ note: z.string().trim().min(1, tr('Say why, for the poster.')).max(255) })}
        defaultValues={{ note: '' }}
        onSubmit={async (v) => {
          await review.mutateAsync({ id: rejecting!.id, approve: false, note: v.note })
          toast.success(tr('Rejected.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.note?.message}>
            <Input {...register('note')} />
          </FormField>
        )}
      </FormDialog>
    </>
  )
}
