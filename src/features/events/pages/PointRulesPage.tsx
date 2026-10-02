import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { toNullableInt } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Schema } from '@/shared/types/api'
import type { PointRule, PointRuleInput } from '../api/events.api'
import { useCategoryOptions, useCreatePointRule, usePointRules, useRemovePointRule, useUpdatePointRule } from '../hooks/useEvents'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Required.').max(200),
    source: z.enum(['attendance', 'participation', 'manual']),
    role: z.string(),
    category: z.string(),
    points: z.string().trim().regex(/^[1-9]\d*$/, 'A whole number above zero.'),
    is_active: z.boolean(),
  })
  .refine((v) => v.source === 'participation' || !v.role, { path: ['role'], message: 'Only a participation rule can name a role.' })
type RuleForm = z.infer<typeof schema>

const toInput = (v: RuleForm): PointRuleInput => ({
  name: v.name,
  source: v.source as Schema<'PointSourceEnum'>,
  role: v.source === 'participation' && v.role ? (v.role as Schema<'ParticipationRoleEnum'>) : null,
  category: toNullableInt(v.category),
  points: Number(v.points),
  is_active: v.is_active,
})

function RuleDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: PointRule | null }) {
  const create = useCreatePointRule()
  const update = useUpdatePointRule()
  const categories = useCategoryOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.name}` : 'Add point rule'}
      description="Points are given automatically when a student is checked in or a role is recorded."
      schema={schema}
      defaultValues={{
        name: record?.name ?? '',
        source: (record?.source as RuleForm['source']) ?? 'attendance',
        role: record?.role ?? '',
        category: record?.category ? String(record.category) : '',
        points: record ? String(record.points) : '',
        is_active: record?.is_active ?? true,
      }}
      onSubmit={async (v) => {
        if (record) await update.mutateAsync({ id: record.id, input: toInput(v) })
        else await create.mutateAsync(toInput(v))
        toast.success(record ? 'Rule saved.' : 'Rule added.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <FormField label="Name" required error={errors.name?.message}>
            <Input {...register('name')} autoFocus placeholder="Winning a sports event" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Given for" error={errors.source?.message}>
              {(p) => <Controller control={control} name="source" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PointSourceEnum')} />} />}
            </FormField>
            {watch('source') === 'participation' && (
              <FormField label="Role" error={errors.role?.message}>
                {(p) => (
                  <Controller control={control} name="role" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Any role" options={enumOptions('ParticipationRoleEnum')} />} />
                )}
              </FormField>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="For events in" error={errors.category?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Any category" options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />}
                />
              )}
            </FormField>
            <FormField label="Points" required error={errors.points?.message}>
              <Input {...register('points')} inputMode="numeric" />
            </FormField>
          </div>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Active
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

export default function PointRulesPage() {
  const list = useListState({ filters: ['source', 'is_active'] })
  const query = usePointRules(list.query)
  const crud = useCrudState<PointRule>()
  const remove = useRemovePointRule()

  const columns: Column<PointRule>[] = [
    { id: 'name', header: 'Rule', mobile: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'for', header: 'Given for', cell: (r) => (r.source === 'participation' && r.role ? `${enumLabel('ParticipationRoleEnum', r.role)} role` : enumLabel('PointSourceEnum', r.source)) },
    { id: 'cat', header: 'Category', cell: (r) => r.category_name ?? 'Any' },
    { id: 'points', header: 'Points', className: 'tabular-nums', cell: (r) => `+${r.points}` },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.is_active === false ? 'inactive' : 'active'} /> },
  ]
  const add = (label: string) => (
    <PermissionGate permission={PERMS.events.manage}>
      <Button onClick={crud.openCreate}>
        <Plus aria-hidden /> {label}
      </Button>
    </PermissionGate>
  )

  return (
    <>
      <SectionHeader title="Point rules" description="How many points each way of taking part earns. Changes apply from now on, not to points already given." action={add('Add rule')} />
      <DataTable
        ariaLabel="Point rules"
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchable={false}
        filters={[
          { name: 'source', label: 'Given for', options: enumOptions('PointSourceEnum') },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
        ]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.events.manage, onSelect: () => crud.openEdit(r) },
              { label: 'Delete', icon: Trash2, permission: PERMS.events.manage, destructive: true, onSelect: () => crud.openDelete(r) },
            ]}
          />
        )}
        empty={{ title: 'No point rules', description: 'e.g. 5 points for attending any event, 20 for winning a sports event.', action: add('Add the first rule') }}
      />
      <RuleDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the rule ${crud.deleting.name}`}
          description="Points it already gave are kept."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Rule deleted.')
          }}
        />
      )}
    </>
  )
}
