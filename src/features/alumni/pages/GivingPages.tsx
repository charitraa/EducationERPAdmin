import { Ban, Pencil, Plus, Send, Trash2, Undo2, Users } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Money, moneyInput } from '@/features/finance/components/money'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { fromPaisa, toPaisa } from '@/lib/currency'
import { combineLocal, formatDate, formatDateTime, splitLocal, todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { isoDate, optionalIsoDate, optionalWholeNumber } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { AlumniEvent, Campaign, Donation } from '../api/alumni.api'
import {
  useAlumni,
  useAlumniEvents,
  useCampaigns,
  useCancelAlumniEvent,
  useCreateAlumniEvent,
  useCreateCampaign,
  useDonations,
  usePublishAlumniEvent,
  useRecordDonation,
  useRefundDonation,
  useRemoveAlumniEvent,
  useRemoveCampaign,
  useRsvps,
  useUpdateAlumniEvent,
  useUpdateCampaign,
} from '../hooks/useAlumni'
import { tr } from '@/lib/i18n'

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, tr('Use HH:MM.'))
const EVENT_TONE: Record<string, StatusTone> = { draft: 'neutral', published: 'success', cancelled: 'muted' }

function EventDialog({ open, record, onOpenChange }: { open: boolean; record: AlumniEvent | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateAlumniEvent()
  const update = useUpdateAlumniEvent()
  const { branches, isMultiBranch } = useBranches()
  const start = splitLocal(record?.starts_at)
  const end = splitLocal(record?.ends_at)
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit {title}', { title: record.title }) : tr('New alumni event')}
      description={record ? undefined : tr('Saved as a draft; publish it to invite alumni.')}
      wide
      schema={z
        .object({ title: z.string().trim().min(1, tr('Required.')).max(200), description: z.string(), date: isoDate, start: hhmm, end_time: z.union([z.literal(''), hhmm]), venue: z.string().max(255), online_url: z.union([z.literal(''), z.string().url(tr('A full link.'))]), capacity: optionalWholeNumber, campus: z.string() })
        .refine((v) => !v.end_time || v.end_time > v.start, { path: ['end_time'], message: tr('After the start.') })}
      defaultValues={{ title: record?.title ?? '', description: record?.description ?? '', date: start.date, start: start.time || '17:00', end_time: end.time, venue: record?.venue ?? '', online_url: record?.online_url ?? '', capacity: record?.capacity != null ? String(record.capacity) : '', campus: record?.campus ? String(record.campus) : '' }}
      onSubmit={async (v) => {
        const input = { title: v.title, description: v.description, starts_at: combineLocal(v.date, v.start), ends_at: v.end_time ? combineLocal(v.date, v.end_time) : null, venue: v.venue, online_url: v.online_url, capacity: v.capacity ? Number(v.capacity) : null, campus: v.campus ? Number(v.campus) : null }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(tr('Event saved.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label={tr('Title')} required error={errors.title?.message}>
            <Input {...register('title')} placeholder={tr('Alumni homecoming 2083')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('Date')} required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label={tr('Starts')} required error={errors.start?.message}>
              <Input {...register('start')} type="time" />
            </FormField>
            <FormField label={tr('Ends')} error={errors.end_time?.message}>
              <Input {...register('end_time')} type="time" />
            </FormField>
            <FormField label={tr('Venue')}>
              <Input {...register('venue')} />
            </FormField>
            <FormField label={tr('Online link')} error={errors.online_url?.message}>
              <Input {...register('online_url')} inputMode="url" />
            </FormField>
            <FormField label={tr('Places')} error={errors.capacity?.message} description={tr('Guests included. Empty: no limit.')}>
              <Input {...register('capacity')} inputMode="numeric" />
            </FormField>
          </div>
          {isMultiBranch && (
            <FormField label={tr('For alumni of')}>
              {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Every branch')} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
            </FormField>
          )}
          <FormField label={tr('Description')}>
            <Textarea {...register('description')} rows={3} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

function RsvpDialog({ event, onOpenChange }: { event: AlumniEvent | null; onOpenChange: (o: boolean) => void }) {
  const rsvps = useRsvps(event?.id ?? null)
  const rows = rsvps.data ?? []
  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tr('Who’s coming') + ' ·'} {event?.title}</DialogTitle>
        </DialogHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{rsvps.isPending ? tr('Loading…') : tr('No replies yet.')}</p>
        ) : (
          <ul className="max-h-80 divide-y overflow-y-auto text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-1.5">
                <span>
                  {r.profile_name}
                  {r.guests ? <span className="text-muted-foreground"> +{r.guests}</span> : null}
                </span>
                <span className="text-muted-foreground">{enumLabel('RsvpResponseEnum', r.response)}</span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Reunions and talks for alumni: draft, publish, see who's coming. */
export function AlumniEventsPage() {
  const list = useListState({ filters: ['status'] })
  const query = useAlumniEvents({ ...list.query, ordering: '-starts_at' })
  const publish = usePublishAlumniEvent()
  const cancel = useCancelAlumniEvent()
  const remove = useRemoveAlumniEvent()
  const crud = useCrudState<AlumniEvent>()
  const [cancelling, setCancelling] = useState<AlumniEvent | null>(null)
  const [viewing, setViewing] = useState<AlumniEvent | null>(null)
  const columns: Column<AlumniEvent>[] = [
    { id: 'title', header: tr('Event'), mobile: 'title', cell: (e) => <span className="font-medium">{e.title}</span> },
    { id: 'when', header: tr('When'), className: 'whitespace-nowrap tabular-nums', cell: (e) => formatDateTime(e.starts_at) },
    { id: 'where', header: tr('Where'), mobile: 'hidden', cell: (e) => e.venue || (e.online_url ? tr('Online') : '—') },
    { id: 'places', header: tr('Coming'), className: 'tabular-nums', cell: (e) => `${e.places_taken}${e.capacity ? ` of ${e.capacity}` : ''}` },
    { id: 'status', header: tr('Status'), cell: (e) => <StatusBadge status={e.status ?? 'draft'} tone={EVENT_TONE[e.status ?? 'draft']} label={enumLabel('AlumniEventStatusEnum', e.status)} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Alumni events')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(e) => e.id}
        searchPlaceholder={tr('Title…')}
        onRowClick={setViewing}
        toolbar={
          <PermissionGate permission={PERMS.alumni.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('New event')}
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'status', label: tr('Status'), options: enumOptions('AlumniEventStatusEnum') }]}
        rowActions={(e) => (
          <RowActions
            actions={[
              { label: tr('Publish'), icon: Send, permission: PERMS.alumni.manage, hidden: e.status !== 'draft', onSelect: () => void publish.mutateAsync(e.id).then(() => toast.success(tr('Published; alumni are invited.')), (err) => toast.error(errorMessage(err))) },
              { label: tr('Who’s coming'), icon: Users, hidden: e.status === 'draft', onSelect: () => setViewing(e) },
              { label: tr('Edit'), icon: Pencil, permission: PERMS.alumni.manage, hidden: e.status === 'cancelled', onSelect: () => crud.openEdit(e) },
              { label: tr('Cancel'), icon: Ban, permission: PERMS.alumni.manage, hidden: e.status !== 'published', destructive: true, onSelect: () => setCancelling(e) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.alumni.manage, hidden: e.status !== 'draft', destructive: true, onSelect: () => crud.openDelete(e) },
            ]}
          />
        )}
        empty={{ title: tr('No alumni events'), description: tr('Plan a reunion, a talk or a networking evening.') }}
      />
      <EventDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <RsvpDialog event={viewing} onOpenChange={(o) => !o && setViewing(null)} />
      <FormDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        title={tr('Cancel {title}?', { title: cancelling?.title })}
        description={tr('Everyone who said they’re coming is told.')}
        submitLabel={tr('Cancel event')}
        schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await cancel.mutateAsync({ id: cancelling!.id, reason: v.reason })
          toast.success(tr('Cancelled.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Input {...register('reason')} />
          </FormField>
        )}
      </FormDialog>
      <DeleteDialog open={crud.deleting !== null} onOpenChange={(o) => !o && crud.closeDelete()} subject={crud.deleting?.title ?? 'event'} onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success(tr('Deleted.')) }} />
    </>
  )
}

/** Share of the goal raised, 0–100, without floats on the money. */
const progress = (c: Campaign) => {
  const goal = toPaisa(c.goal_amount ?? null)
  if (!goal) return null
  const raised = toPaisa(c.raised_amount) ?? 0n
  return Math.min(100, Number((raised * 100n) / goal))
}

/** Fundraising campaigns and how far each has got. */
export function CampaignsPage() {
  const query = useCampaigns({ ...PICKER_PARAMS, ordering: '-starts_on' })
  const create = useCreateCampaign()
  const update = useUpdateCampaign()
  const remove = useRemoveCampaign()
  const crud = useCrudState<Campaign>()
  const { branches, isMultiBranch } = useBranches()
  const rows = query.data?.results ?? []
  const r = crud.record
  return (
    <section>
      <SectionHeader
        title={tr('Campaigns')}
        action={
          <PermissionGate permission={PERMS.alumni.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('New campaign')}
            </Button>
          </PermissionGate>
        }
      />
      {rows.length === 0 ? (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{query.isPending ? tr('Loading…') : tr('No campaigns yet: a library fund, scholarships, a new lab…')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => {
            const pct = progress(c)
            return (
              <li key={c.id} className="rounded-lg border bg-card p-4 text-sm">
                <div className="flex items-start gap-2">
                  <p className="flex-1">
                    <span className="font-medium">{c.name}</span>
                    {c.is_active === false && <StatusBadge status="inactive" label={tr('Closed')} className="ml-2" />}
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(c.starts_on)} – {c.ends_on ? formatDate(c.ends_on) : tr('ongoing')}
                      {c.campus_name && ` · ${c.campus_name}`}
                    </span>
                  </p>
                  <RowActions
                    label={tr('Actions for {name}', { name: c.name })}
                    actions={[
                      { label: tr('Edit'), icon: Pencil, permission: PERMS.alumni.manage, onSelect: () => crud.openEdit(c) },
                      { label: tr('Delete'), icon: Trash2, permission: PERMS.alumni.manage, destructive: true, onSelect: () => crud.openDelete(c) },
                    ]}
                  />
                </div>
                <p className="mt-3 text-xl font-semibold">
                  <Money value={c.raised_amount} tone="none" />
                </p>
                {pct != null && (
                  <>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={tr('{name} progress', { name: c.name })}>
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tr('{pct}% of', { pct })} <Money value={c.goal_amount} tone="none" />
                    </p>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <FormDialog
        open={crud.formOpen}
        onOpenChange={(o) => !o && crud.closeForm()}
        title={r ? tr('Edit {name}', { name: r.name }) : tr('New campaign')}
        schema={z
          .object({ code: z.string().trim().min(1, tr('Required.')).max(50).regex(/^[a-z0-9_-]+$/i, tr('Letters, numbers, - and _ only.')), name: z.string().trim().min(1, tr('Required.')).max(200), description: z.string(), goal_amount: z.union([z.literal(''), moneyInput]), starts_on: isoDate, ends_on: optionalIsoDate, is_active: z.boolean(), campus: z.string() })
          .refine((v) => !v.ends_on || v.ends_on >= v.starts_on, { path: ['ends_on'], message: tr('Can’t end before it starts.') })}
        defaultValues={{ code: r?.code ?? '', name: r?.name ?? '', description: r?.description ?? '', goal_amount: r?.goal_amount ?? '', starts_on: r?.starts_on ?? todayIso(), ends_on: r?.ends_on ?? '', is_active: r?.is_active ?? true, campus: r?.campus ? String(r.campus) : '' }}
        onSubmit={async (v) => {
          const input = { ...v, goal_amount: v.goal_amount || null, ends_on: v.ends_on || null, campus: v.campus ? Number(v.campus) : null }
          if (r) await update.mutateAsync({ id: r.id, input })
          else await create.mutateAsync(input)
          toast.success(tr('Campaign saved.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <FormField label={tr('Name')} required error={errors.name?.message}>
                <Input {...register('name')} placeholder={tr('Library fund')} />
              </FormField>
              <FormField label={tr('Code')} required error={errors.code?.message}>
                <Input {...register('code')} className="font-mono" />
              </FormField>
              <FormField label={tr('Goal')} error={errors.goal_amount?.message} description={tr('Empty: no target.')}>
                <Input {...register('goal_amount')} inputMode="decimal" />
              </FormField>
              {isMultiBranch && (
                <FormField label={tr('Branch')}>
                  {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Whole organization')} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
                </FormField>
              )}
              <FormField label={tr('Starts')} required error={errors.starts_on?.message}>
                {(p) => <Controller control={control} name="starts_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('Ends')} error={errors.ends_on?.message}>
                {(p) => <Controller control={control} name="ends_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            <FormField label={tr('Description')}>
              <Textarea {...register('description')} rows={2} />
            </FormField>
            <Controller control={control} name="is_active" render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Open for giving')}
              </label>
            )} />
          </>
        )}
      </FormDialog>
      <DeleteDialog open={crud.deleting !== null} onOpenChange={(o) => !o && crud.closeDelete()} subject={crud.deleting?.name ?? 'campaign'} onConfirm={async () => { await remove.mutateAsync(crud.deleting!.id); toast.success(tr('Deleted.')) }} />
    </section>
  )
}

/** Gifts received, each with a receipt number; refunds are new rows, the gift stays. */
export function DonationsPage() {
  const list = useListState({ filters: ['campaign', 'method'] })
  const query = useDonations(list.query)
  const campaigns = useCampaigns({ ...PICKER_PARAMS })
  const alumni = useAlumni({ ...PICKER_PARAMS, ordering: 'first_name' })
  const record = useRecordDonation()
  const refund = useRefundDonation()
  const { branches, isMultiBranch, selectedBranchId, defaultBranchId } = useBranches()
  const [recording, setRecording] = useState(false)
  const [refunding, setRefunding] = useState<Donation | null>(null)
  const columns: Column<Donation>[] = [
    { id: 'receipt', header: tr('Receipt'), className: 'font-mono text-xs', cell: (d) => d.receipt_number },
    { id: 'donor', header: tr('Donor'), mobile: 'title', cell: (d) => (
      <span>
        <span className="font-medium">{d.donor_name}</span>
        {d.is_anonymous && <span className="ml-1 text-xs text-muted-foreground">{tr('(anonymous)')}</span>}
      </span>
    ) },
    { id: 'campaign', header: tr('For'), cell: (d) => d.campaign_name ?? tr('General') },
    { id: 'on', header: tr('Received'), className: 'whitespace-nowrap tabular-nums', cell: (d) => formatDate(d.received_on) },
    { id: 'method', header: tr('By'), mobile: 'hidden', cell: (d) => enumLabel('PaymentMethodEnum', d.method) },
    { id: 'amount', header: tr('Amount'), className: 'text-right', cell: (d) => (
      <span>
        <Money value={d.amount} tone="none" />
        {(toPaisa(d.refunded_amount) ?? 0n) > 0n && (
          <span className="block text-xs text-danger">
            −<Money value={d.refunded_amount} tone="none" /> {tr('refunded')}
          </span>
        )}
      </span>
    ) },
  ]
  const left = (d: Donation) => (toPaisa(d.amount) ?? 0n) - (toPaisa(d.refunded_amount) ?? 0n)
  return (
    <>
      <DataTable
        ariaLabel={tr('Donations')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchPlaceholder={tr('Receipt, donor or reference…')}
        toolbar={
          <PermissionGate permission={PERMS.alumni.donations}>
            <Button onClick={() => setRecording(true)}>
              <Plus aria-hidden /> {tr('Record donation')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'campaign', label: tr('Campaign'), options: (campaigns.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.name })) },
          { name: 'method', label: tr('By'), options: enumOptions('PaymentMethodEnum') },
        ]}
        rowActions={(d) => <RowActions actions={[{ label: tr('Refund'), icon: Undo2, permission: PERMS.alumni.donations, hidden: left(d) <= 0n, destructive: true, onSelect: () => setRefunding(d) }]} />}
        empty={{ title: tr('No donations yet'), description: tr('Record gifts from alumni and friends; each gets a receipt number.') }}
      />
      <FormDialog
        open={recording}
        onOpenChange={setRecording}
        title={tr('Record a donation')}
        wide
        submitLabel={tr('Record')}
        schema={z
          .object({ campus: z.string().min(1, tr('Choose a branch.')), campaign: z.string(), donor: z.string(), donor_name: z.string().max(200), donor_email: z.union([z.literal(''), z.string().email(tr('An email address.'))]), amount: moneyInput, method: z.string(), received_on: isoDate, reference: z.string().max(100), note: z.string().max(255), is_anonymous: z.boolean() })
          .refine((v) => v.donor || v.donor_name.trim(), { path: ['donor_name'], message: tr('Name the donor, or pick an alumnus.') })}
        defaultValues={{ campus: String(selectedBranchId ?? defaultBranchId ?? ''), campaign: '', donor: '', donor_name: '', donor_email: '', amount: '', method: 'cash', received_on: todayIso(), reference: '', note: '', is_anonymous: false }}
        onSubmit={async (v) => {
          const d = await record.mutateAsync({ ...v, campus: Number(v.campus), campaign: v.campaign ? Number(v.campaign) : null, donor: v.donor ? Number(v.donor) : null, method: v.method as Donation['method'] })
          toast.success(tr('Recorded; receipt {receipt_number}.', { receipt_number: d.receipt_number }))
        }}
      >
        {({ register, control, watch, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('Alumnus')} description={tr('Or leave empty and name the donor.')}>
                {(p) => <Controller control={control} name="donor" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Not an alumnus')} options={(alumni.data?.results ?? []).map((a) => ({ value: String(a.id), label: a.full_name }))} />} />}
              </FormField>
              {!watch('donor') && (
                <FormField label={tr('Donor name')} required error={errors.donor_name?.message}>
                  <Input {...register('donor_name')} />
                </FormField>
              )}
              <FormField label={tr('Amount')} required error={errors.amount?.message}>
                <Input {...register('amount')} inputMode="decimal" />
              </FormField>
              <FormField label={tr('For')}>
                {(p) => <Controller control={control} name="campaign" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('General gift')} options={(campaigns.data?.results ?? []).filter((c) => c.is_active !== false).map((c) => ({ value: String(c.id), label: c.name }))} />} />}
              </FormField>
              <FormField label={tr('By')}>
                {(p) => <Controller control={control} name="method" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PaymentMethodEnum')} />} />}
              </FormField>
              <FormField label={tr('Received')} required error={errors.received_on?.message}>
                {(p) => <Controller control={control} name="received_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('Reference')}>
                <Input {...register('reference')} placeholder={tr('Cheque or transfer no.')} />
              </FormField>
              {isMultiBranch && (
                <FormField label={tr('Received at')} required error={errors.campus?.message}>
                  {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
                </FormField>
              )}
            </div>
            <FormField label={tr('Note')}>
              <Input {...register('note')} />
            </FormField>
            <Controller control={control} name="is_anonymous" render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Leave the name off public lists')}
              </label>
            )} />
          </>
        )}
      </FormDialog>
      <FormDialog
        open={refunding !== null}
        onOpenChange={(o) => !o && setRefunding(null)}
        title={tr('Refund {receipt_number}', { receipt_number: refunding?.receipt_number })}
        description={refunding ? <>{tr('Up to')} <Money value={fromPaisa(left(refunding))} tone="none" /> {tr('can be refunded.')}</> : ''}
        submitLabel={tr('Refund')}
        schema={z.object({ amount: moneyInput, reason: z.string().trim().min(1, tr('Say why.')).max(255), method: z.string(), reference: z.string().max(100) })}
        defaultValues={{ amount: refunding ? fromPaisa(left(refunding)) : '', reason: '', method: refunding?.method ?? 'cash', reference: '' }}
        onSubmit={async (v) => {
          await refund.mutateAsync({ id: refunding!.id, ...v, method: v.method as Donation['method'] })
          toast.success(tr('Refunded.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Amount')} required error={errors.amount?.message}>
              <Input {...register('amount')} inputMode="decimal" />
            </FormField>
            <FormField label={tr('By')}>
              {(p) => <Controller control={control} name="method" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PaymentMethodEnum')} />} />}
            </FormField>
            <FormField label={tr('Reason')} required error={errors.reason?.message} className="sm:col-span-2">
              <Input {...register('reason')} />
            </FormField>
            <FormField label={tr('Reference')} className="sm:col-span-2">
              <Input {...register('reference')} />
            </FormField>
          </div>
        )}
      </FormDialog>
    </>
  )
}
