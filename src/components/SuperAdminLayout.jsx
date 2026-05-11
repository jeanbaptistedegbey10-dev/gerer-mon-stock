import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import {
  LayoutDashboard, Building2, Users,
  CreditCard, Settings, LogOut,
  Shield, ChevronRight
} from 'lucide-react'

const NAV = [
  { to: '/superadmin',          icon: LayoutDashboard, label: 'Dashboard',   exact: true  },
  { to: '/superadmin/tenants',  icon: Building2,        label: 'Entreprises'              },
  { to: '/superadmin/plans',    icon: CreditCard,       label: 'Plans'                    },
  { to: '/superadmin/users',    icon: Users,            label: 'Utilisateurs'             },
]

export default function SuperAdminLayout() {
  const { user, signOut } = useStore()
  const navigate          = useNavigate()
  const { tenant } = useStore()
  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = (user?.user_metadata?.full_name || user?.email || 'SA')
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* Sidebar Super Admin — couleur violette */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-purple-900">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-400 rounded-lg flex items-center
                            justify-center flex-shrink-0">
              <Shield size={15} className="text-white" />
            </div>
            <div>
              <p className="font-heading font-semibold text-white text-sm leading-tight">
                Super Admin
              </p>
              <p className="text-white/40 text-[10px]">
                Gérer mon stock
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) => `
                flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                border-l-2 transition-all
                ${isActive
                  ? 'bg-white/12 text-white border-purple-400 font-medium'
                  : 'text-white/65 border-transparent hover:bg-white/8 hover:text-white'
                }
              `}
            >
              <Icon size={15} className="flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* Retour à l'app */}
          <div className="pt-4 border-t border-white/10 mt-4">
            
<NavLink
  to={tenant ? '/dashboard' : '/superadmin'}
  className="flex items-center gap-2.5 px-3 py-2 rounded-lg
             text-sm text-white/50 hover:text-white
             hover:bg-white/8 transition-all"
>
  <ChevronRight size={15} className="flex-shrink-0" />
  {tenant ? 'Retour à l\'app' : 'Pas d\'entreprise liée'}
</NavLink>
          </div>
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-purple-400 flex items-center
                          justify-center text-white text-xs font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {user?.user_metadata?.full_name || user?.email}
            </p>
            <p className="text-white/40 text-[10px]">Super Admin</p>
          </div>
          <button onClick={handleSignOut}
            className="text-white/40 hover:text-white transition-colors p-1">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}