import { zodResolver } from '@hookform/resolvers/zod'
import { Clock, Loader2, Send, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { UnsavedChangesDialog } from '@/components/forms/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { formatDate, formatDateTime } from '@/lib/dates'
import { applyServerErrors } from '@/lib/errors'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { optionalIsoDate } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Schema } from '@/shared/types/api'
import { endOfDayIso, localDate, noticeState, type Notice, type NoticeInput } from '../api/notices.api'
import { useCreateNotice, useNotice, usePublishNotice, useRemoveNotice, useUpdateNotice } from '../hooks/useNotices'
import { tr } from '@/lib/i18n'

const STATE_LABELS = { draft: tr('Draft'), published: tr('Published'), expired: tr('Expired') }

const schema = z.object({
  title: z.string().trim().min(1, tr('Required.')).max(200),
  body: z.string().trim().min(1, tr('Write the notice.')),
  audience: z.string(),
  campus: z.string(),
  expires_on: optionalIsoDate,
})
type NoticeForm = z.infer<typeof schema>

const defaults = (n: Notice | null): NoticeForm => ({
  title: n?.title ?? '',
  body: n?.body ?? '',
  audience: n?.audience ?? 'all',
  campus: n?.campus ? String(n.campus) : '',
  expires_on: localDate(n?.expires_at),
})

const toInput = (v: NoticeForm): NoticeInput => ({
  title: v.title,
  body: v.body,
  audience: v.audience as Schema<'AudienceEnum'>,
  campus: v.campus ? Number(v.campus) : null,
  expires_at: v.expires_on ? endOfDayIso(v.expires_on) : null,
})

/** What readers see; also the live preview while writing. */
function NoticeView({ title, body, audience, campus, meta }: { title: string; body: string; audience: string; campus: string | null; meta?: string }) {
  return (
    <article className="rounded-lg border bg-card p-4 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {tr('For')} {enumLabel('AudienceEnum', audience).toLowerCase()}
        {campus ? ` · ${campus}` : ''}
      </p>
      <h2 className="mt-1 text-lg font-semibold">{title || <span className="text-muted-foreground">{tr('Untitled notice')}</span>}</h2>
      {meta && <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>}
      <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{body || <span className="text-muted-foreground">{tr('The notice text appears here.')}</span>}</div>
    </article>
  )
}

/** /notices/new and /notices/:id */
export default function NoticePage() {
  const { id } = useParams()
  const noticeId = id ? Number(id) : null
  const notice = useNotice(noticeId)
  const { can } = usePermissions()
  if (noticeId != null && notice.isPending) return <PageLoader />
  if (notice.isError) return <ErrorState error={notice.error} onRetry={() => void notice.refetch()} />
  const record = noticeId == null ? null : notice.data!
  if (record && !can(PERMS.notices.manage)) {
    return (
      <>
        <PageHeader backTo="/notices" title={record.title} />
        <div className="max-w-3xl">
          <NoticeView
            title={record.title}
            body={record.body}
            audience={record.audience ?? 'all'}
            campus={record.campus_name}
            meta={record.published_at ? `Published ${formatDateTime(record.published_at)}` : undefined}
          />
        </div>
      </>
    )
  }
  return <NoticeEditor record={record} />
}

