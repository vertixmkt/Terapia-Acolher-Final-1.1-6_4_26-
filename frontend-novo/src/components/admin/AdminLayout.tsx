import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, UserCheck, GitMerge,
  ShoppingBag, Settings, Menu, X, Heart, ClipboardCheck, Zap,
  Loader2, LogOut, MessageSquare, Send,
} from 'lucide-react'
import { AdminLoginScreen } from './AdminLoginScreen'

const ADMIN_TOKEN_KEY = 'admin_jwt'
const ADMIN_INFO_KEY = 'admin_info'

function isAdminSubdomain() {
  return window.location.hostname.startsWith('admin.')
}

function getNav() {
  const base = isAdminSubdomain() ? '' : '/admin'
  return [
    { to: base || '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: `${base}/autorizacao`, label: 'Autorizacao', icon: ClipboardCheck },
    { to: `${base}/cadastro-rapido`, label: 'Cadastro Rapido', icon: Zap },
    { to: `${base}/pacientes`, label: 'Pacientes', icon: Users },
    { to: `${base}/terapeutas`, label: 'Terapeutas', icon: UserCheck },
    { to: `${base}/atribuicoes`, label: 'Atribuicoes', icon: GitMerge },
    { to: `${base}/matching`, label: 'Matching', icon: Heart },
    { to: `${base}/webhooks-recebidos`, label: 'MC Recebidos', icon: MessageSquare },
    { to: `${base}/webhooks-enviados`, label: 'MC Enviados', icon: Send },
    { to: `${base}/compras`, label: 'Compras Kiwify', icon: ShoppingBag },
    { to: `${base}/config`, label: 'Configuracoes', icon: Settings },
  ]
}

// Nav agora é dinâmico via getNav() — suporta subdomínio

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [adminInfo, setAdminInfo] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(ADMIN_TOKEN_KEY)
    const info = sessionStorage.getItem(ADMIN_INFO_KEY)
    if (stored) {
      setAuthed(true)
      if (info) try { setAdminInfo(JSON.parse(info)) } catch {}
    }
    setChecking(false)
  }, [])

  function handleLogin(token: string, admin: { name: string; email: string; role: string }) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    sessionStorage.setItem(ADMIN_INFO_KEY, JSON.stringify(admin))
    setAdminInfo(admin)
    setAuthed(true)
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
    sessionStorage.removeItem(ADMIN_INFO_KEY)
    setAdminInfo(null)
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
          {getNav().map(({ to, label, icon: Icon, end }) => (
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
          {getNav().map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
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
            <span className="text-xs text-gray-600 hidden sm:block">{adminInfo?.name || 'Admin'}</span>
            <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-xs text-orange-400 font-bold">{adminInfo?.name?.charAt(0)?.toUpperCase() || 'A'}</span>
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
