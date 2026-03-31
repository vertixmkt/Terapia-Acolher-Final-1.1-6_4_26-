// ─── Core Data Types ────────────────────────────────────────────────────────

export type Gender = 'M' | 'F' | 'NB'
export type Shift = 'manha' | 'tarde' | 'noite' | 'flexivel'
export type TherapistStatus = 'ativo' | 'inativo' | 'pendente'
export type AssignmentStatus = 'pendente' | 'confirmado' | 'cancelado'
export type MatchMode = 'auto' | 'semi' | 'manual' | 'pausado'

export interface Therapist {
  id: number
  name: string
  email: string
  phone: string
  whatsapp: string
  gender: Gender
  approach: string
  specialties: string[]
  serves_gender: Gender | 'todos'
  shifts: Shift[]
  status: TherapistStatus
  balance: number
  total_assignments: number
  last_assigned_at: string | null
  manychat_subscriber_id: string | null
  has_formation: boolean
  created_at: string
}

export interface Patient {
  id: number
  name: string
  phone: string
  gender: Gender
  preferred_gender: Gender | 'indifferent'
  shift: Shift
  reason: string
  manychat_subscriber_id: string | null
  assigned_therapist_id: number | null
  assigned_at: string | null
  created_at: string
}

export interface Assignment {
  id: number
  patient_id: number
  therapist_id: number
  patient_name: string
  therapist_name: string
  status: AssignmentStatus
  compatibility_score: number
  assigned_at: string
  notified_patient: boolean
  notified_therapist: boolean
}

export interface KiwifyPurchase {
  id: number
  therapist_id: number | null
  therapist_name: string
  product_name: string
  leads_qty: number
  amount: number
  status: 'completed' | 'pending' | 'refunded'
  created_at: string
}

export interface DashboardStats {
  total_patients: number
  total_therapists_active: number
  total_assignments: number
  patients_without_therapist: number
  therapists_low_balance: number
  today_assignments: number
  today_new_patients: number
  match_mode: MatchMode
}

export interface MatchingDecision {
  id: number
  patient_id: number
  patient_name: string
  therapist_id: number
  therapist_name: string
  score: number
  reason: string
  decided_at: string
}

export interface WebhookManychatReceived {
  id: number
  type: string
  contact_name: string
  contact_phone: string
  contact_email: string | null
  gender: string | null
  shift: string | null
  reason: string | null
  subscriber_id: string | null
  processing_status: 'pending' | 'processed' | 'error'
  patient_id: number | null
  created_at: string
}

export interface WebhookManychatSent {
  id: number
  type: string
  recipient_name: string
  recipient_whatsapp: string | null
  recipient_subscriber_id: string | null
  assignment_id: number | null
  status: 'success' | 'error' | 'skipped'
  error_message: string | null
  created_at: string
}

export interface WebhookKiwify {
  id: number
  order_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  product_name: string
  offer_name: string
  leads_qty: number
  amount: number
  order_status: string
  processing_status: 'pending' | 'processed' | 'error'
  therapist_id: number | null
  created_at: string
}

export interface ManychatConfig {
  id?: number
  api_key: string
  flow_ns_notify_therapist: string
  flow_ns_notify_patient: string
  tag_id_new_patient: number
  tag_id_therapist_assigned: number
  cf_id_patient_name: number
  cf_id_patient_whatsapp: number
  cf_id_patient_shift: number
  cf_id_patient_reason: number
  cf_id_patient_assigned: number
  cf_id_therapist_name: number
  cf_id_therapist_whatsapp: number
  cf_id_therapist_assigned: number
  active: boolean
}
