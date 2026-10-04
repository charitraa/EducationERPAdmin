import { CalendarX2, FilePlus2, Link2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useDepartmentOptions } from '@/features/academics/departments/hooks/useDepartments'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { Expiry } from '@/components/data-display/Expiry'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, todayIso } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { isoDate, optionalIsoDate, optionalWholeNumber } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import type { Contract, EmployeeProfile, StaffDocument } from '../api/hr.api'
import {
  useContracts,
  useCreateContract,
  useCreateProfile,
  useCreateStaffDocument,
  useEndContract,
  usePositionOptions,
  useProfiles,
  useRemoveContract,
  useRemoveProfile,
  useRemoveStaffDocument,
  useStaffDocuments,
  useUpdateContract,
  useUpdateProfile,
  useUpdateStaffDocument,
} from '../hooks/useHr'

const blankToNull = (v: string) => (v === '' ? null : v)
const idOrNull = (v: string) => (v === '' ? null : Number(v))

/** Whether a contract is running today, still to start, or over. */
export function contractState(c: Pick<Contract, 'start_date' | 'end_date'>) {
  const today = todayIso()
  if (c.start_date > today) return { status: 'scheduled', label: 'Starts later', tone: 'info' as const }
  if (c.end_date && c.end_date < today) return { status: 'closed', label: 'Ended', tone: 'muted' as const }
  return { status: 'active', label: 'Current', tone: 'success' as const }
}

export const contractPeriod = (c: Pick<Contract, 'start_date' | 'end_date'>) => `${formatDate(c.start_date)} – ${c.end_date ? formatDate(c.end_date) : 'open-ended'}`

const contractSchema = z
  .object({
    staff: z.string().min(1, 'Choose a staff member.'),
    kind: z.string().min(1),
    position: z.string(),
    department: z.string(),
    start_date: isoDate,
    end_date: optionalIsoDate,
    probation_ends_on: optionalIsoDate,
    notice_period_days: optionalWholeNumber,
    reference: z.string().max(100),
    notes: z.string(),
  })
  .refine((v) => !v.end_date || v.end_date >= v.start_date, { path: ['end_date'], message: 'Must not be before the start.' })

