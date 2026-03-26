import { Router } from 'express'
import { getDb } from '../db/index.js'
import { patients } from '../db/schema.js'
import { eq, like, or, desc, and } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { runAutoMatching } from '../services/matching.js'

export const patientsRouter = Router()
patientsRouter.use(adminAuth)

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
    console.error('[Patients/List] Erro:', error)
    res.status(500).json({ error: 'Erro ao listar pacientes' })
  }
})

// GET /api/patients/:id
patientsRouter.get('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, parseInt(req.params.id)))
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
    const db = await getDb()
    const result = await db.insert(patients).values({
      ...req.body,
      status: 'pendente',
    })
    const patientId = (result as any)[0].insertId
    const [created] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))

    // Disparar matching automático (não bloqueia a resposta)
    runAutoMatching(patientId).catch(err =>
      console.error('[Patients/Create] Erro no matching automático:', err)
    )

    res.status(201).json(created)
  } catch (error) {
    console.error('[Patients/Create] Erro:', error)
    res.status(500).json({ error: 'Erro ao criar paciente' })
  }
})

// PUT /api/patients/:id — atualizar
patientsRouter.put('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)
    const { id: _id, created_at, ...data } = req.body
    await db.update(patients).set(data).where(eq(patients.id, id))
    const [updated] = await db.select().from(patients).where(eq(patients.id, id))
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar paciente' })
  }
})

// PATCH /api/patients/:id/archive
patientsRouter.patch('/:id/archive', async (req, res) => {
  try {
    const db = await getDb()
    await db
      .update(patients)
      .set({ status: 'arquivado' })
      .where(eq(patients.id, parseInt(req.params.id)))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao arquivar paciente' })
  }
})
