import { Award as AwardIcon, CircleStop, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DeleteDialog } from '@/components/common/DeleteDialog'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { code, requiredId, toNullableInt, wholeNumber } from '@/lib/validation'
import { PERMS } from '@/shared/constants/permissions'
import type { Schema } from '@/shared/types/api'
import type { Award, AwardRule, StudentAward } from '../api/events.api'
import {
  useAwardOptions,
  useAwardRules,
  useAwards,
  useCategoryOptions,
  useCreateAward,
  useCreateAwardRule,
  useEndAward,
  useGrantAward,
  useRemoveAward,
  useRemoveAwardRule,
  useStudentAwards,
  useUpdateAward,
  useUpdateAwardRule,
} from '../hooks/useEvents'

const activeFilter = { name: 'is_active', label: 'Status', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] }
const addButton = (label: string, onClick: () => void) => (
  <PermissionGate permission={PERMS.events.manage}>
    <Button onClick={onClick}>
      <Plus aria-hidden /> {label}
    </Button>
  </PermissionGate>
)

// ---- Catalogue ----

const awardSchema = z.object({ kind: z.enum(['achievement', 'badge', 'title']), code, name: z.string().trim().min(1, 'Required.').max(200), description: z.string(), icon: z.string().trim().max(50), is_active: z.boolean() })

function AwardDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: Award | null }) {
  const create = useCreateAward()
  const update = useUpdateAward()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? `Edit ${record.name}` : 'Add award'}
      description="Achievements and badges are kept; a title (e.g. House captain) is usually held for a time and then ended."
      schema={awardSchema}
      defaultValues={{
        kind: (record?.kind as 'achievement') ?? 'badge',
        code: record?.code ?? '',
        name: record?.name ?? '',
        description: record?.description ?? '',
        icon: record?.icon ?? '',
        is_active: record?.is_active ?? true,
      }}
      onSubmit={async (v) => {
        const input = { ...v, kind: v.kind as Schema<'AwardKindEnum'> }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success(record ? 'Award saved.' : 'Award added.')
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Kind" error={errors.kind?.message}>
              {(p) => <Controller control={control} name="kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('AwardKindEnum')} />} />}
            </FormField>
            <FormField label="Code" required error={errors.code?.message}>
              <Input {...register('code')} className="font-mono" autoFocus />
            </FormField>
            <FormField label="Icon" error={errors.icon?.message} description="Optional name or emoji.">
              <Input {...register('icon')} placeholder="🏅" />
            </FormField>
          </div>
          <FormField label="Name" required error={errors.name?.message}>
            <Input {...register('name')} placeholder="Sports star" />
          </FormField>
          <FormField label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} />
          </FormField>
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Can be given
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

function CatalogueTab() {
  const list = useListState({ filters: ['kind', 'is_active'] })
  const query = useAwards(list.query)
  const crud = useCrudState<Award>()
  const remove = useRemoveAward()
  const columns: Column<Award>[] = [
    {
      id: 'name',
      header: 'Award',
      mobile: 'title',
      cell: (a) => (
        <span className="font-medium">
          {a.icon && <span className="mr-1.5" aria-hidden>{a.icon}</span>}
          {a.name}
        </span>
      ),
    },
    { id: 'kind', header: 'Kind', cell: (a) => enumLabel('AwardKindEnum', a.kind) },
    { id: 'desc', header: 'Description', mobile: 'hidden', cell: (a) => a.description || <span className="text-muted-foreground">—</span> },
    { id: 'status', header: 'Status', cell: (a) => <StatusBadge status={a.is_active === false ? 'inactive' : 'active'} /> },
  ]
  return (
    <>
      <div className="mb-3 flex justify-end">{addButton('Add award', crud.openCreate)}</div>
      <DataTable
        ariaLabel="Awards"
        columns={columns}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        searchPlaceholder="Search awards…"
        filters={[{ name: 'kind', label: 'Kind', options: enumOptions('AwardKindEnum') }, activeFilter]}
        rowActions={(a) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.events.manage, onSelect: () => crud.openEdit(a) },
              { label: 'Delete', icon: Trash2, permission: PERMS.events.manage, destructive: true, onSelect: () => crud.openDelete(a) },
            ]}
          />
        )}
        empty={{ title: 'No awards yet', description: 'Badges, achievements and titles students can earn.', action: addButton('Add the first award', crud.openCreate) }}
      />
      <AwardDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the award ${crud.deleting.name}`}
          description="An award students already hold can’t be deleted; make it inactive instead."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Award deleted.')
          }}
        />
      )}
    </>
  )
}

// ---- Automatic rules ----

const ruleSchema = z.object({ award: requiredId('Choose an award.'), threshold_kind: z.enum(['points_total', 'events_attended', 'events_won']), threshold_value: wholeNumber(), category: z.string(), is_active: z.boolean() })

function AwardRuleDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record: AwardRule | null }) {
  const create = useCreateAwardRule()
  const update = useUpdateAwardRule()
  const awards = useAwardOptions()
  const categories = useCategoryOptions()
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? 'Edit rule' : 'Give an award automatically'}
      description="Checked whenever a student earns points, is checked in, or has a role recorded."
      schema={ruleSchema}
      defaultValues={{
        award: record ? String(record.award) : '',
        threshold_kind: (record?.threshold_kind as 'points_total') ?? 'points_total',
        threshold_value: record ? String(record.threshold_value) : '',
        category: record?.category ? String(record.category) : '',
        is_active: record?.is_active ?? true,
      }}
      onSubmit={async (v) => {
        const input = { award: Number(v.award), threshold_kind: v.threshold_kind as Schema<'ThresholdKindEnum'>, threshold_value: Number(v.threshold_value), category: toNullableInt(v.category), is_active: v.is_active }
        if (record) await update.mutateAsync({ id: record.id, input })
        else await create.mutateAsync(input)
        toast.success('Rule saved.')
      }}
    >
      {({ register, control, watch, formState: { errors } }) => (
        <>
          <FormField label="Award" required error={errors.award?.message}>
            {(p) => (
              <Controller control={control} name="award" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} loading={awards.isPending} options={(awards.data ?? []).map((a) => ({ value: String(a.id), label: a.name }))} />} />
            )}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="When a student reaches" error={errors.threshold_kind?.message}>
              {(p) => <Controller control={control} name="threshold_kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('ThresholdKindEnum')} />} />}
            </FormField>
            <FormField label="Of at least" required error={errors.threshold_value?.message}>
              <Input {...register('threshold_value')} inputMode="numeric" />
            </FormField>
          </div>
          {watch('threshold_kind') !== 'points_total' && (
            <FormField label="Counting events in" error={errors.category?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel="Every category" options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name }))} />}
                />
              )}
            </FormField>
          )}
          <Controller
            control={control}
            name="is_active"
            render={({ field }) => (
              <label className="flex items-center gap-3 text-sm">
                <Switch checked={field.value} onCheckedChange={field.onChange} /> Active
              </label>
            )}
          />
        </>
      )}
    </FormDialog>
  )
}

function RulesTab() {
  const list = useListState({ filters: ['threshold_kind', 'is_active'] })
  const query = useAwardRules(list.query)
  const crud = useCrudState<AwardRule>()
  const remove = useRemoveAwardRule()
  const columns: Column<AwardRule>[] = [
    { id: 'award', header: 'Award', mobile: 'title', cell: (r) => <span className="font-medium">{r.award_name}</span> },
    { id: 'when', header: 'Given at', cell: (r) => `${r.threshold_value} ${enumLabel('ThresholdKindEnum', r.threshold_kind).toLowerCase()}${r.category_name ? ` (${r.category_name})` : ''}` },
    { id: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.is_active === false ? 'inactive' : 'active'} /> },
  ]
  return (
    <>
      <div className="mb-3 flex justify-end">{addButton('Add rule', crud.openCreate)}</div>
      <DataTable
        ariaLabel="Award rules"
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchable={false}
        filters={[{ name: 'threshold_kind', label: 'Based on', options: enumOptions('ThresholdKindEnum') }, activeFilter]}
        rowActions={(r) => (
          <RowActions
            actions={[
              { label: 'Edit', icon: Pencil, permission: PERMS.events.manage, onSelect: () => crud.openEdit(r) },
              { label: 'Delete', icon: Trash2, permission: PERMS.events.manage, destructive: true, onSelect: () => crud.openDelete(r) },
            ]}
          />
        )}
        empty={{ title: 'No automatic awards', description: 'e.g. the “Sports star” badge at 100 points, or “Regular” after 10 events attended.', action: addButton('Add a rule', crud.openCreate) }}
      />
      <AwardRuleDialog open={crud.formOpen} onOpenChange={(o) => !o && crud.closeForm()} record={crud.record} />
      {crud.deleting && (
        <DeleteDialog
          open
          onOpenChange={(o) => !o && crud.closeDelete()}
          subject={`the rule for ${crud.deleting.award_name}`}
          description="Awards it already gave are kept."
          onConfirm={async () => {
            await remove.mutateAsync(crud.deleting!.id)
            toast.success('Rule deleted.')
          }}
        />
      )}
    </>
  )
}

// ---- Who holds what ----

function GrantedTab() {
  const list = useListState({ filters: ['award'] })
  const query = useStudentAwards(list.query)
  const awards = useAwardOptions()
  const grant = useGrantAward()
  const end = useEndAward()
  const [granting, setGranting] = useState(false)
  const [ending, setEnding] = useState<StudentAward | null>(null)
  const columns: Column<StudentAward>[] = [
    { id: 'student', header: 'Student', mobile: 'title', cell: (g) => <span className="font-medium">{g.student_name}</span> },
    { id: 'award', header: 'Award', cell: (g) => `${g.award_name} · ${enumLabel('AwardKindEnum', g.award_kind)}` },
    { id: 'how', header: 'How', cell: (g) => (g.rule ? 'Automatic' : 'By hand') },
    { id: 'when', header: 'Since', className: 'tabular-nums', cell: (g) => formatDate(g.awarded_at) },
    { id: 'state', header: 'Status', cell: (g) => (g.ended_on ? <StatusBadge status="closed" label={`Ended ${formatDate(g.ended_on)}`} /> : <StatusBadge status="active" label="Held" />) },
  ]
  return (
    <>
      <div className="mb-3 flex justify-end">{addButton('Give an award', () => setGranting(true))}</div>
      <DataTable
        ariaLabel="Awards given"
        columns={columns}
        query={query}
        list={list}
        getRowId={(g) => g.id}
        searchable={false}
        filters={[{ name: 'award', label: 'Award', options: (awards.data ?? []).map((a) => ({ value: String(a.id), label: a.name })) }]}
        rowActions={(g) => <RowActions actions={[{ label: 'End', icon: CircleStop, permission: PERMS.events.manage, hidden: Boolean(g.ended_on), onSelect: () => setEnding(g) }]} />}
        empty={{ title: 'Nobody holds an award yet', description: 'Awards are given automatically by rules, or by hand here.' }}
      />
      <FormDialog
        open={granting}
        onOpenChange={setGranting}
        wide
        title="Give an award by hand"
        submitLabel="Give award"
        schema={z.object({ student: z.custom<Student | null>().refine((s) => s != null, 'Choose a student.'), award: requiredId('Choose an award.'), note: z.string().trim().max(255) })}
        defaultValues={{ student: null, award: '', note: '' }}
        onSubmit={async (v) => {
          await grant.mutateAsync({ student: v.student!.id, award: Number(v.award), note: v.note })
          toast.success(`Award given to ${v.student!.full_name}.`)
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label="Student" required error={errors.student?.message}>
              {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
            </FormField>
            <FormField label="Award" required error={errors.award?.message}>
              {(p) => (
                <Controller
                  control={control}
                  name="award"
                  render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(awards.data ?? []).filter((a) => a.is_active !== false).map((a) => ({ value: String(a.id), label: a.name }))} />}
                />
              )}
            </FormField>
            <FormField label="Note" error={errors.note?.message}>
              <Input {...register('note')} maxLength={255} />
            </FormField>
          </>
        )}
      </FormDialog>
      <ConfirmDialog
        open={ending !== null}
        onOpenChange={(o) => !o && setEnding(null)}
        title={`End ${ending?.student_name}’s ${ending?.award_name}?`}
        description="Mainly for titles held for a term or a year. It stays in their history as ended today."
        confirmLabel="End award"
        onConfirm={async () => {
          await end.mutateAsync(ending!.id)
          toast.success('Award ended.')
        }}
      />
    </>
  )
}

export default function AwardsPage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'given'
  return (
    <Tabs value={tab} onValueChange={(t) => setParams(t === 'given' ? {} : { tab: t }, { replace: true })}>
      <TabsList>
        <TabsTrigger value="given">
          <AwardIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Given
        </TabsTrigger>
        <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
        <TabsTrigger value="rules">Automatic rules</TabsTrigger>
      </TabsList>
      <TabsContent value="given" className="mt-4">
        <GrantedTab />
      </TabsContent>
      <TabsContent value="catalogue" className="mt-4">
        <CatalogueTab />
      </TabsContent>
      <TabsContent value="rules" className="mt-4">
        <RulesTab />
      </TabsContent>
    </Tabs>
  )
}
