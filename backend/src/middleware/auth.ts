import type { Request, Response, NextFunction } from 'express'

// Middleware de autenticação admin simples via header
// O frontend envia: Authorization: Bearer <ADMIN_SECRET>
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }

  const token = authHeader.slice(7)
  if (token !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: 'Token inválido' })
    return
  }

  next()
}

// Middleware de autenticação do terapeuta via token temporário
// O token é gerado pelo admin e enviado via ManyChat
export function therapistAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-therapist-token'] as string
  if (!token) {
    res.status(401).json({ error: 'Token de terapeuta ausente' })
    return
  }

  try {
    // Decode simples: base64(therapistId:timestamp)
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [idStr, timestamp] = decoded.split(':')
    const therapistId = parseInt(idStr)

    if (!therapistId || isNaN(therapistId)) {
      res.status(401).json({ error: 'Token inválido' })
      return
    }

    // Token expira em 30 dias
    const issued = parseInt(timestamp)
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    if (Date.now() - issued > thirtyDays) {
      res.status(401).json({ error: 'Token expirado' })
      return
    }

    (req as any).therapistId = therapistId
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido' })
  }
}

export function generateTherapistToken(therapistId: number): string {
  return Buffer.from(`${therapistId}:${Date.now()}`).toString('base64')
}
