import { useState, useEffect } from 'react'
import {
  Play, Pause, Sliders, BookOpen, ChevronDown, ChevronUp,
  Zap, Brain, User, CheckCircle, AlertCircle, Hand, Loader2
} from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { MatchMode, Patient, MatchingDecision } from '../../types'

const modeConfig = {
  auto: { icon: Zap, label: 'Automático', description: 'Matching executa automaticamente ao chegar cada novo paciente.', color: 'green' },
  semi: { icon: Brain, label: 'Semi-auto', description: 'Admin seleciona o paciente e o sistema sugere o melhor terapeuta com IA.', color: 'orange' },
  manual: { icon: Hand, label: 'Manual', description: 'Admin escolhe paciente e terapeuta diretamente na página de Pacientes.', color: 'blue' },
  pausado: { icon: Pause, label: 'Pausado', description: 'Nenhum matching será realizado até reativar.', color: 'red' },
} as const

const shiftLabel: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexível' }

export function AdminMatching() {
  const [mode, setMode] = useState<MatchMode>('auto')
  const [weights, setWeights] = useState({ genero: 90, turno: 85, abordagem: 70 })
  const [savingWeights, setSavingWeights] = useState(false)
  const [weightsSaved, setWeightsSaved] = useState(false)
  const [expandedLog, setExpandedLog] = useState<number | null>(null)
  const [showWeights, setShowWeights] = useState(false)
  const [unassignedPatients, setUnassignedPatients] = useState<Patient[]>([])
  const [matchingLog, setMatchingLog] = useState<MatchingDecision[]>([])
  const [loading, setLoading] = useState(true)

  // Semi-auto state
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [suggestion, setSuggestion] = useState<any>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [modeRes, patients, log] = await Promise.all([
          api.matching.getMode().catch(() => ({ mode: 'auto', weight_gender: 90, weight_shift: 85, weight_specialty: 70 })),
          api.patients.list({ status: 'pendente' }).catch(() => []),
          api.matching.log().catch(() => []),
        ])
        setMode(modeRes.mode || 'auto')
        setWeights({
          genero: modeRes.weight_gender ?? 90,
          turno: modeRes.weight_shift ?? 85,
          abordagem: modeRes.weight_specialty ?? 70,
        })
        setUnassignedPatients(patients.filter((p: Patient) => !p.assigned_therapist_id))
        setMatchingLog(log)
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSetMode(newMode: MatchMode) {
    setMode(newMode)
    setSuggestion(null)
    setSelectedPatientId(null)
    try {
      await api.matching.setMode(newMode)
    } catch (err) {
      console.error('Set mode error:', err)
    }
  }

  async function handleSuggest() {
    if (!selectedPatientId) return
    setSuggesting(true)
    setSuggestion(null)
    try {
      const result = await api.matching.suggest(selectedPatientId)
      setSuggestion(result)
    } catch (err) {
      console.error('Suggest error:', err)
    } finally {
      setSuggesting(false)
    }
  }

  async function handleConfirmAssignment() {
    if (!selectedPatientId || !suggestion?.therapist) return
    setConfirming(true)
    try {
      await api.matching.assign(selectedPatientId, suggestion.therapist.id, suggestion.score, suggestion.reason)
      setUnassignedPatients(prev => prev.filter(p => p.id !== selectedPatientId))
      setSuggestion(null)
      setSelectedPatientId(null)
      const log = await api.matching.log().catch(() => [])
      setMatchingLog(log)
    } catch (err) {
      console.error('Assign error:', err)
    } finally {
      setConfirming(false)
    }
  }

  async function handleRunAuto() {
    try {
      await api.matching.run()
      const [patients, log] = await Promise.all([
        api.patients.list({ status: 'pendente' }).catch(() => []),
        api.matching.log().catch(() => []),
      ])
      setUnassignedPatients(patients.filter((p: Patient) => !p.assigned_therapist_id))
      setMatchingLog(log)
    } catch (err) {
      console.error('Run error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5 w-full">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Controle</p>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100 tracking-tight">Motor de Matching</h1>
      </div>

      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.entries(modeConfig) as [MatchMode, typeof modeConfig[MatchMode]][]).map(([key, cfg]) => {
              const Icon = cfg.icon
              const active = mode === key
              const colorMap = {
                green: active ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'border-white/5 text-gray-500',
                orange: active ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : 'border-white/5 text-gray-500',
                blue: active ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'border-white/5 text-gray-500',
                red: active ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'border-white/5 text-gray-500',
              }
              return (
                <button key={key} onClick={() => handleSetMode(key)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border transition-all ${colorMap[cfg.color]} hover:bg-white/[0.03]`}>
                  <Icon size={17} />
                  <span className="text-xs font-semibold">{cfg.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-3 px-1">{modeConfig[mode].description}</p>
        </CardBody>
      </Card>

      {mode === 'semi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User size={15} className="text-orange-400" />
                <span className="text-sm font-semibold text-gray-200">Pacientes sem terapeuta</span>
                <span className="ml-auto text-xs text-gray-600">{unassignedPatients.length} aguardando</span>
              </div>
            </CardHeader>
            <div className="divide-y divide-white/[0.03]">
              {unassignedPatients.map((p) => (
                <button key={p.id} onClick={() => { setSelectedPatientId(p.id); setSuggestion(null) }}
                  className={`w-full px-4 py-3.5 text-left hover:bg-white/[0.03] transition-colors flex items-start gap-3 ${selectedPatientId === p.id ? 'bg-orange-500/5' : ''}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${selectedPatientId === p.id ? 'bg-orange-400' : 'bg-white/10'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.reason}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gray-600">{shiftLabel[p.shift] || p.shift}</span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-600">{p.gender === 'F' ? 'Feminino' : p.gender === 'M' ? 'Masculino' : 'Não-binário'}</span>
                    </div>
                  </div>
                  {selectedPatientId === p.id && <span className="text-xs text-orange-400 font-medium flex-shrink-0">Selecionado</span>}
                </button>
              ))}
              {unassignedPatients.length === 0 && (
                <div className="py-10 text-center text-gray-600">
                  <CheckCircle size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Todos os pacientes estão atribuídos</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/5">
              <button onClick={handleSuggest} disabled={!selectedPatientId || suggesting}
                className="w-full py-2.5 bg-orange-500 disabled:bg-white/10 disabled:text-gray-600 hover:bg-orange-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                {suggesting ? (
                  <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Analisando...</>
                ) : (
                  <><Brain size={15} /> Sugerir terapeuta</>
                )}
              </button>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain size={15} className="text-orange-400" />
                <span className="text-sm font-semibold text-gray-200">Sugestão da IA</span>
              </div>
            </CardHeader>
            <CardBody>
              {!selectedPatientId && !suggestion && (
                <div className="py-12 text-center text-gray-600">
                  <Brain size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Selecione um paciente e clique em Sugerir</p>
                </div>
              )}
              {selectedPatientId && !suggestion && !suggesting && (
                <div className="py-12 text-center text-gray-600">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Clique em "Sugerir terapeuta" para ver a recomendação</p>
                </div>
              )}
              {suggesting && (
                <div className="py-12 text-center text-gray-500">
                  <div className="w-10 h-10 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm">Processando compatibilidade...</p>
                </div>
              )}
              {suggestion?.therapist && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                        <circle cx="18" cy="18" r="15.9" fill="none"
                          stroke={suggestion.score >= 85 ? '#4ade80' : suggestion.score >= 70 ? '#fb923c' : '#f87171'}
                          strokeWidth="2.5" strokeDasharray={`${suggestion.score} 100`} strokeLinecap="round" />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${suggestion.score >= 85 ? 'text-green-400' : suggestion.score >= 70 ? 'text-orange-400' : 'text-red-400'}`}>
                        {suggestion.score}%
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Compatibilidade</p>
                      <p className="text-lg font-bold text-gray-100">{suggestion.therapist.name}</p>
                      <p className="text-sm text-gray-400">{suggestion.therapist.approach}</p>
                    </div>
                  </div>

                  {suggestion.therapist.specialties?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Especialidades</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestion.therapist.specialties.map((s: string) => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestion.reason && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3.5">
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Por que foi escolhido</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{suggestion.reason}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                      <p className="text-gray-600 mb-0.5">Saldo</p>
                      <p className={`font-bold ${suggestion.therapist.balance <= 2 ? 'text-red-400' : 'text-green-400'}`}>
                        {suggestion.therapist.balance} créditos
                      </p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                      <p className="text-gray-600 mb-0.5">Atribuições</p>
                      <p className="font-bold text-gray-300">{suggestion.therapist.total_assignments} total</p>
                    </div>
                  </div>

                  <button onClick={handleConfirmAssignment} disabled={confirming}
                    className="w-full py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 disabled:opacity-50 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                    <CheckCircle size={15} />
                    {confirming ? 'Confirmando...' : 'Confirmar atribuição'}
                  </button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {mode === 'auto' && (
        <Card>
          <CardBody className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-200 font-medium">Modo automático ativo</p>
              <p className="text-xs text-gray-500 mt-0.5">O sistema processa novos pacientes automaticamente. {unassignedPatients.length} pacientes aguardando na fila.</p>
            </div>
            <button onClick={handleRunAuto}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
              <Play size={14} /> Executar agora ({unassignedPatients.length})
            </button>
          </CardBody>
        </Card>
      )}

      {mode === 'manual' && (
        <Card>
          <CardBody>
            <div className="flex items-start gap-3">
              <Hand size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-200 font-medium">Modo manual</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  No modo manual, vá até a página de <strong className="text-gray-400">Pacientes</strong> e clique em um paciente sem terapeuta para fazer a atribuição manual diretamente na ficha do paciente.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <button onClick={() => setShowWeights(!showWeights)}
          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
          <div className="flex items-center gap-2">
            <Sliders size={15} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-200">Pesos do algoritmo</span>
          </div>
          {showWeights ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
        </button>
        {showWeights && (
          <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
            {(Object.entries(weights) as [keyof typeof weights, number][]).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-gray-300 capitalize">{key === 'abordagem' ? 'Abordagem (IA)' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  <span className="text-orange-400 font-medium">{val}%</span>
                </div>
                <input type="range" min={0} max={100} value={val}
                  onChange={(e) => setWeights(w => ({ ...w, [key]: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500" />
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  setSavingWeights(true)
                  setWeightsSaved(false)
                  try {
                    await api.matching.setMode(mode, {
                      weight_gender: weights.genero,
                      weight_shift: weights.turno,
                      weight_specialty: weights.abordagem,
                    })
                    setWeightsSaved(true)
                    setTimeout(() => setWeightsSaved(false), 3000)
                  } catch (err) {
                    console.error(err)
                  } finally {
                    setSavingWeights(false)
                  }
                }}
                disabled={savingWeights}
                className="flex-1 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-sm font-medium hover:bg-orange-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingWeights && <span className="w-3.5 h-3.5 rounded-full border-2 border-orange-400/30 border-t-orange-400 animate-spin" />}
                Salvar pesos
              </button>
              {weightsSaved && <span className="text-xs text-green-400">Salvo ✓</span>}
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-orange-400" />
            <span className="text-sm font-semibold text-gray-200">Log de atribuições</span>
            <span className="ml-auto text-xs text-gray-600">{matchingLog.length} registros</span>
          </div>
        </CardHeader>
        <div>
          {matchingLog.map((d) => (
            <div key={d.id} className="border-b border-white/[0.03] last:border-0">
              <button onClick={() => setExpandedLog(expandedLog === d.id ? null : d.id)}
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/[0.01] transition-colors text-left">
                <span className={`text-base font-bold w-12 flex-shrink-0 ${d.score >= 90 ? 'text-green-400' : d.score >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {d.score}%
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">
                    <span className="font-medium">{d.patient_name}</span>
                    <span className="text-gray-600 mx-1.5">→</span>
                    <span className="font-medium">{d.therapist_name}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {d.decided_at ? new Date(d.decided_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {expandedLog === d.id ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />}
                </div>
              </button>
              {expandedLog === d.id && (
                <div className="px-5 pb-4">
                  <div className="bg-white/[0.02] border border-white/5 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Motivo da decisão</p>
                    <p className="text-sm text-gray-300">{d.reason}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {matchingLog.length === 0 && (
            <div className="py-10 text-center text-gray-600">
              <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum registro no log</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
