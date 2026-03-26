import { Router } from 'express'
import { getDb } from '../db/index.js'
import { therapists, webhooksKiwify } from '../db/schema.js'
import { eq, like, or, desc, and, inArray } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { matchPendingPatients } from '../services/matching.js'
import { z } from 'zod'

export const therapistsRouter = Router()

// ─── Cadastro público (P1) — sem auth ────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().min(10),
  gender: z.enum(['M', 'F', 'NB']),
  approach: z.string().min(2),
  specialties: z.array(z.string()).default([]),
  serves_gender: z.enum(['M', 'F', 'NB', 'todos']).default('todos'),
  serves_children: z.boolean().default(false),
  serves_teens: z.boolean().default(false),
  serves_elderly: z.boolean().default(false),
  serves_lgbt: z.boolean().default(false),
  serves_couples: z.boolean().default(false),
  shifts: z.array(z.enum(['manha', 'tarde', 'noite', 'flexivel'])).default(['manha']),
})

therapistsRouter.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)
    const db = await getDb()

    // Inserir terapeuta com status pendente e saldo 0
    const result = await db.insert(therapists).values({
      ...data,
      status: 'pendente',
      balance: 0,
    })

    const therapistId = (result as any)[0].insertId

    // P1: Processar webhooks Kiwify pendentes para este email/whatsapp
    let leadsGranted = 0
    if (data.email || data.whatsapp) {
      const conditions = []
      if (data.email) conditions.push(eq(webhooksKiwify.customer_email, data.email))
      if (data.whatsapp) conditions.push(eq(webhooksKiwify.customer_phone, data.whatsapp))

      const pendingWebhooks = await db
        .select()
        .from(webhooksKiwify)
        .where(and(
          eq(webhooksKiwify.processing_status, 'pending'),
          or(...conditions)
        ))

      for (const wh of pendingWebhooks) {
        leadsGranted += wh.leads_qty ?? 0
        await db
          .update(webhooksKiwify)
          .set({
            processing_status: 'processed',
            therapist_id: therapistId,
            processed_at: new Date(),
          })
          .where(eq(webhooksKiwify.id, wh.id))
      }

      if (leadsGranted > 0) {
        await db
          .update(therapists)
          .set({ balance: leadsGranted })
          .where(eq(therapists.id, therapistId))
      }
    }

    // Se terapeuta recebeu saldo via Kiwify pendente → tentar matching
    if (leadsGranted > 0) {
      matchPendingPatients().catch(err =>
        console.error('[Therapists/Register] Erro no matching automático:', err)
      )
    }

    res.status(201).json({
      success: true,
      message: 'Cadastro realizado! Aguarde aprovação.',
      therapist_id: therapistId,
      leads_granted: leadsGranted,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Dados inválidos', details: error.errors })
      return
    }
    console.error('[Therapists/Register] Erro:', error)
    res.status(500).json({ error: 'Erro ao registrar terapeuta' })
  }
})

// ─── Rotas admin ──────────────────────────────────────────────────────────────

therapistsRouter.use(adminAuth)

// GET /api/therapists — listar todos
therapistsRouter.get('/', async (req, res) => {
  try {
    const db = await getDb()
    const { search, status } = req.query as Record<string, string>

    let query = db.select().from(therapists).$dynamic()

    const conditions = []
    if (search) {
      conditions.push(or(
        like(therapists.name, `%${search}%`),
        like(therapists.approach, `%${search}%`),
      ))
    }
    if (status) {
      conditions.push(eq(therapists.status, status as 'ativo' | 'inativo' | 'pendente'))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const rows = await query.orderBy(desc(therapists.created_at))
    res.json(rows)
  } catch (error) {
    console.error('[Therapists/List] Erro:', error)
    res.status(500).json({ error: 'Erro ao listar terapeutas' })
  }
})

// GET /api/therapists/:id
therapistsRouter.get('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, parseInt(req.params.id)))

    if (!therapist) {
      res.status(404).json({ error: 'Terapeuta não encontrado' })
      return
    }
    res.json(therapist)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar terapeuta' })
  }
})

// POST /api/therapists — criar (admin)
therapistsRouter.post('/', async (req, res) => {
  try {
    const db = await getDb()
    const result = await db.insert(therapists).values({
      ...req.body,
      status: req.body.status ?? 'pendente',
    })
    const [created] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, (result as any)[0].insertId))
    res.status(201).json(created)
  } catch (error) {
    console.error('[Therapists/Create] Erro:', error)
    res.status(500).json({ error: 'Erro ao criar terapeuta' })
  }
})

// PUT /api/therapists/:id — atualizar
therapistsRouter.put('/:id', async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)
    const { id: _id, created_at, ...data } = req.body

    await db.update(therapists).set(data).where(eq(therapists.id, id))
    const [updated] = await db.select().from(therapists).where(eq(therapists.id, id))
    res.json(updated)
  } catch (error) {
    console.error('[Therapists/Update] Erro:', error)
    res.status(500).json({ error: 'Erro ao atualizar terapeuta' })
  }
})

// PATCH /api/therapists/:id/authorize — aprovar cadastro
therapistsRouter.patch('/:id/authorize', async (req, res) => {
  try {
    const db = await getDb()
    const id = parseInt(req.params.id)
    const { balance } = req.body

    const updateData: Record<string, any> = { status: 'ativo' }
    if (balance !== undefined) updateData.balance = balance

    await db.update(therapists).set(updateData).where(eq(therapists.id, id))
    const [updated] = await db.select().from(therapists).where(eq(therapists.id, id))

    // Terapeuta ficou ativo → tentar atribuir pacientes pendentes
    matchPendingPatients().catch(err =>
      console.error('[Therapists/Authorize] Erro no matching automático:', err)
    )

    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao autorizar terapeuta' })
  }
})

// DELETE /api/therapists/:id — desativar (soft)
therapistsRouter.delete('/:id', async (req, res) => {
  try {
    const db = await getDb()
    await db
      .update(therapists)
      .set({ status: 'inativo' })
      .where(eq(therapists.id, parseInt(req.params.id)))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desativar terapeuta' })
  }
})
