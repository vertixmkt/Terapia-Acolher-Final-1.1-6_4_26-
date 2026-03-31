/**
 * Portal do Terapeuta — rotas autenticadas via token JWT
 */

import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../db/index.js'
import { therapists, assignments, patients, webhooksKiwify, leadReplenishments } from '../db/schema.js'
import { eq, desc, or } from 'drizzle-orm'
import { therapistAuth, generateTherapistToken, adminAuth } from '../middleware/auth.js'
import { logger } from '../lib/logger.js'

export const therapistPortalRouter = Router()

const loginSchema = z.object({
  credential: z.string().min(3, 'Informe seu e-mail ou WhatsApp'),
})

const updateProfileSchema = z.object({
  approach: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  shifts: z.array(z.enum(['manha', 'tarde', 'noite', 'flexivel'])).optional(),
  serves_gender: z.enum(['M', 'F', 'NB', 'todos']).optional(),
  serves_children: z.boolean().optional(),
  serves_teens: z.boolean().optional(),
  serves_elderly: z.boolean().optional(),
  serves_lgbt: z.boolean().optional(),
  serves_couples: z.boolean().optional(),
  status: z.enum(['ativo', 'inativo']).optional(), // terapeuta pode pausar atendimentos
})

const replenishmentSchema = z.object({
  assignment_id: z.number().int().positive(),
  reason: z.string().min(1).optional(),
  contacted_0h: z.boolean().default(false),
  contacted_24h: z.boolean().default(false),
  contacted_72h: z.boolean().default(false),
  contacted_15d: z.boolean().default(false),
})

// POST /api/therapist/login — login via email ou WhatsApp (público, sem auth)
therapistPortalRouter.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const db = await getDb()
    const clean = parsed.data.credential.trim()
    const cleanDigits = clean.replace(/\D/g, '')

    const conditions = [eq(therapists.email, clean)]
    if (cleanDigits.length >= 10) {
      conditions.push(eq(therapists.whatsapp, cleanDigits))
      conditions.push(eq(therapists.whatsapp, clean))
      conditions.push(eq(therapists.phone, cleanDigits))
      conditions.push(eq(therapists.phone, clean))
    }

    const [therapist] = await db
      .select()
      .from(therapists)
      .where(or(...conditions))
      .limit(1)

    if (!therapist) {
      res.status(404).json({ error: 'Nenhum terapeuta encontrado com esse e-mail ou WhatsApp' })
      return
    }

    if (therapist.status === 'pendente') {
      res.status(403).json({ error: 'Seu cadastro ainda esta pendente de aprovacao. Aguarde o contato do administrador.' })
      return
    }

    if (therapist.status === 'inativo') {
      res.status(403).json({ error: 'Seu cadastro esta inativo. Entre em contato com o administrador.' })
      return
    }

    const token = await generateTherapistToken(therapist.id)
    res.json({
      token,
      therapist: {
        id: therapist.id,
        name: therapist.name,
        status: therapist.status,
      },
    })
  } catch (error) {
    logger.error({ error }, '[Therapist/Login] Erro')
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

// GET /api/therapist/me — perfil próprio
therapistPortalRouter.get('/me', therapistAuth, async (req, res) => {
  try {
    const db = await getDb()
    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, req.therapistId!))

    if (!therapist) {
      res.status(404).json({ error: 'Terapeuta não encontrado' })
      return
    }

    res.json(therapist)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar perfil' })
  }
})

// PUT /api/therapist/me — atualizar próprio perfil
therapistPortalRouter.put('/me', therapistAuth, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.errors })
      return
    }

    const db = await getDb()
    await db.update(therapists).set(parsed.data).where(eq(therapists.id, req.therapistId!))
    const [updated] = await db.select().from(therapists).where(eq(therapists.id, req.therapistId!))
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' })
  }
})

// GET /api/therapist/me/assignments — minhas atribuições
therapistPortalRouter.get('/me/assignments', therapistAuth, async (req, res) => {
  try {
    const db = await getDb()

    const rows = await db
      .select({
        id: assignments.id,
        patient_id: assignments.patient_id,
        patient_name: patients.name,
        patient_phone: patients.phone,
        patient_gender: patients.gender,
        patient_shift: patients.shift,
        patient_reason: patients.reason,
        status: assignments.status,
        compatibility_score: assignments.compatibility_score,
        assigned_at: assignments.assigned_at,
      })
      .from(assignments)
      .leftJoin(patients, eq(assignments.patient_id, patients.id))
      .where(eq(assignments.therapist_id, req.therapistId!))
      .orderBy(desc(assignments.assigned_at))

    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar atribuições' })
  }
})

// GET /api/therapist/me/balance — histórico de saldo
therapistPortalRouter.get('/me/balance', therapistAuth, async (req, res) => {
  try {
    const db = await getDb()

    const [therapist] = await db
      .select({ balance: therapists.balance })
      .from(therapists)
      .where(eq(therapists.id, req.therapistId!))

    const purchases = await db
      .select()
      .from(webhooksKiwify)
      .where(eq(webhooksKiwify.therapist_id, req.therapistId!))
      .orderBy(desc(webhooksKiwify.created_at))

    const replenishments = await db
      .select()
      .from(leadReplenishments)
      .where(eq(leadReplenishments.therapist_id, req.therapistId!))
      .orderBy(desc(leadReplenishments.created_at))

    res.json({
      current_balance: therapist?.balance ?? 0,
      purchases,
      replenishments,
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar saldo' })
  }
})

// POST /api/therapist/me/replenishment — solicitar reposição de lead (P3)
therapistPortalRouter.post('/me/replenishment', therapistAuth, async (req, res) => {
  try {
    const parsed = replenishmentSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.errors })
      return
    }

    const db = await getDb()
    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, req.therapistId!))

    if (!therapist) {
      res.status(404).json({ error: 'Terapeuta não encontrado' })
      return
    }

    if ((therapist.replenishments_used ?? 0) >= (therapist.replenishments_max ?? 3)) {
      res.status(400).json({
        error: `Limite de ${therapist.replenishments_max} reposições atingido no ciclo atual`,
      })
      return
    }

    const result = await db.insert(leadReplenishments).values({
      therapist_id: req.therapistId!,
      ...parsed.data,
      status: 'pending',
    })

    res.status(201).json({
      success: true,
      replenishment_id: (result as any)[0].insertId,
      remaining: (therapist.replenishments_max ?? 3) - ((therapist.replenishments_used ?? 0) + 1),
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao solicitar reposição' })
  }
})

// ─── Admin: gerar token para terapeuta ────────────────────────────────────────

// POST /api/therapist/token/:id — admin gera link de acesso para o terapeuta
therapistPortalRouter.post('/token/:id', adminAuth, async (req, res) => {
  const therapistId = parseInt(req.params.id)
  if (isNaN(therapistId)) {
    res.status(400).json({ error: 'ID inválido' })
    return
  }

  const token = await generateTherapistToken(therapistId)
  res.json({ token, portal_url: `${process.env.FRONTEND_URL}/terapeuta?token=${token}` })
})
