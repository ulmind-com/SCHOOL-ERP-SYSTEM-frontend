'use client'

import { format, parseISO } from 'date-fns'
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
const strong = (value: React.ReactNode) => <span className="font-bold text-ink">{value ?? '—'}</span>
const opts = (values: string[]) => values.map((v) => ({ value: v, label: titleCase(v) }))

/* ── Admissions ────────────────────────────────────────────────────────── */
export const ENQUIRIES: ResourceDef = {
  path: '/admission-enquiries',
  module: 'admissions',
  title: 'Admissions',
  singular: 'Enquiry',
  plural: 'Enquiries',
  icon: 'user-plus',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  searchPlaceholder: 'Search student, parent or phone',
  filters: [
    { name: 'status', label: 'Status', options: opts(['new', 'contacted', 'visited', 'converted', 'lost']) },
    { name: 'source', label: 'Source', options: opts(['walk_in', 'website', 'referral', 'phone', 'campaign']) },
  ],
  columns: [
    { key: 'student_name', header: 'Student', sortable: true, cell: (r) => strong(r.student_name) },
    { key: 'guardian_name', header: 'Parent', cell: (r) => r.guardian_name || '—' },
    { key: 'phone', header: 'Phone', cell: (r) => <span className="tabular">{r.phone}</span> },
    { key: 'source', header: 'Source', cell: (r) => <Badge tone="neutral">{titleCase(r.source ?? '')}</Badge> },
    { key: 'follow_up_on', header: 'Follow up', cell: (r) => date(r.follow_up_on) },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'student_name', label: 'Student name', required: true },
    { name: 'guardian_name', label: 'Parent / guardian' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'Email', type: 'email' },
    { name: 'class_interested_id', label: 'Class of interest', type: 'remote-select', optionsFrom: '/classes' },
    { name: 'source', label: 'Source', type: 'select', defaultValue: 'walk_in', options: opts(['walk_in', 'website', 'referral', 'phone', 'campaign']) },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'new', options: opts(['new', 'contacted', 'visited', 'converted', 'lost']) },
    { name: 'follow_up_on', label: 'Follow up on', type: 'date' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

/* ── Academics extras ──────────────────────────────────────────────────── */
export const SYLLABUS: ResourceDef = {
  path: '/syllabus',
  module: 'syllabus',
  title: 'Syllabus',
  singular: 'Unit',
  plural: 'Syllabus units',
  icon: 'list-checks',
  defaultSort: 'order',
  filters: [{ name: 'subject_id', label: 'Subject', optionsFrom: '/subjects' }],
  columns: [
    { key: 'title', header: 'Unit', sortable: true, cell: (r) => strong(r.title) },
    { key: 'order', header: 'Order', align: 'center' },
    { key: 'planned_hours', header: 'Hours', align: 'right', cell: (r) => r.planned_hours || '—' },
    {
      key: 'completed',
      header: 'Completed',
      align: 'center',
      cell: (r) => (r.completed ? <Badge tone="success">Done</Badge> : <Badge tone="neutral">Pending</Badge>),
    },
  ],
  fields: [
    { name: 'title', label: 'Unit title', required: true, full: true },
    { name: 'subject_id', label: 'Subject', type: 'remote-select', optionsFrom: '/subjects', required: true },
    { name: 'class_id', label: 'Class', type: 'remote-select', optionsFrom: '/classes' },
    { name: 'order', label: 'Order', type: 'number', defaultValue: 1 },
    { name: 'planned_hours', label: 'Planned hours', type: 'number' },
    { name: 'completed', label: 'Completed', type: 'checkbox' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

export const MATERIALS: ResourceDef = {
  path: '/materials',
  module: 'lms',
  title: 'Learning Material',
  singular: 'Material',
  plural: 'Materials',
  icon: 'library-big',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  filters: [
    { name: 'subject_id', label: 'Subject', optionsFrom: '/subjects' },
    { name: 'type', label: 'Type', options: opts(['document', 'video', 'link', 'slide', 'quiz']) },
  ],
  columns: [
    { key: 'title', header: 'Title', sortable: true, cell: (r) => strong(r.title) },
    { key: 'type', header: 'Type', cell: (r) => <Badge tone="neutral">{titleCase(r.type ?? '')}</Badge> },
    { key: 'created_at', header: 'Added', cell: (r) => date(r.created_at) },
    { key: 'view_count', header: 'Views', align: 'right', cell: (r) => r.view_count ?? 0 },
    {
      key: 'is_published',
      header: 'Status',
      align: 'center',
      cell: (r) => <Badge status={r.is_published ? 'published' : 'draft'} />,
    },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'subject_id', label: 'Subject', type: 'remote-select', optionsFrom: '/subjects' },
    { name: 'class_id', label: 'Class', type: 'remote-select', optionsFrom: '/classes' },
    { name: 'type', label: 'Type', type: 'select', defaultValue: 'document', options: opts(['document', 'video', 'link', 'slide', 'quiz']) },
    { name: 'external_url', label: 'External link', placeholder: 'https://…' },
    { name: 'is_published', label: 'Published', type: 'checkbox' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

export const EXAMS: ResourceDef = {
  path: '/exams',
  module: 'exams',
  title: 'Exams',
  singular: 'Exam',
  plural: 'Exams',
  icon: 'file-badge',
  defaultSort: 'start_date',
  defaultSortDir: 'desc',
  filters: [
    { name: 'status', label: 'Status', options: opts(['scheduled', 'ongoing', 'marks_entry', 'completed', 'published']) },
    { name: 'type', label: 'Type', options: opts(['unit_test', 'midterm', 'final', 'practical', 'internal', 'board']) },
  ],
  columns: [
    { key: 'name', header: 'Exam', sortable: true, cell: (r) => strong(r.name) },
    { key: 'type', header: 'Type', cell: (r) => <Badge tone="neutral">{titleCase(r.type ?? '')}</Badge> },
    { key: 'start_date', header: 'Starts', sortable: true, cell: (r) => date(r.start_date) },
    { key: 'end_date', header: 'Ends', cell: (r) => date(r.end_date) },
    { key: 'weightage_percent', header: 'Weight', align: 'right', cell: (r) => `${r.weightage_percent ?? 100}%` },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'name', label: 'Exam name', required: true, full: true, placeholder: 'Half Yearly 2026' },
    { name: 'type', label: 'Type', type: 'select', defaultValue: 'unit_test', options: opts(['unit_test', 'midterm', 'final', 'practical', 'assignment', 'internal', 'board']) },
    { name: 'academic_year_id', label: 'Academic year', type: 'remote-select', optionsFrom: '/academic-years' },
    { name: 'start_date', label: 'Start date', type: 'date' },
    { name: 'end_date', label: 'End date', type: 'date' },
    { name: 'weightage_percent', label: 'Weightage (%)', type: 'number', defaultValue: 100 },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'scheduled', options: opts(['scheduled', 'ongoing', 'marks_entry', 'completed', 'published']) },
    { name: 'instructions', label: 'Instructions', type: 'textarea' },
  ],
}

/* ── HR ────────────────────────────────────────────────────────────────── */
export const LEAVE_REQUESTS: ResourceDef = {
  path: '/leave-types',
  module: 'leaves',
  title: 'Leave Types',
  singular: 'Leave type',
  plural: 'Leave types',
  icon: 'calendar-off',
  defaultSort: 'name',
  columns: [
    { key: 'name', header: 'Leave type', sortable: true, cell: (r) => strong(r.name) },
    { key: 'code', header: 'Code', cell: (r) => <span className="tabular">{r.code}</span> },
    { key: 'annual_quota', header: 'Quota', align: 'right', cell: (r) => `${r.annual_quota ?? 0} days` },
    {
      key: 'is_paid',
      header: 'Paid',
      align: 'center',
      cell: (r) => (r.is_paid ? <Badge tone="success">Paid</Badge> : <Badge tone="neutral">Unpaid</Badge>),
    },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'Casual Leave' },
    { name: 'code', label: 'Code', required: true, placeholder: 'CL' },
    { name: 'annual_quota', label: 'Annual quota (days)', type: 'number', defaultValue: 12 },
    { name: 'applies_to', label: 'Applies to', type: 'select', defaultValue: 'all', options: opts(['all', 'teaching', 'non_teaching']) },
    { name: 'is_paid', label: 'Paid leave', type: 'checkbox', defaultValue: true },
    { name: 'carry_forward', label: 'Can carry forward', type: 'checkbox' },
    { name: 'requires_document', label: 'Requires a document', type: 'checkbox' },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
}

export const EXPENSES: ResourceDef = {
  path: '/expenses',
  module: 'expenses',
  title: 'Expenses',
  singular: 'Expense',
  plural: 'Expenses',
  icon: 'trending-down',
  defaultSort: 'spent_on',
  defaultSortDir: 'desc',
  filters: [
    { name: 'status', label: 'Status', options: opts(['pending', 'approved', 'rejected', 'paid']) },
    { name: 'category', label: 'Category', options: opts(['general', 'salary', 'utilities', 'maintenance', 'supplies', 'events']) },
  ],
  columns: [
    { key: 'title', header: 'Expense', sortable: true, cell: (r) => strong(r.title) },
    { key: 'category', header: 'Category', cell: (r) => <Badge tone="neutral">{titleCase(r.category ?? '')}</Badge> },
    { key: 'vendor', header: 'Vendor', cell: (r) => r.vendor || '—' },
    { key: 'spent_on', header: 'Date', sortable: true, cell: (r) => date(r.spent_on) },
    { key: 'amount', header: 'Amount', align: 'right', cell: (r) => strong(money(r.amount)) },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', required: true, full: true },
    { name: 'category', label: 'Category', type: 'select', defaultValue: 'general', options: opts(['general', 'salary', 'utilities', 'maintenance', 'supplies', 'events']) },
    { name: 'amount', label: 'Amount', type: 'number', required: true },
    { name: 'tax', label: 'Tax', type: 'number' },
    { name: 'vendor', label: 'Vendor' },
    { name: 'invoice_number', label: 'Invoice number' },
    { name: 'spent_on', label: 'Spent on', type: 'date' },
    { name: 'paid_via', label: 'Paid via', type: 'select', defaultValue: 'bank_transfer', options: opts(['cash', 'card', 'upi', 'net_banking', 'cheque', 'bank_transfer']) },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'pending', options: opts(['pending', 'approved', 'rejected', 'paid']) },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

export const COMPLAINTS: ResourceDef = {
  path: '/complaints',
  module: 'complaints',
  title: 'Helpdesk',
  singular: 'Ticket',
  plural: 'Tickets',
  icon: 'life-buoy',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  filters: [
    { name: 'status', label: 'Status', options: opts(['open', 'in_progress', 'resolved', 'closed', 'reopened']) },
    { name: 'priority', label: 'Priority', options: opts(['low', 'normal', 'high', 'urgent']) },
  ],
  columns: [
    { key: 'title', header: 'Subject', sortable: true, cell: (r) => strong(r.title) },
    { key: 'category', header: 'Category', cell: (r) => <Badge tone="neutral">{titleCase(r.category ?? '')}</Badge> },
    { key: 'raised_by_name', header: 'Raised by', cell: (r) => r.raised_by_name || '—' },
    { key: 'created_at', header: 'Opened', cell: (r) => date(r.created_at) },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Subject', required: true, full: true },
    { name: 'category', label: 'Category', type: 'select', defaultValue: 'general', options: opts(['general', 'academic', 'facility', 'transport', 'fee', 'discipline']) },
    { name: 'priority', label: 'Priority', type: 'select', defaultValue: 'normal', options: opts(['low', 'normal', 'high', 'urgent']) },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'open', options: opts(['open', 'in_progress', 'resolved', 'closed', 'reopened']) },
    { name: 'raised_by_name', label: 'Raised by' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

export const CERTIFICATES: ResourceDef = {
  path: '/certificates',
  module: 'certificates',
  title: 'Certificates',
  singular: 'Certificate',
  plural: 'Certificates',
  icon: 'id-card',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  filters: [
    { name: 'type', label: 'Type', options: opts(['bonafide', 'transfer', 'character', 'completion', 'id_card']) },
    { name: 'status', label: 'Status', options: opts(['draft', 'issued', 'revoked']) },
  ],
  columns: [
    { key: 'title', header: 'Certificate', sortable: true, cell: (r) => strong(r.title || titleCase(r.type ?? '')) },
    { key: 'serial_number', header: 'Serial', cell: (r) => <span className="tabular">{r.serial_number || '—'}</span> },
    { key: 'type', header: 'Type', cell: (r) => <Badge tone="neutral">{titleCase(r.type ?? '')}</Badge> },
    { key: 'issued_on', header: 'Issued', cell: (r) => date(r.issued_on) },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'title', label: 'Title', full: true, placeholder: 'Bonafide Certificate' },
    { name: 'type', label: 'Type', type: 'select', defaultValue: 'bonafide', options: opts(['bonafide', 'transfer', 'character', 'completion', 'id_card']) },
    { name: 'student_id', label: 'Student', type: 'remote-select', optionsFrom: '/students', optionLabel: (s) => `${s.full_name} (${s.admission_number})` },
    { name: 'issued_on', label: 'Issued on', type: 'date' },
    { name: 'valid_till', label: 'Valid till', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'issued', options: opts(['draft', 'issued', 'revoked']) },
    { name: 'content', label: 'Body text', type: 'textarea' },
  ],
}

export const DOCUMENTS: ResourceDef = {
  path: '/documents',
  module: 'documents',
  title: 'Documents',
  singular: 'Document',
  plural: 'Documents',
  icon: 'folder',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  filters: [
    { name: 'category', label: 'Category', options: opts(['general', 'admission', 'certificate', 'id_proof', 'report', 'policy']) },
  ],
  columns: [
    { key: 'name', header: 'Document', sortable: true, cell: (r) => strong(r.name) },
    { key: 'category', header: 'Category', cell: (r) => <Badge tone="neutral">{titleCase(r.category ?? '')}</Badge> },
    { key: 'owner_type', header: 'Belongs to', cell: (r) => titleCase(r.owner_type ?? '') },
    { key: 'created_at', header: 'Uploaded', cell: (r) => date(r.created_at) },
    {
      key: 'file',
      header: '',
      align: 'right',
      cell: (r) =>
        r.file?.url ? (
          <a
            href={r.file.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
          >
            Open
          </a>
        ) : null,
    },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, full: true },
    { name: 'category', label: 'Category', type: 'select', defaultValue: 'general', options: opts(['general', 'admission', 'certificate', 'id_proof', 'report', 'policy']) },
    { name: 'owner_type', label: 'Belongs to', type: 'select', defaultValue: 'institution', options: opts(['institution', 'student', 'staff', 'guardian', 'class']) },
    { name: 'is_private', label: 'Private', type: 'checkbox', defaultValue: true },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}

/* ── Facilities ────────────────────────────────────────────────────────── */
export const TRANSPORT_ROUTES: ResourceDef = {
  path: '/transport/routes',
  module: 'transport',
  title: 'Transport',
  singular: 'Route',
  plural: 'Routes',
  icon: 'bus',
  defaultSort: 'name',
  columns: [
    { key: 'name', header: 'Route', sortable: true, cell: (r) => strong(r.name) },
    { key: 'code', header: 'Code', cell: (r) => <span className="tabular">{r.code}</span> },
    { key: 'start_point', header: 'From', cell: (r) => r.start_point || '—' },
    { key: 'end_point', header: 'To', cell: (r) => r.end_point || '—' },
    { key: 'monthly_fare', header: 'Fare', align: 'right', cell: (r) => money(r.monthly_fare) },
    { key: 'allocated_count', header: 'Students', align: 'right', cell: (r) => r.allocated_count ?? 0 },
  ],
  fields: [
    { name: 'name', label: 'Route name', required: true },
    { name: 'code', label: 'Code', required: true },
    { name: 'start_point', label: 'Start point' },
    { name: 'end_point', label: 'End point' },
    { name: 'distance_km', label: 'Distance (km)', type: 'number' },
    { name: 'monthly_fare', label: 'Monthly fare', type: 'number' },
    { name: 'vehicle_id', label: 'Vehicle', type: 'remote-select', optionsFrom: '/transport/vehicles', optionLabel: (v) => v.registration_number },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
}

export const HOSTELS: ResourceDef = {
  path: '/hostel/blocks',
  module: 'hostel',
  title: 'Hostel',
  singular: 'Hostel',
  plural: 'Hostels',
  icon: 'bed-double',
  defaultSort: 'name',
  columns: [
    { key: 'name', header: 'Hostel', sortable: true, cell: (r) => strong(r.name) },
    { key: 'type', header: 'Type', cell: (r) => <Badge tone="neutral">{titleCase(r.type ?? '')}</Badge> },
    { key: 'total_rooms', header: 'Rooms', align: 'right' },
    {
      key: 'occupied',
      header: 'Occupancy',
      align: 'right',
      cell: (r) => `${r.occupied ?? 0} / ${r.total_capacity ?? 0}`,
    },
    { key: 'monthly_fee', header: 'Fee', align: 'right', cell: (r) => money(r.monthly_fee) },
  ],
  fields: [
    { name: 'name', label: 'Hostel name', required: true },
    { name: 'type', label: 'Type', type: 'select', defaultValue: 'boys', options: opts(['boys', 'girls', 'mixed']) },
    { name: 'warden_staff_id', label: 'Warden', type: 'remote-select', optionsFrom: '/staff', optionLabel: (s) => s.full_name },
    { name: 'total_rooms', label: 'Total rooms', type: 'number' },
    { name: 'total_capacity', label: 'Total capacity', type: 'number' },
    { name: 'monthly_fee', label: 'Monthly fee', type: 'number' },
    { name: 'is_active', label: 'Active', type: 'checkbox', defaultValue: true },
    { name: 'address', label: 'Address', type: 'textarea' },
  ],
}

export const INVENTORY: ResourceDef = {
  path: '/inventory/items',
  module: 'inventory',
  title: 'Inventory',
  singular: 'Item',
  plural: 'Items',
  icon: 'package',
  defaultSort: 'name',
  filters: [{ name: 'category', label: 'Category', options: opts(['general', 'furniture', 'electronics', 'stationery', 'lab', 'sports']) }],
  columns: [
    { key: 'name', header: 'Item', sortable: true, cell: (r) => strong(r.name) },
    { key: 'sku', header: 'SKU', cell: (r) => <span className="tabular">{r.sku}</span> },
    { key: 'category', header: 'Category', cell: (r) => <Badge tone="neutral">{titleCase(r.category ?? '')}</Badge> },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      cell: (r) => (
        <span className={r.reorder_level && r.quantity <= r.reorder_level ? 'font-bold text-danger' : ''}>
          {r.quantity}
        </span>
      ),
    },
    { key: 'location', header: 'Location', cell: (r) => r.location || '—' },
  ],
  fields: [
    { name: 'name', label: 'Item name', required: true },
    { name: 'sku', label: 'SKU', required: true },
    { name: 'category', label: 'Category', type: 'select', defaultValue: 'general', options: opts(['general', 'furniture', 'electronics', 'stationery', 'lab', 'sports']) },
    { name: 'unit', label: 'Unit', defaultValue: 'piece' },
    { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: 0 },
    { name: 'reorder_level', label: 'Reorder level', type: 'number' },
    { name: 'unit_cost', label: 'Unit cost', type: 'number' },
    { name: 'location', label: 'Location' },
    { name: 'supplier', label: 'Supplier' },
    { name: 'is_asset', label: 'Fixed asset', type: 'checkbox' },
  ],
}

export const VISITORS: ResourceDef = {
  path: '/visitors',
  module: 'visitors',
  title: 'Visitors',
  singular: 'Visitor',
  plural: 'Visitors',
  icon: 'door-open',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  filters: [{ name: 'status', label: 'Status', options: opts(['in', 'out']) }],
  columns: [
    { key: 'full_name', header: 'Visitor', sortable: true, cell: (r) => strong(r.full_name) },
    { key: 'phone', header: 'Phone', cell: (r) => <span className="tabular">{r.phone || '—'}</span> },
    { key: 'purpose', header: 'Purpose', cell: (r) => r.purpose || '—' },
    { key: 'pass_number', header: 'Pass', cell: (r) => r.pass_number || '—' },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      cell: (r) => <Badge tone={r.status === 'in' ? 'success' : 'neutral'}>{r.status === 'in' ? 'Inside' : 'Left'}</Badge>,
    },
  ],
  fields: [
    { name: 'full_name', label: 'Visitor name', required: true },
    { name: 'phone', label: 'Phone', type: 'tel' },
    { name: 'purpose', label: 'Purpose', full: true },
    { name: 'visiting_type', label: 'Visiting', type: 'select', defaultValue: 'staff', options: opts(['staff', 'student', 'office']) },
    { name: 'persons', label: 'Number of people', type: 'number', defaultValue: 1 },
    { name: 'id_proof_number', label: 'ID proof number' },
    { name: 'vehicle_number', label: 'Vehicle number' },
    { name: 'pass_number', label: 'Pass number' },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'in', options: opts(['in', 'out']) },
    { name: 'remarks', label: 'Remarks', type: 'textarea' },
  ],
}

/* ── Additional registry-backed screens ────────────────────────────────── */
export const ALUMNI: ResourceDef = {
  path: '/alumni',
  module: 'alumni',
  title: 'Alumni',
  singular: 'Alumnus',
  plural: 'Alumni',
  icon: 'award',
  defaultSort: 'batch_year',
  defaultSortDir: 'desc',
  searchPlaceholder: 'Search name, organisation or program',
  columns: [
    { key: 'full_name', header: 'Name', sortable: true, cell: (r) => strong(r.full_name) },
    { key: 'batch_year', header: 'Batch', align: 'center', sortable: true, cell: (r) => r.batch_year ?? '—' },
    { key: 'program_name', header: 'Program', cell: (r) => r.program_name || '—' },
    { key: 'current_organization', header: 'Now at', cell: (r) => r.current_organization || '—' },
    { key: 'city', header: 'City', cell: (r) => r.city || '—' },
    {
      key: 'is_mentor',
      header: 'Mentor',
      align: 'center',
      cell: (r) => (r.is_mentor ? <Badge tone="success">Mentor</Badge> : '—'),
    },
  ],
  fields: [
    { name: 'full_name', label: 'Full name', required: true },
    { name: 'batch_year', label: 'Batch year', type: 'number' },
    { name: 'program_name', label: 'Program' },
    { name: 'current_organization', label: 'Current organisation' },
    { name: 'current_designation', label: 'Designation' },
    { name: 'city', label: 'City' },
    { name: 'contact.email', label: 'Email', type: 'email' },
    { name: 'contact.phone', label: 'Phone', type: 'tel' },
    { name: 'linkedin', label: 'LinkedIn' },
    { name: 'is_mentor', label: 'Available to mentor students', type: 'checkbox' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

export const SCHOLARSHIPS: ResourceDef = {
  path: '/discounts',
  module: 'scholarships',
  title: 'Scholarships & Discounts',
  singular: 'Concession',
  plural: 'Concessions',
  icon: 'badge-percent',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  filters: [{ name: 'status', label: 'Status', options: opts(['draft', 'active', 'expired', 'revoked']) }],
  columns: [
    { key: 'name', header: 'Concession', sortable: true, cell: (r) => strong(r.name) },
    { key: 'code', header: 'Code', cell: (r) => <span className="tabular">{r.code}</span> },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      cell: (r) => (r.type === 'percentage' ? `${r.value}%` : money(r.value)),
    },
    { key: 'reason', header: 'Reason', cell: (r) => r.reason || '—' },
    { key: 'valid_till', header: 'Valid till', cell: (r) => date(r.valid_till) },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'Sibling concession' },
    { name: 'code', label: 'Code', required: true, placeholder: 'SIB10' },
    { name: 'type', label: 'Type', type: 'select', defaultValue: 'percentage', options: opts(['percentage', 'fixed']) },
    { name: 'value', label: 'Value', type: 'number', required: true },
    { name: 'student_id', label: 'Student', type: 'remote-select', optionsFrom: '/students', optionLabel: (s) => `${s.full_name} (${s.admission_number})`, hint: 'Leave blank for a class-wide concession' },
    { name: 'reason', label: 'Reason', placeholder: 'Sibling / Staff ward / Merit / RTE' },
    { name: 'valid_from', label: 'Valid from', type: 'date' },
    { name: 'valid_till', label: 'Valid till', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'active', options: opts(['draft', 'active', 'expired', 'revoked']) },
  ],
}

export const PAYROLL: ResourceDef = {
  path: '/payroll/runs',
  module: 'payroll',
  title: 'Payroll',
  singular: 'Payroll run',
  plural: 'Payroll runs',
  icon: 'banknote',
  defaultSort: 'period',
  defaultSortDir: 'desc',
  filters: [{ name: 'status', label: 'Status', options: opts(['draft', 'processing', 'approved', 'paid', 'cancelled']) }],
  columns: [
    { key: 'period', header: 'Period', sortable: true, cell: (r) => strong(r.period) },
    { key: 'staff_count', header: 'Staff', align: 'right', cell: (r) => r.staff_count ?? 0 },
    { key: 'gross_total', header: 'Gross', align: 'right', cell: (r) => money(r.gross_total) },
    { key: 'deduction_total', header: 'Deductions', align: 'right', cell: (r) => money(r.deduction_total) },
    { key: 'net_total', header: 'Net', align: 'right', cell: (r) => strong(money(r.net_total)) },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'period', label: 'Period', required: true, placeholder: '2026-09' },
    { name: 'month', label: 'Month', type: 'number', defaultValue: new Date().getMonth() + 1 },
    { name: 'year', label: 'Year', type: 'number', defaultValue: new Date().getFullYear() },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: opts(['draft', 'processing', 'approved', 'paid', 'cancelled']) },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

export const STAFF_ATTENDANCE: ResourceDef = {
  path: '/staff-attendance',
  module: 'staff_attendance',
  title: 'Staff Attendance',
  singular: 'Record',
  plural: 'Records',
  icon: 'fingerprint',
  defaultSort: 'date',
  defaultSortDir: 'desc',
  searchable: false,
  filters: [{ name: 'status', label: 'Status', options: opts(['present', 'absent', 'late', 'half_day', 'leave', 'wfh']) }],
  columns: [
    { key: 'date', header: 'Date', sortable: true, cell: (r) => date(r.date) },
    { key: 'in_time', header: 'In', cell: (r) => r.in_time || '—' },
    { key: 'out_time', header: 'Out', cell: (r) => r.out_time || '—' },
    { key: 'worked_hours', header: 'Hours', align: 'right', cell: (r) => r.worked_hours || '—' },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'staff_id', label: 'Staff member', type: 'remote-select', optionsFrom: '/staff', optionLabel: (s) => s.full_name, required: true },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'present', options: opts(['present', 'absent', 'late', 'half_day', 'leave', 'holiday', 'wfh']) },
    { name: 'in_time', label: 'In time', type: 'time' },
    { name: 'out_time', label: 'Out time', type: 'time' },
    { name: 'worked_hours', label: 'Worked hours', type: 'number' },
    { name: 'remark', label: 'Remark', type: 'textarea' },
  ],
}

export const APPRAISALS: ResourceDef = {
  path: '/appraisals',
  module: 'appraisals',
  title: 'Appraisals',
  singular: 'Appraisal',
  plural: 'Appraisals',
  icon: 'chart-line',
  defaultSort: 'created_at',
  defaultSortDir: 'desc',
  searchable: false,
  filters: [{ name: 'status', label: 'Status', options: opts(['draft', 'submitted', 'reviewed', 'acknowledged']) }],
  columns: [
    { key: 'period', header: 'Period', sortable: true, cell: (r) => strong(r.period) },
    { key: 'overall_rating', header: 'Rating', cell: (r) => r.overall_rating || '—' },
    { key: 'overall_score', header: 'Score', align: 'right', cell: (r) => r.overall_score ?? '—' },
    { key: 'status', header: 'Status', align: 'center', cell: (r) => <Badge status={r.status} /> },
  ],
  fields: [
    { name: 'staff_id', label: 'Staff member', type: 'remote-select', optionsFrom: '/staff', optionLabel: (s) => s.full_name, required: true },
    { name: 'period', label: 'Period', placeholder: '2026-27', required: true },
    { name: 'reviewer_id', label: 'Reviewer', type: 'remote-select', optionsFrom: '/staff', optionLabel: (s) => s.full_name },
    { name: 'overall_score', label: 'Overall score', type: 'number' },
    { name: 'overall_rating', label: 'Overall rating', placeholder: 'Exceeds expectations' },
    { name: 'status', label: 'Status', type: 'select', defaultValue: 'draft', options: opts(['draft', 'submitted', 'reviewed', 'acknowledged']) },
    { name: 'strengths', label: 'Strengths', type: 'textarea' },
    { name: 'improvements', label: 'Areas to improve', type: 'textarea' },
  ],
}
