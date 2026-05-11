import { useSuperAdmin } from '../../hooks/useSuperAdmin'
import { useNavigate }   from 'react-router-dom'
import {
  Building2, Users, DollarSign,
  ShoppingCart, TrendingUp, RefreshCw,
  ArrowRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function KpiCard({ label, value, unit, icon: Icon, color, sub }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
      <div className={`absolute top-4 right-4 w-9 h-9 rounded-lg
                       flex items-center justify-center opacity-10 ${color}`} />
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-heading font-bold text-gray-900">{value}</p>
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function SuperAdminDashboard() {
  const { tenants, stats, loading, refresh } = useSuperAdmin()
  const navigate = useNavigate()

  // Stats par plan
  const planStats = {
    free:       tenants.filter(t => t.plan === 'free').length,
    pro:        tenants.filter(t => t.plan === 'pro').length,
    enterprise: tenants.filter(t => t.plan === 'enterprise').length,
  }

  // Tenants actifs vs bloqués
  const activeCount   = tenants.filter(t => t.active).length
  const blockedCount  = tenants.filter(t => !t.active).length

  // Derniers tenants inscrits
  const recentTenants = [...tenants]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <div className="text-center">
        <RefreshCw size={24} className="text-gray-300 mx-auto mb-3 animate-spin" />
        <p className="text-sm text-gray-400">Chargement...</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Dashboard Super Admin
          </h1>
          <p className="text-sm text-gray-500">
            Vue globale de toutes les entreprises
          </p>
        </div>
        <button onClick={refresh} className="btn p-2" title="Actualiser">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Entreprises actives"
          value={stats?.tenants || tenants.length}
          icon={Building2}
          color="bg-purple-500"
          sub={`${blockedCount} bloquée(s)`}
        />
        <KpiCard
          label="Utilisateurs totaux"
          value={stats?.users || 0}
          icon={Users}
          color="bg-blue-500"
          sub="Tous tenants"
        />
        <KpiCard
          label="Ventes totales"
          value={(stats?.sales || 0).toLocaleString('fr-FR')}
          icon={ShoppingCart}
          color="bg-green-500"
          sub="Toutes entreprises"
        />
        <KpiCard
          label="CA total"
          value={(stats?.revenue || 0).toLocaleString('fr-FR')}
          unit="FCFA"
          icon={DollarSign}
          color="bg-amber-400"
          sub="Toutes entreprises"
        />
      </div>

      {/* Stats plans + activité */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">

        {/* Répartition plans */}
        <div className="card p-5">
          <h2 className="font-heading font-semibold text-gray-900 text-sm mb-4">
            Répartition des plans
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Gratuit',    count: planStats.free,       color: 'bg-gray-200',   text: 'text-gray-600'  },
              { label: 'Pro',        count: planStats.pro,        color: 'bg-blue-500',   text: 'text-blue-600'  },
              { label: 'Enterprise', count: planStats.enterprise, color: 'bg-amber-400',  text: 'text-amber-600' },
            ].map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">{p.label}</span>
                  <span className={`font-semibold ${p.text}`}>
                    {p.count} entreprise{p.count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${p.color}`}
                    style={{
                      width: tenants.length > 0
                        ? `${(p.count / tenants.length) * 100}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Totaux */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-2xl font-heading font-bold text-green-600">
                {activeCount}
              </p>
              <p className="text-xs text-gray-500">Actives</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-heading font-bold
                ${blockedCount > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                {blockedCount}
              </p>
              <p className="text-xs text-gray-500">Bloquées</p>
            </div>
          </div>
        </div>

        {/* Dernières inscriptions */}
        <div className="card p-5 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-gray-900 text-sm">
              Dernières entreprises inscrites
            </h2>
            <button
              onClick={() => navigate('/superadmin/tenants')}
              className="text-xs text-purple-600 hover:underline
                         flex items-center gap-1"
            >
              Voir tout <ArrowRight size={11} />
            </button>
          </div>

          {recentTenants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              Aucune entreprise
            </p>
          ) : (
            <div className="space-y-2">
              {recentTenants.map(t => {
                const membersCount = (t.tenant_members || [])
                  .filter(m => m.status === 'active').length
                return (
                  <div key={t.id}
                    className="flex items-center gap-3 p-3 rounded-xl
                               hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate('/superadmin/tenants')}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center
                                    justify-center font-semibold text-purple-700 text-sm
                                    flex-shrink-0">
                      {t.name.slice(0, 1).toUpperCase()}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {t.name}
                        </p>
                        <span className={`pill text-xs ${
                          t.plan === 'free'       ? 'pill-gray'   :
                          t.plan === 'pro'        ? 'pill-blue'   :
                          'pill-orange'
                        }`}>
                          {t.plan}
                        </span>
                        {!t.active && (
                          <span className="pill pill-red text-xs">bloqué</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {membersCount} membre{membersCount > 1 ? 's' : ''}
                        {' · '}
                        {new Date(t.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>

                    <ArrowRight size={14} className="text-gray-300 flex-shrink-0" />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}