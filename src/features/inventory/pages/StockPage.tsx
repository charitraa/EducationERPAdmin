import { ArrowLeftRight, PackageMinus, SlidersHorizontal, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { RowErrors } from '@/components/forms/RowErrors'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDepartmentOptions } from '@/features/academics/departments/hooks/useDepartments'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { isoDate, wholeNumber } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { StockIssue, StockLevel, StockMovement, StockTransfer } from '../api/inventory.api'
import { useAdjustStock, useInventoryOptions, useIssueStock, useMovements, useStockIssues, useStockLevels, useTransfers, useTransferStock } from '../hooks/useInventory'

const VIEWS = [
  { value: 'levels', label: 'On hand' },
  { value: 'movements', label: 'Movements' },
  { value: 'issues', label: 'Issue vouchers' },
  { value: 'transfers', label: 'Transfers' },
] as const

const signed = z.string().trim().regex(/^-?\d+$/, 'A whole number; minus to take away.').refine((v) => Number(v) !== 0, 'Not zero.')

function AdjustDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const adjust = useAdjustStock()
  const { items, stores } = useInventoryOptions('consumable')
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust stock"
      description="A stock-take correction, damage or write-off. Put a minus in front to take stock away."
      submitLabel="Adjust"
      schema={z.object({ item: z.string().min(1, 'Choose an item.'), store: z.string().min(1, 'Choose a store.'), delta: signed, reason: z.string().trim().min(1, 'Say why.').max(255) })}
      defaultValues={{ item: '', store: '', delta: '', reason: '' }}
      onSubmit={async (v) => {
        const m = await adjust.mutateAsync({ item: Number(v.item), store: Number(v.store), delta: Number(v.delta), reason: v.reason })
        toast.success(`${m.item_name}: now ${m.balance_after} at ${m.store_name}.`)
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Item" required error={errors.item?.message}>
              {(p) => <Controller control={control} name="item" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={items} />} />}
            </FormField>
            <FormField label="Store" required error={errors.store?.message}>
              {(p) => <Controller control={control} name="store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label="Change by" required error={errors.delta?.message}>
              <Input {...register('delta')} inputMode="numeric" placeholder="-3" />
            </FormField>
          </div>
          <FormField label="Reason" required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder="Stock-take 2083 Shrawan, water damage…" />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

function TransferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const transfer = useTransferStock()
  const { items, stores } = useInventoryOptions('consumable')
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Move stock between stores"
      submitLabel="Transfer"
      schema={z
        .object({ item: z.string().min(1, 'Choose an item.'), from_store: z.string().min(1, 'Choose a store.'), to_store: z.string().min(1, 'Choose a store.'), quantity: wholeNumber(), note: z.string().max(255) })
        .refine((v) => v.from_store !== v.to_store, { path: ['to_store'], message: 'Choose a different store.' })}
      defaultValues={{ item: '', from_store: '', to_store: '', quantity: '', note: '' }}
      onSubmit={async (v) => {
        const t = await transfer.mutateAsync({ item: Number(v.item), from_store: Number(v.from_store), to_store: Number(v.to_store), quantity: Number(v.quantity), note: v.note })
        toast.success(`${t.quantity} × ${t.item_name} moved.`)
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label="Item" required error={errors.item?.message}>
            {(p) => <Controller control={control} name="item" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={items} />} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="From" required error={errors.from_store?.message}>
              {(p) => <Controller control={control} name="from_store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label="To" required error={errors.to_store?.message}>
              {(p) => <Controller control={control} name="to_store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label="Quantity" required error={errors.quantity?.message}>
              <Input {...register('quantity')} inputMode="numeric" />
            </FormField>
          </div>
          <FormField label="Note" error={errors.note?.message}>
            <Input {...register('note')} maxLength={255} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

const issueSchema = z
  .object({
    store: z.string().min(1, 'Choose a store.'),
    to: z.enum(['staff', 'department']),
    staff: z.string(),
    department: z.string(),
    purpose: z.string().max(255),
    issued_on: isoDate,
    lines: z.array(z.object({ item: z.string().min(1, 'Choose an item.'), quantity: wholeNumber() })).min(1, 'Add what’s given out.'),
  })
  .refine((v) => (v.to === 'staff' ? v.staff !== '' : v.department !== ''), { path: ['staff'], message: 'Choose who receives it.' })

function IssueDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const issue = useIssueStock()
  const { items, stores } = useInventoryOptions('consumable')
  const staff = useStaffOptions()
  const departments = useDepartmentOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Issue stock"
      description="Give consumables (stationery, chalk, cleaning supplies…) to a staff member or a department. A numbered voucher is made."
      submitLabel="Issue"
      schema={issueSchema}
      defaultValues={{ store: '', to: 'staff' as 'staff' | 'department', staff: '', department: '', purpose: '', issued_on: todayIso(), lines: [{ item: '', quantity: '1' }] }}
      onSubmit={async (v) => {
        const r = await issue.mutateAsync({
          store: Number(v.store),
          ...(v.to === 'staff' ? { staff: Number(v.staff) } : { department: Number(v.department) }),
          purpose: v.purpose,
          issued_on: v.issued_on,
          lines: v.lines.map((l) => ({ item: Number(l.item), quantity: Number(l.quantity) })),
        })
        toast.success(`Voucher ${r.number} issued to ${r.recipient_name}.`)
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="From store" required error={errors.store?.message}>
              {(p) => <Controller control={control} name="store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label="Give to">
              {(p) => <Controller control={control} name="to" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'staff', label: 'A staff member' }, { value: 'department', label: 'A department' }]} />} />}
            </FormField>
            {watch('to') === 'staff' ? (
              <FormField label="Staff member" required error={errors.staff?.message}>
                {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} />} />}
              </FormField>
            ) : (
              <FormField label="Department" required error={errors.staff?.message}>
                {(p) => <Controller control={control} name="department" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={departments.data ?? []} />} />}
              </FormField>
            )}
            <FormField label="Purpose" error={errors.purpose?.message}>
              <Input {...register('purpose')} maxLength={255} placeholder="Exam week" />
            </FormField>
            <FormField label="Date (AD)" error={errors.issued_on?.message}>
              {(p) => <Controller control={control} name="issued_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
          </div>
          <IssueLines control={control} register={register} items={items} error={errors.lines?.message ?? errors.lines?.root?.message} />
          <RowErrors errors={errors.lines} label="Line" />
        </>
      )}
    </FormDialog>
  )
}

