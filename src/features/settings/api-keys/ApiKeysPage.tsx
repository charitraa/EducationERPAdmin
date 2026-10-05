import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Ban, Copy, KeyRound, Pencil, Plus, RefreshCw, ShieldPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useRoleOptions } from '@/features/roles/hooks/useRoles'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime, formatRelative, splitLocal } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { optionalIsoDate } from '@/lib/validation'
import { apiClient } from '@/shared/api/client'
import { createResourceHooks } from '@/shared/api/hooks'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import { PERMS } from '@/shared/constants/permissions'
import type { Id, Schema } from '@/shared/types/api'
import { tr } from '@/lib/i18n'

interface Grant {
  role: Id
  role_code: string
  campus: Id | null
}
/** `allowed_ips` and `roles` are loosely typed in the OpenAPI. */
type ApiKey = Omit<Schema<'ApiKey'>, 'allowed_ips' | 'roles'> & { allowed_ips: string[]; roles: Grant[] }
type ApiKeyInput = { name: string; description?: string; read_only?: boolean; expires_at?: string | null; allowed_ips?: string[]; rate_limit?: string; grants?: Array<{ role: Id; campus?: Id | null }> }

const post = <T,>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)
const keysApi = {
  ...createResourceApi<ApiKey, ApiKeyInput>('/api-keys/'),
  createWithSecret: (input: ApiKeyInput) => post<ApiKey & { key: string }>('/api-keys/', input),
  rotate: (id: Id) => post<ApiKey & { key: string }>(`/api-keys/${id}/rotate/`),
  revoke: (id: Id, reason: string) => post<ApiKey>(`/api-keys/${id}/revoke/`, { reason }),
  assignRole: (id: Id, grant: { role: Id; campus?: Id | null }) => post<Grant>(`/api-keys/${id}/assign-role/`, grant),
  revokeRole: (id: Id, grant: { role: Id; campus?: Id | null }) => post<void>(`/api-keys/${id}/revoke-role/`, grant),
}
const keyKeys = createQueryKeys('api-keys')
const { useList: useApiKeys, useUpdate: useUpdateApiKey } = createResourceHooks(keysApi, keyKeys)
function useKeyAction<V, R>(fn: (v: V) => Promise<R>, form = true) {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, meta: form ? { form: true } : { silent: true }, onSuccess: () => void qc.invalidateQueries({ queryKey: keyKeys.all }) })
}

const ipList = z.string().refine((v) => v.split(/[\s,]+/).filter(Boolean).length <= 50, tr('At most 50.'))
const rate = z.union([z.literal(''), z.string().regex(/^\d+\/(s|sec|m|min|h|hour|d|day)$/, tr('Like 1000/hour.'))])

