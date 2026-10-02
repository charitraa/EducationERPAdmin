import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PageHeader } from '@/components/common/PageHeader'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { FormError } from '@/components/forms/FormError'
import { UnsavedChangesDialog } from '@/components/forms/UnsavedChangesDialog'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { applyServerErrors } from '@/lib/errors'
import { PERMS } from '@/shared/constants/permissions'
import { OrganizationFields } from '../components/OrganizationFields'
import { useMyOrganization, useUpdateMyOrganization } from '../hooks/useOrganization'
import { ORGANIZATION_FIELDS, organizationDefaults, organizationSchema, toOrganizationInput, type OrganizationForm } from '../schemas/organization.schema'

export default function OrganizationSettingsPage() {
  const org = useMyOrganization()
  const update = useUpdateMyOrganization()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission(PERMS.organizations.update)
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<OrganizationForm>({ resolver: zodResolver(organizationSchema), defaultValues: organizationDefaults(undefined) })
  const blocker = useUnsavedChanges(form.formState.isDirty)

  useEffect(() => {
    if (org.data) form.reset(organizationDefaults(org.data))
  }, [org.data, form])

  if (org.isPending) return <PageLoader />
  if (org.isError) return <ErrorState error={org.error} onRetry={() => void org.refetch()} />

  const submit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      const saved = await update.mutateAsync(toOrganizationInput(values))
      form.reset(organizationDefaults(saved))
      toast.success('School details saved.')
    } catch (err) {
      setServerError(applyServerErrors(err, form.setError, ORGANIZATION_FIELDS))
    }
  })

  return (
    <>
      <PageHeader title="Organization" description="Your school's name and contact details." backTo="/settings" />
      <form onSubmit={submit} noValidate className="max-w-3xl">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <FormError message={serverError} className="mb-4" />
          <fieldset disabled={!canEdit} className="contents">
            <OrganizationFields form={form} />
          </fieldset>
          <div className="mt-4 grid gap-1 border-t pt-4 text-sm">
            <span className="text-muted-foreground">Organization code</span>
            <span className="font-mono">{org.data.code}</span>
            <span className="text-xs text-muted-foreground">Used in your public admission and careers page links. Ask support to change it.</span>
          </div>
        </div>
        {canEdit && (
          <div className="sticky bottom-16 mt-4 flex justify-end gap-2 md:bottom-4">
            <Button type="button" variant="outline" disabled={!form.formState.isDirty} onClick={() => form.reset(organizationDefaults(org.data))}>
              Discard changes
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
              Save changes
            </Button>
          </div>
        )}
      </form>
      <UnsavedChangesDialog blocker={blocker} />
    </>
  )
}
