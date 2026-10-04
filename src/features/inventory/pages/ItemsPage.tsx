import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { code, wholeNumber } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Item, ItemInput } from '../api/inventory.api'
import { useCreateItem, useItemCategories, useItems, useRemoveItem, useUpdateItem } from '../hooks/useInventory'

const schema = z.object({
  code,
  name: z.string().trim().min(1, 'Required.').max(200),
  category: z.string(),
  kind: z.string(),
  unit: z.string().trim().min(1, 'Required.').max(20),
  reorder_level: wholeNumber(),
  description: z.string(),
  is_active: z.boolean(),
})

function ItemDialog({ open, record, onOpenChange }: { open: boolean; record: Item | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateItem()
  const update = useUpdateItem()
  const categories = useItemCategories({ ...PICKER_PARAMS, ordering: 'name' })
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? 'Edit item' : 'Add item'}
      description="A consumable is counted by quantity per store. A fixed asset is tracked one by one, each with its own tag."
      schema={schema}
      defaultValues={{
        code: record?.code ?? '',
        name: record?.name ?? '',
        category: record?.category ? String(record.category) : '',
        kind: record?.kind ?? 'consumable',
        unit: record?.unit ?? 'pcs',
        reorder_level: String(record?.reorder_level ?? 0),
        description: record?.description ?? '',
        is_active: record?.is_active ?? true,
      }}
      onSubmit={async (v) => {
        const input: ItemInput = { ...v, kind: v.kind as ItemInput['kind'], category: v.category ? Number(v.category) : null, reorder_level: Number(v.reorder_level) }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Item saved.' : 'Item added.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} placeholder="pen-blue" />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Blue ball pen" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Kind" error={errors.kind?.message} description={record ? 'Fixed once it has stock, assets or orders.' : undefined}>
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ItemKindEnum')} />} />}
            </FormField>
            <FormField label="Category">
              {(p) => <Controller control={control} name="category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={(categories.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />} />}
            </FormField>
            <FormField label="Unit" required error={errors.unit?.message}>
              <Input {...register('unit')} placeholder="pcs, box, ream" />
            </FormField>
            {watch('kind') === 'consumable' && (
              <FormField label="Reorder at" error={errors.reorder_level?.message} description="Flag a store as low at this quantity. 0 = never.">
                <Input {...register('reorder_level')} inputMode="numeric" />
              </FormField>
            )}
          </div>
          <FormField label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} />
          </FormField>
          <Controller control={control} name="is_active" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> In use
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

/** What the school stocks and owns: consumables by quantity, fixed assets one by one. */
export default function ItemsPage() {
  const list = useListState({ filters: ['kind', 'category', 'is_active'], defaultOrdering: 'name' })
  const query = useItems(list.query)
  const categories = useItemCategories({ ...PICKER_PARAMS })
  const crud = useCrudState<Item>()
  const remove = useRemoveItem()
  const columns: Column<Item>[] = [
    { id: 'code', header: 'Code', className: 'font-mono text-xs', mobile: 'hidden', cell: (i) => i.code },
    { id: 'name', header: 'Item', mobile: 'title', cell: (i) => <span className="font-medium">{i.name}</span> },
    { id: 'kind', header: 'Kind', cell: (i) => (i.kind === 'asset' ? 'Fixed asset' : 'Consumable') },
    { id: 'category', header: 'Category', cell: (i) => i.category_name ?? '—' },
    { id: 'stock', header: 'In stock', className: 'text-right tabular-nums', cell: (i) => (i.kind === 'asset' ? '—' : `${i.total_stock} ${i.unit ?? ''}`) },
    { id: 'status', header: 'Status', cell: (i) => <StatusBadge status={i.is_active === false ? 'inactive' : 'active'} label={i.is_active === false ? 'Not in use' : 'In use'} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Items"
        columns={columns}
        query={query}
        list={list}
        getRowId={(i) => i.id}
        searchPlaceholder="Search name or code…"
        toolbar={
          <PermissionGate permission={PERMS.inventory.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add item
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'kind', label: 'Kind', options: enumOptions('ItemKindEnum').map((o) => ({ ...o, label: enumLabel('ItemKindEnum', o.value).split(' (')[0]! })) },
          { name: 'category', label: 'Category', options: (categories.data?.results ?? []).map((c) => ({ value: String(c.id), label: c.name })) },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'In use' }, { value: 'false', label: 'Not in use' }] },
        ]}
        rowActions={(i) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.inventory.manage, onSelect: () => crud.openEdit(i) },
              { label: 'Delete', icon: Trash2, permission: PERMS.inventory.manage, destructive: true, onSelect: () => crud.openDelete(i) },
            ]}
          />
        )}
        empty={{ title: 'No items yet', description: 'Add what you stock (stationery, cleaning supplies) and what you own (computers, furniture).' }}
      />
      <ItemDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`“${crud.deleting.name}”`}
          description="Only possible for an item with no stock, assets or orders; otherwise mark it not in use."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Item deleted.')
          }}
        />
      )}
    </>
  )
}
