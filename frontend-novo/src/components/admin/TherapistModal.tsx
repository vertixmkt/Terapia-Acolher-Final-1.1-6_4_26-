import { useState } from 'react'
import { X, Check, MessageCircle, ShieldCheck, GraduationCap } from 'lucide-react'
import { api } from '../../api/client'
import type { Therapist } from '../../types'

const shiftLabel: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexível'
}

export function TherapistModal({
  therapist,
  onClose,
  onRefresh,
}: {
  therapist: Therapist
  onClose: () => void
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: therapist.name,
    phone: therapist.phone,
    approach: therapist.approach,
    specialties: (therapist.specialties || []).join(', '),
    has_formation: therapist.has_formation ?? false,
  })

  const isPending = therapist.status === 'pendente'

  async function handleSave() {
    setSaving(true)
    try {
      await api.therapists.update(therapist.id, {
        ...form,
        specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
        has_formation: form.has_formation,
      })
      onRefresh()
      onClose()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAuthorize() {
    setSaving(true)
    try {
      await api.therapists.authorize(therapist.id, therapist.balance)
      onRefresh()
      onClose()
    } catch (err) {
      console.error('Authorize error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 overflow-hidden" style={{ background: '#0d0e1a' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-0.5">Ficha do terapeuta</p>
            <p className="text-base font-bold text-gray-100">{therapist.name}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>

        {isPending && (
          <div className="mx-5 mt-4 flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
            <ShieldCheck size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-300 font-medium">Aguardando autorização</p>
              <p className="text-xs text-yellow-400/70 mt-0.5">Este terapeuta ainda não foi ativado. Revise os dados e autorize o acesso.</p>
            </div>
          </div>
        )}

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-600 block mb-1">Nome completo</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-gray-200 outline-none focus:border-orange-500/40" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Telefone / WhatsApp</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-gray-200 outline-none focus:border-orange-500/40" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Abordagem</label>
              <input value={form.approach} onChange={e => setForm(f => ({ ...f, approach: e.target.value }))}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-gray-200 outline-none focus:border-orange-500/40" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-600 block mb-1">Especialidades (separadas por vírgula)</label>
              <input value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-gray-200 outline-none focus:border-orange-500/40" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg">
            <div className="flex items-center gap-2">
              <GraduationCap size={14} className={form.has_formation ? 'text-orange-400' : 'text-gray-600'} />
              <div>
                <p className="text-sm text-gray-200">Formação Rodrigo</p>
                <p className="text-xs text-gray-600 mt-0.5">Terapeuta tem prioridade no matching quando scores são iguais</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, has_formation: !f.has_formation }))}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${form.has_formation ? 'bg-orange-500' : 'bg-white/10'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.has_formation ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
              <p className="text-gray-600 mb-0.5">Saldo</p>
              <p className={`font-bold ${therapist.balance <= 2 ? 'text-red-400' : therapist.balance <= 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                {therapist.balance} créditos
              </p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
              <p className="text-gray-600 mb-0.5">Atribuições</p>
              <p className="font-bold text-gray-300">{therapist.total_assignments}</p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
              <p className="text-gray-600 mb-0.5">ManyChat</p>
              <p className={`font-bold ${therapist.manychat_subscriber_id ? 'text-green-400' : 'text-red-400'}`}>
                {therapist.manychat_subscriber_id ? 'Vinculado' : 'Sem ID'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-2">Turnos de atendimento</label>
            <div className="flex gap-1.5 flex-wrap">
              {(therapist.shifts || []).map(s => (
                <span key={s} className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 text-gray-400 rounded-full">
                  {shiftLabel[s] || s}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/5 flex gap-2">
          {isPending ? (
            <button onClick={handleAuthorize} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 disabled:opacity-50 text-sm font-semibold rounded-lg transition-colors">
              <ShieldCheck size={15} />
              {saving ? 'Autorizando...' : 'Autorizar terapeuta'}
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
              <Check size={15} />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          )}
          <a href={`https://wa.me/55${therapist.phone}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 hover:border-green-500/20 text-sm rounded-lg transition-colors">
            <MessageCircle size={15} />
          </a>
        </div>
      </div>
    </div>
  )
}
