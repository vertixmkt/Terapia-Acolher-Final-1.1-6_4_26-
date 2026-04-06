import type { Request, Response, NextFunction } from 'express'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { timingSafeEqual, randomBytes, scryptSync } from 'crypto'
import { logger } from '../lib/logger.js'

// ─── Segredo JWT ──────────────────────────────────────────────────────────────
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET não configurado')
  return new TextEncoder().encode(secret)
}

const ADMIN_AUDIENCE = 'admin'
const THERAPIST_AUDIENCE = 'therapist'

// ─── Admin Auth ────────────────────────────────────────────────────────────────

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Não autenticado' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { audience: ADMIN_AUDIENCE })
    // Injetar role e email no request
    req.adminRole = (payload.role as string) || 'operator'
    req.adminEmail = (payload.email as string) || ''
    req.adminName = (payload.name as string) || ''
    next()
  } catch {
    logger.warn({ requestId: req.requestId, path: req.path }, 'adminAuth: token inválido')
    res.status(403).json({ error: 'Token inválido ou expirado' })
  }
}

// Gera token de admin com role, email e nome
export async function generateAdminToken(
  adminId: number,
  email: string,
  name: string,
  role: string,
): Promise<string> {
  return new SignJWT({ role, email, name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(adminId))
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getJwtSecret())
}

// Middleware que restringe por role
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.adminRole
    if (!role || !allowedRoles.includes(role)) {
      res.status(403).json({ error: 'Permissão insuficiente' })
      return
    }
    next()
  }
}

// ─── Therapist Auth ────────────────────────────────────────────────────────────

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

export async function generateTherapistToken(therapistId: number): Promise<string> {
  return new SignJWT({ role: 'therapist' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(therapistId))
    .setAudience(THERAPIST_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecret())
}

// ─── Password Hashing ────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(input: string, stored: string): boolean {
  if (!input || !stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const inputHash = scryptSync(input, salt, 64).toString('hex')
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(inputHash, 'hex'))
  } catch {
    return false
  }
}

// ─── Legacy Admin Login Validator (manter compatibilidade) ───────────────────

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
