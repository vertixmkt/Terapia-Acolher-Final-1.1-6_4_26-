import { useState } from 'react'
import { Loader2, Heart, CheckCircle, ChevronRight } from 'lucide-react'
import { api } from '../../api/client'
import { ONBOARDING_KEY, APPROACHES, SPECIALTIES, SHIFTS } from '../../constants/therapist'

export function OnboardingScreen({ therapistName, onComplete }: { therapistName: string; onComplete: () => void }) {
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