export function ContractDialog({ open, record, staffId, onOpenChange }: { open: boolean; record: Contract | null; staffId?: Id; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const positions = usePositionOptions()
  const departments = useDepartmentOptions()
  const create = useCreateContract()
  const update = useUpdateContract()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit contract · ${record.staff_name}` : 'New contract'}
      description={record ? undefined : 'One contract at a time: end the current one before the next starts.'}
      wide
      schema={contractSchema}
      defaultValues={{
        staff: String(record?.staff ?? staffId ?? ''),
        kind: record?.kind ?? 'permanent',
        position: record?.position ? String(record.position) : '',
        department: record?.department ? String(record.department) : '',
        start_date: record?.start_date ?? todayIso(),
        end_date: record?.end_date ?? '',
        probation_ends_on: record?.probation_ends_on ?? '',
        notice_period_days: record?.notice_period_days != null ? String(record.notice_period_days) : '',
        reference: record?.reference ?? '',
        notes: record?.notes ?? '',
      }}
      onSubmit={async (v) => {
        const input = {
          ...v,
          staff: Number(v.staff),
          kind: v.kind as Contract['kind'],
          position: idOrNull(v.position),
          department: idOrNull(v.department),
          end_date: blankToNull(v.end_date),
          probation_ends_on: blankToNull(v.probation_ends_on),
          notice_period_days: v.notice_period_days ? Number(v.notice_period_days) : null,
        }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Contract saved.' : 'Contract added.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {!staffId && (
              <FormField label="Staff member" required error={errors.staff?.message} className="sm:col-span-2">
                {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} disabled={record !== null} placeholder="Choose…" />} />}
              </FormField>
            )}
            <FormField label="Kind" required>
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ContractKindEnum')} />} />}
            </FormField>
            <FormField label="Position" error={errors.position?.message} description={positions.length === 0 ? 'Add positions under Setup.' : undefined}>
              {(p) => <Controller control={control} name="position" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={positions} />} />}
            </FormField>
            <FormField label="Department" error={errors.department?.message}>
              {(p) => <Controller control={control} name="department" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={departments.data ?? []} />} />}
            </FormField>
            <FormField label="Reference" error={errors.reference?.message}>
              <Input {...register('reference')} maxLength={100} placeholder="Appointment letter no." />
            </FormField>
            <FormField label="Starts" required error={errors.start_date?.message}>
              {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label="Ends (inclusive)" error={errors.end_date?.message} description="Empty: open-ended.">
              {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            {(watch('kind') === 'probation' || watch('probation_ends_on')) && (
              <FormField label="Probation ends" error={errors.probation_ends_on?.message}>
                {(p) => <Controller control={control} name="probation_ends_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            )}
            <FormField label="Notice period (days)" error={errors.notice_period_days?.message}>
              <Input {...register('notice_period_days')} inputMode="numeric" />
            </FormField>
          </div>
          <FormField label="Notes">
            <Textarea {...register('notes')} rows={2} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

export function EndContractDialog({ contract, onOpenChange }: { contract: Contract | null; onOpenChange: (o: boolean) => void }) {
  const end = useEndContract()
  return (
    <FormDialog
      open={contract !== null}
      onOpenChange={onOpenChange}
      title="End this contract"
      description={contract ? `${contract.staff_name} · ${enumLabel('ContractKindEnum', contract.kind)} from ${formatDate(contract.start_date)}.` : ''}
      submitLabel="End contract"
      schema={z.object({ end_date: isoDate, reason: z.string().max(255) })}
      defaultValues={{ end_date: todayIso(), reason: '' }}
      onSubmit={async (v) => {
        await end.mutateAsync({ id: contract!.id, ...v })
        toast.success('Contract ended.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Last day" required error={errors.end_date?.message}>
            {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
          <FormField label="Reason" error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder="Renewed as permanent" />
          </FormField>
        </div>
      )}
    </FormDialog>
  )
}

/** Everyone's employment terms, current and past. */
export function ContractsPage() {
  const list = useListState({ filters: ['kind', 'position', 'department', 'staff'] })
  const query = useContracts(list.query)
  const positions = usePositionOptions()
  const departments = useDepartmentOptions()
  const staff = useStaffOptions()
  const crud = useCrudState<Contract>()
  const remove = useRemoveContract()
  const [ending, setEnding] = useState<Contract | null>(null)
  const columns: Column<Contract>[] = [
    { id: 'who', header: 'Staff member', mobile: 'title', cell: (c) => (
      <Link to={`/staff/${c.staff}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
        {c.staff_name}
      </Link>
    ) },
    { id: 'kind', header: 'Kind', cell: (c) => enumLabel('ContractKindEnum', c.kind) },
    { id: 'position', header: 'Position', cell: (c) => [c.position_name, c.department_name].filter(Boolean).join(' · ') || '—' },
    { id: 'period', header: 'Period', className: 'whitespace-nowrap tabular-nums', cell: (c) => contractPeriod(c) },
    { id: 'ref', header: 'Reference', mobile: 'hidden', className: 'font-mono text-xs', cell: (c) => c.reference || '—' },
    { id: 'state', header: '', cell: (c) => { const s = contractState(c); return <StatusBadge status={s.status} tone={s.tone} label={s.label} /> } },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Contracts"
        columns={columns}
        query={query}
        list={list}
        getRowId={(c) => c.id}
        searchPlaceholder="Name, employee no. or reference…"
        toolbar={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> New contract
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'kind', label: 'Kind', options: enumOptions('ContractKindEnum') },
          { name: 'position', label: 'Position', options: positions },
          { name: 'department', label: 'Department', options: departments.data ?? [] },
          { name: 'staff', label: 'Staff member', options: staff.data ?? [], hidden: !staff.canPick },
        ]}
        rowActions={(c) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.hr.manage, onSelect: () => crud.openEdit(c) },
              { label: 'End contract', icon: CalendarX2, permission: PERMS.hr.manage, hidden: contractState(c).status === 'closed', onSelect: () => setEnding(c) },
              { label: 'Delete', icon: Trash2, permission: PERMS.hr.manage, hidden: c.start_date <= todayIso(), destructive: true, onSelect: () => crud.openDelete(c) },
            ]}
          />
        )}
        empty={{ title: 'No contracts yet', description: 'Record the terms each staff member works under: kind, position, department and dates.' }}
      />
      <ContractDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <EndContractDialog contract={ending} onOpenChange={(o) => !o && setEnding(null)} />
      <DeleteDialog
        open={crud.deleting !== null}
        onOpenChange={(o) => !o && crud.closeDelete()}
        subject="this contract"
        description="Only a contract that hasn’t started can be deleted."
        onConfirm={() => remove.mutateAsync(crud.deleting!.id)}
      />
    </>
  )
}

