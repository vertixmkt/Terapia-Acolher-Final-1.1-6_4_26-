import { useState, useEffect } from 'react'
import { ShoppingBag, Loader2, RefreshCw, User, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { WebhookKiwify } from '../../types'

const processingBadge: Record<string, { variant: 'green' | 'yellow' | 'red'; label: string; icon: typeof CheckCircle }> = {
  processed: { variant: 'green', label: 'Vinculado',  icon: CheckCircle },
  pending:   { variant: 'yellow', label: 'Pendente',  icon: Clock },
  error:     { variant: 'red',    label: 'Erro',      icon: XCircle },
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function AdminPurchasesKiwify() {
  const [rows, setRows] = useState<WebhookKiwify[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  async function load(status?: string) {
    setLoading(true)
    try {
      const data = await api.webhooks.kiwify.list(status ? { status } : undefined)
      setRows(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(statusFilter || undefined) }, [statusFilter])

  const totalLeads = rows.reduce((sum, r) => sum + (r.leads_qty || 0), 0)
  const totalRevenue = rows.reduce((sum, r) => sum + (r.amount || 0), 0)
  const pendingCount = rows.filter(r => r.processing_status === 'pending').length

  return (
    <div className="space-y-4 w-full">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Kiwify</p>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Compras Kiwify</h1>
        <p className="text-sm text-gray-500 mt-0.5">Todas as compras recebidas da Kiwify</p>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-orange-400">{rows.length}</p>
          <p className="text-xs text-gray-600 mt-0.5">compras</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-green-400">{totalLeads}</p>
          <p className="text-xs text-gray-600 mt-0.5">leads emitidos</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center">
          <p className={`text-2xl font-black ${pendingCount > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>{pendingCount}</p>
          <p className="text-xs text-gray-600 mt-0.5">sem terapeuta</p>
        </div>
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
            {s === '' ? 'Todos' : processingBadge[s]?.label}
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

      {pendingCount > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 bg-yellow-500/5 border border-yellow-500/15 rounded-xl text-xs text-yellow-400">
          <Clock size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            <strong>{pendingCount} compra{pendingCount !== 1 ? 's' : ''}</strong> sem terapeuta vinculado.
            O vínculo ocorre automaticamente quando o terapeuta finaliza o cadastro com o mesmo e-mail ou WhatsApp da compra.
          </span>
        </div>
      )}

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
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Terapeuta</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Pacote</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Leads</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Valor</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs text-gray-600 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const ps = processingBadge[r.processing_status]
                  return (
                    <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <User size={11} className="text-gray-500" />
                          </div>
                          <div>
                            <p className="text-gray-200 font-medium text-sm">{r.customer_name || '—'}</p>
                            <p className="text-gray-600 text-xs">{r.customer_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-gray-300 text-sm">{r.offer_name || r.product_name || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xl font-black text-orange-400">{r.leads_qty}</span>
                        <span className="text-xs text-gray-600 ml-1">leads</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-300 font-medium">
                        {r.amount ? formatBRL(r.amount) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={ps?.variant || 'gray'}>
                          {ps?.label || r.processing_status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="py-14 text-center text-gray-600">
                <ShoppingBag size={30} className="mx-auto mb-2 opacity-30" />
                {statusFilter ? (
                  <>
                    <p className="text-sm">Nenhuma compra com status "{processingBadge[statusFilter]?.label}"</p>
                    <button onClick={() => setStatusFilter('')} className="text-xs text-gray-500 hover:text-orange-400 mt-1 underline transition-colors">
                      Ver todas
                    </button>
                  </>
                ) : (
                  <p className="text-sm">Nenhuma compra recebida ainda</p>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{rows.length} compra{rows.length !== 1 ? 's' : ''}</span>
          <span>Total: {formatBRL(totalRevenue)} · {totalLeads} leads</span>
        </div>
      )}
    </div>
  )
}
