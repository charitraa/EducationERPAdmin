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
import { tr } from '@/lib/i18n'

const schema = z
  .object({
    name: z.string().trim().min(1, tr('Required.')).max(200),
    source: z.enum(['attendance', 'participation', 'manual']),
    role: z.string(),
    category: z.string(),
    points: z.string().trim().regex(/^[1-9]\d*$/, tr('A whole number above zero.')),
    is_active: z.boolean(),
  })
  .refine((v) => v.source === 'participation' || !v.role, { path: ['role'], message: tr('Only a participation rule can name a role.') })
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
      title={record ? tr('Edit {name}', { name: record.name }) : tr('Add point rule')}
      description={tr('Points are given automatically when a student is checked in or a role is recorded.')}
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
        toast.success(record ? tr('Rule saved.') : tr('Rule added.'))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <FormField label={tr('Name')} required error={errors.name?.message}>
            <Input {...register('name')} autoFocus placeholder={tr('Winning a sports event')} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Given for')} error={errors.source?.message}>
              {(p) => <Controller control={control} name="source" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PointSourceEnum')} />} />}
            </FormField>
            {watch('source') === 'participation' && (
              <FormField label={tr('Role')} error={errors.role?.message}>
                {(p) => (
                  <Controller control={control} name="role" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Any role')} options={enumOptions('ParticipationRoleEnum')} />} />
                )}
              </FormField>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('For events in')} error={errors.category?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Any category')} options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />}
                />
              )}
            </FormField>
            <FormField label={tr('Points')} required error={errors.points?.message}>
              <Input {...register('points')} inputMode="numeric" />
            </FormField>
          </div>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Active')}
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
    { id: 'name', header: tr('Rule'), mobile: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'for', header: tr('Given for'), cell: (r) => (r.source === 'participation' && r.role ? tr('{enumLabel} role', { enumLabel: enumLabel('ParticipationRoleEnum', r.role) }) : enumLabel('PointSourceEnum', r.source)) },
    { id: 'cat', header: tr('Category'), cell: (r) => r.category_name ?? tr('Any') },
    { id: 'points', header: tr('Points'), className: 'tabular-nums', cell: (r) => `+${r.points}` },
    { id: 'status', header: tr('Status'), cell: (r) => <StatusBadge status={r.is_active === false ? 'inactive' : 'active'} /> },
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
      <SectionHeader title={tr('Point rules')} description={tr('How many points each way of taking part earns. Changes apply from now on, not to points already given.')} action={add(tr('Add rule'))} />
      <DataTable
        ariaLabel={tr('Point rules')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchable={false}
        filters={[
          { name: 'source', label: tr('Given for'), options: enumOptions('PointSourceEnum') },
          { name: 'is_active', label: tr('Status'), options: [{ value: 'true', label: tr('Active') }, { value: 'false', label: tr('Inactive') }] },
        ]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.events.manage, onSelect: () => crud.openEdit(r) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.events.manage, destructive: true, onSelect: () => crud.openDelete(r) },
            ]}
          />
        )}
        empty={{ title: tr('No point rules'), description: tr('e.g. 5 points for attending any event, 20 for winning a sports event.'), action: add(tr('Add the first rule')) }}
      />
      <RuleDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('the rule {name}', { name: crud.deleting.name })}
          description={tr('Points it already gave are kept.')}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Rule deleted.'))
          }}
        />
      )}
    </>
  )
}
