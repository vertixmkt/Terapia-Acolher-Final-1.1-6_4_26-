import { Router } from 'express'
import { timingSafeEqual } from 'crypto'
import { getDb } from '../db/index.js'
import { webhooksKiwify, therapists } from '../db/schema.js'
import { eq, or, desc } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { matchPendingPatients } from '../services/matching.js'
import { logger } from '../lib/logger.js'

export const webhooksKiwifyRouter = Router()

// Mapeamento nome da oferta → quantidade de leads (P1)
// Pacotes atuais (mar/2026): Light(3), Regular(10), Mais(15), Máximo(20), 30 Contatos(30), 60 Contatos(60)
const OFFER_LEADS_MAP: Record<string, number> = {
  // ─── Pacotes atuais ────────────────────────────────────────────────────
  'ACOLHER LIGHT': 3,
  'ACOLHER REGULAR': 10,
  'ACOLHER MAIS': 15,
  'ACOLHER MÁXIMO': 20,
  'ACOLHER MAXIMO': 20,
  'ACOLHER 30 CONTATOS': 30,
  'ACOLHER 60 CONTATOS': 60,
  '30 CONTATOS': 30,
  '60 CONTATOS': 60,
  // ─── Nomes alternativos / legados ──────────────────────────────────────
  'LIGHT - 3 CONTATOS': 3,
  'REGULAR - 10 CONTATOS': 10,
  'MENSAL': 10,
  'MENSAL - 10 LEADS': 10,
  'SEMESTRAL': 60,
  'TRIMESTRAL': 30,
  '+5 CONTATOS': 5,
  'MAIS 5 CONTATOS': 5,
  '+10 CONTATOS': 10,
  'PACOTE 3 CONTATOS': 3,
  'PACOTE 10 CONTATOS': 10,
  'PACOTE 15 CONTATOS': 15,
  'PACOTE 20 CONTATOS': 20,
  'DE VOLTA - 12 CONTATOS': 12,
  'INFINITY': 25,
  'INFINITY TOP': 28,
  'DIA DAS MULHERES': 8,
  'PROMO DIA DAS MULHERES': 8,
}

function detectLeadsQty(offerName: string, productName: string): number {
  const normalized = (offerName || productName || '').toUpperCase().trim()
  const sortedKeys = Object.keys(OFFER_LEADS_MAP).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (normalized.includes(key)) return OFFER_LEADS_MAP[key]
  }
  // Fallback: tentar extrair número do nome ("PACOTE 20 CONTATOS")
  const match = normalized.match(/(\d+)\s*(CONTATOS?|LEADS?)/i)
  if (match) return parseInt(match[1])
  return 3 // padrão mínimo
}

// ─── Verificação de token Kiwify ──────────────────────────────────────────────
// Kiwify envia o token configurado no painel como query param ?token=xxx
// Se KIWIFY_WEBHOOK_TOKEN estiver configurado, verificamos com timing-safe

