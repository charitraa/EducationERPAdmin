import { useQueryClient } from '@tanstack/react-query'
import { CsvImportPage, nameCell } from '@/components/import/CsvImportPage'
import { pluralize } from '@/lib/formatters'
import type { ImportColumn } from '@/lib/importRows'
import { profileKeys, profilesApi, type AlumniProfileInput } from '../api/alumni.api'
import { tr } from '@/lib/i18n'

const COLUMNS: ImportColumn[] = [
  { key: 'first_name', label: tr('First name'), required: true, aliases: ['First name', 'Given name'] },
  { key: 'middle_name', label: tr('Middle name'), aliases: ['Middle name'] },
  { key: 'last_name', label: tr('Last name'), required: true, aliases: ['Last name', 'Surname', 'Family name'] },
  { key: 'gender', label: tr('Gender'), kind: 'gender', aliases: ['Gender', 'Sex'] },
  { key: 'date_of_birth', label: tr('Date of birth'), kind: 'date', aliases: ['Date of birth', 'DOB', 'Birth date'] },
  { key: 'email', label: tr('Email'), kind: 'email', aliases: ['Email', 'Email address'] },
  { key: 'phone', label: tr('Phone'), aliases: ['Phone', 'Mobile', 'Phone number', 'Contact'] },
  { key: 'address', label: tr('Address'), aliases: ['Address'] },
  { key: 'city', label: tr('City'), aliases: ['City', 'Town'] },
  { key: 'country', label: tr('Country'), aliases: ['Country'] },
  { key: 'program_name', label: tr('Program'), aliases: ['Program', 'Programme', 'Course', 'Faculty', 'Stream'] },
  { key: 'section_name', label: tr('Class'), aliases: ['Class', 'Section'] },
  { key: 'academic_year', label: tr('Batch'), aliases: ['Batch', 'Academic year', 'Year', 'Passed year'] },
  { key: 'graduated_on', label: tr('Graduated on'), kind: 'date', aliases: ['Graduated on', 'Graduation date', 'Date of graduation'] },
  { key: 'linkedin_url', label: tr('LinkedIn'), aliases: ['LinkedIn', 'LinkedIn URL'] },
  { key: 'directory_visible', label: tr('In the directory'), kind: 'bool', aliases: ['Directory', 'Listed', 'In the directory'] },
]

/** Bring in earlier graduates from paper registers or an old system. */
export default function AlumniImportPage() {
  const qc = useQueryClient()
  return (
    <CsvImportPage
      title={tr('Import alumni')}
      description={tr('Bring in earlier graduates from your registers or an old system. New classes are graduated from Alumni instead.')}
      backTo="/alumni"
      done={{ to: '/alumni', label: tr('See alumni') }}
      countLabel={(n) => pluralize(n, 'alumnus', 'alumni')}
      fileStem="alumni"
      columns={COLUMNS}
      example={['Sita', '', 'Rai', 'female', '', 'sita@example.com', '9800000000', '', 'Kathmandu', 'Nepal', '+2 Science', 'Grade 12 A', '2075', '2019-06-30', '', 'yes']}
      preview={[
        { header: tr('Name'), cell: nameCell },
        { header: tr('Program'), className: 'hidden md:table-cell', cell: (r) => r.values.program_name || '—' },
        { header: tr('Batch'), className: 'hidden md:table-cell', cell: (r) => r.values.academic_year || '—' },
        { header: tr('Email'), className: 'hidden md:table-cell', cell: (r) => r.values.email || '—' },
      ]}
      create={(input, campus) => profilesApi.create({ ...(input as Omit<AlumniProfileInput, 'campus'>), campus })}
      linkTo={(id) => `/alumni/${id}`}
      onFinished={() => void qc.invalidateQueries({ queryKey: profileKeys.all })}
    />
  )
}
