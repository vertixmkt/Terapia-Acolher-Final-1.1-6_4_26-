import 'dotenv/config'
import { z } from 'zod'

// ─── Validação de variáveis de ambiente ───────────────────────────────────────
// Falha imediatamente se variáveis críticas estão ausentes

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  ADMIN_PASSWORD: z.string().optional(), // legacy — cada admin agora tem sua senha
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL é obrigatório'),
  PORT: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  KIWIFY_WEBHOOK_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
})

const envResult = envSchema.safeParse(process.env)
if (!envResult.success) {
  console.error('❌ Variáveis de ambiente inválidas ou ausentes:')
  envResult.error.errors.forEach(e => console.error(` · ${e.path.join('.')}: ${e.message}`))
  process.exit(1)
}

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { randomUUID } from 'crypto'
import { sql } from 'drizzle-orm'
import { logger } from './lib/logger.js'
import { getDb } from './db/index.js'
import { authRouter } from './routes/auth.js'
import { dashboardRouter } from './routes/dashboard.js'
import { therapistsRouter } from './routes/therapists.js'
import { patientsRouter } from './routes/patients.js'
import { assignmentsRouter } from './routes/assignments.js'
import { matchingRouter } from './routes/matching.js'
import { webhooksKiwifyRouter } from './routes/webhooks-kiwify.js'
import { webhooksManychatRouter } from './routes/webhooks-manychat.js'
import { therapistPortalRouter } from './routes/therapist-portal.js'
import { manychatConfigRouter } from './routes/manychat-config.js'
import { seedAdmins } from './db/seed-admins.js'

const app = express()
const PORT = process.env.PORT || 3000

// ─── Rate limiters ────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em 1 minuto.' },
})

const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})

const adminLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
})

// ─── Security headers ─────────────────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// ─── CORS ─────────────────────────────────────────────────────────────────────

const allowedOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sem origin (ex: curl, Postman, webhooks server-side)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origem não permitida — ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-therapist-token', 'x-request-id'],
}))

// ─── Request ID ───────────────────────────────────────────────────────────────

app.use((req, _res, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || randomUUID()
  next()
})

// ─── Request logging ──────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    logger.info({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
    }, 'request')
  })
  next()
})

// ─── Body parsers ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))

// ─── Auth ─────────────────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRouter)

// ─── Webhooks externos ────────────────────────────────────────────────────────

app.use('/api/webhooks/kiwify', webhookLimiter, webhooksKiwifyRouter)
app.use('/api/webhooks/manychat', webhookLimiter, webhooksManychatRouter)

// Alias compatível com sistema antigo (ManyChat já configurado com essa rota)
app.post('/api/receber-paciente', webhookLimiter, (req, res, next) => {
  req.url = '/patient'
  webhooksManychatRouter(req, res, next)
})

// Cadastro público do terapeuta (P1)
app.use('/api/public', adminLimiter, therapistsRouter)

// ─── Rotas admin ──────────────────────────────────────────────────────────────

app.use('/api/dashboard', adminLimiter, dashboardRouter)
app.use('/api/therapists', adminLimiter, therapistsRouter)
app.use('/api/patients', adminLimiter, patientsRouter)
app.use('/api/assignments', adminLimiter, assignmentsRouter)
app.use('/api/matching', adminLimiter, matchingRouter)
app.use('/api/manychat', adminLimiter, manychatConfigRouter)

// ─── Portal do terapeuta ──────────────────────────────────────────────────────

app.use('/api/therapist/login', authLimiter)
app.use('/api/therapist/forgot-password', authLimiter)
app.use('/api/therapist/reset-password', authLimiter)
app.use('/api/therapist', therapistPortalRouter)

// ─── Health check (com ping real no banco) ────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    const db = await getDb()
    await db.execute(sql`SELECT 1`)
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'error', error: 'Database unavailable' })
  }
})

// ─── Sync Manus (uso interno via cron) ────────────────────────────────────

app.post('/api/internal/sync-manus', async (req, res) => {
  try {
    const secret = req.headers['x-admin-secret']
    if (secret !== process.env.ADMIN_SECRET) {
      res.status(401).json({ error: 'Não autorizado' })
      return
    }

    // O body vem no formato tRPC: [{ result: { data: { json: [...] } } }]
    const items = req.body?.[0]?.result?.data?.json
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Dados inválidos' })
      return
    }

    const db = await getDb()
    const { therapists } = await import('./db/schema.js')
    const { eq } = await import('drizzle-orm')

    let imported = 0
    let skipped = 0

    for (const t of items) {
      if (!t.whatsapp) { skipped++; continue }

      const [existing] = await db
        .select({ id: therapists.id })
        .from(therapists)
        .where(eq(therapists.whatsapp, t.whatsapp))

      if (existing) { skipped++; continue }

      const genderMap: Record<string, string> = { homem: 'M', mulher: 'F', nao_binario: 'NB' }
      const gender = genderMap[t.genero] || 'F'

      let servesGender: 'M' | 'F' | 'NB' | 'todos' = 'todos'
      if (t.atendeHomens === 'sim' && t.atendeMulheres !== 'sim') servesGender = 'M'
      else if (t.atendeMulheres === 'sim' && t.atendeHomens !== 'sim') servesGender = 'F'

      let shifts: string[] = ['manha']
      try {
        const parsed = typeof t.turnosAtendimento === 'string'
          ? JSON.parse(t.turnosAtendimento) : t.turnosAtendimento
        if (Array.isArray(parsed) && parsed.length > 0) shifts = parsed
      } catch {}

      const hasProfile = t.abordagem && t.abordagem.trim().length >= 2
      const status = t.status === 'ativo' && hasProfile ? 'ativo' : 'pendente'

      await db.insert(therapists).values({
        name: (t.nome || '').trim(),
        email: t.email || null,
        whatsapp: t.whatsapp,
        gender: gender as any,
        approach: t.abordagem || '',
        specialties: [],
        serves_gender: servesGender,
        serves_children: t.atendeInfantil === 'sim',
        serves_teens: t.atendeAdolescentes === 'sim',
        serves_elderly: t.atendeIdosos === 'sim',
        serves_lgbt: t.atendeLgbt === 'sim',
        serves_couples: t.atendeCasais === 'sim',
        shifts,
        status: status as any,
        balance: t.saldoLeads ?? 0,
        manychat_subscriber_id: t.manychatSubscriberId || null,
      })
      imported++
    }

    logger.info({ imported, skipped }, '[Sync/Manus] Sync concluído')
    res.json({ imported, skipped, total: items.length })
  } catch (error: any) {
    logger.error({ error }, '[Sync/Manus] Erro')
    res.status(500).json({ error: error.message })
  }
})

// ─── 404 handler ──────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ requestId: req.requestId, error: err.message, stack: err.stack }, 'Unhandled error')
  // Nunca vazar stack trace em produção
  const message = process.env.NODE_ENV === 'production' ? 'Erro interno' : err.message
  res.status(500).json({ error: message })
})

app.listen(PORT, async () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV }, '✅ Backend Terapia Acolher iniciado')
  // Seed dos admins padrão (cria se não existem)
  await seedAdmins()
})
