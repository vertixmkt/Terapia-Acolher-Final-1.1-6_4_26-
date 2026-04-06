import 'express'

declare global {
  namespace Express {
    interface Request {
      therapistId?: number
      requestId?: string
      adminRole?: string
      adminEmail?: string
      adminName?: string
    }
  }
}
