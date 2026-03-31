/**
 * Rota de autenticação
 * POST /api/auth/admin/login — emite JWT para o painel admin
 */

import { Router } from 'express'
import { z } from 'zod'
import { generateAdminToken, verifyAdminPassword } from '../middleware/auth.js'
import { logger } from '../lib/logger.js'

export const authRouter = Router()

const loginSchema = z.object({
  password: z.string().min(1, 'Senha obrigatória'),
})

authRouter.post('/admin/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: 'Senha obrigatória' })
      return
    }

    if (!verifyAdminPassword(parsed.data.password)) {
      // Log sem revelar qual credencial falhou
      logger.warn({ ip: req.ip, path: req.path }, 'Tentativa de login admin falhou')
      // Resposta genérica — não vazar se é senha ou usuário
      res.status(403).json({ error: 'Credenciais inválidas' })
      return
    }

    const token = await generateAdminToken()
    logger.info({ ip: req.ip }, 'Login admin bem-sucedido')
    res.json({ token })
  } catch (error) {
    logger.error({ error }, 'Erro no login admin')
    res.status(500).json({ error: 'Erro ao autenticar' })
  }
})
