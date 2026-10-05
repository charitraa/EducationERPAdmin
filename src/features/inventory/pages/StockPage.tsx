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
import { tr } from '@/lib/i18n'

const VIEWS = [
  { value: 'levels', label: tr('On hand') },
  { value: 'movements', label: tr('Movements') },
  { value: 'issues', label: tr('Issue vouchers') },
  { value: 'transfers', label: tr('Transfers') },
] as const

const signed = z.string().trim().regex(/^-?\d+$/, tr('A whole number; minus to take away.')).refine((v) => Number(v) !== 0, tr('Not zero.'))

function AdjustDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const adjust = useAdjustStock()
  const { items, stores } = useInventoryOptions('consumable')
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Adjust stock')}
      description={tr('A stock-take correction, damage or write-off. Put a minus in front to take stock away.')}
      submitLabel={tr('Adjust')}
      schema={z.object({ item: z.string().min(1, tr('Choose an item.')), store: z.string().min(1, tr('Choose a store.')), delta: signed, reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
      defaultValues={{ item: '', store: '', delta: '', reason: '' }}
      onSubmit={async (v) => {
        const m = await adjust.mutateAsync({ item: Number(v.item), store: Number(v.store), delta: Number(v.delta), reason: v.reason })
        toast.success(tr('{item_name}: now {balance_after} at {store_name}.', { item_name: m.item_name, balance_after: m.balance_after, store_name: m.store_name }))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Item')} required error={errors.item?.message}>
              {(p) => <Controller control={control} name="item" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={items} />} />}
            </FormField>
            <FormField label={tr('Store')} required error={errors.store?.message}>
              {(p) => <Controller control={control} name="store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label={tr('Change by')} required error={errors.delta?.message}>
              <Input {...register('delta')} inputMode="numeric" placeholder="-3" />
            </FormField>
          </div>
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder={tr('Stock-take 2083 Shrawan, water damage…')} />
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
      title={tr('Move stock between stores')}
      submitLabel={tr('Transfer')}
      schema={z
        .object({ item: z.string().min(1, tr('Choose an item.')), from_store: z.string().min(1, tr('Choose a store.')), to_store: z.string().min(1, tr('Choose a store.')), quantity: wholeNumber(), note: z.string().max(255) })
        .refine((v) => v.from_store !== v.to_store, { path: ['to_store'], message: tr('Choose a different store.') })}
      defaultValues={{ item: '', from_store: '', to_store: '', quantity: '', note: '' }}
      onSubmit={async (v) => {
        const t = await transfer.mutateAsync({ item: Number(v.item), from_store: Number(v.from_store), to_store: Number(v.to_store), quantity: Number(v.quantity), note: v.note })
        toast.success(tr('{quantity} × {item_name} moved.', { quantity: t.quantity, item_name: t.item_name }))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <FormField label={tr('Item')} required error={errors.item?.message}>
            {(p) => <Controller control={control} name="item" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={items} />} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('From')} required error={errors.from_store?.message}>
              {(p) => <Controller control={control} name="from_store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label={tr('To')} required error={errors.to_store?.message}>
              {(p) => <Controller control={control} name="to_store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label={tr('Quantity')} required error={errors.quantity?.message}>
              <Input {...register('quantity')} inputMode="numeric" />
            </FormField>
          </div>
          <FormField label={tr('Note')} error={errors.note?.message}>
            <Input {...register('note')} maxLength={255} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

const issueSchema = z
  .object({
    store: z.string().min(1, tr('Choose a store.')),
    to: z.enum(['staff', 'department']),
    staff: z.string(),
    department: z.string(),
    purpose: z.string().max(255),
    issued_on: isoDate,
    lines: z.array(z.object({ item: z.string().min(1, tr('Choose an item.')), quantity: wholeNumber() })).min(1, tr('Add what’s given out.')),
  })
  .refine((v) => (v.to === 'staff' ? v.staff !== '' : v.department !== ''), { path: ['staff'], message: tr('Choose who receives it.') })

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
      title={tr('Issue stock')}
      description={tr('Give consumables (stationery, chalk, cleaning supplies…) to a staff member or a department. A numbered voucher is made.')}
      submitLabel={tr('Issue')}
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
        toast.success(tr('Voucher {number} issued to {recipient_name}.', { number: r.number, recipient_name: r.recipient_name }))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('From store')} required error={errors.store?.message}>
              {(p) => <Controller control={control} name="store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label={tr('Give to')}>
              {(p) => <Controller control={control} name="to" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'staff', label: tr('A staff member') }, { value: 'department', label: tr('A department') }]} />} />}
            </FormField>
            {watch('to') === 'staff' ? (
              <FormField label={tr('Staff member')} required error={errors.staff?.message}>
                {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} />} />}
              </FormField>
            ) : (
              <FormField label={tr('Department')} required error={errors.staff?.message}>
                {(p) => <Controller control={control} name="department" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={departments.data ?? []} />} />}
              </FormField>
            )}
            <FormField label={tr('Purpose')} error={errors.purpose?.message}>
              <Input {...register('purpose')} maxLength={255} placeholder={tr('Exam week')} />
            </FormField>
            <FormField label={tr('Date (AD)')} error={errors.issued_on?.message}>
              {(p) => <Controller control={control} name="issued_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
          </div>
          <IssueLines control={control} register={register} items={items} error={errors.lines?.message ?? errors.lines?.root?.message} />
          <RowErrors errors={errors.lines} label={tr('Line')} />
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
      <legend className="mb-1 text-sm font-medium">{tr('Items')}</legend>
      {rows.fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
          <Controller control={control} name={`lines.${i}.item`} render={({ field }) => <SelectControl value={field.value} onChange={field.onChange} options={items} aria-label={tr('Line {value} item', { value: i + 1 })} />} />
          <Input {...register(`lines.${i}.quantity`)} inputMode="numeric" aria-label={tr('Line {value} quantity', { value: i + 1 })} />
          <Button type="button" size="icon" variant="ghost" onClick={() => rows.remove(i)} disabled={rows.fields.length === 1} aria-label={tr('Remove line {value}', { value: i + 1 })}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => rows.append({ item: '', quantity: '1' })}>
        <Plus aria-hidden /> {tr('Add line')}
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
      header: tr('Item'),
      mobile: 'title',
      cell: (l) => (
        <span>
          <span className="font-medium">{l.item_name}</span> <span className="font-mono text-xs text-muted-foreground">{l.item_code}</span>
        </span>
      ),
    },
    { id: 'store', header: tr('Store'), cell: (l) => l.store_name },
    { id: 'qty', header: tr('On hand'), className: 'text-right tabular-nums', cell: (l) => <span className={cn('font-medium', l.is_low && 'text-danger')}>{`${l.quantity} ${l.unit}`}</span> },
    { id: 'reorder', header: tr('Reorder at'), className: 'text-right tabular-nums', mobile: 'hidden', cell: (l) => (l.reorder_level ? l.reorder_level : '—') },
    { id: 'low', header: '', cell: (l) => (l.is_low ? <StatusBadge status="pending" tone="danger" label={tr('Low')} /> : null) },
  ]
  return (
    <DataTable
      ariaLabel={tr('Stock on hand')}
      columns={columns}
      query={query}
      list={list}
      getRowId={(l) => l.id}
      searchPlaceholder={tr('Search item name or code…')}
      filters={[
        { name: 'store', label: tr('Store'), options: stores },
        { name: 'low', label: tr('Level'), options: [{ value: 'true', label: tr('At or below reorder level') }] },
      ]}
      empty={{ title: tr('No stock yet'), description: tr('Stock arrives through purchase orders, or an adjustment for an opening count.') }}
    />
  )
}

