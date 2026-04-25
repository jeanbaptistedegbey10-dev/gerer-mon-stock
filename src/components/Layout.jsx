import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import {
  LayoutDashboard, Package, Warehouse, ShoppingBag,
  DollarSign, Truck, BarChart3, Users, Settings,
  LogOut, Menu, X, Plus, Bell
} from 'lucide-react'

// ─── Config navigation ────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'   },
      { to: '/products',   icon: Package,          label: 'Produits'    },
      { to: '/stock',      icon: Warehouse,         label: 'Stock'       },
      
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/purchases',  icon: ShoppingBag, label: 'Achats'      },
      { to: '/sales',      icon: DollarSign,  label: 'Ventes'      },
      { to: '/deliveries', icon: Truck,        label: 'Livraisons'  },
      { to: '/drivers', icon: Truck, label: 'Livreurs' },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { to: '/reports',  icon: BarChart3, label: 'Rapports'      },
      { to: '/users',    icon: Users,     label: 'Utilisateurs'  },
      { to: '/settings', icon: Settings,  label: 'Paramètres'    },
    ],
  },
]

// ─── Sous-composant : contenu sidebar ────────────────────────────────────────
function SidebarContent({ onClose }) {
  const { user, signOut } = useStore()
  const navigate = useNavigate()

  // Initiales depuis le nom ou l'email
  const initials = (user?.user_metadata?.full_name || user?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package size={15} className="text-white" />
          </div>
          <div>
            <p className="font-heading font-semibold text-white text-sm leading-tight">
              Gérer mon stock
            </p>
            <p className="text-white/40 text-[10px]">Gestion commerciale</p>
          </div>
        </div>
        {/* Bouton fermer — mobile seulement */}
        {onClose && (
          <button onClick={onClose} className="text-white/50 hover:text-white md:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4
                      [&::-webkit-scrollbar]:w-1
                      [&::-webkit-scrollbar-thumb]:bg-white/15
                      [&::-webkit-scrollbar-thumb]:rounded-full">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-medium text-white/40 uppercase tracking-widest px-3 mb-1.5">
              {group.label}
            </p>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm
                  border-l-2 transition-all
                  ${isActive
                    ? 'bg-white/12 text-white border-amber-400 font-medium'
                    : 'text-white/65 border-transparent hover:bg-white/8 hover:text-white'
                  }
                `}
              >
                <Icon size={15} className="flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bouton nouvelle vente */}
      <div className="px-3 pb-3">
        <button
          onClick={() => { navigate('/sales/new'); onClose?.() }}
          className="w-full flex items-center justify-center gap-2 py-2
                     bg-amber-400 hover:bg-amber-500 text-white rounded-lg
                     text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Nouvelle vente
        </button>
      </div>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center
                        text-white text-xs font-semibold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">
            {user?.user_metadata?.full_name || user?.email}
          </p>
          <p className="text-white/40 text-[10px]">Administrateur</p>
        </div>
        <button
          onClick={handleSignOut}
          title="Se déconnecter"
          className="text-white/40 hover:text-white transition-colors p-1 rounded"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-[#1E3A8A]">
        <SidebarContent onClose={null} />
      </aside>

      {/* Sidebar mobile — overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#1E3A8A] flex flex-col
                             animate-in slide-in-from-left duration-200">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header mobile uniquement */}
        <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3
                            flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-400 rounded flex items-center justify-center">
              <Package size={13} className="text-white" />
            </div>
            <span className="font-heading font-semibold text-sm text-gray-900">
              Gérer mon stock
            </span>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 relative">
            <Bell size={18} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </header>

        {/* Pages — Outlet est remplacé par la page active */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  )
}