function NoticeEditor({ record }: { record: Notice | null }) {
  const navigate = useNavigate()
  const { isMultiBranch, branches, branchName } = useBranches()
  const create = useCreateNotice()
  const update = useUpdateNotice()
  const publish = usePublishNotice()
  const remove = useRemoveNotice()
  const [serverError, setServerError] = useState<string | null>(null)
  const [savedTo, setSavedTo] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'publish' | 'expire' | 'delete' | null>(null)
  const form = useForm<NoticeForm>({ resolver: zodResolver(schema), defaultValues: defaults(record) })
  const { register, control, formState } = form
  const { errors } = formState
  const values = useWatch({ control })
  const blocker = useUnsavedChanges(formState.isDirty && !savedTo)
  const state = record ? noticeState(record) : 'draft'

  useEffect(() => {
    if (savedTo) navigate(savedTo, { replace: true })
  }, [savedTo, navigate])

  const save = form.handleSubmit(async (v) => {
    setServerError(null)
    try {
      if (record) {
        const saved = await update.mutateAsync({ id: record.id, input: toInput(v) })
        form.reset(defaults(saved))
        toast.success(tr('Notice saved.'))
      } else {
        const saved = await create.mutateAsync(toInput(v))
        toast.success(tr('Draft saved. Publish it when it’s ready.'))
        setSavedTo(`/notices/${saved.id}`)
      }
    } catch (err) {
      setServerError(applyServerErrors(err, form.setError, ['title', 'body', 'audience', 'campus', 'expires_at']))
    }
  })

  return (
    <>
      <PageHeader
        backTo="/notices"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {record ? record.title : tr('Write a notice')}
            {record && <StatusBadge status={state === 'expired' ? 'closed' : state} label={STATE_LABELS[state]} />}
          </span>
        }
        description={
          record?.published_at
            ? tr('Published {dateTime}{value}', { dateTime: formatDateTime(record.published_at), value: record.expires_at ? ' · ' + (state === 'expired' ? tr('expired {date}', { date: formatDate(localDate(record.expires_at)) }) : tr('shown until {date}', { date: formatDate(localDate(record.expires_at)) })) : '' })
            : tr('Saved as a draft first; nobody sees it until you publish.')
        }
        actions={
          record && (
            <>
              {state === 'draft' && (
                <Button size="sm" onClick={() => setDialog('publish')} disabled={formState.isDirty}>
                  <Send aria-hidden /> {tr('Publish')}
                </Button>
              )}
              {state === 'published' && (
                <Button size="sm" variant="outline" onClick={() => setDialog('expire')}>
                  <Clock aria-hidden /> {tr('Take down')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setDialog('delete')} aria-label={tr('Delete notice')}>
                <Trash2 aria-hidden />
              </Button>
            </>
          )
        }
      />
      {record && state === 'draft' && formState.isDirty && <p className="-mt-3 mb-4 text-xs text-muted-foreground">{tr('Save your changes before publishing.')}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={save} noValidate className="grid content-start gap-4 rounded-lg border bg-card p-4 sm:p-6">
          <FormError message={serverError} />
          <FormField label={tr('Title')} required error={errors.title?.message}>
            <Input {...register('title')} autoFocus={!record} placeholder={tr('School closed on Friday')} />
          </FormField>
          <FormField label={tr('Notice')} required error={errors.body?.message}>
            <Textarea {...register('body')} rows={10} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('For')} error={errors.audience?.message}>
              {(p) => <Controller control={control} name="audience" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('AudienceEnum')} />} />}
            </FormField>
            {isMultiBranch && (
              <FormField label={tr('Branch')} error={errors.campus?.message}>
                {(p) => (
                  <Controller
                    control={control}
                    name="campus"
                    render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('All branches')} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
                  />
                )}
              </FormField>
            )}
            <FormField label={tr('Shown until (AD)')} error={errors.expires_on?.message} description={tr('Empty to keep it up until taken down.')}>
              {(p) => <Controller control={control} name="expires_on" render={({ field }) => <DatePicker {...p} {...field} />} />}
            </FormField>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={formState.isSubmitting || (record != null && !formState.isDirty)}>
              {formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              {record ? tr('Save changes') : tr('Save draft')}
            </Button>
          </div>
        </form>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{tr('Preview')}</p>
          <NoticeView
            title={values.title ?? ''}
            body={values.body ?? ''}
            audience={values.audience ?? 'all'}
            campus={isMultiBranch && values.campus ? branchName(Number(values.campus)) : null}
          />
        </div>
      </div>

      <UnsavedChangesDialog blocker={blocker} />
      {record && (
        <>
          <ConfirmDialog
            open={dialog === 'publish'}
            onOpenChange={(o) => !o && setDialog(null)}
            title={tr('Publish this notice?')}
            description={tr('Everyone in its audience ({enumLabel}) sees it from now{value}. It can’t go back to draft.', { enumLabel: enumLabel('AudienceEnum', record.audience ?? 'all').toLowerCase(), value: record.expires_at ? ' ' + tr('until {date}', { date: formatDate(localDate(record.expires_at)) }) : '' })}
            confirmLabel={tr('Publish')}
            onConfirm={async () => {
              await publish.mutateAsync({ id: record.id, expiresAt: null })
              toast.success(tr('Notice published.'))
            }}
          />
          <ConfirmDialog
            open={dialog === 'expire'}
            onOpenChange={(o) => !o && setDialog(null)}
            title={tr('Take this notice down?')}
            description={tr('It stops showing right away. It stays in this list, marked expired.')}
            confirmLabel={tr('Take down')}
            onConfirm={async () => {
              const saved = await update.mutateAsync({ id: record.id, input: { expires_at: new Date().toISOString() } })
              form.reset(defaults(saved))
              toast.success(tr('Notice taken down.'))
            }}
          />
          <DeleteDialog
            open={dialog === 'delete'}
            onOpenChange={(o) => !o && setDialog(null)}
            subject={tr('the notice “{title}”', { title: record.title })}
            onConfirm={async () => {
              await remove.mutateAsync(record.id)
              toast.success(tr('Notice deleted.'))
              setSavedTo('/notices')
            }}
          />
        </>
      )}
    </>
  )
}
