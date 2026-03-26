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
