import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, GitMerge,
  ShoppingBag, Settings, Menu, X, Heart, ClipboardCheck, Zap,
  Lock, Loader2, LogOut, MessageSquare, Send,
} from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const ADMIN_TOKEN_KEY = 'admin_jwt'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/autorizacao', label: 'Autorizacao', icon: ClipboardCheck },
  { to: '/admin/cadastro-rapido', label: 'Cadastro Rapido', icon: Zap },
  { to: '/admin/pacientes', label: 'Pacientes', icon: Users },
  { to: '/admin/terapeutas', label: 'Terapeutas', icon: UserCheck },
  { to: '/admin/atribuicoes', label: 'Atribuicoes', icon: GitMerge },
  { to: '/admin/matching', label: 'Matching', icon: Heart },
  { to: '/admin/webhooks-recebidos', label: 'MC Recebidos', icon: MessageSquare },
  { to: '/admin/webhooks-enviados', label: 'MC Enviados', icon: Send },
  { to: '/admin/compras', label: 'Compras Kiwify', icon: ShoppingBag },
  { to: '/admin/config', label: 'Configuracoes', icon: Settings },
]

function AdminLoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BASE_URL}/api/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Senha inválida')
        return
      }
      onLogin(data.token)
    } catch {
      setError('Erro de conexão com o servidor')
    } finally {
      setLoading(false)
    }
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
            <label className="block text-xs text-gray-500 mb-1.5">Senha de administrador</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-medium hover:bg-orange-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Verificar se já existe um token de admin válido em sessão
    const stored = sessionStorage.getItem(ADMIN_TOKEN_KEY)
    if (stored) {
      setAuthed(true)
    }
    setChecking(false)
  }, [])

  function handleLogin(token: string) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    setAuthed(true)
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    setAuthed(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0C15' }}>
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  if (!authed) {
    return <AdminLoginScreen onLogin={handleLogin} />
  }

  const SidebarContent = ({ onNavClick }: { onNavClick?: () => void }) => (
    <>
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${desktopCollapsed && 'justify-center'}`}>
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
          <Heart size={16} className="text-orange-400" />
        </div>
        {!desktopCollapsed && (
          <div>
            <p className="text-xs font-bold text-gray-100 leading-none">Terapia</p>
            <p className="text-xs text-orange-400 leading-none mt-0.5">Acolher</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150
              ${isActive ? 'bg-orange-500/10 text-orange-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}
              ${desktopCollapsed && 'justify-center'}`
            }
            title={desktopCollapsed ? label : undefined}
          >
            <Icon size={17} className="flex-shrink-0" />
            {!desktopCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B0C15' }}>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col border-r border-white/5 transition-transform duration-200 md:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#0d0e1a' }}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Heart size={16} className="text-orange-400" />
            <span className="text-sm font-bold text-gray-100">Terapia Acolher</span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 text-gray-500 hover:text-gray-300">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${isActive ? 'bg-orange-500/10 text-orange-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'}`
              }
            >
              <Icon size={17} className="flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <aside
        className={`hidden md:flex flex-col border-r border-white/5 transition-all duration-200 flex-shrink-0
          ${desktopCollapsed ? 'w-16' : 'w-56'}`}
        style={{ background: '#0d0e1a' }}
      >
        <SidebarContent />
        <button
          onClick={() => setDesktopCollapsed(!desktopCollapsed)}
          className={`m-2 p-2 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/[0.03] transition-colors ${desktopCollapsed && 'self-center'}`}
        >
          {desktopCollapsed ? <Menu size={16} /> : <X size={16} />}
        </button>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-white/5 flex items-center px-4 justify-between flex-shrink-0" style={{ background: '#0d0e1a' }}>
          <button
            className="md:hidden p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={18} />
          </button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 uppercase tracking-widest hidden sm:block">Admin</span>
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-xs text-orange-400 font-bold">A</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-600 hover:text-gray-400 rounded-lg hover:bg-white/5 transition-colors"
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
