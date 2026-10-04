import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'
import type { PermissionRequirement } from '@/lib/permissions'
import type { Id, Paginated } from '@/shared/types/api'

export interface FieldDef {
  name: string
  label: string
  required?: boolean
  mono?: boolean
}

type Row = { id: Id } & Record<string, unknown>

/** A short list with add/edit/delete in a dialog, for small lookup tables (authors, suppliers, stores…). */
export function SimpleCrudList<T extends Row>({
  title,
  noun,
  fields,
  query,
  create,
  update,
  remove,
  label,
  extra,
  permission,
}: {
  title: string
  noun: string
  fields: FieldDef[]
  query: UseQueryResult<Paginated<T>>
  create: UseMutationResult<unknown, Error, never>
  update: UseMutationResult<unknown, Error, { id: Id; input: never }>
  remove: UseMutationResult<unknown, Error, Id>
  label: (row: T) => string
  extra?: Record<string, unknown>
  /** Who may add, edit and delete. */
  permission: PermissionRequirement
}) {
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  const record = editing === 'new' ? null : editing
  const schema = z.object(Object.fromEntries(fields.map((f) => [f.name, f.required ? z.string().trim().min(1, 'Required.') : z.string()])))
  return (
    <section>
      <SectionHeader
        title={title}
        action={
          <PermissionGate permission={permission}>
            <Button size="sm" variant="outline" onClick={() => setEditing('new')}>
              <Plus aria-hidden /> Add {noun}
            </Button>
          </PermissionGate>
        }
      />
      {query.isPending ? (
        <TableSkeleton rows={2} columns={2} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.results.length === 0 ? (
        <p className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">None yet.</p>
      ) : (
        <ul className="max-h-80 divide-y overflow-y-auto rounded-lg border bg-card">
          {query.data.results.map((r) => (
            <li key={r.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="flex-1">{label(r)}</span>
              <RowActions
                label={`Actions for ${label(r)}`}
                actions={[
                  { label: 'Edit', icon: Pencil, permission: permission, onSelect: () => setEditing(r) },
                  { label: 'Delete', icon: Trash2, permission: permission, destructive: true, onSelect: () => setDeleting(r) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}
      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={record ? `Edit ${noun}` : `Add ${noun}`}
        schema={schema}
        defaultValues={Object.fromEntries(fields.map((f) => [f.name, String(record?.[f.name] ?? '')]))}
        onSubmit={async (v) => {
          const input = { ...extra, ...v } as never
          if (record) await update.mutateAsync({ id: record.id, input })
          else await create.mutateAsync(input)
          toast.success(record ? 'Saved.' : 'Added.')
        }}
      >
        {({ register, formState: { errors } }) => (
          <>
            {fields.map((f) => (
              <FormField key={f.name} label={f.label} required={f.required} error={(errors as Record<string, { message?: string }>)[f.name]?.message}>
                <Input {...register(f.name)} className={f.mono ? 'font-mono' : undefined} />
              </FormField>
            ))}
          </>
        )}
      </FormDialog>
      <DeleteDialog
        open={deleting != null}
        onOpenChange={(o) => !o && setDeleting(null)}
        subject={deleting ? `“${label(deleting)}”` : noun}
        onConfirm={async () => {
          await remove.mutateAsync(deleting!.id)
          toast.success('Deleted.')
        }}
      />
    </section>
  )
}
