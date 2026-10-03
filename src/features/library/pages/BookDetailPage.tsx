import { Archive, BookmarkPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { SectionHeader } from '@/components/common/SectionHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader, TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Money, moneyInput } from '@/features/finance/components/money'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { optionalIsoDate } from '@/lib/validation'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Copy, Member } from '../api/library.api'
import { MemberPicker } from '../components/Pickers'
import { BookDialog } from './BooksPage'
import { useBook, useCopies, useCreateCopy, useRemoveBook, useRemoveCopy, useReservations, useReserveBook, useShelves, useUpdateCopy, useWithdrawCopy } from '../hooks/useLibrary'

const COPY_TONE: Record<string, StatusTone> = { available: 'success', issued: 'info', reserved: 'warning', lost: 'danger', damaged: 'danger', withdrawn: 'muted' }

export function CopyStatus({ status }: { status: Copy['status'] }) {
  return <StatusBadge status={status === 'available' ? 'active' : status === 'withdrawn' ? 'archived' : 'open'} tone={COPY_TONE[status]} label={enumLabel('CopyStatusEnum', status)} />
}

const copySchema = z.object({ campus: z.string().min(1, 'Choose a branch.'), shelf: z.string(), price: z.union([z.literal(''), moneyInput]), acquired_on: optionalIsoDate, count: z.string().regex(/^([1-9]|[1-4]\d|50)$/, '1 to 50.') })

function CopyDialog({ bookId, open, record, onOpenChange }: { bookId: number; open: boolean; record: Copy | null; onOpenChange: (o: boolean) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const shelves = useShelves({ ...PICKER_PARAMS }, { enabled: open })
  const create = useCreateCopy()
  const update = useUpdateCopy()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.accession_number}` : 'Add copies'}
      description={record ? undefined : 'Each copy gets its own accession number to put on its label. The price is what a lost copy is fined at.'}
      schema={copySchema}
      defaultValues={{
        campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        shelf: record?.shelf ? String(record.shelf) : '',
        price: record?.price ?? '',
        acquired_on: record?.acquired_on ?? '',
        count: '1',
      }}
      onSubmit={async (v) => {
        const input = { book: bookId, campus: Number(v.campus), shelf: v.shelf ? Number(v.shelf) : null, price: v.price || null, acquired_on: v.acquired_on || null }
        if (record) {
          await update.mutateAsync({ id: record.id, input })
          toast.success('Copy saved.')
          return
        }
        const made: string[] = []
        for (let i = 0; i < Number(v.count); i++) made.push((await create.mutateAsync(input)).accession_number)
        toast.success(made.length === 1 ? `Copy ${made[0]} added.` : `${made.length} copies added: ${made[0]} to ${made[made.length - 1]}.`)
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {isMultiBranch && (
              <FormField label="Branch" required error={errors.campus?.message}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
            <FormField label="Shelf" error={errors.shelf?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="shelf"
                  render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="No shelf" options={(shelves.data?.results ?? []).filter((s) => String(s.campus) === watch('campus')).map((s) => ({ value: String(s.id), label: `${s.code}${s.name ? ` · ${s.name}` : ''}` }))} />}
                />
              )}
            </FormField>
            <FormField label="Price" error={errors.price?.message}>
              <Input {...register('price')} inputMode="decimal" className="tabular-nums" />
            </FormField>
            <FormField label="Acquired (AD)" error={errors.acquired_on?.message}>
              {(p) => <Controller control={control} name="acquired_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            {!record && (
              <FormField label="How many" error={errors.count?.message}>
                <Input {...register('count')} inputMode="numeric" />
              </FormField>
            )}
          </div>
        </>
      )}
    </FormDialog>
  )
}

function ReserveDialog({ bookId, open, onOpenChange }: { bookId: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  const reserve = useReserveBook()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title="Reserve for a member"
      description="They’re next in line: the first copy returned is held for them, and they’re told it’s ready."
      submitLabel="Reserve"
      schema={z.object({ member: z.custom<Member | null>().refine((m) => m != null, 'Choose a member.') })}
      defaultValues={{ member: null }}
      onSubmit={async (v) => {
        await reserve.mutateAsync({ book: bookId, member: v.member!.id })
        toast.success('Reserved.')
      }}
    >
      {({ control, formState: { errors } }) => (
        <FormField label="Member" required error={errors.member?.message}>
          {(p) => <Controller control={control} name="member" render={({ field }) => <MemberPicker {...p} value={field.value} onChange={field.onChange} />} />}
        </FormField>
      )}
    </FormDialog>
  )
}

/** One title: its copies (with accession numbers and where each is) and who's waiting for it. */
export default function BookDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const book = useBook(Number.isFinite(id) ? id : null)
  const copies = useCopies({ ...PICKER_PARAMS, book: id })
  const reservations = useReservations({ ...PICKER_PARAMS, book: id })
  const { isMultiBranch, branchName } = useBranches()
  const { can } = usePermissions()
  const manage = can(PERMS.library.manage)
  const removeBook = useRemoveBook()
  const removeCopy = useRemoveCopy()
  const withdraw = useWithdrawCopy()
  const [dialog, setDialog] = useState<'edit' | 'delete' | 'copy' | 'reserve' | null>(null)
  const [editingCopy, setEditingCopy] = useState<Copy | null>(null)
  const [withdrawing, setWithdrawing] = useState<Copy | null>(null)
  const [deletingCopy, setDeletingCopy] = useState<Copy | null>(null)

  if (book.isPending) return <PageLoader />
  if (book.isError) return <ErrorState error={book.error} onRetry={() => void book.refetch()} />
  const b = book.data
  const waiting = (reservations.data?.results ?? []).filter((r) => r.status === 'pending' || r.status === 'ready')
  const close = (o: boolean) => !o && setDialog(null)

  return (
    <div>
      <PageHeader
        backTo="/library/books"
        title={b.title}
        description={[b.author_names.join(', '), b.category_name, b.publisher_name, b.edition, b.published_year, b.isbn && `ISBN ${b.isbn}`].filter(Boolean).join(' · ')}
        actions={
          <>
            {can(PERMS.library.circulate) && b.available_count === 0 && (copies.data?.count ?? 0) > 0 && (
              <Button variant="outline" onClick={() => setDialog('reserve')}>
                <BookmarkPlus aria-hidden /> Reserve
              </Button>
            )}
            {manage && (
              <>
                <Button variant="outline" onClick={() => setDialog('edit')}>
                  <Pencil aria-hidden /> Edit
                </Button>
                <Button variant="outline" onClick={() => setDialog('delete')} aria-label="Delete book">
                  <Trash2 aria-hidden />
                </Button>
              </>
            )}
          </>
        }
      />
      {b.description && <p className="mb-6 max-w-3xl text-sm text-muted-foreground">{b.description}</p>}

      <section className="mb-8">
        <SectionHeader
          title={`Copies · ${b.available_count} on the shelf`}
          action={
            manage && (
              <Button onClick={() => setDialog('copy')}>
                <Plus aria-hidden /> Add copies
              </Button>
            )
          }
        />
        {copies.isPending ? (
          <TableSkeleton rows={3} columns={5} />
        ) : copies.isError ? (
          <ErrorState error={copies.error} onRetry={() => void copies.refetch()} />
        ) : copies.data.results.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No copies yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm" aria-label="Copies">
              <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Accession</th>
                  {isMultiBranch && <th className="px-3 py-2">Branch</th>}
                  <th className="px-3 py-2">Shelf</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2">Acquired</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {copies.data.results.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 font-mono text-xs">{c.accession_number}</td>
                    {isMultiBranch && <td className="px-3 py-2">{branchName(c.campus)}</td>}
                    <td className="px-3 py-2">{c.shelf_name ?? '—'}</td>
                    <td className="px-3 py-2">
                      <CopyStatus status={c.status} />
                    </td>
                    <td className="px-3 py-2 text-right">{c.price ? <Money value={c.price} /> : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{formatDate(c.acquired_on)}</td>
                    <td className="px-2 py-2">
                      <RowActions
                        actions={[
                          { label: 'Edit', icon: Pencil, permission: PERMS.library.manage, onSelect: () => setEditingCopy(c) },
                          { label: 'Withdraw', icon: Archive, permission: PERMS.library.manage, hidden: c.status === 'withdrawn' || c.status === 'issued', onSelect: () => setWithdrawing(c) },
                          { label: 'Delete', icon: Trash2, permission: PERMS.library.manage, destructive: true, onSelect: () => setDeletingCopy(c) },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Waiting for it" />
        {waiting.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">No reservations.</p>
        ) : (
          <ol className="divide-y rounded-lg border bg-card">
            {waiting.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 font-medium">{r.member_name}</span>
                <span className="text-muted-foreground">{enumLabel('ReservationStatusEnum', r.status)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <BookDialog open={dialog === 'edit'} record={b} onOpenChange={close} />
      <CopyDialog bookId={b.id} open={dialog === 'copy' || editingCopy != null} record={editingCopy} onOpenChange={(o) => !o && (setDialog(null), setEditingCopy(null))} />
      <ReserveDialog bookId={b.id} open={dialog === 'reserve'} onOpenChange={close} />
      <ConfirmDialog
        open={withdrawing != null}
        onOpenChange={(o) => !o && setWithdrawing(null)}
        title={withdrawing ? `Withdraw ${withdrawing.accession_number}?` : 'Withdraw'}
        description="It leaves circulation for good (worn out, given away). Its loan history stays."
        confirmLabel="Withdraw"
        onConfirm={async () => {
          await withdraw.mutateAsync(withdrawing!.id)
          toast.success('Copy withdrawn.')
        }}
      />
      <DeleteDialog
        open={deletingCopy != null}
        onOpenChange={(o) => !o && setDeletingCopy(null)}
        subject={deletingCopy ? `copy ${deletingCopy.accession_number}` : 'this copy'}
        description="Only for a copy added by mistake: one that was ever lent must be withdrawn instead."
        onConfirm={async () => {
          await removeCopy.mutateAsync(deletingCopy!.id)
          toast.success('Copy deleted.')
        }}
      />
      <DeleteDialog
        open={dialog === 'delete'}
        onOpenChange={close}
        subject={`“${b.title}”`}
        onConfirm={async () => {
          await removeBook.mutateAsync(b.id)
          toast.success('Book deleted.')
          navigate('/library/books')
        }}
      />
    </div>
  )
}
