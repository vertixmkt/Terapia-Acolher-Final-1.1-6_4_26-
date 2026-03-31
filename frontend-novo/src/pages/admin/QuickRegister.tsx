import { useState } from 'react'
import { Loader2, CheckCircle2, UserPlus, Users, ArrowLeft, Plus } from 'lucide-react'
import { api } from '../../api/client'

type View = 'menu' | 'patient' | 'therapist'

const genderOptions = [
  { value: 'M', label: 'Homem' },
  { value: 'F', label: 'Mulher' },
  { value: 'NB', label: 'Nao-binario' },
]

const shiftOptions = [
  { value: 'manha', label: 'Manha' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
  { value: 'flexivel', label: 'Flexivel' },
]

const therapyForOptions = [
  { value: 'normal', label: 'Individual' },
  { value: 'casal', label: 'Casal' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'outra_pessoa', label: 'Para outra pessoa' },
]

const commonSpecialties = [
  'Ansiedade', 'Depressao', 'Relacionamentos', 'Autoestima',
  'Luto', 'Trauma', 'TOC', 'TDAH', 'Dependencia quimica',
  'Transtornos alimentares', 'Fobias', 'Burnout', 'Estresse',
]

const inputClass = 'w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors'
const labelClass = 'block text-xs text-gray-500 mb-1.5'
const selectClass = 'w-full px-3 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors appearance-none'

// ─── Patient Form ────────────────────────────────────────────────────────────

function PatientForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: 'M',
    preferred_gender: 'indifferent',
    shift: 'flexivel',
    reason: '',
    therapy_for: 'normal',
    child_name: '',
    child_age: '',
    relative_name: '',
    relative_phone: '',
  })

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        gender: form.gender,
        preferred_gender: form.preferred_gender,
        shift: form.shift,
        reason: form.reason.trim() || null,
        therapy_for: form.therapy_for,
      }
      if (form.therapy_for === 'infantil') {
        payload.child_name = form.child_name.trim() || null
        payload.child_age = form.child_age ? parseInt(form.child_age) : null
      }
      if (form.therapy_for === 'outra_pessoa') {
        payload.relative_name = form.relative_name.trim() || null
        payload.relative_phone = form.relative_phone.trim() || null
      }
      await api.patients.create(payload)
      onSuccess()
    } catch (err) {
      console.error('Erro ao cadastrar paciente:', err)
      alert('Erro ao cadastrar paciente')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest">Cadastro rapido</p>
          <h2 className="text-lg font-bold text-gray-100">Novo Paciente</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input className={inputClass} placeholder="Nome completo" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>WhatsApp / Telefone</label>
            <input className={inputClass} placeholder="(11) 99999-9999" value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Genero *</label>
            <select className={selectClass} value={form.gender} onChange={e => set('gender', e.target.value)}>
              {genderOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Preferencia de terapeuta</label>
            <select className={selectClass} value={form.preferred_gender} onChange={e => set('preferred_gender', e.target.value)}>
              <option value="indifferent">Indiferente</option>
              {genderOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Turno preferido</label>
            <select className={selectClass} value={form.shift} onChange={e => set('shift', e.target.value)}>
              {shiftOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Tipo de atendimento</label>
          <select className={selectClass} value={form.therapy_for} onChange={e => set('therapy_for', e.target.value)}>
            {therapyForOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {form.therapy_for === 'infantil' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <div>
              <label className={labelClass}>Nome da crianca</label>
              <input className={inputClass} placeholder="Nome" value={form.child_name} onChange={e => set('child_name', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Idade</label>
              <input className={inputClass} type="number" placeholder="Anos" value={form.child_age} onChange={e => set('child_age', e.target.value)} />
            </div>
          </div>
        )}

        {form.therapy_for === 'outra_pessoa' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
            <div>
              <label className={labelClass}>Nome do responsavel</label>
              <input className={inputClass} placeholder="Nome" value={form.relative_name} onChange={e => set('relative_name', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Telefone do responsavel</label>
              <input className={inputClass} placeholder="(11) 99999-9999" value={form.relative_phone} onChange={e => set('relative_phone', e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Motivo / Queixa</label>
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder="Descreva o motivo da busca por terapia..."
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
          />
          <p className="text-xs text-gray-600 mt-1">O motivo e usado pelo algoritmo de matching para encontrar o terapeuta mais adequado</p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="px-6 py-2.5 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-medium hover:bg-orange-500/25 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Cadastrar Paciente
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Therapist Form ──────────────────────────────────────────────────────────

function TherapistForm({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    gender: 'M',
    approach: '',
    serves_gender: 'todos',
    serves_children: false,
    serves_teens: false,
    serves_elderly: false,
    serves_lgbt: false,
    serves_couples: false,
    shifts: ['manha'] as string[],
    specialties: [] as string[],
    status: 'ativo',
    balance: '0',
  })

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }))

  function toggleShift(s: string) {
    setForm(prev => ({
      ...prev,
      shifts: prev.shifts.includes(s)
        ? prev.shifts.filter(x => x !== s)
        : [...prev.shifts, s],
    }))
  }

  function toggleSpecialty(s: string) {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter(x => x !== s)
        : [...prev.specialties, s],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.whatsapp.trim() || !form.approach.trim()) return
    setSaving(true)
    try {
      await api.therapists.create({
        name: form.name.trim(),
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim(),
        gender: form.gender,
        approach: form.approach.trim(),
        specialties: form.specialties,
        serves_gender: form.serves_gender,
        serves_children: form.serves_children,
        serves_teens: form.serves_teens,
        serves_elderly: form.serves_elderly,
        serves_lgbt: form.serves_lgbt,
        serves_couples: form.serves_couples,
        shifts: form.shifts.length > 0 ? form.shifts : ['manha'],
        status: form.status,
        balance: parseInt(form.balance) || 0,
      })
      onSuccess()
    } catch (err) {
      console.error('Erro ao cadastrar terapeuta:', err)
      alert('Erro ao cadastrar terapeuta')
    } finally {
      setSaving(false)
    }
  }

  const chipBase = 'px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-colors'
  const chipActive = 'bg-orange-500/15 text-orange-400 border-orange-500/30'
  const chipInactive = 'bg-white/[0.03] text-gray-500 border-white/10 hover:bg-white/[0.06]'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest">Cadastro rapido</p>
          <h2 className="text-lg font-bold text-gray-100">Novo Terapeuta</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
        {/* Basic info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input className={inputClass} placeholder="Nome completo" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>WhatsApp *</label>
            <input className={inputClass} placeholder="(11) 99999-9999" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} required />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <input className={inputClass} type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Genero *</label>
            <select className={selectClass} value={form.gender} onChange={e => set('gender', e.target.value)}>
              {genderOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Abordagem *</label>
            <input className={inputClass} placeholder="Ex: TCC, Psicanalise..." value={form.approach} onChange={e => set('approach', e.target.value)} required />
          </div>
        </div>

        {/* Status + Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status inicial</label>
            <select className={selectClass} value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ativo">Ativo (ja aprovado)</option>
              <option value="pendente">Pendente (aguardando aprovacao)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Saldo de leads</label>
            <input className={inputClass} type="number" min="0" placeholder="0" value={form.balance} onChange={e => set('balance', e.target.value)} />
          </div>
        </div>

        {/* Shifts */}
        <div>
          <label className={labelClass}>Turnos de atendimento</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {shiftOptions.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleShift(o.value)}
                className={`${chipBase} ${form.shifts.includes(o.value) ? chipActive : chipInactive}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Publico atendido */}
        <div>
          <label className={labelClass}>Publico atendido</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <div>
              <label className={`${labelClass} mb-1`}>Genero</label>
              <select className={selectClass} value={form.serves_gender} onChange={e => set('serves_gender', e.target.value)}>
                <option value="todos">Todos</option>
                {genderOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              {[
                { key: 'serves_children', label: 'Infantil' },
                { key: 'serves_teens', label: 'Adolescentes' },
                { key: 'serves_elderly', label: 'Idosos' },
                { key: 'serves_lgbt', label: 'LGBT+' },
                { key: 'serves_couples', label: 'Casais' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set(key, !(form as any)[key])}
                  className={`${chipBase} ${(form as any)[key] ? 'bg-green-500/15 text-green-400 border-green-500/30' : chipInactive}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div>
          <label className={labelClass}>Especialidades</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {commonSpecialties.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`${chipBase} ${form.specialties.includes(s) ? chipActive : chipInactive}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || !form.name.trim() || !form.whatsapp.trim() || !form.approach.trim()}
            className="px-6 py-2.5 bg-orange-500/15 text-orange-400 border border-orange-500/20 rounded-xl text-sm font-medium hover:bg-orange-500/25 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Cadastrar Terapeuta
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Success Screen ──────────────────────────────────────────────────────────

function SuccessScreen({ type, onBack }: { type: 'patient' | 'therapist'; onBack: () => void }) {
  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-6 py-16 text-center space-y-4">
      <CheckCircle2 size={40} className="text-green-500/60 mx-auto" />
      <div>
        <p className="text-base font-semibold text-gray-100">
          {type === 'patient' ? 'Paciente cadastrado!' : 'Terapeuta cadastrado!'}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {type === 'patient'
            ? 'O matching automatico ja foi disparado para encontrar o terapeuta ideal.'
            : 'O terapeuta esta disponivel no sistema.'}
        </p>
      </div>
      <button
        onClick={onBack}
        className="px-5 py-2 bg-white/[0.03] text-gray-400 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/[0.06] transition-colors"
      >
        Cadastrar outro
      </button>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function AdminQuickRegister() {
  const [view, setView] = useState<View>('menu')
  const [success, setSuccess] = useState<'patient' | 'therapist' | null>(null)

  if (success) {
    return (
      <div className="space-y-4 w-full">
        <SuccessScreen type={success} onBack={() => { setSuccess(null); setView('menu') }} />
      </div>
    )
  }

  if (view === 'patient') {
    return (
      <div className="w-full">
        <PatientForm onBack={() => setView('menu')} onSuccess={() => setSuccess('patient')} />
      </div>
    )
  }

  if (view === 'therapist') {
    return (
      <div className="w-full">
        <TherapistForm onBack={() => setView('menu')} onSuccess={() => setSuccess('therapist')} />
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Gestao</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100 tracking-tight">Cadastro Rapido</h1>
        <p className="text-sm text-gray-500 mt-1">Cadastre rapidamente pacientes ou terapeutas no sistema</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cadastrar Paciente */}
        <button
          onClick={() => setView('patient')}
          className="text-left bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:bg-white/[0.04] hover:border-orange-500/20 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center mb-4 group-hover:bg-orange-500/25 transition-colors">
            <UserPlus size={22} className="text-orange-400" />
          </div>
          <p className="text-base font-semibold text-gray-100 mb-1">Cadastrar Paciente</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Cadastre um novo paciente e receba automaticamente a sugestao do terapeuta mais adequado
          </p>
        </button>

        {/* Cadastrar Terapeuta */}
        <button
          onClick={() => setView('therapist')}
          className="text-left bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:bg-white/[0.04] hover:border-orange-500/20 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center mb-4 group-hover:bg-blue-500/25 transition-colors">
            <Users size={22} className="text-blue-400" />
          </div>
          <p className="text-base font-semibold text-gray-100 mb-1">Cadastrar Terapeuta</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Cadastre um novo terapeuta no sistema para disponibiliza-lo para atendimentos
          </p>
        </button>
      </div>
    </div>
  )
}
