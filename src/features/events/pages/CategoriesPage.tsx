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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { code } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { EventCategory } from '../api/events.api'
import { useCategories, useCreateCategory, useRemoveCategory, useUpdateCategory } from '../hooks/useEvents'

const schema = z.object({ code, name: z.string().trim().min(1, 'Required.').max(100), description: z.string(), is_active: z.boolean() })

function CategoryDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: EventCategory | null }) {
  const create = useCreateCategory()
  const update = useUpdateCategory()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.name}` : 'Add category'}
      description="Groups events (Sports, Cultural, Academic). Point and award rules can target a category."
      schema={schema}
      defaultValues={{ code: record?.code ?? '', name: record?.name ?? '', description: record?.description ?? '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        if (record) await update.mutateAsync({ id: record.id, input: v })
        else await create.mutateAsync(v)
        toast.success(record ? 'Category saved.' : 'Category added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} className="font-mono" autoFocus placeholder="sports" />
            </FormField>
            <FormField label="Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Sports" />
            </FormField>
          </div>
          <FormField label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} />
          </FormField>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> In use for new events
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

export default function CategoriesPage() {
  const list = useListState({ filters: ['is_active'] })
  const query = useCategories(list.query)
  const crud = useCrudState<EventCategory>()
  const remove = useRemoveCategory()

  const columns: Column<EventCategory>[] = [
    { id: 'name', header: 'Category', mobile: 'title', cell: (c) => <span className="font-medium">{c.name}</span> },
    { id: 'code', header: 'Code', className: 'font-mono text-xs', cell: (c) => c.code },
    { id: 'desc', header: 'Description', mobile: 'hidden', cell: (c) => c.description || <span className="text-muted-foreground">—</span> },
    { id: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.is_active === false ? 'inactive' : 'active'} /> },
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
      <SectionHeader title="Categories" description="Every event belongs to one." action={add('Add category')} />
      <DataTable
        ariaLabel="Event categories"
        columns={columns}
        query={query}
        list={list}
        getRowId={(c) => c.id}
        searchPlaceholder="Search categories…"
        filters={[{ name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }]}
        rowActions={(c) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.events.manage, onSelect: () => crud.openEdit(c) },
              { label: 'Delete', icon: Trash2, permission: PERMS.events.manage, destructive: true, onSelect: () => crud.openDelete(c) },
            ]}
          />
        )}
        empty={{ title: 'No categories yet', description: 'Add Sports, Cultural, Academic… before creating events.', action: add('Add the first category') }}
      />
      <CategoryDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the category ${crud.deleting.name}`}
          description="A category with events can’t be deleted; mark it inactive instead."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Category deleted.')
          }}
        />
      )}
    </>
  )
}
