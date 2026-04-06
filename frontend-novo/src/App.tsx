import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { AdminLayout } from './components/admin/AdminLayout'
import { TherapistLayout } from './components/therapist/TherapistLayout'
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminTherapists } from './pages/admin/Therapists'
import { AdminPatients } from './pages/admin/Patients'
import { AdminAssignments } from './pages/admin/Assignments'
import { AdminMatching } from './pages/admin/Matching'
import { AdminAuthorization } from './pages/admin/Authorization'
import { AdminQuickRegister } from './pages/admin/QuickRegister'
import { AdminWebhooksManychatReceived } from './pages/admin/WebhooksManychatReceived'
import { AdminWebhooksManychatSent } from './pages/admin/WebhooksManychatSent'
import { AdminPurchasesKiwify } from './pages/admin/PurchasesKiwify'
import { AdminConfig } from './pages/admin/Config'
import { TherapistProfile } from './pages/therapist/MyProfile'
import { TherapistAssignments } from './pages/therapist/MyAssignments'
import { TherapistBalance } from './pages/therapist/MyBalance'
import { ResetPassword } from './pages/therapist/ResetPassword'
import { AdminResetPassword } from './pages/admin/AdminResetPassword'
import { Heart, ShieldCheck, User } from 'lucide-react'

function Landing() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 gap-8"
      style={{ background: '#0B0C15' }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center">
          <Heart size={28} className="text-orange-400" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-100">Terapia Acolher</p>
          <p className="text-sm text-gray-500 mt-0.5">Sistema de matching terapeutas x pacientes</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm sm:max-w-xl">
        <Link
          to="/admin"
          className="flex-1 flex flex-col items-center gap-3 p-6 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-center hover:bg-orange-500/20 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <ShieldCheck size={20} className="text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-300">Area Admin</p>
            <p className="text-xs text-gray-500 mt-0.5">Dashboard - Matching - Terapeutas</p>
          </div>
        </Link>

        <Link
          to="/terapeuta"
          className="flex-1 flex flex-col items-center gap-3 p-6 bg-white/[0.03] border border-white/10 rounded-2xl text-center hover:bg-white/[0.06] transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <User size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-300">Portal do Terapeuta</p>
            <p className="text-xs text-gray-500 mt-0.5">Perfil - Atribuicoes - Saldo</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

function subdomainTarget(): string | null {
  const host = window.location.hostname
  if (host.startsWith('admin.')) return '/admin'
  if (host.startsWith('terapeuta.')) return '/terapeuta'
  return null
}

export default function App() {
  const target = subdomainTarget()
  return (
    <BrowserRouter>
      <Routes>
        {/* Subdomínio terapeuta.* → portal direto na raiz */}
        {target === '/terapeuta' ? (
          <>
            <Route path="/reset-senha" element={<ResetPassword />} />
            <Route path="/" element={<TherapistLayout />}>
              <Route index element={<TherapistProfile />} />
              <Route path="atribuicoes" element={<TherapistAssignments />} />
              <Route path="saldo" element={<TherapistBalance />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : target === '/admin' ? (
          <>
            <Route path="/reset-senha" element={<AdminResetPassword />} />
            <Route path="/" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="autorizacao" element={<AdminAuthorization />} />
              <Route path="cadastro-rapido" element={<AdminQuickRegister />} />
              <Route path="pacientes" element={<AdminPatients />} />
              <Route path="terapeutas" element={<AdminTherapists />} />
              <Route path="atribuicoes" element={<AdminAssignments />} />
              <Route path="matching" element={<AdminMatching />} />
              <Route path="webhooks-recebidos" element={<AdminWebhooksManychatReceived />} />
              <Route path="webhooks-enviados" element={<AdminWebhooksManychatSent />} />
              <Route path="compras" element={<AdminPurchasesKiwify />} />
              <Route path="config" element={<AdminConfig />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Landing />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="autorizacao" element={<AdminAuthorization />} />
              <Route path="cadastro-rapido" element={<AdminQuickRegister />} />
              <Route path="pacientes" element={<AdminPatients />} />
              <Route path="terapeutas" element={<AdminTherapists />} />
              <Route path="atribuicoes" element={<AdminAssignments />} />
              <Route path="matching" element={<AdminMatching />} />
              <Route path="webhooks-recebidos" element={<AdminWebhooksManychatReceived />} />
              <Route path="webhooks-enviados" element={<AdminWebhooksManychatSent />} />
              <Route path="compras" element={<AdminPurchasesKiwify />} />
              <Route path="config" element={<AdminConfig />} />
            </Route>

            <Route path="/admin/reset-senha" element={<AdminResetPassword />} />
            <Route path="/terapeuta/reset-senha" element={<ResetPassword />} />
            <Route path="/terapeuta" element={<TherapistLayout />}>
              <Route index element={<TherapistProfile />} />
              <Route path="atribuicoes" element={<TherapistAssignments />} />
              <Route path="saldo" element={<TherapistBalance />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}