/** The secret, shown once after creating or rotating a key. */
function SecretDialog({ secret, onClose }: { secret: { name: string; key: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <Dialog open={secret !== null} onOpenChange={(o) => !o && (onClose(), setCopied(false))}>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{tr('Secret for')} {secret?.name}</DialogTitle>
          <DialogDescription>{tr('Send it in the')} <span className="font-mono">{tr('Authorization: Api-Key …')}</span> {tr('header.')}</DialogDescription>
        </DialogHeader>
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm font-medium">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {tr('Save this secret now. It will not be shown again.')}
        </p>
        <div className="flex gap-2">
          <Input readOnly value={secret?.key ?? ''} className="font-mono text-xs" aria-label={tr('API key secret')} onFocus={(e) => e.currentTarget.select()} />
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard?.writeText(secret?.key ?? '')
              setCopied(true)
            }}
          >
            <Copy aria-hidden /> {copied ? tr('Copied') : tr('Copy')}
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>{tr('I’ve saved it')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function KeyDialog({ open, record, onOpenChange, onCreated }: { open: boolean; record: ApiKey | null; onOpenChange: (o: boolean) => void; onCreated: (k: { name: string; key: string }) => void }) {
  const roles = useRoleOptions(open)
  const update = useUpdateApiKey()
  const create = useKeyAction(keysApi.createWithSecret)
  const { branches, isMultiBranch } = useBranches()
  const expires = splitLocal(record?.expires_at)
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={record ? tr('Edit {name}', { name: record.name }) : tr('New API key')}
      description={record ? undefined : tr('For another system (a website, an SMS gateway) to use the API. It acts with the roles you give it, never more than yours.')}
      wide
      schema={z.object({ name: z.string().trim().min(1, tr('Required.')).max(100), description: z.string(), read_only: z.boolean(), expires_on: optionalIsoDate, allowed_ips: ipList, rate_limit: rate, role: z.string(), campus: z.string() })}
      defaultValues={{ name: record?.name ?? '', description: record?.description ?? '', read_only: record?.read_only ?? true, expires_on: expires.date, allowed_ips: (record?.allowed_ips ?? []).join('\n'), rate_limit: record?.rate_limit ?? '', role: '', campus: '' }}
      onSubmit={async (v) => {
        const input: ApiKeyInput = {
          name: v.name,
          description: v.description,
          read_only: v.read_only,
          // End of the chosen day, local time.
          expires_at: v.expires_on ? new Date(`${v.expires_on}T23:59:59`).toISOString() : null,
          allowed_ips: v.allowed_ips.split(/[\s,]+/).filter(Boolean),
          rate_limit: v.rate_limit,
        }
        if (record) {
          await update.mutateAsync({ id: record.id, input })
          toast.success(tr('Key saved.'))
        } else {
          const k = await create.mutateAsync({ ...input, grants: v.role ? [{ role: Number(v.role), campus: v.campus ? Number(v.campus) : null }] : [] })
          onCreated({ name: k.name, key: k.key })
        }
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Name')} required error={errors.name?.message}>
              <Input {...register('name')} placeholder={tr('School website')} />
            </FormField>
            <FormField label={tr('Expires')} error={errors.expires_on?.message} description={tr('Empty: never.')}>
              {(p) => <Controller control={control} name="expires_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            {!record && (
              <>
                <FormField label={tr('Role')} description={tr('What it may do. More can be added later.')}>
                  {(p) => <Controller control={control} name="role" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('No role yet')} options={(roles.data ?? []).map((r) => ({ value: String(r.id), label: r.name }))} />} />}
                </FormField>
                {isMultiBranch && (
                  <FormField label={tr('At')}>
                    {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Every branch')} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
                  </FormField>
                )}
              </>
            )}
            <FormField label={tr('Rate limit')} error={errors.rate_limit?.message} description={tr('Empty: the default.')}>
              <Input {...register('rate_limit')} placeholder="1000/hour" />
            </FormField>
          </div>
          <FormField label={tr('Allowed addresses')} error={errors.allowed_ips?.message} description={tr('One IP or network per line (e.g. 203.0.113.0/24). Empty: any.')}>
            <Textarea {...register('allowed_ips')} rows={2} className="font-mono text-xs" />
          </FormField>
          <FormField label={tr('Description')}>
            <Input {...register('description')} />
          </FormField>
          <Controller control={control} name="read_only" render={({ field }) => (
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={field.value} onCheckedChange={field.onChange} /> {tr('Read-only (can’t change anything, whatever its roles)')}
            </label>
          )} />
        </>
      )}
    </FormDialog>
  )
}

