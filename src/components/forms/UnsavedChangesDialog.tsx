import { useRef } from 'react'
import type { Blocker } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { tr } from '@/lib/i18n'

/** Pair with `useUnsavedChanges(isDirty)`. */
export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  // The action button also closes the dialog, and that close must not reset
  // (cancel) the navigation the button just let through.
  const proceeding = useRef(false)
  if (blocker.state === 'blocked') proceeding.current = false
  return (
    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && !proceeding.current && blocker.reset?.()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tr('Leave without saving?')}</AlertDialogTitle>
          <AlertDialogDescription>{tr("Your changes on this page haven't been saved and will be lost.")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset?.()}>{tr('Keep editing')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => ((proceeding.current = true), blocker.proceed?.())} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {tr('Discard changes')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
