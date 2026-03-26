import { useState, useEffect } from 'react'
import { Search, Users, AlertCircle, X, MessageCircle, Archive, Edit2, Check, Loader2 } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { Patient, Therapist } from '../../types'

const shiftLabel: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexível'
}
const genderLabel: Record<string, string> = {
  M: 'Masculino', F: 'Feminino', NB: 'Não-binário', indifferent: 'Indiferente'
}

function PatientModal({
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

export function AdminPatients() {
  const [search, setSearch] = useState('')
  const [filterAssigned, setFilterAssigned] = useState<'todos' | 'atribuido' | 'pendente'>('todos')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const [p, t] = await Promise.all([
        api.patients.list(),
        api.therapists.list(),
      ])
      setPatients(p)
      setTherapists(t)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function therapistName(id: number | null) {
    if (!id) return null
    return therapists.find(t => t.id === id)?.name ?? null
  }

  const filtered = patients.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.phone || '').includes(search)
    const matchAssigned =
      filterAssigned === 'todos' ||
      (filterAssigned === 'atribuido' && p.assigned_therapist_id !== null) ||
      (filterAssigned === 'pendente' && p.assigned_therapist_id === null)
    return matchSearch && matchAssigned
  })

  const pendingCount = patients.filter(p => p.assigned_therapist_id === null).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Gerenciar</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100">Pacientes</h1>
      </div>

      {pendingCount > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <AlertCircle size={15} className="text-orange-400" />
          <span className="text-sm text-orange-300">
            <strong>{pendingCount}</strong> pacientes sem terapeuta atribuído
          </span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-orange-500/40" />
        </div>
        <div className="flex gap-1.5">
          {(['todos', 'atribuido', 'pendente'] as const).map((s) => (
            <button key={s} onClick={() => setFilterAssigned(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filterAssigned === s ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-white/[0.03] text-gray-500 border border-white/5 hover:border-white/10'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Paciente</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium hidden sm:table-cell">Turno</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Terapeuta</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium hidden md:table-cell">Entrada</th>
                <th className="px-5 py-3.5 text-xs text-gray-600 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const tName = therapistName(p.assigned_therapist_id)
                return (
                  <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedPatient(p)}>
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-gray-200 font-medium">{p.name}</p>
                        <p className="text-xs text-gray-600">{p.phone}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <Badge variant="gray">{shiftLabel[p.shift] || p.shift}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {tName ? (
                        <div>
                          <p className="text-sm text-gray-300">{tName}</p>
                          <Badge variant="green">Atribuído</Badge>
                        </div>
                      ) : (
                        <Badge variant="yellow">Aguardando</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 hidden md:table-cell">
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <a href={`https://wa.me/55${p.phone}`} target="_blank" rel="noreferrer"
                          className="p-1.5 text-gray-600 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors" title="Enviar WhatsApp">
                          <MessageCircle size={15} />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-600">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p>Nenhum paciente encontrado</p>
            </div>
          )}
        </div>
      </Card>

      {selectedPatient && (
        <PatientModal patient={selectedPatient} therapists={therapists} onClose={() => setSelectedPatient(null)} onRefresh={loadData} />
      )}
    </div>
  )
}
