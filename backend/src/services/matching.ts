/**
 * Algoritmo de Matching — Versão Híbrida
 *
 * Combina o sistema de referência (elegibilidade, filtros bidirecionais,
 * score por keywords, cascata 85→75→65) com o sistema atual (distribuição
 * proporcional, notificação bilateral, tratamento de falhas).
 *
 * Fluxo:
 * 1. Verificar elegibilidade do paciente (status pendente, sem terapeuta, motivo, WhatsApp)
 * 2. Filtros eliminatórios BIDIRECIONAIS (gênero, turno, saldo, casal, infantil)
 * 3. Limite diário proporcional: max(1, ceil(saldo / TARGET_DAYS))
 * 4. Score de compatibilidade: 50 + (categorias_encontradas × 10), max 100
 * 5. Cascata: Nível 1 (≥85%) → Nível 2 (≥75%) → Nível 3 (≥65%)
 * 6. Distribuição de carga: quem espera há mais tempo primeiro, desempate por score
 * 7. Notificação: paciente (ManyChat) + terapeuta (ManyChat)
 */

import { getDb } from '../db/index.js'
import {
  therapists, patients, assignments,
  matchingConfig, matchingLog,
} from '../db/schema.js'
import { eq, and, gt, gte, sql, desc } from 'drizzle-orm'
import { notifyTherapist, notifyPatient, resolveSubscriberId } from './manychat.js'
import { logger } from '../lib/logger.js'

// ─── Configuração de distribuição ────────────────────────────────────────────
// Taxa proporcional: limite_diario = max(1, ceil(saldo / TARGET_DAYS))
// Objetivo: entregar todos os leads em ~TARGET_DAYS dias úteis (~1 mês)
const TARGET_DAYS = 20

// ─── Cascata de compatibilidade ──────────────────────────────────────────────
const LEVEL_1 = 85
const LEVEL_2 = 75
const LEVEL_3 = 65

// ─── Categorias de palavras-chave para score ─────────────────────────────────
const KEYWORD_CATEGORIES: Record<string, string[]> = {
  ansiedade: ['ansiedade', 'pânico', 'medo', 'fobia', 'nervoso', 'preocupação'],
  depressao: ['depressão', 'tristeza', 'melancolia', 'desânimo', 'desmotivação'],
  relacionamento: ['relacionamento', 'casal', 'família', 'divórcio', 'separação', 'conflito', 'comunicação'],
  trauma: ['trauma', 'ptsd', 'abuso', 'violência', 'abandono', 'negligência'],
  infantil: ['criança', 'infantil', 'filho', 'adolescente', 'escola', 'bullying'],
  comportamento: ['comportamento', 'tcc', 'hábito', 'compulsão', 'vício', 'dependência', 'jogo', 'jogatina', 'tabagismo', 'alcoolismo'],
  psicanalitica: ['psicanálise', 'psicanalítica', 'inconsciente', 'sonho', 'infância'],
  humanista: ['humanista', 'gestalt', 'humanismo', 'autoestima', 'autoconhecimento', 'identidade', 'propósito'],
  cognitiva: ['cognitiva', 'pensamento', 'crenças', 'distorção'],
  estresse: ['estresse', 'burnout', 'esgotamento', 'sobrecarga', 'insônia'],
  luto: ['luto', 'perda', 'morte', 'falecimento'],
  alimentar: ['alimentar', 'anorexia', 'bulimia', 'obesidade', 'peso', 'emagrecimento'],
}

// ─── Matching automático ──────────────────────────────────────────────────────

export async function runAutoMatching(patientId: number): Promise<void> {
  const db = await getDb()

  const [config] = await db.select().from(matchingConfig).limit(1)
  if (config?.mode === 'pausado') {
    logger.info({ patientId }, '[Matching] Pausado — paciente aguarda')
    return
  }
  if (config?.mode === 'manual') {
    logger.info({ patientId }, '[Matching] Modo manual — paciente aguarda admin')
    return
  }

  const result = await findBestTherapist(patientId)

  if (!result) {
    await db.insert(matchingLog).values({
      patient_id: patientId,
      success: false,
      error: `Nenhum terapeuta disponível ou nenhum atingiu score mínimo de ${LEVEL_3}% — aguardando admin`,
      decided_at: new Date(),
    })
    logger.warn({ patientId }, '[Matching] Sem match automático — aguardando admin')
    return
  }

  await confirmAssignment(patientId, result.therapist_id, result.score, result.reason)
}

// ─── Processar todos os pacientes pendentes ──────────────────────────────────

