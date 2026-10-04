import { Check, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { SectionHeader } from '@/components/common/SectionHeader'
import { Button } from '@/components/ui/button'
import { useApplicationTypes, useCreateApplicationType } from '@/features/applications/hooks/useApplications'
import { useCreateGradeScale, useGradeScales } from '@/features/examinations/hooks/useExaminations'
import { useCategories, useCreateCategory } from '@/features/finance/hooks/useFinance'
import { useCreateLeaveType, useLeaveTypes } from '@/features/hr/hooks/useHr'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { errorMessage } from '@/lib/errors'
import type { PermissionRequirement } from '@/lib/permissions'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'

interface Template {
  key: string
  name: string
  detail: string
  create: () => Promise<unknown>
}

/** One template: what it adds, and an Add button that turns into "Added" once it exists. */
function TemplateRow({ t, exists, allowed }: { t: Template; exists: boolean; allowed: boolean }) {
  const [busy, setBusy] = useState(false)
  return (
    <li className="flex items-start gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t.name}</p>
        <p className="text-muted-foreground">{t.detail}</p>
      </div>
      {exists ? (
        <span className="inline-flex items-center gap-1 text-xs text-success">
          <Check className="h-3.5 w-3.5" aria-hidden /> Added
        </span>
      ) : (
        allowed && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            aria-label={`Add ${t.name}`}
            onClick={async () => {
              setBusy(true)
              try {
                await t.create()
                toast.success(`${t.name} added.`)
              } catch (e) {
                toast.error(errorMessage(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Plus aria-hidden /> Add
          </Button>
        )
      )}
    </li>
  )
}

function Section({ title, description, permission, children }: { title: string; description: string; permission: PermissionRequirement; children: (allowed: boolean) => ReactNode }) {
  const { can } = usePermissions()
  return (
    <section>
      <SectionHeader title={title} description={description} />
      <ul className="divide-y rounded-lg border bg-card">{children(can(permission))}</ul>
    </section>
  )
}

const FEE_ITEMS = [
  ['tuition', 'Tuition fee', 'Charged every term.'],
  ['admission', 'Admission fee', 'Once, on joining.'],
  ['exam', 'Examination fee', 'For each exam session.'],
  ['library', 'Library fee', 'Yearly.'],
  ['lab', 'Laboratory fee', 'For science and computer labs.'],
  ['transport', 'Transport fee', 'For riders, billed from Transport.'],
  ['hostel', 'Hostel fee', 'For residents, billed from Hostel.'],
] as const

const LEAVE_TYPES = [
  { code: 'casual', name: 'Casual leave', annual_quota: '12', carry_forward_max: '0', detail: '12 days a year, no carry-over.' },
  { code: 'sick', name: 'Sick leave', annual_quota: '12', carry_forward_max: '45', detail: '12 days a year; up to 45 carry over.' },
  { code: 'home', name: 'Home leave', annual_quota: '18', carry_forward_max: '60', detail: '18 days a year; up to 60 carry over.' },
  { code: 'maternity', name: 'Maternity leave', annual_quota: '98', carry_forward_max: '0', gender: 'female', allow_half_day: false, prorate_for_joiners: false, detail: '98 days, women only.' },
  { code: 'paternity', name: 'Paternity leave', annual_quota: '15', carry_forward_max: '0', gender: 'male', allow_half_day: false, prorate_for_joiners: false, detail: '15 days, men only.' },
  { code: 'unpaid', name: 'Unpaid leave', annual_quota: null, carry_forward_max: '0', is_paid: false, detail: 'No limit; payroll deducts the days.' },
] as const

const FORMS = [
  {
    code: 'leave',
    name: 'Staff leave',
    kind: 'leave' as const,
    detail: 'Staff apply; whoever approves leave for their branch decides.',
    steps: [{ name: 'Head of department', permission: 'hr.approve_leave' }],
  },
  {
    code: 'certificate',
    name: 'Character certificate',
    kind: 'certificate' as const,
    certificate_title: 'Character Certificate',
    detail: 'Students or parents ask; the office issues it.',
    steps: [{ name: 'Office', permission: 'applications.certify' }],
  },
  {
    code: 'hostel',
    name: 'Hostel bed',
    kind: 'hostel' as const,
    detail: 'Students ask for a bed; the warden assigns one.',
    steps: [{ name: 'Warden', permission: 'hostel.manage' }],
  },
  {
    code: 'transport',
    name: 'School bus',
    kind: 'transport' as const,
    detail: 'Students pick a route and stop; the transport office approves.',
    steps: [{ name: 'Transport office', permission: 'transport.manage' }],
  },
]

/** Ready-made setups an administrator adds with one click, then edits like anything else. */
export default function TemplatesPage() {
  const scales = useGradeScales({ ...PICKER_PARAMS })
  const createScale = useCreateGradeScale()
  const categories = useCategories({ ...PICKER_PARAMS })
  const createCategory = useCreateCategory()
  const leaveTypes = useLeaveTypes({ ...PICKER_PARAMS })
  const createLeaveType = useCreateLeaveType()
  const forms = useApplicationTypes({ ...PICKER_PARAMS })
  const createForm = useCreateApplicationType()
  const scaleNames = new Set((scales.data?.results ?? []).map((s) => s.name))
  const categoryCodes = new Set((categories.data?.results ?? []).map((c) => c.code))
  const leaveCodes = new Set((leaveTypes.data?.results ?? []).map((t) => t.code))
  const formCodes = new Set((forms.data?.results ?? []).map((f) => f.code))

  return (
    <div>
      <PageHeader title="Templates" description="Standard setups to start from. Each adds ordinary records you can edit or remove afterwards." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Grade scales" description="Used by exams and report cards." permission={PERMS.grades.manage}>
          {(allowed) =>
            (
              [
                { key: 'neb', name: 'NEB letter grades', preset: 'neb-style' as const, detail: 'A+ (90%) down to D, then NG, with grade points to 4.0.' },
                { key: 'pct', name: 'Percentage with divisions', preset: 'percentage' as const, detail: 'Pass at 35%, classed as distinction, first, second or third division.' },
              ] as const
            ).map((s) => <TemplateRow key={s.key} allowed={allowed} exists={scaleNames.has(s.name)} t={{ key: s.key, name: s.name, detail: s.detail, create: () => createScale.mutateAsync({ name: s.name, preset: s.preset }) }} />)
          }
        </Section>
        <Section title="Fee items" description="Fee categories; amounts are set per class in fee structures." permission={PERMS.finance.manage}>
          {(allowed) => FEE_ITEMS.map(([code, name, detail]) => <TemplateRow key={code} allowed={allowed} exists={categoryCodes.has(code)} t={{ key: code, name, detail, create: () => createCategory.mutateAsync({ code, name, description: detail }) }} />)}
        </Section>
        <Section title="Leave types" description="Common in Nepal’s labour rules; adjust the days to your policy." permission={PERMS.hr.manage}>
          {(allowed) =>
            LEAVE_TYPES.map(({ detail, ...t }) => (
              <TemplateRow key={t.code} allowed={allowed} exists={leaveCodes.has(t.code)} t={{ key: t.code, name: t.name, detail, create: () => createLeaveType.mutateAsync(t as never) }} />
            ))
          }
        </Section>
        <Section title="Application forms" description="Each with a one-step approval; add more steps after." permission={PERMS.applications.manage}>
          {(allowed) =>
            FORMS.map(({ detail, ...f }) => (
              <TemplateRow key={f.code} allowed={allowed} exists={formCodes.has(f.code)} t={{ key: f.code, name: f.name, detail, create: () => createForm.mutateAsync({ ...f, fields: [], is_active: true }) }} />
            ))
          }
        </Section>
      </div>
    </div>
  )
}
