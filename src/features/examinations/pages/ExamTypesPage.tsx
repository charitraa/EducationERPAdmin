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
import type { ExamType } from '../api/examinations.api'
import { useCreateExamType, useExamTypes, useRemoveExamType, useUpdateExamType } from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

const schema = z.object({ code, name: z.string().trim().min(1, tr('Required.')).max(100), description: z.string(), is_active: z.boolean() })

function ExamTypeDialog({ open, record, onOpenChange }: { open: boolean; record: ExamType | null; onOpenChange: (o: boolean) => void }) {
  const create = useCreateExamType()
  const update = useUpdateExamType()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit exam type') : tr('Add exam type')}
      schema={schema}
      defaultValues={{ code: record?.code ?? '', name: record?.name ?? '', description: record?.description ?? '', is_active: record?.is_active ?? true }}
      onSubmit={async (v) => {
        if (record) await update.mutateAsync({ id: record.id, input: v })
        else await create.mutateAsync(v)
        toast.success(record ? tr('Exam type saved.') : tr('Exam type added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <FormField label={tr('Code')} required error={errors.code?.message}>
              <Input {...register('code')} placeholder="terminal" autoFocus />
            </FormField>
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('First terminal')} />
            </FormField>
          </div>
          <FormField label={tr('Description')} error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} />
          </FormField>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('In use for new exams')}
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

/** Unit test, first terminal, final, pre-board… */
export default function ExamTypesPage() {
  const list = useListState({ filters: ['is_active'], defaultOrdering: 'name' })
  const query = useExamTypes(list.query)
  const crud = useCrudState<ExamType>()
  const remove = useRemoveExamType()
  const columns: Column<ExamType>[] = [
    { id: 'name', header: tr('Exam type'), mobile: 'title', cell: (t) => <span className="font-medium">{t.name}</span> },
    { id: 'code', header: tr('Code'), className: 'font-mono text-xs', cell: (t) => t.code },
    { id: 'description', header: tr('Description'), mobile: 'hidden', cell: (t) => t.description || <span className="text-muted-foreground">—</span> },
    { id: 'status', header: tr('Status'), cell: (t) => <StatusBadge status={t.is_active === false ? 'inactive' : 'active'} label={t.is_active === false ? tr('Not in use') : tr('In use')} /> },
  ]
  return (
    <>
      <SectionHeader
        title={tr('Exam types')}
        description={tr('The kinds of exam you hold. Every exam has one.')}
        action={
          <PermissionGate permission={PERMS.exams.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('Add exam type')}
            </Button>
          </PermissionGate>
        }
      />
      <DataTable
        ariaLabel={tr('Exam types')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(t) => t.id}
        searchPlaceholder={tr('Search name or code…')}
        filters={[{ name: 'is_active', label: tr('Status'), options: [{ value: 'true', label: tr('In use') }, { value: 'false', label: tr('Not in use') }] }]}
        rowActions={(t) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.exams.manage, onSelect: () => crud.openEdit(t) },
              { label: tr('Delete'), icon: Trash2, permission: PERMS.exams.manage, destructive: true, onSelect: () => crud.openDelete(t) },
            ]}
          />
        )}
        empty={{ title: tr('No exam types yet'), description: tr('Add the kinds of exam you hold, such as Unit test and Final.') }}
      />
      <ExamTypeDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={tr('the exam type “{name}”', { name: crud.deleting.name })}
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success(tr('Exam type deleted.'))
          }}
        />
      )}
    </>
  )
}
