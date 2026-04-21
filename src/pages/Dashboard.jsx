import { useNavigate } from 'react-router-dom'
import { useStats }    from '../hooks/useStats'
import { useStore }    from '../store/useStore'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
  TrendingUp, Package, DollarSign,
  AlertTriangle, Plus, RefreshCw
} from 'lucide-react'

function KpiCard({ label, value, unit, sub, subColor, icon: Icon, accent }) {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className={`absolute top-4 right-4 w-9 h-9 rounded-lg
                       flex items-center justify-center opacity-15 ${accent}`} />
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-heading font-bold text-gray-900">{value}</p>
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
      <p className={`text-xs mt-1.5 ${subColor || 'text-gray-400'}`}>{sub}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate    = useNavigate()
  const { user }    = useStore()
  const { data, loading, refresh } = useStats()

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'vous'

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <div className="text-center">
        <RefreshCw size={24} className="text-gray-300 mx-auto mb-3 animate-spin" />
        <p className="text-sm text-gray-400">Chargement du tableau de bord...</p>
      </div>
    </div>
  )

  const { kpis, chartData, recentSales } = data || {}

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Bonjour, {name} 👋
          </h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric',
              month: 'long', year: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="btn p-2" title="Actualiser">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => navigate('/sales/new')} className="btn btn-primary">
            <Plus size={15} /> Nouvelle vente
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="CA aujourd'hui"
          value={(kpis?.todayCA || 0).toLocaleString('fr-FR')}
          unit="FCFA"
          sub={`${kpis?.todaySalesCount || 0} vente(s)`}
          subColor="text-blue-600"
          accent="bg-primary"
        />
        <KpiCard
            label="Bénéfice estimé"
            value={(kpis?.todayBenef || 0).toLocaleString('fr-FR')}
            unit="FCFA"
            sub={`Marge moy. ${kpis?.margeAffichee || 0}%`}   // ← marge réelle
            subColor="text-green-600"
            accent="bg-green-500"
          />
       <KpiCard
  label="Valeur du stock"
  value={(kpis?.valeurStock || 0).toLocaleString('fr-FR')}
  unit="FCFA"
  sub={`${kpis?.totalStock || 0} unités en stock`}   // ← valeur réelle
  subColor="text-gray-400"
  accent="bg-amber-400"
/>
        <KpiCard
          label="Alertes stock"
          value={kpis?.lowStockCount || 0}
          sub={kpis?.lowStockCount > 0 ? 'À réapprovisionner' : 'Aucune alerte'}
          subColor={kpis?.lowStockCount > 0 ? 'text-red-500' : 'text-gray-400'}
          accent="bg-red-400"
        />
      </div>

      {/* Graphique + Top produits */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">

        {/* AreaChart ventes 7j */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-heading font-semibold text-gray-900">
              Ventes des 7 derniers jours
            </h2>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 bg-primary rounded inline-block" />
                Ventes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1.5 bg-green-500 rounded inline-block" />
                Bénéfices
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={chartData || []}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1E3A8A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gB" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                width={38}
              />
              <Tooltip
                formatter={(v, n) => [
                  `${v.toLocaleString('fr-FR')} FCFA`,
                  n === 'ventes' ? 'Ventes' : 'Bénéfices'
                ]}
                contentStyle={{
                  fontSize: 12, borderRadius: 8,
                  border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
              />
              <Area
                type="monotone" dataKey="ventes"
                stroke="#1E3A8A" strokeWidth={2}
                fill="url(#gV)"
              />
              <Area
                type="monotone" dataKey="benefices"
                stroke="#10B981" strokeWidth={2}
                fill="url(#gB)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alertes stock */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-heading font-semibold text-gray-900">
              Alertes stock
            </h2>
            {kpis?.lowStockCount > 0 && (
              <span className="pill pill-red flex items-center gap-1">
                <AlertTriangle size={10} />
                {kpis.lowStockCount}
              </span>
            )}
          </div>

          {kpis?.lowStockCount === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Tous les stocks sont OK</p>
            </div>
          ) : (
            <div className="space-y-3">
              {kpis?.lowStockItems?.map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.name}
                    </p>
                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          p.quantity === 0 ? 'bg-red-500' : 'bg-amber-400'
                        }`}
                        style={{
                          width: `${Math.min(
                            (p.quantity / Math.max(p.low_stock_threshold, 1)) * 100,
                            100
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                  <span className={`text-xs font-semibold whitespace-nowrap ${
                    p.quantity === 0 ? 'text-red-500' : 'text-amber-500'
                  }`}>
                    {p.quantity} / {p.low_stock_threshold}
                  </span>
                </div>
              ))}
              <button
                onClick={() => navigate('/purchases')}
                className="btn btn-primary w-full justify-center mt-2 text-sm"
              >
                Commander du stock
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ventes récentes */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-heading font-semibold text-gray-900">
            Ventes récentes
          </h2>
          <button
            onClick={() => navigate('/sales')}
            className="text-xs text-primary hover:underline"
          >
            Voir tout
          </button>
        </div>

        {!recentSales || recentSales.length === 0 ? (
          <div className="py-6 text-center text-gray-400 text-sm">
            Aucune vente sur les 7 derniers jours.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Réf</th>
                  <th className="th">Date</th>
                  <th className="th">Total</th>
                  <th className="th">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="td text-xs font-medium text-primary">
                      #{s.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="td text-xs text-gray-500">
                      {new Date(s.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="td font-semibold text-gray-900">
                      {s.total.toLocaleString('fr-FR')}
                      <span className="text-xs text-gray-400 ml-1">FCFA</span>
                    </td>
                    <td className="td">
                      <span className={`pill ${
                        s.status === 'payé'       ? 'pill-green'  :
                        s.status === 'en attente' ? 'pill-orange' :
                        'pill-red'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}