import { CheckCircle2, Loader2, Lock, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader, Spinner } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StatusTimeline } from '@/components/workflow/StatusTimeline'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDateTime } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { enumLabels } from '@/shared/api/enums.gen'
import { PERMS } from '@/shared/constants/permissions'
import { TICKET_STEPS, type Ticket } from '../api/support.api'
import { AssignTicketDialog } from '../components/AssignTicketDialog'
import { useAddComment, useCloseTicket, useResolveTicket, useTicket, useTicketComments } from '../hooks/useSupport'

function Conversation({ ticket }: { ticket: Ticket }) {
  const { user } = useAuth()
  const comments = useTicketComments(ticket.id)
  const add = useAddComment(ticket.id)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const closed = ticket.status === 'closed'

  const send = async () => {
    if (!body.trim()) return
    setError(null)
    try {
      await add.mutateAsync(body.trim())
      setBody('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section className="rounded-lg border bg-card">
      <h2 className="border-b px-4 py-3 text-sm font-semibold">Conversation</h2>
      <ol className="grid gap-3 p-4">
        {/* The ticket itself opens the conversation. */}
        <li className="rounded-md border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">
            {ticket.raised_by === user?.id ? 'You' : ticket.raised_by_name || 'Someone'} · {formatDateTime(ticket.created_at)}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm">{ticket.description}</p>
        </li>
        {comments.isPending ? (
          <Spinner />
        ) : comments.isError ? (
          <ErrorState error={comments.error} onRetry={() => void comments.refetch()} />
        ) : (
          comments.data.map((c) => {
            const mine = c.author === user?.id
            return (
              <li key={c.id} className={cn('rounded-md border p-3', mine ? 'ml-6 border-primary/20 bg-accent/40' : 'mr-6')}>
                <p className="text-xs text-muted-foreground">
                  {mine ? 'You' : c.author_name || 'Someone'} · {formatDateTime(c.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </li>
            )
          })
        )}
      </ol>
      {closed ? (
        <p className="flex items-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" aria-hidden /> This ticket is closed.
        </p>
      ) : (
        <form
          className="grid gap-2 border-t p-4"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <FormError message={error} />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Write a reply…"
            aria-label="Reply"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send()
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Ctrl+Enter to send</span>
            <Button type="submit" size="sm" disabled={!body.trim() || add.isPending}>
              {add.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Send
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

export default function TicketDetailPage() {
  const id = Number(useParams().id)
  const ticket = useTicket(id)
  const { user } = useAuth()
  const { can } = usePermissions()
  const { isMultiBranch } = useBranches()
  const resolve = useResolveTicket()
  const close = useCloseTicket()
  const [dialog, setDialog] = useState<'assign' | 'resolve' | 'close' | null>(null)

  if (ticket.isPending) return <PageLoader />
  if (ticket.isError) return <ErrorState error={ticket.error} onRetry={() => void ticket.refetch()} />
  const t = ticket.data
  const status = t.status ?? 'open'
  // The backend checks branch scope too; this decides which buttons to show.
  const office = can(PERMS.support.manage)
  const mine = t.raised_by === user?.id
  const working = status === 'open' || status === 'in_progress'

  return (
    <>
      <PageHeader
        backTo="/support/tickets"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t.subject}
            <StatusBadge status={status} label={enumLabel('SupportTicketStatusEnum', status)} />
          </span>
        }
        description={`Ticket #${t.id} · raised ${formatDateTime(t.created_at)}${isMultiBranch && t.campus_name ? ` · ${t.campus_name}` : ''}`}
        actions={
          <>
            {office && status !== 'closed' && (
              <Button size="sm" variant="outline" onClick={() => setDialog('assign')}>
                <UserCog aria-hidden /> {t.assigned_to ? 'Reassign' : 'Assign'}
              </Button>
            )}
            {office && working && (
              <Button size="sm" onClick={() => setDialog('resolve')}>
                <CheckCircle2 aria-hidden /> Resolve
              </Button>
            )}
            {(office || mine) && status !== 'closed' && (
              <Button size="sm" variant="outline" onClick={() => setDialog('close')}>
                <Lock aria-hidden /> Close
              </Button>
            )}
          </>
        }
      />
      <div className="mb-5 rounded-lg border bg-card p-4">
        <StatusTimeline steps={TICKET_STEPS} current={status} labels={enumLabels.SupportTicketStatusEnum} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Conversation ticket={t} />
        </div>
        <section className="h-fit rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <dl className="grid gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Raised by</dt>
              <dd>{mine ? 'You' : t.raised_by_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Assigned to</dt>
              <dd>{t.assigned_to === user?.id ? 'You' : t.assigned_to_name || 'Nobody yet'}</dd>
            </div>
            {t.resolved_at && (
              <div>
                <dt className="text-xs text-muted-foreground">Resolved</dt>
                <dd className="tabular-nums">{formatDateTime(t.resolved_at)}</dd>
              </div>
            )}
            {t.closed_at && (
              <div>
                <dt className="text-xs text-muted-foreground">Closed</dt>
                <dd className="tabular-nums">{formatDateTime(t.closed_at)}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <AssignTicketDialog ticket={t} open={dialog === 'assign'} onOpenChange={(o) => !o && setDialog(null)} />
      <ConfirmDialog
        open={dialog === 'resolve'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Mark as resolved?"
        description="Tell the requester what was done in a reply first. They, or the office, can then close it."
        confirmLabel="Resolve"
        onConfirm={async () => {
          await resolve.mutateAsync(t.id)
          toast.success('Ticket resolved.')
        }}
      />
      <ConfirmDialog
        open={dialog === 'close'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Close this ticket?"
        description="No more replies can be added. Raise a new ticket if the problem comes back."
        confirmLabel="Close ticket"
        onConfirm={async () => {
          await close.mutateAsync(t.id)
          toast.success('Ticket closed.')
        }}
      />
    </>
  )
}
