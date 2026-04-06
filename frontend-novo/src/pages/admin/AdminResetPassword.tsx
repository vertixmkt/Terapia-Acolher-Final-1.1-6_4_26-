import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, Lock, CheckCircle, AlertTriangle, Heart } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export function AdminResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <p className="text-xl font-bold text-gray-100">Token inválido</p>
          <p className="text-sm text-gray-500">O link de redefinição está incompleto ou expirou.</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-100">Senha redefinida!</p>
              <p className="text-sm text-gray-500 mt-2">Agora você pode acessar o painel com sua nova senha.</p>
            </div>
          </div>
          <a href="/" className="block w-full py-3 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-medium text-center hover:bg-orange-500/25 transition-colors">
            Ir para o login
          </a>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Senha deve ter pelo menos 8 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não conferem.'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE_URL}/api/auth/admin/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao redefinir senha'); return }
      setSuccess(true)
    } catch { setError('Erro de conexão') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Heart size={28} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-100">Nova senha admin</p>
            <p className="text-sm text-gray-500 mt-0.5">Crie uma nova senha para o painel.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Nova senha</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Mínimo 8 caracteres" autoFocus
                className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Confirmar senha</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
                placeholder="Repita a senha"
                className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors" />
            </div>
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading || !password || !confirm}
            className="w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Redefinir senha
          </button>
        </form>
      </div>
    </div>
  )
}
