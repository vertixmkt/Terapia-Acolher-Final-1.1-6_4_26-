import { useState, useEffect } from 'react'
import { Search, UserCheck, Wallet, X, Edit2, Check, Phone, MessageCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { Therapist, TherapistStatus } from '../../types'

const statusBadge: Record<TherapistStatus, { variant: 'green' | 'red' | 'yellow'; label: string }> = {
  ativo: { variant: 'green', label: 'Ativo' },
  inativo: { variant: 'red', label: 'Inativo' },
  pendente: { variant: 'yellow', label: 'Pendente' },
}

const shiftLabel: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexível'
}

function TherapistModal({
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
  })

  const isPending = therapist.status === 'pendente'

  async function handleSave() {
    setSaving(true)
    try {
      await api.therapists.update(therapist.id, {
        ...form,
        specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
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

type AudienceFilter = 'todos' | 'M' | 'F' | 'NB' | 'indifferent'

const audienceLabel: Record<AudienceFilter, string> = {
  todos: 'Todos', M: 'Homens', F: 'Mulheres', NB: 'Não-binário', indifferent: 'Indiferente',
}

export function AdminTherapists() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<TherapistStatus | 'todos'>('todos')
  const [filterAudience, setFilterAudience] = useState<AudienceFilter>('todos')
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null)
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    try {
      const data = await api.therapists.list()
      setTherapists(data)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const pendingCount = therapists.filter(t => t.status === 'pendente').length

  const filtered = therapists.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || (t.phone || '').includes(search)
    const matchStatus = filterStatus === 'todos' || t.status === filterStatus
    const matchAudience =
      filterAudience === 'todos' ||
      (filterAudience === 'indifferent' ? t.serves_gender === 'todos' : t.serves_gender === filterAudience || t.serves_gender === 'todos')
    return matchSearch && matchStatus && matchAudience
  })

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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100">Terapeutas</h1>
      </div>

      {pendingCount > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-yellow-500/15 transition-colors"
          onClick={() => setFilterStatus('pendente')}>
          <ShieldCheck size={15} className="text-yellow-400 flex-shrink-0" />
          <span className="text-sm text-yellow-300">
            <strong>{pendingCount}</strong> {pendingCount === 1 ? 'terapeuta aguardando' : 'terapeutas aguardando'} autorização — clique para filtrar
          </span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone..."
              className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-orange-500/40" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['todos', 'ativo', 'inativo', 'pendente'] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === s ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-white/[0.03] text-gray-500 border border-white/5 hover:border-white/10'
                }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-600">Público atendido:</span>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.entries(audienceLabel) as [AudienceFilter, string][]).map(([key, label]) => (
              <button key={key} onClick={() => setFilterAudience(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterAudience === key ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-white/[0.03] text-gray-500 border border-white/5 hover:border-white/10'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Terapeuta</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium hidden md:table-cell">Abordagem</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium hidden sm:table-cell">Saldo</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium hidden lg:table-cell">Atribuições</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Status</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium hidden md:table-cell">ManyChat</th>
                <th className="px-5 py-3.5 text-right text-xs text-gray-600 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedTherapist(t)}>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-gray-200 font-medium">{t.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={10} className="text-gray-600" />
                        <p className="text-xs text-gray-600">{t.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 hidden md:table-cell">{t.approach}</td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Wallet size={13} className={t.balance <= 2 ? 'text-red-400' : 'text-gray-500'} />
                      <span className={`font-bold ${t.balance <= 2 ? 'text-red-400' : t.balance <= 5 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {t.balance}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-400 hidden lg:table-cell">{t.total_assignments}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={statusBadge[t.status].variant}>{statusBadge[t.status].label}</Badge>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {t.manychat_subscriber_id ? <Badge variant="blue">Vinculado</Badge> : <Badge variant="red">Sem ID</Badge>}
                  </td>
                  <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {t.status === 'pendente' && (
                        <button onClick={() => setSelectedTherapist(t)} className="p-1.5 text-yellow-500 hover:text-yellow-300 rounded-lg hover:bg-yellow-500/10 transition-colors" title="Autorizar terapeuta">
                          <ShieldCheck size={15} />
                        </button>
                      )}
                      <button onClick={() => setSelectedTherapist(t)} className="p-1.5 text-gray-600 hover:text-gray-400 rounded-lg hover:bg-white/5 transition-colors" title="Editar terapeuta">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-600">
              <UserCheck size={32} className="mx-auto mb-2 opacity-30" />
              <p>Nenhum terapeuta encontrado</p>
            </div>
          )}
        </div>
      </Card>

      {selectedTherapist && (
        <TherapistModal therapist={selectedTherapist} onClose={() => setSelectedTherapist(null)} onRefresh={loadData} />
      )}
    </div>
  )
}
