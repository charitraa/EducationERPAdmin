import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'
import { tr } from '@/lib/i18n'

interface DeleteDialogProps extends Omit<ConfirmDialogProps, 'title' | 'tone' | 'confirmLabel'> {
  /** What is being deleted, e.g. `the program "+2 Science"`. */
  subject: string
  confirmLabel?: string
}

/**
 * Delete with confirmation. Records with history answer 409 with a plain
 * explanation, which is shown in the dialog. Prefer an archive/deactivate
 * action wherever the API offers one.
 */
export function DeleteDialog({ subject, confirmLabel = tr('Delete'), description, ...props }: DeleteDialogProps) {
  return (
    <ConfirmDialog
      {...props}
      tone="destructive"
      title={tr('Delete {subject}?', { subject })}
      description={description ?? tr('This cannot be undone.')}
      confirmLabel={confirmLabel}
    />
  )
}
