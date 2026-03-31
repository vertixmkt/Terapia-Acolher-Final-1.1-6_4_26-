import { useState, useEffect } from 'react'
import { NavLink, Outlet, useSearchParams } from 'react-router-dom'
import { User, GitMerge, Wallet, Heart, LogOut, Loader2, Mail, Phone } from 'lucide-react'
import { api } from '../../api/client'

const THERAPIST_TOKEN_KEY = 'therapist_token'

const nav = [
  { to: '/terapeuta', label: 'Meu Perfil', icon: User, end: true },
  { to: '/terapeuta/atribuicoes', label: 'Atribuições', icon: GitMerge },
  { to: '/terapeuta/saldo', label: 'Meu Saldo', icon: Wallet },
]

function LoginScreen() {
  const [credential, setCredential] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!credential.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.therapistPortal.login(credential.trim())
      // sessionStorage: limpo ao fechar a aba/janela (mais seguro que localStorage)
      sessionStorage.setItem(THERAPIST_TOKEN_KEY, res.token)
      window.location.reload()
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
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
                onChange={e => setCredential(e.target.value)}
                placeholder="seu@email.com ou 51999999999"
                className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !credential.trim()}
            className="w-full py-3 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-medium hover:bg-orange-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Entrar
          </button>
        </form>

        <div className="flex items-start gap-2 text-xs text-gray-600 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
          <Phone size={12} className="flex-shrink-0 mt-0.5" />
          <p>Use o mesmo e-mail ou WhatsApp que voce usou na compra do pacote Kiwify ou no seu cadastro.</p>
        </div>
      </div>
    </div>
  )
}

export function TherapistLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [therapistName, setTherapistName] = useState('')

  useEffect(() => {
    async function check() {
      // 1. Se token vier na URL (link gerado pelo admin), salva em sessionStorage e limpa a URL
      const urlToken = searchParams.get('token')
      if (urlToken) {
        sessionStorage.setItem(THERAPIST_TOKEN_KEY, urlToken)
        searchParams.delete('token')
        setSearchParams(searchParams, { replace: true })
      }

      // 2. Verificar token armazenado
      const stored = sessionStorage.getItem(THERAPIST_TOKEN_KEY)
      if (!stored) {
        setChecking(false)
        return
      }

      try {
        const profile = await api.therapistPortal.getProfile()
        setTherapistName(profile.name || '')
        setAuthed(true)
      } catch {
        sessionStorage.removeItem(THERAPIST_TOKEN_KEY)
      } finally {
        setChecking(false)
      }
    }
    check()
  }, [])

  function handleLogout() {
    sessionStorage.removeItem(THERAPIST_TOKEN_KEY)
    setAuthed(false)
    setTherapistName('')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0C15' }}>
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  if (!authed) {
    return <LoginScreen />
  }

  const initials = therapistName ? therapistName.charAt(0).toUpperCase() : '?'

  return (
    <div className="min-h-screen" style={{ background: '#0B0C15' }}>
      <header className="border-b border-white/5" style={{ background: '#0d0e1a' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Heart size={14} className="text-orange-400" />
            </div>
            <span className="text-sm font-semibold text-gray-200">Terapia Acolher</span>
            <span className="text-xs text-gray-600 border border-white/10 rounded px-1.5 py-0.5 ml-1">Portal do Terapeuta</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="text-xs text-orange-400 font-bold">{initials}</span>
              </div>
              <span className="text-sm text-gray-400 hidden sm:block">{therapistName}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-600 hover:text-gray-400 rounded-lg hover:bg-white/5 transition-colors"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-white/5 sticky top-0 z-10" style={{ background: '#0d0e1a' }}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 sm:px-4 py-3.5 text-xs sm:text-sm border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                <Icon size={13} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
