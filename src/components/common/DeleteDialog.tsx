import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'

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
export function DeleteDialog({ subject, confirmLabel = 'Delete', description, ...props }: DeleteDialogProps) {
  return (
    <ConfirmDialog
      {...props}
      tone="destructive"
      title={`Delete ${subject}?`}
      description={description ?? 'This cannot be undone.'}
      confirmLabel={confirmLabel}
    />
  )
}
