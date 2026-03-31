import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../db/index.js'
import { assignments, therapists, patients, leadReplenishments } from '../db/schema.js'
import { eq, desc, sql } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { logger } from '../lib/logger.js'

export const assignmentsRouter = Router()
assignmentsRouter.use(adminAuth)

// ─── Schemas ──────────────────────────────────────────────────────────────────

const statusSchema = z.object({
  status: z.enum(['pendente', 'confirmado', 'cancelado']),
})

const replenishSchema = z.object({
  therapist_id: z.number().int().positive(),
  assignment_id: z.number().int().positive(),
  reason: z.string().optional(),
  contacted_0h: z.boolean().default(false),
  contacted_24h: z.boolean().default(false),
  contacted_72h: z.boolean().default(false),
  contacted_15d: z.boolean().default(false),
})

// GET /api/assignments
assignmentsRouter.get('/', async (req, res) => {
  try {
    const db = await getDb()

    const rows = await db
      .select({
        id: assignments.id,
        patient_id: assignments.patient_id,
        therapist_id: assignments.therapist_id,
        patient_name: patients.name,
        therapist_name: therapists.name,
        status: assignments.status,
        compatibility_score: assignments.compatibility_score,
        match_reason: assignments.match_reason,
        notified_patient: assignments.notified_patient,
        notified_therapist: assignments.notified_therapist,
        assigned_at: assignments.assigned_at,
      })
      .from(assignments)
      .leftJoin(patients, eq(assignments.patient_id, patients.id))
      .leftJoin(therapists, eq(assignments.therapist_id, therapists.id))
      .orderBy(desc(assignments.assigned_at))
      .limit(200)

    res.json(rows)
  } catch (error) {
    logger.error({ error }, '[Assignments/List] Erro')
    res.status(500).json({ error: 'Erro ao listar atribuições' })
  }
})

// GET /api/assignments/:id
assignmentsRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

    const db = await getDb()
    const [row] = await db
      .select()
      .from(assignments)
      .where(eq(assignments.id, id))

    if (!row) {
      res.status(404).json({ error: 'Atribuição não encontrada' })
      return
    }
    res.json(row)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar atribuição' })
  }
})

// PATCH /api/assignments/:id/status
assignmentsRouter.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Status inválido', details: parsed.error.errors })
      return
    }

    const db = await getDb()
    await db
      .update(assignments)
      .set({ status: parsed.data.status })
      .where(eq(assignments.id, id))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' })
  }
})

// ─── P3: Lead Replenishment ────────────────────────────────────────────────────

// POST /api/assignments/replenishment
assignmentsRouter.post('/replenishment', async (req, res) => {
  try {
    const parsed = replenishSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.errors })
      return
    }

    const db = await getDb()
    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, parsed.data.therapist_id))

    if (!therapist) {
      res.status(404).json({ error: 'Terapeuta não encontrado' })
      return
    }

    if ((therapist.replenishments_used ?? 0) >= (therapist.replenishments_max ?? 3)) {
      res.status(400).json({
        error: `Limite de ${therapist.replenishments_max} reposições atingido`,
      })
      return
    }

    const result = await db.insert(leadReplenishments).values({
      ...parsed.data,
      status: 'pending',
    })

    res.status(201).json({
      success: true,
      replenishment_id: (result as any)[0].insertId,
      remaining_replenishments: (therapist.replenishments_max ?? 3) - ((therapist.replenishments_used ?? 0) + 1),
    })
  } catch (error) {
    logger.error({ error }, '[Replenishment/Create] Erro')
    res.status(500).json({ error: 'Erro ao solicitar reposição' })
  }
})

// GET /api/assignments/replenishment
assignmentsRouter.get('/replenishment', async (req, res) => {
  try {
    const db = await getDb()
    const rows = await db
      .select({
        id: leadReplenishments.id,
        therapist_id: leadReplenishments.therapist_id,
        therapist_name: therapists.name,
        assignment_id: leadReplenishments.assignment_id,
        reason: leadReplenishments.reason,
        contacted_0h: leadReplenishments.contacted_0h,
        contacted_24h: leadReplenishments.contacted_24h,
        contacted_72h: leadReplenishments.contacted_72h,
        contacted_15d: leadReplenishments.contacted_15d,
        status: leadReplenishments.status,
        created_at: leadReplenishments.created_at,
      })
      .from(leadReplenishments)
      .leftJoin(therapists, eq(leadReplenishments.therapist_id, therapists.id))
      .orderBy(desc(leadReplenishments.created_at))
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar reposições' })
  }
})

// PATCH /api/assignments/replenishment/:id/approve
assignmentsRouter.patch('/replenishment/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

    const db = await getDb()
    const [req_row] = await db
      .select()
      .from(leadReplenishments)
      .where(eq(leadReplenishments.id, id))

    if (!req_row) {
      res.status(404).json({ error: 'Solicitação não encontrada' })
      return
    }

    await db
      .update(leadReplenishments)
      .set({ status: 'approved', resolved_at: new Date() })
      .where(eq(leadReplenishments.id, id))

    await db
      .update(therapists)
      .set({
        balance: sql`GREATEST(0, ${therapists.balance} + 1)`,
        replenishments_used: sql`${therapists.replenishments_used} + 1`,
      })
      .where(eq(therapists.id, req_row.therapist_id))

    res.json({ success: true, message: '1 lead creditado ao terapeuta' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar reposição' })
  }
})
