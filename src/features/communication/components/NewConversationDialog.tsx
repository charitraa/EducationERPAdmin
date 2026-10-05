import { Check, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBranches } from '@/app/providers/BranchProvider'
import { Spinner } from '@/components/data-display/LoadingState'
import { FormError } from '@/components/forms/FormError'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useDebounce } from '@/hooks/useDebounce'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Id } from '@/shared/types/api'
import type { Thread } from '../api/communication.api'
import { useStartThread } from '../hooks/useCommunication'
import { tr } from '@/lib/i18n'

/**
 * Staff start conversations with a student or a parent (the backend allows no
 * one else). Starting one with someone you already talk to re-opens that thread.
 */
export function NewConversationDialog({ open, onOpenChange, onStarted }: { open: boolean; onOpenChange: (o: boolean) => void; onStarted: (t: Thread) => void }) {
  const { isMultiBranch, branches, defaultBranchId } = useBranches()
  const [kind, setKind] = useState<'parent' | 'student'>('parent')
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState<{ id: Id; name: string } | null>(null)
  const [subject, setSubject] = useState('')
  const [campus, setCampus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const term = useDebounce(search.trim())
  const people = useUsers({ user_type: kind, is_active: true, search: term || undefined, page_size: 8, ordering: 'email' }, { enabled: open })
  const start = useStartThread()
  const branch = campus || (defaultBranchId ? String(defaultBranchId) : '')

  const reset = () => {
    setSearch('')
    setChosen(null)
    setSubject('')
    setCampus('')
    setError(null)
  }  // Fresh each time it opens (the parent opens it, so Radix's onOpenChange doesn't fire for that).
  useEffect(() => {
    if (open) reset()
    // reset only on opening
  }, [open])


  const submit = async () => {
    if (!chosen) return setError(tr('Choose who to write to.'))
    if (!branch) return setError(tr('Choose a branch.'))
    setError(null)
    try {
      const t = await start.mutateAsync({ other_user: chosen.id, campus: Number(branch), subject: subject.trim() })
      onOpenChange(false)
      onStarted(t)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tr('New conversation')}</DialogTitle>
          <DialogDescription>{tr('Message a parent or a student. They reply from their portal.')}</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <div className="inline-flex w-fit rounded-md border p-0.5" role="radiogroup" aria-label={tr('Write to')}>
          {(['parent', 'student'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                setKind(k)
                setChosen(null)
              }}
              className={cn('rounded px-3 py-1 text-sm', kind === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {k === 'parent' ? tr('A parent') : tr('A student')}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Find a {kind} by name or email…', { kind })} className="pl-9" aria-label={tr('Find a {kind}', { kind })} autoFocus />
        </div>
        <div role="listbox" aria-label={tr('People')} className="max-h-52 overflow-y-auto rounded-md border">
          {people.isPending ? (
            <div className="p-3">
              <Spinner />
            </div>
          ) : people.isError ? (
            <p className="p-3 text-sm text-danger">{errorMessage(people.error)}</p>
          ) : people.data.results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">{tr('No {kind} accounts', { kind })}{term ? ' ' + tr('match “{term}”', { term }) : ''}{tr('. Only people with a portal login can be messaged.')}</p>
          ) : (
            people.data.results.map((u) => {
              const name = u.full_name || u.email
              const selected = chosen?.id === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => setChosen({ id: u.id, name })}
                  className={cn('flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50', selected && 'bg-accent')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 text-primary" aria-hidden />}
                </button>
              )
            })
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="thread-subject">{tr('Subject')}</Label>
          <Input id="thread-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder={tr('Homework, a meeting, fees…')} />
        </div>
        {isMultiBranch && (
          <div className="grid gap-1.5">
            <Label htmlFor="thread-branch">{tr('Branch')}</Label>
            <SelectControl id="thread-branch" value={branch} onChange={setCampus} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tr('Cancel')}
          </Button>
          <Button onClick={() => void submit()} disabled={!chosen || start.isPending}>
            {tr('Start')}{chosen ? ' ' + tr('with {name}', { name: chosen.name }) : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
