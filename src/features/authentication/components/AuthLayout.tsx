import { GraduationCap } from 'lucide-react'
import type { ReactNode } from 'react'

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-semibold">Education ERP</span>
        </div>
        <div className="max-w-md">
          <p className="text-2xl font-semibold leading-snug">Admissions to report cards, attendance to payroll — one place for the whole school.</p>
          <p className="mt-3 text-sm text-sidebar-muted">Built for schools and colleges in Nepal. Dates in AD with BS alongside, money in rupees, your data only ever visible to your school.</p>
        </div>
        <p className="text-xs text-sidebar-muted">© {new Date().getFullYear()} Education ERP</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/5" aria-hidden />
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full border border-white/5" aria-hidden />
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-semibold">Education ERP</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
