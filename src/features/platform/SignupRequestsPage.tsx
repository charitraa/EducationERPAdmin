import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/dates'
import { humanize } from '@/lib/formatters'
import type { StatusTone } from '@/shared/constants/statuses'
import { signupKeys, signupRequestsApi, type SignupRequest, type SignupStatus } from '@/features/authentication/api/account.api'
import { tr } from '@/lib/i18n'

const STATUS: Record<SignupStatus, { label: string; tone: StatusTone }> = {
  pending: { label: tr('Email not confirmed'), tone: 'neutral' },
  awaiting_approval: { label: tr('Awaiting approval'), tone: 'warning' },
  completed: { label: tr('Created'), tone: 'success' },
  rejected: { label: tr('Rejected'), tone: 'danger' },
}

const name = (r: SignupRequest) => [r.admin_first_name, r.admin_last_name].filter(Boolean).join(' ')

/**
 * Every organization signup, for the platform's own admins. Verified ones
 * wait here for a decision when the server requires approval.
 */
export default function SignupRequestsPage() {
  const qc = useQueryClient()
  const list = useListState({ filters: ['status'], defaultOrdering: '-created_at' })
  const query = useQuery({ queryKey: signupKeys.requests.list(list.query), queryFn: () => signupRequestsApi.list(list.query), placeholderData: keepPreviousData })
  const [open, setOpen] = useState<SignupRequest | null>(null)
  const [approving, setApproving] = useState<SignupRequest | null>(null)
  const [rejecting, setRejecting] = useState<SignupRequest | null>(null)
  const [reason, setReason] = useState('')

  const done = (r: SignupRequest) => {
    qc.invalidateQueries({ queryKey: signupKeys.requests.all })
    setOpen((o) => (o?.id === r.id ? r : o))
  }
  const approve = useMutation({
    mutationFn: (r: SignupRequest) => signupRequestsApi.approve(r.id),
    onSuccess: (r) => {
      done(r)
      toast.success(tr('{organization_name} is created; its admin has been emailed.', { organization_name: r.organization_name }))
    },
  })
  const reject = useMutation({
    mutationFn: ({ r, reason }: { r: SignupRequest; reason: string }) => signupRequestsApi.reject(r.id, reason),
    onSuccess: (r) => {
      done(r)
      toast.success(tr('Rejected {organization_name}; the person has been emailed.', { organization_name: r.organization_name }))
    },
  })

  const columns: Column<SignupRequest>[] = [
    {
      id: 'org',
      header: tr('Organization'),
      sortField: 'organization_name',
      mobile: 'title',
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.organization_name}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.organization_code}</div>
        </div>
      ),
    },
    { id: 'type', header: tr('Type'), className: 'text-xs', cell: (r) => humanize(r.organization_type) },
    {
      id: 'admin',
      header: tr('Admin'),
      cell: (r) => (
        <div className="min-w-0 text-xs">
          <div className="truncate">{name(r) || '—'}</div>
          <div className="truncate text-muted-foreground">{r.admin_email}</div>
        </div>
      ),
    },
    { id: 'status', header: tr('Status'), cell: (r) => <StatusBadge status={r.status} tone={STATUS[r.status]?.tone ?? 'neutral'} label={STATUS[r.status]?.label ?? humanize(r.status)} /> },
    { id: 'created', header: tr('Signed up'), sortField: 'created_at', className: 'whitespace-nowrap text-xs tabular-nums', cell: (r) => formatDateTime(r.created_at) },
    { id: 'verified', header: tr('Confirmed'), sortField: 'verified_at', mobile: 'hidden', className: 'whitespace-nowrap text-xs tabular-nums', cell: (r) => (r.verified_at ? formatDateTime(r.verified_at) : '—') },
  ]

  const decide = (r: SignupRequest) =>
    r.status === 'awaiting_approval' ? (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setApproving(r)}>
          <Check aria-hidden /> {tr('Approve')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setReason('')
            setRejecting(r)
          }}
        >
          <X aria-hidden /> {tr('Reject')}
        </Button>
      </div>
    ) : null

  return (
    <div>
      <PageHeader
        title={tr('Signup requests')}
        description={tr('Schools that signed up online. Approving one creates the organization and emails its admin; rejecting emails them your reason.')}
      />
      <DataTable
        ariaLabel={tr('Signup requests')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder={tr('Name, code or email…')}
        onRowClick={setOpen}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: tr('Approve'), icon: Check, onSelect: () => setApproving(r), hidden: r.status !== 'awaiting_approval' },
              {
                label: tr('Reject'),
                icon: X,
                destructive: true,
                hidden: r.status !== 'awaiting_approval',
                onSelect: () => {
                  setReason('')
                  setRejecting(r)
                },
              },
            ]}
          />
        )}
        filters={[{ name: 'status', label: tr('Status'), options: (Object.keys(STATUS) as SignupStatus[]).map((s) => ({ value: s, label: STATUS[s].label })) }]}
        empty={{ title: tr('No signups'), description: tr('Nothing matches these filters. Signups appear here once someone fills in the form.') }}
      />

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{open.organization_name}</SheetTitle>
                <SheetDescription>
                  <StatusBadge status={open.status} tone={STATUS[open.status]?.tone ?? 'neutral'} label={STATUS[open.status]?.label ?? humanize(open.status)} />
                </SheetDescription>
              </SheetHeader>
              <dl className="mt-4 grid gap-2 text-sm">
                {(
                  [
                    [tr('Code'), <span className="font-mono">{open.organization_code}</span>],
                    [tr('Type'), humanize(open.organization_type)],
                    [tr('Time zone'), open.timezone],
                    [tr('Admin'), name(open) || '—'],
                    [tr('Email'), open.admin_email],
                    [tr('Phone'), open.admin_phone || '—'],
                    [tr('Signed up'), formatDateTime(open.created_at)],
                    [tr('From IP'), open.ip_address ?? '—'],
                    [tr('Email confirmed'), open.verified_at ? formatDateTime(open.verified_at) : open.token_expires_at ? `Not yet; link expires ${formatDateTime(open.token_expires_at)}` : 'Not yet'],
                    [tr('Decided'), open.decided_at ? formatDateTime(open.decided_at) : '—'],
                    ...(open.rejection_reason ? ([[tr('Reason'), open.rejection_reason]] as const) : []),
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8rem_1fr] gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              {open.status === 'pending' && <p className="mt-4 text-sm text-muted-foreground">{tr('Nothing to decide until the person opens the link in their email.')}</p>}
              <div className="mt-5">{decide(open)}</div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(o) => !o && setApproving(null)}
        title={tr('Approve {organization_name}?', { organization_name: approving?.organization_name ?? '' })}
        description={tr('This creates the organization "{organization_code}" with {admin_email} as its administrator, and emails them that they can sign in.', { organization_code: approving?.organization_code ?? '', admin_email: approving?.admin_email ?? '' })}
        confirmLabel={tr('Approve and create')}
        onConfirm={async () => {
          if (approving) await approve.mutateAsync(approving)
          setApproving(null)
        }}
      />
      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={tr('Reject {organization_name}?', { organization_name: rejecting?.organization_name ?? '' })}
        description={tr("The person is emailed that the signup wasn't approved, with your reason if you give one. They can sign up again.")}
        confirmLabel={tr('Reject')}
        tone="destructive"
        onConfirm={async () => {
          if (rejecting) await reject.mutateAsync({ r: rejecting, reason: reason.trim() })
          setRejecting(null)
        }}
      >
        <FormField label={tr('Reason')} description={tr('Optional. Sent to them as written.')}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
        </FormField>
      </ConfirmDialog>
    </div>
  )
}
