/**
 * Webhooks ManyChat
 *
 * POST /api/webhooks/manychat/patient  — recebe dados do paciente via external request
 * GET  /api/webhooks/manychat/received — lista todos os webhooks recebidos (P4)
 * GET  /api/webhooks/manychat/sent     — lista todos os webhooks enviados (P5)
 * POST /api/webhooks/manychat/sent/:id/retry — reenvia notificação com erro (P5)
 */

import { Router } from 'express'
import { getDb } from '../db/index.js'
import {
  webhooksManychatReceived, webhooksManychatSent,
  patients, therapists, assignments, manychatSubscribers,
} from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { runAutoMatching } from '../services/matching.js'
import {
  upsertSubscriber, notifyTherapist, notifyPatient, resolveSubscriberId,
} from '../services/manychat.js'
import { logger } from '../lib/logger.js'

export const webhooksManychatRouter = Router()

// ─── POST /patient — receber paciente do ManyChat ─────────────────────────────

webhooksManychatRouter.post('/patient', async (req, res) => {
  const db = await getDb()
  let webhookId: number | undefined

  try {
    const body = req.body

    const name         = cleanField(body.nome || body.name || body.full_name)
    const phone        = cleanPhone(body.whatsapp || body.phone || body.celular)
    const subscriberId = cleanField(body.subscriber_id || body.manychat_id || body.id)
    const gender       = normalizeGender(body.genero || body.gender || body.sexo)
    const prefGender   = normalizePrefGender(body.preferenciaTerapeuta || body.preferred_gender || body.preferencia_terapeuta)
    const shift        = normalizeShift(body.turnos || body.turno || body.shift || body.horario)
    const reason       = cleanField(body.motivo || body.reason || body.queixa)
    const therapyFor   = normalizeTherapyFor(body.terapia_para || body.therapy_for)
    const contactWhen  = cleanField(body.contatoQuando || body.contact_when)
    const childName    = cleanField(body.nome_crianca || body.child_name)
    const childAge     = body.idade_crianca ? parseInt(body.idade_crianca) : undefined
    const relativeName = cleanField(body.nome_parente || body.relative_name)
    const relativePhone = cleanPhone(body.contato_parente || body.relative_phone)

    if (!name || isPlaceholder(name)) {
      res.status(400).json({ error: 'Campo nome ausente ou inválido' })
      return
    }
    if (!phone || isPlaceholder(phone)) {
      res.status(400).json({ error: 'Campo whatsapp ausente ou inválido' })
      return
    }

    // 1. Salvar webhook recebido (P4)
    const result = await db.insert(webhooksManychatReceived).values({
      type: 'patient_new',
      contact_name: name,
      contact_phone: phone,
      manychat_subscriber_id: subscriberId || null,
      gender: gender || null,
      preferred_gender: prefGender || null,
      shift: shift || null,
      reason: reason || null,
      therapy_for: therapyFor || null,
      processing_status: 'pending',
      raw_payload: body,
    })
    webhookId = (result as any)[0].insertId

    // 2. Criar paciente
    const patientResult = await db.insert(patients).values({
      name,
      phone,
      gender: (gender as 'M' | 'F' | 'NB') || 'M',
      preferred_gender: (prefGender as 'M' | 'F' | 'NB' | 'indifferent') || 'indifferent',
      shift: (shift as 'manha' | 'tarde' | 'noite' | 'flexivel') || 'flexivel',
      reason: reason || null,
      therapy_for: (therapyFor as 'normal' | 'casal' | 'infantil' | 'outra_pessoa') || 'normal',
      contact_when: contactWhen || null,
      child_name: childName || null,
      child_age: childAge || null,
      relative_name: relativeName || null,
      relative_phone: relativePhone || null,
      manychat_subscriber_id: subscriberId || null,
      status: 'pendente',
    })
    const patientId = (patientResult as any)[0].insertId

    // 3. Salvar subscriber_id para lookup futuro
    if (subscriberId && phone) {
      await upsertSubscriber(phone, subscriberId, name, undefined, patientId).catch(() => {})
    }

    // 4. Marcar webhook como processado
    await db
      .update(webhooksManychatReceived)
      .set({ processing_status: 'processed', patient_id: patientId, processed_at: new Date() })
      .where(eq(webhooksManychatReceived.id, webhookId!))

    // 5. Disparar matching automático (não bloqueia a resposta)
    runAutoMatching(patientId).catch(err =>
      logger.error({ error: err }, '[Webhook/ManyChat] Erro no matching automático')
    )

    logger.info({ patientId, name, phone }, '[Webhook/ManyChat] Paciente criado')
    res.json({ success: true, patient_id: patientId })

  } catch (error) {
    logger.error({ error, requestId: req.requestId }, '[Webhook/ManyChat/Patient] Erro')
    if (webhookId) {
      const db2 = await getDb()
      await db2
        .update(webhooksManychatReceived)
        .set({ processing_status: 'error', error_message: String(error), processed_at: new Date() })
        .where(eq(webhooksManychatReceived.id, webhookId))
        .catch(() => {})
    }
    res.status(500).json({ error: 'Erro ao processar paciente' })
  }
})