function Movements() {
  const list = useListState({ filters: ['store', 'kind'] })
  const query = useMovements(list.query)
  const { stores } = useInventoryOptions()
  const columns: Column<StockMovement>[] = [
    { id: 'when', header: tr('When'), className: 'whitespace-nowrap tabular-nums', cell: (m) => formatDateTime(m.created_at) },
    { id: 'item', header: tr('Item'), mobile: 'title', cell: (m) => <span className="font-medium">{m.item_name}</span> },
    { id: 'store', header: tr('Store'), cell: (m) => m.store_name },
    { id: 'kind', header: tr('What'), cell: (m) => enumLabel('StockMovementKindEnum', m.kind) },
    { id: 'delta', header: tr('Change'), className: 'text-right tabular-nums', cell: (m) => <span className={m.delta < 0 ? 'text-danger' : 'text-success'}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span> },
    { id: 'after', header: tr('Balance'), className: 'text-right tabular-nums', cell: (m) => m.balance_after },
    { id: 'note', header: tr('Note'), mobile: 'hidden', cell: (m) => m.note || '—' },
  ]
  return (
    <DataTable
      ariaLabel={tr('Stock movements')}
      columns={columns}
      query={query}
      list={list}
      getRowId={(m) => m.id}
      searchable={false}
      filters={[
        { name: 'store', label: tr('Store'), options: stores },
        { name: 'kind', label: tr('What'), options: enumOptions('StockMovementKindEnum') },
      ]}
      empty={{ title: tr('No movements yet') }}
    />
  )
}

