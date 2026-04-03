import { useState, useEffect } from 'react'
import { Settings, Save, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { api } from '../../api/client'
import type { ManychatConfig } from '../../types'

type SaveState = 'idle' | 'saving' | 'success' | 'error'

function Field({
  label, value, onChange, type = 'text', hint,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'password'
  hint?: string
}) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-sm text-gray-300 outline-none focus:border-orange-500/40 pr-9 font-mono"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-700 mt-1">{hint}</p>}
    </div>
  )
}

const DEFAULT_CONFIG: ManychatConfig = {
  api_key: '',
  flow_ns_notify_therapist: 'content20260219182249_152653',
  flow_ns_notify_patient: 'content20260219182249_152654',
  tag_id_new_patient: 81766426,
  tag_id_therapist_assigned: 81766427,
  cf_id_patient_name: 14362950,
  cf_id_patient_whatsapp: 14362951,
  cf_id_patient_shift: 14362952,
  cf_id_patient_reason: 14362953,
  cf_id_patient_assigned: 14300039,
  cf_id_therapist_name: 14045578,
  cf_id_therapist_whatsapp: 14045579,
  cf_id_therapist_assigned: 14061515,
  active: false,
}

export function AdminConfig() {
  const [form, setForm] = useState<ManychatConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  useEffect(() => {
    async function load() {
      try {
        const data = await api.manychatConfig.get()
        setForm({ ...DEFAULT_CONFIG, ...data })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function set(key: keyof ManychatConfig, value: string | number | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveState('saving')
    try {
      await api.manychatConfig.update(form)
      setSaveState('success')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (err) {
      console.error(err)
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 3000)
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
    <div className="space-y-5 w-full max-w-2xl">
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">Sistema</p>
        <h1 className="text-2xl font-bold text-gray-100 tracking-tight">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Integração ManyChat — IDs e chaves de API</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">

        {/* Integração */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings size={14} className="text-orange-400" />
              <span className="text-sm font-semibold text-gray-200">Integração ManyChat</span>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field
              label="API Key"
              value={form.api_key}
              onChange={v => set('api_key', v)}
              type="password"
              hint="A key atual aparece mascarada. Digite uma nova para sobrescrever."
            />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Notificações ativas</p>
                <p className="text-xs text-gray-600 mt-0.5">Enviar setCustomField e addTag ao ManyChat</p>
              </div>
              <button
                type="button"
                onClick={() => set('active', !form.active)}
                className={`w-11 h-6 rounded-full transition-colors relative ${form.active ? 'bg-green-500' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </CardBody>
        </Card>

        {/* Fluxos */}
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-200">Flow Namespaces</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field
              label="Flow — Notificar Terapeuta"
              value={form.flow_ns_notify_therapist}
              onChange={v => set('flow_ns_notify_therapist', v)}
              hint="Namespace do flow que dispara quando terapeuta recebe novo paciente"
            />
            <Field
              label="Flow — Notificar Paciente"
              value={form.flow_ns_notify_patient}
              onChange={v => set('flow_ns_notify_patient', v)}
              hint="Namespace do flow que dispara quando paciente recebe terapeuta atribuído"
            />
          </CardBody>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-200">Tag IDs</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field
              label="Tag — Novo Paciente (aplicada ao terapeuta)"
              value={form.tag_id_new_patient}
              onChange={v => set('tag_id_new_patient', Number(v))}
              type="number"
            />
            <Field
              label="Tag — Terapeuta Atribuído (aplicada ao paciente)"
              value={form.tag_id_therapist_assigned}
              onChange={v => set('tag_id_therapist_assigned', Number(v))}
              type="number"
            />
          </CardBody>
        </Card>

        {/* Custom Fields — Paciente */}
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-200">Custom Field IDs — Dados do Paciente</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="CF — Nome do Paciente" value={form.cf_id_patient_name} onChange={v => set('cf_id_patient_name', Number(v))} type="number" />
              <Field label="CF — WhatsApp do Paciente" value={form.cf_id_patient_whatsapp} onChange={v => set('cf_id_patient_whatsapp', Number(v))} type="number" />
              <Field label="CF — Turno do Paciente" value={form.cf_id_patient_shift} onChange={v => set('cf_id_patient_shift', Number(v))} type="number" />
              <Field label="CF — Motivo do Paciente" value={form.cf_id_patient_reason} onChange={v => set('cf_id_patient_reason', Number(v))} type="number" />
              <Field label="CF — Paciente Atribuído (flag)" value={form.cf_id_patient_assigned} onChange={v => set('cf_id_patient_assigned', Number(v))} type="number" />
            </div>
          </CardBody>
        </Card>

        {/* Custom Fields — Terapeuta */}
        <Card>
          <CardHeader>
            <span className="text-sm font-semibold text-gray-200">Custom Field IDs — Dados do Terapeuta</span>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="CF — Nome do Terapeuta" value={form.cf_id_therapist_name} onChange={v => set('cf_id_therapist_name', Number(v))} type="number" />
              <Field label="CF — WhatsApp do Terapeuta" value={form.cf_id_therapist_whatsapp} onChange={v => set('cf_id_therapist_whatsapp', Number(v))} type="number" />
              <Field label="CF — Terapeuta Atribuído (flag)" value={form.cf_id_therapist_assigned} onChange={v => set('cf_id_therapist_assigned', Number(v))} type="number" />
            </div>
          </CardBody>
        </Card>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saveState === 'saving'}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saveState === 'saving'
              ? <Loader2 size={14} className="animate-spin" />
              : <Save size={14} />
            }
            {saveState === 'saving' ? 'Salvando...' : 'Salvar configurações'}
          </button>

          {saveState === 'success' && (
            <span className="flex items-center gap-1.5 text-sm text-green-400">
              <CheckCircle size={14} /> Salvo com sucesso
            </span>
          )}
          {saveState === 'error' && (
            <span className="flex items-center gap-1.5 text-sm text-red-400">
              <AlertCircle size={14} /> Erro ao salvar
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
