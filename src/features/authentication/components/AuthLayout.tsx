import { Check, GraduationCap } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { tr } from '@/lib/i18n'

const BENEFITS = [
  tr('Students, teachers, attendance, exams and fees in one place'),
  tr('Set up in minutes with a step-by-step guide'),
  tr('Dates in AD with BS alongside, money in rupees'),
  tr('Your data is only ever visible to your institution'),
]

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2.5 self-start rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-semibold">{tr('Education ERP')}</span>
        </Link>
        <div className="max-w-md">
          <p className="text-2xl font-semibold leading-snug">{tr('Admissions to report cards, attendance to payroll — one place for the whole school.')}</p>
          <ul className="mt-6 grid gap-3 text-sm">
            {BENEFITS.map((b) => (
              <li key={b} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                <span className="text-sidebar-foreground/90">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-muted">{tr('© {fullYear} Education ERP', { fullYear: new Date().getFullYear() })}</p>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/5" aria-hidden />
        <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full border border-white/5" aria-hidden />
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-semibold">{tr('Education ERP')}</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
