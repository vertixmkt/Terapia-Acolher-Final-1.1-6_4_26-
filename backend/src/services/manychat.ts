/**
 * Serviço ManyChat — replicando exatamente o fluxo do sistema original
 *
 * Fluxo de notificação após matching:
 * 1. setCustomField() × N (preencher campos antes do flow)
 * 2. Aguardar 2 segundos
 * 3. addTag() → dispara o flow automaticamente no ManyChat
 *
 * Toda chamada é registrada na tabela webhooks_manychat_sent (P5)
 */

import { getDb } from '../db/index.js'
import { manychatConfig, manychatSubscribers, webhooksManychatSent } from '../db/schema.js'
import { eq, or } from 'drizzle-orm'

const MANYCHAT_BASE_URL = 'https://api.manychat.com'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ManychatConfig {
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

// ─── Obter configuração do banco ──────────────────────────────────────────────

export async function getManychatConfig(): Promise<ManychatConfig | null> {
  const db = await getDb()
  const [config] = await db.select().from(manychatConfig).limit(1)

  if (!config || !config.api_key || !config.active) return null

  return config as ManychatConfig
}

// ─── Obter Subscriber ID ──────────────────────────────────────────────────────
// Prioridade: campo direto > tabela manychat_subscribers

export async function resolveSubscriberId(
  directId: string | null | undefined,
  whatsapp: string | null | undefined,
): Promise<string | null> {
  // 1. Usar ID direto se for um ID válido do ManyChat (> 1 milhão)
  if (directId && parseInt(directId) > 1_000_000) return directId
  if (directId && directId.trim() !== '') return directId

  // 2. Buscar na tabela de subscribers pelo WhatsApp
  if (whatsapp) {
    const db = await getDb()
    const clean = whatsapp.replace(/\D/g, '')
    const [sub] = await db
      .select()
      .from(manychatSubscribers)
      .where(eq(manychatSubscribers.whatsapp, clean))
      .limit(1)
    if (sub) return sub.subscriber_id
  }

  return null
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function callManychat(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${MANYCHAT_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json() as any

    if (!res.ok || data.status === 'error') {
      return { success: false, error: data.message || `HTTP ${res.status}` }
    }

    return { success: true, data }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Preencher custom field por ID
export async function setCustomFieldById(
  subscriberId: string,
  fieldId: number,
  value: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  return callManychat('/fb/subscriber/setCustomField', {
    subscriber_id: subscriberId,
    field_id: fieldId,
    field_value: value,
  }, apiKey)
}

// Adicionar tag (dispara flow automaticamente se configurado no ManyChat)
export async function addTag(
  subscriberId: string,
  tagId: number,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  return callManychat('/fb/subscriber/addTag', {
    subscriber_id: subscriberId,
    tag_id: tagId,
  }, apiKey)
}

// Disparar flow diretamente (alternativa à tag)
export async function sendFlow(
  subscriberId: string,
  flowNs: string,
  apiKey: string,
): Promise<{ success: boolean; error?: string }> {
  return callManychat('/fb/sending/sendFlow', {
    subscriber_id: subscriberId,
    flow_ns: flowNs,
  }, apiKey)
}

// ─── Notificação ao TERAPEUTA após matching ───────────────────────────────────
// Replica exatamente o fluxo do sistema original:
// 1. Preencher 5 custom fields com dados do paciente
// 2. Aguardar 2s
// 3. Aplicar tag NOVO PACIENTE → dispara flow no ManyChat

export async function notifyTherapist(params: {
  therapistSubscriberId: string
  therapistId: number
  patientId: number
  assignmentId: number
  patientName: string
  patientWhatsapp: string
  patientShift: string
  patientReason: string
}): Promise<void> {
  const config = await getManychatConfig()
  if (!config) {
    console.warn('[ManyChat] Config não encontrada ou inativa — notificação ao terapeuta ignorada')
    return
  }

  const sub = params.therapistSubscriberId
  const {
    cf_id_patient_name, cf_id_patient_whatsapp, cf_id_patient_shift,
    cf_id_patient_reason, cf_id_patient_assigned,
    tag_id_new_patient, api_key,
  } = config

  // 1. Preencher todos os custom fields em paralelo
  const fieldResults = await Promise.allSettled([
    setCustomFieldById(sub, cf_id_patient_name, params.patientName, api_key),
    setCustomFieldById(sub, cf_id_patient_whatsapp, params.patientWhatsapp, api_key),
    setCustomFieldById(sub, cf_id_patient_shift, params.patientShift, api_key),
    setCustomFieldById(sub, cf_id_patient_reason, params.patientReason || '', api_key),
    setCustomFieldById(sub, cf_id_patient_assigned, 'sim', api_key),
  ])

  await logSentBatch('notify_therapist', sub, 'Terapeuta', params.therapistId, params.assignmentId, fieldResults)

  // 2. Aguardar 2s para garantir que campos estão disponíveis no flow
  await delay(2000)

  // 3. Aplicar tag → dispara o flow no ManyChat automaticamente
  const tagResult = await addTag(sub, tag_id_new_patient, api_key)
  await logSent({
    type: 'add_tag',
    subscriberId: sub,
    recipientName: 'Terapeuta',
    therapistId: params.therapistId,
    assignmentId: params.assignmentId,
    payload: { tag_id: tag_id_new_patient },
    result: tagResult,
  })

  if (tagResult.success) {
    console.log(`[ManyChat] ✅ Terapeuta ${params.therapistId} notificado (paciente ${params.patientId})`)
  } else {
    console.error(`[ManyChat] ❌ Erro ao notificar terapeuta ${params.therapistId}:`, tagResult.error)
  }
}

// ─── Notificação ao PACIENTE após matching ────────────────────────────────────
// Replica exatamente o fluxo do sistema original:
// 1. Preencher custom fields com dados do terapeuta
// 2. Aguardar 2s
// 3. Aplicar tag TERAPEUTA ATRIBUÍDO → dispara flow

export async function notifyPatient(params: {
  patientSubscriberId: string
  patientId: number
  therapistId: number
  assignmentId: number
  therapistName: string
  therapistWhatsapp: string
}): Promise<void> {
  const config = await getManychatConfig()
  if (!config) {
    console.warn('[ManyChat] Config não encontrada ou inativa — notificação ao paciente ignorada')
    return
  }

  const sub = params.patientSubscriberId
  const {
    cf_id_therapist_name, cf_id_therapist_whatsapp, cf_id_therapist_assigned,
    cf_id_patient_assigned,
    tag_id_therapist_assigned, api_key,
  } = config

  // 1. Preencher custom fields em paralelo
  const fieldResults = await Promise.allSettled([
    setCustomFieldById(sub, cf_id_therapist_name, params.therapistName, api_key),
    setCustomFieldById(sub, cf_id_therapist_whatsapp, params.therapistWhatsapp, api_key),
    setCustomFieldById(sub, cf_id_therapist_assigned, 'sim', api_key),
    setCustomFieldById(sub, cf_id_patient_assigned, 'sim', api_key),
  ])

  await logSentBatch('notify_patient', sub, 'Paciente', params.therapistId, params.assignmentId, fieldResults)

  // 2. Aguardar 2s
  await delay(2000)

  // 3. Aplicar tag → dispara flow
  const tagResult = await addTag(sub, tag_id_therapist_assigned, api_key)
  await logSent({
    type: 'add_tag',
    subscriberId: sub,
    recipientName: 'Paciente',
    patientId: params.patientId,
    assignmentId: params.assignmentId,
    payload: { tag_id: tag_id_therapist_assigned },
    result: tagResult,
  })

  if (tagResult.success) {
    console.log(`[ManyChat] ✅ Paciente ${params.patientId} notificado (terapeuta ${params.therapistId})`)
  } else {
    console.error(`[ManyChat] ❌ Erro ao notificar paciente ${params.patientId}:`, tagResult.error)
  }
}

// ─── Salvar Subscriber do ManyChat ───────────────────────────────────────────

export async function upsertSubscriber(
  whatsapp: string,
  subscriberId: string,
  name?: string,
  therapistId?: number,
  patientId?: number,
): Promise<void> {
  const db = await getDb()
  const clean = whatsapp.replace(/\D/g, '')

  const existing = await db
    .select()
    .from(manychatSubscribers)
    .where(eq(manychatSubscribers.whatsapp, clean))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(manychatSubscribers)
      .set({ subscriber_id: subscriberId, name, therapist_id: therapistId, patient_id: patientId })
      .where(eq(manychatSubscribers.whatsapp, clean))
  } else {
    await db.insert(manychatSubscribers).values({
      whatsapp: clean,
      subscriber_id: subscriberId,
      name,
      therapist_id: therapistId,
      patient_id: patientId,
    })
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function logSent(params: {
  type: 'notify_patient' | 'notify_therapist' | 'set_custom_field' | 'add_tag' | 'other'
  subscriberId: string
  recipientName: string
  patientId?: number
  therapistId?: number
  assignmentId?: number
  payload: unknown
  result: { success: boolean; error?: string; data?: unknown }
}): Promise<void> {
  try {
    const db = await getDb()
    await db.insert(webhooksManychatSent).values({
      type: params.type,
      recipient_name: params.recipientName,
      recipient_subscriber_id: params.subscriberId,
      patient_id: params.patientId,
      therapist_id: params.therapistId,
      assignment_id: params.assignmentId,
      status: params.result.success ? 'success' : 'error',
      payload_sent: params.payload as any,
      response_received: (params.result.data ?? null) as any,
      error_message: params.result.error ?? null,
      sent_at: new Date(),
    })
  } catch (err) {
    console.error('[ManyChat/Log] Erro ao salvar log:', err)
  }
}

async function logSentBatch(
  type: 'notify_patient' | 'notify_therapist',
  subscriberId: string,
  recipientName: string,
  relatedId: number,
  assignmentId: number,
  results: PromiseSettledResult<{ success: boolean; error?: string }>[],
): Promise<void> {
  const anyError = results.some(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
  const errors = results
    .filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success))
    .map(r => r.status === 'rejected' ? String((r as any).reason) : (r as any).value.error)
    .join('; ')

  await logSent({
    type,
    subscriberId,
    recipientName,
    therapistId: type === 'notify_therapist' ? relatedId : undefined,
    patientId: type === 'notify_patient' ? relatedId : undefined,
    assignmentId,
    payload: { action: 'set_custom_fields', count: results.length },
    result: { success: !anyError, error: anyError ? errors : undefined },
  })
}