export async function matchPendingPatients(): Promise<{ matched: number; failed: number }> {
  const db = await getDb()

  const [config] = await db.select().from(matchingConfig).limit(1)
  if (config?.mode === 'pausado' || config?.mode === 'manual') {
    return { matched: 0, failed: 0 }
  }

  const pending = await db
    .select()
    .from(patients)
    .where(eq(patients.status, 'pendente'))
    .limit(50)

  let matched = 0
  let failed = 0

  for (const patient of pending) {
    try {
      const result = await findBestTherapist(patient.id)
      if (result) {
        await confirmAssignment(patient.id, result.therapist_id, result.score, result.reason)
        matched++
      }
    } catch (err) {
      logger.error({ error: err, patientId: patient.id }, '[Matching] Erro ao processar paciente')
      failed++
    }
  }

  if (matched > 0) {
    logger.info({ matched, failed }, '[Matching] matchPendingPatients concluído')
  }

  return { matched, failed }
}

// ─── Sugestão (modo semi-automático) ─────────────────────────────────────────

export async function suggestTherapist(patientId: number) {
  return findBestTherapist(patientId)
}

// ─── Confirmar atribuição ─────────────────────────────────────────────────────

export async function confirmAssignment(
  patientId: number,
  therapistId: number,
  score = 0,
  reason = '',
): Promise<number> {
  const db = await getDb()

  // 1. Criar atribuição
  const result = await db.insert(assignments).values({
    patient_id: patientId,
    therapist_id: therapistId,
    status: 'pendente',
    compatibility_score: score,
    match_reason: reason,
    assigned_at: new Date(),
  })
  const assignmentId = (result as any)[0].insertId

  // 2. Decrementar saldo (proteção contra negativo) e atualizar stats
  await db
    .update(therapists)
    .set({
      balance: sql`GREATEST(0, ${therapists.balance} - 1)`,
      total_assignments: sql`${therapists.total_assignments} + 1`,
      last_assigned_at: new Date(),
    })
    .where(eq(therapists.id, therapistId))

  // 3. Atualizar status do paciente
  await db
    .update(patients)
    .set({
      assigned_therapist_id: therapistId,
      assigned_at: new Date(),
      status: 'atribuido',
    })
    .where(eq(patients.id, patientId))

  // 4. Log de matching
  const [patient] = await db.select().from(patients).where(eq(patients.id, patientId))
  const [therapist] = await db.select().from(therapists).where(eq(therapists.id, therapistId))

  await db.insert(matchingLog).values({
    patient_id: patientId,
    therapist_id: therapistId,
    patient_name: patient?.name,
    therapist_name: therapist?.name,
    score,
    reason,
    success: true,
    decided_at: new Date(),
  })

  logger.info({ patientId, therapistId, score }, '[Matching] Atribuição confirmada')

  // 5. Notificações (assíncrono — não bloqueia a resposta)
  notifyAfterMatch(assignmentId, patient, therapist).catch(err =>
    logger.error({ error: err }, '[Matching] Erro na notificação')
  )

  return assignmentId
}

// ─── Algoritmo principal ──────────────────────────────────────────────────────

