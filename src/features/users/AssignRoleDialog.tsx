import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { FormField } from '@/components/ui/FormField'
import { useRoles } from '@/features/roles/hooks'
import { useCampuses } from '@/features/campuses/hooks'
import { useAssignRole } from './hooks'
import { toApiError } from '@/lib/api/errors'
import { toast } from '@/stores/toast-store'

export function AssignRoleDialog({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: number }) {
  const [roleId, setRoleId] = useState('')
  const [campusId, setCampusId] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const { data: roles } = useRoles({ page_size: 200 })
  const { data: campuses } = useCampuses({ page_size: 200 })
  const assignRole = useAssignRole()

  const reset = () => {
    setRoleId('')
    setCampusId('')
    setExpiresAt('')
  }

  const submit = async () => {
    try {
      await assignRole.mutateAsync({
        id: userId,
        payload: {
          role: Number(roleId),
          campus: campusId ? Number(campusId) : null,
          expires_at: expiresAt || null,
        },
      })
      toast({ title: 'Role assigned', variant: 'success' })
      reset()
      onClose()
    } catch (err) {
      toast({ title: 'Could not assign role', description: toApiError(err).message, variant: 'error' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose()
        reset()
      }}
      title="Assign a role"
      size="sm"
      footer={
        <Button onClick={submit} loading={assignRole.isPending} disabled={!roleId}>
          Assign
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Role" required>
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Select a role…</option>
            {roles?.results.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Campus" hint="Leave blank for an organization-wide role">
          <Select value={campusId} onChange={(e) => setCampusId(e.target.value)}>
            <option value="">Organization-wide</option>
            {campuses?.results.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Expires on" hint="Optional">
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  )
}
