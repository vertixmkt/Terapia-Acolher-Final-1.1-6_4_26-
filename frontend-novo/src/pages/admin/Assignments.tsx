import { Search, GitMerge, Bell, BellOff, Loader2, RotateCcw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { Assignment, AssignmentStatus } from '../../types'

const statusBadge: Record<AssignmentStatus, { variant: 'yellow' | 'green' | 'red'; label: string }> = {
  pendente: { variant: 'yellow', label: 'Pendente' },
  confirmado: { variant: 'green', label: 'Confirmado' },
  cancelado: { variant: 'red', label: 'Cancelado' },
}

export function AdminAssignments() {
  const [search, setSearch] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<Record<number, boolean>>({})

  async function loadData() {
    try {
      const data = await api.assignments.list()
      setAssignments(data)
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleRetry(assignmentId: number) {
    setRetrying(r => ({ ...r, [assignmentId]: true }))
    try {
      const sent = await api.webhooks.manychat.sent()
      const toRetry = (sent as any[]).filter(
        s => s.assignment_id === assignmentId && s.status !== 'success'
      )
      if (toRetry.length > 0) {
        await Promise.all(toRetry.map((s: any) => api.webhooks.manychat.retry(s.id)))
      }
      await loadData()
    } catch (err) {
      console.error('Retry error:', err)
    } finally {
      setRetrying(r => ({ ...r, [assignmentId]: false }))
    }
  }

  const filtered = assignments.filter((a) =>
    (a.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.therapist_name || '').toLowerCase().includes(search.toLowerCase())
  )

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
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Atribuições</h1>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por paciente ou terapeuta..."
          className="w-full pl-9 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-orange-500/40" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Paciente</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Terapeuta</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Score</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Status</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Notificações</th>
                <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Data</th>
                <th className="px-5 py-3.5 text-xs text-gray-600 font-medium text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5 text-gray-200">{a.patient_name}</td>
                  <td className="px-5 py-3.5 text-gray-300">{a.therapist_name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`font-bold text-sm ${(a.compatibility_score || 0) >= 90 ? 'text-green-400' : (a.compatibility_score || 0) >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {a.compatibility_score || 0}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={statusBadge[a.status]?.variant || 'gray'}>{statusBadge[a.status]?.label || a.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <span className={`flex items-center gap-1 text-xs ${a.notified_patient ? 'text-green-400' : 'text-red-400'}`}>
                        {a.notified_patient ? <Bell size={12} /> : <BellOff size={12} />} Paciente
                      </span>
                      <span className={`flex items-center gap-1 text-xs ${a.notified_therapist ? 'text-green-400' : 'text-red-400'}`}>
                        {a.notified_therapist ? <Bell size={12} /> : <BellOff size={12} />} Terapeuta
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-600">
                    {a.assigned_at ? new Date(a.assigned_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                  </td>
                  <td className="px-5 py-3.5">
                    {(!a.notified_patient || !a.notified_therapist) && (
                      <button
                        onClick={() => handleRetry(a.id)}
                        disabled={retrying[a.id]}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-400 transition-colors px-2 py-1 rounded-lg hover:bg-orange-500/5 disabled:opacity-40"
                        title="Reenviar notificações pendentes"
                      >
                        {retrying[a.id]
                          ? <Loader2 size={12} className="animate-spin" />
                          : <RotateCcw size={12} />
                        }
                        Reenviar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-600">
              <GitMerge size={32} className="mx-auto mb-2 opacity-30" />
              {search ? (
                <>
                  <p className="text-sm">Nenhum resultado para "{search}"</p>
                  <button onClick={() => setSearch('')} className="text-xs text-gray-500 hover:text-orange-400 mt-1 underline transition-colors">
                    Limpar busca
                  </button>
                </>
              ) : (
                <p className="text-sm">Nenhuma atribuição registrada ainda</p>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
