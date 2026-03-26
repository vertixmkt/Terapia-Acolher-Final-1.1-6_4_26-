/**
 * Portal do Terapeuta — rotas autenticadas via token
 * Login via email ou WhatsApp (dados que vieram do Kiwify/cadastro)
 */

import { Router } from 'express'
import { getDb } from '../db/index.js'
import { therapists, assignments, patients, webhooksKiwify, leadReplenishments } from '../db/schema.js'
import { eq, desc, and, or } from 'drizzle-orm'
import { therapistAuth, generateTherapistToken, adminAuth } from '../middleware/auth.js'

export const therapistPortalRouter = Router()

// POST /api/therapist/login — login via email ou WhatsApp (público, sem auth)
therapistPortalRouter.post('/login', async (req, res) => {
  try {
    const { credential } = req.body
    if (!credential || typeof credential !== 'string' || credential.trim().length < 3) {
      res.status(400).json({ error: 'Informe seu e-mail ou WhatsApp' })
      return
    }

    const db = await getDb()
    const clean = credential.trim()
    const cleanDigits = clean.replace(/\D/g, '')

    // Buscar por email, whatsapp ou phone
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

    const token = generateTherapistToken(therapist.id)
    res.json({
      token,
      therapist: {
        id: therapist.id,
        name: therapist.name,
        status: therapist.status,
      },
    })
  } catch (error) {
    console.error('[Therapist/Login] Erro:', error)
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
      .where(eq(therapists.id, (req as any).therapistId))

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
    const db = await getDb()
    const id = (req as any).therapistId

    // Campos permitidos para auto-edição (status: ativo/inativo para férias/agenda cheia)
    const allowed = ['approach', 'specialties', 'shifts', 'serves_gender',
      'serves_children', 'serves_teens', 'serves_elderly', 'serves_lgbt', 'serves_couples', 'status']
    const data: Record<string, any> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key]
    }

    await db.update(therapists).set(data).where(eq(therapists.id, id))
    const [updated] = await db.select().from(therapists).where(eq(therapists.id, id))
    res.json(updated)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar perfil' })
  }
})

// GET /api/therapist/me/assignments — minhas atribuições
therapistPortalRouter.get('/me/assignments', therapistAuth, async (req, res) => {
  try {
    const db = await getDb()
    const id = (req as any).therapistId

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
      .where(eq(assignments.therapist_id, id))
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
    const id = (req as any).therapistId

    const [therapist] = await db
      .select({ balance: therapists.balance })
      .from(therapists)
      .where(eq(therapists.id, id))

    const purchases = await db
      .select()
      .from(webhooksKiwify)
      .where(eq(webhooksKiwify.therapist_id, id))
      .orderBy(desc(webhooksKiwify.created_at))

    const replenishments = await db
      .select()
      .from(leadReplenishments)
      .where(eq(leadReplenishments.therapist_id, id))
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
    const db = await getDb()
    const therapistId = (req as any).therapistId

    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.id, therapistId))

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

    const { assignment_id, reason, contacted_0h, contacted_24h, contacted_72h, contacted_15d } = req.body

    const result = await db.insert(leadReplenishments).values({
      therapist_id: therapistId,
      assignment_id,
      reason,
      contacted_0h: contacted_0h ?? false,
      contacted_24h: contacted_24h ?? false,
      contacted_72h: contacted_72h ?? false,
      contacted_15d: contacted_15d ?? false,
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

// POST /api/therapist/token/:id — admin gera token para enviar ao terapeuta via ManyChat
therapistPortalRouter.post('/token/:id', adminAuth, async (_req, res) => {
  const token = generateTherapistToken(parseInt(_req.params.id))
  res.json({ token, portal_url: `${process.env.FRONTEND_URL}/terapeuta?token=${token}` })
})
