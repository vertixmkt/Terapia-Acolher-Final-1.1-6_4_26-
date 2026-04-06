import {
  mysqlTable, int, varchar, text, timestamp,
  mysqlEnum, boolean, json, float,
} from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

// ─── Terapeutas ───────────────────────────────────────────────────────────────

export const therapists = mysqlTable('therapists', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 320 }),
  phone: varchar('phone', { length: 20 }),
  whatsapp: varchar('whatsapp', { length: 20 }).notNull(),
  password_hash: varchar('password_hash', { length: 255 }),
  gender: mysqlEnum('gender', ['M', 'F', 'NB']).notNull(),
  approach: varchar('approach', { length: 255 }).notNull(),
  specialties: json('specialties').$type<string[]>().default([]),
  // Público atendido
  serves_gender: mysqlEnum('serves_gender', ['M', 'F', 'NB', 'todos']).default('todos'),
  serves_children: boolean('serves_children').default(false),
  serves_teens: boolean('serves_teens').default(false),
  serves_elderly: boolean('serves_elderly').default(false),
  serves_lgbt: boolean('serves_lgbt').default(false),
  serves_couples: boolean('serves_couples').default(false),
  // Turnos
  shifts: json('shifts').$type<string[]>().default(['manha']),
  // Status
  status: mysqlEnum('status', ['ativo', 'inativo', 'pendente']).default('pendente'),
  // Saldo de leads
  balance: int('balance').default(0),
  total_assignments: int('total_assignments').default(0),
  last_assigned_at: timestamp('last_assigned_at'),
  // ManyChat — subscriber_id para envio de notificações
  manychat_subscriber_id: varchar('manychat_subscriber_id', { length: 255 }),
  // Formação Rodrigo — tiebreaker no matching
  has_formation: boolean('has_formation').default(false),
  // P3: reposições de lead
  replenishments_used: int('replenishments_used').default(0),
  replenishments_max: int('replenishments_max').default(3),
  // Timestamps
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// ─── Pacientes ────────────────────────────────────────────────────────────────

