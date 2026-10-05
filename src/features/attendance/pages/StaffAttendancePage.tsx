import { Clock, Plus, QrCode, Undo2 } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { Controller } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { combineLocal, formatDate, formatDateTime, parseIsoDate, splitLocal, toIsoDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { isoDate } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import { punchesApi, type Punch, type QrOptions, type StaffDay, type StaffDayStatus } from '../api/attendance.api'
import { QrPresenter } from '../components/QrPresenter'
import { useClearStaffDay, useManualPunch, usePunches, useSetStaffDay, useStaffDays, useStaffReport } from '../hooks/useAttendance'
import { tr } from '@/lib/i18n'

const VIEWS = [
  { value: 'summary', label: tr('Summary') },
  { value: 'days', label: tr('Days') },
  { value: 'punches', label: tr('Check-ins') },
] as const

const DAY_TONE: Record<StaffDayStatus, StatusTone> = { present: 'success', late: 'warning', half_day: 'warning', absent: 'danger', leave: 'muted', on_duty: 'info' }

function DayBadge({ status }: { status: StaffDayStatus }) {
  return <StatusBadge status={status} tone={DAY_TONE[status]} label={enumLabel('StaffDayStatusEnum', status)} />
}

const minutes = (m: number | null) => (m == null ? '—' : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`)
const timeOf = (iso: string | null) => (iso ? splitLocal(iso).time : '—')

function Summary() {
  const { selectedBranchId } = useBranches()
  const [params, setParams] = useSearchParams()
  const ids = { from: useId(), to: useId() }
  const to = params.get('to') || todayIso()
  const from = params.get('from') || `${to.slice(0, 8)}01`
  const set = (k: string, v: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (v) next.set(k, v)
        else next.delete(k)
        return next
      },
      { replace: true },
    )
  const valid = parseIsoDate(from) != null && parseIsoDate(to) != null && from <= to
  const report = useStaffReport({ from, to, campus: selectedBranchId ?? undefined })
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={ids.from}>{tr('From (AD)')}</Label>
          <DatePicker id={ids.from} value={from} onChange={(v) => set('from', v)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={ids.to}>{tr('To (AD)')}</Label>
          <DatePicker id={ids.to} value={to} onChange={(v) => set('to', v)} />
        </div>
      </div>
      {!valid ? (
        <EmptyState title={tr('Check the dates')} />
      ) : report.isPending ? (
        <TableSkeleton rows={6} columns={8} />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : report.data.staff.length === 0 ? (
        <EmptyState title={tr('No staff')} description={tr('Nobody was on the staff in these dates.')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm" aria-label={tr('Staff attendance summary')}>
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{tr('Staff')}</th>
                <th className="px-3 py-2 text-right">{tr('Working days')}</th>
                <th className="px-3 py-2 text-right">{tr('Present')}</th>
                <th className="px-3 py-2 text-right">{tr('Late')}</th>
                <th className="px-3 py-2 text-right">{tr('Half day')}</th>
                <th className="px-3 py-2 text-right">{tr('Absent')}</th>
                <th className="px-3 py-2 text-right">{tr('Leave')}</th>
                <th className="px-3 py-2 text-right">{tr('On duty')}</th>
                <th className="px-3 py-2 text-right">{tr('Avg. day')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {report.data.staff.map((s) => (
                <tr key={s.staff}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{s.staff_name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{s.employee_number}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.working_days}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.present}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.late}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.half_day}</td>
                  <td className={cn('px-3 py-2 text-right tabular-nums', s.absent > 0 && 'font-medium text-danger')}>{s.absent}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.leave}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.on_duty}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{minutes(s.average_worked_minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">{tr('Absent includes working days up to today with no check-in and nothing set by hand.')}</p>
        </div>
      )}
    </>
  )
}

const daySchema = z.object({
  staff: z.string().min(1, tr('Choose a staff member.')),
  date: isoDate,
  status: z.string().min(1, tr('Choose a status.')),
  note: z.string().trim().min(1, tr('Say why it’s set by hand.')).max(255),
})

function SetDayDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const setDay = useSetStaffDay()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Set a day by hand')}
      description={tr('For leave, duty away from campus, or a forgotten check-in. The day then ignores check-ins until you clear it.')}
      submitLabel={tr('Set day')}
      schema={daySchema}
      defaultValues={{ staff: '', date: todayIso(), status: 'present', note: '' }}
      onSubmit={async (v) => {
        await setDay.mutateAsync({ staff: Number(v.staff), date: v.date, status: v.status as StaffDayStatus, note: v.note })
        toast.success(tr('Day set.'))
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          <FormField label={tr('Staff member')} required error={errors.staff?.message}>
            {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Date (AD)')} required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label={tr('Status')} required error={errors.status?.message}>
              {(p) => <Controller control={control} name="status" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('StaffDayStatusEnum')} />} />}
            </FormField>
          </div>
          <FormField label={tr('Reason')} required error={errors.note?.message}>
            <Input {...register('note')} maxLength={255} placeholder={tr('Approved leave, exam duty at board office…')} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

function Days() {
  const list = useListState({ filters: ['date', 'status', 'is_override', 'staff'], defaultOrdering: '' })
  const query = useStaffDays(list.query)
  const staff = useStaffOptions()
  const clear = useClearStaffDay()
  const [adding, setAdding] = useState(false)
  const [clearing, setClearing] = useState<StaffDay | null>(null)
  const dateId = useId()

  const columns: Column<StaffDay>[] = [
    { id: 'date', header: tr('Date'), className: 'whitespace-nowrap tabular-nums', cell: (d) => formatDate(d.date) },
    { id: 'staff', header: tr('Staff'), mobile: 'title', cell: (d) => <span className="font-medium">{d.staff_name}</span> },
    { id: 'status', header: tr('Status'), cell: (d) => <DayBadge status={d.status} /> },
    { id: 'in', header: tr('In'), className: 'tabular-nums', cell: (d) => timeOf(d.first_in) },
    { id: 'out', header: tr('Out'), className: 'tabular-nums', cell: (d) => timeOf(d.last_out) },
    { id: 'worked', header: tr('Worked'), className: 'tabular-nums', cell: (d) => minutes(d.worked_minutes) },
    { id: 'how', header: tr('Source'), mobile: 'hidden', cell: (d) => (d.is_override ? <span title={d.note}>{tr('By hand{value}', { value: d.note ? ` · ${d.note}` : '' })}</span> : <span className="text-muted-foreground">{tr('Check-ins')}</span>) },
  ]

  return (
    <>
      <DataTable
        ariaLabel={tr('Staff attendance days')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchable={false}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={dateId} className="text-muted-foreground">
              {tr('Date')}
            </Label>
            <DatePicker id={dateId} value={list.filters.date ?? ''} onChange={(v) => list.setFilter('date', v || undefined)} />
            <PermissionGate permission={PERMS.attendance.manage}>
              <Button onClick={() => setAdding(true)}>
                <Plus aria-hidden /> {tr('Set a day')}
              </Button>
            </PermissionGate>
          </div>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('StaffDayStatusEnum') },
          { name: 'is_override', label: tr('Source'), options: [{ value: 'true', label: tr('Set by hand') }, { value: 'false', label: tr('From check-ins') }] },
          { name: 'staff', label: tr('Staff'), hidden: !staff.canPick, options: staff.data ?? [] },
        ]}
        rowActions={(d) => <RowActions actions={[{ label: tr('Clear (use check-ins)'), icon: Undo2, permission: PERMS.attendance.manage, hidden: !d.is_override, onSelect: () => setClearing(d) }]} />}
        empty={{ title: tr('No staff days yet'), description: tr('Days appear as staff check in at a device or by QR, or when the office sets one by hand.') }}
      />
      <SetDayDialog open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={clearing != null}
        onOpenChange={(o) => !o && setClearing(null)}
        title={tr('Clear this day?')}
        description={clearing ? tr('{staff_name}’s {date} goes back to what their check-ins say (or nothing, if there are none).', { staff_name: clearing.staff_name, date: formatDate(clearing.date) }) : undefined}
        confirmLabel={tr('Clear')}
        onConfirm={async () => {
          await clear.mutateAsync(clearing!.id)
          toast.success(tr('Cleared.'))
        }}
      />
    </>
  )
}

const punchSchema = z.object({
  staff: z.string().min(1, tr('Choose a staff member.')),
  date: isoDate,
  time: z.string().regex(/^\d{2}:\d{2}$/, tr('Give a time.')),
  direction: z.string(),
  note: z.string().trim().min(1, tr('Say why it’s entered by hand.')).max(255),
})

function PunchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const punch = useManualPunch()
  const now = new Date()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Enter a check-in by hand')}
      description={tr('When someone couldn’t use the device or QR. Their day is worked out again from all their check-ins.')}
      submitLabel={tr('Enter')}
      schema={punchSchema}
      defaultValues={{ staff: '', date: toIsoDate(now), time: splitLocal(now.toISOString()).time, direction: 'in', note: '' }}
      onSubmit={async (v) => {
        await punch.mutateAsync({ staff: Number(v.staff), punched_at: combineLocal(v.date, v.time), direction: v.direction as Punch['direction'], note: v.note })
        toast.success(tr('Check-in entered.'))
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          <FormField label={tr('Staff member')} required error={errors.staff?.message}>
            {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('Date (AD)')} required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label={tr('Time')} required error={errors.time?.message}>
              <Input type="time" {...register('time')} />
            </FormField>
            <FormField label={tr('Direction')} error={errors.direction?.message}>
              {(p) => <Controller control={control} name="direction" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('DirectionEnum')} />} />}
            </FormField>
          </div>
          <FormField label={tr('Reason')} required error={errors.note?.message}>
            <Input {...register('note')} maxLength={255} placeholder={tr('Device was down, forgot ID card…')} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

function Punches() {
  const list = useListState({ filters: ['source', 'staff'] })
  const query = usePunches(list.query)
  const staff = useStaffOptions()
  const [adding, setAdding] = useState(false)
  const columns: Column<Punch>[] = [
    { id: 'when', header: tr('When'), className: 'whitespace-nowrap tabular-nums', cell: (p) => formatDateTime(p.punched_at) },
    { id: 'who', header: tr('Staff'), mobile: 'title', cell: (p) => <span className="font-medium">{p.staff_name ?? (p.pin ? tr('Unknown PIN {pin}', { pin: p.pin }) : '—')}</span> },
    { id: 'dir', header: tr('Direction'), cell: (p) => enumLabel('DirectionEnum', p.direction) },
    { id: 'source', header: tr('Source'), cell: (p) => enumLabel('AttendanceSourceEnum', p.source) },
    { id: 'note', header: tr('Note'), mobile: 'hidden', cell: (p) => p.note || p.verify || <span className="text-muted-foreground">—</span> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Check-ins')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(p) => p.id}
        searchable={false}
        toolbar={
          <PermissionGate permission={PERMS.attendance.manage}>
            <Button onClick={() => setAdding(true)}>
              <Clock aria-hidden /> {tr('Enter a check-in')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'source', label: tr('Source'), options: enumOptions('AttendanceSourceEnum') },
          { name: 'staff', label: tr('Staff'), hidden: !staff.canPick, options: staff.data ?? [] },
        ]}
        empty={{ title: tr('No check-ins yet'), description: tr('Check-ins come from biometric devices, the staff QR code, or the office.') }}
      />
      <PunchDialog open={adding} onOpenChange={setAdding} />
    </>
  )
}

/** The code staff scan at the gate or staff room to check in and out. */
function CheckInQr({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { branches, isMultiBranch, defaultBranchId, selectedBranchId, branchName } = useBranches()
  const [campus, setCampus] = useState('')
  const chosen = campus ? Number(campus) : (selectedBranchId ?? defaultBranchId)
  const issue = useCallback((options: QrOptions) => punchesApi.qr({ ...options, campus: chosen! }), [chosen])
  return (
    <QrPresenter
      open={open}
      onOpenChange={onOpenChange}
      title={isMultiBranch && chosen ? tr('Staff check-in · {branchName}', { branchName: branchName(chosen) }) : tr('Staff check-in')}
      description={tr("Staff scan this with their phone's camera when they arrive and leave. Each scan is a check-in; the day works out in and out from the first and last.")}
      path="/scan/staff"
      issue={issue}
      settings={
        isMultiBranch && (
          <FormField label={tr('Branch')} required>
            {(p) => <SelectControl {...p} value={chosen ? String(chosen) : ''} onChange={setCampus} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
          </FormField>
        )
      }
    />
  )
}

/** Staff attendance: the period summary, each day, and the raw check-ins behind them. */
export default function StaffAttendancePage() {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((v) => v.value === params.get('view'))?.value ?? 'summary'
  const [showingQr, setShowingQr] = useState(false)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border p-0.5" role="tablist" aria-label={tr('Staff attendance')}>
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => setParams(v.value === 'summary' ? {} : { view: v.value }, { replace: true })}
              className={cn('rounded px-3 py-1.5 text-sm', view === v.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {v.label}
            </button>
          ))}
        </div>
        <PermissionGate permission={PERMS.attendance.manage}>
          <Button variant="outline" onClick={() => setShowingQr(true)}>
            <QrCode aria-hidden /> {tr('Check-in QR code')}
          </Button>
          <CheckInQr open={showingQr} onOpenChange={setShowingQr} />
        </PermissionGate>
      </div>
      {view === 'summary' ? <Summary /> : view === 'days' ? <Days /> : <Punches />}
    </>
  )
}
