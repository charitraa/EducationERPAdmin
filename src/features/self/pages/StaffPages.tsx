import { Ban, Boxes, Briefcase, CalendarPlus, FileText, Printer, Receipt, Users } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { EmptyState } from '@/components/data-display/EmptyState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { InterviewDialogs, interviewActions, InterviewStatus } from '@/features/careers/pages/CandidatePages'
import { MyPapers } from '@/features/examinations/pages/MarkSheetsPage'
import { Money } from '@/features/finance/components/money'
import type { LeaveRequest } from '@/features/hr/api/hr.api'
import { useApplyLeave, useCancelLeave, useLeaveTypeOptions, useMyBalances, useMyLeave } from '@/features/hr/hooks/useHr'
import { days, LeaveStatus, leaveSpan } from '@/features/hr/pages/LeavePages'
import { PayslipDocument } from '@/features/payroll/pages/PayslipPages'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime, todayIso } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { isoDate } from '@/lib/validation'
import { Block, Figure, Loaded, MiniTable, Note } from '../components/SelfParts'
import { useMyAssets, useMyContracts, useMyDocuments, useMyHrProfile, useMyInterviews, useMyPayslips } from '../hooks/useSelf'

// ---------------------------------------------------------------------------
// Leave
// ---------------------------------------------------------------------------
const applySchema = z
  .object({ leave_type: z.string().min(1, 'Choose a type.'), start_date: isoDate, end_date: isoDate, half_day: z.boolean(), reason: z.string().max(2000) })
  .refine((v) => v.half_day || v.end_date >= v.start_date, { path: ['end_date'], message: 'Must not be before the start.' })

function ApplyLeaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { options } = useLeaveTypeOptions()
  const apply = useApplyLeave()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Apply for leave"
      description="Your approver is told; you’ll get a notification when it’s decided."
      submitLabel="Apply"
      schema={applySchema}
      defaultValues={{ leave_type: '', start_date: todayIso(), end_date: todayIso(), half_day: false, reason: '' }}
      onSubmit={async (v) => {
        await apply.mutateAsync({ leave_type: Number(v.leave_type), start_date: v.start_date, end_date: v.half_day ? v.start_date : v.end_date, half_day: v.half_day, reason: v.reason })
        toast.success('Leave requested.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <FormField label="Type" required error={errors.leave_type?.message}>
            {(p) => <Controller control={control} name="leave_type" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={options} placeholder="Choose…" />} />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={watch('half_day') ? 'Date' : 'From'} required error={errors.start_date?.message}>
              {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            {!watch('half_day') && (
              <FormField label="To" required error={errors.end_date?.message}>
                {(p) => <Controller control={control} name="end_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            )}
          </div>
          <Controller
            control={control}
            name="half_day"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Half a day
              </label>
            )}
          />
          <FormField label="Reason">
            <Textarea {...register('reason')} rows={3} />
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

/** My balances this fiscal year, my requests, and applying for more. */
export function MyLeavePage() {
  const balances = useMyBalances()
  const requests = useMyLeave()
  const cancel = useCancelLeave()
  const [applying, setApplying] = useState(false)
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null)
  return (
    <div className="grid gap-6">
      <Block
        title="Balances"
        description="This fiscal year: what you’re entitled to, what’s used, and what’s left."
        action={
          <Button size="sm" onClick={() => setApplying(true)}>
            <CalendarPlus aria-hidden /> Apply for leave
          </Button>
        }
      >
        <Loaded query={balances}>
          {(rows) =>
            rows.length === 0 ? (
              <Note>No leave balances yet; HR opens them at the start of the fiscal year.</Note>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {rows.map((b) => (
                  <Figure key={b.id} label={b.leave_type_name} value={days(b.available)} hint={`of ${days(b.total)} · ${days(b.used)} used${Number(b.pending) ? ` · ${days(b.pending)} pending` : ''}`} />
                ))}
              </div>
            )
          }
        </Loaded>
      </Block>
      <Block title="Requests">
        <Loaded query={requests}>
          {(rows) => (
            <MiniTable
              label="My leave requests"
              rows={rows}
              rowKey={(r) => r.id}
              empty={{ title: 'No leave requested yet' }}
              columns={[
                { header: 'Type', cell: (r) => r.leave_type_name },
                { header: 'When', cell: (r) => leaveSpan(r) },
                { header: 'Status', cell: (r) => <LeaveStatus status={r.status} /> },
                { header: 'Reason', cell: (r) => r.reason || '—' },
                { header: 'Decision', cell: (r) => r.decision_note || (r.decided_at ? formatDate(r.decided_at) : '—') },
                {
                  header: '',
                  className: 'text-right',
                  cell: (r) =>
                    r.status === 'pending' || (r.status === 'approved' && r.start_date > todayIso()) ? (
                      <Button size="sm" variant="ghost" onClick={() => setCancelling(r)}>
                        <Ban aria-hidden /> Cancel
                      </Button>
                    ) : null,
                },
              ]}
            />
          )}
        </Loaded>
      </Block>
      <ApplyLeaveDialog open={applying} onOpenChange={setApplying} />
      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(o) => !o && setCancelling(null)}
        title="Cancel this leave?"
        description={cancelling ? `${cancelling.leave_type_name}, ${leaveSpan(cancelling)}. The days go back to your balance.` : undefined}
        confirmLabel="Cancel leave"
        tone="destructive"
        onConfirm={async () => {
          await cancel.mutateAsync(cancelling!.id)
          toast.success('Leave cancelled.')
          setCancelling(null)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payslips
// ---------------------------------------------------------------------------
export function MyPayslipsPage() {
  const q = useMyPayslips()
  return (
    <Loaded query={q}>
      {(rows) => (
        <MiniTable
          label="My payslips"
          rows={rows}
          rowKey={(p) => p.id}
          empty={{ title: 'No payslips yet', icon: Receipt, description: 'A payslip appears once its payroll run is approved.' }}
          columns={[
            {
              header: 'Period',
              cell: (p) => (
                <Link to={`/me/payslips/${p.id}`} className="font-medium text-primary hover:underline">
                  {p.run_name}
                </Link>
              ),
            },
            { header: 'Number', cell: (p) => <span className="font-mono text-xs">{p.number}</span> },
            { header: 'Gross', cell: (p) => <Money value={p.gross_pay} tone="none" />, className: 'text-right' },
            { header: 'Deductions', cell: (p) => <Money value={p.total_deductions} tone="none" />, className: 'text-right' },
            { header: 'Net pay', cell: (p) => <Money value={p.net_pay} tone="none" className="font-medium" />, className: 'text-right' },
            { header: 'Status', cell: (p) => <StatusBadge status={p.run_status} label={enumLabel('PayrollRunStatusEnum', p.run_status)} /> },
          ]}
        />
      )}
    </Loaded>
  )
}

/** One of my payslips, to read or print. Comes from the list: there is no own-payslip detail endpoint. */
export function MyPayslipPage() {
  const id = Number(useParams().id)
  const q = useMyPayslips()
  return (
    <Loaded query={q}>
      {(rows) => {
        const p = rows.find((r) => r.id === id)
        if (!p) return <EmptyState title="Payslip not found" description={<Link to="/me/payslips" className="text-primary hover:underline">Back to my payslips</Link>} />
        return (
          <div className="mx-auto max-w-3xl">
            <PageHeader
              className="print:hidden"
              backTo="/me/payslips"
              title={`Payslip ${p.number}`}
              description={p.run_name}
              actions={
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer aria-hidden /> Print
                </Button>
              }
            />
            <PayslipDocument p={p} />
          </div>
        )
      }}
    </Loaded>
  )
}

// ---------------------------------------------------------------------------
// Employment: contracts, HR details, documents
// ---------------------------------------------------------------------------
function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  )
}

export function MyEmploymentPage() {
  const contracts = useMyContracts()
  const profile = useMyHrProfile()
  const documents = useMyDocuments()
  return (
    <div className="grid gap-6">
      <Block title="Contracts">
        <Loaded query={contracts}>
          {(rows) => (
            <MiniTable
              label="My contracts"
              rows={rows}
              rowKey={(c) => c.id}
              empty={{ title: 'No contract on file', icon: Briefcase }}
              columns={[
                { header: 'Kind', cell: (c) => enumLabel('ContractKindEnum', c.kind) },
                { header: 'Position', cell: (c) => [c.position_name, c.department_name].filter(Boolean).join(' · ') || '—' },
                { header: 'From', cell: (c) => formatDate(c.start_date) },
                { header: 'Until', cell: (c) => (c.end_date ? formatDate(c.end_date) : 'Open-ended') },
                { header: 'Probation ends', cell: (c) => formatDate(c.probation_ends_on) },
                { header: 'Notice', cell: (c) => (c.notice_period_days ? `${c.notice_period_days} days` : '—') },
              ]}
            />
          )}
        </Loaded>
      </Block>
      <Block title="HR details" description="What payroll uses. Ask HR to correct anything wrong.">
        <Loaded query={profile}>
          {(p) =>
            p == null ? (
              <Note>HR hasn’t set up your profile yet.</Note>
            ) : (
              <dl className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-3">
                <Detail label="PAN" value={p.pan_number} />
                <Detail label="Tax status" value={enumLabel('TaxStatusEnum', p.tax_status)} />
                <Detail label="SSF number" value={p.ssf_number} />
                <Detail label="Bank" value={[p.bank_name, p.bank_branch].filter(Boolean).join(', ')} />
                <Detail label="Account" value={[p.bank_account_name, p.bank_account_number].filter(Boolean).join(' · ')} />
                <Detail label="Emergency contact" value={p.emergency_contact_name ? `${p.emergency_contact_name} (${p.emergency_contact_relation || 'contact'}) · ${p.emergency_contact_phone ?? ''}` : null} />
              </dl>
            )
          }
        </Loaded>
      </Block>
      <Block title="Documents on file">
        <Loaded query={documents}>
          {(rows) => (
            <MiniTable
              label="My documents"
              rows={rows}
              rowKey={(d) => d.id}
              empty={{ title: 'No documents on file', icon: FileText }}
              columns={[
                {
                  header: 'Document',
                  cell: (d) =>
                    d.file_url ? (
                      <a href={d.file_url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                        {d.title}
                      </a>
                    ) : (
                      d.title
                    ),
                },
                { header: 'Kind', cell: (d) => enumLabel('StaffDocumentKindEnum', d.kind) },
                { header: 'Number', cell: (d) => d.number || '—' },
                { header: 'Expires', cell: (d) => formatDate(d.expires_on) },
              ]}
            />
          )}
        </Loaded>
      </Block>
    </div>
  )
}

export function MyAssetsPage() {
  const q = useMyAssets()
  return (
    <Block title="Assets with you" description="Equipment the school has handed to you. Tell the store if something’s wrong.">
      <Loaded query={q}>
        {(rows) => (
          <MiniTable
            label="My assets"
            rows={rows}
            rowKey={(a) => a.id}
            empty={{ title: 'No assets assigned to you', icon: Boxes }}
            columns={[
              { header: 'Item', cell: (a) => a.item_name },
              { header: 'Tag', cell: (a) => <span className="font-mono text-xs">{a.tag}</span> },
              { header: 'Serial', cell: (a) => a.serial_number || '—' },
              { header: 'Condition', cell: (a) => enumLabel('ConditionEnum', a.condition) },
              { header: 'Warranty until', cell: (a) => formatDate(a.warranty_until) },
            ]}
          />
        )}
      </Loaded>
    </Block>
  )
}

export function MyMarkingPage() {
  return (
    <Block title="Papers to mark" description="Papers of scheduled exams, for the classes and subjects you teach.">
      <MyPapers />
    </Block>
  )
}

// ---------------------------------------------------------------------------
// Interviews (on the panel)
// ---------------------------------------------------------------------------
export function MyInterviewsPage() {
  const q = useMyInterviews()
  const [acting, setActing] = useState<Parameters<typeof InterviewDialogs>[0]['acting']>(null)
  return (
    <Block title="Interviews" description="Interviews you sit on the panel for.">
      <Loaded query={q}>
        {(rows) => (
          <MiniTable
            label="My interviews"
            rows={rows}
            rowKey={(i) => i.id}
            empty={{ title: 'No interviews', icon: Users }}
            columns={[
              { header: 'Candidate', cell: (i) => i.candidate },
              { header: 'For', cell: (i) => `${i.vacancy_title} · round ${i.round}` },
              { header: 'When', cell: (i) => formatDateTime(i.scheduled_at) },
              { header: 'Where', cell: (i) => [enumLabel('InterviewModeEnum', i.mode), i.location].filter(Boolean).join(' · ') },
              { header: 'Status', cell: (i) => <InterviewStatus i={i} /> },
              { header: '', className: 'text-right', cell: (i) => <RowActions actions={interviewActions(i, setActing)} /> },
            ]}
          />
        )}
      </Loaded>
      <InterviewDialogs
        acting={acting}
        onDone={() => {
          setActing(null)
          void q.refetch()
        }}
      />
    </Block>
  )
}
