import { Ban, PackageCheck, Plus, Send, X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useFieldArray } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranchFilter } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { RowErrors } from '@/components/forms/RowErrors'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Money } from '@/features/finance/components/money'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { fromPaisa, toPaisa } from '@/lib/currency'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { optionalIsoDate, wholeNumber } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { PurchaseOrder } from '../api/inventory.api'
import { useCancelPurchase, useCreatePurchase, useInventoryOptions, usePlacePurchase, usePurchase, usePurchases, useReceivePurchase } from '../hooks/useInventory'
import { tr, trc } from '@/lib/i18n'

const TONE: Record<string, StatusTone> = { draft: 'neutral', ordered: 'info', partial: 'warning', received: 'success', closed: 'muted', cancelled: 'muted' }

export function PurchaseStatus({ status }: { status: PurchaseOrder['status'] }) {
  return <StatusBadge status={status === 'ordered' ? 'issued' : status === 'received' ? 'completed' : status} tone={TONE[status]} label={enumLabel('PurchaseOrderStatusEnum', status)} />
}

const price = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, tr('A price like 25 or 25.50.'))
const orderSchema = z.object({
  supplier: z.string().min(1, tr('Choose a supplier.')),
  store: z.string().min(1, tr('Choose where it’s delivered.')),
  expected_on: optionalIsoDate,
  note: z.string().max(255),
  lines: z.array(z.object({ item: z.string().min(1, tr('Choose an item.')), quantity: wholeNumber(), unit_price: price })).min(1, tr('Add what you’re ordering.')),
})
type OrderValues = z.infer<typeof orderSchema>

function OrderLines({ control, register, items, error }: { control: import('react-hook-form').Control<OrderValues>; register: import('react-hook-form').UseFormRegister<OrderValues>; items: Array<{ value: string; label: string }>; error?: string }) {
  const rows = useFieldArray({ control, name: 'lines' })
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">{tr('Lines')}</legend>
      <div className="grid grid-cols-[1fr_5rem_7rem_auto] gap-2 text-xs text-muted-foreground">
        <span>{tr('Item')}</span>
        <span>{tr('Qty')}</span>
        <span>{tr('Unit price')}</span>
        <span />
      </div>
      {rows.fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[1fr_5rem_7rem_auto] items-center gap-2">
          <Controller control={control} name={`lines.${i}.item`} render={({ field }) => <SelectControl value={field.value} onChange={field.onChange} options={items} aria-label={tr('Line {value} item', { value: i + 1 })} />} />
          <Input {...register(`lines.${i}.quantity`)} inputMode="numeric" aria-label={tr('Line {value} quantity', { value: i + 1 })} />
          <Input {...register(`lines.${i}.unit_price`)} inputMode="decimal" className="tabular-nums" aria-label={tr('Line {value} unit price', { value: i + 1 })} />
          <Button type="button" size="icon" variant="ghost" onClick={() => rows.remove(i)} disabled={rows.fields.length === 1} aria-label={tr('Remove line {value}', { value: i + 1 })}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => rows.append({ item: '', quantity: '1', unit_price: '' })}>
        <Plus aria-hidden /> {tr('Add line')}
      </Button>
    </fieldset>
  )
}

function NewOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreatePurchase()
  const navigate = useNavigate()
  const { items, stores, suppliers } = useInventoryOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={tr('New purchase order')}
      description={tr('Saved as a draft: place it with the supplier when it’s right.')}
      submitLabel={tr('Save draft')}
      schema={orderSchema}
      defaultValues={{ supplier: '', store: '', expected_on: '', note: '', lines: [{ item: '', quantity: '1', unit_price: '' }] }}
      onSubmit={async (v) => {
        const po = await create.mutateAsync({
          supplier: Number(v.supplier),
          store: Number(v.store),
          expected_on: v.expected_on || null,
          note: v.note,
          lines: v.lines.map((l) => ({ item: Number(l.item), quantity: Number(l.quantity), unit_price: l.unit_price })),
        })
        toast.success(tr('Order {number} saved as a draft.', { number: po.number }))
        navigate(`/inventory/purchases/${po.id}`)
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={tr('Supplier')} required error={errors.supplier?.message}>
              {(p) => <Controller control={control} name="supplier" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={suppliers} placeholder={suppliers.length ? tr('Choose…') : tr('Add a supplier first')} />} />}
            </FormField>
            <FormField label={tr('Deliver to')} required error={errors.store?.message}>
              {(p) => <Controller control={control} name="store" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={stores} />} />}
            </FormField>
            <FormField label={tr('Expected (AD)')} error={errors.expected_on?.message}>
              {(p) => <Controller control={control} name="expected_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
          </div>
          <OrderLines control={control} register={register} items={items} error={errors.lines?.message ?? errors.lines?.root?.message} />
          <RowErrors errors={errors.lines} label={tr('Line')} />
          <FormField label={tr('Note')} error={errors.note?.message}>
            <Input {...register('note')} maxLength={255} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** Purchase orders, from draft to delivered. */
export default function PurchasesPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status', 'supplier', 'campus'], followBranch: true })
  const branchFilter = useBranchFilter()
  const query = usePurchases(list.query)
  const { suppliers } = useInventoryOptions()
  const [creating, setCreating] = useState(false)
  const columns: Column<PurchaseOrder>[] = [
    { id: 'number', header: trc('purchase', 'Order'), className: 'font-mono text-xs', cell: (o) => o.number },
    { id: 'supplier', header: tr('Supplier'), mobile: 'title', cell: (o) => <span className="font-medium">{o.supplier_name}</span> },
    { id: 'store', header: tr('Deliver to'), cell: (o) => o.store_name },
    { id: 'lines', header: tr('Lines'), className: 'tabular-nums', cell: (o) => o.lines.length },
    { id: 'total', header: tr('Total'), className: 'text-right', cell: (o) => <Money value={o.total} /> },
    { id: 'expected', header: tr('Expected'), mobile: 'hidden', className: 'tabular-nums', cell: (o) => formatDate(o.expected_on) },
    { id: 'status', header: tr('Status'), cell: (o) => <PurchaseStatus status={o.status} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Purchase orders')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(o) => o.id}
        searchPlaceholder={tr('Order number or supplier…')}
        onRowClick={(o) => navigate(`/inventory/purchases/${o.id}`)}
        create={
          <PermissionGate permission={PERMS.inventory.manage}>
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden /> {tr('New order')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('PurchaseOrderStatusEnum') },
          { name: 'supplier', label: tr('Supplier'), options: suppliers },
          branchFilter,
        ]}
        empty={{ title: tr('No purchase orders yet') }}
      />
      <NewOrderDialog open={creating} onOpenChange={setCreating} />
    </>
  )
}