function Issues() {
  const list = useListState({ filters: ['store'] })
  const query = useStockIssues(list.query)
  const columns: Column<StockIssue>[] = [
    { id: 'number', header: tr('Voucher'), className: 'font-mono text-xs', cell: (i) => i.number },
    { id: 'to', header: tr('Given to'), mobile: 'title', cell: (i) => <span className="font-medium">{i.recipient_name}</span> },
    { id: 'what', header: tr('Items'), cell: (i) => i.lines.map((l) => `${l.quantity} × ${l.item_name}`).join(', ') },
    { id: 'store', header: tr('From'), cell: (i) => i.store_name },
    { id: 'date', header: tr('Date'), className: 'tabular-nums', cell: (i) => formatDate(i.issued_on) },
    { id: 'purpose', header: tr('Purpose'), mobile: 'hidden', cell: (i) => i.purpose || '—' },
  ]
  return <DataTable ariaLabel={tr('Issue vouchers')} columns={columns} query={query} list={list} getRowId={(i) => i.id} searchPlaceholder={tr('Voucher number or purpose…')} empty={{ title: tr('Nothing issued yet') }} />
}

function Transfers() {
  const list = useListState({ filters: [] })
  const query = useTransfers(list.query)
  const { stores } = useInventoryOptions()
  const storeName = (id: number) => stores.find((s) => s.value === String(id))?.label ?? `#${id}`
  const columns: Column<StockTransfer>[] = [
    { id: 'when', header: tr('When'), className: 'whitespace-nowrap tabular-nums', cell: (t) => formatDateTime(t.created_at) },
    { id: 'item', header: tr('Item'), mobile: 'title', cell: (t) => <span className="font-medium">{`${t.quantity} × ${t.item_name}`}</span> },
    { id: 'from', header: tr('From'), cell: (t) => storeName(t.from_store) },
    { id: 'to', header: tr('To'), cell: (t) => storeName(t.to_store) },
    { id: 'note', header: tr('Note'), mobile: 'hidden', cell: (t) => t.note || '—' },
  ]
  return <DataTable ariaLabel={tr('Transfers')} columns={columns} query={query} list={list} getRowId={(t) => t.id} searchable={false} empty={{ title: tr('No transfers yet') }} />
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
        <div className="mr-auto inline-flex rounded-md border p-0.5" role="tablist" aria-label={tr('Stock')}>
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
            <SlidersHorizontal aria-hidden /> {tr('Adjust')}
          </Button>
          <Button variant="outline" onClick={() => setDialog('transfer')}>
            <ArrowLeftRight aria-hidden /> {tr('Transfer')}
          </Button>
          <Button onClick={() => setDialog('issue')}>
            <PackageMinus aria-hidden /> {tr('Issue')}
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
