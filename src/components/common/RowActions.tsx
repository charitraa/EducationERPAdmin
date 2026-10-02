import { MoreHorizontal, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionRequirement } from '@/lib/permissions'

export interface RowAction {
  label: string
  icon?: LucideIcon
  onSelect: () => void
  permission?: PermissionRequirement
  destructive?: boolean
  hidden?: boolean
}

/** The ⋯ menu on a table row. Shows only actions the user may take; nothing at all if none. */
export function RowActions({ actions, label = 'Row actions' }: { actions: RowAction[]; label?: string }) {
  const { can } = usePermissions()
  const visible = actions.filter((a) => !a.hidden && can(a.permission))
  if (visible.length === 0) return null
  const normal = visible.filter((a) => !a.destructive)
  const destructive = visible.filter((a) => a.destructive)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={label}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {normal.map((a) => (
          <DropdownMenuItem key={a.label} onSelect={a.onSelect}>
            {a.icon && <a.icon aria-hidden />}
            {a.label}
          </DropdownMenuItem>
        ))}
        {normal.length > 0 && destructive.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((a) => (
          <DropdownMenuItem key={a.label} onSelect={a.onSelect} className="text-danger focus:text-danger">
            {a.icon && <a.icon aria-hidden />}
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
