'use client'

import { format, parseISO } from 'date-fns'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { money, titleCase } from '@/lib/utils'
import type { ResourceDef } from './types'

const date = (value?: string | null) => {
  if (!value) return '—'
  try {
    return format(parseISO(value), 'd MMM yyyy')
  } catch {
    return '—'
  }
}

const strong = (value: React.ReactNode) => (
  <span className="font-bold text-ink">{value ?? '—'}</span>
)

const YES_NO = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
]

/* ── Academics ─────────────────────────────────────────────────────────── */
export const ACADEMIC_YEARS: ResourceDef = {
  path: '/academic-years',
  module: 'academic_years',
  title: 'Academic Years',
  singular: 'Academic year',
  plural: 'Academic years',
  icon: 'calendar-range',
  defaultSort: 'start_date',
  defaultSortDir: 'desc',
  columns: [
    { key: 'name', header: 'Year', sortable: true, cell: (r) => strong(r.name) },
    { key: 'start_date', header: 'Starts', cell: (r) => date(r.start_date) },
    { key: 'end_date', header: 'Ends', cell: (r) => date(r.end_date) },
    {
      key: 'is_current',
      header: 'Current',
      align: 'center',
      cell: (r) => (r.is_current ? <Badge tone="success">Current</Badge> : '—'),
    },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: '2026-27' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'active',
      options: ['upcoming', 'active', 'closed'].map((v) => ({ value: v, label: titleCase(v) })),
    },
    { name: 'start_date', label: 'Start date', type: 'date', required: true },
    { name: 'end_date', label: 'End date', type: 'date', required: true },
    { name: 'is_current', label: 'Mark as the current year', type: 'checkbox', full: true },
    { name: 'description', label: 'Notes', type: 'textarea' },
  ],
}

