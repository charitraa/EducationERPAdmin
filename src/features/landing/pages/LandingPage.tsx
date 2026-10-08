import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  ChartColumn,
  Check,
  ChevronDown,
  ClipboardCheck,
  FolderOpen,
  Landmark,
  Megaphone,
  MonitorSmartphone,
  School,
  Shapes,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePageMeta } from '@/hooks/usePageMeta'
import { tr, useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { DashboardPreview } from '../components/DashboardPreview'
import { SiteFooter, SiteHeader } from '../components/SiteChrome'

const HIGHLIGHTS = [tr('100% free'), tr('Easy to set up'), tr('No technical skills needed'), tr('Built for schools and colleges')]

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Users, title: tr('Student management'), text: tr('Add, edit, search and manage complete student records.') },
  { icon: UserCog, title: tr('Teacher & staff management'), text: tr('Manage teachers, staff profiles, departments, roles and responsibilities.') },
  { icon: CalendarCheck, title: tr('Attendance'), text: tr('Track daily student and teacher attendance easily.') },
  { icon: Shapes, title: tr('Classes & sections'), text: tr('Create classes, sections, subjects and academic sessions, and assign teachers.') },
  { icon: ClipboardCheck, title: tr('Examinations & results'), text: tr('Create exams, enter marks, work out grades and results, and print report cards.') },
  { icon: Wallet, title: tr('Fees management'), text: tr('Manage fee structures, payments, pending fees, invoices and payment history.') },
  { icon: Megaphone, title: tr('Notices & announcements'), text: tr('Send important notices to students, teachers and parents.') },
  { icon: CalendarClock, title: tr('Timetable'), text: tr('Build and manage class and teacher timetables.') },
  { icon: ChartColumn, title: tr('Reports'), text: tr('Get academic, attendance, financial and student reports.') },
  { icon: MonitorSmartphone, title: tr('Parent & student portal'), text: tr('Students and parents see their own timetable, attendance, results and fees.') },
  { icon: ShieldCheck, title: tr('Users & roles'), text: tr('Create users and decide what each role can see and do.') },
  { icon: FolderOpen, title: tr('Documents'), text: tr('Keep important student and institution documents in one safe place.') },
]

const STEPS: { title: string; text: string; items: string[] }[] = [
  {
    title: tr('Create your account'),
    text: tr('Click "Get started free" and register your school or college. It takes about two minutes.'),
    items: [tr('Institution name'), tr('Institution type'), tr('Administrator name'), tr('Email'), tr('Phone'), tr('Password')],
  },
  {
    title: tr('Set up your institution'),
    text: tr('A step-by-step guide helps you add the basics. Skip anything and come back to it later.'),
    items: [tr('Logo & address'), tr('Academic session'), tr('Classes & sections'), tr('Subjects'), tr('Teachers & staff')],
  },
  {
    title: tr('Start managing'),
    text: tr('Your dashboard is ready. Run the day-to-day work of your institution from one place.'),
    items: [tr('Students'), tr('Attendance'), tr('Exams'), tr('Fees'), tr('Timetable'), tr('Notices'), tr('Reports')],
  },
]

const FREE_POINTS = [
  tr('Free account'),
  tr('No setup fee'),
  tr('Nothing to install'),
  tr('Easy onboarding'),
  tr('Essential ERP features included'),
  tr('Use it from anywhere'),
  tr('Secure, cloud-based system'),
]

const AUDIENCES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: School, title: tr('Schools'), text: tr('Manage students, teachers, attendance, exams, fees, classes and communication.') },
  { icon: Landmark, title: tr('Colleges'), text: tr('Manage departments, students, teachers, courses, exams, attendance and administration.') },
  { icon: BookOpen, title: tr('Higher secondary schools'), text: tr('Manage academic sessions, classes, subjects, exams, results and students.') },
  { icon: Building2, title: tr('Other institutions'), text: tr('Flexible tools for training centres, institutes and other educational organizations.') },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: tr('Is it really free?'),
    a: tr('Yes. Creating an account and using the essential features costs nothing. There is no setup fee and no card is needed to sign up.'),
  },
  {
    q: tr('Do I need technical skills?'),
    a: tr('No. Everything works in the web browser, and a setup guide walks you through adding your classes, subjects and staff. If you can use email, you can use Education ERP.'),
  },
  {
    q: tr('Can I bring in our existing student records?'),
    a: tr('Yes. Students, staff and alumni can be imported from a spreadsheet saved as CSV. Each row is checked and any problems are shown so you can fix them.'),
  },
  {
    q: tr('Can parents and students log in?'),
    a: tr('Yes. Give them an account and they see only their own information: timetable, attendance, exam results, admit cards and fees.'),
  },
  {
    q: tr('Who can see our data?'),
    a: tr("Only the people your institution gives an account to. Each institution's data is kept separate, and roles and permissions control what every user can see and change."),
  },
  {
    q: tr('Does it support Nepali and Bikram Sambat dates?'),
    a: tr('Yes. Switch the whole interface to Nepali at any time. Dates are shown in AD with the BS date alongside, and amounts are in rupees.'),
  },
  {
    q: tr('We have more than one branch. Will it work for us?'),
    a: tr('Yes. Add each branch or campus, then switch between them, or see them all together.'),
  },
]

