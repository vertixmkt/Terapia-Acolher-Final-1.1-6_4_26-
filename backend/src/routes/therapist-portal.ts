/**
 * Portal do Terapeuta — rotas autenticadas via token JWT
 */

import { Router } from 'express'
import { z } from 'zod'
import { scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'
import { getDb } from '../db/index.js'
import { therapists, assignments, patients, webhooksKiwify, leadReplenishments, passwordResetTokens } from '../db/schema.js'
import { eq, desc, or, and, gt } from 'drizzle-orm'
import { therapistAuth, generateTherapistToken, adminAuth } from '../middleware/auth.js'
import { logger } from '../lib/logger.js'
import { sendPasswordResetEmail } from '../services/email.js'

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buf = await scryptAsync(password, salt, 64) as Buffer
  return `${salt}:${(buf as Buffer).toString('hex')}`
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, hashed] = hash.split(':')
  const buf = await scryptAsync(password, salt, 64) as Buffer
  const hashedBuf = Buffer.from(hashed, 'hex')
  return timingSafeEqual(buf, hashedBuf)
}

export const therapistPortalRouter = Router()

const loginSchema = z.object({
  credential: z.string().min(3, 'Informe seu e-mail ou WhatsApp'),
  password: z.string().optional(),
})

const setPasswordSchema = z.object({
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
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

const forgotPasswordSchema = z.object({
  credential: z.string().min(3, 'Informe seu e-mail ou WhatsApp'),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token obrigatório'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
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

    if (therapist.status === 'inativo') {
      res.status(403).json({ error: 'Seu cadastro esta inativo. Entre em contato com o administrador.' })
      return
    }

    // Se já tem senha cadastrada, exigir a senha
    if (therapist.password_hash) {
      if (!parsed.data.password) {
        res.status(401).json({ error: 'Senha obrigatória', needs_password: true })
        return
      }
      const valid = await verifyPassword(parsed.data.password, therapist.password_hash)
      if (!valid) {
        res.status(401).json({ error: 'Senha incorreta' })
        return
      }
    }

    const token = await generateTherapistToken(therapist.id)

    const needs_password = !therapist.password_hash
    const needs_onboarding = !needs_password && (therapist.status === 'pendente' || !therapist.approach || !therapist.specialties?.length)

    res.json({
      token,
      needs_password,
      needs_onboarding,
      therapist: {
        id: therapist.id,
        name: therapist.name,
        status: therapist.status,
        gender: therapist.gender,
        approach: therapist.approach,
        specialties: therapist.specialties,
        shifts: therapist.shifts,
        serves_gender: therapist.serves_gender,
        serves_children: therapist.serves_children,
        serves_teens: therapist.serves_teens,
        serves_elderly: therapist.serves_elderly,
        serves_lgbt: therapist.serves_lgbt,
        serves_couples: therapist.serves_couples,
        has_formation: therapist.has_formation,
      },
    })
  } catch (error) {
    logger.error({ error }, '[Therapist/Login] Erro')
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

// POST /api/therapist/me/password — definir senha (primeiro acesso ou redefinição)
therapistPortalRouter.post('/me/password', therapistAuth, async (req, res) => {
  try {
    const parsed = setPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }
    const hash = await hashPassword(parsed.data.password)
    const db = await getDb()
    await db.update(therapists).set({ password_hash: hash }).where(eq(therapists.id, req.therapistId!))
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao definir senha' })
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

// PUT /api/therapist/me — atualizar próprio perfil (com auto-aprovação)
therapistPortalRouter.put('/me', therapistAuth, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Dados inválidos', details: parsed.error.errors })
      return
    }

    const db = await getDb()
    const [current] = await db.select().from(therapists).where(eq(therapists.id, req.therapistId!))

    const merged = { ...current, ...parsed.data }

    // Auto-aprovação: se pendente e perfil completo → ativo
    const profileComplete = (
      merged.approach && merged.approach.trim().length >= 2 &&
      Array.isArray(merged.specialties) && merged.specialties.length > 0 &&
      Array.isArray(merged.shifts) && merged.shifts.length > 0 &&
      merged.serves_gender
    )

    const updateData: any = { ...parsed.data }
    if (current.status === 'pendente' && profileComplete) {
      updateData.status = 'ativo'
      logger.info({ therapistId: req.therapistId }, '[Therapist/Onboarding] Perfil completo — aprovado automaticamente')
    }

    await db.update(therapists).set(updateData).where(eq(therapists.id, req.therapistId!))
    const [updated] = await db.select().from(therapists).where(eq(therapists.id, req.therapistId!))

    res.json({ ...updated, auto_approved: updateData.status === 'ativo' })
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

// ─── Recuperação de senha ────────────────────────────────────────────────────

// POST /api/therapist/forgot-password — solicitar reset de senha (público, sem auth)
therapistPortalRouter.post('/forgot-password', async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body)
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

    // Sempre retorna sucesso (não revela se o email existe)
    if (!therapist || !therapist.email) {
      logger.info({ credential: clean }, '[ForgotPassword] Terapeuta não encontrado ou sem email')
      res.json({ success: true, message: 'Se o e-mail estiver cadastrado, você receberá um link de redefinição.' })
      return
    }

    // Gerar token seguro
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await db.insert(passwordResetTokens).values({
      therapist_id: therapist.id,
      token,
      expires_at: expiresAt,
    })

    // Montar link de reset
    const frontendUrl = (process.env.FRONTEND_URL ?? '').split(',')[0].trim()
    const resetLink = `${frontendUrl}/terapeuta/reset-senha?token=${token}`

    await sendPasswordResetEmail(therapist.email, therapist.name, resetLink)

    logger.info({ therapistId: therapist.id }, '[ForgotPassword] Token gerado e email enviado')
    res.json({ success: true, message: 'Se o e-mail estiver cadastrado, você receberá um link de redefinição.' })
  } catch (error) {
    logger.error({ error }, '[ForgotPassword] Erro')
    res.status(500).json({ error: 'Erro ao processar solicitação' })
  }
})

// POST /api/therapist/reset-password — redefinir senha com token (público, sem auth)
therapistPortalRouter.post('/reset-password', async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message })
      return
    }

    const db = await getDb()

    // Buscar token válido (não usado, não expirado)
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, parsed.data.token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expires_at, new Date()),
        ),
      )
      .limit(1)

    if (!resetToken) {
      res.status(400).json({ error: 'Link inválido ou expirado. Solicite um novo.' })
      return
    }

    // Atualizar senha
    const hash = await hashPassword(parsed.data.password)
    await db.update(therapists).set({ password_hash: hash }).where(eq(therapists.id, resetToken.therapist_id))

    // Invalidar token
    await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, resetToken.id))

    logger.info({ therapistId: resetToken.therapist_id }, '[ResetPassword] Senha redefinida com sucesso')
    res.json({ success: true, message: 'Senha redefinida com sucesso. Faça login com sua nova senha.' })
  } catch (error) {
    logger.error({ error }, '[ResetPassword] Erro')
    res.status(500).json({ error: 'Erro ao redefinir senha' })
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
