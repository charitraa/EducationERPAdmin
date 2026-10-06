import { CheckCircle2, MessageSquarePlus, UserCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Complaint } from '../api/hostel.api'
import { useAssignComplaint, useBuildingOptions, useComplaints, useRecordComplaint, useRejectComplaint, useResolveComplaint, useRooms } from '../hooks/useHostel'
import { tr } from '@/lib/i18n'

const TONE: Record<string, StatusTone> = { open: 'warning', in_progress: 'info', resolved: 'success', rejected: 'muted' }

function RecordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const record = useRecordComplaint()
  const buildings = useBuildingOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Record a complaint')}
      description={tr('For a resident who told the office in person. Residents can also raise their own.')}
      submitLabel={tr('Record')}
      schema={z.object({ building: z.string().min(1, tr('Choose a building.')), room: z.string(), category: z.string(), title: z.string().trim().min(1, tr('Say what’s wrong.')).max(200), description: z.string() })}
      defaultValues={{ building: '', room: '', category: 'maintenance', title: '', description: '' }}
      onSubmit={async (v) => {
        await record.mutateAsync({ building: Number(v.building), ...(v.room ? { room: Number(v.room) } : {}), category: v.category, title: v.title, description: v.description })
        toast.success(tr('Complaint recorded.'))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('Building')} required error={errors.building?.message}>
              {(p) => <Controller control={control} name="building" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={buildings} />} />}
            </FormField>
            <FormField label={tr('Room')}>
              {(p) => <Controller control={control} name="room" render={({ field }) => <RoomSelect {...p} building={watch('building')} value={field.value} onChange={field.onChange} />} />}
            </FormField>
            <FormField label={tr('About')}>
              {(p) => <Controller control={control} name="category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ComplaintCategoryEnum')} />} />}
            </FormField>
          </div>
          <FormField label={tr('What’s wrong')} required error={errors.title?.message}>
            <Input {...register('title')} maxLength={200} placeholder={tr('Tap leaking in the bathroom')} />
          </FormField>
          <FormField label={tr('Details')}>
            <Textarea {...register('description')} rows={3} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

function RoomSelect({ building, value, onChange, ...p }: { building: string; value: string; onChange: (v: string) => void; id?: string }) {
  const rooms = useRooms({ ...PICKER_PARAMS, building: building || undefined }, { enabled: Boolean(building) })
  return <SelectControl {...p} value={value} onChange={onChange} allowEmpty emptyLabel={tr('The whole building')} disabled={!building} options={(rooms.data?.results ?? []).map((r) => ({ value: String(r.id), label: tr('Room {number}', { number: r.number }) }))} />
}

/** Residents' complaints: hand to someone, resolve or reject. */
export default function ComplaintsPage() {
  const list = useListState({ filters: ['status', 'category', 'building'] })
  const query = useComplaints(list.query)
  const buildings = useBuildingOptions()
  const staff = useStaffOptions()
  const assign = useAssignComplaint()
  const resolve = useResolveComplaint()
  const reject = useRejectComplaint()
  const [recording, setRecording] = useState(false)
  const [acting, setActing] = useState<{ kind: 'assign' | 'resolve' | 'reject'; c: Complaint } | null>(null)
  const columns: Column<Complaint>[] = [
    { id: 'title', header: tr('Complaint'), mobile: 'title', cell: (c) => <span className="font-medium">{c.title}</span> },
    { id: 'where', header: tr('Where'), cell: (c) => `${c.building_name}${c.room_number ? ` ${c.room_number}` : ''}` },
    { id: 'about', header: tr('About'), cell: (c) => enumLabel('ComplaintCategoryEnum', c.category) },
    { id: 'with', header: tr('With'), cell: (c) => c.assigned_to_name ?? '—' },
    { id: 'raised', header: tr('Raised'), mobile: 'hidden', className: 'whitespace-nowrap tabular-nums', cell: (c) => formatDateTime(c.created_at) },
    { id: 'status', header: tr('Status'), cell: (c) => <StatusBadge status={c.status === 'resolved' ? 'resolved' : c.status === 'rejected' ? 'rejected' : c.status} tone={TONE[c.status]} label={enumLabel('ComplaintStatusEnum', c.status)} /> },
  ]
  const done = (c: Complaint) => c.status === 'resolved' || c.status === 'rejected'
  return (
    <>
      <DataTable
        ariaLabel={tr('Hostel complaints')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(c) => c.id}
        searchPlaceholder={tr('Search complaints…')}
        create={
          <PermissionGate permission={PERMS.hostel.manage}>
            <Button onClick={() => setRecording(true)}>
              <MessageSquarePlus aria-hidden /> {tr('Record complaint')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('ComplaintStatusEnum') },
          { name: 'category', label: tr('About'), options: enumOptions('ComplaintCategoryEnum') },
          { name: 'building', label: tr('Building'), options: buildings },
        ]}
        rowActions={(c) => (
          <RowActions
            actions={[
              { label: c.assigned_to ? tr('Reassign') : tr('Assign'), icon: UserCheck, permission: PERMS.hostel.manage, hidden: done(c), onSelect: () => setActing({ kind: 'assign', c }) },
              { label: tr('Resolve'), icon: CheckCircle2, permission: PERMS.hostel.manage, hidden: done(c), onSelect: () => setActing({ kind: 'resolve', c }) },
              { label: tr('Reject'), icon: XCircle, permission: PERMS.hostel.manage, hidden: done(c), destructive: true, onSelect: () => setActing({ kind: 'reject', c }) },
            ]}
          />
        )}
        empty={{ title: tr('No complaints'), description: tr('Residents raise them from their portal; the office can record one too.') }}
      />
      <RecordDialog open={recording} onOpenChange={setRecording} />
      <FormDialog
        open={acting?.kind === 'assign'}
        onOpenChange={(o) => !o && setActing(null)}
        title={tr('Hand to a staff member')}
        submitLabel={tr('Assign')}
        schema={z.object({ staff: z.string().min(1, tr('Choose someone.')) })}
        defaultValues={{ staff: acting?.c.assigned_to ? String(acting.c.assigned_to) : '' }}
        onSubmit={async (v) => {
          await assign.mutateAsync({ id: acting!.c.id, staff: Number(v.staff) })
          toast.success(tr('Assigned.'))
        }}
      >
        {({ control, formState: { errors } }) => (
          <FormField label={tr('Staff member')} required error={errors.staff?.message}>
            {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} />} />}
          </FormField>
        )}
      </FormDialog>
      <FormDialog
        open={acting?.kind === 'resolve' || acting?.kind === 'reject'}
        onOpenChange={(o) => !o && setActing(null)}
        title={acting?.kind === 'reject' ? tr('Reject this complaint?') : tr('Resolve this complaint')}
        submitLabel={acting?.kind === 'reject' ? tr('Reject') : tr('Resolve')}
        schema={z.object({ text: z.string().trim().min(1, tr('Say what was done.')).max(1000) })}
        defaultValues={{ text: '' }}
        onSubmit={async (v) => {
          if (acting!.kind === 'reject') await reject.mutateAsync({ id: acting!.c.id, reason: v.text.slice(0, 255) })
          else await resolve.mutateAsync({ id: acting!.c.id, resolution: v.text })
          toast.success(acting!.kind === 'reject' ? tr('Rejected.') : tr('Resolved.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={acting?.kind === 'reject' ? tr('Why') : tr('What was done')} required error={errors.text?.message}>
            <Textarea {...register('text')} rows={3} />
          </FormField>
        )}
      </FormDialog>
    </>
  )
}
