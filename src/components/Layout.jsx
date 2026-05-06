import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useStore }         from '../store/useStore'
import { usePermissions }   from '../hooks/usePermissions'
import { useNotifications } from '../hooks/useNotifications'
import {
  LayoutDashboard, Package, Warehouse, ShoppingBag,
  DollarSign, Truck, BarChart3, Users, Settings,
  LogOut, Menu, X, Plus, Bell
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',  perm: 'view_dashboard'  },
      { to: '/products',  icon: Package,          label: 'Produits',   perm: 'view_products'   },
      { to: '/stock',     icon: Warehouse,         label: 'Stock',      perm: 'view_stock'      },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { to: '/purchases',  icon: ShoppingBag, label: 'Achats',     perm: 'view_purchases'  },
      { to: '/sales',      icon: DollarSign,  label: 'Ventes',     perm: 'view_sales'      },
      { to: '/deliveries', icon: Truck,        label: 'Livraisons', perm: 'view_deliveries' },
      { to: '/deliveries', icon: Truck,        label: 'Mes livraisons', perm: 'view_my_deliveries' },
      { to: '/drivers',    icon: Truck,        label: 'Livreurs',   perm: 'view_drivers'    },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { to: '/reports',  icon: BarChart3, label: 'Rapports',      perm: 'view_reports'   },
      { to: '/users',    icon: Users,     label: 'Utilisateurs',  perm: 'view_users'     },
      { to: '/settings', icon: Settings,  label: 'Paramètres',    perm: 'view_settings'  },
    ],
  },
]

// Wrapper sécurisé pour useNotifications dans Layout
function SafeNotifications() {
  try {
    return useNotifications()
  } catch {
    return { unreadCount: 0, notifications: [], markAsRead: () => {}, markAllAsRead: () => {} }
  }
}

// ── Panneau notifications ─────────────────────────────────────────────────────
function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications()

  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-xl
                    shadow-xl border border-gray-100 z-50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="font-heading font-semibold text-sm text-gray-900">
          Notifications {unreadCount > 0 && (
            <span className="ml-1 pill pill-red">{unreadCount}</span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead}
            className="text-xs text-primary hover:underline">
            Tout marquer lu
          </button>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            Aucune notification
          </div>
        ) : notifications.map(n => {
          const isRead = (Array.isArray(n.read_by) ? n.read_by : [])
            .includes(n.driver_id)
          return (
            <div
              key={n.id}
              onClick={() => markAsRead(n.id)}
              className={`p-4 border-b border-gray-50 cursor-pointer
                hover:bg-gray-50 transition-colors
                ${!isRead ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0
                  ${n.type === 'completed' ? 'bg-green-500' : 'bg-red-400'}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {n.type === 'completed'
                      ? '✅ Livraison effectuée'
                      : '❌ Livraison annulée'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Par <strong>{n.driver_name}</strong>
                    {n.message && ` · ${n.message}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(n.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({ onClose }) {
  const { user, signOut }  = useStore()
  const { can, isRole }    = usePermissions()
  const navigate           = useNavigate()

  const initials = (user?.user_metadata?.full_name || user?.email || 'U')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Livreur — sidebar minimaliste
  if (isRole('livreur')) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center
                            justify-center flex-shrink-0">
              <Truck size={15} className="text-white" />
            </div>
            <div>
              <p className="font-heading font-semibold text-white text-sm">
                Espace Livreur
              </p>
              <p className="text-white/40 text-[10px]">
                {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4">
          <NavLink to="/deliveries"
            className={({ isActive }) => `
              flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
              border-l-2 transition-all
              ${isActive
                ? 'bg-white/12 text-white border-amber-400 font-medium'
                : 'text-white/65 border-transparent hover:bg-white/8 hover:text-white'
              }`}>
            <Truck size={15} /> Mes livraisons
          </NavLink>
        </nav>
        <div className="px-4 py-4 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center
                          justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-white/40 text-[10px]">Livreur</p>
          </div>
          <button onClick={handleSignOut}
            className="text-white/40 hover:text-white transition-colors p-1">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center
                          justify-center flex-shrink-0">
            <Package size={15} className="text-white" />
          </div>
          <div>
            <p className="font-heading font-semibold text-white text-sm leading-tight">
              Gérer mon stock
            </p>
            <p className="text-white/40 text-[10px]">Gestion commerciale</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose}
            className="text-white/50 hover:text-white md:hidden p-1">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4
                      [&::-webkit-scrollbar]:w-1
                      [&::-webkit-scrollbar-thumb]:bg-white/15
                      [&::-webkit-scrollbar-thumb]:rounded-full">
        {NAV_GROUPS.map(group => {
          const visibleItems = group.items.filter(item =>
            item.perm ? can(item.perm) : true
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={group.label}>
              <p className="text-[10px] font-medium text-white/40 uppercase
                            tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
              {visibleItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={`${to}-${label}`} to={to} onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5
                    text-sm border-l-2 transition-all
                    ${isActive
                      ? 'bg-white/12 text-white border-amber-400 font-medium'
                      : 'text-white/65 border-transparent hover:bg-white/8 hover:text-white'
                    }
                  `}>
                  <Icon size={15} className="flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Bouton nouvelle vente */}
      {can('manage_sales') && (
        <div className="px-3 pb-3">
          <button
            onClick={() => { navigate('/sales/new'); onClose?.() }}
            className="w-full flex items-center justify-center gap-2 py-2
                       bg-amber-400 hover:bg-amber-500 text-white rounded-lg
                       text-sm font-medium transition-colors">
            <Plus size={15} /> Nouvelle vente
          </button>
        </div>
      )}

      {/* User footer */}
      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center
                        justify-center text-white text-xs font-semibold flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-medium truncate">
            {user?.user_metadata?.full_name || user?.email}
          </p>
          <p className="text-white/40 text-[10px] capitalize">
            {useStore.getState().myRole || 'Employé'}
          </p>
        </div>
        <button onClick={handleSignOut}
          className="text-white/40 hover:text-white transition-colors p-1 rounded">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Layout principal ──────────────────────────────────────────────────────────
export default function Layout() {
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [showNotifs,  setShowNotifs]  = useState(false)
  const { can }                       = usePermissions()
  const { unreadCount = 0 } = useNotifications() || {}

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-[#1E3A8A]">
        <SidebarContent onClose={null} />
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#1E3A8A] flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header mobile */}
        <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3
                           flex items-center justify-between flex-shrink-0">
          <button onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
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
          {/* Cloche notifications */}
          {can('view_notifications') && (
            <div className="relative">
              <button
                onClick={() => setShowNotifs(v => !v)}
                className="p-1.5 rounded-lg hover:bg-gray-100 relative">
                <Bell size={18} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4
                                   bg-red-500 rounded-full text-white
                                   text-[9px] flex items-center justify-center
                                   font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <NotificationPanel onClose={() => setShowNotifs(false)} />
              )}
            </div>
          )}
        </header>

        {/* Topbar desktop — notifications */}
        {can('view_notifications') && (
          <div className="hidden md:flex items-center justify-end px-6 py-2
                          bg-white border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowNotifs(v => !v)}
                className="p-2 rounded-lg hover:bg-gray-100 relative">
                <Bell size={18} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500
                                   rounded-full text-white text-[9px]
                                   flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <NotificationPanel onClose={() => setShowNotifs(false)} />
              )}
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}