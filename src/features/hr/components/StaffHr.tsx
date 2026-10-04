import { CalendarPlus, CalendarX2, FilePlus2, Pencil, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { RowActions } from '@/components/common/RowActions'
import { Expiry } from '@/components/data-display/Expiry'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { enumLabel } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import type { Contract, EmployeeProfile, LeaveRequest, StaffDocument } from '../api/hr.api'
import { useContracts, useFiscalYearOptions, useLeaveBalances, useLeaveRequests, useProfiles, useStaffDocuments } from '../hooks/useHr'
import { days, LeaveDecisionDialogs, leaveActions, leaveSpan, LeaveStatus, RecordLeaveDialog, useOwnLeaveIds } from '../pages/LeavePages'
import { ContractDialog, contractPeriod, contractState, DocumentDialog, EndContractDialog, ProfileDialog } from '../pages/PeoplePages'

function Card({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border bg-card p-4 sm:p-6 ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Staff → Employment, Leave and Documents: the HR side of a staff member's page. Needs `hr.view`. */
export function StaffHr({ staffId }: { staffId: Id }) {
  const { can } = usePermissions()
  const manage = can(PERMS.hr.manage)
  const contracts = useContracts({ ...PICKER_PARAMS, staff: staffId })
  const profiles = useProfiles({ ...PICKER_PARAMS, staff: staffId })
  const docs = useStaffDocuments({ ...PICKER_PARAMS, staff: staffId })
  const { current } = useFiscalYearOptions()
  const balances = useLeaveBalances({ ...PICKER_PARAMS, staff: staffId, fiscal_year: current?.id }, current != null)
  const requests = useLeaveRequests({ page_size: 5, staff: staffId, ordering: '-start_date' })
  const own = useOwnLeaveIds()
  const [dialog, setDialog] = useState<'contract' | 'profile' | 'doc' | 'leave' | null>(null)
  const [contract, setContract] = useState<Contract | null>(null)
  const [ending, setEnding] = useState<Contract | null>(null)
  const [doc, setDoc] = useState<StaffDocument | null>(null)
  const [acting, setActing] = useState<{ kind: 'approve' | 'reject' | 'cancel'; r: LeaveRequest } | null>(null)
  const profile: EmployeeProfile | undefined = profiles.data?.results[0]
  const rows = contracts.data?.results ?? []
  const add = (label: string, Icon: typeof Plus, onClick: () => void) =>
    manage && (
      <Button size="sm" variant="outline" className="h-7" onClick={onClick}>
        <Icon aria-hidden /> {label}
      </Button>
    )

  return (
    <>
      <Card title="Contracts" className="lg:col-span-2" action={add('New contract', Plus, () => setDialog('contract'))}>
        {contracts.isPending ? (
          <TableSkeleton rows={2} columns={3} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contract on record.</p>
        ) : (
          <ul className="divide-y text-sm">
            {rows.map((c) => {
              const s = contractState(c)
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                  <span className="font-medium">{enumLabel('ContractKindEnum', c.kind)}</span>
                  <span className="text-muted-foreground">{[c.position_name, c.department_name].filter(Boolean).join(' · ')}</span>
                  <span className="flex-1 tabular-nums text-muted-foreground">{contractPeriod(c)}</span>
                  <StatusBadge status={s.status} tone={s.tone} label={s.label} />
                  <RowActions
                    actions={[
                      { label: 'Edit', icon: Pencil, permission: PERMS.hr.manage, onSelect: () => setContract(c) },
                      { label: 'End contract', icon: CalendarX2, permission: PERMS.hr.manage, hidden: s.status === 'closed', onSelect: () => setEnding(c) },
                    ]}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      <Card title="HR profile" action={add(profile ? 'Edit' : 'Add', profile ? Pencil : Plus, () => setDialog('profile'))}>
        {profiles.isPending ? (
          <TableSkeleton rows={2} columns={1} />
        ) : !profile ? (
          <p className="text-sm text-muted-foreground">Not set up: payroll needs a PAN, tax status and bank account.</p>
        ) : (
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">PAN</dt><dd className="font-mono">{profile.pan_number || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Files tax as</dt><dd>{enumLabel('TaxStatusEnum', profile.tax_status)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Bank</dt><dd className="text-right">{profile.bank_account_number ? <>{profile.bank_name} <span className="font-mono">{profile.bank_account_number}</span></> : <span className="text-warning">Missing</span>}</dd></div>
            {profile.emergency_contact_name && (
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Emergency</dt><dd className="text-right">{profile.emergency_contact_name}{profile.emergency_contact_phone ? ` · ${profile.emergency_contact_phone}` : ''}</dd></div>
            )}
          </dl>
        )}
      </Card>
      <Card title={current ? `Leave · ${current.name}` : 'Leave'} className="lg:col-span-2" action={add('Record leave', CalendarPlus, () => setDialog('leave'))}>
        {(balances.data?.results ?? []).length > 0 && (
          <ul className="mb-4 grid gap-2 sm:grid-cols-3">
            {balances.data!.results.map((b) => (
              <li key={b.id} className="rounded-md border p-2 text-sm">
                <p className="text-xs text-muted-foreground">{b.leave_type_name}</p>
                <p className="font-semibold tabular-nums">
                  {b.available == null ? `${days(b.used)} taken` : `${days(b.available)} left`}
                  {b.total != null && <span className="text-xs font-normal text-muted-foreground"> of {days(b.total)}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
        {requests.isPending ? (
          <TableSkeleton rows={2} columns={3} />
        ) : (requests.data?.results ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave taken or asked for.</p>
        ) : (
          <ul className="divide-y text-sm">
            {requests.data!.results.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                <span className="font-medium">{r.leave_type_name}</span>
                <span className="flex-1 tabular-nums text-muted-foreground">{leaveSpan(r)}</span>
                <LeaveStatus status={r.status} />
                <RowActions actions={leaveActions(r, setActing, own)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Documents" action={add('Add', FilePlus2, () => setDialog('doc'))}>
        {docs.isPending ? (
          <TableSkeleton rows={2} columns={1} />
        ) : (docs.data?.results ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">None on file.</p>
        ) : (
          <ul className="divide-y text-sm">
            {docs.data!.results.map((d) => (
              <li key={d.id}>
                <button type="button" disabled={!manage} onClick={() => setDoc(d)} className="flex w-full items-center justify-between gap-2 py-1.5 text-left enabled:hover:underline">
                  <span className="min-w-0 truncate">{d.title}</span>
                  {d.expires_on ? <Expiry on={d.expires_on} /> : <span className="font-mono text-xs text-muted-foreground">{d.number}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ContractDialog open={dialog === 'contract' || contract !== null} record={contract} staffId={staffId} onOpenChange={(o) => !o && (setDialog(null), setContract(null))} />
      <EndContractDialog contract={ending} onOpenChange={(o) => !o && setEnding(null)} />
      <ProfileDialog open={dialog === 'profile'} record={profile ?? null} staffId={staffId} onOpenChange={(o) => !o && setDialog(null)} />
      <DocumentDialog open={dialog === 'doc' || doc !== null} record={doc} staffId={staffId} onOpenChange={(o) => !o && (setDialog(null), setDoc(null))} />
      <RecordLeaveDialog open={dialog === 'leave'} staffId={staffId} onOpenChange={(o) => !o && setDialog(null)} />
      <LeaveDecisionDialogs acting={acting} onDone={() => setActing(null)} />
    </>
  )
}
