/**
 * Rota de autenticação admin
 * POST /api/auth/admin/login          — login por email + senha
 * POST /api/auth/admin/forgot         — envia link de reset por email
 * POST /api/auth/admin/reset-password — redefine senha via token
 * GET  /api/auth/admin/me             — retorna dados do admin logado
 */

import { Router } from 'express'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { generateAdminToken, verifyPassword, hashPassword, adminAuth } from '../middleware/auth.js'
import { getDb } from '../db/index.js'
import { adminUsers, adminResetTokens } from '../db/schema.js'
import { sendAdminResetEmail } from '../services/email.js'
import { logger } from '../lib/logger.js'

export const authRouter = Router()

// ─── Login por email + senha ─────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

authRouter.post('/admin/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Email e senha obrigatórios' })
      return
    }

    const db = await getDb()
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, parsed.data.email.toLowerCase().trim()))

    if (!admin || admin.status !== 'ativo') {
      logger.warn({ ip: req.ip, email: parsed.data.email }, 'Login admin falhou: email não encontrado')
      res.status(403).json({ error: 'Credenciais inválidas' })
      return
    }

    if (!admin.password_hash) {
      res.status(403).json({ error: 'Senha não definida. Use "Esqueci minha senha" para criar.' })
      return
    }

    if (!verifyPassword(parsed.data.password, admin.password_hash)) {
      logger.warn({ ip: req.ip, email: parsed.data.email }, 'Login admin falhou: senha incorreta')
      res.status(403).json({ error: 'Credenciais inválidas' })
      return
    }

    const token = await generateAdminToken(admin.id, admin.email, admin.name, admin.role!)
    logger.info({ ip: req.ip, email: admin.email, role: admin.role }, 'Login admin bem-sucedido')
    res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } })
  } catch (error) {
    logger.error({ error }, 'Erro no login admin')
    res.status(500).json({ error: 'Erro ao autenticar' })
  }
})

// ─── Dados do admin logado ───────────────────────────────────────────────────

authRouter.get('/admin/me', adminAuth, async (req, res) => {
  res.json({ name: req.adminName, email: req.adminEmail, role: req.adminRole })
})

// ─── Esqueci minha senha ─────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z.string().email(),
})

authRouter.post('/admin/forgot', async (req, res) => {
  try {
    const parsed = forgotSchema.safeParse(req.body)
    if (!parsed.success) {
      // Sempre retornar sucesso (não vazar se email existe)
      res.json({ success: true, message: 'Se o email estiver cadastrado, você receberá um link.' })
      return
    }

    const db = await getDb()
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, parsed.data.email.toLowerCase().trim()))

    if (!admin) {
      res.json({ success: true, message: 'Se o email estiver cadastrado, você receberá um link.' })
      return
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1h

    await db.insert(adminResetTokens).values({
      admin_id: admin.id,
      token,
      expires_at: expiresAt,
    })

    const allUrls = (process.env.FRONTEND_URL ?? '').split(',').map(u => u.trim())
    const adminUrl = allUrls.find(u => u.includes('admin.')) || allUrls[0] || ''
    const resetPath = adminUrl.includes('admin.') ? '/reset-senha' : '/admin/reset-senha'
    const resetLink = `${adminUrl}${resetPath}?token=${token}`

    await sendAdminResetEmail(admin.email, admin.name, resetLink)
    logger.info({ adminId: admin.id }, '[Auth/AdminForgot] Token gerado e email enviado')
    res.json({ success: true, message: 'Se o email estiver cadastrado, você receberá um link.' })
  } catch (error) {
    logger.error({ error }, '[Auth/AdminForgot] Erro')
    res.status(500).json({ error: 'Erro ao processar solicitação' })
  }
})

// ─── Redefinir senha ─────────────────────────────────────────────────────────

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

authRouter.post('/admin/reset-password', async (req, res) => {
  try {
    const parsed = resetSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }

    const db = await getDb()
    const [resetToken] = await db
      .select()
      .from(adminResetTokens)
      .where(and(
        eq(adminResetTokens.token, parsed.data.token),
        eq(adminResetTokens.used, false),
      ))

    if (!resetToken || new Date() > resetToken.expires_at!) {
      res.status(400).json({ error: 'Token inválido ou expirado' })
      return
    }

    const passwordHash = hashPassword(parsed.data.password)
    await db.update(adminUsers).set({ password_hash: passwordHash }).where(eq(adminUsers.id, resetToken.admin_id))
    await db.update(adminResetTokens).set({ used: true }).where(eq(adminResetTokens.id, resetToken.id))

    logger.info({ adminId: resetToken.admin_id }, '[Auth/AdminReset] Senha redefinida')
    res.json({ success: true, message: 'Senha redefinida com sucesso.' })
  } catch (error) {
    logger.error({ error }, '[Auth/AdminReset] Erro')
    res.status(500).json({ error: 'Erro ao redefinir senha' })
  }
})
