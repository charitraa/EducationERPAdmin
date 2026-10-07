import { useQueryClient } from '@tanstack/react-query'
import { CsvImportPage, nameCell } from '@/components/import/CsvImportPage'
import { enumLabel, pluralize } from '@/lib/formatters'
import type { ImportColumn } from '@/lib/importRows'
import { staffApi, staffKeys, type StaffMemberInput } from '../api/staff.api'
import { tr } from '@/lib/i18n'

const COLUMNS: ImportColumn[] = [
  { key: 'employee_number', label: tr('Employee no.'), required: true, unique: true, aliases: ['Employee number', 'Staff no', 'Staff number', 'Emp no', 'ID'] },
  { key: 'first_name', label: tr('First name'), required: true, aliases: ['First name', 'Given name'] },
  { key: 'middle_name', label: tr('Middle name'), aliases: ['Middle name'] },
  { key: 'last_name', label: tr('Last name'), required: true, aliases: ['Last name', 'Surname', 'Family name'] },
  { key: 'gender', label: tr('Gender'), kind: 'gender', aliases: ['Gender', 'Sex'] },
  { key: 'date_of_birth', label: tr('Date of birth'), kind: 'date', aliases: ['Date of birth', 'DOB', 'Birth date'] },
  { key: 'email', label: tr('Email'), kind: 'email', aliases: ['Email', 'Email address'] },
  { key: 'phone', label: tr('Phone'), aliases: ['Phone', 'Mobile', 'Phone number', 'Contact'] },
  { key: 'address', label: tr('Address'), aliases: ['Address'] },
  {
    key: 'staff_type',
    label: tr('Staff type'),
    kind: 'choice',
    aliases: ['Staff type', 'Type'],
    choices: { teaching: 'teaching', teacher: 'teaching', academic: 'teaching', nonteaching: 'non_teaching', nonteacher: 'non_teaching', support: 'non_teaching', admin: 'non_teaching' },
  },
  { key: 'designation', label: tr('Designation'), aliases: ['Designation', 'Position', 'Job title', 'Post'] },
  { key: 'joined_on', label: tr('Joined on'), kind: 'date', aliases: ['Joined on', 'Joining date', 'Date of joining', 'Start date'] },
]

/** Add every teacher and office member at once from a spreadsheet. Logins are given separately, from Users. */
export default function StaffImportPage() {
  const qc = useQueryClient()
  return (
    <CsvImportPage
      title={tr('Import staff')}
      description={tr('Add all your teachers and office staff at once from a spreadsheet. Logins and roles are given afterwards, from Users.')}
      backTo="/staff"
      done={{ to: '/staff', label: tr('See staff') }}
      countLabel={(n) => pluralize(n, 'staff member')}
      fileStem="staff"
      columns={COLUMNS}
      example={['T-001', 'Ram', '', 'Shrestha', 'male', '1990-05-20', 'ram@example.edu.np', '9800000000', 'Lalitpur', 'teaching', 'Science teacher', '2020-04-14']}
      preview={[
        { header: tr('Employee no.'), className: 'whitespace-nowrap font-mono text-xs', cell: (r) => r.values.employee_number || '—' },
        { header: tr('Name'), cell: nameCell },
        { header: tr('Staff type'), className: 'hidden md:table-cell', cell: (r) => (r.input.staff_type ? enumLabel('StaffTypeEnum', r.input.staff_type as string) : '—') },
        { header: tr('Designation'), className: 'hidden md:table-cell', cell: (r) => r.values.designation || '—' },
      ]}
      create={(input, campus) => staffApi.create({ ...(input as Omit<StaffMemberInput, 'campus'>), campus })}
      linkTo={(id) => `/staff/${id}`}
      onFinished={() => void qc.invalidateQueries({ queryKey: staffKeys.all })}
    />
  )
}
