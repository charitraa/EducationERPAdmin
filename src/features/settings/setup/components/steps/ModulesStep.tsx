import { BedDouble, BookOpen, Briefcase, Bus, CalendarClock, ClipboardCheck, Sparkles, Wallet } from 'lucide-react'
import { StepNote } from './StepParts'

const MODULES = [
  { icon: Wallet, name: 'Fees', text: 'Fee structures per program, term invoices, payments and receipts, scholarships.' },
  { icon: ClipboardCheck, name: 'Exams & grading', text: 'Exams, marks entry by teachers, grade scales, results, report cards and transcripts.' },
  { icon: CalendarClock, name: 'Timetable', text: 'Bell schedules, who teaches what and when, substitutions.' },
  { icon: BookOpen, name: 'Library', text: 'Books, members, issues and returns, reservations, fines.' },
  { icon: BedDouble, name: 'Hostel', text: 'Buildings, rooms and beds, check-in and check-out, complaints.' },
  { icon: Bus, name: 'Transport', text: 'Routes, stops, vehicles, bus assignments and trip roll calls.' },
  { icon: Briefcase, name: 'HR & payroll', text: 'Contracts, leave and approvals, monthly payroll and payslips.' },
  { icon: Sparkles, name: 'Alumni & careers', text: 'Alumni directory and giving, your own hiring, and a job board.' },
]

export function ModulesStep() {
  return (
    <div className="grid gap-4">
      <StepNote>
        These are all ready on the server and need no switching on: each appears in the menu for the people whose role allows it. Their screens arrive
        module by module.
      </StepNote>
      <ul className="grid gap-3 sm:grid-cols-2">
        {MODULES.map((m) => (
          <li key={m.name} className="flex gap-3 rounded-md border p-3">
            <m.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-medium">{m.name}</p>
              <p className="text-xs text-muted-foreground">{m.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
