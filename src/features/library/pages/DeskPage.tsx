import { BookDown, BookUp, Loader2 } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Copy, Loan, Member } from '../api/library.api'
import { CopyPicker, LoanPicker, MemberPicker } from '../components/Pickers'
import { useIssueBook, useLoans, useReturnBook } from '../hooks/useLibrary'
import { useCount } from '@/shared/api/count'
import { tr } from '@/lib/i18n'

function IssueCard() {
  const [member, setMember] = useState<Member | null>(null)
  const [copy, setCopy] = useState<Copy | null>(null)
  const [error, setError] = useState<string | null>(null)
  const issue = useIssueBook()
  const ids = { member: useId(), copy: useId() }
  const submit = async () => {
    setError(null)
    try {
      const loan = await issue.mutateAsync({ copy: copy!.id, member: member!.id })
      toast.success(tr('{book_title} issued to {member_name}, due {date}.', { book_title: loan.book_title, member_name: loan.member_name, date: formatDate(loan.due_at.slice(0, 10)) }))
      setCopy(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return (
    <section className="grid content-start gap-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <BookUp className="h-4 w-4" aria-hidden /> {tr('Issue a book')}
      </h2>
      <div className="grid gap-1.5">
        <Label htmlFor={ids.member}>{tr('Member')}</Label>
        <MemberPicker id={ids.member} value={member} onChange={setMember} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={ids.copy}>{tr('Copy')}</Label>
        <CopyPicker id={ids.copy} value={copy} onChange={setCopy} />
      </div>
      <FormError message={error} />
      <Button onClick={() => void submit()} disabled={!member || !copy || issue.isPending}>
        {issue.isPending && <Loader2 className="animate-spin" aria-hidden />} {tr('Issue')}
      </Button>
    </section>
  )
}

function ReturnCard() {
  const [loan, setLoan] = useState<Loan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ret = useReturnBook()
  const id = useId()
  const submit = async (outcome: 'returned' | 'damaged' | 'lost') => {
    setError(null)
    try {
      const done = await ret.mutateAsync({ id: loan!.id, outcome })
      toast.success(outcome === 'returned' ? tr('{book_title} returned{value}.', { book_title: done.book_title, value: loan!.is_overdue ? '; ' + tr('an overdue fine was raised') : '' }) : tr('{book_title} reported {outcome}; a fine for its price was raised.', { book_title: done.book_title, outcome }))
      setLoan(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return (
    <section className="grid content-start gap-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <BookDown className="h-4 w-4" aria-hidden /> {tr('Return a book')}
      </h2>
      <div className="grid gap-1.5">
        <Label htmlFor={id}>{tr('Loan')}</Label>
        <LoanPicker id={id} value={loan} onChange={setLoan} />
      </div>
      <p className="text-xs text-muted-foreground">{tr('Late returns raise an overdue fine. Damaged or lost copies are fined at their price. A returned copy goes to the next reservation, if anyone is waiting.')}</p>
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void submit('returned')} disabled={!loan || ret.isPending}>
          {ret.isPending && <Loader2 className="animate-spin" aria-hidden />} {tr('Return')}
        </Button>
        <Button variant="outline" onClick={() => void submit('damaged')} disabled={!loan || ret.isPending}>
          {tr('Damaged')}
        </Button>
        <Button variant="outline" onClick={() => void submit('lost')} disabled={!loan || ret.isPending}>
          {tr('Lost')}
        </Button>
      </div>
    </section>
  )
}

/** The front desk: issue and return, and what's overdue. */
export default function DeskPage() {
  const { can } = usePermissions()
  const desk = can(PERMS.library.circulate)
  const out = useCount('library-issues', '/library/issues/', { status: 'issued' }, desk)
  const late = useLoans({ ...PICKER_PARAMS, overdue: true, ordering: 'due_at' }, desk)
  const overdue = late.data?.results ?? []
  const more = (late.data?.count ?? 0) - overdue.length
  if (!desk) return <EmptyState title={tr('The desk is for library staff')} description={tr('Browse the catalog under Books.')} />
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <IssueCard />
        <ReturnCard />
      </div>
      <section>
        <SectionHeader title={tr('Overdue')} description={tr('{count} books out in all.', { count: out.data ?? 0 })} />
        {overdue.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">{tr('Nothing overdue.')}</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {overdue.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{l.book_title}</span> <span className="font-mono text-xs text-muted-foreground">{l.accession_number}</span>
                </span>
                <Link to={`/library/loans?member=${l.member}`} className="hover:underline">
                  {l.member_name}
                </Link>
                <span className="tabular-nums text-danger">{tr('due {date}', { date: formatDate(l.due_at.slice(0, 10)) })}</span>
              </li>
            ))}
          </ul>
        )}
        {more > 0 && (
          <Link to="/library/loans?overdue=true" className="mt-2 inline-block text-sm underline">
            {tr('{count} more overdue', { count: more })}
          </Link>
        )}
      </section>
    </div>
  )
}
