import { Plus, X } from 'lucide-react'
import { Controller, useFieldArray } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { RowErrors } from '@/components/forms/RowErrors'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/hooks/useToast'
import { formatMoney, fromPaisa, sumMoney, toPaisa } from '@/lib/currency'
import { combineLocal, splitLocal, todayIso } from '@/lib/dates'
import { enumOptions } from '@/lib/formatters'
import { isoDate } from '@/lib/validation'
import type { Invoice, InvoiceRow, PaymentMethod } from '../api/finance.api'
import { useAddInvoiceItem, useAssessLateFees, useCancelInvoice, useCategoryOptions, useRecordPayment, useSetInstallments } from '../hooks/useFinance'
import { moneyInput } from './money'
import { tr } from '@/lib/i18n'

const paymentSchema = z.object({
  amount: moneyInput,
  method: z.string().min(1),
  reference: z.string().max(100),
  note: z.string().max(255),
  date: isoDate,
  time: z.string().regex(/^\d{2}:\d{2}$/, tr('Give a time.')),
})

/** Take money against one invoice. The backend refuses more than the balance and issues a receipt. */
export function RecordPaymentDialog({ invoice, onClose, onRecorded }: { invoice: Pick<InvoiceRow, 'id' | 'invoice_number' | 'student_name' | 'balance'> | null; onClose: () => void; onRecorded?: (paymentId: number) => void }) {
  const record = useRecordPayment()
  const now = splitLocal(new Date().toISOString())
  return (
    <FormDialog
      open={invoice != null}
      onOpenChange={(o) => !o && onClose()}
      title={invoice ? tr('Take payment · {invoice_number}', { invoice_number: invoice.invoice_number }) : tr('Take payment')}
      description={invoice ? tr('{student_name} owes {money}. A receipt is issued.', { student_name: invoice.student_name, money: formatMoney(invoice.balance) }) : undefined}
      submitLabel={tr('Record payment')}
      schema={paymentSchema.refine((v) => !invoice || (toPaisa(v.amount) ?? 0n) <= (toPaisa(invoice.balance) ?? 0n), { path: ['amount'], message: tr('More than what’s owed.') })}
      defaultValues={{ amount: invoice ? fromPaisa(toPaisa(invoice.balance) ?? 0n) : '', method: 'cash', reference: '', note: '', date: now.date, time: now.time }}
      onSubmit={async (v) => {
        const paidAt = combineLocal(v.date, v.time)
        const p = await record.mutateAsync({
          invoice: invoice!.id,
          amount: v.amount,
          method: v.method as PaymentMethod,
          reference: v.reference,
          note: v.note,
          // A moment ago is "now": the backend refuses future times, and clocks drift.
          ...(v.date === now.date && v.time === now.time ? {} : { paid_at: paidAt }),
        })
        toast.success(tr('{money} received.', { money: formatMoney(v.amount) }))
        onRecorded?.(p.id)
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Amount')} required error={errors.amount?.message}>
              <Input {...register('amount')} inputMode="decimal" className="tabular-nums" />
            </FormField>
            <FormField label={tr('Method')} required error={errors.method?.message}>
              {(p) => <Controller control={control} name="method" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('PaymentMethodEnum')} />} />}
            </FormField>
          </div>
          {watch('method') !== 'cash' && (
            <FormField label={tr('Reference')} error={errors.reference?.message} description={tr('Cheque number, bank or transaction id.')}>
              <Input {...register('reference')} maxLength={100} />
            </FormField>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Received on (AD)')} required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label={tr('At')} required error={errors.time?.message}>
              <Input type="time" {...register('time')} />
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

const itemSchema = z.object({ kind: z.enum(['discount', 'fine', 'adjustment']), description: z.string().trim().min(1, tr('Describe it.')).max(255), amount: z.string().trim().regex(/^-?\d+(\.\d{1,2})?$/, tr('An amount like 500 or 500.50.')), category: z.string() })

/** A discount (reduces), a fine (adds), or an adjustment (either way: give a minus for a reduction). */
export function AddItemDialog({ invoice, open, onOpenChange }: { invoice: Invoice; open: boolean; onOpenChange: (o: boolean) => void }) {
  const add = useAddInvoiceItem()
  const categories = useCategoryOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Add a line')}
      description={tr('A discount reduces what’s owed, a fine adds to it. An adjustment can go either way: put a minus in front to reduce.')}
      submitLabel={tr('Add line')}
      schema={itemSchema.refine((v) => v.kind === 'adjustment' || !v.amount.startsWith('-'), { path: ['amount'], message: tr('Give the amount without a minus.') })}
      defaultValues={{ kind: 'discount' as 'discount' | 'fine' | 'adjustment', description: '', amount: '', category: '' }}
      onSubmit={async (v) => {
        await add.mutateAsync({ id: invoice.id, kind: v.kind, description: v.description, amount: v.amount, ...(v.category ? { category: Number(v.category) } : {}) })
        toast.success(tr('Line added.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Kind')} required>
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('AddInvoiceItemKindEnum').map((o) => ({ ...o, label: o.label.charAt(0).toUpperCase() + o.label.slice(1) }))} />} />}
            </FormField>
            <FormField label={tr('Amount')} required error={errors.amount?.message}>
              <Input {...register('amount')} inputMode="decimal" className="tabular-nums" />
            </FormField>
          </div>
          <FormField label={tr('Description')} required error={errors.description?.message}>
            <Input {...register('description')} maxLength={255} placeholder={tr('Sibling discount, library fine…')} />
          </FormField>
          <FormField label={tr('Fee category')} error={errors.category?.message}>
            {(p) => <Controller control={control} name="category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('None')} options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />} />}
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

const installmentsSchema = z.object({ rows: z.array(z.object({ amount: moneyInput, due_date: isoDate })).min(2, tr('At least two installments.')) })

/** Split the total into due-dated parts. Only changes when reminders and late fees fall due. */
export function InstallmentsDialog({ invoice, open, onOpenChange }: { invoice: Invoice; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSetInstallments()
  const half = (toPaisa(invoice.total) ?? 0n) / 2n
  const existing = invoice.installments ?? []
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Installments')}
      description={tr('They must add up to the total, {money}. Replaces any earlier split.', { money: formatMoney(invoice.total) })}
      schema={installmentsSchema.refine((v) => sumMoney(v.rows.map((r) => r.amount)) === fromPaisa(toPaisa(invoice.total) ?? 0n), { path: ['rows'], message: tr('The installments must add up to {money}.', { money: formatMoney(invoice.total) }) })}
      defaultValues={{
        rows: existing.length
          ? existing.map((i) => ({ amount: i.amount, due_date: i.due_date }))
          : [
              { amount: fromPaisa(half), due_date: invoice.due_date },
              { amount: fromPaisa((toPaisa(invoice.total) ?? 0n) - half), due_date: invoice.due_date },
            ],
      }}
      onSubmit={async (v) => {
        await save.mutateAsync({ id: invoice.id, installments: v.rows })
        toast.success(tr('Installments saved.'))
      }}
    >
      {({ control, register, watch, formState: { errors } }) => (
        <>
          <InstallmentRows control={control} register={register} total={sumMoney(watch('rows').map((r) => r.amount))} error={errors.rows?.message ?? errors.rows?.root?.message} />
          <RowErrors errors={errors.rows} label={tr('Installment')} />
        </>
      )}
    </FormDialog>
  )
}

type InstallmentValues = z.infer<typeof installmentsSchema>

function InstallmentRows({ control, register, total, error }: { control: import('react-hook-form').Control<InstallmentValues>; register: import('react-hook-form').UseFormRegister<InstallmentValues>; total: string; error?: string }) {
  const rows = useFieldArray({ control, name: 'rows' })
  return (
    <div className="grid gap-2">
      {rows.fields.map((f, i) => (
        <div key={f.id} className="grid grid-cols-[2rem_1fr_1fr_auto] items-center gap-2">
          <span className="text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
          <Input {...register(`rows.${i}.amount`)} inputMode="decimal" className="tabular-nums" aria-label={tr('Installment {value} amount', { value: i + 1 })} />
          <Controller control={control} name={`rows.${i}.due_date`} render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} aria-label={tr('Installment {value} due date', { value: i + 1 })} />} />
          <Button type="button" size="icon" variant="ghost" onClick={() => rows.remove(i)} disabled={rows.fields.length <= 2} aria-label={tr('Remove installment {value}', { value: i + 1 })}>
            <X aria-hidden />
          </Button>
        </div>
      ))}
      <p className="text-sm text-muted-foreground">{tr('Adds up to {money}', { money: formatMoney(total) })}</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => rows.append({ amount: '', due_date: todayIso() })}>
        <Plus aria-hidden /> {tr('Add installment')}
      </Button>
    </div>
  )
}

export function CancelInvoiceDialog({ invoice, open, onOpenChange }: { invoice: Invoice; open: boolean; onOpenChange: (o: boolean) => void }) {
  const cancel = useCancelInvoice()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Cancel {invoice_number}?', { invoice_number: invoice.invoice_number })}
      description={tr('The student no longer owes it. Only possible while nothing has been paid; refund payments first.')}
      submitLabel={tr('Cancel invoice')}
      schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
      defaultValues={{ reason: '' }}
      onSubmit={async (v) => {
        await cancel.mutateAsync({ id: invoice.id, reason: v.reason })
        toast.success(tr('Invoice cancelled.'))
      }}
    >
      {({ register, formState: { errors } }) => (
        <FormField label={tr('Reason')} required error={errors.reason?.message}>
          <Input {...register('reason')} maxLength={255} placeholder={tr('Issued twice, student withdrew…')} />
        </FormField>
      )}
    </FormDialog>
  )
}

const lateSchema = z
  .object({ by: z.enum(['amount', 'percentage']), value: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, tr('A number.')), grace_days: z.string().regex(/^\d+$/, tr('Whole days.')), category: z.string(), campus: z.string() })
  .refine((v) => v.by === 'amount' || Number(v.value) <= 100, { path: ['value'], message: tr('At most 100%.') })

