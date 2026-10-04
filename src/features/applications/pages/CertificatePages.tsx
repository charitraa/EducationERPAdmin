import { Ban, FileBadge, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { PageHeader } from '@/components/common/PageHeader'
import { PermissionGate } from '@/components/common/PermissionGate'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime, toBsDate } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { Certificate } from '../api/applications.api'
import { useApplicationTypes, useCertificate, useCertificates, useIssueCertificate, useRevokeCertificate } from '../hooks/useApplications'

function Validity({ c }: { c: Certificate }) {
  return c.is_valid ? <StatusBadge status="issued" tone="success" label="Valid" /> : <StatusBadge status="rejected" tone="danger" label="Revoked" />
}

function RevokeDialog({ certificate, onOpenChange }: { certificate: Certificate | null; onOpenChange: (o: boolean) => void }) {
  const revoke = useRevokeCertificate()
  return (
    <FormDialog
      open={certificate !== null}
      onOpenChange={onOpenChange}
      title={`Revoke ${certificate?.number}?`}
      description="It stays on record, marked revoked, and anyone checking it sees why."
      submitLabel="Revoke"
      schema={z.object({ reason: z.string().trim().min(1, 'Say why.').max(255) })}
      defaultValues={{ reason: '' }}
      onSubmit={async (v) => {
        await revoke.mutateAsync({ id: certificate!.id, reason: v.reason })
        toast.success('Certificate revoked.')
      }}
    >
      {({ register, formState: { errors } }) => (
        <FormField label="Reason" required error={errors.reason?.message}>
          <Input {...register('reason')} maxLength={255} placeholder="Issued with a wrong name" />
        </FormField>
      )}
    </FormDialog>
  )
}

