import { useState, useMemo }    from 'react'
import { useStore }             from '../store/useStore'
import { usePermissions }       from '../hooks/usePermissions'
import { useSales }             from '../hooks/useSales'
import { useProducts }          from '../hooks/useProducts'
import { usePurchases }         from '../hooks/usePurchases'
import { useDeliveries }        from '../hooks/useDeliveries'
import { useStock }             from '../hooks/useStock'
import { useTeamMembers }       from '../hooks/useTeamMembers'
import { exportCSV }            from '../utils/exportCsv'
import { exportReportPDF }      from '../utils/exportPdf'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  Download, FileText, RefreshCw,
  TrendingUp, TrendingDown, Package,
  ShoppingCart, Truck, DollarSign,
  Table, BarChart3,
} from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '7 jours',    days: 7   },
  { label: '30 jours',   days: 30  },
  { label: '3 mois',     days: 90  },
  { label: '1 an',       days: 365 },
]

const COLORS = ['#1E3A8A', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

const TABS = [
  { id: 'ventes',     label: 'Ventes & CA',           icon: DollarSign  },
  { id: 'stock',      label: 'Stock & Inventaire',     icon: Package     },
  { id: 'achats',     label: 'Achats & Fournisseurs',  icon: ShoppingCart },
  { id: 'livraisons', label: 'Livraisons',             icon: Truck       },
]

const fmt = (n) =>
  Number(n || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

// ── Composant KPI ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, unit, sub, color = 'text-gray-900', trend }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-heading font-bold ${color}`}>
        {value}
        {unit && <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>}
      </p>
      {sub && (
        <p className={`text-xs mt-1 flex items-center gap-1
          ${trend === 'up'   ? 'text-green-500' :
            trend === 'down' ? 'text-red-400'   :
            'text-gray-400'}`}>
          {trend === 'up'   && <TrendingUp size={11} />}
          {trend === 'down' && <TrendingDown size={11} />}
          {sub}
        </p>
      )}
    </div>
  )
}

