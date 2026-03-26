import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, XCircle, Eye, X, Phone, Mail, Brain, User } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../api/client'
import type { Therapist } from '../../types'

const genderLabel: Record<string, string> = { M: 'Homem', F: 'Mulher', NB: 'Nao-binario' }
const shiftLabel: Record<string, string> = { manha: 'Manha', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexivel' }

function DetailModal({ therapist, onClose, onApprove, onReject }: {
  therapist: Therapist
  onClose: () => void
  onApprove: (id: number) => void
  onReject: (id: number) => void
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#12131f] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-base font-semibold text-gray-100">Detalhes do Terapeuta</h3>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-orange-400">{therapist.name.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-100">{therapist.name}</p>
              <p className="text-xs text-gray-500">Cadastrado em {new Date(therapist.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-gray-600 flex items-center gap-1.5"><Phone size={11} /> WhatsApp</p>
              <p className="text-sm text-gray-300">{therapist.whatsapp}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600 flex items-center gap-1.5"><Mail size={11} /> Email</p>
              <p className="text-sm text-gray-300">{therapist.email || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600 flex items-center gap-1.5"><Brain size={11} /> Abordagem</p>
              <p className="text-sm text-gray-300">{therapist.approach}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-600 flex items-center gap-1.5"><User size={11} /> Genero</p>
              <p className="text-sm text-gray-300">{genderLabel[therapist.gender] || therapist.gender}</p>
            </div>
          </div>

          {therapist.specialties && therapist.specialties.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">Especialidades</p>
              <div className="flex flex-wrap gap-1.5">
                {therapist.specialties.map(s => (
                  <span key={s} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-gray-400">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-gray-600">Turnos de atendimento</p>
            <div className="flex flex-wrap gap-1.5">
              {(therapist.shifts || []).map(s => (
                <span key={s} className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs text-blue-400">
                  {shiftLabel[s] || s}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-gray-600">Publico atendido</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-gray-400">
                Genero: {therapist.serves_gender === 'todos' ? 'Todos' : genderLabel[therapist.serves_gender] || therapist.serves_gender}
              </span>
              {(therapist as any).serves_children && (
                <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-xs text-green-400">Infantil</span>
              )}
              {(therapist as any).serves_teens && (
                <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-xs text-green-400">Adolescentes</span>
              )}
              {(therapist as any).serves_elderly && (
                <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-xs text-green-400">Idosos</span>
              )}
              {(therapist as any).serves_lgbt && (
                <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-xs text-green-400">LGBT+</span>
              )}
              {(therapist as any).serves_couples && (
                <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-xs text-green-400">Casais</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={() => { onApprove(therapist.id); onClose() }}
            className="flex-1 py-2.5 bg-green-500/15 text-green-400 border border-green-500/20 rounded-xl text-sm font-medium hover:bg-green-500/25 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={15} />
            Aprovar
          </button>
          <button
            onClick={() => { onReject(therapist.id); onClose() }}
            className="flex-1 py-2.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/25 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle size={15} />
            Rejeitar
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminAuthorization() {
  const [pending, setPending] = useState<Therapist[]>([])
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  async function load() {
    try {
      const rows = await api.therapists.list({ status: 'pendente' })
      setPending(rows)
    } catch (err) {
      console.error('Erro ao carregar pendentes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleApprove(id: number) {
    setActionLoading(id)
    try {
      await api.therapists.authorize(id)
      setPending(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error('Erro ao aprovar:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject(id: number) {
    setActionLoading(id)
    try {
      await api.therapists.deactivate(id)
      setPending(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error('Erro ao rejeitar:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const detailTherapist = pending.find(t => t.id === detailId)

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
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Gestao de terapeutas</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100">Autorizacao de Cadastros</h1>
        <p className="text-sm text-gray-500 mt-1">Revise e autorize novos cadastros de terapeutas</p>
      </div>

      {pending.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-6 py-16 text-center">
          <CheckCircle2 size={32} className="text-green-500/40 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nenhum cadastro pendente</p>
          <p className="text-xs text-gray-600 mt-1">Todos os terapeutas foram revisados</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            {pending.length} cadastro{pending.length > 1 ? 's' : ''} pendente{pending.length > 1 ? 's' : ''}
          </p>

          {pending.map(t => (
            <div
              key={t.id}
              className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-orange-400">{t.name.charAt(0)}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-100 truncate">{t.name}</p>
                    <p className="text-xs text-gray-600">Cadastrado em {new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <Badge variant="yellow">Pendente</Badge>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-600">WhatsApp</p>
                  <p className="text-sm text-gray-300 truncate">{t.whatsapp}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-600">Email</p>
                  <p className="text-sm text-gray-300 truncate">{t.email || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-600">Abordagem</p>
                  <p className="text-sm text-gray-300 truncate">{t.approach}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-600">Genero</p>
                  <p className="text-sm text-gray-300">{genderLabel[t.gender] || t.gender}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => setDetailId(t.id)}
                  className="flex-1 py-2 bg-white/[0.03] text-gray-400 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/[0.06] transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={14} />
                  Ver Detalhes
                </button>
                <button
                  onClick={() => handleApprove(t.id)}
                  disabled={actionLoading === t.id}
                  className="flex-1 py-2 bg-green-500/15 text-green-400 border border-green-500/20 rounded-xl text-sm font-medium hover:bg-green-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === t.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Aprovar
                </button>
                <button
                  onClick={() => handleReject(t.id)}
                  disabled={actionLoading === t.id}
                  className="flex-1 py-2 bg-red-500/15 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/25 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === t.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {detailTherapist && (
        <DetailModal
          therapist={detailTherapist}
          onClose={() => setDetailId(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  )
}
