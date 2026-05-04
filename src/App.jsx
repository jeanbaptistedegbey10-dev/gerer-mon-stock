import { useEffect }   from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore }    from './store/useStore'
import Layout          from './components/Layout'
import Login           from './pages/Login'
import Register        from './pages/Register'
import Onboarding      from './pages/Onboarding'
import Dashboard       from './pages/Dashboard'
import Products        from './pages/Products'
import Stock           from './pages/Stock'
import Purchases       from './pages/Purchases'
import Sales           from './pages/Sales'
import NewSale         from './pages/NewSale'
import Deliveries      from './pages/Deliveries'
import Drivers         from './pages/Drivers'
import Reports         from './pages/Reports'
import UsersPage       from './pages/Users'
import Settings        from './pages/Settings'

// ── Spinner réutilisable ──────────────────────────────────────────────────────
function Spinner({ message = 'Chargement...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center
                        justify-center mx-auto mb-3 animate-pulse">
          <svg className="w-5 h-5 text-white" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
          </svg>
        </div>
        <p className="text-sm text-gray-400">{message}</p>
      </div>
    </div>
  )
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, tenant, loading, tenantLoaded } = useStore()

  // 1. Chargement initial de l'auth
  if (loading) return <Spinner message="Chargement..." />

  // 2. Pas connecté
  if (!user) return <Navigate to="/login" replace />

  // 3. Connecté mais tenant pas encore chargé → attendre
  if (!tenantLoaded) return <Spinner message="Chargement de votre espace..." />

  // 4. Tenant chargé et vide → onboarding
  if (tenantLoaded && !tenant) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const init = useStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <Routes>
      {/* Publiques */}
      <Route path="/login"      element={<Login />} />
      <Route path="/register"   element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* Protégées */}
      <Route path="/" element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="products"   element={<Products />} />
        <Route path="stock"      element={<Stock />} />
        <Route path="purchases"  element={<Purchases />} />
        <Route path="sales"      element={<Sales />} />
        <Route path="sales/new"  element={<NewSale />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="drivers"    element={<Drivers />} />
        <Route path="reports"    element={<Reports />} />
        <Route path="users"      element={<UsersPage />} />
        <Route path="settings"   element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}