import { ChevronRight } from 'lucide-react'
import { Link, useMatches } from 'react-router-dom'

export interface RouteHandle {
  /** Shown in the breadcrumb trail for this route. */
  crumb?: string
}

export function Breadcrumbs() {
  const crumbs = useMatches()
    .filter((m) => (m.handle as RouteHandle | undefined)?.crumb)
    .map((m) => ({ path: m.pathname, label: (m.handle as RouteHandle).crumb! }))
  // Collapse consecutive duplicates (an index route repeating its parent).
  const trail = crumbs.filter((c, i) => i === 0 || c.label !== crumbs[i - 1]!.label)
  if (trail.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {trail.map((c, i) => {
          const last = i === trail.length - 1
          return (
            <li key={c.path} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              {last ? (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {c.label}
                </span>
              ) : (
                <Link to={c.path} className="truncate hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
