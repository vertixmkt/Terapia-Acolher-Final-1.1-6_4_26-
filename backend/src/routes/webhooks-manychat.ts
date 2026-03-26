/**
 * Webhooks ManyChat
 *
 * POST /api/webhooks/manychat/patient  — recebe dados do paciente via external request
 * GET  /api/webhooks/manychat/received — lista todos os webhooks recebidos (P4)
 * GET  /api/webhooks/manychat/sent     — lista todos os webhooks enviados (P5)
 */

import { Router } from 'express'
import { getDb } from '../db/index.js'
import {
  webhooksManychatReceived, webhooksManychatSent,
  patients, manychatSubscribers,
} from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { runAutoMatching } from '../services/matching.js'
import { upsertSubscriber } from '../services/manychat.js'

export const webhooksManychatRouter = Router()

// ─── POST /patient — receber paciente do ManyChat ─────────────────────────────

webhooksManychatRouter.post('/patient', async (req, res) => {
  const db = await getDb()
  let webhookId: number | undefined

  try {
    const body = req.body

    // Normalizar todos os campos que o ManyChat pode enviar
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

    // Validar campos obrigatórios (e rejeitar placeholders do ManyChat como {{nome}})
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
      console.error('[Webhook/ManyChat] Erro no matching automático:', err)
    )

    console.log(`[Webhook/ManyChat] ✅ Paciente ${patientId} criado — ${name} (${phone})`)
    res.json({ success: true, patient_id: patientId })

  } catch (error) {
    console.error('[Webhook/ManyChat/Patient] Erro:', error)
    if (webhookId) {
      const db2 = await getDb()
      await db2
        .update(webhooksManychatReceived)
        .set({
          processing_status: 'error',
          error_message: String(error),
          processed_at: new Date(),
        })
        .where(eq(webhooksManychatReceived.id, webhookId))
        .catch(() => {})
    }
    res.status(500).json({ error: 'Erro ao processar paciente' })
  }
})

// ─── GET /received — listar webhooks recebidos (P4) ──────────────────────────

webhooksManychatRouter.get('/received', adminAuth, async (req, res) => {
  try {
    const db = await getDb()
    const { limit = '100', status, type } = req.query as Record<string, string>

    let query = db
      .select()
      .from(webhooksManychatReceived)
      .orderBy(desc(webhooksManychatReceived.created_at))
      .limit(Math.min(parseInt(limit), 500))
      .$dynamic()

    if (status) {
      query = query.where(eq(webhooksManychatReceived.processing_status, status as any))
    }

    const rows = await query
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar webhooks recebidos' })
  }
})

// ─── GET /sent — listar webhooks enviados (P5) ───────────────────────────────

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

    if (type) {
      query = query.where(eq(webhooksManychatSent.type, type as any))
    }
    if (status) {
      query = query.where(eq(webhooksManychatSent.status, status as any))
    }

    const rows = await query
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar webhooks enviados' })
  }
})

// ─── POST /sent/:id/retry — reenviar notificação com erro ────────────────────

webhooksManychatRouter.post('/sent/:id/retry', adminAuth, async (req, res) => {
  try {
    const db = await getDb()
    const [entry] = await db
      .select()
      .from(webhooksManychatSent)
      .where(eq(webhooksManychatSent.id, parseInt(req.params.id)))

    if (!entry) {
      res.status(404).json({ error: 'Registro não encontrado' })
      return
    }

    if (entry.status !== 'error') {
      res.status(400).json({ error: 'Só é possível reenviar registros com status error' })
      return
    }

    // TODO: implementar retry específico por tipo de envio
    res.json({ message: 'Re-envio enfileirado', id: entry.id })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reenviar' })
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
  // No sistema original: infantil/casal → paciente com therapy_for especial, gender separado
  if (['infantil', 'criança'].includes(v)) return 'M' // padrão para infantil
  return 'M' // padrão
}

function normalizePrefGender(val: unknown): string {
  const v = String(val || '').toLowerCase().trim()
  if (['m', 'masculino', 'homem', 'male', 'h'].includes(v)) return 'M'
  if (['f', 'feminino', 'mulher', 'female'].includes(v)) return 'F'
  if (['nb', 'nao-binario', 'não-binário'].includes(v)) return 'NB'
  if (['tanto_faz', 'tanto faz', 'indifferent', 'indiferente', ''].includes(v)) return 'indifferent'
  return 'indifferent'
}

function normalizeShift(val: unknown): string {
  const v = String(val || '').toLowerCase().trim()
  if (['manha', 'manhã', 'morning', 'mañana'].includes(v)) return 'manha'
  if (['tarde', 'afternoon'].includes(v)) return 'tarde'
  if (['noite', 'night', 'evening'].includes(v)) return 'noite'
  if (['qualquer', 'any', 'flexivel', 'flexível'].includes(v)) return 'flexivel'
  // Turnos múltiplos (ex: "manha,tarde") → pegar o primeiro
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
