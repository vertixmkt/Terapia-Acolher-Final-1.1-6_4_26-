import { useState, useEffect } from 'react'
import { Search, UserCheck, Wallet, Edit2, Phone, ShieldCheck, Loader2, GraduationCap } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import { TherapistModal } from '../../components/admin/TherapistModal'
import type { Therapist, TherapistStatus } from '../../types'

const statusBadge: Record<TherapistStatus, { variant: 'green' | 'red' | 'yellow'; label: string }> = {
  ativo: { variant: 'green', label: 'Ativo' },
  inativo: { variant: 'red', label: 'Inativo' },
  pendente: { variant: 'yellow', label: 'Pendente' },
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100 tracking-tight">Terapeutas</h1>
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
                    <div className="flex items-center gap-1.5">
                      {t.manychat_subscriber_id ? <Badge variant="blue">Vinculado</Badge> : <Badge variant="red">Sem ID</Badge>}
                      {t.has_formation && (
                        <span title="Formação Rodrigo" className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-md text-xs text-orange-400">
                          <GraduationCap size={10} /> Form.
                        </span>
                      )}
                    </div>
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
              {search || filterStatus !== 'todos' || filterAudience !== 'todos' ? (
                <>
                  <p className="text-sm">Nenhum resultado para esse filtro</p>
                  <button onClick={() => { setSearch(''); setFilterStatus('todos'); setFilterAudience('todos') }} className="text-xs text-gray-500 hover:text-orange-400 mt-1 underline transition-colors">
                    Limpar filtros
                  </button>
                </>
              ) : (
                <p className="text-sm">Nenhum terapeuta cadastrado ainda</p>
              )}
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