type IssueValues = z.infer<typeof issueSchema>

function IssueLines({ control, register, items, error }: { control: import('react-hook-form').Control<IssueValues>; register: import('react-hook-form').UseFormRegister<IssueValues>; items: Array<{ value: string; label: string }>; error?: string }) {
  const rows = useFieldArray({ control, name: 'lines' })
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Items</legend>
      {rows.fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
          <Controller control={control} name={`lines.${i}.item`} render={({ field }) => <SelectControl value={field.value} onChange={field.onChange} options={items} aria-label={`Line ${i + 1} item`} />} />
          <Input {...register(`lines.${i}.quantity`)} inputMode="numeric" aria-label={`Line ${i + 1} quantity`} />
          <Button type="button" size="icon" variant="ghost" onClick={() => rows.remove(i)} disabled={rows.fields.length === 1} aria-label={`Remove line ${i + 1}`}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => rows.append({ item: '', quantity: '1' })}>
        <Plus aria-hidden /> Add line
      </Button>
    </fieldset>
  )
}

function Levels() {
  const list = useListState({ filters: ['store', 'low'] })
  const query = useStockLevels(list.query)
  const { stores } = useInventoryOptions()
  const columns: Column<StockLevel>[] = [
    {
      id: 'item',
      header: 'Item',
      mobile: 'title',
      cell: (l) => (
        <span>
          <span className="font-medium">{l.item_name}</span> <span className="font-mono text-xs text-muted-foreground">{l.item_code}</span>
        </span>
      ),
    },
    { id: 'store', header: 'Store', cell: (l) => l.store_name },
    { id: 'qty', header: 'On hand', className: 'text-right tabular-nums', cell: (l) => <span className={cn('font-medium', l.is_low && 'text-danger')}>{`${l.quantity} ${l.unit}`}</span> },
    { id: 'reorder', header: 'Reorder at', className: 'text-right tabular-nums', mobile: 'hidden', cell: (l) => (l.reorder_level ? l.reorder_level : '—') },
    { id: 'low', header: '', cell: (l) => (l.is_low ? <StatusBadge status="pending" tone="danger" label="Low" /> : null) },
  ]
  return (
    <DataTable
      ariaLabel="Stock on hand"
      columns={columns}
      query={query}
      list={list}
      getRowId={(l) => l.id}
      searchPlaceholder="Search item name or code…"
      filters={[
        { name: 'store', label: 'Store', options: stores },
        { name: 'low', label: 'Level', options: [{ value: 'true', label: 'At or below reorder level' }] },
      ]}
      empty={{ title: 'No stock yet', description: 'Stock arrives through purchase orders, or an adjustment for an opening count.' }}
    />
  )
}

