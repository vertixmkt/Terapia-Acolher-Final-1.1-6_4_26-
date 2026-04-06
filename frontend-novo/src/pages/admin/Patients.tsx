import { useState, useEffect } from 'react'
import { Search, Users, AlertCircle, MessageCircle, Loader2 } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import { PatientModal } from '../../components/admin/PatientModal'
import type { Patient, Therapist } from '../../types'

const shiftLabel: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexível'
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100 tracking-tight">Pacientes</h1>
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
              {search || filterAssigned !== 'todos' ? (
                <>
                  <p className="text-sm">Nenhum resultado para esse filtro</p>
                  <button onClick={() => { setSearch(''); setFilterAssigned('todos') }} className="text-xs text-gray-500 hover:text-orange-400 mt-1 underline transition-colors">
                    Limpar filtros
                  </button>
                </>
              ) : (
                <p className="text-sm">Nenhum paciente cadastrado ainda</p>
              )}
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
