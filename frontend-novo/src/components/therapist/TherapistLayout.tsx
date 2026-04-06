import { useState, useEffect } from 'react'
import { NavLink, Outlet, useSearchParams } from 'react-router-dom'
import { User, GitMerge, Wallet, Heart, LogOut, Loader2 } from 'lucide-react'
import { api } from '../../api/client'
import { THERAPIST_TOKEN_KEY, ONBOARDING_KEY } from '../../constants/therapist'
import { LoginScreen } from './LoginScreen'
import { SetPasswordScreen } from './SetPasswordScreen'
import { OnboardingScreen } from './OnboardingScreen'
import { ForgotPasswordScreen } from './ForgotPasswordScreen'

const nav = [
  { to: '/terapeuta', label: 'Meu Perfil', icon: User, end: true },
  { to: '/terapeuta/atribuicoes', label: 'Atribuições', icon: GitMerge },
  { to: '/terapeuta/saldo', label: 'Meu Saldo', icon: Wallet },
]

export function TherapistLayout() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [authed, setAuthed] = useState(false)
  const [step, setStep] = useState<'login' | 'forgot-password' | 'set-password' | 'onboarding' | 'portal'>('login')
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
    return <LoginScreen onLogin={handleLoginSuccess} onForgotPassword={() => setStep('forgot-password')} />
  }

  if (step === 'forgot-password') {
    return <ForgotPasswordScreen onBack={() => setStep('login')} />
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
