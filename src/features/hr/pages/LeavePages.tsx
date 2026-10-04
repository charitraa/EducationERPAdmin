import { Ban, CalendarPlus, Check, CheckCircle2, FolderOpen, SlidersHorizontal, X, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions, pluralize } from '@/lib/formatters'
import { isoDate } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Id } from '@/shared/types/api'
import type { LeaveBalance, LeaveRequest } from '../api/hr.api'
import {
  useAdjustBalance,
  useApplyLeaveFor,
  useApproveLeave,
  useCancelLeave,
  useFiscalYearOptions,
  useLeaveBalances,
  useLeaveRequests,
  useLeaveTypeOptions,
  useMyLeave,
  useOpenBalances,
  usePendingLeave,
  useRejectLeave,
} from '../hooks/useHr'

const TONE: Record<string, StatusTone> = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'muted' }

/** "Mon 3 Oct – Wed 5 Oct · 3 days", or "· half day". */
export function leaveSpan(r: Pick<LeaveRequest, 'start_date' | 'end_date' | 'half_day' | 'days'>) {
  const dates = r.start_date === r.end_date ? formatDate(r.start_date) : `${formatDate(r.start_date)} – ${formatDate(r.end_date)}`
  return `${dates} · ${r.half_day ? 'half day' : pluralize(Number(r.days), 'day')}`
}

export function LeaveStatus({ status }: { status: LeaveRequest['status'] }) {
  return <StatusBadge status={status ?? 'pending'} tone={TONE[status ?? 'pending']} label={enumLabel('LeaveStatusEnum', status)} />
}

/** Days shown as written by the backend ("1.5"), without a trailing ".0". */
export const days = (v: string | null | undefined) => (v == null ? '—' : String(Number(v)))

const applySchema = z
  .object({ staff: z.string().min(1, 'Choose a staff member.'), leave_type: z.string().min(1, 'Choose a type.'), start_date: isoDate, end_date: isoDate, half_day: z.boolean(), reason: z.string().max(2000) })
  .refine((v) => v.half_day || v.end_date >= v.start_date, { path: ['end_date'], message: 'Must not be before the start.' })

/** HR records leave for someone: a phone call, a sick note handed in. */
export function RecordLeaveDialog({ open, onOpenChange, staffId }: { open: boolean; onOpenChange: (o: boolean) => void; staffId?: Id }) {
  const staff = useStaffOptions()
  const { types, options } = useLeaveTypeOptions()
  const apply = useApplyLeaveFor()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record leave"
      description="On a staff member’s behalf. It still waits for approval like any other request."
      submitLabel="Record"
      schema={applySchema}
      defaultValues={{ staff: staffId ? String(staffId) : '', leave_type: '', start_date: todayIso(), end_date: todayIso(), half_day: false, reason: '' }}
      onSubmit={async (v) => {
        await apply.mutateAsync({ staff: Number(v.staff), leave_type: Number(v.leave_type), start_date: v.start_date, end_date: v.half_day ? v.start_date : v.end_date, half_day: v.half_day, reason: v.reason })
        toast.success('Leave recorded.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => {
        const type = types.find((t) => String(t.id) === watch('leave_type'))
        const half = watch('half_day')
        return (
          <>
            {!staffId && (
              <FormField label="Staff member" required error={errors.staff?.message}>
                {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} placeholder="Choose…" />} />}
              </FormField>
            )}
            <FormField label="Leave type" required error={errors.leave_type?.message} description={type && (type.is_paid === false ? 'Unpaid: payroll deducts these days.' : type.annual_quota == null ? 'No yearly limit.' : `${days(type.annual_quota)} days a year.`)}>
              {(p) => <Controller control={control} name="leave_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={options} placeholder="Choose…" />} />}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={half ? 'On' : 'From'} required error={errors.start_date?.message}>
                {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              {!half && (
                <FormField label="To (inclusive)" required error={errors.end_date?.message}>
                  {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
                </FormField>
              )}
            </div>
            {type?.allow_half_day !== false && (
              <Controller control={control} name="half_day" render={({ field }) => (
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} /> Half a day
                </label>
              )} />
            )}
            <FormField label="Reason">
              <Textarea {...register('reason')} rows={2} />
            </FormField>
            <p className="text-xs text-muted-foreground">Weekends and holidays inside the dates aren’t counted.</p>
          </>
        )
      }}
    </FormDialog>
  )
}

type Decision = { kind: 'approve' | 'reject' | 'cancel'; r: LeaveRequest }