/** A fine on every overdue invoice, once each: invoices that already have a fine are skipped. */
export function LateFeesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const assess = useAssessLateFees()
  const categories = useCategoryOptions()
  const { isMultiBranch, branches, selectedBranchId } = useBranches()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tr('Charge late fees')}
      description={tr('Adds a fine to every invoice past its due date (plus the grace days). An invoice that already has a fine is skipped, so this is safe to run again.')}
      submitLabel={tr('Charge late fees')}
      schema={lateSchema}
      defaultValues={{ by: 'amount' as 'amount' | 'percentage', value: '', grace_days: '0', category: '', campus: selectedBranchId ? String(selectedBranchId) : '' }}
      onSubmit={async (v) => {
        const r = await assess.mutateAsync({
          ...(v.by === 'amount' ? { amount: v.value } : { percentage: v.value }),
          grace_days: Number(v.grace_days),
          ...(v.category ? { category: Number(v.category) } : {}),
          ...(v.campus ? { campus: Number(v.campus) } : {}),
        })
        toast.success(r.fined ? tr('Late fee added to {fined} invoice{value}.', { fined: r.fined, value: r.fined === 1 ? '' : 's' }) : tr('No invoice needed a late fee.'))
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Charge')}>
              {(p) => <Controller control={control} name="by" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'amount', label: tr('A flat amount') }, { value: 'percentage', label: tr('A percent of the balance') }]} />} />}
            </FormField>
            <FormField label={watch('by') === 'amount' ? tr('Amount') : tr('Percent')} required error={errors.value?.message}>
              <Input {...register('value')} inputMode="decimal" />
            </FormField>
            <FormField label={tr('Grace days')} error={errors.grace_days?.message}>
              <Input {...register('grace_days')} inputMode="numeric" />
            </FormField>
            <FormField label={tr('Fee category')}>
              {(p) => <Controller control={control} name="category" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('None')} options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />} />}
            </FormField>
            {isMultiBranch && (
              <FormField label={tr('Branch')}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Every branch')} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
          </div>
        </>
      )}
    </FormDialog>
  )
}
