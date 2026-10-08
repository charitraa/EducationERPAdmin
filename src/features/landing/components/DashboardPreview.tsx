import { Bell, CalendarCheck, GraduationCap, LayoutDashboard, Megaphone, Search, Users, Wallet, type LucideIcon } from 'lucide-react'
import { tr } from '@/lib/i18n'

/* Illustrative numbers for the landing page's picture of the dashboard. */
const STATS = [
  { label: tr('Total students'), value: '1,248', note: tr('+32 this term') },
  { label: tr('Teachers'), value: '86', note: tr('4 departments') },
  { label: tr('Attendance today'), value: '94%', note: tr('1,173 present') },
  { label: tr('Fees collected'), value: 'Rs 18.4L', note: tr('Rs 3.1L pending') },
]
const WEEK = [
  { day: tr('Sun'), pct: 92 },
  { day: tr('Mon'), pct: 95 },
  { day: tr('Tue'), pct: 91 },
  { day: tr('Wed'), pct: 96 },
  { day: tr('Thu'), pct: 94 },
  { day: tr('Fri'), pct: 89 },
]
const ACTIVITY: { icon: LucideIcon; text: string; time: string }[] = [
  { icon: Wallet, text: tr('Fee payment received · Grade 9 A'), time: tr('2 min') },
  { icon: Users, text: tr('New student added · Grade 6 B'), time: tr('18 min') },
  { icon: Megaphone, text: tr('Notice published · Parents meeting'), time: tr('1 h') },
]
const SIDE: { icon: LucideIcon; active?: boolean }[] = [{ icon: LayoutDashboard, active: true }, { icon: Users }, { icon: CalendarCheck }, { icon: GraduationCap }, { icon: Wallet }, { icon: Megaphone }]

export function DashboardPreview() {
  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_40px_-12px_rgb(15_23_42/0.18)]" role="img" aria-label={tr('Preview of the admin dashboard')}>
        {/* Window bar */}
        <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-3 h-5 flex-1 rounded bg-background/80" />
        </div>
        <div className="flex" aria-hidden>
          <div className="hidden w-12 shrink-0 flex-col items-center gap-2 bg-sidebar py-3 sm:flex">
            <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-sidebar-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            {SIDE.map(({ icon: Icon, active }, i) => (
              <span key={i} className={`flex h-8 w-8 items-center justify-center rounded-md ${active ? 'bg-sidebar-accent text-sidebar-foreground' : 'text-sidebar-muted'}`}>
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{tr('Good morning, Admin')} 👋</p>
                <p className="truncate text-[11px] text-muted-foreground">{tr("Here's what's happening at your institution today.")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                <span className="hidden h-7 w-28 items-center gap-1.5 rounded-md border bg-background px-2 text-[11px] sm:flex">
                  <Search className="h-3 w-3" /> {tr('Search')}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md border bg-background">
                  <Bell className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-lg border bg-background p-2.5">
                  <p className="truncate text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums">{s.value}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{s.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="rounded-lg border bg-background p-2.5">
                <p className="text-[11px] font-medium">{tr('Attendance this week')}</p>
                <div className="mt-2 flex h-24 items-end gap-2">
                  {WEEK.map((d) => (
                    <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                      {/* Scaled from 80% so the differences between days show. */}
                      <div className="w-full max-w-6 rounded-sm bg-primary/80" style={{ height: `${((d.pct - 80) / 20) * 100}%` }} />
                      <span className="text-[9px] text-muted-foreground">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-background p-2.5">
                <p className="text-[11px] font-medium">{tr('Fee overview')}</p>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                  <span className="bg-success" style={{ width: '72%' }} />
                  <span className="bg-warning" style={{ width: '20%' }} />
                  <span className="bg-danger" style={{ width: '8%' }} />
                </div>
                <ul className="mt-3 grid gap-1.5 text-[10px]">
                  {[
                    { c: 'bg-success', l: tr('Collected'), v: '72%' },
                    { c: 'bg-warning', l: tr('Pending'), v: '20%' },
                    { c: 'bg-danger', l: tr('Overdue'), v: '8%' },
                  ].map((r) => (
                    <li key={r.l} className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${r.c}`} />
                      <span className="flex-1 text-muted-foreground">{r.l}</span>
                      <span className="font-medium tabular-nums">{r.v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-2 hidden rounded-lg border bg-background p-2.5 sm:block">
              <p className="text-[11px] font-medium">{tr('Recent activity')}</p>
              <ul className="mt-1.5 grid gap-1.5">
                {ACTIVITY.map(({ icon: Icon, text, time }) => (
                  <li key={text} className="flex items-center gap-2 text-[11px]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground">
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{text}</span>
                    <span className="text-[10px] text-muted-foreground">{time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-muted-foreground">{tr('Sample data shown.')}</figcaption>
    </figure>
  )
}
