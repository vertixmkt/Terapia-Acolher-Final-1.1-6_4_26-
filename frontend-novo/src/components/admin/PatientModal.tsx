import { useState } from 'react'
import { X, MessageCircle, Archive, Edit2, Check, AlertCircle } from 'lucide-react'
import { api } from '../../api/client'
import type { Patient, Therapist } from '../../types'

const shiftLabel: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexível'
}
const genderLabel: Record<string, string> = {
  M: 'Masculino', F: 'Feminino', NB: 'Não-binário', indifferent: 'Indiferente'
}

export function PatientModal({
  patient,
  therapists,
  onClose,
  onRefresh,
}: {
  patient: Patient
  therapists: Therapist[]
  onClose: () => void
  onRefresh: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: patient.name,
    phone: patient.phone,
    reason: patient.reason,
  })
  const [manualTherapist, setManualTherapist] = useState<string>(
    patient.assigned_therapist_id ? String(patient.assigned_therapist_id) : ''
  )

  const assignedName = patient.assigned_therapist_id
    ? therapists.find(t => t.id === patient.assigned_therapist_id)?.name ?? null
    : null
  const activeTherapists = therapists.filter(t => t.status === 'ativo' && t.balance > 0)

  async function handleSave() {
    setSaving(true)
    try {
      await api.patients.update(patient.id, form)
      setEditing(false)
      onRefresh()
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAssign() {
    if (!manualTherapist) return
    setSaving(true)
    try {
      await api.matching.assign(patient.id, parseInt(manualTherapist))
      onRefresh()
      onClose()
    } catch (err) {
      console.error('Assign error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    setSaving(true)
    try {
      await api.patients.archive(patient.id)
      onRefresh()
      onClose()
    } catch (err) {
      console.error('Archive error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: '#0d0e1a' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-0.5">Ficha do paciente</p>
            <p className="text-base font-bold text-gray-100">{patient.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className={`p-2 rounded-lg text-sm transition-colors ${editing ? 'bg-orange-500/10 text-orange-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              <Edit2 size={15} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Nome</label>
              {editing ? (
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-gray-200 outline-none focus:border-orange-500/40" />
              ) : (
                <p className="text-sm text-gray-200">{patient.name}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Telefone</label>
              {editing ? (
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-gray-200 outline-none focus:border-orange-500/40" />
              ) : (
                <p className="text-sm text-gray-200">{patient.phone}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Gênero</label>
              <p className="text-sm text-gray-200">{genderLabel[patient.gender]}</p>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Terapeuta preferido</label>
              <p className="text-sm text-gray-200">{genderLabel[patient.preferred_gender]}</p>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Turno</label>
              <p className="text-sm text-gray-200">{shiftLabel[patient.shift]}</p>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Entrada</label>
              <p className="text-sm text-gray-200">{new Date(patient.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">Motivo do contato</label>
            {editing ? (
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
                className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-gray-200 outline-none focus:border-orange-500/40 resize-none" />
            ) : (
              <p className="text-sm text-gray-300 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2.5 leading-relaxed">{patient.reason}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-2">Terapeuta atribuído</label>
            {assignedName && !editing ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check size={13} className="text-green-400" />
                </div>
                <span className="text-sm text-gray-200 font-medium">{assignedName}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {!assignedName && (
                  <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                    <AlertCircle size={13} />
                    Sem terapeuta — selecione um para atribuição manual
                  </div>
                )}
                <select value={manualTherapist} onChange={e => setManualTherapist(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-orange-500/40"
                >
                  <option value="">Selecionar terapeuta...</option>
                  {activeTherapists.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.approach} (saldo: {t.balance})</option>
                  ))}
                </select>
                {manualTherapist && (
                  <button onClick={handleAssign} disabled={saving}
                    className="w-full py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                    <Check size={14} />
                    {saving ? 'Atribuindo...' : 'Confirmar atribuição manual'}
                  </button>
                )}
              </div>
            )}
          </div>

          {editing && (
            <div className="flex gap-2 pt-1">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button onClick={() => setEditing(false)}
                className="px-4 py-2.5 bg-white/[0.03] text-gray-400 border border-white/5 text-sm rounded-lg hover:bg-white/[0.06] transition-colors">
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/5 flex gap-2">
          <a href={`https://wa.me/55${patient.phone}`} target="_blank" rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm font-medium rounded-lg transition-colors">
            <MessageCircle size={15} /> WhatsApp
          </a>
          <button onClick={handleArchive} disabled={saving}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.03] border border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] text-sm rounded-lg transition-colors">
            <Archive size={15} /> Arquivar
          </button>
        </div>
      </div>
    </div>
  )
}
