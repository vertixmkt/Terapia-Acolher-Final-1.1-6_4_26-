/**
 * Seed de administradores — cria os admins padrão se não existirem
 * Chamado no boot do servidor
 */

import { getDb } from './index.js'
import { adminUsers } from './schema.js'
import { eq } from 'drizzle-orm'
import { logger } from '../lib/logger.js'

const DEFAULT_ADMINS = [
  { email: 'matheuspnh@gmail.com', name: 'Matheus Pinheiro', role: 'super_admin' as const },
  { email: 'rodrigosilmen@gmail.com', name: 'Rodrigo', role: 'super_admin' as const },
  { email: 'projetopsicoterapia.acolher@gmail.com', name: 'Projeto Acolher', role: 'super_admin' as const },
  { email: 'anapaulaoliveirasilva764@gmail.com', name: 'Ana Paula', role: 'operator' as const },
]

export async function seedAdmins() {
  try {
    const db = await getDb()
    let created = 0

    for (const admin of DEFAULT_ADMINS) {
      const [existing] = await db
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(eq(adminUsers.email, admin.email))

      if (!existing) {
        await db.insert(adminUsers).values({
          email: admin.email,
          name: admin.name,
          role: admin.role,
          status: 'ativo',
          // password_hash null — admin precisa usar "Esqueci minha senha" pra definir
        })
        created++
        logger.info({ email: admin.email, role: admin.role }, '[Seed] Admin criado')
      }
    }

    if (created > 0) {
      logger.info({ created }, '[Seed] Admins criados — precisam definir senha via "Esqueci minha senha"')
    }
  } catch (error) {
    logger.error({ error }, '[Seed] Erro ao criar admins')
  }
}
