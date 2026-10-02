import { Check, Search, UserCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Spinner } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FormError } from '@/components/forms/FormError'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useDebounce } from '@/hooks/useDebounce'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import type { Id } from '@/shared/types/api'
import type { Ticket } from '../api/support.api'
import { useAssignTicket } from '../hooks/useSupport'

/** Pick who works the ticket. The backend only accepts people who can manage support. */
export function AssignTicketDialog({ ticket, open, onOpenChange }: { ticket: Ticket; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user: me } = useAuth()
  const { can } = usePermissions()
  const canSearch = can(PERMS.users.view)
  const [search, setSearch] = useState('')
  const [chosen, setChosen] = useState<{ id: Id; name: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const term = useDebounce(search.trim())
  const users = useUsers({ search: term || undefined, is_active: true, page_size: 8 }, { enabled: open && canSearch })
  const assign = useAssignTicket()

  // Fresh each time it opens (the parent opens it, so Radix's onOpenChange doesn't fire for that).
  useEffect(() => {
    if (!open) return
    setSearch('')
    setChosen(null)
    setError(null)
  }, [open])

  const submit = async (target: { id: Id; name: string }) => {
    setError(null)
    try {
      await assign.mutateAsync({ id: ticket.id, user: target.id })
      toast.success(`Assigned to ${target.name}.`)
      onOpenChange(false)
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
          <DialogTitle>Assign ticket #{ticket.id}</DialogTitle>
          <DialogDescription>They see it in their list and can resolve it. Open tickets move to in progress.</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        {me && (
          <Button variant="outline" onClick={() => void submit({ id: me.id, name: 'you' })} disabled={assign.isPending}>
            <UserCheck aria-hidden /> Assign to me
          </Button>
        )}
        {canSearch && (
          <div className="grid gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Or find someone by name or email…" className="pl-9" aria-label="Find a person" />
            </div>
            <div role="listbox" aria-label="People" className="max-h-56 overflow-y-auto rounded-md border">
              {users.isPending ? (
                <div className="p-3">
                  <Spinner />
                </div>
              ) : (
                users.data?.results
                  .filter((u) => u.user_type !== 'student' && u.user_type !== 'parent')
                  .map((u) => {
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
                          <span className="block truncate text-xs text-muted-foreground">{u.role_assignments.map((a) => a.role_name).join(', ') || 'No role'}</span>
                        </span>
                        {selected && <Check className="h-4 w-4 text-primary" aria-hidden />}
                      </button>
                    )
                  })
              )}
            </div>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canSearch && (
            <Button onClick={() => chosen && void submit(chosen)} disabled={!chosen || assign.isPending}>
              Assign{chosen ? ` to ${chosen.name}` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
