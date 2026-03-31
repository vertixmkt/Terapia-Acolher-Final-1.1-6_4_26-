import { useState, useEffect } from 'react'
import { ShoppingBag, Wallet, TrendingDown, ExternalLink, Loader2, RefreshCw, CheckSquare, Square, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { Therapist } from '../../types'

const PACKAGES = [
  { name: 'Acolher Light',    qty: 3,  price: 97 },
  { name: 'Acolher Regular',  qty: 10, price: 250 },
  { name: 'Acolher Mais',     qty: 15, price: 350 },
  { name: 'Acolher Máximo',   qty: 20, price: 410 },
  { name: '30 Contatos',      qty: 30, price: 600 },
  { name: '60 Contatos',      qty: 60, price: 1170 },
]

type ReplenishState = 'idle' | 'submitting' | 'success' | 'error'

export function TherapistBalance() {
  const [t, setTherapist] = useState<Therapist | null>(null)
  const [balance, setBalance] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Replenishment form state
  const [showReplenish, setShowReplenish] = useState(false)
  const [replenishForm, setReplenishForm] = useState({
    assignment_id: 0,
    contacted_0h: false,
    contacted_24h: false,
    contacted_72h: false,
    contacted_15d: false,
    reason: '',
  })
  const [replenishState, setReplenishState] = useState<ReplenishState>('idle')
  const [replenishError, setReplenishError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [profile, balanceData, assignmentData] = await Promise.all([
          api.therapistPortal.getProfile(),
          api.therapistPortal.getBalance().catch(() => null),
          api.therapistPortal.getAssignments().catch(() => []),
        ])
        setTherapist(profile)
        setBalance(balanceData)
        setAssignments(assignmentData)
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleReplenish(e: React.FormEvent) {
    e.preventDefault()
    if (!replenishForm.assignment_id) return
    setReplenishState('submitting')
    setReplenishError('')
    try {
      await api.therapistPortal.requestReplenishment(replenishForm)
      setReplenishState('success')
      setReplenishForm({ assignment_id: 0, contacted_0h: false, contacted_24h: false, contacted_72h: false, contacted_15d: false, reason: '' })
    } catch (err: any) {
      setReplenishState('error')
      setReplenishError(err.message || 'Erro ao enviar solicitação')
    }
  }

  function toggleProtocol(key: keyof typeof replenishForm) {
    setReplenishForm(f => ({ ...f, [key]: !f[key] }))
  }

  if (loading || !t) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  const totalLeads = balance?.total_leads_purchased || t.balance + (t.total_assignments || 0)
  const totalSpent = balance?.total_invested || 0
  const purchases: any[] = balance?.purchases || []

  const protocolComplete =
    replenishForm.contacted_0h &&
    replenishForm.contacted_24h &&
    replenishForm.contacted_72h &&
    replenishForm.contacted_15d

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Portal do Terapeuta</p>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Meu Saldo</h1>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Saldo atual</p>
          <p className={`text-4xl font-black ${t.balance <= 2 ? 'text-red-400' : t.balance <= 5 ? 'text-yellow-400' : 'text-green-400'}`}>
            {t.balance}
          </p>
          <p className="text-xs text-gray-600 mt-1">créditos disponíveis</p>
          {t.balance <= 2 && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
              <TrendingDown size={11} /> Saldo baixo — compre mais leads
            </p>
          )}
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Total de leads comprados</p>
          <p className="text-4xl font-black text-gray-200">{totalLeads}</p>
          <p className="text-xs text-gray-600 mt-1">desde o início</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Total investido</p>
          <p className="text-4xl font-black text-gray-200">
            {totalSpent > 0 ? `R$ ${totalSpent}` : '—'}
          </p>
          <p className="text-xs text-gray-600 mt-1">em compras</p>
        </div>
      </div>

      {/* Comprar mais */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-200 mb-1">Comprar mais leads</p>
              <p className="text-xs text-gray-500">Escolha um pacote e aumente seu saldo de contatos.</p>
            </div>
            <a
              href="https://kiwify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <ShoppingBag size={14} /> Comprar pacote <ExternalLink size={12} />
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {PACKAGES.map(pkg => (
              <div key={pkg.name} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-center">
                <p className="text-xs text-gray-500 mb-1">{pkg.name}</p>
                <p className="text-xl font-bold text-gray-200">{pkg.qty}</p>
                <p className="text-xs text-gray-600">leads</p>
                <p className="text-sm font-semibold text-orange-400 mt-1">R$ {pkg.price}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Reposição de lead — P3 */}
      <Card>
        <button
          onClick={() => { setShowReplenish(s => !s); setReplenishState('idle') }}
          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.01] transition-colors"
        >
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-200">Solicitar reposição de lead</span>
            <span className="text-xs text-gray-600 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">até 3/ciclo</span>
          </div>
          {showReplenish ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
        </button>

        {showReplenish && (
          <div className="border-t border-white/5">
            {replenishState === 'success' ? (
              <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
                <CheckCircle size={28} className="text-green-400" />
                <p className="text-sm text-green-400 font-medium">Solicitação enviada com sucesso!</p>
                <p className="text-xs text-gray-500">O administrador analisará sua solicitação e creditará 1 lead se aprovado.</p>
                <button onClick={() => setReplenishState('idle')} className="text-xs text-gray-500 hover:text-gray-300 underline">
                  Nova solicitação
                </button>
              </div>
            ) : (
              <form onSubmit={handleReplenish} className="px-5 py-4 space-y-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Use este formulário quando um paciente atribuído não responder às suas mensagens. Você precisa ter seguido o protocolo de contato para solicitar a reposição.
                </p>

                {/* Selecionar atribuição */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Qual paciente não respondeu?</label>
                  <select
                    required
                    value={replenishForm.assignment_id}
                    onChange={e => setReplenishForm(f => ({ ...f, assignment_id: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-orange-500/40"
                  >
                    <option value={0}>Selecione uma atribuição...</option>
                    {assignments.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.patient_name} — atribuído em {new Date(a.assigned_at).toLocaleDateString('pt-BR')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Protocolo de contato */}
                <div>
                  <label className="text-xs text-gray-500 block mb-2">
                    Confirme que tentou contato nos seguintes momentos: <span className="text-red-400">*</span>
                  </label>
                  <div className="space-y-2">
                    {([
                      { key: 'contacted_0h',  label: 'Logo após receber o contato (0h)' },
                      { key: 'contacted_24h', label: '24 horas depois' },
                      { key: 'contacted_72h', label: '72 horas depois' },
                      { key: 'contacted_15d', label: '15 dias depois' },
                    ] as const).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleProtocol(key)}
                        className="flex items-center gap-2.5 w-full text-left text-sm text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {replenishForm[key]
                          ? <CheckSquare size={16} className="text-orange-400 flex-shrink-0" />
                          : <Square size={16} className="text-gray-600 flex-shrink-0" />
                        }
                        {label}
                      </button>
                    ))}
                  </div>
                  {!protocolComplete && replenishForm.assignment_id > 0 && (
                    <p className="text-xs text-yellow-500 mt-2 flex items-center gap-1">
                      <AlertCircle size={11} /> Confirme todos os pontos de contato para enviar
                    </p>
                  )}
                </div>

                {/* Motivo (opcional) */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Observações (opcional)</label>
                  <textarea
                    value={replenishForm.reason}
                    onChange={e => setReplenishForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Descreva o que aconteceu..."
                    rows={2}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-orange-500/40 resize-none"
                  />
                </div>

                {replenishError && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {replenishError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={replenishState === 'submitting' || !replenishForm.assignment_id || !protocolComplete}
                  className="w-full py-2.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {replenishState === 'submitting'
                    ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                    : <><RefreshCw size={14} /> Solicitar reposição</>
                  }
                </button>
              </form>
            )}
          </div>
        )}
      </Card>

      {/* Histórico de compras */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-200">Histórico de compras</span>
          </div>
        </CardHeader>
        {purchases.length > 0 ? (
          <div className="divide-y divide-white/[0.03]">
            {purchases.map((p: any, i: number) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-200">{p.offer_name || p.product_name || 'Compra Kiwify'}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-400">+{p.leads_qty} leads</p>
                  {p.amount > 0 && (
                    <p className="text-xs text-gray-600">R$ {(p.amount / 100).toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-600 text-sm">
            Nenhuma compra registrada via Kiwify ainda.
          </div>
        )}
      </Card>
    </div>
  )
}