/** Approve, reject and cancel dialogs for a leave request, shared by the list and a staff member's page. */
export function LeaveDecisionDialogs({ acting, onDone }: { acting: Decision | null; onDone: () => void }) {
  const approve = useApproveLeave()
  const reject = useRejectLeave()
  const cancel = useCancelLeave()
  const who = acting ? `${acting.r.staff_name} · ${acting.r.leave_type_name}, ${leaveSpan(acting.r)}` : ''
  return (
    <>
      <FormDialog
        open={acting?.kind === 'approve' || acting?.kind === 'reject'}
        onOpenChange={(o) => !o && onDone()}
        title={acting?.kind === 'reject' ? 'Reject this leave?' : 'Approve this leave?'}
        description={who}
        submitLabel={acting?.kind === 'reject' ? 'Reject' : 'Approve'}
        schema={z.object({ note: z.string().trim().max(255) }).refine((v) => acting?.kind !== 'reject' || v.note.length > 0, { path: ['note'], message: 'Say why, for the applicant.' })}
        defaultValues={{ note: '' }}
        onSubmit={async (v) => {
          if (acting!.kind === 'reject') await reject.mutateAsync({ id: acting!.r.id, note: v.note })
          else await approve.mutateAsync({ id: acting!.r.id, note: v.note })
          toast.success(acting!.kind === 'reject' ? 'Leave rejected.' : 'Leave approved; attendance updated.')
        }}
      >
        {({ register, formState: { errors } }) => (
          <>
            {acting?.r.reason && <p className="rounded-md bg-muted p-3 text-sm">“{acting.r.reason}”</p>}
            <FormField label={acting?.kind === 'reject' ? 'Why' : 'Note'} required={acting?.kind === 'reject'} error={errors.note?.message}>
              <Input {...register('note')} maxLength={255} />
            </FormField>
          </>
        )}
      </FormDialog>
      <ConfirmDialog
        open={acting?.kind === 'cancel'}
        onOpenChange={(o) => !o && onDone()}
        title="Cancel this leave?"
        description={`${who}. ${acting?.r.status === 'approved' ? 'The days go back to the balance and come off attendance.' : ''}`}
        confirmLabel="Cancel leave"
        tone="destructive"
        onConfirm={async () => {
          await cancel.mutateAsync(acting!.r.id)
          toast.success('Leave cancelled.')
        }}
      />
    </>
  )
}

/** The signed-in user's own requests: nobody decides their own leave. */
export function useOwnLeaveIds() {
  const mine = useMyLeave()
  return new Set((mine.data ?? []).map((r) => r.id))
}

export function leaveActions(r: LeaveRequest, act: (d: Decision) => void, own: Set<Id>) {
  const decidable = r.status === 'pending' && !own.has(r.id)
  return [
    { label: 'Approve', icon: CheckCircle2, permission: PERMS.hr.approveLeave, hidden: !decidable, onSelect: () => act({ kind: 'approve', r }) },
    { label: 'Reject', icon: XCircle, permission: PERMS.hr.approveLeave, hidden: !decidable, onSelect: () => act({ kind: 'reject', r }) },
    { label: 'Cancel leave', icon: Ban, permission: { any: [PERMS.hr.view, PERMS.hr.approveLeave] }, hidden: !(r.status === 'pending' || r.status === 'approved'), destructive: true, onSelect: () => act({ kind: 'cancel', r }) },
  ]
}

/**
 * Leave requests. HR sees all of them and filters; an approver who holds only
 * `hr.approve_leave` (a head of department) gets the queue waiting on them.
 */
