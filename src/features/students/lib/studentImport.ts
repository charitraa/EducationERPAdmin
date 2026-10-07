import type { ImportColumn } from '@/lib/importRows'
import { tr } from '@/lib/i18n'

/** The columns a student import understands, in template order. */
export const STUDENT_COLUMNS: ImportColumn[] = [
  { key: 'student_number', label: tr('Student no.'), required: true, unique: true, aliases: ['Student number', 'Reg no', 'Registration no', 'Registration number', 'Admission no', 'Admission number', 'Roll no'] },
  { key: 'first_name', label: tr('First name'), required: true, aliases: ['First name', 'Given name'] },
  { key: 'middle_name', label: tr('Middle name'), aliases: ['Middle name'] },
  { key: 'last_name', label: tr('Last name'), required: true, aliases: ['Last name', 'Surname', 'Family name'] },
  { key: 'gender', label: tr('Gender'), kind: 'gender', aliases: ['Gender', 'Sex'] },
  { key: 'date_of_birth', label: tr('Date of birth'), kind: 'date', aliases: ['Date of birth', 'DOB', 'Birth date'] },
  { key: 'email', label: tr('Email'), kind: 'email', aliases: ['Email', 'Email address'] },
  { key: 'phone', label: tr('Phone'), aliases: ['Phone', 'Mobile', 'Phone number', 'Contact'] },
  { key: 'address', label: tr('Address'), aliases: ['Address'] },
  { key: 'admitted_on', label: tr('Admitted on'), kind: 'date', aliases: ['Admitted on', 'Admission date', 'Date of admission'] },
]
