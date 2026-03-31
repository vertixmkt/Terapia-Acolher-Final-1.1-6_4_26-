import { useState, useEffect } from 'react'
import { MessageSquare, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { WebhookManychatReceived } from '../../types'

const statusBadge: Record<string, { variant: 'green' | 'yellow' | 'red'; label: string }> = {
  processed: { variant: 'green', label: 'Processado' },
  pending:   { variant: 'yellow', label: 'Pendente' },
  error:     { variant: 'red', label: 'Erro' },
}

const shiftLabel: Record<string, string> = {
  manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexível',
}

const genderLabel: Record<string, string> = {
  M: 'Masculino', F: 'Feminino', NB: 'Não-binário',
}

export function AdminWebhooksManychatReceived() {
  const [rows, setRows] = useState<WebhookManychatReceived[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  async function load(status?: string) {
    setLoading(true)
    try {
      const data = await api.webhooks.manychat.received(status ? { status } : undefined)
      setRows(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(statusFilter || undefined) }, [statusFilter])

  return (
    <div className="space-y-4 w-full">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">ManyChat</p>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">ManyChat Recebidos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Todos os pacientes recebidos via External Request do ManyChat</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['', 'pending', 'processed', 'error'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                : 'text-gray-500 hover:text-gray-300 border-white/5 hover:border-white/10'
            }`}
          >
            {s === '' ? 'Todos' : statusBadge[s]?.label}
          </button>
        ))}
        <button
          onClick={() => load(statusFilter || undefined)}
          className="ml-auto p-2 text-gray-600 hover:text-gray-400 rounded-lg hover:bg-white/5 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={22} className="animate-spin text-orange-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Nome</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Telefone</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Gênero</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Turno</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Motivo</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 text-gray-200 font-medium">{r.contact_name}</td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{r.contact_phone}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{genderLabel[r.gender || ''] || r.gender || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{shiftLabel[r.shift || ''] || r.shift || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[200px] truncate" title={r.reason || ''}>
                      {r.reason || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusBadge[r.processing_status]?.variant || 'gray'}>
                        {statusBadge[r.processing_status]?.label || r.processing_status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="py-14 text-center text-gray-600">
                <MessageSquare size={30} className="mx-auto mb-2 opacity-30" />
                {statusFilter ? (
                  <>
                    <p className="text-sm">Nenhum registro com status "{statusBadge[statusFilter]?.label}"</p>
                    <button onClick={() => setStatusFilter('')} className="text-xs text-gray-500 hover:text-orange-400 mt-1 underline transition-colors">
                      Ver todos
                    </button>
                  </>
                ) : (
                  <p className="text-sm">Nenhum webhook recebido ainda</p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <p className="text-xs text-gray-600 text-right">{rows.length} registro{rows.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