async function findBestTherapist(patientId: number) {
  const db = await getDb()

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))

  if (!patient) return null

  if (patient.status !== 'pendente') {
    logger.info({ patientId, status: patient.status }, '[Matching] Paciente não elegível')
    return null
  }
  if (!patient.reason || patient.reason.trim() === '') {
    logger.info({ patientId }, '[Matching] Paciente não elegível: motivo vazio')
    return null
  }
  if (!patient.phone || patient.phone.trim() === '') {
    logger.info({ patientId }, '[Matching] Paciente não elegível: WhatsApp vazio')
    return null
  }

  // ── PASSO 2: Filtros eliminatórios BIDIRECIONAIS ──────────────────────────
  const filters = [
    eq(therapists.status, 'ativo'),
    gt(therapists.balance, 0),
  ]

  if (patient.preferred_gender && patient.preferred_gender !== 'indifferent') {
    filters.push(eq(therapists.gender, patient.preferred_gender))
  }

  filters.push(
    sql`(${therapists.serves_gender} = 'todos' OR ${therapists.serves_gender} = ${patient.gender})`
  )

  if (patient.shift && patient.shift !== 'flexivel') {
    filters.push(sql`JSON_CONTAINS(${therapists.shifts}, ${JSON.stringify(patient.shift)})`)
  }

  if (patient.therapy_for === 'casal') {
    filters.push(eq(therapists.serves_couples, true))
  }
  if (patient.therapy_for === 'infantil') {
    filters.push(eq(therapists.serves_children, true))
  }

  const candidates = await db
    .select()
    .from(therapists)
    .where(and(...filters))
    .limit(200)

  if (candidates.length === 0) {
    logger.info({ patientId }, '[Matching] Nenhum terapeuta passou nos filtros')
    return null
  }

  // ── PASSO 4: Limite diário proporcional ───────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayAssignments = await db
    .select({
      therapist_id: assignments.therapist_id,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(assignments)
    .where(gte(assignments.assigned_at, today))
    .groupBy(assignments.therapist_id)

  const todayCountMap = new Map(todayAssignments.map(a => [a.therapist_id, a.count]))

  const available: typeof candidates = []
  for (const t of candidates) {
    const todayCount = todayCountMap.get(t.id) ?? 0
    const dailyLimit = Math.max(1, Math.ceil((t.balance ?? 0) / TARGET_DAYS))
    if (todayCount < dailyLimit) {
      available.push(t)
    }
  }

  const pool = available.length > 0 ? available : candidates

  if (available.length === 0) {
    logger.info({ patientId }, '[Matching] Todos no limite diário — usando fallback')
  }

  // ── PASSO 5: Score de compatibilidade ─────────────────────────────────────
  const scored = pool.map(t => ({
    therapist_id: t.id,
    score: computeScore(patient, t),
    reason: buildReason(patient, t),
    last_assigned_at: t.last_assigned_at,
    has_formation: t.has_formation ?? false,
  }))

  // ── PASSO 6: Cascata (85 → 75 → 65) ─────────────────────────────────────
  let eligible = scored.filter(s => s.score >= LEVEL_1)
  let level = 1

  if (eligible.length === 0) { eligible = scored.filter(s => s.score >= LEVEL_2); level = 2 }
  if (eligible.length === 0) { eligible = scored.filter(s => s.score >= LEVEL_3); level = 3 }

  if (eligible.length === 0) {
    logger.info({ patientId, minScore: LEVEL_3 }, '[Matching] Nenhum terapeuta atingiu score mínimo')
    return null
  }

  logger.info({ patientId, level, count: eligible.length }, '[Matching] Candidatos elegíveis')

  // ── PASSO 7: Distribuição de carga ────────────────────────────────────────
  // Critério 1: maior score (melhor match)
  // Critério 2: formação (desempate quando scores iguais)
  // Critério 3: última atribuição mais antiga (distribuição justa)
  eligible.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.has_formation !== a.has_formation) return b.has_formation ? 1 : -1
    const aTime = a.last_assigned_at?.getTime() ?? 0
    const bTime = b.last_assigned_at?.getTime() ?? 0
    return aTime - bTime
  })

  return eligible[0]
}

// ─── Score de compatibilidade ────────────────────────────────────────────────

function computeScore(patient: any, therapist: any): number {
  const reason = (patient.reason || '').toLowerCase()
  const approach = (therapist.approach || '').toLowerCase()
  const specialties: string[] = (therapist.specialties || []).map((s: string) => s.toLowerCase())

  const combinedText = [reason, approach, ...specialties].join(' ')

  let categoryMatches = 0
  for (const keywords of Object.values(KEYWORD_CATEGORIES)) {
    const found = keywords.some(kw => combinedText.includes(kw))
    if (found) categoryMatches++
  }

  return Math.min(50 + (categoryMatches * 10), 100)
}

function buildReason(patient: any, therapist: any): string {
  const parts: string[] = []
  if (therapist.approach) parts.push(`Abordagem: ${therapist.approach}`)
  const specialties: string[] = therapist.specialties || []
  if (specialties.length > 0) parts.push(`Especialidades: ${specialties.slice(0, 3).join(', ')}`)
  return parts.join(' | ') || 'Melhor disponível na fila'
}

// ─── Notificações pós-matching ────────────────────────────────────────────────

async function notifyAfterMatch(assignmentId: number, patient: any, therapist: any) {
  if (!patient || !therapist) return

  const [patientSubId, therapistSubId] = await Promise.all([
    resolveSubscriberId(patient.manychat_subscriber_id, patient.phone),
    resolveSubscriberId(therapist.manychat_subscriber_id, therapist.whatsapp),
  ])

  if (patientSubId) {
    await notifyPatient({
      patientSubscriberId: patientSubId,
      patientId: patient.id,
      therapistId: therapist.id,
      assignmentId,
      therapistName: therapist.name,
      therapistWhatsapp: therapist.whatsapp,
    })
  } else {
    logger.warn({ patientId: patient.id }, '[Matching] Paciente sem subscriber_id — notificação ignorada')
  }

  if (therapistSubId) {
    await notifyTherapist({
      therapistSubscriberId: therapistSubId,
      therapistId: therapist.id,
      patientId: patient.id,
      assignmentId,
      patientName: patient.name,
      patientWhatsapp: patient.phone || '',
      patientShift: patient.shift || '',
      patientReason: patient.reason || '',
    })
  } else {
    logger.warn({ therapistId: therapist.id }, '[Matching] Terapeuta sem subscriber_id — notificação ignorada')
  }

  const db = await getDb()
  await db
    .update(assignments)
    .set({
      notified_patient: !!patientSubId,
      notified_therapist: !!therapistSubId,
      status: 'confirmado',
    })
    .where(eq(assignments.id, assignmentId))
}
