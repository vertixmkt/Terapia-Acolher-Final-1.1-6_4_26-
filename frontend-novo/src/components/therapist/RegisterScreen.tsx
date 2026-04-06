import { useState } from 'react'
import { Loader2, ArrowLeft, Heart, CheckCircle } from 'lucide-react'
import { api } from '../../api/client'

const SHIFTS = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
]

const SERVES = [
  { key: 'serves_children', label: 'Infantil' },
  { key: 'serves_teens', label: 'Adolescentes' },
  { key: 'serves_elderly', label: 'Idosos' },
  { key: 'serves_lgbt', label: 'LGBT+' },
  { key: 'serves_couples', label: 'Casais' },
]

export function RegisterScreen({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
    gender: '' as 'M' | 'F' | 'NB' | '',
    approach: '',
    shifts: [] as string[],
    serves_gender: 'todos' as 'M' | 'F' | 'NB' | 'todos',
    serves_homens: false,
    serves_mulheres: false,
    serves_children: false,
    serves_teens: false,
    serves_elderly: false,
    serves_lgbt: false,
    serves_couples: false,
    specialties: '' ,
    agreed_manual: false,
  })

  function update(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  function toggleShift(shift: string) {
    setForm(f => ({
      ...f,
      shifts: f.shifts.includes(shift) ? f.shifts.filter(s => s !== shift) : [...f.shifts, shift],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.whatsapp.trim() || !form.gender || !form.approach.trim()) {
      setError('Preencha todos os campos obrigatrios.')
      return
    }
    if (!form.serves_homens && !form.serves_mulheres) {
      setError('Selecione pelo menos um gnero que voc atende (Homens e/ou Mulheres).')
      return
    }
    if (form.shifts.length === 0) {
      setError('Selecione pelo menos um turno de atendimento.')
      return
    }
    if (!form.agreed_manual) {
      setError('Voc precisa concordar com o Manual do Parceiro para continuar.')
      return
    }

    setLoading(true)
    setError('')
    try {
      // Mapear serves_gender baseado nos checkboxes
      let serves_gender: 'M' | 'F' | 'todos' = 'todos'
      if (form.serves_homens && !form.serves_mulheres) serves_gender = 'M'
      else if (form.serves_mulheres && !form.serves_homens) serves_gender = 'F'

      const { serves_homens, serves_mulheres, specialties, agreed_manual, ...rest } = form
      await api.therapists.register({
        ...rest,
        serves_gender,
        specialties: specialties.trim() ? [specialties.trim()] : [],
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro.')
    } finally {
      setLoading(false)
    }
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
              <p className="text-xl font-bold text-gray-100">Cadastro realizado!</p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Seu perfil foi criado com sucesso. Agora voce pode fazer login para acessar o portal.
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="w-full py-3 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-medium hover:bg-orange-500/25 transition-colors"
          >
            Ir para o login
          </button>
        </div>
      </div>
    )
  }

  const inputClass = "w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
  const labelClass = "block text-xs text-gray-500 mb-1.5"
  const chipClass = (active: boolean) => `py-2 rounded-xl text-xs border transition-colors ${active ? 'border-orange-500/40 bg-orange-500/15 text-orange-400' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'}`
  const toggleBtnClass = (active: boolean) => `flex-1 py-2.5 rounded-xl text-sm border transition-colors ${active ? 'border-orange-500/40 bg-orange-500/15 text-orange-400' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'}`

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: '#0B0C15' }}>
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Heart size={28} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-100">Cadastro de Terapeuta</p>
            <p className="text-sm text-gray-500 mt-0.5">Preencha os dados abaixo para se cadastrar</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className={labelClass}>Nome Completo *</label>
            <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Seu nome completo" className={inputClass} />
          </div>

          {/* Genero */}
          <div>
            <label className={labelClass}>Genero</label>
            <div className="flex gap-3">
              {[{ v: 'M', l: 'Homem' }, { v: 'F', l: 'Mulher' }, { v: 'NB', l: 'Outro' }].map(g => (
                <button key={g.v} type="button" onClick={() => update('gender', g.v)} className={toggleBtnClass(form.gender === g.v)}>
                  {g.l}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className={labelClass}>WhatsApp *</label>
            <input value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} placeholder="55DDXXXXXXXXX (ex: 5511999887766)" className={inputClass} />
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>E-mail utilizado para compra</label>
            <input value={form.email} onChange={e => update('email', e.target.value)} placeholder="exemplo@email.com" type="email" className={inputClass} />
          </div>

          {/* Abordagem */}
          <div>
            <label className={labelClass}>Abordagem Terapeutica *</label>
            <input value={form.approach} onChange={e => update('approach', e.target.value)} placeholder="Ex: TCC, Psicanalise, Humanista..." className={inputClass} />
          </div>

          {/* Atende */}
          <div>
            <label className={labelClass}>Atende *</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => update('serves_homens', !form.serves_homens)} className={chipClass(form.serves_homens)}>
                Homens
              </button>
              <button type="button" onClick={() => update('serves_mulheres', !form.serves_mulheres)} className={chipClass(form.serves_mulheres)}>
                Mulheres
              </button>
              {SERVES.map(s => (
                <button key={s.key} type="button" onClick={() => update(s.key, !form[s.key as keyof typeof form])} className={chipClass(form[s.key as keyof typeof form] as boolean)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modalidade de Atendimento */}
          <div>
            <label className={labelClass}>Modalidade de Atendimento *</label>
            <div className="flex gap-3">
              <button type="button" className={toggleBtnClass(true)}>Online</button>
              <button type="button" className={toggleBtnClass(false)}>Presencial</button>
            </div>
          </div>

          {/* Turnos */}
          <div>
            <label className={labelClass}>Turnos de Atendimento *</label>
            <div className="flex gap-3">
              {SHIFTS.map(s => (
                <button key={s.value} type="button" onClick={() => toggleShift(s.value)} className={toggleBtnClass(form.shifts.includes(s.value))}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Especificidades */}
          <div>
            <label className={labelClass}>Especificidades</label>
            <textarea
              value={form.specialties}
              onChange={e => update('specialties', e.target.value)}
              placeholder="Fale um pouco sobre especializacoes, cursos, tipos de atendimentos diferenciados, etc..."
              rows={3}
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* Manual do Parceiro */}
          <div className={`rounded-xl border p-4 transition-colors ${form.agreed_manual ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.agreed_manual}
                onChange={e => update('agreed_manual', e.target.checked)}
                className="mt-1 accent-orange-500"
              />
              <div>
                <p className="text-sm font-semibold text-gray-200">Concordo com o Manual do Parceiro</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Ao prosseguir, declaro estar de acordo com as normas do Manual do Parceiro.
                  Compreendo que a responsabilidade do projeto e a <strong className="text-gray-300">captacao, triagem e envio</strong> de contatos qualificados,
                  enquanto o <strong className="text-gray-300">fechamento das sessoes e de minha exclusiva responsabilidade</strong> e nao possui garantia de conversao.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Realizar Cadastro
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={13} />
          Ja tenho conta — fazer login
        </button>
      </div>
    </div>
  )
}