/** Every certificate issued: from approved requests or issued directly by the office. */
export function CertificatesPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['title'] })
  const query = useCertificates(list.query)
  const types = useApplicationTypes({ ...PICKER_PARAMS, kind: 'certificate' })
  const issue = useIssueCertificate()
  const [issuing, setIssuing] = useState(false)
  const [student, setStudent] = useState<Student | null>(null)
  const [revoking, setRevoking] = useState<Certificate | null>(null)
  const titles = [...new Set((types.data?.results ?? []).map((t) => t.certificate_title).filter(Boolean))] as string[]
  const columns: Column<Certificate>[] = [
    { id: 'number', header: 'No.', className: 'font-mono text-xs', cell: (c) => c.number },
    { id: 'title', header: 'Certificate', mobile: 'title', cell: (c) => <span className="font-medium">{c.title}</span> },
    { id: 'student', header: 'Student', cell: (c) => c.student_name },
    { id: 'purpose', header: 'Purpose', mobile: 'hidden', className: 'text-muted-foreground', cell: (c) => c.purpose || '—' },
    { id: 'issued', header: 'Issued', className: 'whitespace-nowrap tabular-nums', cell: (c) => formatDate(c.issued_on) },
    { id: 'valid', header: '', cell: (c) => <Validity c={c} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel="Certificates"
        columns={columns}
        query={query}
        list={list}
        getRowId={(c) => c.id}
        searchPlaceholder="Number, title or student…"
        onRowClick={(c) => navigate(`/certificates/${c.id}`)}
        toolbar={
          <PermissionGate permission={PERMS.applications.certify}>
            <Button onClick={() => setIssuing(true)}>
              <FileBadge aria-hidden /> Issue certificate
            </Button>
          </PermissionGate>
        }
        filters={[{ name: 'title', label: 'Certificate', options: titles.map((t) => ({ value: t, label: t })), hidden: titles.length === 0 }]}
        rowActions={(c) => <RowActions actions={[{ label: 'Revoke', icon: Ban, permission: PERMS.applications.certify, hidden: !c.is_valid, destructive: true, onSelect: () => setRevoking(c) }]} />}
        empty={{ title: 'No certificates issued', description: 'They’re issued when a certificate request is approved, or directly here.' }}
      />
      <FormDialog
        open={issuing}
        onOpenChange={(o) => {
          setIssuing(o)
          if (!o) setStudent(null)
        }}
        title="Issue a certificate"
        description="Directly, without a request. The student’s details are copied onto it as they are today."
        submitLabel="Issue"
        schema={z.object({ title: z.string().trim().min(1, 'Required.').max(150), purpose: z.string().max(255) })}
        defaultValues={{ title: titles[0] ?? '', purpose: '' }}
        onSubmit={async (v) => {
          if (!student) throw new Error('Choose a student.')
          const c = await issue.mutateAsync({ student: student.id, ...v })
          toast.success(`Issued ${c.number}.`)
          navigate(`/certificates/${c.id}`)
        }}
      >
        {({ register, formState: { errors } }) => (
          <>
            <FormField label="Student" required>
              {(p) => <StudentPicker {...p} value={student} onChange={setStudent} />}
            </FormField>
            <FormField label="Title" required error={errors.title?.message}>
              <Input {...register('title')} list="certificate-titles" placeholder="Character Certificate" />
            </FormField>
            <datalist id="certificate-titles">
              {titles.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <FormField label="Purpose" error={errors.purpose?.message}>
              <Input {...register('purpose')} maxLength={255} placeholder="For university admission" />
            </FormField>
          </>
        )}
      </FormDialog>
      <RevokeDialog certificate={revoking} onOpenChange={(o) => !o && setRevoking(null)} />
    </>
  )
}

const s = (v: unknown) => (v == null || v === '' ? null : String(v))

/** A certificate laid out to print, from the facts frozen when it was issued. */
export function CertificatePage() {
  const id = Number(useParams().id)
  const cert = useCertificate(Number.isFinite(id) ? id : null)
  const { can } = usePermissions()
  const [revoking, setRevoking] = useState(false)
  if (cert.isPending) return <PageLoader />
  if (cert.isError) return <ErrorState error={cert.error} onRetry={() => void cert.refetch()} />
  const c = cert.data
  const k = c.contents
  const enrolled = [s(k.program), s(k.level) && `level ${k.level}`, s(k.section) && `section ${k.section}`].filter(Boolean).join(', ')
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        className="print:hidden"
        backTo="/certificates"
        title={
          <span className="flex items-center gap-2">
            {c.title} <Validity c={c} />
          </span>
        }
        description={c.application ? <Link to={`/applications/${c.application}`} className="hover:underline">From application</Link> : 'Issued directly'}
        actions={
          <>
            {c.is_valid && can(PERMS.applications.certify) && (
              <Button variant="outline" onClick={() => setRevoking(true)}>
                <Ban aria-hidden /> Revoke
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()} disabled={!c.is_valid}>
              <Printer aria-hidden /> Print
            </Button>
          </>
        }
      />
      {!c.is_valid && (
        <p className="mb-4 rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm print:hidden">
          Revoked {formatDateTime(c.revoked_at)}: {c.revoked_reason}
        </p>
      )}
      <article className="relative rounded-lg border bg-card px-8 py-10 font-serif print:border-0 sm:px-14">
        {!c.is_valid && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-bold uppercase tracking-widest text-danger/15">Revoked</span>}
        <header className="text-center">
          <p className="text-xl font-semibold">{s(k.organization)}</p>
          {s(k.campus) && <p className="text-sm text-muted-foreground">{s(k.campus)}</p>}
          <h1 className="mt-6 text-2xl font-bold uppercase tracking-wide">{c.title}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            No. {c.number} · {formatDate(c.issued_on)} ({toBsDate(c.issued_on)} BS)
          </p>
        </header>
        <p className="mt-8 text-justify leading-8">
          This is to certify that <strong>{s(k.student_name)}</strong>
          {s(k.student_number) && <> (student no. {s(k.student_number)})</>}
          {s(k.date_of_birth) && <>, born on {formatDate(String(k.date_of_birth))} ({toBsDate(String(k.date_of_birth))} BS)</>}
          {s(k.admitted_on) && <>, was admitted to this institution on {formatDate(String(k.admitted_on))}</>}
          {enrolled && <> and is enrolled in {enrolled}{s(k.academic_year) && <> for the academic year {s(k.academic_year)}</>}</>}
          {s(k.status) && k.status !== 'active' && <>; current status: {enumLabel('StudentStatusEnum', String(k.status))}</>}.
        </p>
        {c.purpose && <p className="mt-4 leading-8">This certificate is issued {/^for\b/i.test(c.purpose) ? c.purpose : `for ${c.purpose}`}.</p>}
        <footer className="mt-20 flex justify-end">
          <div className="w-56 border-t pt-2 text-center text-sm">Authorised signature</div>
        </footer>
      </article>
      <RevokeDialog certificate={revoking ? c : null} onOpenChange={(o) => !o && setRevoking(false)} />
    </div>
  )
}
