import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from 'react-hook-form'
import type { ZodType } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { applyServerErrors } from '@/lib/errors'
import { FormError } from './FormError'
import { tr } from '@/lib/i18n'

interface FormDialogProps<T extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  schema: ZodType<T>
  defaultValues: T
  /** Throwing an ApiError puts its details on the fields and its message above the form. */
  onSubmit: (values: T) => Promise<unknown>
  submitLabel?: string
  children: (form: UseFormReturn<T>) => ReactNode
  wide?: boolean
}

/**
 * A create/edit form in a dialog: React Hook Form + Zod on the client, the
 * server's 400 details on the matching fields, and a "discard changes?" check
 * before closing a dirty form.
 */
export function FormDialog<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  defaultValues,
  onSubmit,
  submitLabel = tr('Save'),
  children,
  wide,
}: FormDialogProps<T>) {
  const form = useForm<T>({ resolver: zodResolver(schema as never), defaultValues: defaultValues as DefaultValues<T> })
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (open) {
      form.reset(defaultValues)
      setServerError(null)
    }
    // Reset only when the dialog opens.
  }, [open])

  const submit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (err) {
      setServerError(applyServerErrors(err, form.setError, Object.keys(defaultValues)))
    }
  })

  const requestClose = (next: boolean) => {
    if (!next && form.formState.isDirty && !form.formState.isSubmitSuccessful) setConfirmDiscard(true)
    else onOpenChange(next)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestClose}>
        <DialogContent className={wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <form onSubmit={submit} noValidate className="grid gap-4">
            <FormError message={serverError} />
            <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-0.5 py-0.5">{children(form)}</div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => requestClose(false)}>
                {tr('Cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
                {submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title={tr('Discard changes?')}
        description={tr("What you've entered in this form will be lost.")}
        confirmLabel={tr('Discard')}
        tone="destructive"
        onConfirm={() => onOpenChange(false)}
      />
    </>
  )
}
