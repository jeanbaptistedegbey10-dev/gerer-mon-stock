import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'

import Layout    from './components/Layout'
import Login     from './pages/Login'
import Register  from './pages/Register'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sales    from './pages/Sales'
import NewSale  from './pages/NewSale'
import Stock    from './pages/Stock'
import Purchases from './pages/Purchases'
import Deliveries from './pages/Deliveries'
import Drivers from './pages/Drivers'
// On ajoutera les autres pages au fil des phases

// ─── Guard ───────────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useStore()

  // Pendant l'init (vérif session), on affiche un spinner
  // Ceci évite le flash /login alors que l'user est déjà connecté
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center animate-pulse">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const init = useStore(s => s.init)

  // init() une seule fois au montage → récupère la session Supabase
  useEffect(() => { init() }, [init])

  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Routes protégées — Layout contient la sidebar */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="sales"     element={<Sales />} />
        <Route path="sales/new" element={<NewSale />} />
        <Route path="stock"     element={<Stock />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="drivers" element={<Drivers />} />
        
        {/* Phase 3+ : on ajoutera /products, /sales, etc. */}
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}