const profileSchema = z.object({
  staff: z.string().min(1, 'Choose a staff member.'),
  pan_number: z.string().max(20),
  tax_status: z.string(),
  citizenship_number: z.string().max(50),
  bank_name: z.string().max(150),
  bank_branch: z.string().max(150),
  bank_account_name: z.string().max(150),
  bank_account_number: z.string().max(50),
  ssf_number: z.string().max(50),
  pf_number: z.string().max(50),
  cit_number: z.string().max(50),
  emergency_contact_name: z.string().max(150),
  emergency_contact_phone: z.string().max(32),
  emergency_contact_relation: z.string().max(50),
})
type ProfileValues = z.infer<typeof profileSchema>
const PROFILE_TEXT = ['pan_number', 'citizenship_number', 'bank_name', 'bank_branch', 'bank_account_name', 'bank_account_number', 'ssf_number', 'pf_number', 'cit_number', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'] as const

export function ProfileDialog({ open, record, staffId, onOpenChange }: { open: boolean; record: EmployeeProfile | null; staffId?: Id; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const create = useCreateProfile()
  const update = useUpdateProfile()
  const text = (name: (typeof PROFILE_TEXT)[number]) => record?.[name] ?? ''
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `HR profile · ${record.staff_name}` : 'Add HR profile'}
      description="What payroll needs beyond the staff directory: tax, bank and fund details."
      wide
      schema={profileSchema}
      defaultValues={{ staff: String(record?.staff ?? staffId ?? ''), tax_status: record?.tax_status ?? 'single', ...(Object.fromEntries(PROFILE_TEXT.map((n) => [n, text(n)])) as Omit<ProfileValues, 'staff' | 'tax_status'>) }}
      onSubmit={async (v) => {
        const input = { ...v, staff: Number(v.staff), tax_status: v.tax_status as EmployeeProfile['tax_status'] }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success('HR profile saved.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          {!staffId && !record && (
            <FormField label="Staff member" required error={errors.staff?.message}>
              {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} placeholder="Choose…" />} />}
            </FormField>
          )}
          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold">Tax and identity</legend>
            <FormField label="PAN" error={errors.pan_number?.message}>
              <Input {...register('pan_number')} className="font-mono" />
            </FormField>
            <FormField label="Files tax as" description="Picks single or couple slabs.">
              {(p) => <Controller control={control} name="tax_status" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('TaxStatusEnum')} />} />}
            </FormField>
            <FormField label="Citizenship no." error={errors.citizenship_number?.message}>
              <Input {...register('citizenship_number')} className="font-mono" />
            </FormField>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">Bank account (for salary)</legend>
            <FormField label="Bank">
              <Input {...register('bank_name')} />
            </FormField>
            <FormField label="Branch">
              <Input {...register('bank_branch')} />
            </FormField>
            <FormField label="Account name">
              <Input {...register('bank_account_name')} />
            </FormField>
            <FormField label="Account number" error={errors.bank_account_number?.message}>
              <Input {...register('bank_account_number')} className="font-mono" />
            </FormField>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold">Funds</legend>
            <FormField label="SSF no.">
              <Input {...register('ssf_number')} className="font-mono" />
            </FormField>
            <FormField label="PF no.">
              <Input {...register('pf_number')} className="font-mono" />
            </FormField>
            <FormField label="CIT no.">
              <Input {...register('cit_number')} className="font-mono" />
            </FormField>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="mb-2 text-sm font-semibold">Emergency contact</legend>
            <FormField label="Name">
              <Input {...register('emergency_contact_name')} />
            </FormField>
            <FormField label="Phone">
              <Input {...register('emergency_contact_phone')} inputMode="tel" />
            </FormField>
            <FormField label="Relation">
              <Input {...register('emergency_contact_relation')} placeholder="Spouse" />
            </FormField>
          </fieldset>
        </>
      )}
    </FormDialog>
  )
}

