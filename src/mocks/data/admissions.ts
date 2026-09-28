import type { Admission } from '@/lib/api/admissions'

const campusNames: Record<number, string> = { 1: 'Main Campus', 2: 'Lalitpur Branch', 3: '+2 Science Campus', 4: 'Putalisadak Campus' }

function admission(
  partial: Omit<Admission, 'full_name' | 'campus_name' | 'organization' | 'created_at' | 'updated_at'>,
): Admission {
  return {
    ...partial,
    organization: 1,
    full_name: [partial.first_name, partial.middle_name, partial.last_name].filter(Boolean).join(' '),
    campus_name: campusNames[partial.campus] ?? 'Main Campus',
    created_at: '2026-01-02T04:00:00Z',
    updated_at: '2026-01-02T04:00:00Z',
  }
}

export const mockAdmissions: Admission[] = [
  admission({
    id: 1, application_number: 'ADM-2026-001', applied_on: '2026-01-05', applying_for: 'Grade 8', campus: 1,
    first_name: 'Sagar', middle_name: '', last_name: 'Nepal', date_of_birth: '2012-05-14', gender: 'male',
    email: '', phone: '9800011122', address: 'Koteshwor, Kathmandu', previous_school: 'Little Angels School',
    guardian_first_name: 'Hari', guardian_last_name: 'Nepal', guardian_relationship: 'father', guardian_phone: '9800011122', guardian_email: '',
    status: 'pending', decided_at: null, decided_by: null, decision_note: '', student: null,
  }),
  admission({
    id: 2, application_number: 'ADM-2026-002', applied_on: '2026-01-06', applying_for: 'Grade 6', campus: 2,
    first_name: 'Puja', middle_name: '', last_name: 'Karki', date_of_birth: '2014-09-02', gender: 'female',
    email: 'puja.parent@gmail.com', phone: '', address: 'Patan, Lalitpur', previous_school: 'Rato Bangala School',
    guardian_first_name: 'Meena', guardian_last_name: 'Karki', guardian_relationship: 'mother', guardian_phone: '9800022233', guardian_email: 'puja.parent@gmail.com',
    status: 'pending', decided_at: null, decided_by: null, decision_note: '', student: null,
  }),
  admission({
    id: 3, application_number: 'ADM-2025-098', applied_on: '2025-12-20', applying_for: 'Grade 11 Science', campus: 3,
    first_name: 'Sneha', middle_name: '', last_name: 'Joshi', date_of_birth: '2011-03-20', gender: 'female',
    email: '', phone: '9800033344', address: 'New Baneshwor, Kathmandu', previous_school: 'Adarsha Vidya Mandir',
    guardian_first_name: 'Ram', guardian_last_name: 'Joshi', guardian_relationship: 'father', guardian_phone: '9800033344', guardian_email: '',
    status: 'approved', decided_at: '2025-12-22T05:00:00Z', decided_by: 4, decision_note: 'Strong academic record, seat confirmed.', student: null,
  }),
  admission({
    id: 4, application_number: 'ADM-2025-097', applied_on: '2025-12-18', applying_for: 'Grade 9', campus: 1,
    first_name: 'Utsav', middle_name: '', last_name: 'Regmi', date_of_birth: '2012-10-11', gender: 'male',
    email: '', phone: '9800044455', address: 'Gongabu, Kathmandu', previous_school: 'Gyan Mandir School',
    guardian_first_name: 'Suresh', guardian_last_name: 'Regmi', guardian_relationship: 'father', guardian_phone: '9800044455', guardian_email: '',
    status: 'rejected', decided_at: '2025-12-21T05:00:00Z', decided_by: 4, decision_note: 'No seats available for the requested grade.', student: null,
  }),
  admission({
    id: 5, application_number: 'ADM-2025-090', applied_on: '2025-12-01', applying_for: 'Grade 8', campus: 1,
    first_name: 'Prisha', middle_name: '', last_name: 'Lama', date_of_birth: '2012-12-25', gender: 'female',
    email: '', phone: '', address: 'Sinamangal, Kathmandu', previous_school: 'Ideal Model School',
    guardian_first_name: 'Tenzin', guardian_last_name: 'Lama', guardian_relationship: 'father', guardian_phone: '9800055566', guardian_email: '',
    status: 'enrolled', decided_at: '2025-12-05T05:00:00Z', decided_by: 4, decision_note: 'Approved and enrolled.', student: 8,
  }),
  admission({
    id: 6, application_number: 'ADM-2025-088', applied_on: '2025-11-28', applying_for: 'Grade 7', campus: 2,
    first_name: 'Aashish', middle_name: '', last_name: 'Bogati', date_of_birth: '2013-01-15', gender: 'male',
    email: '', phone: '9800066677', address: 'Patan, Lalitpur', previous_school: 'Mount Everest School',
    guardian_first_name: 'Nabin', guardian_last_name: 'Bogati', guardian_relationship: 'father', guardian_phone: '9800066677', guardian_email: '',
    status: 'withdrawn', decided_at: '2025-11-30T05:00:00Z', decided_by: 4, decision_note: 'Family relocated before enrollment.', student: null,
  }),
]
