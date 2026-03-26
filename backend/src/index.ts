import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { dashboardRouter } from './routes/dashboard.js'
import { therapistsRouter } from './routes/therapists.js'
import { patientsRouter } from './routes/patients.js'
import { assignmentsRouter } from './routes/assignments.js'
import { matchingRouter } from './routes/matching.js'
import { webhooksKiwifyRouter } from './routes/webhooks-kiwify.js'
import { webhooksManychatRouter } from './routes/webhooks-manychat.js'
import { therapistPortalRouter } from './routes/therapist-portal.js'
import { manychatConfigRouter } from './routes/manychat-config.js'

const app = express()
const PORT = process.env.PORT || 3000

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ─── Webhooks externos (sem admin auth) ───────────────────────────────────────

app.use('/api/webhooks/kiwify', webhooksKiwifyRouter)
app.use('/api/webhooks/manychat', webhooksManychatRouter)

// Alias compatível com URL do sistema antigo (ManyChat já configurado com essa rota)
app.post('/api/receber-paciente', (req, res, next) => {
  req.url = '/patient'
  webhooksManychatRouter(req, res, next)
})

// Cadastro público do terapeuta (P1)
app.use('/api/public', therapistsRouter)

// ─── Rotas admin ──────────────────────────────────────────────────────────────

app.use('/api/dashboard', dashboardRouter)
app.use('/api/therapists', therapistsRouter)
app.use('/api/patients', patientsRouter)
app.use('/api/assignments', assignmentsRouter)
app.use('/api/matching', matchingRouter)
app.use('/api/manychat', manychatConfigRouter)

// ─── Portal do terapeuta ──────────────────────────────────────────────────────

app.use('/api/therapist', therapistPortalRouter)

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' })
})

// ─── 404 handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' })
})

// ─── Error handler ────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err)
  res.status(500).json({ error: err.message || 'Erro interno' })
})

app.listen(PORT, () => {
  console.log(`✅ Backend Terapia Acolher rodando na porta ${PORT}`)
  console.log(`   Webhooks : POST /api/webhooks/kiwify`)
  console.log(`            : POST /api/webhooks/manychat/patient`)
  console.log(`            : POST /api/receber-paciente  (alias compatível)`)
  console.log(`   Admin    : /api/dashboard | /api/therapists | /api/patients`)
  console.log(`   ManyChat : GET/PUT /api/manychat/config`)
  console.log(`   Terapeuta: /api/therapist/me (token)`)
})
