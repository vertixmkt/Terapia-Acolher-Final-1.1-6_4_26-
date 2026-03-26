import { Router } from 'express'
import { getDb } from '../db/index.js'
import { matchingConfig, matchingLog, therapists, patients } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { runAutoMatching, suggestTherapist, confirmAssignment, matchPendingPatients } from '../services/matching.js'

export const matchingRouter = Router()
matchingRouter.use(adminAuth)

// GET /api/matching/mode — obter modo atual
matchingRouter.get('/mode', async (_req, res) => {
  try {
    const db = await getDb()
    const [config] = await db.select().from(matchingConfig).limit(1)
    res.json(config ?? { mode: 'auto' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter modo de matching' })
  }
})

// PUT /api/matching/mode — alterar modo
matchingRouter.put('/mode', async (req, res) => {
  try {
    const db = await getDb()
    const { mode } = req.body as { mode: 'auto' | 'semi' | 'manual' | 'pausado' }

    const [existing] = await db.select().from(matchingConfig).limit(1)
    if (existing) {
      await db.update(matchingConfig).set({ mode }).where(eq(matchingConfig.id, existing.id))
    } else {
      await db.insert(matchingConfig).values({ mode })
    }

    res.json({ mode })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar modo de matching' })
  }
})

// POST /api/matching/run — rodar matching para todos os pacientes pendentes
matchingRouter.post('/run', async (_req, res) => {
  try {
    const result = await matchPendingPatients()
    res.json(result)
  } catch (error) {
    console.error('[Matching/Run] Erro:', error)
    res.status(500).json({ error: 'Erro ao executar matching' })
  }
})

// POST /api/matching/suggest — sugerir terapeuta (modo semi-auto)
matchingRouter.post('/suggest', async (req, res) => {
  try {
    const { patient_id } = req.body
    if (!patient_id) {
      res.status(400).json({ error: 'patient_id obrigatório' })
      return
    }

    const suggestion = await suggestTherapist(patient_id)
    if (!suggestion) {
      res.status(404).json({ error: 'Nenhum terapeuta disponível para este paciente' })
      return
    }

    const db = await getDb()
    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, suggestion.therapist_id))

    res.json({
      therapist,
      score: suggestion.score,
      reason: suggestion.reason,
    })
  } catch (error) {
    console.error('[Matching/Suggest] Erro:', error)
    res.status(500).json({ error: 'Erro ao sugerir terapeuta' })
  }
})

// POST /api/matching/assign — confirmar atribuição (manual ou semi-auto)
matchingRouter.post('/assign', async (req, res) => {
  try {
    const { patient_id, therapist_id, score, reason } = req.body
    if (!patient_id || !therapist_id) {
      res.status(400).json({ error: 'patient_id e therapist_id obrigatórios' })
      return
    }

    const assignmentId = await confirmAssignment(patient_id, therapist_id, score, reason)
    res.json({ success: true, assignment_id: assignmentId })
  } catch (error) {
    console.error('[Matching/Assign] Erro:', error)
    res.status(500).json({ error: 'Erro ao confirmar atribuição' })
  }
})

// GET /api/matching/log — histórico de decisões
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