/** HR profiles: PAN, tax status, bank and fund numbers payroll relies on. */
export function ProfilesPage() {
  const list = useListState({ filters: ['tax_status'] })
  const query = useProfiles(list.query)
  const crud = useCrudState<EmployeeProfile>()
  const remove = useRemoveProfile()
  const columns: Column<EmployeeProfile>[] = [
    { id: 'who', header: 'Staff member', mobile: 'title', cell: (p) => (
      <span>
        <span className="font-medium">{p.staff_name}</span> <span className="font-mono text-xs text-muted-foreground">{p.employee_number}</span>
      </span>
    ) },
    { id: 'pan', header: 'PAN', className: 'font-mono text-xs', cell: (p) => p.pan_number || '—' },
    { id: 'tax', header: 'Files as', cell: (p) => enumLabel('TaxStatusEnum', p.tax_status) },
    { id: 'bank', header: 'Bank account', cell: (p) => (p.bank_account_number ? <span>{p.bank_name} <span className="font-mono text-xs">{p.bank_account_number}</span></span> : <span className="text-warning">Missing</span>) },
    { id: 'funds', header: 'Funds', mobile: 'hidden', cell: (p) => [p.ssf_number && 'SSF', p.pf_number && 'PF', p.cit_number && 'CIT'].filter(Boolean).join(', ') || '—' },
  ]
  return (
    <>
      <DataTable
        ariaLabel="HR profiles"
        columns={columns}
        query={query}
        list={list}
        getRowId={(p) => p.id}
        searchPlaceholder="Name, employee no. or PAN…"
        onRowClick={crud.openEdit}
        toolbar={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> Add profile
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'tax_status', label: 'Files as', options: enumOptions('TaxStatusEnum') }]}
        rowActions={(p) => <RowActions actions={[{ label: 'Delete', icon: Trash2, permission: PERMS.hr.manage, destructive: true, onSelect: () => crud.openDelete(p) }]} />}
        empty={{ title: 'No HR profiles yet', description: 'Payroll needs each person’s PAN, tax status and bank account. Add them here or from a staff member’s page.' }}
      />
      <ProfileDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <DeleteDialog open={crud.deleting !== null} onOpenChange={(o) => !o && crud.closeDelete()} subject={`${crud.deleting?.staff_name}’s HR profile`} onConfirm={() => remove.mutateAsync(crud.deleting!.id)} />
    </>
  )
}

const documentSchema = z
  .object({ staff: z.string().min(1, 'Choose a staff member.'), kind: z.string(), title: z.string().trim().min(1, 'Required.').max(200), number: z.string().max(100), issued_by: z.string().max(150), issued_on: optionalIsoDate, expires_on: optionalIsoDate, file_url: z.union([z.literal(''), z.string().url('A full link, starting https://')]), notes: z.string() })
  .refine((v) => !v.issued_on || !v.expires_on || v.expires_on >= v.issued_on, { path: ['expires_on'], message: 'Must not be before the issue date.' })

