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

const VIEWS = [
  { value: 'summary', label: 'Summary' },
  { value: 'days', label: 'Days' },
  { value: 'punches', label: 'Check-ins' },
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
          <Label htmlFor={ids.from}>From (AD)</Label>
          <DatePicker id={ids.from} value={from} onChange={(v) => set('from', v)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={ids.to}>To (AD)</Label>
          <DatePicker id={ids.to} value={to} onChange={(v) => set('to', v)} />
        </div>
      </div>
      {!valid ? (
        <EmptyState title="Check the dates" />
      ) : report.isPending ? (
        <TableSkeleton rows={6} columns={8} />
      ) : report.isError ? (
        <ErrorState error={report.error} onRetry={() => void report.refetch()} />
      ) : report.data.staff.length === 0 ? (
        <EmptyState title="No staff" description="Nobody was on the staff in these dates." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm" aria-label="Staff attendance summary">
            <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Staff</th>
                <th className="px-3 py-2 text-right">Working days</th>
                <th className="px-3 py-2 text-right">Present</th>
                <th className="px-3 py-2 text-right">Late</th>
                <th className="px-3 py-2 text-right">Half day</th>
                <th className="px-3 py-2 text-right">Absent</th>
                <th className="px-3 py-2 text-right">Leave</th>
                <th className="px-3 py-2 text-right">On duty</th>
                <th className="px-3 py-2 text-right">Avg. day</th>
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
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">Absent includes working days up to today with no check-in and nothing set by hand.</p>
        </div>
      )}
    </>
  )
}

const daySchema = z.object({
  staff: z.string().min(1, 'Choose a staff member.'),
  date: isoDate,
  status: z.string().min(1, 'Choose a status.'),
  note: z.string().trim().min(1, 'Say why it’s set by hand.').max(255),
})

function SetDayDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const setDay = useSetStaffDay()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Set a day by hand"
      description="For leave, duty away from campus, or a forgotten check-in. The day then ignores check-ins until you clear it."
      submitLabel="Set day"
      schema={daySchema}
      defaultValues={{ staff: '', date: todayIso(), status: 'present', note: '' }}
      onSubmit={async (v) => {
        await setDay.mutateAsync({ staff: Number(v.staff), date: v.date, status: v.status as StaffDayStatus, note: v.note })
        toast.success('Day set.')
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          <FormField label="Staff member" required error={errors.staff?.message}>
            {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date (AD)" required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label="Status" required error={errors.status?.message}>
              {(p) => <Controller control={control} name="status" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('StaffDayStatusEnum')} />} />}
            </FormField>
          </div>
          <FormField label="Reason" required error={errors.note?.message}>
            <Input {...register('note')} maxLength={255} placeholder="Approved leave, exam duty at board office…" />
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
    { id: 'date', header: 'Date', className: 'whitespace-nowrap tabular-nums', cell: (d) => formatDate(d.date) },
    { id: 'staff', header: 'Staff', mobile: 'title', cell: (d) => <span className="font-medium">{d.staff_name}</span> },
    { id: 'status', header: 'Status', cell: (d) => <DayBadge status={d.status} /> },
    { id: 'in', header: 'In', className: 'tabular-nums', cell: (d) => timeOf(d.first_in) },
    { id: 'out', header: 'Out', className: 'tabular-nums', cell: (d) => timeOf(d.last_out) },
    { id: 'worked', header: 'Worked', className: 'tabular-nums', cell: (d) => minutes(d.worked_minutes) },
    { id: 'how', header: 'Source', mobile: 'hidden', cell: (d) => (d.is_override ? <span title={d.note}>By hand{d.note ? ` · ${d.note}` : ''}</span> : <span className="text-muted-foreground">Check-ins</span>) },
  ]

  return (
    <>
      <DataTable
        ariaLabel="Staff attendance days"
        columns={columns}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchable={false}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={dateId} className="text-muted-foreground">
              Date
            </Label>
            <DatePicker id={dateId} value={list.filters.date ?? ''} onChange={(v) => list.setFilter('date', v || undefined)} />
            <PermissionGate permission={PERMS.attendance.manage}>
              <Button onClick={() => setAdding(true)}>
                <Plus aria-hidden /> Set a day
              </Button>
            </PermissionGate>
          </div>
        }
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('StaffDayStatusEnum') },
          { name: 'is_override', label: 'Source', options: [{ value: 'true', label: 'Set by hand' }, { value: 'false', label: 'From check-ins' }] },
          { name: 'staff', label: 'Staff', hidden: !staff.canPick, options: staff.data ?? [] },
        ]}
        rowActions={(d) => <RowActions actions={[{ label: 'Clear (use check-ins)', icon: Undo2, permission: PERMS.attendance.manage, hidden: !d.is_override, onSelect: () => setClearing(d) }]} />}
        empty={{ title: 'No staff days yet', description: 'Days appear as staff check in at a device or by QR, or when the office sets one by hand.' }}
      />
      <SetDayDialog open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={clearing != null}
        onOpenChange={(o) => !o && setClearing(null)}
        title="Clear this day?"
        description={clearing ? `${clearing.staff_name}’s ${formatDate(clearing.date)} goes back to what their check-ins say (or nothing, if there are none).` : undefined}
        confirmLabel="Clear"
        onConfirm={async () => {
          await clear.mutateAsync(clearing!.id)
          toast.success('Cleared.')
        }}
      />
    </>
  )
}

