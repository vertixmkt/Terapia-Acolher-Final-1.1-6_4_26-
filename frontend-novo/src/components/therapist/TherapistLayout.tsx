import { useState, useEffect } from 'react'
import { NavLink, Outlet, useSearchParams } from 'react-router-dom'
import { User, GitMerge, Wallet, Heart, LogOut, Loader2, Mail, Phone, CheckCircle, ChevronRight, Lock, Eye, EyeOff } from 'lucide-react'
import { api } from '../../api/client'

const THERAPIST_TOKEN_KEY = 'therapist_token'
const ONBOARDING_KEY = 'therapist_onboarding'

const nav = [
  { to: '/terapeuta', label: 'Meu Perfil', icon: User, end: true },
  { to: '/terapeuta/atribuicoes', label: 'Atribuições', icon: GitMerge },
  { to: '/terapeuta/saldo', label: 'Meu Saldo', icon: Wallet },
]

const APPROACHES = [
  'TCC', 'Psicanálise', 'Gestalt', 'Humanista', 'Sistêmica', 'Comportamental',
  'Cognitiva', 'Integrativa', 'Existencial', 'Analítica', 'EMDR', 'DBT', 'Outra',
]

const SPECIALTIES = [
  'Ansiedade', 'Depressão', 'Autoestima', 'Relacionamentos', 'Luto', 'Traumas',
  'Burnout', 'TOC', 'Pânico', 'Fobia', 'TEPT', 'Autoconhecimento', 'Estresse',
  'Vícios', 'Sexualidade', 'Identidade de gênero', 'Família', 'Carreira',
]

const SHIFTS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
  { value: 'flexivel', label: 'Flexível' },
]

function LoginScreen({ onLogin }: { onLogin: (token: string, needsPassword: boolean, needsOnboarding: boolean) => void }) {
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
        </form>

        <div className="flex items-start gap-2 text-xs text-gray-600 bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3">
          <Phone size={12} className="flex-shrink-0 mt-0.5" />
          <p>Use o mesmo e-mail ou WhatsApp que você usou na compra do pacote Kiwify.</p>
        </div>
      </div>
    </div>
  )
}

function SetPasswordScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('A senha deve ter no mínimo 8 caracteres'); return }
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setLoading(true)
    setError('')
    try {
      await api.therapistPortal.setPassword(password)
      onComplete()
    } catch (err: any) {
      setError(err.message || 'Erro ao definir senha')
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
            <p className="text-xl font-bold text-gray-100">Crie sua senha</p>
            <p className="text-sm text-gray-500 mt-1">Proteja seu acesso ao portal. Mínimo 8 caracteres.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Nova senha</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
                className="w-full pl-9 pr-10 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Confirme a senha</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
            Definir senha e continuar
          </button>
        </form>
      </div>
    </div>
  )
}

