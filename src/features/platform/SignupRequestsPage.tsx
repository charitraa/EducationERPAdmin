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

const STATUS: Record<SignupStatus, { label: string; tone: StatusTone }> = {
  pending: { label: 'Email not confirmed', tone: 'neutral' },
  awaiting_approval: { label: 'Awaiting approval', tone: 'warning' },
  completed: { label: 'Created', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
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
      toast.success(`${r.organization_name} is created; its admin has been emailed.`)
    },
  })
  const reject = useMutation({
    mutationFn: ({ r, reason }: { r: SignupRequest; reason: string }) => signupRequestsApi.reject(r.id, reason),
    onSuccess: (r) => {
      done(r)
      toast.success(`Rejected ${r.organization_name}; the person has been emailed.`)
    },
  })

  const columns: Column<SignupRequest>[] = [
    {
      id: 'org',
      header: 'Organization',
      sortField: 'organization_name',
      mobile: 'title',
      cell: (r) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{r.organization_name}</div>
          <div className="font-mono text-xs text-muted-foreground">{r.organization_code}</div>
        </div>
      ),
    },
    { id: 'type', header: 'Type', className: 'text-xs', cell: (r) => humanize(r.organization_type) },
    {
      id: 'admin',
      header: 'Admin',
      cell: (r) => (
        <div className="min-w-0 text-xs">
          <div className="truncate">{name(r) || '—'}</div>
          <div className="truncate text-muted-foreground">{r.admin_email}</div>
        </div>
      ),
    },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} tone={STATUS[r.status]?.tone ?? 'neutral'} label={STATUS[r.status]?.label ?? humanize(r.status)} /> },
    { id: 'created', header: 'Signed up', sortField: 'created_at', className: 'whitespace-nowrap text-xs tabular-nums', cell: (r) => formatDateTime(r.created_at) },
    { id: 'verified', header: 'Confirmed', sortField: 'verified_at', mobile: 'hidden', className: 'whitespace-nowrap text-xs tabular-nums', cell: (r) => (r.verified_at ? formatDateTime(r.verified_at) : '—') },
  ]

  const decide = (r: SignupRequest) =>
    r.status === 'awaiting_approval' ? (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setApproving(r)}>
          <Check aria-hidden /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setReason('')
            setRejecting(r)
          }}
        >
          <X aria-hidden /> Reject
        </Button>
      </div>
    ) : null

  return (
    <div>
      <PageHeader
        title="Signup requests"
        description="Schools that signed up online. Approving one creates the organization and emails its admin; rejecting emails them your reason."
      />
      <DataTable
        ariaLabel="Signup requests"
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder="Name, code or email…"
        onRowClick={setOpen}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: 'Approve', icon: Check, onSelect: () => setApproving(r), hidden: r.status !== 'awaiting_approval' },
              {
                label: 'Reject',
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
        filters={[{ name: 'status', label: 'Status', options: (Object.keys(STATUS) as SignupStatus[]).map((s) => ({ value: s, label: STATUS[s].label })) }]}
        empty={{ title: 'No signups', description: 'Nothing matches these filters. Signups appear here once someone fills in the form.' }}
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
                    ['Code', <span className="font-mono">{open.organization_code}</span>],
                    ['Type', humanize(open.organization_type)],
                    ['Time zone', open.timezone],
                    ['Admin', name(open) || '—'],
                    ['Email', open.admin_email],
                    ['Phone', open.admin_phone || '—'],
                    ['Signed up', formatDateTime(open.created_at)],
                    ['From IP', open.ip_address ?? '—'],
                    ['Email confirmed', open.verified_at ? formatDateTime(open.verified_at) : open.token_expires_at ? `Not yet; link expires ${formatDateTime(open.token_expires_at)}` : 'Not yet'],
                    ['Decided', open.decided_at ? formatDateTime(open.decided_at) : '—'],
                    ...(open.rejection_reason ? ([['Reason', open.rejection_reason]] as const) : []),
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8rem_1fr] gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              {open.status === 'pending' && <p className="mt-4 text-sm text-muted-foreground">Nothing to decide until the person opens the link in their email.</p>}
              <div className="mt-5">{decide(open)}</div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={approving !== null}
        onOpenChange={(o) => !o && setApproving(null)}
        title={`Approve ${approving?.organization_name ?? ''}?`}
        description={`This creates the organization "${approving?.organization_code ?? ''}" with ${approving?.admin_email ?? ''} as its administrator, and emails them that they can sign in.`}
        confirmLabel="Approve and create"
        onConfirm={async () => {
          if (approving) await approve.mutateAsync(approving)
          setApproving(null)
        }}
      />
      <ConfirmDialog
        open={rejecting !== null}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={`Reject ${rejecting?.organization_name ?? ''}?`}
        description="The person is emailed that the signup wasn't approved, with your reason if you give one. They can sign up again."
        confirmLabel="Reject"
        tone="destructive"
        onConfirm={async () => {
          if (rejecting) await reject.mutateAsync({ r: rejecting, reason: reason.trim() })
          setRejecting(null)
        }}
      >
        <FormField label="Reason" description="Optional. Sent to them as written.">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
        </FormField>
      </ConfirmDialog>
    </div>
  )
}
