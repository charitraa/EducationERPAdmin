import { Clock, Coffee, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { CardSkeleton, Spinner } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { isoDate, requiredId } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import { hhmm, type BellSchedule, type Period } from '../api/timetable.api'
import {
  useCreatePeriod,
  useCreateSchedule,
  useRemovePeriod,
  useRemoveSchedule,
  useRetime,
  useSchedulePeriods,
  useSchedules,
  useUpdatePeriod,
  useUpdateSchedule,
} from '../hooks/useTimetable'
import { tr } from '@/lib/i18n'

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, tr('Use HH:MM.'))

function ScheduleDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: BellSchedule | null }) {
  const create = useCreateSchedule()
  const update = useUpdateSchedule()
  const { isMultiBranch, branches, defaultBranchId } = useBranches()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit {name}', { name: record.name }) : tr('Add bell schedule')}
      description={tr('A set of periods with clock times, e.g. “Day shift”. Add a second one if part of the school keeps different hours.')}
      schema={z.object({ name: z.string().trim().min(1, tr('Required.')).max(100), campus: requiredId(tr('Choose a branch.')), is_active: z.boolean() })}
      defaultValues={{ name: record?.name ?? '', campus: record ? String(record.campus) : defaultBranchId ? String(defaultBranchId) : '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        const input = { name: v.name, campus: Number(v.campus), is_active: v.is_active }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Saved.') : tr('Bell schedule added. Now add its periods.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label={tr('Name')} required error={errors.name?.message}>
            <Input {...register('name')} autoFocus placeholder={tr('Day shift')} />
          </FormField>
          {isMultiBranch && (
            <FormField label={tr('Branch')} required error={errors.campus?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="campus"
                  render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} disabled={record != null} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
                />
              )}
            </FormField>
          )}
          {!isMultiBranch && errors.campus && <p className="text-sm text-danger">{errors.campus.message}</p>}
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('In use')}
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

const periodSchema = z
  .object({ name: z.string().trim().min(1, tr('Required.')).max(50), start_time: time, end_time: time, is_break: z.boolean() })
  .refine((v) => v.end_time > v.start_time, { path: ['end_time'], message: tr('Must be after the start.') })

