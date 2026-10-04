import { Ban, CheckCircle2, Play } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Money, moneyInput } from '@/features/finance/components/money'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { AssetAssignment, AssetCondition, Maintenance } from '../api/inventory.api'
import { useAssignments, useCancelMaintenance, useCompleteMaintenance, useMaintenance, useStartMaintenance } from '../hooks/useInventory'
import { MaintenanceStatus } from './AssetsPage'

/** Every hand-over of an asset, current and past. */
export function AssignmentsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: [] })
  const query = useAssignments(list.query)
  const columns: Column<AssetAssignment>[] = [
    { id: 'tag', header: 'Asset', cell: (a) => (
      <span>
        {a.asset_name} <span className="font-mono text-xs text-muted-foreground">{a.asset_tag}</span>
      </span>
    ) },
    { id: 'holder', header: 'Held by', mobile: 'title', cell: (a) => <span className="font-medium">{a.holder_name}</span> },
    { id: 'from', header: 'From', className: 'tabular-nums', cell: (a) => formatDate(a.assigned_on) },
    { id: 'to', header: 'Until', className: 'tabular-nums', cell: (a) => (a.returned_on ? formatDate(a.returned_on) : <span className="font-medium text-info">Still has it</span>) },
    { id: 'note', header: 'Note', mobile: 'hidden', cell: (a) => a.note || '—' },
  ]
  return (
    <DataTable
      ariaLabel="Asset assignments"
      columns={columns}
      query={query}
      list={list}
      getRowId={(a) => a.id}
      searchable={false}
      onRowClick={(a) => navigate(`/inventory/assets/${a.asset}`)}
      empty={{ title: 'Nothing assigned yet', description: 'Assign an asset from its page.' }}
    />
  )
}

/** Repairs, services and inspections: start, complete or cancel. */
export function MaintenancePage() {
  const list = useListState({ filters: ['status', 'kind'] })
  const query = useMaintenance(list.query)
  const start = useStartMaintenance()
  const complete = useCompleteMaintenance()
  const cancel = useCancelMaintenance()
  const [starting, setStarting] = useState<Maintenance | null>(null)
  const [completing, setCompleting] = useState<Maintenance | null>(null)
  const [cancelling, setCancelling] = useState<Maintenance | null>(null)
  const columns: Column<Maintenance>[] = [
    {
      id: 'asset',
      header: 'Asset',
      className: 'font-mono text-xs',
      cell: (m) => (
        <Link to={`/inventory/assets/${m.asset}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
          {m.asset_tag}
        </Link>
      ),
    },
    { id: 'work', header: 'Work', mobile: 'title', cell: (m) => <span className="font-medium">{`${enumLabel('AssetMaintenanceKindEnum', m.kind)}: ${m.description}`}</span> },
    { id: 'when', header: 'Scheduled', className: 'tabular-nums', cell: (m) => formatDate(m.scheduled_on) },
    { id: 'done', header: 'Done', mobile: 'hidden', className: 'tabular-nums', cell: (m) => formatDate(m.completed_on) },
    { id: 'cost', header: 'Cost', className: 'text-right', cell: (m) => (m.cost ? <Money value={m.cost} /> : '—') },
    { id: 'status', header: 'Status', cell: (m) => <MaintenanceStatus status={m.status} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Maintenance"
        columns={columns}
        query={query}
        list={list}
        getRowId={(m) => m.id}
        searchable={false}
        filters={[
          { name: 'status', label: 'Status', options: enumOptions('MaintenanceStatusEnum') },
          { name: 'kind', label: 'Kind', options: enumOptions('AssetMaintenanceKindEnum') },
        ]}
        rowActions={(m) => (
          <RowActions
            actions={[
              { label: 'Start', icon: Play, permission: PERMS.inventory.manage, hidden: m.status !== 'scheduled', onSelect: () => setStarting(m) },
              { label: 'Complete', icon: CheckCircle2, permission: PERMS.inventory.manage, hidden: m.status !== 'in_progress', onSelect: () => setCompleting(m) },
              { label: 'Cancel', icon: Ban, permission: PERMS.inventory.manage, hidden: m.status === 'completed' || m.status === 'cancelled', destructive: true, onSelect: () => setCancelling(m) },
            ]}
          />
        )}
        empty={{ title: 'No maintenance yet', description: 'Schedule it from an asset’s page.' }}
      />
      <ConfirmDialog
        open={starting != null}
        onOpenChange={(o) => !o && setStarting(null)}
        title={starting ? `Start work on ${starting.asset_tag}?` : ''}
        description="The asset is marked under maintenance until the job is completed."
        confirmLabel="Start"
        onConfirm={async () => {
          await start.mutateAsync(starting!.id)
          toast.success('Started.')
        }}
      />
      <FormDialog
        open={completing != null}
        onOpenChange={(o) => !o && setCompleting(null)}
        title={completing ? `Complete work on ${completing.asset_tag}` : ''}
        description="The asset goes back to its store."
        submitLabel="Complete"
        schema={z.object({ cost: z.union([z.literal(''), moneyInput]), outcome: z.string().max(255), condition: z.string() })}
        defaultValues={{ cost: '', outcome: '', condition: '' }}
        onSubmit={async (v) => {
          await complete.mutateAsync({ id: completing!.id, cost: v.cost || null, outcome: v.outcome, condition: v.condition as AssetCondition | '' })
          toast.success('Completed.')
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Cost" error={errors.cost?.message}>
                <Input {...register('cost')} inputMode="decimal" />
              </FormField>
              <FormField label="Condition now">
                {(p) => <Controller control={control} name="condition" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Unchanged" options={enumOptions('ConditionEnum')} />} />}
              </FormField>
            </div>
            <FormField label="Outcome" error={errors.outcome?.message}>
              <Input {...register('outcome')} maxLength={255} placeholder="Screen replaced, working" />
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={cancelling != null}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this job?"
        submitLabel="Cancel job"
        schema={z.object({ reason: z.string().trim().min(1, 'Say why.').max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await cancel.mutateAsync({ id: cancelling!.id, reason: v.reason })
          toast.success('Cancelled.')
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label="Reason" required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} />
          </FormField>
        )}
      </FormDialog>
    </>
  )
}
