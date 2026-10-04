import { useMutation, useQuery } from '@tanstack/react-query'
import { Briefcase, MapPin, Plus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { publicApi, type PublicVacancy, type Receipt } from '../api/public.api'
import { answersPayload, blankAnswers, loadError, missingAnswers, nestedErrors, PublicLayout, Questions, ReceiptCard, useOrgCode, type Answers } from '../components/PublicParts'

function useVacancies() {
  const code = useOrgCode()
  return useQuery({ queryKey: ['public', code, 'vacancies'], queryFn: () => publicApi.vacancies(code), retry: false, retryOnMount: false })
}

const meta = (v: PublicVacancy) => [v.department_name, v.campus_name, enumLabel('StaffTypeEnum', v.staff_type), v.salary_range].filter(Boolean).join(' · ')

/** Open vacancies at the school. */
export function PublicCareersPage() {
  const code = useOrgCode()
  const vacancies = useVacancies()
  return (
    <PublicLayout title="Work with us" description="Open positions. Apply online; no account needed.">
      {vacancies.isPending ? (
        <PageLoader />
      ) : vacancies.isError ? (
        <ErrorState error={loadError(vacancies.error)} onRetry={() => void vacancies.refetch()} />
      ) : vacancies.data.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">No open positions right now. Please check back later.</p>
      ) : (
        <ul className="grid gap-3">
          {vacancies.data.map((v) => (
            <li key={v.id}>
              <Link to={`/public/${code}/careers/${v.id}`} className="block rounded-lg border bg-card p-4 hover:bg-muted/50">
                <p className="font-semibold">{v.title}</p>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {meta(v)}
                </p>
                {v.closes_on && <p className="mt-1 text-xs text-muted-foreground">Apply by {formatDate(v.closes_on)}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PublicLayout>
  )
}

interface Education {
  institution: string
  qualification: string
  year: string
}
interface Experience {
  employer: string
  title: string
  start_date: string
  end_date: string
}

const PERSONAL = [
  ['first_name', 'First name', true],
  ['middle_name', 'Middle name', false],
  ['last_name', 'Last name', true],
  ['email', 'Email', false],
  ['phone', 'Phone', false],
  ['date_of_birth', 'Date of birth', false],
  ['gender', 'Gender', false],
  ['expected_salary', 'Expected salary', false],
  ['available_from', 'Available from', false],
] as const

/** One vacancy and its application form. */
export function PublicVacancyPage() {
  const code = useOrgCode()
  const id = Number(useParams().id)
  const vacancy = useQuery({ queryKey: ['public', code, 'vacancy', id], queryFn: () => publicApi.vacancy(code, id), retry: false, retryOnMount: false })
  const [answers, setAnswers] = useState<Answers>({})
  const [cover, setCover] = useState('')
  const [summary, setSummary] = useState('')
  const [skills, setSkills] = useState('')
  const [education, setEducation] = useState<Education[]>([])
  const [experience, setExperience] = useState<Experience[]>([])
  const [resume, setResume] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const apply = useMutation({ mutationFn: (data: Record<string, unknown>) => publicApi.apply(code, id, data, resume) })

  if (vacancy.isPending) return <PageLoader />
  if (vacancy.isError)
    return (
      <PublicLayout title="Position not found">
        <p className="text-sm text-muted-foreground">
          It may have closed. <Link to={`/public/${code}/careers`} className="text-primary hover:underline">See open positions</Link>.
        </p>
      </PublicLayout>
    )
  const v = vacancy.data
  if (receipt)
    return (
      <PublicLayout title="Thank you" description={`Your application for ${v.title} has been received.`}>
        <ReceiptCard receipt={receipt} what="Application" />
        <p className="mt-4 text-sm">
          Use them on the <Link to={`/public/${code}/application/status?number=${receipt.number}`} className="font-medium text-primary hover:underline">status page</Link> to follow your application, and to answer a job offer if we make you one.
        </p>
      </PublicLayout>
    )

  const set = (k: string, val: string) => setAnswers({ ...answers, [k]: val })
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const gaps: Record<string, string> = missingAnswers(v.form_fields, answers)
    for (const [k, , req] of PERSONAL) if (req && !String(answers[k] ?? '').trim()) gaps[k] = 'Required.'
    if (!String(answers.email ?? '').trim() && !String(answers.phone ?? '').trim()) gaps.email = 'An email or a phone number, so we can reach you.'
    if (v.resume_required && !resume) gaps.resume_file = 'Attach your CV.'
    setErrors(gaps)
    setMessage(Object.keys(gaps).length ? 'Fill in the highlighted answers.' : null)
    if (Object.keys(gaps).length) return
    const data: Record<string, unknown> = {}
    for (const [k] of PERSONAL) if (answers[k]) data[k] = answers[k]
    if (cover.trim()) data.cover_letter = cover
    data.resume = {
      summary,
      skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
      education: education.filter((r) => r.institution && r.qualification).map((r) => ({ ...r, year: r.year ? Number(r.year) : null })),
      experience: experience.filter((r) => r.employer && r.title && r.start_date).map((r) => ({ ...r, end_date: r.end_date || null })),
    }
    data.extra = answersPayload(v.form_fields, answers)
    try {
      setReceipt(await apply.mutateAsync(data))
      window.scrollTo({ top: 0 })
    } catch (err) {
      const { fields, message: m } = nestedErrors(err)
      setErrors({ ...fields, ...(fields.resume ? { resume_file: fields.resume } : {}) })
      setMessage(m)
    }
  }

  return (
    <PublicLayout title={v.title} description={meta(v)}>
      <section className="rounded-lg border bg-card p-5 text-sm">
        {v.description && <p className="whitespace-pre-wrap">{v.description}</p>}
        {v.requirements.length > 0 && (
          <>
            <h2 className="mb-1 mt-4 font-semibold">What we’re looking for</h2>
            <ul className="ml-5 list-disc">
              {v.requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" aria-hidden /> {enumLabel('ContractKindEnum', v.contract_kind)}</span>
          {v.openings > 1 && <span>{v.openings} openings</span>}
          {v.min_experience_years != null && <span>{v.min_experience_years}+ years’ experience</span>}
          {v.closes_on && <span>Apply by {formatDate(v.closes_on)}</span>}
        </p>
      </section>

      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-6">
        <h2 className="text-lg font-semibold">Apply</h2>
        <FormError message={message} />
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-semibold">About you</legend>
          {PERSONAL.map(([k, label, req]) => (
            <FormField key={k} label={label} required={req} error={errors[k]}>
              {(p) =>
                k === 'date_of_birth' || k === 'available_from' ? (
                  <DatePicker {...p} value={String(answers[k] ?? '')} onChange={(d) => set(k, d)} />
                ) : k === 'gender' ? (
                  <SelectControl {...p} value={String(answers[k] ?? '')} onChange={(g) => set(k, g)} allowEmpty options={enumOptions('GenderEnum')} />
                ) : (
                  <Input {...p} type={k === 'email' ? 'email' : undefined} inputMode={k === 'phone' ? 'tel' : undefined} value={String(answers[k] ?? '')} onChange={(e) => set(k, e.target.value)} />
                )
              }
            </FormField>
          ))}
        </fieldset>
        <fieldset className="grid gap-4">
          <legend className="mb-2 text-sm font-semibold">Your CV</legend>
          <FormField label="CV file" required={v.resume_required} error={errors.resume_file} description="PDF or Word.">
            {(p) => <Input {...p} type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(e) => setResume(e.target.files?.[0] ?? null)} />}
          </FormField>
          <FormField label="Cover letter" error={errors.cover_letter}>
            <Textarea value={cover} onChange={(e) => setCover(e.target.value)} rows={4} />
          </FormField>
          <FormField label="Summary">
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="A few lines about your experience." />
          </FormField>
          <FormField label="Skills" description="Separated by commas.">
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Algebra, classroom management" />
          </FormField>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Education</p>
            {education.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_6rem_auto] gap-2">
                <Input aria-label={`Qualification ${i + 1}`} placeholder="Qualification" value={r.qualification} onChange={(e) => setEducation(education.map((x, j) => (j === i ? { ...x, qualification: e.target.value } : x)))} />
                <Input aria-label={`Institution ${i + 1}`} placeholder="Institution" value={r.institution} onChange={(e) => setEducation(education.map((x, j) => (j === i ? { ...x, institution: e.target.value } : x)))} />
                <Input aria-label={`Year ${i + 1}`} placeholder="Year" inputMode="numeric" value={r.year} onChange={(e) => setEducation(education.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove education ${i + 1}`} onClick={() => setEducation(education.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
            ))}
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => setEducation([...education, { institution: '', qualification: '', year: '' }])}>
                <Plus aria-hidden /> Add education
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Experience</p>
            {experience.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input aria-label={`Job title ${i + 1}`} placeholder="Job title" value={r.title} onChange={(e) => setExperience(experience.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <Input aria-label={`Employer ${i + 1}`} placeholder="Employer" value={r.employer} onChange={(e) => setExperience(experience.map((x, j) => (j === i ? { ...x, employer: e.target.value } : x)))} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove experience ${i + 1}`} onClick={() => setExperience(experience.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden />
                </Button>
                <DatePicker aria-label={`From ${i + 1}`} value={r.start_date} onChange={(d) => setExperience(experience.map((x, j) => (j === i ? { ...x, start_date: d } : x)))} />
                <DatePicker aria-label={`To ${i + 1}`} value={r.end_date} onChange={(d) => setExperience(experience.map((x, j) => (j === i ? { ...x, end_date: d } : x)))} />
              </div>
            ))}
            <div>
              <Button type="button" size="sm" variant="outline" onClick={() => setExperience([...experience, { employer: '', title: '', start_date: '', end_date: '' }])}>
                <Plus aria-hidden /> Add experience
              </Button>
            </div>
          </div>
        </fieldset>
        {v.form_fields.length > 0 && (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-sm font-semibold">A few more questions</legend>
            <Questions fields={v.form_fields} value={Object.keys(answers).length ? answers : blankAnswers(v.form_fields)} onChange={setAnswers} errors={errors} />
          </fieldset>
        )}
        <div>
          <Button type="submit" className="h-10" disabled={apply.isPending}>
            {apply.isPending ? 'Sending…' : 'Send application'}
          </Button>
        </div>
      </form>
    </PublicLayout>
  )
}
