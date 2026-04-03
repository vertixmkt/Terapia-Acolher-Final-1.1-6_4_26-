import { useState, useEffect } from 'react'
import {
  Users, UserCheck, GitMerge, AlertTriangle,
  TrendingUp, ShoppingBag, Loader2
} from 'lucide-react'
import { StatCard } from '../../components/ui/StatCard'
import { Card, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../api/client'
import type { DashboardStats, MatchingDecision, KiwifyPurchase } from '../../types'

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [matchingLog, setMatchingLog] = useState<MatchingDecision[]>([])
  const [purchases, setPurchases] = useState<KiwifyPurchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, log, purch] = await Promise.all([
          api.dashboard.stats(),
          api.matching.log().catch(() => []),
          api.webhooks.kiwify.list().catch(() => []),
        ])
        setStats(s)
        setMatchingLog(log)
        setPurchases(purch.slice(0, 5).map((p: any) => ({
          id: p.id,
          therapist_id: p.therapist_id,
          therapist_name: p.customer_name || 'Comprador desconhecido',
          product_name: p.product_name || p.offer_name || '-',
          leads_qty: p.leads_qty,
          amount: (p.amount || 0) / 100,
          status: p.processing_status === 'processed' ? 'completed' : p.processing_status,
          created_at: p.created_at,
        })))
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleRunMatching() {
    try {
      await api.matching.run()
      const s = await api.dashboard.stats()
      setStats(s)
    } catch (err) {
      console.error('Run matching error:', err)
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Painel de controle</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100 tracking-tight">Dashboard</h1>
      </div>

      {stats.patients_without_therapist > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <AlertTriangle size={15} className="text-yellow-400 flex-shrink-0" />
            <span className="text-sm text-yellow-300">
              <strong>{stats.patients_without_therapist}</strong> pacientes aguardando atribuição
            </span>
          </div>
          <button
            onClick={handleRunMatching}
            className="text-xs bg-yellow-500/20 text-yellow-300 px-3 py-2 rounded-lg hover:bg-yellow-500/30 transition-colors self-start sm:self-auto whitespace-nowrap"
          >
            Executar matching agora
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pacientes totais" value={stats.total_patients} icon={Users}
          trend={{ value: `+${stats.today_new_patients} hoje`, positive: true }} accent="blue" />
        <StatCard label="Terapeutas ativos" value={stats.total_therapists_active} icon={UserCheck} accent="green" />
        <StatCard label="Atribuicoes" value={stats.total_assignments} icon={GitMerge}
          trend={{ value: `+${stats.today_assignments} hoje`, positive: true }} accent="orange" />
        <StatCard label="Saldo critico" value={stats.therapists_low_balance} icon={AlertTriangle}
          trend={{ value: 'com 2 creditos ou menos', positive: false }} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-orange-400" />
                <span className="text-sm font-semibold text-gray-200">Ultimas decisoes</span>
              </div>
              <span className="text-xs text-gray-600 hidden sm:block">Algoritmo automatico</span>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Paciente</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Terapeuta</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {matchingLog.slice(0, 5).map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.03]">
                    <td className="px-4 py-3 text-gray-300 text-xs sm:text-sm">{d.patient_name}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs sm:text-sm">{d.therapist_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${d.score >= 90 ? 'text-green-400' : d.score >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {d.score}%
                      </span>
                    </td>
                  </tr>
                ))}
                {matchingLog.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-600 text-sm">Nenhuma decisão registrada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShoppingBag size={15} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-200">Compras recentes (Kiwify)</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Terapeuta</th>
                <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium hidden sm:table-cell">Produto</th>
                <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Leads</th>
                <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Valor</th>
                <th className="text-left px-4 py-3 text-xs text-gray-600 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.03]">
                  <td className="px-4 py-3 text-gray-300 text-xs sm:text-sm">{p.therapist_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">{p.product_name}</td>
                  <td className="px-4 py-3 text-gray-300 font-medium text-xs sm:text-sm">+{p.leads_qty}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs sm:text-sm">{p.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.status === 'completed' ? 'green' : p.status === 'pending' ? 'yellow' : 'red'}>
                      {p.status === 'completed' ? 'Pago' : p.status === 'pending' ? 'Pendente' : 'Estornado'}
                    </Badge>
                  </td>
                </tr>
              ))}
              {purchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">Nenhuma compra registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
