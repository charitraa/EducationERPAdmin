import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { PageLoader } from '@/components/data-display/LoadingState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { FormError } from '@/components/forms/FormError'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/useToast'
import { applyServerErrors } from '@/lib/errors'
import { OrganizationFields } from '../../../organization/components/OrganizationFields'
import { useMyOrganization, useUpdateMyOrganization } from '../../../organization/hooks/useOrganization'
import { ORGANIZATION_FIELDS, organizationDefaults, organizationSchema, toOrganizationInput, type OrganizationForm } from '../../../organization/schemas/organization.schema'
import { StepNote } from './StepParts'

export function SchoolStep({ onDone }: { onDone: () => void }) {
  const org = useMyOrganization()
  const update = useUpdateMyOrganization()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<OrganizationForm>({ resolver: zodResolver(organizationSchema), defaultValues: organizationDefaults(undefined) })

  useEffect(() => {
    if (org.data) form.reset(organizationDefaults(org.data))
  }, [org.data, form])

  if (org.isPending) return <PageLoader />
  if (org.isError) return <ErrorState error={org.error} onRetry={() => void org.refetch()} />

  const submit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await update.mutateAsync(toOrganizationInput(values))
      toast.success('School details saved.')
      onDone()
    } catch (err) {
      setServerError(applyServerErrors(err, form.setError, ORGANIZATION_FIELDS))
    }
  })

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <FormError message={serverError} />
      <OrganizationFields form={form} compact />
      <StepNote>A school logo can be added once logo upload is available.</StepNote>
      <div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
          Save and continue
        </Button>
      </div>
    </form>
  )
}