/** One order: its lines, what's arrived, and placing, receiving or cancelling it. */
export function PurchaseDetailPage() {
  const id = Number(useParams().id)
  const order = usePurchase(Number.isFinite(id) ? id : null)
  const place = usePlacePurchase()
  const cancel = useCancelPurchase()
  const receive = useReceivePurchase()
  const { can } = usePermissions()
  const [dialog, setDialog] = useState<'place' | 'cancel' | 'receive' | null>(null)
  if (order.isPending) return <PageLoader />
  if (order.isError) return <ErrorState error={order.error} onRetry={() => void order.refetch()} />
  const o = order.data
  const open = o.lines.filter((l) => l.outstanding > 0)
  const close = (v: boolean) => !v && setDialog(null)
  const nothingReceived = o.lines.every((l) => l.received_quantity === 0)
  return (
    <div>
      <PageHeader
        backTo="/inventory/purchases"
        title={tr('Order {number}', { number: o.number })}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {o.supplier_name} → {o.store_name}
            {o.ordered_on ? ' · ' + tr('ordered {date}', { date: formatDate(o.ordered_on) }) : ''}
            {o.expected_on ? ' · ' + tr('expected {date}', { date: formatDate(o.expected_on) }) : ''}
            <PurchaseStatus status={o.status} />
          </span>
        }
        actions={
          <>
            {o.status === 'draft' && can(PERMS.inventory.manage) && (
              <Button onClick={() => setDialog('place')}>
                <Send aria-hidden /> {tr('Place order')}
              </Button>
            )}
            {(o.status === 'ordered' || o.status === 'partial') && can(PERMS.inventory.stock) && (
              <Button onClick={() => setDialog('receive')}>
                <PackageCheck aria-hidden /> {tr('Receive delivery')}
              </Button>
            )}
            {(o.status === 'draft' || (o.status === 'ordered' && nothingReceived)) && can(PERMS.inventory.manage) && (
              <Button variant="outline" onClick={() => setDialog('cancel')}>
                <Ban aria-hidden /> {tr('Cancel')}
              </Button>
            )}
          </>
        }
      />
      {o.cancelled_reason && <p className="mb-4 rounded-lg border bg-muted/40 p-3 text-sm">{tr('Cancelled: {cancelled_reason}', { cancelled_reason: o.cancelled_reason })}</p>}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm" aria-label={tr('Order lines')}>
          <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="px-4 py-2">{tr('Item')}</th>
              <th className="px-3 py-2 text-right">{tr('Ordered')}</th>
              <th className="px-3 py-2 text-right">{tr('Received')}</th>
              <th className="px-3 py-2 text-right">{tr('Unit price')}</th>
              <th className="px-4 py-2 text-right">{tr('Line total')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {o.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 font-medium">{l.item_name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {l.received_quantity}
                  {l.outstanding > 0 && o.status !== 'draft' && <span className="text-xs text-muted-foreground"> {tr('({outstanding} to come)', { outstanding: l.outstanding })}</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <Money value={l.unit_price} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Money value={fromPaisa((toPaisa(l.unit_price) ?? 0n) * BigInt(l.quantity))} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-semibold">
              <td className="px-4 py-2" colSpan={4}>
                {tr('Total')}
              </td>
              <td className="px-4 py-2 text-right">
                <Money value={o.total} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      {o.note && <p className="mt-3 text-sm text-muted-foreground">{o.note}</p>}

      <ConfirmDialog
        open={dialog === 'place'}
        onOpenChange={close}
        title={tr('Place this order?')}
        description={tr('It goes to the supplier and can be received from now on. It can’t be edited after this.')}
        confirmLabel={tr('Place order')}
        onConfirm={async () => {
          await place.mutateAsync(o.id)
          toast.success(tr('Order placed.'))
        }}
      />
      <FormDialog
        open={dialog === 'cancel'}
        onOpenChange={close}
        title={tr('Cancel this order?')}
        submitLabel={tr('Cancel order')}
        schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await cancel.mutateAsync({ id: o.id, reason: v.reason })
          toast.success(tr('Order cancelled.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} />
          </FormField>
        )}
      </FormDialog>
      <FormDialog
        open={dialog === 'receive'}
        onOpenChange={close}
        wide
        title={tr('Receive a delivery')}
        description={tr('Enter what actually arrived. Consumables go into the store’s stock; each fixed asset gets its own tag.')}
        submitLabel={tr('Receive')}
        schema={z.object({ qty: z.array(z.string().regex(/^\d*$/, tr('A whole number.'))) }).refine((v) => v.qty.some((q) => Number(q) > 0), { path: ['qty'], message: tr('Enter at least one quantity.') })}
        defaultValues={{ qty: open.map((l) => String(l.outstanding)) }}
        onSubmit={async (v) => {
          const lines = open.map((l, i) => ({ line: l.id, quantity: Number(v.qty[i] || 0) })).filter((l) => l.quantity > 0)
          const r = await receive.mutateAsync({ id: o.id, lines })
          toast.success(tr('Received. Order is now {enumLabel}.', { enumLabel: enumLabel('PurchaseOrderStatusEnum', r.status).toLowerCase() }))
        }}
      >
        {({ register, formState: { errors } }) => (
          <div className="grid gap-2">
            {open.map((l, i) => (
              <div key={l.id} className="grid grid-cols-[1fr_6rem] items-center gap-3">
                <label htmlFor={`rcv-${l.id}`} className="text-sm">
                  {l.item_name} <span className="text-muted-foreground">{tr('({outstanding} to come)', { outstanding: l.outstanding })}</span>
                </label>
                <Input id={`rcv-${l.id}`} {...register(`qty.${i}`)} inputMode="numeric" />
              </div>
            ))}
            {errors.qty && <p className="text-sm text-danger">{errors.qty.message ?? errors.qty.root?.message}</p>}
          </div>
        )}
      </FormDialog>
    </div>
  )
}
