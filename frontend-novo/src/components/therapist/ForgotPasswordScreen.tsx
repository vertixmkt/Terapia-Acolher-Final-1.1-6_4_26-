import { useState } from 'react'
import { Loader2, Mail, ArrowLeft, CheckCircle, Heart } from 'lucide-react'
import { api } from '../../api/client'

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [credential, setCredential] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!credential.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.therapistPortal.forgotPassword(credential.trim())
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar solicitação')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-100">Verifique seu e-mail</p>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha. O link expira em 1 hora.
              </p>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-400 hover:bg-white/[0.06] transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={14} />
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0B0C15' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
            <Heart size={28} className="text-orange-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-100">Esqueceu sua senha?</p>
            <p className="text-sm text-gray-500 mt-1">Informe seu e-mail ou WhatsApp para receber o link de redefinição.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">E-mail ou WhatsApp</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                value={credential}
                onChange={e => { setCredential(e.target.value); setError('') }}
                placeholder="seu@email.com ou 51999999999"
                autoFocus
                className="w-full pl-9 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !credential.trim()}
            className="w-full py-3 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Enviar link de redefinição
          </button>
        </form>

        <button
          onClick={onBack}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5"
        >
          <ArrowLeft size={13} />
          Voltar ao login
        </button>
      </div>
    </div>
  )
}
