import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../db/index.js'
import { matchingConfig, matchingLog, therapists } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { runAutoMatching, suggestTherapist, confirmAssignment, matchPendingPatients } from '../services/matching.js'
import { logger } from '../lib/logger.js'

export const matchingRouter = Router()
matchingRouter.use(adminAuth)

// ─── Schemas ──────────────────────────────────────────────────────────────────

const modeSchema = z.object({
  mode: z.enum(['auto', 'semi', 'manual', 'pausado']),
  weight_gender: z.number().int().min(0).max(100).optional(),
  weight_shift: z.number().int().min(0).max(100).optional(),
  weight_specialty: z.number().int().min(0).max(100).optional(),
})

const suggestSchema = z.object({
  patient_id: z.number().int().positive(),
})

const assignSchema = z.object({
  patient_id: z.number().int().positive(),
  therapist_id: z.number().int().positive(),
  score: z.number().min(0).max(100).optional(),
  reason: z.string().optional(),
})

// GET /api/matching/mode
matchingRouter.get('/mode', async (_req, res) => {
  try {
    const db = await getDb()
    const [config] = await db.select().from(matchingConfig).limit(1)
    res.json(config ?? { mode: 'auto' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter modo de matching' })
  }
})

// PUT /api/matching/mode
matchingRouter.put('/mode', async (req, res) => {
  try {
    const parsed = modeSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Modo inválido', details: parsed.error.errors })
      return
    }

    const db = await getDb()
    const { mode, weight_gender, weight_shift, weight_specialty } = parsed.data
    const updateData: Record<string, any> = { mode }
    if (weight_gender !== undefined) updateData.weight_gender = weight_gender
    if (weight_shift !== undefined) updateData.weight_shift = weight_shift
    if (weight_specialty !== undefined) updateData.weight_specialty = weight_specialty

    const [existing] = await db.select().from(matchingConfig).limit(1)
    if (existing) {
      await db.update(matchingConfig).set(updateData).where(eq(matchingConfig.id, existing.id))
    } else {
      await db.insert(matchingConfig).values(updateData)
    }

    res.json({ mode, ...updateData })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar modo de matching' })
  }
})

// POST /api/matching/run
matchingRouter.post('/run', async (_req, res) => {
  try {
    const result = await matchPendingPatients()
    res.json(result)
  } catch (error) {
    logger.error({ error }, '[Matching/Run] Erro')
    res.status(500).json({ error: 'Erro ao executar matching' })
  }
})

// POST /api/matching/suggest
matchingRouter.post('/suggest', async (req, res) => {
  try {
    const parsed = suggestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'patient_id obrigatório e deve ser um inteiro positivo' })
      return
    }

    const suggestion = await suggestTherapist(parsed.data.patient_id)
    if (!suggestion) {
      res.status(404).json({ error: 'Nenhum terapeuta disponível para este paciente' })
      return
    }

    const db = await getDb()
    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, suggestion.therapist_id))

    res.json({ therapist, score: suggestion.score, reason: suggestion.reason })
  } catch (error) {
    logger.error({ error }, '[Matching/Suggest] Erro')
    res.status(500).json({ error: 'Erro ao sugerir terapeuta' })
  }
})

// POST /api/matching/assign
matchingRouter.post('/assign', async (req, res) => {
  try {
    const parsed = assignSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'patient_id e therapist_id obrigatórios', details: parsed.error.errors })
      return
    }

    const { patient_id, therapist_id, score, reason } = parsed.data
    const assignmentId = await confirmAssignment(patient_id, therapist_id, score, reason)
    res.json({ success: true, assignment_id: assignmentId })
  } catch (error) {
    logger.error({ error }, '[Matching/Assign] Erro')
    res.status(500).json({ error: 'Erro ao confirmar atribuição' })
  }
})

// GET /api/matching/log
matchingRouter.get('/log', async (req, res) => {
  try {
    const db = await getDb()
    const rows = await db
      .select()
      .from(matchingLog)
      .orderBy(desc(matchingLog.decided_at))
      .limit(100)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar log de matching' })
  }
})