function PeriodDialog({ schedule, record, open, onOpenChange }: { schedule: BellSchedule; record: Period | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreatePeriod()
  const update = useUpdatePeriod()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit {name}', { name: record.name }) : tr('Add a period to {name}', { name: schedule.name })}
      description={record ? tr('Times can’t change once lessons use this period; retime the schedule instead.') : undefined}
      schema={periodSchema}
      defaultValues={{ name: record?.name ?? '', start_time: hhmm(record?.start_time), end_time: hhmm(record?.end_time), is_break: record?.is_break ?? false }}
      onSubmit={async (v) => {
        const input = { schedule: schedule.id, ...v }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? tr('Period saved.') : tr('Period added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label={tr('Name')} required error={errors.name?.message}>
            <Input {...register('name')} autoFocus placeholder={tr('Period 1, Lunch…')} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={tr('Starts')} required error={errors.start_time?.message}>
              <Input {...register('start_time')} type="time" />
            </FormField>
            <FormField label={tr('Ends')} required error={errors.end_time?.message}>
              <Input {...register('end_time')} type="time" />
            </FormField>
          </div>
          <Controller
            control={control}
            name="is_break"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('A break (no lessons)')}
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

const retimeSchema = z.object({
  effective_from: isoDate,
  periods: z.array(z.object({ period: z.number(), name: z.string(), start_time: time, end_time: time })),
})

/** New bell times from a date (winter timings): lessons move with their periods; the past keeps the old times. */
function RetimeDialog({ schedule, periods, open, onOpenChange }: { schedule: BellSchedule; periods: Period[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  const retime = useRetime()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={tr('New bell times for {name}', { name: schedule.name })}
      description={tr('From the date you choose, these times apply and every lesson moves with its period. Days before keep the old times.')}
      submitLabel={tr('Apply new times')}
      schema={retimeSchema}
      defaultValues={{ effective_from: '', periods: periods.map((p) => ({ period: p.id, name: p.name, start_time: hhmm(p.start_time), end_time: hhmm(p.end_time) })) }}
      onSubmit={async (v) => {
        const changed = v.periods.filter((row) => {
          const p = periods.find((x) => x.id === row.period)
          return !p || hhmm(p.start_time) !== row.start_time || hhmm(p.end_time) !== row.end_time
        })
        if (changed.length === 0) throw new Error(tr('No times changed.'))
        await retime.mutateAsync({ id: schedule.id, effective_from: v.effective_from, periods: changed.map(({ period, start_time, end_time }) => ({ period, start_time, end_time })) })
        toast.success(tr('New times from {date}.', { date: formatDate(v.effective_from) }))
      }}
    >
      {(form) => <RetimeFields form={form} />}
    </FormDialog>
  )
}

function RetimeFields({ form }: { form: import('react-hook-form').UseFormReturn<z.infer<typeof retimeSchema>> }) {
  const { control, register, formState: { errors } } = form
  const { fields } = useFieldArray({ control, name: 'periods' })
  return (
    <>
      <FormField label={tr('From (AD)')} required error={errors.effective_from?.message} className="sm:max-w-xs">
        {(p) => <Controller control={control} name="effective_from" render={({ field }) => <DatePicker {...p} {...field} />} />}
      </FormField>
      <div className="grid gap-2">
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_7rem_7rem] items-center gap-2">
            <span className="text-sm">{f.name}</span>
            <Input {...register(`periods.${i}.start_time`)} type="time" aria-label={tr('{name} starts', { name: f.name })} />
            <Input {...register(`periods.${i}.end_time`)} type="time" aria-label={tr('{name} ends', { name: f.name })} />
          </div>
        ))}
      </div>
    </>
  )
}

function ScheduleCard({ schedule, onEdit, onDelete }: { schedule: BellSchedule; onEdit: () => void; onDelete: () => void }) {
  const periods = useSchedulePeriods(schedule.id)
  const { can } = usePermissions()
  const manage = can(PERMS.timetable.manage)
  const remove = useRemovePeriod()
  const { isMultiBranch } = useBranches()
  const [periodDialog, setPeriodDialog] = useState<Period | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Period | null>(null)
  const [retiming, setRetiming] = useState(false)

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="mr-auto">
          <h3 className="flex items-center gap-2 font-semibold">
            {schedule.name} {schedule.is_active === false && <StatusBadge status="inactive" />}
          </h3>
          {isMultiBranch && <p className="text-xs text-muted-foreground">{schedule.campus_name}</p>}
        </div>
        {manage && (
          <>
            <Button size="sm" variant="outline" onClick={() => setRetiming(true)} disabled={!periods.data?.length}>
              <Clock aria-hidden /> {tr('New times from a date')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPeriodDialog('new')}>
              <Plus aria-hidden /> {tr('Period')}
            </Button>
            <RowActions
              label={tr('Actions for {name}', { name: schedule.name })}
              actions={[
                { label: tr('Edit'), icon: Pencil, onSelect: onEdit },
                { label: tr('Delete'), icon: Trash2, destructive: true, onSelect: onDelete },
              ]}
            />
          </>
        )}
      </div>
      {periods.isPending ? (
        <div className="p-4">
          <Spinner />
        </div>
      ) : periods.isError ? (
        <ErrorState error={periods.error} onRetry={() => void periods.refetch()} />
      ) : periods.data.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{tr('No periods yet. Add Period 1, the breaks, and so on, in order.')}</p>
      ) : (
        <ol className="divide-y">
          {periods.data.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="w-28 tabular-nums text-muted-foreground">
                {hhmm(p.start_time)}–{hhmm(p.end_time)}
              </span>
              <span className={p.is_break ? 'flex flex-1 items-center gap-1.5 text-muted-foreground' : 'flex-1 font-medium'}>
                {p.is_break && <Coffee className="h-3.5 w-3.5" aria-hidden />}
                {p.name}
              </span>
              {(p.valid_from || p.valid_until) && (
                <span className="text-xs text-muted-foreground">
                  {p.valid_from ? tr('from {date}', { date: formatDate(p.valid_from) }) : ''}
                  {p.valid_from && p.valid_until ? ' ' : ''}
                  {p.valid_until ? tr('until {date}', { date: formatDate(p.valid_until) }) : ''}
                </span>
              )}
              {manage && (
                <RowActions
                  label={tr('Actions for {name}', { name: p.name })}
                  actions={[
                    { label: tr('Edit'), icon: Pencil, onSelect: () => setPeriodDialog(p) },
                    { label: tr('Delete'), icon: Trash2, destructive: true, onSelect: () => setDeleting(p) },
                  ]}
                />
              )}
            </li>
          ))}
        </ol>
      )}
      <PeriodDialog schedule={schedule} record={periodDialog === 'new' ? null : periodDialog} open={periodDialog !== null} onOpenChange={(o) => !o && setPeriodDialog(null)} />
      {periods.data && <RetimeDialog schedule={schedule} periods={periods.data.filter((p) => !p.valid_until)} open={retiming} onOpenChange={setRetiming} />}
      {deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          subject={deleting.name}
          description={tr('A period with lessons can’t be deleted.')}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id)
            toast.success(tr('Period deleted.'))
          }}
        />
      )}
    </section>
  )
}

export default function BellSchedulesPage() {
  const { selectedBranchId } = useBranches()
  const schedules = useSchedules({ page_size: 100, campus: selectedBranchId ?? undefined })
  const remove = useRemoveSchedule()
  const [editing, setEditing] = useState<BellSchedule | 'new' | null>(null)
  const [deleting, setDeleting] = useState<BellSchedule | null>(null)
  const add = (label: string) => (
    <PermissionGate permission={PERMS.timetable.manage}>
      <Button onClick={() => setEditing('new')}>
        <Plus aria-hidden /> {label}
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <SectionHeader title={tr('Bell schedules')} description={tr('The periods of the school day. Lessons are placed into these.')} action={add(tr('Add bell schedule'))} />
      {schedules.isPending ? (
        <CardSkeleton />
      ) : schedules.isError ? (
        <ErrorState error={schedules.error} onRetry={() => void schedules.refetch()} />
      ) : schedules.data.results.length === 0 ? (
        <EmptyState title={tr('No bell schedule yet')} description={tr('Start with one, e.g. “Day shift”, then add its periods and breaks.')} icon={Clock} action={add(tr('Add the first bell schedule'))} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {schedules.data.results.map((s) => (
            <ScheduleCard key={s.id} schedule={s} onEdit={() => setEditing(s)} onDelete={() => setDeleting(s)} />
          ))}
        </div>
      )}
      <ScheduleDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} record={editing === 'new' ? null : editing} />
      {deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          subject={tr('the bell schedule {name}', { name: deleting.name })}
          description={tr('Not possible while lessons use its periods; mark it not in use instead.')}
          onConfirm={async () => {
            await remove.mutateAsync(deleting.id)
            toast.success(tr('Bell schedule deleted.'))
          }}
        />
      )}
    </>
  )
}