export const CLASSES: ResourceDef = {
  path: '/classes',
  module: 'classes',
  title: 'Classes',
  singular: 'Class',
  plural: 'Classes',
  icon: 'layers',
  defaultSort: 'order',
  searchPlaceholder: 'Search class name or stream',
  invalidates: ['options'],
  filters: [
    { name: 'academic_year_id', label: 'Academic year', optionsFrom: '/academic-years' },
  ],
  columns: [
    { key: 'name', header: 'Class', sortable: true, cell: (r) => strong(r.name) },
    { key: 'stream', header: 'Stream', cell: (r) => r.stream || '—' },
    {
      key: 'semester',
      header: 'Semester',
      align: 'center',
      cell: (r) => r.semester ?? '—',
    },
    { key: 'capacity', header: 'Capacity', align: 'right', cell: (r) => r.capacity || '—' },
    {
      key: 'is_active',
      header: 'Status',
      align: 'center',
      cell: (r) => <Badge status={r.is_active ? 'active' : 'inactive'} />,
    },
  ],
  fields: [
    { name: 'name', label: 'Class name', required: true, placeholder: 'Class 8' },
    { name: 'numeric_level', label: 'Level', type: 'number', placeholder: '8', hint: 'Used for sorting' },
    {
      name: 'academic_year_id',
      label: 'Academic year',
      type: 'remote-select',
      optionsFrom: '/academic-years',
      required: true,
    },
    { name: 'stream', label: 'Stream', placeholder: 'Science / Commerce / Arts' },
    { name: 'semester', label: 'Semester', type: 'number', placeholder: 'For colleges' },
    { name: 'capacity', label: 'Capacity', type: 'number', placeholder: '120' },
    {
      name: 'program_id',
      label: 'Program',
      type: 'remote-select',
      optionsFrom: '/programs',
      hint: 'Colleges and universities only',
    },
    { name: 'order', label: 'Sort order', type: 'number', defaultValue: 0 },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
}

export const SECTIONS: ResourceDef = {
  path: '/sections',
  module: 'classes',
  title: 'Sections',
  singular: 'Section',
  plural: 'Sections',
  icon: 'layers',
  defaultSort: 'name',
  invalidates: ['options'],
  filters: [{ name: 'class_id', label: 'Class', optionsFrom: '/classes' }],
  columns: [
    { key: 'name', header: 'Section', sortable: true, cell: (r) => strong(r.name) },
    { key: 'room', header: 'Room', cell: (r) => r.room || '—' },
    {
      key: 'current_strength',
      header: 'Strength',
      align: 'right',
      cell: (r) => `${r.current_strength ?? 0} / ${r.capacity ?? 0}`,
    },
    {
      key: 'is_active',
      header: 'Status',
      align: 'center',
      cell: (r) => <Badge status={r.is_active ? 'active' : 'inactive'} />,
    },
  ],
  fields: [
    { name: 'name', label: 'Section name', required: true, placeholder: 'A' },
    { name: 'class_id', label: 'Class', type: 'remote-select', optionsFrom: '/classes', required: true },
    {
      name: 'academic_year_id',
      label: 'Academic year',
      type: 'remote-select',
      optionsFrom: '/academic-years',
      required: true,
    },
    { name: 'room', label: 'Room', placeholder: 'R-101' },
    { name: 'capacity', label: 'Capacity', type: 'number', defaultValue: 40 },
    {
      name: 'class_teacher_id',
      label: 'Class teacher',
      type: 'remote-select',
      optionsFrom: '/staff',
      optionLabel: (s) => s.full_name,
    },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
}

export const SUBJECTS: ResourceDef = {
  path: '/subjects',
  module: 'subjects',
  title: 'Subjects',
  singular: 'Subject',
  plural: 'Subjects',
  icon: 'book-open',
  defaultSort: 'order',
  searchPlaceholder: 'Search subject name or code',
  filters: [
    { name: 'class_id', label: 'Class', optionsFrom: '/classes' },
    {
      name: 'type',
      label: 'Type',
      options: ['core', 'elective', 'optional', 'practical', 'project'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
  ],
  columns: [
    { key: 'name', header: 'Subject', sortable: true, cell: (r) => strong(r.name) },
    { key: 'code', header: 'Code', cell: (r) => <span className="tabular">{r.code}</span> },
    { key: 'type', header: 'Type', cell: (r) => <Badge tone="neutral">{titleCase(r.type)}</Badge> },
    { key: 'credits', header: 'Credits', align: 'right', cell: (r) => r.credits || '—' },
    { key: 'max_marks', header: 'Max marks', align: 'right', cell: (r) => r.max_marks },
  ],
  fields: [
    { name: 'name', label: 'Subject name', required: true, placeholder: 'Mathematics' },
    { name: 'code', label: 'Code', required: true, placeholder: 'MATH8' },
    { name: 'short_name', label: 'Short name', placeholder: 'Maths' },
    { name: 'class_id', label: 'Class', type: 'remote-select', optionsFrom: '/classes' },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      defaultValue: 'core',
      options: ['core', 'elective', 'optional', 'practical', 'project'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    { name: 'credits', label: 'Credits', type: 'number', placeholder: '4' },
    { name: 'max_marks', label: 'Max marks', type: 'number', defaultValue: 100 },
    { name: 'pass_marks', label: 'Pass marks', type: 'number', defaultValue: 33 },
    { name: 'has_practical', label: 'Has a practical component', type: 'checkbox' },
    { name: 'is_graded', label: 'Counts towards grades', type: 'checkbox', defaultValue: true },
    { name: 'order', label: 'Sort order', type: 'number', defaultValue: 0 },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

export const DEPARTMENTS: ResourceDef = {
  path: '/departments',
  module: 'departments',
  title: 'Departments',
  singular: 'Department',
  plural: 'Departments',
  icon: 'building-2',
  defaultSort: 'name',
  columns: [
    { key: 'name', header: 'Department', sortable: true, cell: (r) => strong(r.name) },
    { key: 'code', header: 'Code', cell: (r) => <span className="tabular">{r.code}</span> },
    { key: 'email', header: 'Email', cell: (r) => r.email || '—' },
    { key: 'phone', header: 'Phone', cell: (r) => r.phone || '—' },
    {
      key: 'is_active',
      header: 'Status',
      align: 'center',
      cell: (r) => <Badge status={r.is_active ? 'active' : 'inactive'} />,
    },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'Computer Science' },
    { name: 'code', label: 'Code', required: true, placeholder: 'CSE' },
    {
      name: 'head_staff_id',
      label: 'Head of department',
      type: 'remote-select',
      optionsFrom: '/staff',
      optionLabel: (s) => s.full_name,
    },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

export const PROGRAMS: ResourceDef = {
  path: '/programs',
  module: 'programs',
  title: 'Programs',
  singular: 'Program',
  plural: 'Programs',
  icon: 'graduation-cap',
  defaultSort: 'name',
  filters: [{ name: 'department_id', label: 'Department', optionsFrom: '/departments' }],
  columns: [
    { key: 'name', header: 'Program', sortable: true, cell: (r) => strong(r.name) },
    { key: 'code', header: 'Code', cell: (r) => <span className="tabular">{r.code}</span> },
    { key: 'level', header: 'Level', cell: (r) => titleCase(r.level) },
    {
      key: 'duration_years',
      header: 'Duration',
      align: 'right',
      cell: (r) => `${r.duration_years} yr`,
    },
    { key: 'total_semesters', header: 'Semesters', align: 'right' },
  ],
  fields: [
    { name: 'name', label: 'Program name', required: true, placeholder: 'B.Tech Computer Science' },
    { name: 'code', label: 'Code', required: true, placeholder: 'BTCSE' },
    { name: 'department_id', label: 'Department', type: 'remote-select', optionsFrom: '/departments' },
    {
      name: 'level',
      label: 'Level',
      type: 'select',
      defaultValue: 'undergraduate',
      options: ['certificate', 'diploma', 'undergraduate', 'postgraduate', 'doctoral'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    { name: 'duration_years', label: 'Duration (years)', type: 'number', defaultValue: 3 },
    { name: 'total_semesters', label: 'Total semesters', type: 'number', defaultValue: 6 },
    { name: 'total_credits', label: 'Total credits', type: 'number' },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

/* ── People ────────────────────────────────────────────────────────────── */
export const STAFF: ResourceDef = {
  path: '/staff',
  module: 'staff',
  title: 'Staff & Teachers',
  singular: 'Staff member',
  plural: 'Staff',
  icon: 'briefcase',
  defaultSort: 'first_name',
  searchPlaceholder: 'Search name, employee ID or phone',
  invalidates: ['options'],
  filters: [
    { name: 'department_id', label: 'Department', optionsFrom: '/departments' },
    {
      name: 'status',
      label: 'Status',
      options: ['active', 'on_leave', 'resigned', 'retired'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    { name: 'is_teaching', label: 'Teaching', options: YES_NO },
  ],
  columns: [
    {
      key: 'full_name',
      header: 'Name',
      sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.full_name} src={r.photo?.url} size={36} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-ink">{r.full_name}</p>
            <p className="tabular truncate text-[12px] text-muted">{r.employee_id}</p>
          </div>
        </div>
      ),
    },
    { key: 'designation', header: 'Designation', cell: (r) => r.designation || '—' },
    {
      key: 'employment_type',
      header: 'Type',
      cell: (r) => <Badge tone="neutral">{titleCase(r.employment_type ?? '')}</Badge>,
    },
    { key: 'contact', header: 'Phone', cell: (r) => r.contact?.phone || '—' },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'first_name', label: 'First name', required: true, section: 'Identity' },
    { name: 'last_name', label: 'Last name', section: 'Identity' },
    { name: 'employee_id', label: 'Employee ID', placeholder: 'Auto-generated', section: 'Identity' },
    { name: 'date_of_birth', label: 'Date of birth', type: 'date', section: 'Identity' },
    {
      name: 'gender',
      label: 'Gender',
      type: 'select',
      defaultValue: 'undisclosed',
      options: ['undisclosed', 'female', 'male', 'other'].map((v) => ({ value: v, label: titleCase(v) })),
      section: 'Identity',
    },
    { name: 'blood_group', label: 'Blood group', section: 'Identity' },

    { name: 'designation', label: 'Designation', placeholder: 'Senior Teacher', section: 'Role' },
    { name: 'department_id', label: 'Department', type: 'remote-select', optionsFrom: '/departments', section: 'Role' },
    {
      name: 'employment_type',
      label: 'Employment type',
      type: 'select',
      defaultValue: 'full_time',
      options: ['full_time', 'part_time', 'contract', 'visiting', 'intern'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
      section: 'Role',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'active',
      options: ['active', 'on_leave', 'resigned', 'retired', 'terminated'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
      section: 'Role',
    },
    { name: 'joining_date', label: 'Joining date', type: 'date', section: 'Role' },
    { name: 'is_teaching', label: 'Teaching staff', type: 'checkbox', defaultValue: true, section: 'Role' },

    { name: 'contact.phone', label: 'Phone', type: 'tel', section: 'Contact' },
    { name: 'contact.email', label: 'Email', type: 'email', section: 'Contact' },
    { name: 'address.city', label: 'City', section: 'Contact' },
    { name: 'address.state', label: 'State', section: 'Contact' },

    { name: 'basic_salary', label: 'Basic salary', type: 'number', section: 'Payroll' },
    { name: 'bank.account_number', label: 'Account number', section: 'Payroll' },
    { name: 'bank.ifsc', label: 'IFSC', section: 'Payroll' },
    { name: 'bank.bank_name', label: 'Bank', section: 'Payroll' },
  ],
  formWidth: 'lg',
}

export const GUARDIANS: ResourceDef = {
  path: '/guardians',
  module: 'guardians',
  title: 'Parents & Guardians',
  singular: 'Guardian',
  plural: 'Guardians',
  icon: 'users-round',
  defaultSort: 'full_name',
  searchPlaceholder: 'Search name, phone or email',
  filters: [
    {
      name: 'relation',
      label: 'Relation',
      options: ['father', 'mother', 'guardian', 'other'].map((v) => ({ value: v, label: titleCase(v) })),
    },
  ],
  columns: [
    {
      key: 'full_name',
      header: 'Name',
      sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.full_name} size={34} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold text-ink">{r.full_name}</p>
            <p className="truncate text-[12px] text-muted">{titleCase(r.relation ?? '')}</p>
          </div>
        </div>
      ),
    },
    { key: 'occupation', header: 'Occupation', cell: (r) => r.occupation || '—' },
    { key: 'phone', header: 'Phone', cell: (r) => r.contact?.phone || '—' },
    { key: 'email', header: 'Email', cell: (r) => r.contact?.email || '—' },
    {
      key: 'student_ids',
      header: 'Children',
      align: 'center',
      cell: (r) => r.student_ids?.length ?? 0,
    },
  ],
  fields: [
    { name: 'full_name', label: 'Full name', required: true },
    {
      name: 'relation',
      label: 'Relation',
      type: 'select',
      defaultValue: 'father',
      options: ['father', 'mother', 'guardian', 'other'].map((v) => ({ value: v, label: titleCase(v) })),
    },
    { name: 'contact.phone', label: 'Phone', type: 'tel' },
    { name: 'contact.email', label: 'Email', type: 'email' },
    { name: 'occupation', label: 'Occupation' },
    { name: 'employer', label: 'Employer' },
    { name: 'annual_income', label: 'Annual income', type: 'number' },
    { name: 'qualification', label: 'Qualification' },
    { name: 'is_emergency_contact', label: 'Emergency contact', type: 'checkbox' },
    { name: 'can_pick_up', label: 'Authorised for pickup', type: 'checkbox', defaultValue: true },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

/* ── Finance ───────────────────────────────────────────────────────────── */
export const FEE_HEADS: ResourceDef = {
  path: '/fee-heads',
  module: 'fees',
  title: 'Fee Heads',
  singular: 'Fee head',
  plural: 'Fee heads',
  icon: 'receipt',
  defaultSort: 'name',
  filters: [
    {
      name: 'category',
      label: 'Category',
      options: ['academic', 'facility', 'one_time', 'penalty', 'optional'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
  ],
  columns: [
    { key: 'name', header: 'Fee head', sortable: true, cell: (r) => strong(r.name) },
    { key: 'code', header: 'Code', cell: (r) => <span className="tabular">{r.code}</span> },
    {
      key: 'category',
      header: 'Category',
      cell: (r) => <Badge tone="neutral">{titleCase(r.category)}</Badge>,
    },
    {
      key: 'default_amount',
      header: 'Default',
      align: 'right',
      cell: (r) => (r.default_amount ? money(r.default_amount) : '—'),
    },
    {
      key: 'is_recurring',
      header: 'Recurring',
      align: 'center',
      cell: (r) => (r.is_recurring ? <Badge tone="info">Recurring</Badge> : '—'),
    },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'Tuition Fee' },
    { name: 'code', label: 'Code', required: true, placeholder: 'TUITION' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      defaultValue: 'academic',
      options: ['academic', 'facility', 'one_time', 'penalty', 'optional'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    { name: 'default_amount', label: 'Default amount', type: 'number' },
    { name: 'is_recurring', label: 'Charged every period', type: 'checkbox', defaultValue: true },
    { name: 'is_optional', label: 'Optional', type: 'checkbox' },
    { name: 'is_refundable', label: 'Refundable', type: 'checkbox' },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

/* ── Communication ─────────────────────────────────────────────────────── */
export const ANNOUNCEMENTS: ResourceDef = {
  path: '/announcements',
  module: 'announcements',
  title: 'Announcements',
  singular: 'Announcement',
  plural: 'Announcements',
  icon: 'megaphone',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  filters: [
    {
      name: 'status',
      label: 'Status',
      options: ['draft', 'published', 'archived'].map((v) => ({ value: v, label: titleCase(v) })),
    },
    {
      name: 'priority',
      label: 'Priority',
      options: ['low', 'normal', 'high', 'urgent'].map((v) => ({ value: v, label: titleCase(v) })),
    },
  ],
  columns: [
    { key: 'title', header: 'Title', sortable: true, cell: (r) => strong(r.title) },
    {
      key: 'category',
      header: 'Category',
      cell: (r) => <Badge tone="neutral">{titleCase(r.category)}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (r) => (
        <Badge tone={r.priority === 'urgent' ? 'danger' : r.priority === 'high' ? 'warning' : 'neutral'}>
          {titleCase(r.priority)}
        </Badge>
      ),
    },
    { key: 'published_at', header: 'Published', cell: (r) => date(r.published_at) },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      defaultValue: 'general',
      options: ['general', 'academic', 'exam', 'holiday', 'fee', 'urgent'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      defaultValue: 'normal',
      options: ['low', 'normal', 'high', 'urgent'].map((v) => ({ value: v, label: titleCase(v) })),
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'draft',
      options: ['draft', 'published', 'archived'].map((v) => ({ value: v, label: titleCase(v) })),
    },
    { name: 'pin_to_top', label: 'Pin to the top', type: 'checkbox' },
    { name: 'summary', label: 'Summary', type: 'textarea' },
    { name: 'body', label: 'Message', type: 'textarea' },
  ],
  formWidth: 'lg',
}

export const EVENTS: ResourceDef = {
  path: '/events',
  module: 'events',
  title: 'Events',
  singular: 'Event',
  plural: 'Events',
  icon: 'calendar-days',
  defaultSort: 'start_at',
  defaultSortDir: 'desc',
  filters: [
    {
      name: 'category',
      label: 'Category',
      options: ['general', 'exam', 'holiday', 'sports', 'cultural', 'meeting', 'ptm'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
  ],
  columns: [
    { key: 'title', header: 'Event', sortable: true, cell: (r) => strong(r.title) },
    {
      key: 'category',
      header: 'Category',
      cell: (r) => <Badge tone="neutral">{titleCase(r.category)}</Badge>,
    },
    { key: 'start_at', header: 'Starts', sortable: true, cell: (r) => date(r.start_at) },
    { key: 'location', header: 'Location', cell: (r) => r.location || '—' },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'start_at', label: 'Starts', type: 'date', required: true },
    { name: 'end_at', label: 'Ends', type: 'date' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      defaultValue: 'general',
      options: ['general', 'exam', 'holiday', 'sports', 'cultural', 'meeting', 'ptm'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    { name: 'location', label: 'Location' },
    { name: 'all_day', label: 'All day', type: 'checkbox' },
    { name: 'is_holiday', label: 'Counts as a holiday', type: 'checkbox' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

export const ASSIGNMENTS: ResourceDef = {
  path: '/assignments',
  module: 'assignments',
  title: 'Assignments',
  singular: 'Assignment',
  plural: 'Assignments',
  icon: 'clipboard-list',
  defaultSort: 'due_date',
  defaultSortDir: 'desc',
  filters: [
    { name: 'subject_id', label: 'Subject', optionsFrom: '/subjects' },
    {
      name: 'status',
      label: 'Status',
      options: ['draft', 'published', 'closed'].map((v) => ({ value: v, label: titleCase(v) })),
    },
  ],
  columns: [
    { key: 'title', header: 'Assignment', sortable: true, cell: (r) => strong(r.title) },
    { key: 'type', header: 'Type', cell: (r) => <Badge tone="neutral">{titleCase(r.type)}</Badge> },
    { key: 'due_date', header: 'Due', sortable: true, cell: (r) => date(r.due_date) },
    { key: 'max_marks', header: 'Marks', align: 'right', cell: (r) => r.max_marks || '—' },
    {
      key: 'submission_count',
      header: 'Submitted',
      align: 'right',
      cell: (r) => r.submission_count ?? 0,
    },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'subject_id', label: 'Subject', type: 'remote-select', optionsFrom: '/subjects' },
    { name: 'class_id', label: 'Class', type: 'remote-select', optionsFrom: '/classes' },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      defaultValue: 'homework',
      options: ['homework', 'project', 'lab', 'reading', 'presentation'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    { name: 'due_date', label: 'Due date', type: 'date' },
    { name: 'max_marks', label: 'Maximum marks', type: 'number' },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      defaultValue: 'draft',
      options: ['draft', 'published', 'closed'].map((v) => ({ value: v, label: titleCase(v) })),
    },
    { name: 'allow_late_submission', label: 'Allow late submission', type: 'checkbox', defaultValue: true },
    { name: 'description', label: 'Instructions', type: 'textarea' },
  ],
  formWidth: 'lg',
}

export const LIBRARY_ITEMS: ResourceDef = {
  path: '/library/items',
  module: 'library',
  title: 'Library',
  singular: 'Item',
  plural: 'Library items',
  icon: 'book-marked',
  defaultSort: 'title',
  searchPlaceholder: 'Search title, author, ISBN or accession number',
  filters: [
    {
      name: 'category',
      label: 'Category',
      options: ['book', 'journal', 'magazine', 'thesis', 'media', 'ebook'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    {
      name: 'status',
      label: 'Status',
      options: ['available', 'issued', 'reserved', 'lost', 'damaged'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
  ],
  columns: [
    { key: 'title', header: 'Title', sortable: true, cell: (r) => strong(r.title) },
    { key: 'author', header: 'Author', cell: (r) => r.author || '—' },
    {
      key: 'accession_number',
      header: 'Accession',
      cell: (r) => <span className="tabular">{r.accession_number}</span>,
    },
    {
      key: 'available_copies',
      header: 'Available',
      align: 'right',
      cell: (r) => `${r.available_copies ?? 0} / ${r.total_copies ?? 0}`,
    },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'author', label: 'Author' },
    { name: 'accession_number', label: 'Accession number', required: true },
    { name: 'isbn', label: 'ISBN' },
    { name: 'publisher', label: 'Publisher' },
    { name: 'edition', label: 'Edition' },
    {
      name: 'category',
      label: 'Category',
      type: 'select',
      defaultValue: 'book',
      options: ['book', 'journal', 'magazine', 'thesis', 'media', 'ebook'].map((v) => ({
        value: v,
        label: titleCase(v),
      })),
    },
    { name: 'shelf', label: 'Shelf' },
    { name: 'total_copies', label: 'Total copies', type: 'number', defaultValue: 1 },
    { name: 'available_copies', label: 'Available copies', type: 'number', defaultValue: 1 },
    { name: 'price', label: 'Price', type: 'number' },
    { name: 'published_year', label: 'Published year' },
  ],
  formWidth: 'lg',
}
