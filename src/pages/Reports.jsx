import { useState, useMemo } from 'react'
import { useStats }   from '../hooks/useStats'
import { useSales }   from '../hooks/useSales'
import { useProducts } from '../hooks/useProducts'
import { usePurchases } from '../hooks/usePurchases'
import { generateReceipt } from '../utils/pdf'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Download, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PERIODS = [
  { label: '7 jours',    days: 7   },
  { label: '30 jours',   days: 30  },
  { label: '3 mois',     days: 90  },
  { label: '1 an',       days: 365 },
]

const COLORS = ['#1E3A8A', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

// ── Export rapport PDF ─────────────────────────────────────────────────────────
function exportReportPDF({ sales, products, purchases, period, tenantName }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()

  // En-tête
  doc.setFillColor(30, 58, 138)
  doc.rect(0, 0, W, 32, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(tenantName || 'Gérer mon stock', W / 2, 14, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `Rapport — ${period} derniers jours — ${new Date().toLocaleDateString('fr-FR')}`,
    W / 2, 24, { align: 'center' }
  )

  // KPIs
  doc.setTextColor(50, 50, 50)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Résumé de la période', 14, 44)

  const totalCA      = sales.reduce((s, v) => s + (v.total || 0), 0)
  const totalAchats  = purchases.reduce((s, p) => s + (p.total || 0), 0)
  const benefice     = totalCA - totalAchats
  const marge        = totalCA > 0 ? ((benefice / totalCA) * 100).toFixed(1) : 0

  autoTable(doc, {
    startY: 48,
    head:   [['Indicateur', 'Valeur']],
    body:   [
      ['Chiffre d\'affaires', `${totalCA.toLocaleString('fr-FR')} FCFA`],
      ['Total achats',        `${totalAchats.toLocaleString('fr-FR')} FCFA`],
      ['Bénéfice estimé',     `${benefice.toLocaleString('fr-FR')} FCFA`],
      ['Marge moyenne',       `${marge}%`],
      ['Nombre de ventes',    sales.length],
      ['Produits actifs',     products.length],
    ],
    headStyles:  { fillColor: [30, 58, 138], textColor: 255, fontSize: 10 },
    bodyStyles:  { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  // Ventes récentes
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Détail des ventes', 14, doc.lastAutoTable.finalY + 12)

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 16,
    head:   [['Date', 'Client', 'Total', 'Statut']],
    body:   sales.slice(0, 20).map(s => [
      new Date(s.created_at).toLocaleDateString('fr-FR'),
      s.client_name || '—',
      `${(s.total || 0).toLocaleString('fr-FR')} FCFA`,
      s.status,
    ]),
    headStyles:  { fillColor: [30, 58, 138], textColor: 255, fontSize: 9 },
    bodyStyles:  { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    margin: { left: 14, right: 14 },
  })

  // Produits
  if (doc.lastAutoTable.finalY < 220) {
    doc.addPage()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(50, 50, 50)
    doc.text('État du stock produits', 14, 20)

    autoTable(doc, {
      startY: 24,
      head:   [['Produit', 'Catégorie', 'Stock', 'Prix achat', 'Prix vente', 'Marge']],
      body:   products.map(p => {
        const marge = p.purchase_price > 0
          ? `${(((p.sale_price - p.purchase_price) / p.purchase_price) * 100).toFixed(0)}%`
          : '—'
        return [
          p.name,
          p.category || '—',
          p.quantity,
          `${(p.purchase_price || 0).toLocaleString('fr-FR')}`,
          `${(p.sale_price || 0).toLocaleString('fr-FR')}`,
          marge,
        ]
      }),
      headStyles:  { fillColor: [30, 58, 138], textColor: 255, fontSize: 9 },
      bodyStyles:  { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      margin: { left: 14, right: 14 },
    })
  }

  doc.save(`rapport-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Page Rapports ─────────────────────────────────────────────────────────────
export default function Reports() {
  const { data: statsData, loading: statsLoading } = useStats()
  const { sales,     loading: salesLoading }    = useSales()
  const { products,  loading: productsLoading } = useProducts()
  const { purchases, loading: purchasesLoading } = usePurchases()
  const { tenant } = { tenant: null } // on le récupère autrement

  const [period, setPeriod] = useState(30)

  // Filtrer par période
  const since = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - period)
    d.setHours(0, 0, 0, 0)
    return d
  }, [period])

  const filteredSales = useMemo(() =>
    sales.filter(s => new Date(s.created_at) >= since),
    [sales, since]
  )

  const filteredPurchases = useMemo(() =>
    purchases.filter(p => new Date(p.created_at) >= since),
    [purchases, since]
  )

  // KPIs calculés
  const kpis = useMemo(() => {
    const totalCA     = filteredSales.reduce((s, v) => s + (v.total || 0), 0)
    const totalAchats = filteredPurchases.reduce((s, p) => s + (p.total || 0), 0)
    const benefice    = totalCA - totalAchats
    const marge       = totalCA > 0
      ? ((benefice / totalCA) * 100).toFixed(1) : 0
    const avgTicket   = filteredSales.length > 0
      ? Math.round(totalCA / filteredSales.length) : 0
    return { totalCA, totalAchats, benefice, marge, avgTicket }
  }, [filteredSales, filteredPurchases])

  // Données graphique ventes par jour
  const salesChartData = useMemo(() => {
    const days = Math.min(period, 30)
    const data = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toDateString()
      const label   = i === 0 ? 'Auj.'
        : d.toLocaleDateString('fr-FR', {
            day: period <= 7 ? '2-digit' : undefined,
            weekday: period <= 7 ? 'short' : undefined,
            month: period > 7 ? 'short' : undefined,
          })
      const daySales = filteredSales.filter(s =>
        new Date(s.created_at).toDateString() === dateStr
      )
      data.push({
        label,
        ventes:    daySales.reduce((s, v) => s + (v.total || 0), 0),
        nombre:    daySales.length,
      })
    }
    return data
  }, [filteredSales, period])

  // Top produits vendus
  const topProducts = useMemo(() => {
    const map = {}
    filteredSales.forEach(sale => {
      (sale.sale_items || []).forEach(item => {
        if (!map[item.product_name]) {
          map[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 }
        }
        map[item.product_name].qty     += item.quantity
        map[item.product_name].revenue += item.total || 0
      })
    })
    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
  }, [filteredSales])

  // Répartition par catégorie
  const categoryData = useMemo(() => {
    const map = {}
    products.forEach(p => {
      const cat = p.category || 'Autre'
      if (!map[cat]) map[cat] = { name: cat, value: 0 }
      map[cat].value += p.sale_price * p.quantity
    })
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [products])

  const loading = statsLoading || salesLoading || productsLoading || purchasesLoading

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
            Vue d'ensemble de vos performances
          </p>
        </div>
        <button
          onClick={() => exportReportPDF({
            sales:     filteredSales,
            products,
            purchases: filteredPurchases,
            period,
            tenantName: 'Gérer mon stock',
          })}
          className="btn btn-primary"
        >
          <Download size={15} /> Exporter PDF
        </button>
      </div>

      {/* Filtre période */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {PERIODS.map(p => (
          <button key={p.days} onClick={() => setPeriod(p.days)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium
              transition-all border
              ${period === p.days
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-gray-200 hover:border-primary/30'
              }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Chiffre d\'affaires', value: kpis.totalCA,     unit: 'FCFA', color: 'text-primary',     trend: 'up'   },
          { label: 'Total achats',         value: kpis.totalAchats, unit: 'FCFA', color: 'text-red-500',     trend: 'down' },
          { label: 'Bénéfice',             value: kpis.benefice,    unit: 'FCFA', color: 'text-green-600',   trend: 'up'   },
          { label: 'Marge moyenne',        value: kpis.marge,       unit: '%',    color: 'text-amber-500',   trend: null   },
          { label: 'Ticket moyen',         value: kpis.avgTicket,   unit: 'FCFA', color: 'text-gray-900',    trend: null   },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-lg font-heading font-bold ${k.color}`}>
              {typeof k.value === 'number'
                ? k.value.toLocaleString('fr-FR') : k.value}
              <span className="text-xs font-normal text-gray-400 ml-1">
                {k.unit}
              </span>
            </p>
            {k.trend && (
              <p className={`text-xs mt-1 flex items-center gap-1
                ${k.trend === 'up' ? 'text-green-500' : 'text-red-400'}`}>
                {k.trend === 'up'
                  ? <TrendingUp size={11} />
                  : <TrendingDown size={11} />}
                {filteredSales.length} ventes
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">

        {/* Évolution CA */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-heading font-semibold text-gray-900 mb-4">
            Évolution du CA — {PERIODS.find(p => p.days === period)?.label}
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesChartData}
              margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gCA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1E3A8A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1E3A8A" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                width={38} />
              <Tooltip
                formatter={(v) => [`${v.toLocaleString('fr-FR')} FCFA`, 'CA']}
                contentStyle={{ fontSize: 12, borderRadius: 8,
                  border: '1px solid #f0f0f0' }} />
              <Area type="monotone" dataKey="ventes"
                stroke="#1E3A8A" strokeWidth={2}
                fill="url(#gCA)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition catégories */}
        <div className="card p-5">
          <h2 className="text-sm font-heading font-semibold text-gray-900 mb-4">
            Stock par catégorie
          </h2>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-300 text-sm">
              Aucune donnée
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%"
                    innerRadius={45} outerRadius={70}
                    dataKey="value" paddingAngle={3}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={v => [`${v.toLocaleString('fr-FR')} FCFA`, 'Valeur']}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.slice(0, 4).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="flex-1 text-gray-600 truncate">{c.name}</span>
                    <span className="font-medium text-gray-900">
                      {c.value.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top produits */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">

        <div className="card p-5">
          <h2 className="text-sm font-heading font-semibold text-gray-900 mb-4">
            Top 5 produits vendus
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Aucune vente sur cette période.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"
                  horizontal={false} />
                <XAxis type="number"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <YAxis type="category" dataKey="name" width={90}
                  tick={{ fontSize: 10, fill: '#374151' }}
                  axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={v => [`${v.toLocaleString('fr-FR')} FCFA`, 'CA']}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#1E3A8A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Résumé achats */}
        <div className="card p-5">
          <h2 className="text-sm font-heading font-semibold text-gray-900 mb-4">
            Résumé des achats
          </h2>
          {filteredPurchases.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Aucun achat sur cette période.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Fournisseur</th>
                    <th className="th">Produit</th>
                    <th className="th">Qté</th>
                    <th className="th">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.slice(0, 6).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50">
                      <td className="td text-xs text-gray-600">
                        {p.supplier || '—'}
                      </td>
                      <td className="td text-xs font-medium">
                        {p.product_name || '—'}
                      </td>
                      <td className="td text-xs">
                        {p.quantity_received || '—'}
                      </td>
                      <td className="td text-xs font-medium text-red-500">
                        {(p.total || 0).toLocaleString('fr-FR')} F
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stock faible */}
      {products.filter(p => p.quantity <= p.low_stock_threshold).length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-heading font-semibold text-gray-900 mb-4">
            ⚠ Produits en stock faible
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {products
              .filter(p => p.quantity <= p.low_stock_threshold)
              .map(p => (
                <div key={p.id}
                  className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-red-600 font-semibold mt-1">
                    {p.quantity} unités restantes
                  </p>
                  <div className="mt-2 h-1.5 bg-red-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400 rounded-full"
                      style={{
                        width: `${Math.min(
                          (p.quantity / Math.max(p.low_stock_threshold, 1)) * 100,
                          100
                        )}%`
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}