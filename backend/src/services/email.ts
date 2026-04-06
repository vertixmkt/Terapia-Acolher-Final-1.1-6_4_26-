import { Resend } from 'resend'
import { logger } from '../lib/logger.js'

const FROM_ADDRESS = 'Terapia Acolher <noreply@terapiaacolher.com.br>'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    logger.warn('[Email] RESEND_API_KEY não configurada — emails desabilitados')
    return null
  }
  return new Resend(key)
}

export async function sendPasswordResetEmail(
  to: string,
  therapistName: string,
  resetLink: string,
): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  const firstName = therapistName.split(' ')[0]

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0B0C15;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0C15;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0d0e1a;border:1px solid rgba(255,255,255,0.05);border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:32px 32px 24px;text-align:center;">
          <div style="width:48px;height:48px;background:rgba(249,115,22,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:24px;">🧡</span>
          </div>
          <h1 style="margin:0;color:#f3f4f6;font-size:20px;font-weight:700;">Redefinir sua senha</h1>
          <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Terapia Acolher</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:0 32px 32px;">
          <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Olá, ${firstName}. Recebemos uma solicitação para redefinir a senha da sua conta no Portal do Terapeuta.
          </p>
          <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Clique no botão abaixo para criar uma nova senha. Este link expira em <strong style="color:#f3f4f6;">1 hora</strong>.
          </p>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${resetLink}" target="_blank" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
                Redefinir minha senha
              </a>
            </td></tr>
          </table>

          <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:24px 0 0;">
            Se você não solicitou essa redefinição, ignore este e-mail. Sua senha não será alterada.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;color:#4b5563;font-size:11px;text-align:center;">
            Terapia Acolher — Sistema de matching terapeutas × pacientes
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Redefinir sua senha — Terapia Acolher',
      html,
    })

    if (error) {
      logger.error({ error, to }, '[Email] Falha ao enviar email de reset')
      return false
    }

    logger.info({ to }, '[Email] Email de reset enviado')
    return true
  } catch (err) {
    logger.error({ error: err, to }, '[Email] Erro ao enviar email de reset')
    return false
  }
}

export async function sendAdminResetEmail(
  to: string,
  adminName: string,
  resetLink: string,
): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  const firstName = adminName.split(' ')[0]

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0B0C15;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0C15;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#0d0e1a;border:1px solid rgba(255,255,255,0.05);border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;text-align:center;">
          <div style="width:48px;height:48px;background:rgba(249,115,22,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:24px;">🔐</span>
          </div>
          <h1 style="margin:0;color:#f3f4f6;font-size:20px;font-weight:700;">Redefinir senha admin</h1>
          <p style="margin:8px 0 0;color:#6b7280;font-size:14px;">Terapia Acolher</p>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Olá, ${firstName}. Recebemos uma solicitação para redefinir a senha da sua conta de administrador.
          </p>
          <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Clique no botão abaixo para criar uma nova senha. Este link expira em <strong style="color:#f3f4f6;">1 hora</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${resetLink}" target="_blank" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px;">
                Redefinir minha senha
              </a>
            </td></tr>
          </table>
          <p style="color:#6b7280;font-size:12px;line-height:1.5;margin:24px 0 0;">
            Se você não solicitou essa redefinição, ignore este e-mail.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.05);">
          <p style="margin:0;color:#4b5563;font-size:11px;text-align:center;">
            Terapia Acolher — Sistema de matching terapeutas × pacientes
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Redefinir senha admin — Terapia Acolher',
      html,
    })
    if (error) {
      logger.error({ error, to }, '[Email] Falha ao enviar reset admin')
      return false
    }
    logger.info({ to }, '[Email] Reset admin enviado')
    return true
  } catch (err) {
    logger.error({ error: err, to }, '[Email] Erro ao enviar reset admin')
    return false
  }
}
