import { Ban, CheckCircle2, IdCard } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { AdmitCard, Exam } from '../api/examinations.api'
import { useAdmitCards, useGenerateAdmitCards, useReleaseCard, useWithholdCard } from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

/** Issue cards to every candidate (those under the attendance minimum get a withheld one), then withhold or release single cards. */
export function AdmitCardsPanel({ exam }: { exam: Exam }) {
  const { can } = usePermissions()
  const manage = can(PERMS.exams.manage)
  const list = useListState({ filters: ['status'] })
  const cards = useAdmitCards({ ...list.query, exam: exam.id })
  const generate = useGenerateAdmitCards()
  const withhold = useWithholdCard()
  const release = useReleaseCard()
  const [generating, setGenerating] = useState(false)
  const [withholding, setWithholding] = useState<AdmitCard | null>(null)
  const [releasing, setReleasing] = useState<AdmitCard | null>(null)

  const columns: Column<AdmitCard>[] = [
    { id: 'number', header: tr('Card'), className: 'font-mono text-xs', cell: (c) => c.card_number },
    {
      id: 'student',
      header: tr('Student'),
      mobile: 'title',
      cell: (c) => (
        <span>
          <span className="font-medium">{c.student_name}</span> <span className="font-mono text-xs text-muted-foreground">{c.student_number}</span>
        </span>
      ),
    },
    { id: 'section', header: tr('Class'), cell: (c) => c.section_name },
    {
      id: 'status',
      header: tr('Status'),
      cell: (c) => (
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status === 'withheld' ? 'suspended' : 'issued'} label={enumLabel('AdmitCardStatusEnum', c.status)} />
          {c.withheld_reason && <span className="text-xs text-muted-foreground">{c.withheld_reason}</span>}
        </span>
      ),
    },
  ]

  return (
    <>
      <DataTable
        ariaLabel={tr('Admit cards')}
        columns={columns}
        query={cards}
        list={list}
        getRowId={(c) => c.id}
        searchPlaceholder={tr('Search name, number, card…')}
        create={
          manage && (
            <Button onClick={() => setGenerating(true)} disabled={exam.status === 'draft'}>
              <IdCard aria-hidden /> {tr('Issue admit cards')}
            </Button>
          )
        }
        filters={[{ name: 'status', label: tr('Status'), options: enumOptions('AdmitCardStatusEnum') }]}
        rowActions={(c) => (
          <RowActions
            actions={[
              { label: tr('Withhold'), icon: Ban, permission: PERMS.exams.manage, hidden: c.status === 'withheld', onSelect: () => setWithholding(c) },
              { label: tr('Release'), icon: CheckCircle2, permission: PERMS.exams.manage, hidden: c.status !== 'withheld', onSelect: () => setReleasing(c) },
            ]}
          />
        )}
        empty={{ title: tr('No admit cards yet'), description: exam.status === 'draft' ? tr('Schedule the exam, then issue admit cards.') : tr('Issue them to every candidate in one go.') }}
      />
      <ConfirmDialog
        open={generating}
        onOpenChange={setGenerating}
        title={tr('Issue admit cards?')}
        description={tr('Every candidate without a card gets one{value}. Existing cards are left alone, so it’s safe to run again.', { value: exam.min_attendance_percent ? '; ' + tr('anyone under {percent}% attendance gets it withheld', { percent: Number(exam.min_attendance_percent) }) : '' })}
        confirmLabel={tr('Issue cards')}
        onConfirm={async () => {
          const r = (await generate.mutateAsync({ id: exam.id })) as { created: number; withheld: number; skipped: number }
          toast.success(tr('{created} issued{value}{value2}.', { created: r.created, value: r.withheld ? ', ' + tr('{withheld} withheld', { withheld: r.withheld }) : '', value2: r.skipped ? ', ' + tr('{skipped} already had one', { skipped: r.skipped }) : '' }))
        }}
      />
      <FormDialog
        open={withholding != null}
        onOpenChange={(o) => !o && setWithholding(null)}
        title={withholding ? tr('Withhold {student_name}’s admit card?', { student_name: withholding.student_name }) : tr('Withhold')}
        submitLabel={tr('Withhold')}
        schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await withhold.mutateAsync({ id: withholding!.id, reason: v.reason })
          toast.success(tr('Admit card withheld.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Input {...register('reason')} maxLength={255} placeholder={tr('Fees outstanding, attendance below minimum…')} />
          </FormField>
        )}
      </FormDialog>
      <ConfirmDialog
        open={releasing != null}
        onOpenChange={(o) => !o && setReleasing(null)}
        title={tr('Release this admit card?')}
        description={releasing ? tr('{student_name} can sit the exam.', { student_name: releasing.student_name }) : undefined}
        confirmLabel={tr('Release')}
        onConfirm={async () => {
          await release.mutateAsync(releasing!.id)
          toast.success(tr('Released.'))
        }}
      />
    </>
  )
}