export function DocumentDialog({ open, record, staffId, onOpenChange }: { open: boolean; record: StaffDocument | null; staffId?: Id; onOpenChange: (o: boolean) => void }) {
  const staff = useStaffOptions()
  const create = useCreateStaffDocument()
  const update = useUpdateStaffDocument()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.title}` : 'Add document'}
      description="A record of a document held. Keep the scan where you already store files and paste its link."
      schema={documentSchema}
      defaultValues={{ staff: String(record?.staff ?? staffId ?? ''), kind: record?.kind ?? 'citizenship', title: record?.title ?? '', number: record?.number ?? '', issued_by: record?.issued_by ?? '', issued_on: record?.issued_on ?? '', expires_on: record?.expires_on ?? '', file_url: record?.file_url ?? '', notes: record?.notes ?? '' }}
      onSubmit={async (v) => {
        const input = { ...v, staff: Number(v.staff), kind: v.kind as StaffDocument['kind'], issued_on: blankToNull(v.issued_on), expires_on: blankToNull(v.expires_on) }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success('Document saved.')
      }}
    >
      {({ register, control, setValue, getValues, formState: { errors } }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          {!staffId && !record && (
            <FormField label="Staff member" required error={errors.staff?.message} className="sm:col-span-2">
              {(p) => <Controller control={control} name="staff" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={staff.data ?? []} placeholder="Choose…" />} />}
            </FormField>
          )}
          <FormField label="Kind">
            {(p) => (
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <SelectControl
                    {...p}
                    value={field.value}
                    onChange={(k) => {
                      if (!getValues('title') || getValues('title') === enumLabel('StaffDocumentKindEnum', field.value)) setValue('title', enumLabel('StaffDocumentKindEnum', k))
                      field.onChange(k)
                    }}
                    options={enumOptions('StaffDocumentKindEnum')}
                  />
                )}
              />
            )}
          </FormField>
          <FormField label="Title" required error={errors.title?.message}>
            <Input {...register('title')} maxLength={200} placeholder="Citizenship" />
          </FormField>
          <FormField label="Number" error={errors.number?.message}>
            <Input {...register('number')} className="font-mono" />
          </FormField>
          <FormField label="Issued by" error={errors.issued_by?.message}>
            <Input {...register('issued_by')} placeholder="DAO Kathmandu" />
          </FormField>
          <FormField label="Issued on" error={errors.issued_on?.message}>
            {(p) => <Controller control={control} name="issued_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
          <FormField label="Expires on" error={errors.expires_on?.message}>
            {(p) => <Controller control={control} name="expires_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
          </FormField>
          <FormField label="Link to the scan" error={errors.file_url?.message} className="sm:col-span-2">
            <Input {...register('file_url')} inputMode="url" placeholder="https://drive.google.com/…" />
          </FormField>
          <FormField label="Notes" className="sm:col-span-2">
            <Textarea {...register('notes')} rows={2} />
          </FormField>
        </div>
      )}
    </FormDialog>
  )
}

export function documentColumns(withStaff: boolean): Column<StaffDocument>[] {
  return [
    ...(withStaff ? [{ id: 'who', header: 'Staff member', cell: (d: StaffDocument) => d.staff_name } satisfies Column<StaffDocument>] : []),
    { id: 'title', header: 'Document', mobile: 'title', cell: (d) => (
      <span className="font-medium">
        {d.title}
        {d.file_url && (
          <a href={d.file_url} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex align-middle text-primary" aria-label="Open the scan" onClick={(e) => e.stopPropagation()}>
            <Link2 className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </span>
    ) },
    { id: 'kind', header: 'Kind', mobile: 'hidden', cell: (d) => enumLabel('StaffDocumentKindEnum', d.kind) },
    { id: 'number', header: 'Number', className: 'font-mono text-xs', cell: (d) => d.number || '—' },
    { id: 'expires', header: 'Expires', cell: (d) => <Expiry on={d.expires_on} /> },
  ]
}

/** Documents on file for every staff member, with a view of what's expiring. */
export function DocumentsPage() {
  const list = useListState({ filters: ['kind', 'staff', 'expiring_within'] })
  const query = useStaffDocuments(list.query)
  const staff = useStaffOptions()
  const crud = useCrudState<StaffDocument>()
  const remove = useRemoveStaffDocument()
  return (
    <>
      <DataTable
        ariaLabel="Staff documents"
        columns={documentColumns(true)}
        query={query}
        list={list}
        getRowId={(d) => d.id}
        searchPlaceholder="Title, number or name…"
        onRowClick={crud.openEdit}
        toolbar={
          <PermissionGate permission={PERMS.hr.manage}>
            <Button onClick={crud.openCreate}>
              <FilePlus2 aria-hidden /> Add document
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'kind', label: 'Kind', options: enumOptions('StaffDocumentKindEnum') },
          { name: 'expiring_within', label: 'Expiry', options: [{ value: '0', label: 'Already expired' }, { value: '30', label: 'Within 30 days' }, { value: '90', label: 'Within 90 days' }] },
          { name: 'staff', label: 'Staff member', options: staff.data ?? [], hidden: !staff.canPick },
        ]}
        rowActions={(d) => <RowActions actions={[{ label: 'Delete', icon: Trash2, permission: PERMS.hr.manage, destructive: true, onSelect: () => crud.openDelete(d) }]} />}
        empty={{ title: 'No documents on file', description: 'Record citizenship, PAN cards, certificates and licences, with their expiry dates.' }}
      />
      <DocumentDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} />
      <DeleteDialog open={crud.deleting !== null} onOpenChange={(o) => !o && crud.closeDelete()} subject={crud.deleting?.title ?? 'document'} onConfirm={() => remove.mutateAsync(crud.deleting!.id)} />
    </>
  )
}
