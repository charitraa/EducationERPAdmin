import { Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { hhmm, WEEKDAYS } from '@/features/timetable/api/timetable.api'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { wholeNumber } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StaffWorkSchedule, WorkSchedule } from '../api/attendance.api'
import {
  useCreateStaffSchedule,
  useCreateWorkSchedule,
  useRemoveStaffSchedule,
  useRemoveWorkSchedule,
  useStaffSchedules,
  useUpdateWorkSchedule,
  useWorkSchedules,
} from '../hooks/useAttendance'
import { tr } from '@/lib/i18n'

const days = (w: unknown) => (Array.isArray(w) ? (w as number[]) : [])
const dayNames = (w: unknown) =>
  WEEKDAYS.filter((d) => days(w).includes(d.value))
    .map((d) => d.short)
    .join(' ')

const scheduleSchema = z
  .object({
    campus: z.string().min(1, tr('Choose a branch.')),
    name: z.string().trim().min(1, tr('Give it a name.')).max(100),
    start_time: z.string().regex(/^\d{2}:\d{2}/, tr('Give a time.')),
    end_time: z.string().regex(/^\d{2}:\d{2}/, tr('Give a time.')),
    grace_minutes: wholeNumber(),
    half_day_minutes: wholeNumber(),
    weekdays: z.array(z.number()).min(1, tr('Pick at least one working day.')),
    is_default: z.boolean(),
  })
  .refine((v) => v.end_time > v.start_time, { path: ['end_time'], message: tr('Must be after the start.') })

