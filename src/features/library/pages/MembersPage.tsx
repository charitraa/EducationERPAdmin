import { BookOpen, Pencil, UserMinus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Money } from '@/features/finance/components/money'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { optionalWholeNumber } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Member, MemberInput } from '../api/library.api'
import { useCreateMember, useDeactivateMember, useMembers, useUpdateMember } from '../hooks/useLibrary'

const rate = z.union([z.literal(''), z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'An amount like 5 or 5.50.')])

const schema = z
  .object({
    who: z.enum(['student', 'staff']),
    student: z.custom<Student | null>(),
    staff: z.string(),
    campus: z.string().min(1, 'Choose a branch.'),
    max_books: optionalWholeNumber,
    loan_period_days: optionalWholeNumber,
    daily_fine_rate: rate,
  })
  .refine((v) => (v.who === 'student' ? v.student != null : v.staff !== ''), { path: ['staff'], message: 'Choose who this membership is for.' })

/** New memberships take the usual limits for students or staff unless you set them. */
function MemberDialog({ open, record, onOpenChange }: { open: boolean; record: Member | null; onOpenChange: (o: boolean) => void }) {
  const { isMultiBranch, branches, selectedBranchId, defaultBranchId } = useBranches()
  const staff = useStaffOptions()
  const create = useCreateMember()
  const update = useUpdateMember()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={record ? `Edit ${record.full_name}’s membership` : 'New library member'}
      description={record ? undefined : 'Leave the limits empty to use the usual ones for students or staff.'}
      schema={schema}
      defaultValues={{
        who: (record?.staff ? 'staff' : 'student') as 'student' | 'staff',
        student: null,
        staff: record?.staff ? String(record.staff) : '',
        campus: String(record?.campus ?? selectedBranchId ?? defaultBranchId ?? ''),
        max_books: record?.max_books != null ? String(record.max_books) : '',
        loan_period_days: record?.loan_period_days != null ? String(record.loan_period_days) : '',
        daily_fine_rate: record?.daily_fine_rate ?? '',
      }}
      onSubmit={async (v) => {
        const limits = {
          ...(v.max_books ? { max_books: Number(v.max_books) } : {}),
          ...(v.loan_period_days ? { loan_period_days: Number(v.loan_period_days) } : {}),
          ...(v.daily_fine_rate ? { daily_fine_rate: v.daily_fine_rate } : {}),
        }
        if (record) {
          await update.mutateAsync({ id: record.id, input: limits })
          toast.success('Membership saved.')
          return
        }
        const input: MemberInput = { campus: Number(v.campus), ...(v.who === 'student' ? { student: v.student!.id } : { staff: Number(v.staff) }), ...limits }
        const m = await create.mutateAsync(input)
        toast.success(`${m.full_name} is member ${m.member_number}.`)
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          {!record && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Member is">
                  {(p) => <Controller control={control} name="who" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('MembershipTypeEnum')} />} />}
                </FormField>
                {isMultiBranch && (
                  <FormField label="Library (branch)" required error={errors.campus?.message}>
                    {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
                  </FormField>
                )}
              </div>
              {watch('who') === 'student' ? (
                <FormField label="Student" required error={errors.staff?.message ?? errors.student?.message}>
                  {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
                </FormField>
              ) : (
                <FormField label="Staff member" required error={errors.staff?.message}>
                  {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} loading={staff.isPending} />} />}
                </FormField>
              )}
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Books at once" error={errors.max_books?.message}>
              <Input {...register('max_books')} inputMode="numeric" placeholder="Usual" />
            </FormField>
            <FormField label="Loan days" error={errors.loan_period_days?.message}>
              <Input {...register('loan_period_days')} inputMode="numeric" placeholder="Usual" />
            </FormField>
            <FormField label="Fine per late day" error={errors.daily_fine_rate?.message}>
              <Input {...register('daily_fine_rate')} inputMode="decimal" placeholder="Usual" />
            </FormField>
          </div>
        </>
      )}
    </FormDialog>
  )
}

export default function MembersPage() {
  const navigate = useNavigate()
  const { isMultiBranch, branchName, selectedBranchId } = useBranches()
  const list = useListState({ filters: ['membership_type', 'is_active'] })
  const query = useMembers({ ...list.query, campus: selectedBranchId ?? undefined })
  const deactivate = useDeactivateMember()
  const [editing, setEditing] = useState<Member | 'new' | null>(null)
  const [leaving, setLeaving] = useState<Member | null>(null)
  const columns: Column<Member>[] = [
    { id: 'number', header: 'Member no.', className: 'font-mono text-xs', cell: (m) => m.member_number },
    { id: 'name', header: 'Name', mobile: 'title', cell: (m) => <span className="font-medium">{m.full_name}</span> },
    { id: 'type', header: 'Type', cell: (m) => enumLabel('MembershipTypeEnum', m.membership_type) },
    { id: 'campus', header: 'Branch', hidden: !isMultiBranch, cell: (m) => branchName(m.campus) },
    { id: 'out', header: 'Books out', className: 'tabular-nums', cell: (m) => `${m.active_issues} of ${m.max_books ?? '?'}` },
    { id: 'terms', header: 'Loan · fine', mobile: 'hidden', cell: (m) => (
      <span>
        {m.loan_period_days} days · <Money value={m.daily_fine_rate} />/day
      </span>
    ) },
    { id: 'joined', header: 'Joined', mobile: 'hidden', className: 'tabular-nums', cell: (m) => formatDate(m.joined_on) },
    { id: 'status', header: 'Status', cell: (m) => <StatusBadge status={m.is_active === false ? 'inactive' : 'active'} label={m.is_active === false ? 'Inactive' : 'Active'} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Library members"
        columns={columns}
        query={query}
        list={list}
        getRowId={(m) => m.id}
        searchPlaceholder="Name, member or student no.…"
        toolbar={
          <PermissionGate permission={PERMS.library.manage}>
            <Button onClick={() => setEditing('new')}>
              <UserPlus aria-hidden /> New member
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'membership_type', label: 'Type', options: enumOptions('MembershipTypeEnum') },
          { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] },
        ]}
        rowActions={(m) => (
          <RowActions
            actions={[
              { label: 'Loans', icon: BookOpen, onSelect: () => navigate(`/library/loans?member=${m.id}`) },
              { label: 'Edit limits', icon: Pencil, permission: PERMS.library.manage, onSelect: () => setEditing(m) },
              { label: 'Deactivate', icon: UserMinus, permission: PERMS.library.manage, hidden: m.is_active === false, destructive: true, onSelect: () => setLeaving(m) },
            ]}
          />
        )}
        empty={{ title: 'No members yet', description: 'Students and staff need a membership to borrow.' }}
      />
      <MemberDialog open={editing !== null} record={editing === 'new' ? null : editing} onOpenChange={(o) => !o && setEditing(null)} />
      <ConfirmDialog
        open={leaving != null}
        onOpenChange={(o) => !o && setLeaving(null)}
        title={leaving ? `Deactivate ${leaving.full_name}?` : 'Deactivate'}
        description="They can’t borrow any more. Only possible once every book is back."
        confirmLabel="Deactivate"
        tone="destructive"
        onConfirm={async () => {
          await deactivate.mutateAsync(leaving!.id)
          toast.success('Membership deactivated.')
        }}
      />
    </>
  )
}