// ─── GET /received (P4) ───────────────────────────────────────────────────────

webhooksManychatRouter.get('/received', adminAuth, async (req, res) => {
  try {
    const db = await getDb()
    const { limit = '100', status } = req.query as Record<string, string>

    let query = db
      .select()
      .from(webhooksManychatReceived)
      .orderBy(desc(webhooksManychatReceived.created_at))
      .limit(Math.min(parseInt(limit), 500))
      .$dynamic()

    if (status) {
      query = query.where(eq(webhooksManychatReceived.processing_status, status as any))
    }

    res.json(await query)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar webhooks recebidos' })
  }
})

// ─── GET /sent (P5) ──────────────────────────────────────────────────────────

webhooksManychatRouter.get('/sent', adminAuth, async (req, res) => {
  try {
    const db = await getDb()
    const { limit = '100', type, status } = req.query as Record<string, string>

    let query = db
      .select()
      .from(webhooksManychatSent)
      .orderBy(desc(webhooksManychatSent.sent_at))
      .limit(Math.min(parseInt(limit), 500))
      .$dynamic()

    if (type) query = query.where(eq(webhooksManychatSent.type, type as any))
    if (status) query = query.where(eq(webhooksManychatSent.status, status as any))

    res.json(await query)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar webhooks enviados' })
  }
})

// ─── POST /sent/:id/retry — reenviar notificação com erro (P5) ───────────────

