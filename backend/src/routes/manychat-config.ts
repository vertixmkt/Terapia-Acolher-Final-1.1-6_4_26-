/**
 * Rota de configuração do ManyChat
 * API key, flow namespaces, IDs de tags e custom fields — tudo gerenciado via UI
 */

import { Router } from 'express'
import { getDb } from '../db/index.js'
import { manychatConfig, manychatSubscribers } from '../db/schema.js'
import { eq, desc } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'
import { getManychatConfig } from '../services/manychat.js'

export const manychatConfigRouter = Router()
manychatConfigRouter.use(adminAuth)

// GET /api/manychat/config — obter configuração atual
manychatConfigRouter.get('/config', async (_req, res) => {
  try {
    const db = await getDb()
    const [config] = await db.select().from(manychatConfig).limit(1)

    if (!config) {
      // Retornar valores padrão se não existir configuração
      res.json({
        api_key: '',
        flow_ns_notify_therapist: 'content20260219182249_152653',
        flow_ns_notify_patient: 'content20260219182249_152654',
        tag_id_new_patient: 81766426,
        tag_id_therapist_assigned: 81766427,
        cf_id_patient_name: 14362950,
        cf_id_patient_whatsapp: 14362951,
        cf_id_patient_shift: 14362952,
        cf_id_patient_reason: 14362953,
        cf_id_patient_assigned: 14300039,
        cf_id_therapist_name: 14045578,
        cf_id_therapist_whatsapp: 14045579,
        cf_id_therapist_assigned: 14061515,
        active: false,
      })
      return
    }

    // Ocultar API key completa na resposta (apenas mostrar se começa com os 4 primeiros chars)
    const safeConfig = {
      ...config,
      api_key: config.api_key ? `${config.api_key.slice(0, 6)}...` : '',
    }
    res.json(safeConfig)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configuração' })
  }
})

// PUT /api/manychat/config — salvar configuração
manychatConfigRouter.put('/config', async (req, res) => {
  try {
    const db = await getDb()
    const [existing] = await db.select().from(manychatConfig).limit(1)

    const data = req.body

    if (existing) {
      // Não sobrescrever API key se vier vazia ou mascarada
      if (!data.api_key || data.api_key.includes('...')) {
        delete data.api_key
      }
      await db.update(manychatConfig).set(data).where(eq(manychatConfig.id, existing.id))
    } else {
      await db.insert(manychatConfig).values(data)
    }

    const [updated] = await db.select().from(manychatConfig).limit(1)
    res.json({ success: true, config: { ...updated, api_key: updated?.api_key ? `${updated.api_key.slice(0, 6)}...` : '' } })
  } catch (error) {
    console.error('[ManyChat/Config] Erro ao salvar:', error)
    res.status(500).json({ error: 'Erro ao salvar configuração' })
  }
})

// POST /api/manychat/config/test — testar conexão com a API
manychatConfigRouter.post('/config/test', async (_req, res) => {
  try {
    const config = await getManychatConfig()
    if (!config) {
      res.status(400).json({ error: 'API key não configurada ou ManyChat desativado' })
      return
    }

    const response = await fetch('https://api.manychat.com/fb/page/getInfo', {
      headers: { Authorization: `Bearer ${config.api_key}` },
    })
    const data = await response.json() as any

    if (!response.ok || data.status === 'error') {
      res.status(400).json({ error: data.message || 'API Key inválida' })
      return
    }

    res.json({ success: true, page: data.data })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao testar conexão com ManyChat' })
  }
})

// ─── Subscribers ──────────────────────────────────────────────────────────────

// GET /api/manychat/subscribers — listar subscribers conhecidos
manychatConfigRouter.get('/subscribers', async (req, res) => {
  try {
    const db = await getDb()
    const rows = await db
      .select()
      .from(manychatSubscribers)
      .orderBy(desc(manychatSubscribers.created_at))
      .limit(200)
    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar subscribers' })
  }
})

// POST /api/manychat/subscribers — cadastrar subscriber manualmente
manychatConfigRouter.post('/subscribers', async (req, res) => {
  try {
    const db = await getDb()
    const { whatsapp, subscriber_id, name, therapist_id, patient_id } = req.body

    if (!whatsapp || !subscriber_id) {
      res.status(400).json({ error: 'whatsapp e subscriber_id são obrigatórios' })
      return
    }

    const clean = whatsapp.replace(/\D/g, '')
    const existing = await db
      .select()
      .from(manychatSubscribers)
      .where(eq(manychatSubscribers.whatsapp, clean))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(manychatSubscribers)
        .set({ subscriber_id, name, therapist_id, patient_id })
        .where(eq(manychatSubscribers.whatsapp, clean))
    } else {
      await db.insert(manychatSubscribers).values({
        whatsapp: clean, subscriber_id, name, therapist_id, patient_id,
      })
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar subscriber' })
  }
})
