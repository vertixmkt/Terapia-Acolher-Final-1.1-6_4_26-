import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../db/index.js'
import { patients } from '../db/schema.js'
import { eq, like, or, desc, and } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { runAutoMatching } from '../services/matching.js'
import { logger } from '../lib/logger.js'

export const patientsRouter = Router()
patientsRouter.use(adminAuth)

// ─── Schemas ──────────────────────────────────────────────────────────────────

const patientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  gender: z.enum(['M', 'F', 'NB']).default('M'),
  preferred_gender: z.enum(['M', 'F', 'NB', 'indifferent']).default('indifferent'),
  shift: z.enum(['manha', 'tarde', 'noite', 'flexivel']).default('flexivel'),
  reason: z.string().optional(),
  therapy_for: z.enum(['normal', 'casal', 'infantil', 'outra_pessoa']).default('normal'),
  contact_when: z.string().optional(),
  child_name: z.string().optional(),
  child_age: z.number().int().positive().optional(),
  relative_name: z.string().optional(),
  relative_phone: z.string().optional(),
  manychat_subscriber_id: z.string().optional(),
})

const patientUpdateSchema = patientSchema.partial().extend({
  status: z.enum(['pendente', 'atribuido', 'arquivado']).optional(),
})

// GET /api/patients
patientsRouter.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const { search, status } = req.query as Record<string, string>

    let query = db.select().from(patients).$dynamic()

    const conditions = []
    if (search) {
      conditions.push(or(
        like(patients.name, `%${search}%`),
        like(patients.phone, `%${search}%`),
      ))
    }
    if (status) {
      conditions.push(eq(patients.status, status as 'pendente' | 'atribuido' | 'arquivado'))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const rows = await query.orderBy(desc(patients.created_at))
    res.json(rows)
  } catch (error) {
    logger.error({ error }, '[Patients/List] Erro')
    res.status(500).json({ error: 'Erro ao listar pacientes' })
  }
})

// GET /api/patients/:id
patientsRouter.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

    const db = await getDb()
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))

    if (!patient) {
      res.status(404).json({ error: 'Paciente não encontrado' })
      return
    }
    res.json(patient)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar paciente' })
  }
})

// POST /api/patients — criar manualmente (admin)
patientsRouter.post('/', async (req, res) => {
  try {
    const parsed = patientSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.errors })
      return
    }

    const db = await getDb()
    const result = await db.insert(patients).values({
      ...parsed.data,
      status: 'pendente',
    })
    const patientId = (result as any)[0].insertId
    const [created] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))

    runAutoMatching(patientId).catch(err =>
      logger.error({ error: err }, '[Patients/Create] Erro no matching automático')
    )

    res.status(201).json(created)
  } catch (error) {
    logger.error({ error }, '[Patients/Create] Erro')
    res.status(500).json({ error: 'Erro ao criar paciente' })
  }
})

// PUT /api/patients/:id — atualizar
patientsRouter.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

    const parsed = patientUpdateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.errors })
      return
    }

    const db = await getDb()
    await db.update(patients).set(parsed.data).where(eq(patients.id, id))
    const [updated] = await db.select().from(patients).where(eq(patients.id, id))
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar paciente' })
  }
})

// PATCH /api/patients/:id/archive
patientsRouter.patch('/:id/archive', async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    if (isNaN(id)) { res.status(400).json({ error: 'ID inválido' }); return }

    const db = await getDb()
    await db
      .update(patients)
      .set({ status: 'arquivado' })
      .where(eq(patients.id, id))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao arquivar paciente' })
  }
})