function Section({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-16 px-4 py-16 sm:px-6 sm:py-24', className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

function SectionHeading({ eyebrow, title, text, center = true }: { eyebrow: string; title: string; text?: string; center?: boolean }) {
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{text}</p>}
    </div>
  )
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
      <span>{children}</span>
    </li>
  )
}

/** The public front door: what it is, who it's for, what it does, why it's free, how to join. */
export default function LandingPage() {
  useLocale()

  usePageMeta({
    title: tr('Education ERP — Free School & College Management Software'),
    description: tr('Education ERP is a free, simple school and college management system. Manage students, teachers, attendance, exams, results, fees, timetables, notices and reports in one place.'),
  })

  return (
    <div id="top" className="min-h-dvh bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        {tr('Skip to content')}
      </a>
      <SiteHeader />

      <main id="main">
        {/* Hero */}
        <section className="overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                {tr('Free for every school and college')}
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                {tr('Manage your school.')}
                <br />
                <span className="text-primary">{tr('All in one place.')}</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {tr('A simple, powerful and completely free Education ERP that helps schools and colleges manage students, teachers, attendance, fees, exams, communication and daily operations from one place.')}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="text-base">
                  <Link to="/signup">
                    {tr('Get started free')} <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-base">
                  <Link to="/login">{tr('Log in to admin')}</Link>
                </Button>
              </div>
              <ul className="mt-8 grid gap-x-6 gap-y-2.5 text-sm font-medium sm:grid-cols-2">
                {HIGHLIGHTS.map((h) => (
                  <CheckItem key={h}>{h}</CheckItem>
                ))}
              </ul>
            </div>
            <DashboardPreview />
          </div>
        </section>

        {/* What can you do? */}
        <Section id="features" className="border-t bg-card">
          <SectionHeading
            eyebrow={tr('What can you do?')}
            title={tr('Everything your institution runs on')}
            text={tr('From admission to report card, the everyday work of a school or college lives in one tidy admin panel.')}
          />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 rounded-lg border bg-background p-4 transition-shadow hover:shadow-sm sm:block sm:p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold sm:mt-4">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:mt-1.5">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {/* How it works */}
        <Section id="how-it-works" className="border-t">
          <SectionHeading eyebrow={tr('How it works')} title={tr('Up and running in three steps')} text={tr('Sign up → Set up your institution → Start managing')} />
          <ol className="relative mt-12 grid gap-6 lg:grid-cols-3">
            {/* The line that joins the step numbers on wide screens. */}
            <span className="absolute left-[16.66%] right-[16.66%] top-5 hidden h-px bg-border lg:block" aria-hidden />
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex flex-col rounded-lg border bg-card p-6 lg:border-0 lg:bg-transparent lg:p-0 lg:text-center">
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-8 ring-background lg:mx-auto">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5 lg:justify-center">
                  {s.items.map((item) => (
                    <li key={item} className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                      {item}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link to="/signup">
                {tr('Create your free account')} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
        </Section>

        {/* Why is it free? */}
        <Section id="benefits" className="border-t bg-card">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeading center={false} eyebrow={tr('Why is it free?')} title={tr('Powerful education management, without the cost.')} />
              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {tr('Schools and colleges should have access to modern technology whatever their budget. Education ERP gives you the essential tools to run your institution completely free, so going digital is within reach of institutions of every size.')}
              </p>
            </div>
            <div className="rounded-xl border bg-background p-6 sm:p-8">
              <p className="font-semibold">{tr('What you get')}</p>
              <ul className="mt-5 grid gap-3.5 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {FREE_POINTS.map((p) => (
                  <CheckItem key={p}>{p}</CheckItem>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Who can use it? */}
        <Section id="who" className="border-t">
          <SectionHeading eyebrow={tr('Who can use it?')} title={tr('Made for every kind of institution')} />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-lg border bg-card p-6">
                <Icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-xl border bg-accent/60 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
            <p className="text-lg font-semibold">{tr('Your institution can start today — for free.')}</p>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/signup">{tr('Create free institution')}</Link>
            </Button>
          </div>
        </Section>

        {/* FAQ */}
        <Section id="faq" className="border-t bg-card">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
            <SectionHeading center={false} eyebrow={tr('FAQ')} title={tr('Questions, answered')} text={tr('Anything else you want to know? Create an account and look around. It costs nothing.')} />
            <div className="divide-y rounded-lg border bg-background">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        {/* Final call to action */}
        <section className="bg-sidebar px-4 py-16 text-sidebar-foreground sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{tr('Ready to simplify your institution management?')}</h2>
            <p className="mt-4 text-base leading-relaxed text-sidebar-foreground/80 sm:text-lg">{tr('Join Education ERP today and run your school or college from one simple platform.')}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-white text-base text-[hsl(224_35%_15%)] hover:bg-white/90">
                <Link to="/signup">
                  {tr('Create free account')} <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/25 bg-transparent text-base text-sidebar-foreground hover:bg-white/10 hover:text-sidebar-foreground">
                <Link to="/login">{tr('Log in')}</Link>
              </Button>
            </div>
            <p className="mt-8 text-sm text-sidebar-muted">{tr('No complicated setup. No expensive software. Just simple education management.')}</p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