// ── Filtre période ────────────────────────────────────────────────────────────
function PeriodFilter({ period, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PERIODS.map(p => (
        <button key={p.days} onClick={() => onChange(p.days)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium
            transition-all border
            ${period === p.days
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-500 border-gray-200 hover:border-primary/30'
            }`}>
          {p.label}
        </button>
      ))}
    </div>
  )
}

// ── Onglet Ventes ─────────────────────────────────────────────────────────────
function SalesReport({ sales, members, period, can }) {
  const [view, setView] = useState('chart') // chart | table
  const { tenant } = useStore()

  const since = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const filtered = useMemo(() =>
    sales.filter(s => new Date(s.created_at) >= since),
    [sales, since]
  )

  // KPIs
  const totalCA     = filtered.reduce((s, v) => s + (v.total || 0), 0)
  const totalDiscount = filtered.reduce((s, v) => s + (v.discount || 0), 0)
  const avgTicket   = filtered.length > 0
    ? Math.round(totalCA / filtered.length) : 0
  const pending     = filtered.filter(s => s.status === 'en attente').length

  // Top produits vendus
  const productMap = {}
  filtered.forEach(sale => {
    (sale.sale_items || []).forEach(item => {
      if (!productMap[item.product_name]) {
        productMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 }
      }
      productMap[item.product_name].qty     += item.quantity
      productMap[item.product_name].revenue += item.total || 0
    })
  })
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // Données graphique par jour
  const chartData = useMemo(() => {
    const days = Math.min(period, 30)
    return Array.from({ length: days }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (days - 1 - i))
      const dateStr = d.toDateString()
      const label   = days <= 7
        ? d.toLocaleDateString('fr-FR', { weekday: 'short' })
        : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      const daySales = filtered.filter(s =>
        new Date(s.created_at).toDateString() === dateStr
      )
      return {
        label,
        CA:     daySales.reduce((s, v) => s + (v.total || 0), 0),
        nombre: daySales.length,
      }
    })
  }, [filtered, period])

  // Ventes par statut
  const statusData = [
    { name: 'Payé',       value: filtered.filter(s => s.status === 'payé').length },
    { name: 'En attente', value: filtered.filter(s => s.status === 'en attente').length },
    { name: 'Remboursé',  value: filtered.filter(s => s.status === 'remboursé').length },
  ].filter(s => s.value > 0)

  // Nom employé
  const getMember = (id) =>
    members.find(m => m.user_id === id)?.full_name || '—'

  // Export
  const handleExportCSV = () => {
    exportCSV(filtered, 'rapport-ventes', [
      { label: 'Date',     key: 'created_at' },
      { label: 'Client',   key: 'client_name' },
      { label: 'Téléphone',key: 'client_phone' },
      { label: 'Total',    key: 'total' },
      { label: 'Réduction',key: 'discount' },
      { label: 'Statut',   key: 'status' },
    ])
  }

  const handleExportPDF = () => {
    exportReportPDF({
      title:      'Rapport des Ventes',
      subtitle:   PERIODS.find(p => p.days === period)?.label,
      tenantName: tenant?.name,
      kpis: [
        { label: 'Chiffre d\'affaires', value: `${fmt(totalCA)} FCFA` },
        { label: 'Nombre de ventes',    value: filtered.length },
        { label: 'Ticket moyen',        value: `${fmt(avgTicket)} FCFA` },
        { label: 'Réductions totales',  value: `${fmt(totalDiscount)} FCFA` },
        { label: 'En attente',          value: pending },
      ],
      sections: [{
        title:   'Détail des ventes',
        headers: ['Date', 'Client', 'Produits', 'Total', 'Statut'],
        rows:    filtered.slice(0, 50).map(s => [
          new Date(s.created_at).toLocaleDateString('fr-FR'),
          s.client_name || '—',
          (s.sale_items || []).map(i => `${i.product_name} x${i.quantity}`).join(', '),
          `${fmt(s.total)} FCFA`,
          s.status,
        ]),
      }, {
        title:   'Top produits vendus',
        headers: ['Produit', 'Quantité vendue', 'CA généré'],
        rows:    topProducts.map(p => [
          p.name,
          p.qty,
          `${fmt(p.revenue)} FCFA`,
        ]),
      }],
    })
  }

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Chiffre d'affaires"
          value={fmt(totalCA)} unit="FCFA"
          color="text-primary" trend="up"
          sub={`${filtered.length} ventes`} />
        <KpiCard label="Ticket moyen"
          value={fmt(avgTicket)} unit="FCFA"
          color="text-gray-900" />
        <KpiCard label="Réductions accordées"
          value={fmt(totalDiscount)} unit="FCFA"
          color="text-amber-500"
          sub={`${filtered.filter(s => s.discount > 0).length} ventes avec remise`} />
        <KpiCard label="En attente paiement"
          value={pending}
          color={pending > 0 ? 'text-red-500' : 'text-gray-400'}
          trend={pending > 0 ? 'down' : undefined} />
      </div>

      {/* Boutons vue + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setView('chart')}
            className={`btn text-xs gap-1.5 ${view === 'chart' ? 'btn-primary' : ''}`}>
            <BarChart3 size={13} /> Graphiques
          </button>
          <button onClick={() => setView('table')}
            className={`btn text-xs gap-1.5 ${view === 'table' ? 'btn-primary' : ''}`}>
            <Table size={13} /> Tableau
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn text-xs gap-1.5">
            <Download size={13} /> CSV
          </button>
          {can('view_financials') && (
            <button onClick={handleExportPDF} className="btn text-xs gap-1.5">
              <FileText size={13} /> PDF
            </button>
          )}
        </div>
      </div>

      {view === 'chart' ? (
        <div className="grid lg:grid-cols-3 gap-4">

          {/* Courbe CA */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              Évolution du CA
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}
                margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1E3A8A" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false} width={40}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip
                  formatter={v => [`${fmt(v)} FCFA`, 'CA']}
                  contentStyle={{ fontSize: 11, borderRadius: 8,
                    border: '1px solid #f0f0f0' }} />
                <Area type="monotone" dataKey="CA"
                  stroke="#1E3A8A" strokeWidth={2} fill="url(#gCA)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Statuts */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              Statuts des ventes
            </h3>
            {statusData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-300 text-sm">
                Aucune donnée
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value" paddingAngle={3}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle" iconSize={8}
                    formatter={v => (
                      <span style={{ fontSize: 11, color: '#374151' }}>{v}</span>
                    )} />
                  <Tooltip
                    formatter={v => [v, 'ventes']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top produits */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              Top produits vendus
            </h3>
            {topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Aucune vente sur cette période.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts} layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"
                    horizontal={false} />
                  <XAxis type="number"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <YAxis type="category" dataKey="name" width={100}
                    tick={{ fontSize: 10, fill: '#374151' }}
                    axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={v => [`${fmt(v)} FCFA`, 'CA']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Ventes par employé */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              CA par employé
            </h3>
            <div className="space-y-3">
              {(() => {
                const byEmployee = {}
                filtered.forEach(s => {
                  const name = getMember(s.created_by) || 'Inconnu'
                  if (!byEmployee[name]) byEmployee[name] = { name, ca: 0, count: 0 }
                  byEmployee[name].ca    += s.total || 0
                  byEmployee[name].count += 1
                })
                return Object.values(byEmployee)
                  .sort((a, b) => b.ca - a.ca)
                  .map((e, i) => (
                    <div key={e.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium">{e.name}</span>
                        <span className="text-primary font-semibold">
                          {fmt(e.ca)} FCFA
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            background: COLORS[i % COLORS.length],
                            width: `${(e.ca / totalCA) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {e.count} vente{e.count > 1 ? 's' : ''}
                      </p>
                    </div>
                  ))
              })()}
            </div>
          </div>
        </div>
      ) : (
        /* Tableau détaillé */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Client</th>
                  <th className="th">Produits</th>
                  <th className="th">Réduction</th>
                  <th className="th">Total</th>
                  <th className="th">Statut</th>
                  <th className="th">Employé</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}
                      className="td text-center text-gray-400 py-10">
                      Aucune vente sur cette période.
                    </td>
                  </tr>
                ) : filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="td text-xs text-gray-500 whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="td text-sm">{s.client_name || '—'}</td>
                    <td className="td text-xs text-gray-500 max-w-40 truncate">
                      {(s.sale_items || [])
                        .map(i => `${i.product_name} ×${i.quantity}`)
                        .join(', ') || '—'}
                    </td>
                    <td className="td text-xs">
                      {s.discount > 0
                        ? <span className="text-green-600">
                            -{fmt(s.discount)} FCFA
                          </span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                    <td className="td font-semibold text-gray-900 whitespace-nowrap">
                      {fmt(s.total)} FCFA
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
                    <td className="td text-xs text-gray-500">
                      {getMember(s.created_by)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
            <div className="p-4 border-t border-gray-100 bg-gray-50/50
                            flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {filtered.length} ventes affichées
              </span>
              <span className="text-sm font-semibold text-primary">
                Total : {fmt(totalCA)} FCFA
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Onglet Stock ──────────────────────────────────────────────────────────────
function StockReport({ products, moves, period, can }) {
  const [view, setView] = useState('chart')
  const { tenant }      = useStore()

  const since = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const periodMoves = useMemo(() =>
    moves.filter(m => new Date(m.created_at) >= since),
    [moves, since]
  )

  const totalStock  = products.reduce((s, p) => s + (p.quantity || 0), 0)
  const valeurStock = products.reduce((s, p) =>
    s + (p.purchase_price || 0) * (p.quantity || 0), 0)
  const lowStock    = products.filter(p => p.quantity <= p.low_stock_threshold)
  const entrees     = periodMoves.filter(m => m.type === 'entrée')
    .reduce((s, m) => s + m.quantity, 0)
  const sorties     = periodMoves.filter(m => m.type === 'sortie')
    .reduce((s, m) => s + m.quantity, 0)

  // Par catégorie
  const catMap = {}
  products.forEach(p => {
    const cat = p.category || 'Autre'
    if (!catMap[cat]) catMap[cat] = { name: cat, quantite: 0, valeur: 0 }
    catMap[cat].quantite += p.quantity || 0
    catMap[cat].valeur   += (p.purchase_price || 0) * (p.quantity || 0)
  })
  const catData = Object.values(catMap).sort((a, b) => b.valeur - a.valeur)

  const handleExportCSV = () => {
    exportCSV(products, 'rapport-stock', [
      { label: 'Produit',      key: 'name'           },
      { label: 'Catégorie',    key: 'category'       },
      { label: 'Fournisseur',  key: 'supplier'       },
      { label: 'Stock',        key: 'quantity'       },
      { label: 'Seuil alerte', key: 'low_stock_threshold' },
      { label: 'Prix achat',   key: 'purchase_price' },
      { label: 'Prix vente',   key: 'sale_price'     },
    ])
  }

  const handleExportPDF = () => {
    exportReportPDF({
      title:      'Rapport de Stock & Inventaire',
      subtitle:   `${products.length} produits`,
      tenantName: tenant?.name,
      kpis: [
        { label: 'Total unités en stock',  value: fmt(totalStock) },
        { label: 'Valeur du stock',        value: `${fmt(valeurStock)} FCFA` },
        { label: 'Produits en stock faible', value: lowStock.length },
        { label: 'Entrées (période)',      value: `+${entrees}` },
        { label: 'Sorties (période)',      value: `-${sorties}` },
      ],
      sections: [
        {
          title:   'État du stock par produit',
          headers: ['Produit', 'Catégorie', 'Stock', 'Seuil', 'Valeur'],
          rows:    products.map(p => [
            p.name,
            p.category || '—',
            p.quantity,
            p.low_stock_threshold,
            `${fmt((p.purchase_price || 0) * (p.quantity || 0))} FCFA`,
          ]),
        },
        {
          title:   'Produits en stock faible',
          headers: ['Produit', 'Stock actuel', 'Seuil', 'Statut'],
          rows:    lowStock.map(p => [
            p.name,
            p.quantity,
            p.low_stock_threshold,
            p.quantity === 0 ? 'RUPTURE' : 'FAIBLE',
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total en stock"
          value={fmt(totalStock)} unit="unités"
          color="text-primary" />
        <KpiCard label="Valeur du stock"
          value={fmt(valeurStock)} unit="FCFA"
          color="text-gray-900" />
        <KpiCard label="Stock faible / rupture"
          value={lowStock.length}
          color={lowStock.length > 0 ? 'text-red-500' : 'text-gray-400'}
          trend={lowStock.length > 0 ? 'down' : undefined}
          sub={`sur ${products.length} produits`} />
        <KpiCard label={`Entrées / Sorties (${PERIODS.find(p => p.days === period)?.label})`}
          value={`+${entrees} / -${sorties}`}
          color="text-gray-700" />
      </div>

      {/* Vue + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setView('chart')}
            className={`btn text-xs gap-1.5 ${view === 'chart' ? 'btn-primary' : ''}`}>
            <BarChart3 size={13} /> Graphiques
          </button>
          <button onClick={() => setView('table')}
            className={`btn text-xs gap-1.5 ${view === 'table' ? 'btn-primary' : ''}`}>
            <Table size={13} /> Tableau
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn text-xs gap-1.5">
            <Download size={13} /> CSV
          </button>
          {can('view_financials') && (
            <button onClick={handleExportPDF} className="btn text-xs gap-1.5">
              <FileText size={13} /> PDF
            </button>
          )}
        </div>
      </div>

      {view === 'chart' ? (
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Valeur par catégorie */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              Valeur du stock par catégorie
            </h3>
            {catData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={catData}
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false} width={40}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={v => [`${fmt(v)} FCFA`, 'Valeur']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="valeur" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Alertes stock faible */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              ⚠ Produits en stock faible ({lowStock.length})
            </h3>
            {lowStock.length === 0 ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-center">
                  <Package size={28} className="text-green-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    Tous les stocks sont suffisants ✅
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-52 overflow-y-auto">
                {lowStock
                  .sort((a, b) => a.quantity - b.quantity)
                  .map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {p.name}
                        </p>
                        <div className="mt-1 h-1.5 bg-gray-100 rounded-full
                                        overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
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
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Produit</th>
                  <th className="th">Catégorie</th>
                  <th className="th">Fournisseur</th>
                  <th className="th">Stock</th>
                  <th className="th">Seuil alerte</th>
                  {can('view_financials') && <th className="th">Prix achat</th>}
                  {can('view_financials') && <th className="th">Valeur stock</th>}
                  <th className="th">Statut</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="td text-center text-gray-400 py-10">
                      Aucun produit.
                    </td>
                  </tr>
                ) : products
                  .sort((a, b) => a.quantity - b.quantity)
                  .map(p => {
                    const isLow  = p.quantity <= p.low_stock_threshold
                    const isZero = p.quantity === 0
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="td font-medium text-gray-900">{p.name}</td>
                        <td className="td text-xs text-gray-500">
                          {p.category || '—'}
                        </td>
                        <td className="td text-xs text-gray-500">
                          {p.supplier || '—'}
                        </td>
                        <td className="td">
                          <span className={`pill ${
                            isZero ? 'pill-red'    :
                            isLow  ? 'pill-orange' :
                            'pill-green'
                          }`}>
                            {p.quantity}
                          </span>
                        </td>
                        <td className="td text-xs text-gray-500">
                          {p.low_stock_threshold}
                        </td>
                        {can('view_financials') && (
                          <td className="td text-xs">
                            {fmt(p.purchase_price)} FCFA
                          </td>
                        )}
                        {can('view_financials') && (
                          <td className="td text-xs font-medium text-primary">
                            {fmt((p.purchase_price || 0) * (p.quantity || 0))} FCFA
                          </td>
                        )}
                        <td className="td">
                          <span className={`pill text-xs ${
                            isZero ? 'pill-red'    :
                            isLow  ? 'pill-orange' :
                            'pill-green'
                          }`}>
                            {isZero ? 'Rupture' : isLow ? 'Faible' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onglet Achats ─────────────────────────────────────────────────────────────
function PurchasesReport({ purchases, period, can }) {
  const [view, setView] = useState('chart')
  const { tenant }      = useStore()

  const since = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const filtered = useMemo(() =>
    purchases.filter(p => new Date(p.created_at) >= since),
    [purchases, since]
  )

  const totalDepenses  = filtered.reduce((s, p) => s + (p.total || 0), 0)
  const totalTransport = filtered.reduce((s, p) => s + (p.transport_cost || 0), 0)
  const totalDouane    = filtered.reduce((s, p) => s + (p.customs_cost || 0), 0)
  const totalProduits  = filtered.reduce((s, p) => s + (p.subtotal || 0), 0)

  // Par fournisseur
  const supplierMap = {}
  filtered.forEach(p => {
    const sup = p.supplier || 'Inconnu'
    if (!supplierMap[sup]) supplierMap[sup] = { name: sup, total: 0, count: 0 }
    supplierMap[sup].total += p.total || 0
    supplierMap[sup].count += 1
  })
  const supplierData = Object.values(supplierMap)
    .sort((a, b) => b.total - a.total)

  const handleExportCSV = () => {
    exportCSV(filtered, 'rapport-achats', [
      { label: 'Date',        key: 'created_at'      },
      { label: 'Produit',     key: 'product_name'    },
      { label: 'Fournisseur', key: 'supplier'        },
      { label: 'Quantité',    key: 'quantity_received' },
      { label: 'Produits',    key: 'subtotal'        },
      { label: 'Transport',   key: 'transport_cost'  },
      { label: 'Douane',      key: 'customs_cost'    },
      { label: 'Total',       key: 'total'           },
      { label: 'Statut',      key: 'status'          },
    ])
  }

  const handleExportPDF = () => {
    exportReportPDF({
      title:      'Rapport des Achats',
      subtitle:   PERIODS.find(p => p.days === period)?.label,
      tenantName: tenant?.name,
      kpis: [
        { label: 'Total dépenses',   value: `${fmt(totalDepenses)} FCFA`  },
        { label: 'Coût produits',    value: `${fmt(totalProduits)} FCFA`  },
        { label: 'Frais transport',  value: `${fmt(totalTransport)} FCFA` },
        { label: 'Frais douane',     value: `${fmt(totalDouane)} FCFA`    },
        { label: 'Nombre d\'achats', value: filtered.length               },
      ],
      sections: [{
        title:   'Détail des achats',
        headers: ['Date', 'Produit', 'Fournisseur', 'Qté', 'Total', 'Statut'],
        rows:    filtered.map(p => [
          new Date(p.created_at).toLocaleDateString('fr-FR'),
          p.product_name || '—',
          p.supplier     || '—',
          p.quantity_received || 0,
          `${fmt(p.total)} FCFA`,
          p.status,
        ]),
      }, {
        title:   'Par fournisseur',
        headers: ['Fournisseur', 'Commandes', 'Total dépensé'],
        rows:    supplierData.map(s => [
          s.name,
          s.count,
          `${fmt(s.total)} FCFA`,
        ]),
      }],
    })
  }

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total dépenses"
          value={fmt(totalDepenses)} unit="FCFA"
          color="text-red-500" trend="down"
          sub={`${filtered.length} commandes`} />
        <KpiCard label="Coût produits"
          value={fmt(totalProduits)} unit="FCFA"
          color="text-gray-900" />
        <KpiCard label="Frais transport"
          value={fmt(totalTransport)} unit="FCFA"
          color="text-amber-500" />
        <KpiCard label="Frais douane"
          value={fmt(totalDouane)} unit="FCFA"
          color="text-gray-700" />
      </div>

      {/* Vue + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setView('chart')}
            className={`btn text-xs gap-1.5 ${view === 'chart' ? 'btn-primary' : ''}`}>
            <BarChart3 size={13} /> Graphiques
          </button>
          <button onClick={() => setView('table')}
            className={`btn text-xs gap-1.5 ${view === 'table' ? 'btn-primary' : ''}`}>
            <Table size={13} /> Tableau
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn text-xs gap-1.5">
            <Download size={13} /> CSV
          </button>
          {can('view_financials') && (
            <button onClick={handleExportPDF} className="btn text-xs gap-1.5">
              <FileText size={13} /> PDF
            </button>
          )}
        </div>
      </div>

      {view === 'chart' ? (
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Par fournisseur */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              Dépenses par fournisseur
            </h3>
            {supplierData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Aucun achat sur cette période.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={supplierData}
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name"
                    tick={{ fontSize: 9, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false} width={40}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip
                    formatter={v => [`${fmt(v)} FCFA`, 'Total']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="total" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Répartition coûts */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              Répartition des coûts
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Produits',   value: totalProduits  },
                    { name: 'Transport',  value: totalTransport },
                    { name: 'Douane',     value: totalDouane    },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70}
                  dataKey="value" paddingAngle={3}
                >
                  {[0,1,2].map(i => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle" iconSize={8}
                  formatter={v => (
                    <span style={{ fontSize: 11, color: '#374151' }}>{v}</span>
                  )} />
                <Tooltip
                  formatter={v => [`${fmt(v)} FCFA`, '']}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Produit</th>
                  <th className="th">Fournisseur</th>
                  <th className="th">Quantité</th>
                  <th className="th">Transport</th>
                  <th className="th">Douane</th>
                  <th className="th">Total</th>
                  <th className="th">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}
                      className="td text-center text-gray-400 py-10">
                      Aucun achat sur cette période.
                    </td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="td text-xs text-gray-500 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="td font-medium text-sm">{p.product_name || '—'}</td>
                    <td className="td text-xs text-gray-500">{p.supplier || '—'}</td>
                    <td className="td">
                      <span className="pill pill-blue">+{p.quantity_received}</span>
                    </td>
                    <td className="td text-xs text-gray-500">
                      {fmt(p.transport_cost)} FCFA
                    </td>
                    <td className="td text-xs text-gray-500">
                      {fmt(p.customs_cost)} FCFA
                    </td>
                    <td className="td font-semibold text-red-500">
                      {fmt(p.total)} FCFA
                    </td>
                    <td className="td">
                      <span className={`pill ${
                        p.status === 'reçu'       ? 'pill-green'  :
                        p.status === 'en transit' ? 'pill-orange' :
                        'pill-red'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Onglet Livraisons ─────────────────────────────────────────────────────────
function DeliveriesReport({ deliveries, members, period }) {
  const [view, setView] = useState('chart')
  const { tenant }      = useStore()

  const since = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const filtered = useMemo(() =>
    deliveries.filter(d => new Date(d.created_at) >= since),
    [deliveries, since]
  )

  const totalLivrees   = filtered.filter(d => d.status === 'livré').length
  const totalEnCours   = filtered.filter(d => d.status === 'en cours').length
  const totalAnnulees  = filtered.filter(d => d.status === 'annulé').length
  const totalFrais     = filtered
    .filter(d => d.status === 'livré')
    .reduce((s, d) => s + (d.delivery_fee || 0), 0)
  const tauxReussite   = filtered.length > 0
    ? Math.round((totalLivrees / filtered.length) * 100) : 0

  // Par livreur
  const driverMap = {}
  filtered.forEach(d => {
    const name = d.driver_name || 'Non assigné'
    if (!driverMap[name]) driverMap[name] = {
      name, total: 0, livrees: 0, annulees: 0, frais: 0
    }
    driverMap[name].total   += 1
    if (d.status === 'livré')  driverMap[name].livrees  += 1
    if (d.status === 'annulé') driverMap[name].annulees += 1
    driverMap[name].frais += d.delivery_fee || 0
  })
  const driverData = Object.values(driverMap).sort((a, b) => b.total - a.total)

  // Statuts pour camembert
  const statusData = [
    { name: 'Livré',      value: totalLivrees  },
    { name: 'En cours',   value: totalEnCours  },
    { name: 'En attente', value: filtered.filter(d => d.status === 'en attente').length },
    { name: 'Annulé',     value: totalAnnulees },
  ].filter(s => s.value > 0)

  const handleExportCSV = () => {
    exportCSV(filtered, 'rapport-livraisons', [
      { label: 'Date',        key: 'created_at'      },
      { label: 'Client',      key: 'client_name'     },
      { label: 'Téléphone',   key: 'client_phone'    },
      { label: 'Adresse',     key: 'client_address'  },
      { label: 'Livreur',     key: 'driver_name'     },
      { label: 'Frais',       key: 'delivery_fee'    },
      { label: 'Statut',      key: 'status'          },
    ])
  }

  const handleExportPDF = () => {
    exportReportPDF({
      title:      'Rapport des Livraisons',
      subtitle:   PERIODS.find(p => p.days === period)?.label,
      tenantName: tenant?.name,
      kpis: [
        { label: 'Total livraisons',    value: filtered.length    },
        { label: 'Livrées avec succès', value: totalLivrees       },
        { label: 'Taux de réussite',    value: `${tauxReussite}%` },
        { label: 'Frais collectés',     value: `${fmt(totalFrais)} FCFA` },
        { label: 'Annulées',            value: totalAnnulees      },
      ],
      sections: [
        {
          title:   'Performance par livreur',
          headers: ['Livreur', 'Total', 'Livrées', 'Annulées', 'Frais collectés'],
          rows:    driverData.map(d => [
            d.name, d.total, d.livrees, d.annulees,
            `${fmt(d.frais)} FCFA`,
          ]),
        },
        {
          title:   'Détail des livraisons',
          headers: ['Date', 'Client', 'Livreur', 'Frais', 'Statut'],
          rows:    filtered.map(d => [
            new Date(d.created_at).toLocaleDateString('fr-FR'),
            d.client_name || d.client_phone || '—',
            d.driver_name || '—',
            `${fmt(d.delivery_fee)} FCFA`,
            d.status,
          ]),
        },
      ],
    })
  }

  return (
    <div className="space-y-4">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total livraisons"
          value={filtered.length}
          color="text-primary"
          sub={`${PERIODS.find(p => p.days === period)?.label}`} />
        <KpiCard label="Taux de réussite"
          value={`${tauxReussite}%`}
          color={tauxReussite >= 80 ? 'text-green-600' : 'text-amber-500'}
          trend={tauxReussite >= 80 ? 'up' : 'down'}
          sub={`${totalLivrees} livrées`} />
        <KpiCard label="Frais collectés"
          value={fmt(totalFrais)} unit="FCFA"
          color="text-primary" />
        <KpiCard label="Annulées"
          value={totalAnnulees}
          color={totalAnnulees > 0 ? 'text-red-500' : 'text-gray-400'}
          trend={totalAnnulees > 0 ? 'down' : undefined} />
      </div>

      {/* Vue + export */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <button onClick={() => setView('chart')}
            className={`btn text-xs gap-1.5 ${view === 'chart' ? 'btn-primary' : ''}`}>
            <BarChart3 size={13} /> Graphiques
          </button>
          <button onClick={() => setView('table')}
            className={`btn text-xs gap-1.5 ${view === 'table' ? 'btn-primary' : ''}`}>
            <Table size={13} /> Tableau
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="btn text-xs gap-1.5">
            <Download size={13} /> CSV
          </button>
          <button onClick={handleExportPDF} className="btn text-xs gap-1.5">
            <FileText size={13} /> PDF
          </button>
        </div>
      </div>

      {view === 'chart' ? (
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Statuts */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              Répartition par statut
            </h3>
            {statusData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Aucune livraison sur cette période.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value" paddingAngle={3}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={
                        i === 0 ? '#10B981' :
                        i === 1 ? '#F59E0B' :
                        i === 2 ? '#9CA3AF' :
                        '#EF4444'
                      } />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => (
                      <span style={{ fontSize: 11, color: '#374151' }}>{v}</span>
                    )} />
                  <Tooltip
                    formatter={v => [v, 'livraisons']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Performance livreurs */}
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
              Performance par livreur
            </h3>
            {driverData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Aucune donnée.
              </p>
            ) : (
              <div className="space-y-3">
                {driverData.map((d, i) => {
                  const taux = d.total > 0
                    ? Math.round((d.livrees / d.total) * 100) : 0
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center
                                          justify-center text-white text-xs font-bold"
                            style={{ background: COLORS[i % COLORS.length] }}>
                            {d.name.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {d.name}
                          </span>
                        </div>
                        <span className={`text-xs font-semibold ${
                          taux >= 80 ? 'text-green-600' : 'text-amber-500'
                        }`}>
                          {taux}% ({d.livrees}/{d.total})
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            background: COLORS[i % COLORS.length],
                            width: `${taux}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmt(d.frais)} FCFA collectés
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Client</th>
                  <th className="th">Adresse</th>
                  <th className="th">Livreur</th>
                  <th className="th">Frais</th>
                  <th className="th">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6}
                      className="td text-center text-gray-400 py-10">
                      Aucune livraison sur cette période.
                    </td>
                  </tr>
                ) : filtered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="td text-xs text-gray-500 whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short'
                      })}
                    </td>
                    <td className="td text-sm">
                      {d.client_name || d.client_phone || '—'}
                    </td>
                    <td className="td text-xs text-gray-500 max-w-40 truncate">
                      {d.client_address || '—'}
                    </td>
                    <td className="td text-xs text-gray-600">
                      {d.driver_name || '—'}
                    </td>
                    <td className="td text-xs font-medium text-primary">
                      {fmt(d.delivery_fee)} FCFA
                    </td>
                    <td className="td">
                      <span className={`pill ${
                        d.status === 'livré'      ? 'pill-green'  :
                        d.status === 'en cours'   ? 'pill-orange' :
                        d.status === 'en attente' ? 'pill-gray'   :
                        'pill-red'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale Rapports ──────────────────────────────────────────────────
export default function Reports() {
  const { can }               = usePermissions()
  const { sales,     loading: sl } = useSales()
  const { products,  loading: pl } = useProducts()
  const { purchases, loading: pu } = usePurchases()
  const { deliveries,loading: dl } = useDeliveries()
  const { moves }             = useStock()
  const { members }           = useTeamMembers()

  const [activeTab, setActiveTab] = useState('ventes')
  const [period,    setPeriod]    = useState(30)

  const loading = sl || pl || pu || dl

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <div className="text-center">
        <RefreshCw size={24} className="text-gray-300 mx-auto mb-3 animate-spin" />
        <p className="text-sm text-gray-400">Chargement des rapports...</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Rapports & Analyses
          </h1>
          <p className="text-sm text-gray-500">
            Graphiques, tableaux et exports PDF/CSV
          </p>
        </div>
      </div>

      {/* Filtre période global */}
      <div className="mb-4">
        <PeriodFilter period={period} onChange={setPeriod} />
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1
                      overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg
                text-sm font-medium transition-all whitespace-nowrap
                flex-1 justify-center
                ${activeTab === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}>
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenu par onglet */}
      {activeTab === 'ventes' && (
        <SalesReport
          sales={sales}
          members={members}
          period={period}
          can={can}
        />
      )}
      {activeTab === 'stock' && (
        <StockReport
          products={products}
          moves={moves}
          period={period}
          can={can}
        />
      )}
      {activeTab === 'achats' && (
        <PurchasesReport
          purchases={purchases}
          period={period}
          can={can}
        />
      )}
      {activeTab === 'livraisons' && (
        <DeliveriesReport
          deliveries={deliveries}
          members={members}
          period={period}
        />
      )}
    </div>
  )
}