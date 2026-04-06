import { useState } from 'react'
import { Lock, Loader2, CheckCircle, ArrowLeft, Mail } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export function AdminLoginScreen({ onLogin }: { onLogin: (token: string, admin: { name: string; email: string; role: string }) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE_URL}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Credenciais inválidas')
        return
      }
      onLogin(data.token, data.admin)
    } catch {
      setError('Erro de conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotLoading(true)
    try {
      await fetch(`${BASE_URL}/api/auth/admin/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      })
      setForgotSent(true)
    } catch {
      setError('Erro ao enviar email')
    } finally {
      setForgotLoading(false)
    }
  }

  if (forgotSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-100">Verifique seu e-mail</p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. O link expira em 1 hora.
              </p>
            </div>
          </div>
          <button onClick={() => { setForgotSent(false); setForgotMode(false) }}
            className="w-full py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-400 hover:bg-white/[0.06] transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={14} /> Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  if (forgotMode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <Lock size={28} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-100">Esqueceu sua senha?</p>
              <p className="text-sm text-gray-500 mt-1">Informe seu e-mail de administrador.</p>
            </div>
          </div>
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  placeholder="seu@email.com" autoFocus type="email"
                  className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors" />
              </div>
            </div>
            <button type="submit" disabled={forgotLoading || !forgotEmail.trim()}
              className="w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
              {forgotLoading ? <Loader2 size={15} className="animate-spin" /> : null}
              Enviar link de redefinição
            </button>
          </form>
          <button onClick={() => setForgotMode(false)}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5">
            <ArrowLeft size={13} /> Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Lock size={28} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-100">Painel Admin</p>
            <p className="text-sm text-gray-500 mt-0.5">Terapia Acolher</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">E-mail</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }}
                placeholder="seu@email.com" autoFocus
                className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Senha</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Sua senha"
                className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors" />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading || !email.trim() || !password.trim()}
            className="w-full py-3 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-medium hover:bg-orange-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Entrar
          </button>

          <button type="button" onClick={() => setForgotMode(true)}
            className="w-full text-center text-xs text-gray-500 hover:text-orange-400 transition-colors">
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  )
}