export function LeaveRequestsPage() {
  const { can } = usePermissions()
  const seesAll = can(PERMS.hr.view)
  const list = useListState({ filters: ['status', 'leave_type', 'fiscal_year', 'staff'] })
  const all = useLeaveRequests(list.query, seesAll)
  const pending = usePendingLeave(list.query, !seesAll)
  const waiting = usePendingLeave({ page_size: 1 }, seesAll && can(PERMS.hr.approveLeave))
  const types = useLeaveTypeOptions(false)
  const years = useFiscalYearOptions()
  const staff = useStaffOptions()
  const own = useOwnLeaveIds()
  const [recording, setRecording] = useState(false)
  const [acting, setActing] = useState<Decision | null>(null)
  const columns: Column<LeaveRequest>[] = [
    { id: 'who', header: 'Staff member', mobile: 'title', cell: (r) => (
      <span>
        <span className="font-medium">{r.staff_name}</span> <span className="font-mono text-xs text-muted-foreground">{r.employee_number}</span>
      </span>
    ) },
    { id: 'type', header: 'Leave', cell: (r) => (
      <span>
        {r.leave_type_name}
        {r.is_paid === false && <span className="ml-1 text-xs text-warning">unpaid</span>}
      </span>
    ) },
    { id: 'when', header: 'When', sortField: 'start_date', className: 'whitespace-nowrap tabular-nums', cell: (r) => leaveSpan(r) },
    { id: 'reason', header: 'Reason', mobile: 'hidden', className: 'max-w-xs truncate text-muted-foreground', cell: (r) => r.decision_note ? `${r.reason || '—'} · ${r.decision_note}` : r.reason || '—' },
    { id: 'status', header: 'Status', cell: (r) => <LeaveStatus status={r.status} /> },
  ]
  const count = waiting.data?.count ?? 0
  return (
    <>
      {seesAll && count > 0 && list.filters.status !== 'pending' && (
        <button type="button" onClick={() => list.setFilter('status', 'pending')} className="mb-4 flex w-full items-center gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-left text-sm">
          <CalendarPlus className="h-4 w-4" aria-hidden /> {pluralize(count, 'request')} waiting for a decision. <span className="font-medium underline">Show them</span>
        </button>
      )}
      <DataTable
        ariaLabel="Leave requests"
        columns={columns}
        query={seesAll ? all : pending}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder="Name or employee no.…"
        toolbar={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button onClick={() => setRecording(true)}>
              <CalendarPlus aria-hidden /> Record leave
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('LeaveStatusEnum'), hidden: !seesAll },
          { name: 'leave_type', label: 'Type', options: types.options },
          { name: 'fiscal_year', label: 'Fiscal year', options: years.options },
          { name: 'staff', label: 'Staff member', options: staff.data ?? [], hidden: !staff.canPick },
        ]}
        rowActions={(r) => (
          <div className="flex items-center gap-1">
            {r.status === 'pending' && !own.has(r.id) && can(PERMS.hr.approveLeave) && (
              <>
                <Button size="sm" variant="outline" className="h-7" aria-label={`Approve ${r.staff_name}`} onClick={() => setActing({ kind: 'approve', r })}>
                  <Check aria-hidden />
                </Button>
                <Button size="sm" variant="outline" className="h-7" aria-label={`Reject ${r.staff_name}`} onClick={() => setActing({ kind: 'reject', r })}>
                  <X aria-hidden />
                </Button>
              </>
            )}
            <RowActions actions={leaveActions(r, setActing, own)} />
          </div>
        )}
        empty={seesAll ? { title: 'No leave requests', description: 'Staff apply from their portal; HR can record leave here too.' } : { title: 'Nothing waiting', description: 'Leave requests for your branch show here until they’re decided.' }}
      />
      <RecordLeaveDialog open={recording} onOpenChange={setRecording} />
      <LeaveDecisionDialogs acting={acting} onDone={() => setActing(null)} />
    </>
  )
}

