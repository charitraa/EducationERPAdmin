import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function StatusPage({ icon: Icon, code, title, children, actions }: { icon: LucideIcon; code?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-7 w-7 text-muted-foreground" aria-hidden />
      </div>
      {code && <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{code}</p>}
      <h1 className="mt-1 text-xl font-semibold">{title}</h1>
      {children && <div className="mt-2 max-w-md text-sm text-muted-foreground">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  )
}
