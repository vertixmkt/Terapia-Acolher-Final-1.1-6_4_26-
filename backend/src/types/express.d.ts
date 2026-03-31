import 'express'

declare global {
  namespace Express {
    interface Request {
      therapistId?: number
      requestId?: string
    }
  }
}
