import { useState } from 'react'
import { Loader2, Mail, Phone, Lock, Eye, EyeOff, Heart } from 'lucide-react'
import { api } from '../../api/client'
import { THERAPIST_TOKEN_KEY } from '../../constants/therapist'

export function LoginScreen({ onLogin, onForgotPassword }: { onLogin: (token: string, needsPassword: boolean, needsOnboarding: boolean) => void; onForgotPassword: () => void }) {
  const [credential, setCredential] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!credential.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.therapistPortal.login(credential.trim(), needsPassword ? password : undefined)
      sessionStorage.setItem(THERAPIST_TOKEN_KEY, res.token)
      onLogin(res.token, res.needs_password ?? false, res.needs_onboarding ?? false)
    } catch (err: any) {
      if (err.message?.includes('Senha obrigatória') || err.message?.includes('needs_password')) {
        setNeedsPassword(true)
        setError('')
      } else {
        setError(err.message || 'Erro ao fazer login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Heart size={28} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-100">Portal do Terapeuta</p>
            <p className="text-sm text-gray-500 mt-0.5">Terapia Acolher</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">E-mail ou WhatsApp</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                value={credential}
                onChange={e => { setCredential(e.target.value); setNeedsPassword(false); setError('') }}
                placeholder="seu@email.com ou 51999999999"
                className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
            </div>
          </div>

          {needsPassword && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  autoFocus
                  className="w-full pl-9 pr-10 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !credential.trim() || (needsPassword && !password)}
            className="w-full py-3 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-medium hover:bg-orange-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {needsPassword ? 'Entrar' : 'Continuar'}
          </button>

          {needsPassword && (
            <button
              type="button"
              onClick={onForgotPassword}
              className="w-full text-center text-xs text-gray-500 hover:text-orange-400 transition-colors"
            >
              Esqueci minha senha
            </button>
          )}
        </form>

        <div className="flex items-start gap-2 text-xs text-gray-600 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
          <Phone size={12} className="flex-shrink-0 mt-0.5" />
          <p>Use o mesmo e-mail ou WhatsApp que você usou na compra do pacote Kiwify.</p>
        </div>
      </div>
    </div>
  )
}
