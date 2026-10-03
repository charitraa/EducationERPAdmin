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
      toast.success(`${loan.book_title} issued to ${loan.member_name}, due ${formatDate(loan.due_at.slice(0, 10))}.`)
      setCopy(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return (
    <section className="grid content-start gap-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <BookUp className="h-4 w-4" aria-hidden /> Issue a book
      </h2>
      <div className="grid gap-1.5">
        <Label htmlFor={ids.member}>Member</Label>
        <MemberPicker id={ids.member} value={member} onChange={setMember} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={ids.copy}>Copy</Label>
        <CopyPicker id={ids.copy} value={copy} onChange={setCopy} />
      </div>
      <FormError message={error} />
      <Button onClick={() => void submit()} disabled={!member || !copy || issue.isPending}>
        {issue.isPending && <Loader2 className="animate-spin" aria-hidden />} Issue
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
      toast.success(outcome === 'returned' ? `${done.book_title} returned${loan!.is_overdue ? '; an overdue fine was raised' : ''}.` : `${done.book_title} reported ${outcome}; a fine for its price was raised.`)
      setLoan(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }
  return (
    <section className="grid content-start gap-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <BookDown className="h-4 w-4" aria-hidden /> Return a book
      </h2>
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Loan</Label>
        <LoanPicker id={id} value={loan} onChange={setLoan} />
      </div>
      <p className="text-xs text-muted-foreground">Late returns raise an overdue fine. Damaged or lost copies are fined at their price. A returned copy goes to the next reservation, if anyone is waiting.</p>
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void submit('returned')} disabled={!loan || ret.isPending}>
          {ret.isPending && <Loader2 className="animate-spin" aria-hidden />} Return
        </Button>
        <Button variant="outline" onClick={() => void submit('damaged')} disabled={!loan || ret.isPending}>
          Damaged
        </Button>
        <Button variant="outline" onClick={() => void submit('lost')} disabled={!loan || ret.isPending}>
          Lost
        </Button>
      </div>
    </section>
  )
}

/** The front desk: issue and return, and what's overdue. */
export default function DeskPage() {
  const { can } = usePermissions()
  const desk = can(PERMS.library.circulate)
  const out = useLoans({ ...PICKER_PARAMS, status: 'issued' }, desk)
  const overdue = (out.data?.results ?? []).filter((l) => l.is_overdue).sort((a, b) => a.due_at.localeCompare(b.due_at))
  if (!desk) return <EmptyState title="The desk is for library staff" description="Browse the catalog under Books." />
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <IssueCard />
        <ReturnCard />
      </div>
      <section>
        <SectionHeader title="Overdue" description={`${out.data?.count ?? 0} books out in all.`} />
        {overdue.length === 0 ? (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Nothing overdue.</p>
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
                <span className="tabular-nums text-danger">due {formatDate(l.due_at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