function verifyKiwifyToken(req: import('express').Request): boolean {
  const configuredToken = process.env.KIWIFY_WEBHOOK_TOKEN
  if (!configuredToken) return true // Token não configurado → aceitar (alertar via log)

  const incomingToken = (req.query.token as string) || (req.body?.token as string)

  if (!incomingToken) return false

  try {
    const a = Buffer.from(incomingToken)
    const b = Buffer.from(configuredToken)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// POST /api/webhooks/kiwify — receber compra (P1 + P6)
webhooksKiwifyRouter.post('/', async (req, res) => {
  // Verificar token Kiwify
  if (!verifyKiwifyToken(req)) {
    logger.warn({ ip: req.ip, requestId: req.requestId }, 'Webhook Kiwify: token inválido')
    res.status(401).json({ error: 'Token inválido' })
    return
  }

  // Alertar se token não configurado (produção deve sempre ter)
  if (!process.env.KIWIFY_WEBHOOK_TOKEN) {
    logger.warn('KIWIFY_WEBHOOK_TOKEN não configurado — webhooks aceitando sem verificação')
  }

  try {
    const db = await getDb()
    const body = req.body
    const order = body.order || body

    const {
      order_id,
      order_ref,
      order_status,
      Product,
      Customer,
      Subscription,
    } = order

    if (!order_id) {
      res.status(400).json({ error: 'order_id ausente' })
      return
    }

    // Ignorar se não for compra aprovada
    if (order_status !== 'paid') {
      res.json({ message: `Status ${order_status} ignorado` })
      return
    }

    const customer_email = Customer?.email || ''
    const customer_phone = (Customer?.mobile || '').replace(/\D/g, '')
    const customer_name = Customer?.full_name || Customer?.first_name || ''
    const product_name = Product?.product_name || ''
    const offer_name = Product?.product_offer_name || Subscription?.plan?.name || ''
    const amount = order.order_value || order.sale_value || 0

    const leads_qty = detectLeadsQty(offer_name, product_name)

    // Verificar duplicata
    const existing = await db
      .select()
      .from(webhooksKiwify)
      .where(eq(webhooksKiwify.order_id, order_id))
      .limit(1)

    if (existing.length > 0) {
      res.json({ message: 'Webhook já processado', order_id })
      return
    }

    // Buscar terapeuta pelo email ou telefone
    const conditions = []
    if (customer_email) conditions.push(eq(therapists.email, customer_email))
    if (customer_phone) conditions.push(eq(therapists.whatsapp, customer_phone))

    const existingTherapists = conditions.length > 0
      ? await db.select().from(therapists).where(or(...conditions)).limit(1)
      : []

    let therapist = existingTherapists[0] ?? null
    let processing_status: 'pending' | 'processed' | 'error' = 'pending'
    let therapist_id: number | undefined
    let auto_created = false

    if (therapist) {
      // Terapeuta já existe → creditar saldo
      await db
        .update(therapists)
        .set({ balance: (therapist.balance ?? 0) + leads_qty })
        .where(eq(therapists.id, therapist.id))

      processing_status = 'processed'
      therapist_id = therapist.id

      matchPendingPatients().catch(err =>
        logger.error({ error: err }, '[Webhook/Kiwify] Erro no matching automático')
      )
    } else if (customer_name && (customer_email || customer_phone)) {
      // Terapeuta não existe → criar automaticamente com dados da compra
      const result = await db.insert(therapists).values({
        name: customer_name,
        email: customer_email || null,
        whatsapp: customer_phone || '',
        phone: customer_phone || null,
        gender: 'F', // padrão — terapeuta corrige no onboarding
        approach: '',
        specialties: [],
        shifts: ['manha'],
        serves_gender: 'todos',
        status: 'pendente',
        balance: leads_qty,
      })

      therapist_id = (result as any)[0].insertId
      processing_status = 'processed'
      auto_created = true

      logger.info({ therapist_id, customer_name, leads_qty }, '[Webhook/Kiwify] Terapeuta criado automaticamente')
    }

    await db.insert(webhooksKiwify).values({
      order_id,
      order_ref,
      customer_name,
      customer_email,
      customer_phone,
      product_name,
      offer_name,
      leads_qty,
      amount,
      order_status,
      processing_status,
      therapist_id,
      raw_payload: body,
    })

    logger.info({ order_id, leads_qty, therapist_found: !!therapist, auto_created }, '[Webhook/Kiwify] Processado')
    res.json({ success: true, order_id, leads_qty, therapist_found: !!therapist || auto_created, auto_created, processing_status })
  } catch (error) {
    logger.error({ error, requestId: req.requestId }, '[Webhook/Kiwify] Erro')
    res.status(500).json({ error: 'Erro ao processar webhook' })
  }
})

// GET /api/webhooks/kiwify — listar todos (P6) — requer admin auth
webhooksKiwifyRouter.get('/', adminAuth, async (req, res) => {
  try {
    const db = await getDb()
    const { status, limit = '100' } = req.query as Record<string, string>

    let query = db
      .select()
      .from(webhooksKiwify)
      .orderBy(desc(webhooksKiwify.created_at))
      .limit(Math.min(parseInt(limit), 500))
      .$dynamic()

    if (status) {
      query = query.where(eq(webhooksKiwify.processing_status, status as 'pending' | 'processed' | 'error'))
    }

    const rows = await query
    res.json(rows)
  } catch (error) {
    logger.error({ error }, '[Webhook/Kiwify/List] Erro')
    res.status(500).json({ error: 'Erro ao listar webhooks Kiwify' })
  }
})
