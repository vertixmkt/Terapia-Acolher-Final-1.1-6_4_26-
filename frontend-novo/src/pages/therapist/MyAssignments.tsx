import { useState, useEffect } from 'react'
import { Phone, MessageCircle, GitMerge, Loader2 } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../api/client'
import type { AssignmentStatus } from '../../types'

const statusBadge: Record<AssignmentStatus, { variant: 'yellow' | 'green' | 'red'; label: string }> = {
  pendente: { variant: 'yellow', label: 'Aguardando contato' },
  confirmado: { variant: 'green', label: 'Em andamento' },
  cancelado: { variant: 'red', label: 'Cancelado' },
}

export function TherapistAssignments() {
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.therapistPortal.getAssignments()
        setAssignments(data)
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Portal do Terapeuta</p>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Minhas Atribuições</h1>
      </div>

      <p className="text-sm text-gray-500">
        Você recebeu <strong className="text-gray-300">{assignments.length}</strong> paciente{assignments.length !== 1 ? 's' : ''}.
        Entre em contato o quanto antes — pacientes esperando mais de 24h tendem a desistir.
      </p>

      {assignments.length === 0 ? (
        <div className="py-16 text-center text-gray-600">
          <GitMerge size={40} className="mx-auto mb-3 opacity-20" />
          <p>Nenhum paciente atribuído ainda.</p>
          <p className="text-xs mt-1">Quando houver um match, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: any) => (
            <Card key={a.id}>
              <div className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-200">{a.patient_name || 'Paciente'}</h3>
                    <Badge variant={statusBadge[a.status as AssignmentStatus]?.variant || 'gray'}>
                      {statusBadge[a.status as AssignmentStatus]?.label || a.status}
                    </Badge>
                    {a.compatibility_score > 0 && (
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${a.compatibility_score >= 90 ? 'text-green-400 bg-green-500/10' : 'text-yellow-400 bg-yellow-500/10'}`}>
                        {a.compatibility_score}% compat.
                      </span>
                    )}
                  </div>

                  {(a.patient_reason || a.patient_shift || a.patient_gender) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {a.patient_reason && <span>Motivo: <span className="text-gray-400">{a.patient_reason}</span></span>}
                      {a.patient_shift && <span>Turno: <span className="text-gray-400">{a.patient_shift === 'manha' ? 'Manhã' : a.patient_shift === 'tarde' ? 'Tarde' : 'Noite'}</span></span>}
                      {a.patient_gender && <span>Gênero: <span className="text-gray-400">{a.patient_gender === 'F' ? 'Feminino' : a.patient_gender === 'M' ? 'Masculino' : 'Não-binário'}</span></span>}
                    </div>
                  )}

                  {a.assigned_at && (
                    <p className="text-xs text-gray-600">
                      Recebido em {new Date(a.assigned_at).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 flex-shrink-0">
                  {a.patient_phone && (
                    <>
                      <a href={`tel:${a.patient_phone}`}
                        className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors">
                        <Phone size={12} /> Ligar
                      </a>
                      <a href={`https://wa.me/55${a.patient_phone}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-xs text-green-400 transition-colors">
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