const punchSchema = z.object({
  staff: z.string().min(1, 'Choose a staff member.'),
  date: isoDate,
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Give a time.'),
  direction: z.string(),
  note: z.string().trim().min(1, 'Say why it’s entered by hand.').max(255),
})

function PunchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const punch = useManualPunch()
  const now = new Date()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Enter a check-in by hand"
      description="When someone couldn’t use the device or QR. Their day is worked out again from all their check-ins."
      submitLabel="Enter"
      schema={punchSchema}
      defaultValues={{ staff: '', date: toIsoDate(now), time: splitLocal(now.toISOString()).time, direction: 'in', note: '' }}
      onSubmit={async (v) => {
        await punch.mutateAsync({ staff: Number(v.staff), punched_at: combineLocal(v.date, v.time), direction: v.direction as Punch['direction'], note: v.note })
        toast.success('Check-in entered.')
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          <FormField label="Staff member" required error={errors.staff?.message}>
            {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Date (AD)" required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label="Time" required error={errors.time?.message}>
              <Input type="time" {...register('time')} />
            </FormField>
            <FormField label="Direction" error={errors.direction?.message}>
              {(p) => <Controller control={control} name="direction" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('DirectionEnum')} />} />}
            </FormField>
          </div>
          <FormField label="Reason" required error={errors.note?.message}>
            <Input {...register('note')} maxLength={255} placeholder="Device was down, forgot ID card…" />
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
    { id: 'when', header: 'When', className: 'whitespace-nowrap tabular-nums', cell: (p) => formatDateTime(p.punched_at) },
    { id: 'who', header: 'Staff', mobile: 'title', cell: (p) => <span className="font-medium">{p.staff_name ?? (p.pin ? `Unknown PIN ${p.pin}` : '—')}</span> },
    { id: 'dir', header: 'Direction', cell: (p) => enumLabel('DirectionEnum', p.direction) },
    { id: 'source', header: 'Source', cell: (p) => enumLabel('AttendanceSourceEnum', p.source) },
    { id: 'note', header: 'Note', mobile: 'hidden', cell: (p) => p.note || p.verify || <span className="text-muted-foreground">—</span> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Check-ins"
        columns={columns}
        query={query}
        list={list}
        getRowId={(p) => p.id}
        searchable={false}
        toolbar={
          <PermissionGate permission={PERMS.attendance.manage}>
            <Button onClick={() => setAdding(true)}>
              <Clock aria-hidden /> Enter a check-in
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'source', label: 'Source', options: enumOptions('AttendanceSourceEnum') },
          { name: 'staff', label: 'Staff', hidden: !staff.canPick, options: staff.data ?? [] },
        ]}
        empty={{ title: 'No check-ins yet', description: 'Check-ins come from biometric devices, the staff QR code, or the office.' }}
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
      title={isMultiBranch && chosen ? `Staff check-in · ${branchName(chosen)}` : 'Staff check-in'}
      description="Staff scan this with their phone's camera when they arrive and leave. Each scan is a check-in; the day works out in and out from the first and last."
      path="/scan/staff"
      issue={issue}
      settings={
        isMultiBranch && (
          <FormField label="Branch" required>
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
        <div className="inline-flex rounded-md border p-0.5" role="tablist" aria-label="Staff attendance">
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
            <QrCode aria-hidden /> Check-in QR code
          </Button>
          <CheckInQr open={showingQr} onOpenChange={setShowingQr} />
        </PermissionGate>
      </div>
      {view === 'summary' ? <Summary /> : view === 'days' ? <Days /> : <Punches />}
    </>
  )
}
