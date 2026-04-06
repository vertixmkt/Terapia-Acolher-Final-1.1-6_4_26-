import { useState, useEffect } from 'react'
import { Save, User, Phone, Mail, Sun, Moon, Sunrise, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../api/client'
import type { Therapist } from '../../types'

const shiftIcons: Record<string, typeof Sun> = { manha: Sunrise, tarde: Sun, noite: Moon, flexivel: Sun }
const shiftLabels: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', flexivel: 'Flexível' }

import { APPROACHES, SPECIALTIES } from '../../constants/therapist'

export function TherapistProfile() {
  const [t, setTherapist] = useState<Therapist | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    approach: '',
    specialties: [] as string[],
  })

  useEffect(() => {
    async function load() {
      try {
        const data = await api.therapistPortal.getProfile()
        setTherapist(data)
        setForm({
          name: data.name,
          phone: data.phone || '',
          email: data.email || '',
          approach: data.approach || '',
          specialties: data.specialties || [],
        })
      } catch (err) {
        console.error('Load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function toggleSpecialty(s: string) {
    setForm(f => ({
      ...f,
      specialties: f.specialties.includes(s)
        ? f.specialties.filter(x => x !== s)
        : [...f.specialties, s],
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await api.therapistPortal.updateProfile(form)
      const data = await api.therapistPortal.getProfile()
      setTherapist(data)
      setEditing(false)
    } catch (err) {
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !t) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Portal do Terapeuta</p>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Meu Perfil</h1>
        </div>
        <button
          onClick={() => {
            if (editing && t) {
              setForm({
                name: t.name,
                phone: t.phone || '',
                email: t.email || '',
                approach: t.approach || '',
                specialties: t.specialties || [],
              })
            }
            setEditing(!editing)
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            editing ? 'bg-orange-500 text-white hover:bg-orange-400' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
          }`}>
          {editing ? 'Cancelar edição' : 'Editar perfil'}
        </button>
      </div>

      {/* Status toggle + saldo */}
      {t.status === 'ativo' ? (
        <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-400">Recebendo pacientes · Saldo: <strong>{t.balance} creditos</strong></span>
          </div>
          <button
            onClick={async () => {
              setTogglingStatus(true)
              try {
                await api.therapistPortal.updateProfile({ status: 'inativo' })
                const data = await api.therapistPortal.getProfile()
                setTherapist(data)
              } catch (err) { console.error(err) }
              finally { setTogglingStatus(false) }
            }}
            disabled={togglingStatus}
            className="px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            {togglingStatus ? <Loader2 size={12} className="animate-spin" /> : 'Pausar recebimento'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div>
              <span className="text-sm text-yellow-400">Recebimento pausado</span>
              <p className="text-xs text-yellow-500/60 mt-0.5">Voce nao esta recebendo novos pacientes. Saldo: <strong>{t.balance} creditos</strong></p>
            </div>
          </div>
          <button
            onClick={async () => {
              setTogglingStatus(true)
              try {
                await api.therapistPortal.updateProfile({ status: 'ativo' })
                const data = await api.therapistPortal.getProfile()
                setTherapist(data)
              } catch (err) { console.error(err) }
              finally { setTogglingStatus(false) }
            }}
            disabled={togglingStatus}
            className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            {togglingStatus ? <Loader2 size={12} className="animate-spin" /> : 'Voltar a receber'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dados pessoais */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={14} className="text-orange-400" />
              <span className="text-sm font-semibold text-gray-200">Dados pessoais</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {editing ? (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Nome completo</label>
                  <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-orange-500/40" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">WhatsApp</label>
                  <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-orange-500/40" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">E-mail</label>
                  <input value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-orange-500/40" />
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Save size={14} /> {saving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User size={14} className="text-gray-600" />
                  <div><p className="text-xs text-gray-600">Nome</p><p className="text-sm text-gray-200">{t.name}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={14} className="text-gray-600" />
                  <div><p className="text-xs text-gray-600">WhatsApp</p><p className="text-sm text-gray-200">{t.phone}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-gray-600" />
                  <div><p className="text-xs text-gray-600">E-mail</p><p className="text-sm text-gray-200">{t.email || '-'}</p></div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Dados profissionais */}
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-200">Dados profissionais</span>
          </CardHeader>
          <CardBody className="space-y-4">
            {editing ? (
              <>
                {/* Abordagem — seletor de tag */}
                <div>
                  <label className="text-xs text-gray-500 block mb-2">Abordagem terapêutica</label>
                  <div className="flex flex-wrap gap-1.5">
                    {APPROACHES.map(a => (
                      <button key={a} type="button"
                        onClick={() => setForm(f => ({ ...f, approach: a }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          form.approach === a
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Especialidades — seletor de tags */}
                <div>
                  <label className="text-xs text-gray-500 block mb-2">Especialidades</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SPECIALTIES.map(s => (
                      <button key={s} type="button"
                        onClick={() => toggleSpecialty(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          form.specialties.includes(s)
                            ? 'bg-orange-500 border-orange-500 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Abordagem terapêutica</p>
                  <Badge variant="orange">{t.approach}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-2">Especialidades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(t.specialties || []).map(s => <Badge key={s} variant="gray">{s}</Badge>)}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-2">Turnos disponíveis</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(t.shifts || []).map(s => {
                      const Icon = shiftIcons[s] || Sun
                      return (
                        <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300">
                          <Icon size={11} className="text-gray-500" /> {shiftLabels[s] || s}
                        </span>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Atende</p>
                  <Badge variant="gray">{t.serves_gender === 'todos' ? 'Todos os gêneros' : t.serves_gender === 'F' ? 'Mulheres' : 'Homens'}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Membro desde</p>
                  <p className="text-sm text-gray-400">{t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '-'}</p>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
