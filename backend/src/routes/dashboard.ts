import { Router } from 'express'
import { getDb } from '../db/index.js'
import { therapists, patients, assignments, matchingConfig } from '../db/schema.js'
import { eq, count, sql } from 'drizzle-orm'
import { adminAuth } from '../middleware/auth.js'

export const dashboardRouter = Router()

dashboardRouter.use(adminAuth)

dashboardRouter.get('/stats', async (_req, res) => {
  try {
    const db = await getDb()

    const [totalPatients] = await db.select({ count: count() }).from(patients)
    const [totalTherapistsActive] = await db
      .select({ count: count() })
      .from(therapists)
      .where(eq(therapists.status, 'ativo'))
    const [totalAssignments] = await db.select({ count: count() }).from(assignments)
    const [patientsWithout] = await db
      .select({ count: count() })
      .from(patients)
      .where(eq(patients.status, 'pendente'))
    const [lowBalance] = await db
      .select({ count: count() })
      .from(therapists)
      .where(sql`${therapists.balance} <= 2 AND ${therapists.status} = 'ativo'`)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todayAssignments] = await db
      .select({ count: count() })
      .from(assignments)
      .where(sql`${assignments.assigned_at} >= ${today}`)

    const [todayPatients] = await db
      .select({ count: count() })
      .from(patients)
      .where(sql`${patients.created_at} >= ${today}`)

    const [config] = await db.select().from(matchingConfig).limit(1)

    res.json({
      total_patients: totalPatients.count,
      total_therapists_active: totalTherapistsActive.count,
      total_assignments: totalAssignments.count,
      patients_without_therapist: patientsWithout.count,
      therapists_low_balance: lowBalance.count,
      today_assignments: todayAssignments.count,
      today_new_patients: todayPatients.count,
      match_mode: config?.mode ?? 'auto',
    })
  } catch (error) {
    console.error('[Dashboard] Erro:', error)
    res.status(500).json({ error: 'Erro ao buscar estatísticas' })
  }
})
