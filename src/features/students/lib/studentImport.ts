import { tr } from '@/lib/i18n'
import type { StudentInput } from '../api/students.api'

/** The columns a student import understands, in template order. */
export const IMPORT_COLUMNS = [
  { key: 'student_number', label: tr('Student no.'), required: true },
  { key: 'first_name', label: tr('First name'), required: true },
  { key: 'middle_name', label: tr('Middle name') },
  { key: 'last_name', label: tr('Last name'), required: true },
  { key: 'gender', label: tr('Gender') },
  { key: 'date_of_birth', label: tr('Date of birth') },
  { key: 'email', label: tr('Email') },
  { key: 'phone', label: tr('Phone') },
  { key: 'address', label: tr('Address') },
  { key: 'admitted_on', label: tr('Admitted on') },
] as const

export type ImportKey = (typeof IMPORT_COLUMNS)[number]['key']

/** Other spellings people use in their own registers. */
const ALIASES: Record<string, ImportKey> = {
  studentno: 'student_number',
  studentnumber: 'student_number',
  regno: 'student_number',
  registrationno: 'student_number',
  registrationnumber: 'student_number',
  admissionno: 'student_number',
  admissionnumber: 'student_number',
  firstname: 'first_name',
  givenname: 'first_name',
  middlename: 'middle_name',
  lastname: 'last_name',
  surname: 'last_name',
  familyname: 'last_name',
  gender: 'gender',
  sex: 'gender',
  dateofbirth: 'date_of_birth',
  dob: 'date_of_birth',
  birthdate: 'date_of_birth',
  email: 'email',
  emailaddress: 'email',
  phone: 'phone',
  mobile: 'phone',
  phonenumber: 'phone',
  contact: 'phone',
  address: 'address',
  admittedon: 'admitted_on',
  admissiondate: 'admitted_on',
  dateofadmission: 'admitted_on',
}

const normalise = (h: string) => h.toLowerCase().replace(/[^a-z]/g, '')

const GENDERS: Record<string, NonNullable<StudentInput['gender']>> = {
  m: 'male',
  male: 'male',
  boy: 'male',
  f: 'female',
  female: 'female',
  girl: 'female',
  o: 'other',
  other: 'other',
  undisclosed: 'undisclosed',
  prefernottosay: 'undisclosed',
}

export interface ImportRow {
  /** Line in the file, counting the header as 1. */
  line: number
  values: Record<ImportKey, string>
  input: Omit<StudentInput, 'campus'>
  problems: string[]
}

export interface ParsedImport {
  rows: ImportRow[]
  /** Header cells that match no column; their data is left out. */
  ignored: string[]
  /** Required columns the file doesn't have. */
  missing: string[]
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const validDate = (v: string) => DATE.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v)

/** Matches the header row to columns and checks each row the way the server will. */
export function readStudentRows(cells: string[][]): ParsedImport {
  const [header = [], ...body] = cells
  const index: Partial<Record<ImportKey, number>> = {}
  const ignored: string[] = []
  header.forEach((h, i) => {
    const key = ALIASES[normalise(h)]
    if (key && index[key] === undefined) index[key] = i
    else if (h.trim()) ignored.push(h.trim())
  })
  const missing = IMPORT_COLUMNS.filter((c) => 'required' in c && index[c.key] === undefined).map((c) => c.label)

  const seen = new Map<string, number>()
  const rows = body.map((cellsOfRow, i): ImportRow => {
    const values = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, (index[c.key] === undefined ? '' : (cellsOfRow[index[c.key]!] ?? '')).trim()])) as Record<ImportKey, string>
    const problems: string[] = []
    for (const c of IMPORT_COLUMNS) if ('required' in c && !values[c.key]) problems.push(tr('{field} is empty.', { field: c.label }))
    const gender = values.gender ? GENDERS[normalise(values.gender)] : undefined
    if (values.gender && !gender) problems.push(tr('Gender “{value}” isn’t one of male, female, other.', { value: values.gender }))
    for (const key of ['date_of_birth', 'admitted_on'] as const)
      if (values[key] && !validDate(values[key])) problems.push(tr('{field} should be an AD date like 2010-04-13.', { field: IMPORT_COLUMNS.find((c) => c.key === key)!.label }))
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) problems.push(tr('Email doesn’t look right.'))
    const number = values.student_number.toLowerCase()
    if (number) {
      if (seen.has(number)) problems.push(tr('Same student no. as line {line}.', { line: seen.get(number)! }))
      else seen.set(number, i + 2)
    }
    const input: Omit<StudentInput, 'campus'> = {
      student_number: values.student_number,
      first_name: values.first_name,
      middle_name: values.middle_name,
      last_name: values.last_name,
      ...(gender ? { gender } : {}),
      ...(values.date_of_birth ? { date_of_birth: values.date_of_birth } : {}),
      ...(values.email ? { email: values.email } : {}),
      phone: values.phone,
      address: values.address,
      ...(values.admitted_on ? { admitted_on: values.admitted_on } : {}),
    }
    return { line: i + 2, values, input, problems }
  })
  return { rows, ignored, missing }
}