/** Keys for other systems, each acting with its own roles. Secrets are shown once. */
export default function ApiKeysPage() {
  const list = useListState({ filters: ['read_only'] })
  const query = useApiKeys(list.query)
  const roles = useRoleOptions()
  const { branches, isMultiBranch } = useBranches()
  const rotate = useKeyAction(keysApi.rotate, false)
  const revoke = useKeyAction(({ id, reason }: { id: Id; reason: string }) => keysApi.revoke(id, reason))
  const assign = useKeyAction(({ id, role, campus }: { id: Id; role: Id; campus: Id | null }) => keysApi.assignRole(id, { role, campus }))
  const unassign = useKeyAction(({ id, role, campus }: { id: Id; role: Id; campus: Id | null }) => keysApi.revokeRole(id, { role, campus }), false)
  const [editing, setEditing] = useState<ApiKey | 'new' | null>(null)
  const [secret, setSecret] = useState<{ name: string; key: string } | null>(null)
  const [acting, setActing] = useState<{ kind: 'rotate' | 'revoke' | 'role'; k: ApiKey } | null>(null)
  const roleName = (id: Id) => roles.data?.find((r) => r.id === id)?.name
  const branchName = (id: Id | null) => (id == null ? null : branches.find((b) => b.id === id)?.name)
  const columns: Column<ApiKey>[] = [
    { id: 'name', header: tr('Key'), mobile: 'title', cell: (k) => (
      <span>
        <span className="font-medium">{k.name}</span> <span className="font-mono text-xs text-muted-foreground">{k.prefix}…</span>
        {k.description && <span className="block text-xs text-muted-foreground">{k.description}</span>}
      </span>
    ) },
    { id: 'roles', header: tr('Roles'), cell: (k) => (
      <span className="flex flex-wrap gap-1">
        {k.roles.length === 0 && <span className="text-muted-foreground">{tr('None')}</span>}
        {k.roles.map((g) => (
          <span key={`${g.role}-${g.campus}`} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
            {roleName(g.role) ?? g.role_code}
            {isMultiBranch && g.campus != null && <span className="text-muted-foreground">@ {branchName(g.campus)}</span>}
            {k.is_usable && (
              <PermissionGate permission={PERMS.apiKeys.manage}>
                <button
                  type="button"
                  aria-label={tr('Take {role_code} away', { role_code: g.role_code })}
                  className="text-muted-foreground hover:text-danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    unassign.mutateAsync({ id: k.id, role: g.role, campus: g.campus }).then(() => toast.success(tr('Role removed.')), (err) => toast.error(errorMessage(err)))
                  }}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </PermissionGate>
            )}
          </span>
        ))}
      </span>
    ) },
    { id: 'access', header: tr('Access'), mobile: 'hidden', cell: (k) => [k.read_only ? tr('Read-only') : tr('Read and write'), k.allowed_ips.length ? tr('{count} address{value}', { count: k.allowed_ips.length, value: k.allowed_ips.length > 1 ? 'es' : '' }) : null, k.rate_limit].filter(Boolean).join(' · ') },
    { id: 'used', header: tr('Last used'), mobile: 'hidden', cell: (k) => (k.last_used_at ? <span title={`${formatDateTime(k.last_used_at)}${k.last_used_ip ? ` from ${k.last_used_ip}` : ''}`}>{formatRelative(k.last_used_at)}</span> : <span className="text-muted-foreground">{tr('Never')}</span>) },
    { id: 'status', header: tr('Status'), cell: (k) => (k.revoked_at ? <StatusBadge status="cancelled" tone="muted" label={tr('Revoked')} /> : k.is_usable ? <StatusBadge status="active" label={k.expires_at ? tr('Until {date}', { date: formatDate(splitLocal(k.expires_at).date) }) : tr('Active')} /> : <StatusBadge status="inactive" tone="danger" label={tr('Expired')} />) },
  ]
  return (
    <div>
      <PageHeader title={tr('API keys')} description={tr('Let another system (your website, an SMS gateway, a biometric bridge) use the API with only the roles you give it.')} />
      <DataTable
        ariaLabel={tr('API keys')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(k) => k.id}
        searchPlaceholder={tr('Name or prefix…')}
        toolbar={
          <PermissionGate permission={PERMS.apiKeys.manage}>
            <Button onClick={() => setEditing('new')}>
              <Plus aria-hidden /> {tr('New key')}
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'read_only', label: tr('Access'), options: [{ value: 'true', label: tr('Read-only') }, { value: 'false', label: tr('Read and write') }] }]}
        rowActions={(k) => (
          <RowActions
            actions={[
              { label: tr('Edit'), icon: Pencil, permission: PERMS.apiKeys.manage, hidden: Boolean(k.revoked_at), onSelect: () => setEditing(k) },
              { label: tr('Give a role'), icon: ShieldPlus, permission: PERMS.apiKeys.manage, hidden: Boolean(k.revoked_at), onSelect: () => setActing({ kind: 'role', k }) },
              { label: tr('Rotate secret'), icon: RefreshCw, permission: PERMS.apiKeys.manage, hidden: Boolean(k.revoked_at), onSelect: () => setActing({ kind: 'rotate', k }) },
              { label: tr('Revoke'), icon: Ban, permission: PERMS.apiKeys.manage, hidden: Boolean(k.revoked_at), destructive: true, onSelect: () => setActing({ kind: 'revoke', k }) },
            ]}
          />
        )}
        empty={{ title: tr('No API keys'), description: tr('Create one when another system needs to read or write school data.'), action: <KeyRound className="h-5 w-5 text-muted-foreground" aria-hidden /> }}
      />
      <KeyDialog
        open={editing !== null}
        record={editing === 'new' ? null : editing}
        onOpenChange={(o) => !o && setEditing(null)}
        onCreated={(k) => {
          setEditing(null)
          setSecret(k)
        }}
      />
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
      <ConfirmDialog
        open={acting?.kind === 'rotate'}
        onOpenChange={(o) => !o && setActing(null)}
        title={tr('Rotate {name}?', { name: acting?.k.name })}
        description={tr('A new secret is made and shown once. The old one stops working at once, so update the system using it straight away.')}
        confirmLabel={tr('Rotate')}
        tone="destructive"
        onConfirm={async () => {
          const k = await rotate.mutateAsync(acting!.k.id)
          setSecret({ name: k.name, key: k.key })
        }}
      />
      <FormDialog
        open={acting?.kind === 'revoke'}
        onOpenChange={(o) => !o && setActing(null)}
        title={tr('Revoke {name}?', { name: acting?.k.name })}
        description={tr('It stops working at once and can’t be brought back; it stays on record.')}
        submitLabel={tr('Revoke')}
        schema={z.object({ reason: z.string().max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await revoke.mutateAsync({ id: acting!.k.id, reason: v.reason })
          toast.success(tr('Key revoked.'))
        }}
      >
        {({ register }) => (
          <FormField label={tr('Reason')}>
            <Input {...register('reason')} placeholder={tr('Website rebuilt')} />
          </FormField>
        )}
      </FormDialog>
      <FormDialog
        open={acting?.kind === 'role'}
        onOpenChange={(o) => !o && setActing(null)}
        title={tr('Give {name} a role', { name: acting?.k.name })}
        description={tr('No more than you hold yourself.')}
        submitLabel={tr('Give role')}
        schema={z.object({ role: z.string().min(1, tr('Choose a role.')), campus: z.string() })}
        defaultValues={{ role: '', campus: '' }}
        onSubmit={async (v) => {
          await assign.mutateAsync({ id: acting!.k.id, role: Number(v.role), campus: v.campus ? Number(v.campus) : null })
          toast.success(tr('Role given.'))
        }}
      >
        {({ control, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Role')} required error={errors.role?.message}>
              {(p) => <Controller control={control} name="role" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={(roles.data ?? []).map((r) => ({ value: String(r.id), label: r.name }))} />} />}
            </FormField>
            {isMultiBranch && (
              <FormField label={tr('At')}>
                {(p) => <Controller control={control} name="campus" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('Every branch')} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />} />}
              </FormField>
            )}
          </div>
        )}
      </FormDialog>
    </div>
  )
}