function ScheduleDialog({ open, record, onOpenChange }: { open: boolean; record: WorkSchedule | null; onOpenChange: (o: boolean) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const create = useCreateWorkSchedule()
  const update = useUpdateWorkSchedule()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit work schedule') : tr('New work schedule')}
      description={tr('When the working day starts and ends. Arriving after the grace period is late; working less than the half-day length is a half day.')}
      schema={scheduleSchema}
      defaultValues={{
        campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        name: record?.name ?? '',
        start_time: hhmm(record?.start_time) || '09:00',
        end_time: hhmm(record?.end_time) || '17:00',
        grace_minutes: String(record?.grace_minutes ?? 10),
        half_day_minutes: String(record?.half_day_minutes ?? 240),
        weekdays: record ? days(record.weekdays) : [7, 1, 2, 3, 4, 5],
        is_default: record?.is_default ?? false,
      }}
      onSubmit={async (v) => {
        const input = { ...v, campus: Number(v.campus), grace_minutes: Number(v.grace_minutes), half_day_minutes: Number(v.half_day_minutes) }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Schedule saved.') : tr('Schedule added.'))
      }}
    >
      {({ control, register, formState: { errors } }) => (
        <>
          {isMultiBranch && (
            <FormField label={tr('Branch')} required error={errors.campus?.message}>
              {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
            </FormField>
          )}
          <FormField label={tr('Name')} required error={errors.name?.message}>
            <Input {...register('name')} maxLength={100} placeholder={tr('Office hours, Morning shift…')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Starts')} required error={errors.start_time?.message}>
              <Input type="time" {...register('start_time')} />
            </FormField>
            <FormField label={tr('Ends')} required error={errors.end_time?.message}>
              <Input type="time" {...register('end_time')} />
            </FormField>
            <FormField label={tr('Grace (minutes)')} error={errors.grace_minutes?.message}>
              <Input inputMode="numeric" {...register('grace_minutes')} />
            </FormField>
            <FormField label={tr('Half day under (minutes)')} error={errors.half_day_minutes?.message}>
              <Input inputMode="numeric" {...register('half_day_minutes')} />
            </FormField>
          </div>
          <Controller
            control={control}
            name="weekdays"
            render={({ field }) => (
              <div className="grid gap-1.5">
                <p id="ws-days" className="text-sm font-medium">
                  {tr('Working days')}
                </p>
                <div role="group" aria-labelledby="ws-days" className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const on = field.value.includes(d.value)
                    return (
                      <button
                        key={d.value}
                        type="button"
                        aria-pressed={on}
                        onClick={() => field.onChange(on ? field.value.filter((x) => x !== d.value) : [...field.value, d.value])}
                        className={cn('rounded-md border px-3 py-1 text-sm', on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground')}
                      >
                        {d.short}
                      </button>
                    )
                  })}
                </div>
                {errors.weekdays && <p className="text-sm text-danger">{errors.weekdays.message}</p>}
              </div>
            )}
          />
          <Controller
            control={control}
            name="is_default"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('The branch’s default, for staff without their own schedule')}
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

const assignSchema = z.object({ staff: z.string().min(1, tr('Choose a staff member.')), schedule: z.string().min(1, tr('Choose a schedule.')) })

function AssignDialog({ open, onOpenChange, schedules }: { open: boolean; onOpenChange: (o: boolean) => void; schedules: WorkSchedule[] }) {
  const staff = useStaffOptions()
  const create = useCreateStaffSchedule()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Give someone their own schedule')}
      description={tr('Instead of their branch’s default. Each staff member has at most one.')}
      submitLabel={tr('Assign')}
      schema={assignSchema}
      defaultValues={{ staff: '', schedule: '' }}
      onSubmit={async (v) => {
        await create.mutateAsync({ staff: Number(v.staff), schedule: Number(v.schedule) })
        toast.success(tr('Schedule assigned.'))
      }}
    >
      {({ control, formState: { errors } }) => (
        <>
          <FormField label={tr('Staff member')} required error={errors.staff?.message}>
            {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
          </FormField>
          <FormField label={tr('Schedule')} required error={errors.schedule?.message}>
            {(p) => <Controller control={control} name="schedule" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={schedules.map((s) => ({ value: String(s.id), label: `${s.name} (${hhmm(s.start_time)}–${hhmm(s.end_time)})` }))} />} />}
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** Working hours per branch, and the staff who keep different hours. */
export default function WorkSchedulesPage() {
  const { isMultiBranch, branchName, selectedBranchId } = useBranches()
  const list = useListState({ filters: [] })
  const query = useWorkSchedules({ ...list.query, campus: selectedBranchId ?? undefined })
  const crud = useCrudState<WorkSchedule>()
  const remove = useRemoveWorkSchedule()
  const assigned = useStaffSchedules(PICKER_PARAMS)
  const allSchedules = useWorkSchedules(PICKER_PARAMS)
  const removeAssigned = useRemoveStaffSchedule()
  const [assigning, setAssigning] = useState(false)
  const [unassigning, setUnassigning] = useState<StaffWorkSchedule | null>(null)
  const scheduleName = (id: number) => allSchedules.data?.results.find((s) => s.id === id)?.name ?? ''

  const columns: Column<WorkSchedule>[] = [
    { id: 'name', header: tr('Schedule'), mobile: 'title', cell: (s) => <span className="font-medium">{s.name}</span> },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (s) => branchName(s.campus) },
    { id: 'hours', header: tr('Hours'), className: 'tabular-nums', cell: (s) => `${hhmm(s.start_time)}–${hhmm(s.end_time)}` },
    { id: 'days', header: tr('Days'), cell: (s) => dayNames(s.weekdays) },
    { id: 'grace', header: tr('Late after'), className: 'tabular-nums', mobile: 'hidden', cell: (s) => tr('{grace_minutes} min', { grace_minutes: s.grace_minutes ?? 10 }) },
    { id: 'default', header: '', cell: (s) => (s.is_default ? <StatusBadge status="current" label={tr('Default')} /> : null) },
  ]

  return (
    <div className="grid gap-8">
      <section>
        <SectionHeader
          title={tr('Work schedules')}
          description={tr('Staff days are worked out against these: late, half day, and which days count as working days.')}
          action={
            <PermissionGate permission={PERMS.attendance.manage}>
              <Button onClick={crud.openCreate}>
                <Plus aria-hidden /> {tr('Add schedule')}
              </Button>
            </PermissionGate>
          }
        />
        <DataTable
          ariaLabel={tr('Work schedules')}
          columns={columns}
          query={query}
          list={list}
          getRowId={(s) => s.id}
          searchable={false}
          rowActions={(s) => (
            <RowActions
              actions={[
                { label: tr('Edit'), icon: Pencil, permission: PERMS.attendance.manage, onSelect: () => crud.openEdit(s) },
                { label: tr('Delete'), icon: Trash2, permission: PERMS.attendance.manage, destructive: true, onSelect: () => crud.openDelete(s) },
              ]}
            />
          )}
          empty={{ title: tr('No work schedules yet'), description: tr('Without one, staff check-ins are recorded but nobody is ever late or absent. Add a default for each branch.') }}
        />
      </section>
      <section>
        <SectionHeader
          title={tr('Staff on their own schedule')}
          action={
            <PermissionGate permission={PERMS.attendance.manage}>
              <Button variant="outline" onClick={() => setAssigning(true)} disabled={!allSchedules.data?.results.length}>
                <UserPlus aria-hidden /> {tr('Assign')}
              </Button>
            </PermissionGate>
          }
        />
        {assigned.isPending ? (
          <TableSkeleton rows={2} columns={2} />
        ) : assigned.isError ? (
          <ErrorState error={assigned.error} onRetry={() => void assigned.refetch()} />
        ) : assigned.data.results.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('Everyone follows their branch’s default.')}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {assigned.data.results.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 font-medium">{a.staff_name}</span>
                <span className="text-sm text-muted-foreground">{scheduleName(a.schedule)}</span>
                <RowActions actions={[{ label: tr('Remove'), icon: Trash2, permission: PERMS.attendance.manage, destructive: true, onSelect: () => setUnassigning(a) }]} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <ScheduleDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <AssignDialog open={assigning} onOpenChange={setAssigning} schedules={allSchedules.data?.results ?? []} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('the schedule “{name}”', { name: crud.deleting.name })}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Schedule deleted.'))
          }}
        />
      )}
      <DeleteDialog
        open={unassigning != null}
        onOpenChange={(o) => !o && setUnassigning(null)}
        subject={tr('this assignment')}
        confirmLabel={tr('Remove')}
        description={unassigning ? tr('{staff_name} goes back to their branch’s default schedule.', { staff_name: unassigning.staff_name }) : undefined}
        onConfirm={async () => {
          await removeAssigned.mutateAsync(unassigning!.id)
          toast.success(tr('Removed.'))
        }}
      />
    </div>
  )
}
