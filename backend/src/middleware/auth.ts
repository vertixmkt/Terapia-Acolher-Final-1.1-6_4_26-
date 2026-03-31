import type { Request, Response, NextFunction } from 'express'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { timingSafeEqual } from 'crypto'
import { logger } from '../lib/logger.js'

// ─── Segredo JWT ──────────────────────────────────────────────────────────────
// Exportado para uso na validação de env no boot
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return new TextEncoder().encode(secret)
}

const ADMIN_AUDIENCE = 'admin'
const THERAPIST_AUDIENCE = 'therapist'

// ─── Admin Auth ────────────────────────────────────────────────────────────────
// Verifica JWT assinado emitido pelo endpoint POST /api/auth/admin/login

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }

  const token = authHeader.slice(7)

  try {
    await jwtVerify(token, getJwtSecret(), { audience: ADMIN_AUDIENCE })
    next()
  } catch {
    logger.warn({ requestId: req.requestId, path: req.path }, 'adminAuth: token inválido')
    res.status(403).json({ error: 'Token inválido ou expirado' })
  }
}

// Gera token de admin com expiração de 8h
export async function generateAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('admin')
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getJwtSecret())
}

// ─── Therapist Auth ────────────────────────────────────────────────────────────
// Verifica JWT assinado emitido pelo endpoint POST /api/therapist/login

export async function therapistAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-therapist-token'] as string
  if (!token) {
    res.status(401).json({ error: 'Token de terapeuta ausente' })
    return
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      audience: THERAPIST_AUDIENCE,
    })

    const therapistId = parseInt(payload.sub ?? '')
    if (!therapistId || isNaN(therapistId)) {
      res.status(401).json({ error: 'Token inválido' })
      return
    }

    req.therapistId = therapistId
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

// Gera token de terapeuta com expiração de 30 dias
export async function generateTherapistToken(therapistId: number): Promise<string> {
  return new SignJWT({ role: 'therapist' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(therapistId))
    .setAudience(THERAPIST_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecret())
}

// ─── Admin Login Validator ────────────────────────────────────────────────────
// Comparação com timing-safe para prevenir timing attacks

export function verifyAdminPassword(input: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD ?? ''
  if (!adminPassword || !input) return false

  try {
    const a = Buffer.from(input)
    const b = Buffer.from(adminPassword)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
