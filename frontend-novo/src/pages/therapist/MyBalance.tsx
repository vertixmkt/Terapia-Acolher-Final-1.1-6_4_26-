import { useState, useEffect } from 'react'
import { ShoppingBag, Wallet, TrendingDown, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { Therapist } from '../../types'

export function TherapistBalance() {
  const [t, setTherapist] = useState<Therapist | null>(null)
  const [balance, setBalance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [profile, balanceData] = await Promise.all([
          api.therapistPortal.getProfile(),
          api.therapistPortal.getBalance().catch(() => null),
        ])
        setTherapist(profile)
        setBalance(balanceData)
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !t) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  const totalLeads = balance?.total_leads_purchased || t.balance + (t.total_assignments || 0)
  const totalSpent = balance?.total_invested || 0

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Portal do Terapeuta</p>
        <h1 className="text-2xl font-bold text-gray-100">Meu Saldo</h1>
      </div>

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
          <p className="text-4xl font-black text-gray-200">R$ {totalSpent}</p>
          <p className="text-xs text-gray-600 mt-1">em compras</p>
        </div>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-200 mb-1">Comprar mais leads</p>
              <p className="text-xs text-gray-500">Escolha um pacote e aumente seu saldo de contatos.</p>
            </div>
            <a href="https://kiwify.app" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors">
              <ShoppingBag size={14} /> Comprar pacote <ExternalLink size={12} />
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Starter', qty: 5, price: 97 },
              { name: 'Essencial', qty: 10, price: 177 },
              { name: 'Profissional', qty: 20, price: 327 },
              { name: 'Premium', qty: 50, price: 697 },
            ].map((pkg) => (
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-200">Histórico</span>
          </div>
        </CardHeader>
        <div className="py-10 text-center text-gray-600 text-sm">
          Histórico de compras será exibido quando houver compras registradas via Kiwify.
        </div>
      </Card>
    </div>
  )
}
