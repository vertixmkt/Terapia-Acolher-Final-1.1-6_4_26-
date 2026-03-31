import { useState, useEffect } from 'react'
import { Send, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { WebhookManychatSent } from '../../types'

const statusBadge: Record<string, { variant: 'green' | 'yellow' | 'red'; label: string }> = {
  success: { variant: 'green', label: 'Enviado' },
  skipped: { variant: 'yellow', label: 'Ignorado' },
  error:   { variant: 'red', label: 'Erro' },
}

const typeLabel: Record<string, string> = {
  notify_therapist: 'Notif. Terapeuta',
  notify_patient:   'Notif. Paciente',
}

export function AdminWebhooksManychatSent() {
  const [rows, setRows] = useState<WebhookManychatSent[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('')
  const [retrying, setRetrying] = useState<Record<number, boolean>>({})

  async function load(type?: string) {
    setLoading(true)
    try {
      const data = await api.webhooks.manychat.sent(type ? { type } : undefined)
      setRows(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(typeFilter || undefined) }, [typeFilter])

  async function handleRetry(id: number) {
    setRetrying(r => ({ ...r, [id]: true }))
    try {
      await api.webhooks.manychat.retry(id)
      await load(typeFilter || undefined)
    } catch (err) {
      console.error(err)
    } finally {
      setRetrying(r => ({ ...r, [id]: false }))
    }
  }

  return (
    <div className="space-y-4 w-full">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">ManyChat</p>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">ManyChat Enviados</h1>
        <p className="text-sm text-gray-500 mt-0.5">Notificações enviadas ao ManyChat para pacientes e terapeutas</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(['', 'notify_therapist', 'notify_patient'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              typeFilter === t
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                : 'text-gray-500 hover:text-gray-300 border-white/5 hover:border-white/10'
            }`}
          >
            {t === '' ? 'Todos' : typeLabel[t]}
          </button>
        ))}
        <button
          onClick={() => load(typeFilter || undefined)}
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
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Tipo</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Destinatário</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Atribuição</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Erro</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Data</th>
                  <th className="px-5 py-3.5 text-xs text-gray-600 font-medium text-left">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium ${r.type === 'notify_therapist' ? 'text-blue-400' : 'text-purple-400'}`}>
                        {typeLabel[r.type] || r.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-gray-200 font-medium text-sm">{r.recipient_name}</p>
                      {r.recipient_whatsapp && (
                        <p className="text-gray-600 font-mono text-xs">{r.recipient_whatsapp}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {r.assignment_id ? `#${r.assignment_id}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={statusBadge[r.status]?.variant || 'gray'}>
                        {statusBadge[r.status]?.label || r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-red-400 max-w-[160px] truncate" title={r.error_message || ''}>
                      {r.error_message || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-5 py-3.5">
                      {r.status !== 'success' && (
                        <button
                          onClick={() => handleRetry(r.id)}
                          disabled={retrying[r.id]}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-400 transition-colors px-2 py-1 rounded-lg hover:bg-orange-500/5 disabled:opacity-40"
                          title="Reenviar"
                        >
                          {retrying[r.id]
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
            {rows.length === 0 && (
              <div className="py-14 text-center text-gray-600">
                <Send size={30} className="mx-auto mb-2 opacity-30" />
                {typeFilter ? (
                  <>
                    <p className="text-sm">Nenhum envio do tipo "{typeLabel[typeFilter] || typeFilter}"</p>
                    <button onClick={() => setTypeFilter('')} className="text-xs text-gray-500 hover:text-orange-400 mt-1 underline transition-colors">
                      Ver todos
                    </button>
                  </>
                ) : (
                  <p className="text-sm">Nenhuma notificação enviada ainda</p>
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