function Movements() {
  const list = useListState({ filters: ['store', 'kind'] })
  const query = useMovements(list.query)
  const { stores } = useInventoryOptions()
  const columns: Column<StockMovement>[] = [
    { id: 'when', header: 'When', className: 'whitespace-nowrap tabular-nums', cell: (m) => formatDateTime(m.created_at) },
    { id: 'item', header: 'Item', mobile: 'title', cell: (m) => <span className="font-medium">{m.item_name}</span> },
    { id: 'store', header: 'Store', cell: (m) => m.store_name },
    { id: 'kind', header: 'What', cell: (m) => enumLabel('StockMovementKindEnum', m.kind) },
    { id: 'delta', header: 'Change', className: 'text-right tabular-nums', cell: (m) => <span className={m.delta < 0 ? 'text-danger' : 'text-success'}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span> },
    { id: 'after', header: 'Balance', className: 'text-right tabular-nums', cell: (m) => m.balance_after },
    { id: 'note', header: 'Note', mobile: 'hidden', cell: (m) => m.note || '—' },
  ]
  return (
    <DataTable
      ariaLabel="Stock movements"
      columns={columns}
      query={query}
      list={list}
      getRowId={(m) => m.id}
      searchable={false}
      filters={[
        { name: 'store', label: 'Store', options: stores },
        { name: 'kind', label: 'What', options: enumOptions('StockMovementKindEnum') },
      ]}
      empty={{ title: 'No movements yet' }}
    />
  )
}

function Issues() {
  const list = useListState({ filters: ['store'] })
  const query = useStockIssues(list.query)
  const columns: Column<StockIssue>[] = [
    { id: 'number', header: 'Voucher', className: 'font-mono text-xs', cell: (i) => i.number },
    { id: 'to', header: 'Given to', mobile: 'title', cell: (i) => <span className="font-medium">{i.recipient_name}</span> },
    { id: 'what', header: 'Items', cell: (i) => i.lines.map((l) => `${l.quantity} × ${l.item_name}`).join(', ') },
    { id: 'store', header: 'From', cell: (i) => i.store_name },
    { id: 'date', header: 'Date', className: 'tabular-nums', cell: (i) => formatDate(i.issued_on) },
    { id: 'purpose', header: 'Purpose', mobile: 'hidden', cell: (i) => i.purpose || '—' },
  ]
  return <DataTable ariaLabel="Issue vouchers" columns={columns} query={query} list={list} getRowId={(i) => i.id} searchPlaceholder="Voucher number or purpose…" empty={{ title: 'Nothing issued yet' }} />
}

function Transfers() {
  const list = useListState({ filters: [] })
  const query = useTransfers(list.query)
  const { stores } = useInventoryOptions()
  const storeName = (id: number) => stores.find((s) => s.value === String(id))?.label ?? `#${id}`
  const columns: Column<StockTransfer>[] = [
    { id: 'when', header: 'When', className: 'whitespace-nowrap tabular-nums', cell: (t) => formatDateTime(t.created_at) },
    { id: 'item', header: 'Item', mobile: 'title', cell: (t) => <span className="font-medium">{`${t.quantity} × ${t.item_name}`}</span> },
    { id: 'from', header: 'From', cell: (t) => storeName(t.from_store) },
    { id: 'to', header: 'To', cell: (t) => storeName(t.to_store) },
    { id: 'note', header: 'Note', mobile: 'hidden', cell: (t) => t.note || '—' },
  ]
  return <DataTable ariaLabel="Transfers" columns={columns} query={query} list={list} getRowId={(t) => t.id} searchable={false} empty={{ title: 'No transfers yet' }} />
}

/** Consumable stock per store: what's on hand, how it moved, and giving it out. */
export default function StockPage() {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((v) => v.value === params.get('view'))?.value ?? 'levels'
  const [dialog, setDialog] = useState<'adjust' | 'transfer' | 'issue' | null>(null)
  const close = (o: boolean) => !o && setDialog(null)
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="mr-auto inline-flex rounded-md border p-0.5" role="tablist" aria-label="Stock">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => setParams(v.value === 'levels' ? {} : { view: v.value }, { replace: true })}
              className={cn('rounded px-3 py-1.5 text-sm', view === v.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {v.label}
            </button>
          ))}
        </div>
        <PermissionGate permission={PERMS.inventory.stock}>
          <Button variant="outline" onClick={() => setDialog('adjust')}>
            <SlidersHorizontal aria-hidden /> Adjust
          </Button>
          <Button variant="outline" onClick={() => setDialog('transfer')}>
            <ArrowLeftRight aria-hidden /> Transfer
          </Button>
          <Button onClick={() => setDialog('issue')}>
            <PackageMinus aria-hidden /> Issue
          </Button>
        </PermissionGate>
      </div>
      {view === 'levels' ? <Levels /> : view === 'movements' ? <Movements /> : view === 'issues' ? <Issues /> : <Transfers />}
      <AdjustDialog open={dialog === 'adjust'} onOpenChange={close} />
      <TransferDialog open={dialog === 'transfer'} onOpenChange={close} />
      <IssueDialog open={dialog === 'issue'} onOpenChange={close} />
    </>
  )
}