function OnboardingScreen({ therapistName, onComplete }: { therapistName: string; onComplete: () => void }) {
  const [form, setForm] = useState({
    gender: 'F' as 'M' | 'F' | 'NB',
    approach: '',
    specialties: [] as string[],
    shifts: [] as string[],
    serves_gender: 'todos' as 'M' | 'F' | 'NB' | 'todos',
    serves_children: false,
    serves_teens: false,
    serves_elderly: false,
    serves_lgbt: false,
    serves_couples: false,
    has_formation: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [approved, setApproved] = useState(false)

  function toggleSpecialty(s: string) {
    setForm(f => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter(x => x !== s)
        : [...f.specialties, s],
    }))
  }

  function toggleShift(s: string) {
    setForm(f => ({
      ...f,
      shifts: f.shifts.includes(s)
        ? f.shifts.filter(x => x !== s)
        : [...f.shifts, s],
    }))
  }

  const isValid = form.approach && form.specialties.length > 0 && form.shifts.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      const res = await api.therapistPortal.updateProfile(form)
      if (res.auto_approved || res.status === 'ativo') {
        setApproved(true)
        sessionStorage.removeItem(ONBOARDING_KEY)
        setTimeout(onComplete, 2500)
      } else {
        setError('Cadastro salvo. Aguarde a aprovação do administrador.')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil')
    } finally {
      setLoading(false)
    }
  }

  if (approved) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6" style={{ background: '#0B0C15' }}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-100">Cadastro aprovado!</p>
            <p className="text-sm text-gray-500 mt-1">Você já está na fila de matching. Entrando no portal...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ background: '#0B0C15' }}>
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Heart size={28} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-100">Olá, {therapistName.split(' ')[0]}!</p>
            <p className="text-sm text-gray-500 mt-1">Complete seu perfil para entrar na fila de pacientes.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Gênero */}
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-200">Seu gênero</p>
            <div className="flex gap-2">
              {[{ v: 'F', l: 'Feminino' }, { v: 'M', l: 'Masculino' }, { v: 'NB', l: 'Não-binário' }].map(({ v, l }) => (
                <button key={v} type="button"
                  onClick={() => setForm(f => ({ ...f, gender: v as any }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${form.gender === v ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Abordagem */}
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-200">Abordagem terapêutica <span className="text-orange-400">*</span></p>
            <div className="flex flex-wrap gap-2">
              {APPROACHES.map(a => (
                <button key={a} type="button"
                  onClick={() => setForm(f => ({ ...f, approach: a }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${form.approach === a ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Especialidades */}
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-200">Especialidades <span className="text-orange-400">*</span> <span className="text-gray-600 font-normal">(selecione quantas quiser)</span></p>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map(s => (
                <button key={s} type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${form.specialties.includes(s) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Turnos */}
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-200">Turnos de atendimento <span className="text-orange-400">*</span></p>
            <div className="flex gap-2">
              {SHIFTS.map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => toggleShift(value)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${form.shifts.includes(value) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Atende */}
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-200">Atendimento</p>

            <div className="space-y-2">
              <p className="text-xs text-gray-500">Atende qual gênero?</p>
              <div className="flex gap-2">
                {[{ v: 'todos', l: 'Todos' }, { v: 'F', l: 'Feminino' }, { v: 'M', l: 'Masculino' }].map(({ v, l }) => (
                  <button key={v} type="button"
                    onClick={() => setForm(f => ({ ...f, serves_gender: v as any }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all border ${form.serves_gender === v ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'serves_children', label: 'Crianças' },
                { key: 'serves_teens', label: 'Adolescentes' },
                { key: 'serves_elderly', label: 'Idosos' },
                { key: 'serves_lgbt', label: 'LGBTQIA+' },
                { key: 'serves_couples', label: 'Casais' },
              ].map(({ key, label }) => (
                <button key={key} type="button"
                  onClick={() => setForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                  className={`py-2 rounded-xl text-xs font-medium transition-all border ${(form as any)[key] ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Formação */}
          <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-semibold text-gray-200">Formação</p>
            <div className="flex gap-2">
              {[{ v: true, l: 'Tenho formação em psicologia/psicanálise' }, { v: false, l: 'Ainda em formação' }].map(({ v, l }) => (
                <button key={String(v)} type="button"
                  onClick={() => setForm(f => ({ ...f, has_formation: v }))}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all border ${form.has_formation === v ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full py-3.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
            Completar cadastro e entrar na fila
          </button>

          <p className="text-center text-xs text-gray-600">
            Campos marcados com <span className="text-orange-400">*</span> são obrigatórios
          </p>
        </form>
      </div>
    </div>
  )
}

export function TherapistLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [authed, setAuthed] = useState(false)
  const [step, setStep] = useState<'login' | 'set-password' | 'onboarding' | 'portal'>('login')
  const [checking, setChecking] = useState(true)
  const [therapistName, setTherapistName] = useState('')

  useEffect(() => {
    async function check() {
      const urlToken = searchParams.get('token')
      if (urlToken) {
        sessionStorage.setItem(THERAPIST_TOKEN_KEY, urlToken)
        searchParams.delete('token')
        setSearchParams(searchParams, { replace: true })
      }

      const stored = sessionStorage.getItem(THERAPIST_TOKEN_KEY)
      if (!stored) { setChecking(false); return }

      try {
        const profile = await api.therapistPortal.getProfile()
        setTherapistName(profile.name || '')
        const needsOnboarding = profile.status === 'pendente' || !profile.approach || !profile.specialties?.length
        setStep(needsOnboarding ? 'onboarding' : 'portal')
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
    sessionStorage.removeItem(ONBOARDING_KEY)
    setAuthed(false)
    setStep('login')
    setTherapistName('')
  }

  async function handleLoginSuccess(_token: string, needsPassword: boolean, needsOnboarding: boolean) {
    const profile = await api.therapistPortal.getProfile()
    setTherapistName(profile.name || '')
    setAuthed(true)
    if (needsPassword) setStep('set-password')
    else if (needsOnboarding) setStep('onboarding')
    else setStep('portal')
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0C15' }}>
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  if (!authed || step === 'login') {
    return <LoginScreen onLogin={handleLoginSuccess} />
  }

  if (step === 'set-password') {
    return <SetPasswordScreen onComplete={() => setStep('onboarding')} />
  }

  if (step === 'onboarding') {
    return (
      <OnboardingScreen
        therapistName={therapistName}
        onComplete={() => setStep('portal')}
      />
    )
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