/** Remaining days, with what's pending shown beside it. */
function Available({ b }: { b: LeaveBalance }) {
  if (b.available == null) return <span className="text-muted-foreground">No limit</span>
  const left = Number(b.available)
  return (
    <span className={left <= 0 ? 'font-medium text-danger' : left <= 2 ? 'font-medium text-warning' : 'font-medium'}>
      {days(b.available)}
      {Number(b.pending) > 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">({days(b.pending)} pending)</span>}
    </span>
  )
}

/** Everyone's leave balances for a fiscal year; open a new year, adjust by hand. */
export function LeaveBalancesPage() {
  const list = useListState({ filters: ['fiscal_year', 'leave_type', 'staff'] })
  const years = useFiscalYearOptions()
  const year = list.filters.fiscal_year ?? (years.current ? String(years.current.id) : undefined)
  const query = useLeaveBalances({ ...list.query, fiscal_year: year }, !years.isPending)
  const types = useLeaveTypeOptions(false)
  const staff = useStaffOptions()
  const { isMultiBranch, branches, selectedBranchId } = useBranches()
  const openYear = useOpenBalances()
  const adjust = useAdjustBalance()
  const [opening, setOpening] = useState(false)
  const [adjusting, setAdjusting] = useState<LeaveBalance | null>(null)
  const columns: Column<LeaveBalance>[] = [
    { id: 'who', header: 'Staff member', mobile: 'title', cell: (b) => <span className="font-medium">{b.staff_name}</span> },
    { id: 'type', header: 'Leave', cell: (b) => b.leave_type_name },
    { id: 'entitled', header: 'Entitled', className: 'tabular-nums', cell: (b) => days(b.entitled) },
    { id: 'carried', header: 'Carried', mobile: 'hidden', className: 'tabular-nums', cell: (b) => (Number(b.carried_forward) ? days(b.carried_forward) : '—') },
    { id: 'adjusted', header: 'Adjusted', mobile: 'hidden', className: 'tabular-nums', cell: (b) => (Number(b.adjustment) ? `${Number(b.adjustment) > 0 ? '+' : ''}${days(b.adjustment)}` : '—') },
    { id: 'used', header: 'Used', className: 'tabular-nums', cell: (b) => days(b.used) },
    { id: 'left', header: 'Left', className: 'tabular-nums', cell: (b) => <Available b={b} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Leave balances"
        columns={columns}
        query={query}
        list={list}
        getRowId={(b) => b.id}
        searchable={false}
        toolbar={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button variant="outline" onClick={() => setOpening(true)} disabled={years.years.length === 0}>
              <FolderOpen aria-hidden /> Open a year
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'fiscal_year', label: 'Fiscal year', options: years.options },
          { name: 'leave_type', label: 'Type', options: types.options },
          { name: 'staff', label: 'Staff member', options: staff.data ?? [], hidden: !staff.canPick },
        ]}
        rowActions={(b) => <RowActions actions={[{ label: 'Adjust days', icon: SlidersHorizontal, permission: PERMS.hr.manage, onSelect: () => setAdjusting(b) }]} />}
        empty={{
          title: years.years.length === 0 ? 'No fiscal years yet' : 'No balances for this year',
          description: years.years.length === 0 ? 'Add a fiscal year and leave types under Setup, then open the year.' : 'Open the year to give everyone their entitlements and carry last year’s days forward. Balances also appear the first time someone applies.',
        }}
      />
      <FormDialog
        open={opening}
        onOpenChange={setOpening}
        title="Open a fiscal year"
        description="Gives every staff member each leave type’s entitlement (a share of it for those who joined mid-year) and carries unused days forward. Safe to run again: balances already open are left alone."
        submitLabel="Open"
        schema={z.object({ fiscal_year: z.string().min(1, 'Choose a year.'), campus: z.string() })}
        defaultValues={{ fiscal_year: year ?? '', campus: selectedBranchId ? String(selectedBranchId) : '' }}
        onSubmit={async (v) => {
          const r = await openYear.mutateAsync({ fiscal_year: Number(v.fiscal_year), campus: v.campus ? Number(v.campus) : null })
          toast.success(`${pluralize(r.created, 'balance')} opened${r.existing ? `; ${r.existing} already open` : ''}.`)
          list.setFilter('fiscal_year', v.fiscal_year)
        }}
      >
        {({ control, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Fiscal year" required error={errors.fiscal_year?.message}>
              {(p) => <Controller control={control} name="fiscal_year" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={years.options} />} />}
            </FormField>
            {isMultiBranch && (
              <FormField label="Branch">
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Every branch" options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
          </div>
        )}
      </FormDialog>
      <FormDialog
        open={adjusting !== null}
        onOpenChange={(o) => !o && setAdjusting(null)}
        title="Adjust leave days"
        description={adjusting ? `${adjusting.staff_name} · ${adjusting.leave_type_name}, ${adjusting.fiscal_year_name}. ${adjusting.available == null ? '' : `${days(adjusting.available)} days left now.`}` : ''}
        submitLabel="Adjust"
        schema={z.object({
          delta: z.string().trim().regex(/^[+-]?\d+(\.[05])?$/, 'Whole or half days, e.g. 2, -1 or 0.5.').refine((v) => Number(v) !== 0, 'Not zero.'),
          reason: z.string().trim().min(1, 'Say why; it goes in the audit log.').max(255),
        })}
        defaultValues={{ delta: '', reason: '' }}
        onSubmit={async (v) => {
          await adjust.mutateAsync({ id: adjusting!.id, delta: v.delta.replace('+', ''), reason: v.reason })
          toast.success('Balance adjusted.')
        }}
      >
        {({ register, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <FormField label="Days" required error={errors.delta?.message} description="Negative to take away.">
              <Input {...register('delta')} inputMode="decimal" placeholder="+2" />
            </FormField>
            <FormField label="Reason" required error={errors.reason?.message}>
              <Input {...register('reason')} maxLength={255} placeholder="Compensatory leave for exam duty" />
            </FormField>
          </div>
        )}
      </FormDialog>
    </>
  )
}
