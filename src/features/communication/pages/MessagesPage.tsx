import { ArrowLeft, CalendarClock, Loader2, Lock, MessageSquarePlus, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { Spinner } from '@/components/data-display/LoadingState'
import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMyStaffRecord } from '@/features/staff/hooks/useStaff'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/useToast'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Id } from '@/shared/types/api'
import type { Thread } from '../api/communication.api'
import { NewConversationDialog } from '../components/NewConversationDialog'
import { useCloseThread, useMessages, useSendMessage, useThread, useThreads } from '../hooks/useCommunication'

/** The person on the other side of a thread, from my point of view. */
function otherParty(t: Thread, me: Id | undefined) {
  return t.staff_user === me ? t.other_name || 'Unknown' : t.staff_name || 'Staff'
}

const FILTERS = [
  { value: 'false', label: 'Open' },
  { value: 'true', label: 'Closed' },
  { value: '', label: 'All' },
]

function ThreadList({ activeId }: { activeId: Id | null }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const closed = params.get('closed') ?? 'false'
  const threads = useThreads({ page_size: 100, ...(closed ? { is_closed: closed } : {}) })

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex gap-1 border-b p-2" role="tablist" aria-label="Show conversations">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            role="tab"
            aria-selected={closed === f.value}
            onClick={() => setParams(f.value === 'false' ? {} : { closed: f.value }, { replace: true })}
            className={cn('rounded px-2.5 py-1 text-xs font-medium', closed === f.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {f.label}
          </button>
        ))}
      </div>
      {threads.isPending ? (
        <div className="p-4">
          <Spinner />
        </div>
      ) : threads.isError ? (
        <ErrorState error={threads.error} onRetry={() => void threads.refetch()} />
      ) : threads.data.results.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No {closed === 'true' ? 'closed ' : closed === 'false' ? 'open ' : ''}conversations.</p>
      ) : (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
          {threads.data.results.map((t) => (
            <li key={t.id}>
              <Link
                to={`/messages/${t.id}${closed !== 'false' ? `?closed=${closed}` : ''}`}
                aria-current={t.id === activeId ? 'page' : undefined}
                className={cn('block px-3 py-2.5 hover:bg-muted/50', t.id === activeId && 'bg-accent/60')}
              >
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{otherParty(t, user?.id)}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelative(t.last_message_at ?? t.created_at)}</span>
                </span>
                <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  {t.is_closed && <Lock className="h-3 w-3 shrink-0" aria-label="Closed" />}
                  {t.subject || 'No subject'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Conversation({ id }: { id: Id }) {
  const { user } = useAuth()
  const thread = useThread(id)
  const messages = useMessages(id)
  const send = useSendMessage(id)
  const close = useCloseThread()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view as messages arrive.
  // Block body on purpose: newer browsers return a Promise from scrollIntoView, which React would take for a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.data?.length])

  if (thread.isPending) return <div className="p-6"><Spinner /></div>
  if (thread.isError) return <ErrorState error={thread.error} />
  const t = thread.data

  const submit = async () => {
    const text = body.trim()
    if (!text) return
    setError(null)
    try {
      await send.mutateAsync(text)
      setBody('')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <Link to="/messages" className="rounded p-1 text-muted-foreground hover:bg-muted md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{otherParty(t, user?.id)}</p>
          <p className="truncate text-xs text-muted-foreground">{t.subject || 'No subject'}</p>
        </div>
        {!t.is_closed && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await close.mutateAsync(t.id)
                toast.success('Conversation closed. A new message re-opens it.')
              } catch (err) {
                toast.error(errorMessage(err))
              }
            }}
          >
            <Lock aria-hidden /> Close
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3" aria-live="polite">
        {messages.isPending ? (
          <Spinner />
        ) : messages.isError ? (
          <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
        ) : messages.data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hello.</p>
        ) : (
          <ol className="grid gap-2">
            {messages.data.map((m) => {
              const mine = m.sender === user?.id
              return (
                <li key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] rounded-lg px-3 py-2 text-sm sm:max-w-[70%]', mine ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                      {mine ? 'You' : m.sender_name} · <time dateTime={m.created_at}>{formatDateTime(m.created_at)}</time>
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="grid gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {t.is_closed && <p className="text-xs text-muted-foreground">This conversation is closed. Sending a message re-opens it.</p>}
        <FormError message={error} />
        <div className="flex items-end gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Write a message…"
            aria-label="Message"
            className="min-h-0 flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
          />
          <Button type="submit" size="icon" disabled={!body.trim() || send.isPending} aria-label="Send">
            {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Enter to send, Shift+Enter for a new line.</p>
      </form>
    </div>
  )
}

/** /messages and /messages/:threadId */
export default function MessagesPage() {
  const { threadId } = useParams()
  const id = threadId ? Number(threadId) : null
  const navigate = useNavigate()
  const staff = useMyStaffRecord()
  const [starting, setStarting] = useState(false)
  const isStaff = Boolean(staff.data)

  return (
    <>
      <PageHeader
        title="Messages"
        description="Conversations between staff and families."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/messages/appointments">
                <CalendarClock aria-hidden /> Appointments
              </Link>
            </Button>
            <Button
              onClick={() => setStarting(true)}
              disabled={!isStaff}
              title={isStaff ? undefined : staff.isPending ? 'Checking…' : 'Only staff members can start a conversation. Link your login to a staff record first.'}
            >
              <MessageSquarePlus aria-hidden /> New conversation
            </Button>
          </>
        }
      />
      {!staff.isPending && !isStaff && (
        <p className="-mt-3 mb-4 text-xs text-muted-foreground">
          Your login isn’t linked to a staff record, so you can reply to conversations but not start one.
        </p>
      )}
      <div className="grid h-[calc(100dvh-14rem)] min-h-[420px] overflow-hidden rounded-lg border bg-card md:grid-cols-[18rem_1fr]">
        <div className={cn('min-h-0 border-r', id != null && 'hidden md:flex md:flex-col', id == null && 'flex flex-col')}>
          <ThreadList activeId={id} />
        </div>
        <div className={cn('min-h-0', id == null ? 'hidden md:flex md:flex-col' : 'flex flex-col')}>
          {id != null ? (
            <Conversation key={id} id={id} />
          ) : (
            <EmptyState title="Pick a conversation" description="Choose one on the left, or start a new one." className="m-auto" />
          )}
        </div>
      </div>
      <NewConversationDialog open={starting} onOpenChange={setStarting} onStarted={(t) => navigate(`/messages/${t.id}`)} />
    </>
  )
}
