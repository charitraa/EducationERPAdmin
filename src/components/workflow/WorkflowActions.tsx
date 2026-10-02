import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionRequirement } from '@/lib/permissions'

export interface WorkflowAction {
  id: string
  label: string
  icon?: LucideIcon
  /** Statuses this action is valid from. */
  from: readonly string[]
  permission?: PermissionRequirement
  variant?: 'default' | 'outline' | 'destructive'
  /** Ask first; the description explains what happens next. */
  confirm?: { title: string; description?: string }
  run: () => unknown | Promise<unknown>
}

/**
 * Only the actions the current status allows AND the user may take. Nothing
 * invalid is ever shown disabled-but-visible.
 */
export function WorkflowActions({ status, actions }: { status: string; actions: WorkflowAction[] }) {
  const { can } = usePermissions()
  const [confirming, setConfirming] = useState<WorkflowAction | null>(null)
  const available = actions.filter((a) => a.from.includes(status) && can(a.permission))
  if (available.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((action) => {
        const Icon = action.icon
        return (
          <Button
            key={action.id}
            variant={action.variant ?? 'outline'}
            size="sm"
            onClick={() => (action.confirm ? setConfirming(action) : void action.run())}
          >
            {Icon && <Icon aria-hidden />}
            {action.label}
          </Button>
        )
      })}
      {confirming && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setConfirming(null)}
          title={confirming.confirm!.title}
          description={confirming.confirm!.description}
          confirmLabel={confirming.label}
          tone={confirming.variant === 'destructive' ? 'destructive' : 'default'}
          onConfirm={confirming.run}
        />
      )}
    </div>
  )
}