webhooksManychatRouter.post('/sent/:id/retry', adminAuth, async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const [entry] = await db
      .select()
      .from(webhooksManychatSent)
      .where(eq(webhooksManychatSent.id, id))

    if (!entry) {
      res.status(404).json({ error: 'Registro não encontrado' })
      return
    }

    if (entry.status !== 'error') {
      res.status(400).json({ error: 'Só é possível reenviar registros com status error' })
      return
    }

    // Reenviar baseado no tipo
    if (entry.type === 'notify_therapist' && entry.therapist_id && entry.assignment_id) {
      const [therapist] = await db.select().from(therapists).where(eq(therapists.id, entry.therapist_id))
      const assignment = await db
        .select({ patient_id: assignments.patient_id })
        .from(assignments)
        .where(eq(assignments.id, entry.assignment_id))
        .limit(1)

      if (!therapist || !assignment[0]) {
        res.status(404).json({ error: 'Dados do terapeuta ou atribuição não encontrados' })
        return
      }

      const [patient] = await db.select().from(patients).where(eq(patients.id, assignment[0].patient_id))
      if (!patient) {
        res.status(404).json({ error: 'Paciente não encontrado' })
        return
      }

      const therapistSubId = await resolveSubscriberId(
        therapist.manychat_subscriber_id,
        therapist.whatsapp,
      )

      if (!therapistSubId) {
        res.status(400).json({ error: 'Subscriber ID do terapeuta não encontrado' })
        return
      }

      await notifyTherapist({
        therapistSubscriberId: therapistSubId,
        therapistId: therapist.id,
        patientId: patient.id,
        assignmentId: entry.assignment_id,
        patientName: patient.name,
        patientWhatsapp: patient.phone || '',
        patientShift: patient.shift || '',
        patientReason: patient.reason || '',
      })

      logger.info({ id, type: entry.type }, '[ManyChat/Retry] Notificação reenviada')
      res.json({ success: true, message: 'Notificação ao terapeuta reenviada' })
      return
    }

    if (entry.type === 'notify_patient' && entry.patient_id && entry.assignment_id) {
      const [patient] = await db.select().from(patients).where(eq(patients.id, entry.patient_id))
      const assignment = await db
        .select({ therapist_id: assignments.therapist_id })
        .from(assignments)
        .where(eq(assignments.id, entry.assignment_id))
        .limit(1)

      if (!patient || !assignment[0]) {
        res.status(404).json({ error: 'Dados do paciente ou atribuição não encontrados' })
        return
      }

      const [therapist] = await db.select().from(therapists).where(eq(therapists.id, assignment[0].therapist_id))
      if (!therapist) {
        res.status(404).json({ error: 'Terapeuta não encontrado' })
        return
      }

      const patientSubId = await resolveSubscriberId(
        patient.manychat_subscriber_id,
        patient.phone,
      )

      if (!patientSubId) {
        res.status(400).json({ error: 'Subscriber ID do paciente não encontrado' })
        return
      }

      await notifyPatient({
        patientSubscriberId: patientSubId,
        patientId: patient.id,
        therapistId: therapist.id,
        assignmentId: entry.assignment_id,
        therapistName: therapist.name,
        therapistWhatsapp: therapist.whatsapp || '',
      })

      logger.info({ id, type: entry.type }, '[ManyChat/Retry] Notificação reenviada')
      res.json({ success: true, message: 'Notificação ao paciente reenviada' })
      return
    }

    res.status(400).json({ error: `Retry não suportado para tipo: ${entry.type}` })
  } catch (error) {
    logger.error({ error }, '[ManyChat/Retry] Erro')
    res.status(500).json({ error: 'Erro ao reenviar notificação' })
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanField(val: unknown): string {
  if (!val) return ''
  return String(val).trim()
}

function cleanPhone(val: unknown): string {
  if (!val) return ''
  return String(val).replace(/\D/g, '')
}

function isPlaceholder(val: string): boolean {
  return val.startsWith('{{') && val.endsWith('}}')
}

function normalizeGender(val: unknown): string {
  const v = String(val || '').toLowerCase().trim()
  if (['m', 'masculino', 'homem', 'male', 'h'].includes(v)) return 'M'
  if (['f', 'feminino', 'mulher', 'female'].includes(v)) return 'F'
  if (['nb', 'nao-binario', 'não-binário', 'nonbinary', 'outro', 'other'].includes(v)) return 'NB'
  return 'M'
}

function normalizePrefGender(val: unknown): string {
  const v = String(val || '').toLowerCase().trim()
  if (['m', 'masculino', 'homem', 'male', 'h'].includes(v)) return 'M'
  if (['f', 'feminino', 'mulher', 'female'].includes(v)) return 'F'
  if (['nb', 'nao-binario', 'não-binário'].includes(v)) return 'NB'
  return 'indifferent'
}

function normalizeShift(val: unknown): string {
  const v = String(val || '').toLowerCase().trim()
  if (['manha', 'manhã', 'morning', 'mañana'].includes(v)) return 'manha'
  if (['tarde', 'afternoon'].includes(v)) return 'tarde'
  if (['noite', 'night', 'evening'].includes(v)) return 'noite'
  if (['qualquer', 'any', 'flexivel', 'flexível'].includes(v)) return 'flexivel'
  if (v.includes(',')) return normalizeShift(v.split(',')[0])
  return 'flexivel'
}

function normalizeTherapyFor(val: unknown): string {
  const v = String(val || '').toLowerCase().trim()
  if (['casal', 'couple', 'casais'].includes(v)) return 'casal'
  if (['infantil', 'criança', 'child', 'children'].includes(v)) return 'infantil'
  if (['outra_pessoa', 'outra pessoa', 'terceiro', 'parente'].includes(v)) return 'outra_pessoa'
  return 'normal'
}