export const patients = mysqlTable('patients', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  gender: mysqlEnum('gender', ['M', 'F', 'NB']).notNull(),
  preferred_gender: mysqlEnum('preferred_gender', ['M', 'F', 'NB', 'indifferent']).default('indifferent'),
  shift: mysqlEnum('shift', ['manha', 'tarde', 'noite', 'flexivel']).default('flexivel'),
  reason: text('reason'),
  // Tipo de atendimento (normal, casal, infantil, outra_pessoa)
  therapy_for: mysqlEnum('therapy_for', ['normal', 'casal', 'infantil', 'outra_pessoa']).default('normal'),
  // Dados de infantil / terceiros
  child_name: varchar('child_name', { length: 255 }),
  child_age: int('child_age'),
  relative_name: varchar('relative_name', { length: 255 }),
  relative_phone: varchar('relative_phone', { length: 20 }),
  // Quando prefere ser contactado
  contact_when: varchar('contact_when', { length: 100 }),
  // ManyChat
  manychat_subscriber_id: varchar('manychat_subscriber_id', { length: 255 }),
  // Atribuição
  assigned_therapist_id: int('assigned_therapist_id'),
  assigned_at: timestamp('assigned_at'),
  status: mysqlEnum('status', ['pendente', 'atribuido', 'arquivado']).default('pendente'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// ─── Atribuições ─────────────────────────────────────────────────────────────

export const assignments = mysqlTable('assignments', {
  id: int('id').primaryKey().autoincrement(),
  patient_id: int('patient_id').notNull(),
  therapist_id: int('therapist_id').notNull(),
  status: mysqlEnum('status', ['pendente', 'confirmado', 'cancelado']).default('pendente'),
  compatibility_score: float('compatibility_score').default(0),
  match_reason: text('match_reason'),
  notified_patient: boolean('notified_patient').default(false),
  notified_therapist: boolean('notified_therapist').default(false),
  assigned_at: timestamp('assigned_at').defaultNow(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// ─── Matching Config ──────────────────────────────────────────────────────────

export const matchingConfig = mysqlTable('matching_config', {
  id: int('id').primaryKey().autoincrement(),
  mode: mysqlEnum('mode', ['auto', 'semi', 'manual', 'pausado']).default('auto'),
  weight_gender: int('weight_gender').default(100),
  weight_shift: int('weight_shift').default(80),
  weight_specialty: int('weight_specialty').default(70),
  weight_approach: int('weight_approach').default(60),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// ─── Matching Log ─────────────────────────────────────────────────────────────

export const matchingLog = mysqlTable('matching_log', {
  id: int('id').primaryKey().autoincrement(),
  patient_id: int('patient_id').notNull(),
  therapist_id: int('therapist_id'),
  patient_name: varchar('patient_name', { length: 255 }),
  therapist_name: varchar('therapist_name', { length: 255 }),
  score: float('score').default(0),
  reason: text('reason'),
  success: boolean('success').default(false),
  error: text('error'),
  decided_at: timestamp('decided_at').defaultNow(),
})

// ─── ManyChat Config (gerenciado via UI, não .env) ────────────────────────────

export const manychatConfig = mysqlTable('manychat_config', {
  id: int('id').primaryKey().autoincrement(),
  api_key: varchar('api_key', { length: 500 }),
  // Namespaces dos flows
  flow_ns_notify_therapist: varchar('flow_ns_notify_therapist', { length: 255 }).default('content20260219182249_152653'),
  flow_ns_notify_patient: varchar('flow_ns_notify_patient', { length: 255 }).default('content20260219182249_152654'),
  // IDs das tags
  tag_id_new_patient: int('tag_id_new_patient').default(81766426),   // Tag aplicada ao terapeuta
  tag_id_therapist_assigned: int('tag_id_therapist_assigned').default(81766427), // Tag aplicada ao paciente
  // IDs dos custom fields — terapeuta
  cf_id_patient_name: int('cf_id_patient_name').default(14362950),
  cf_id_patient_whatsapp: int('cf_id_patient_whatsapp').default(14362951),
  cf_id_patient_shift: int('cf_id_patient_shift').default(14362952),
  cf_id_patient_reason: int('cf_id_patient_reason').default(14362953),
  cf_id_patient_assigned: int('cf_id_patient_assigned').default(14300039),
  // IDs dos custom fields — paciente
  cf_id_therapist_name: int('cf_id_therapist_name').default(14045578),
  cf_id_therapist_whatsapp: int('cf_id_therapist_whatsapp').default(14045579),
  cf_id_therapist_assigned: int('cf_id_therapist_assigned').default(14061515),
  // Controle
  active: boolean('active').default(true),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// ─── ManyChat Subscribers (WhatsApp → Subscriber ID) ─────────────────────────

export const manychatSubscribers = mysqlTable('manychat_subscribers', {
  id: int('id').primaryKey().autoincrement(),
  whatsapp: varchar('whatsapp', { length: 20 }).notNull(),
  subscriber_id: varchar('subscriber_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  // Vinculação
  therapist_id: int('therapist_id'),
  patient_id: int('patient_id'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow().onUpdateNow(),
})

// ─── Webhooks Kiwify (P6) ─────────────────────────────────────────────────────

export const webhooksKiwify = mysqlTable('webhooks_kiwify', {
  id: int('id').primaryKey().autoincrement(),
  order_id: varchar('order_id', { length: 255 }).notNull().unique(),
  order_ref: varchar('order_ref', { length: 100 }),
  customer_name: varchar('customer_name', { length: 255 }),
  customer_email: varchar('customer_email', { length: 320 }),
  customer_phone: varchar('customer_phone', { length: 20 }),
  product_name: varchar('product_name', { length: 255 }),
  offer_name: varchar('offer_name', { length: 255 }),
  plan_name: varchar('plan_name', { length: 255 }),
  leads_qty: int('leads_qty').default(0),
  amount: int('amount').default(0),
  order_status: varchar('order_status', { length: 50 }),
  processing_status: mysqlEnum('processing_status', ['pending', 'processed', 'error']).default('pending'),
  therapist_id: int('therapist_id'),
  raw_payload: json('raw_payload'),
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow(),
  processed_at: timestamp('processed_at'),
})

// ─── Webhooks ManyChat Recebidos (P4) ─────────────────────────────────────────

export const webhooksManychatReceived = mysqlTable('webhooks_manychat_received', {
  id: int('id').primaryKey().autoincrement(),
  type: mysqlEnum('type', ['patient_new', 'patient_update', 'therapist_update', 'other']).default('other'),
  contact_name: varchar('contact_name', { length: 255 }),
  contact_phone: varchar('contact_phone', { length: 20 }),
  contact_email: varchar('contact_email', { length: 320 }),
  manychat_subscriber_id: varchar('manychat_subscriber_id', { length: 255 }),
  gender: varchar('gender', { length: 10 }),
  preferred_gender: varchar('preferred_gender', { length: 20 }),
  shift: varchar('shift', { length: 20 }),
  reason: text('reason'),
  therapy_for: varchar('therapy_for', { length: 30 }),
  processing_status: mysqlEnum('processing_status', ['pending', 'processed', 'error']).default('pending'),
  patient_id: int('patient_id'),
  raw_payload: json('raw_payload'),
  error_message: text('error_message'),
  created_at: timestamp('created_at').defaultNow(),
  processed_at: timestamp('processed_at'),
})

// ─── Webhooks ManyChat Enviados (P5) ──────────────────────────────────────────

export const webhooksManychatSent = mysqlTable('webhooks_manychat_sent', {
  id: int('id').primaryKey().autoincrement(),
  type: mysqlEnum('type', ['notify_patient', 'notify_therapist', 'set_custom_field', 'add_tag', 'other']).default('other'),
  recipient_name: varchar('recipient_name', { length: 255 }),
  recipient_subscriber_id: varchar('recipient_subscriber_id', { length: 255 }),
  assignment_id: int('assignment_id'),
  patient_id: int('patient_id'),
  therapist_id: int('therapist_id'),
  status: mysqlEnum('status', ['success', 'error', 'skipped']).default('success'),
  payload_sent: json('payload_sent'),
  response_received: json('response_received'),
  error_message: text('error_message'),
  sent_at: timestamp('sent_at').defaultNow(),
})

// ─── Lead Replenishment Requests (P3) ────────────────────────────────────────

export const leadReplenishments = mysqlTable('lead_replenishments', {
  id: int('id').primaryKey().autoincrement(),
  therapist_id: int('therapist_id').notNull(),
  assignment_id: int('assignment_id').notNull(),
  reason: text('reason'),
  contacted_0h: boolean('contacted_0h').default(false),
  contacted_24h: boolean('contacted_24h').default(false),
  contacted_72h: boolean('contacted_72h').default(false),
  contacted_15d: boolean('contacted_15d').default(false),
  status: mysqlEnum('status', ['pending', 'approved', 'rejected']).default('pending'),
  admin_notes: text('admin_notes'),
  created_at: timestamp('created_at').defaultNow(),
  resolved_at: timestamp('resolved_at'),
})

// ─── Password Reset Tokens ───────────────────────────────────────────────────

export const passwordResetTokens = mysqlTable('password_reset_tokens', {
  id: int('id').primaryKey().autoincrement(),
  therapist_id: int('therapist_id').notNull(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  expires_at: timestamp('expires_at').notNull(),
  used: boolean('used').default(false),
  created_at: timestamp('created_at').defaultNow(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const therapistsRelations = relations(therapists, ({ many }) => ({
  assignments: many(assignments),
  kiwifyWebhooks: many(webhooksKiwify),
  replenishments: many(leadReplenishments),
  subscriber: many(manychatSubscribers),
}))

export const patientsRelations = relations(patients, ({ many, one }) => ({
  assignments: many(assignments),
  assignedTherapist: one(therapists, {
    fields: [patients.assigned_therapist_id],
    references: [therapists.id],
  }),
  subscriber: many(manychatSubscribers),
}))

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  patient: one(patients, { fields: [assignments.patient_id], references: [patients.id] }),
  therapist: one(therapists, { fields: [assignments.therapist_id], references: [therapists.id] }),
}))
