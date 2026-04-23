import { useState, useMemo } from 'react'
import { useNavigate }       from 'react-router-dom'
import { useSales }          from '../hooks/useSales'
import { generateReceipt }   from '../utils/pdf'
import { Plus, FileText, Search } from 'lucide-react'

const PERIODS = [
  { label: '1 jour',     days: 1   },
  { label: '1 semaine',  days: 7   },
  { label: '2 semaines', days: 14  },
  { label: '1 mois',     days: 30  },
  { label: '3 mois',     days: 90  },
  { label: '1 an',       days: 365 },
]

export default function Sales() {
  const navigate             = useNavigate()
  const { sales, loading }   = useSales()
  const [search,  setSearch] = useState('')
  const [status,  setStatus] = useState('tous')
  const [period,  setPeriod] = useState(30)

  // ── Filtrage par période + search + statut ────────────────────────────────
  const filtered = useMemo(() => {
    const since = new Date()
    since.setDate(since.getDate() - period)
    since.setHours(0, 0, 0, 0)

    return sales.filter(s => {
      const matchPeriod = new Date(s.created_at) >= since
      const matchSearch =
        (s.client_name  || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.client_phone || '').toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase())
      const matchStatus = status === 'tous' ? true : s.status === status
      return matchPeriod && matchSearch && matchStatus
    })
  }, [sales, period, search, status])

  // ── Stats de la période sélectionnée ─────────────────────────────────────
  const periodStats = useMemo(() => {
    const totalCA    = filtered.reduce((s, v) => s + (v.total || 0), 0)
    const totalCount = filtered.length
    const avgTicket  = totalCount > 0 ? Math.round(totalCA / totalCount) : 0
    const pending    = filtered.filter(s => s.status === 'en attente').length
    return { totalCA, totalCount, avgTicket, pending }
  }, [filtered])

  const handlePDF = (sale) => {
    generateReceipt(sale, sale.sale_items || [], sale.discount || 0)
  }

  const statusColor = s =>
    s === 'payé'       ? 'pill-green'  :
    s === 'en attente' ? 'pill-orange' :
    'pill-red'

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Ventes
          </h1>
          <p className="text-sm text-gray-500">
            {periodStats.totalCount} vente(s) sur{' '}
            {PERIODS.find(p => p.days === period)?.label}
          </p>
        </div>
        <button onClick={() => navigate('/sales/new')} className="btn btn-primary">
          <Plus size={15} /> Nouvelle vente
        </button>
      </div>

      {/* Filtre période */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {PERIODS.map(p => (
          <button
            key={p.days}
            onClick={() => setPeriod(p.days)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all border
              ${period === p.days
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-gray-200 hover:border-primary/30'
              }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPIs de la période */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">
            CA — {PERIODS.find(p => p.days === period)?.label}
          </p>
          <p className="text-xl font-heading font-bold text-primary">
            {periodStats.totalCA.toLocaleString('fr-FR')}
            <span className="text-xs font-normal text-gray-400 ml-1">FCFA</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Nombre de ventes</p>
          <p className="text-2xl font-heading font-semibold text-gray-900">
            {periodStats.totalCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Ticket moyen</p>
          <p className="text-xl font-heading font-semibold text-gray-900">
            {periodStats.avgTicket.toLocaleString('fr-FR')}
            <span className="text-xs font-normal text-gray-400 ml-1">FCFA</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">En attente</p>
          <p className={`text-2xl font-heading font-semibold
            ${periodStats.pending > 0 ? 'text-amber-500' : 'text-gray-900'}`}>
            {periodStats.pending}
          </p>
        </div>
      </div>

      {/* Search + filtre statut */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9"
            placeholder="Client, téléphone, référence..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['tous', 'payé', 'en attente'].map(f => (
            <button key={f} onClick={() => setStatus(f)}
              className={`btn text-sm capitalize ${status === f ? 'btn-primary' : ''}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 text-center text-sm text-gray-400">
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-500 text-sm">
            Aucune vente sur cette période.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Réf</th>
                  <th className="th">Date</th>
                  <th className="th">Client</th>
                  <th className="th">Téléphone</th>
                  <th className="th">Produits</th>
                  <th className="th">Réduction</th>
                  <th className="th">Total</th>
                  <th className="th">Statut</th>
                  <th className="th">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sale => (
                  <tr key={sale.id}
                    className="hover:bg-gray-50/50 transition-colors">
                    <td className="td font-medium text-primary text-xs">
                      #{sale.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="td text-xs text-gray-500 whitespace-nowrap">
                      {new Date(sale.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="td">
                      {sale.client_name ||
                        <span className="text-gray-300">—</span>}
                    </td>
                    <td className="td text-gray-500 text-sm">
                      {sale.client_phone ||
                        <span className="text-gray-300">—</span>}
                    </td>
                    <td className="td text-gray-500 text-xs max-w-40 truncate">
                      {(sale.sale_items || [])
                        .map(i => `${i.product_name} ×${i.quantity}`)
                        .join(', ') || '—'}
                    </td>
                    <td className="td">
                      {sale.discount > 0 ? (
                        <span className="text-green-600 text-sm font-medium">
                          -{sale.discount.toLocaleString('fr-FR')} FCFA
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="td font-semibold text-gray-900 whitespace-nowrap">
                      {(sale.total || 0).toLocaleString('fr-FR')}
                      <span className="text-xs text-gray-400 ml-1">FCFA</span>
                    </td>
                    <td className="td">
                      <span className={`pill ${statusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="td">
                      <button onClick={() => handlePDF(sale)}
                        className="p-1.5 rounded-lg hover:bg-blue-50
                                   text-blue-600 transition-colors"
                        title="Télécharger le reçu">
                        <FileText size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer table — total visible */}
          <div className="p-4 border-t border-gray-100 bg-gray-50/50
                          flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {filtered.length} vente(s) affichée(s)
            </span>
            <span className="text-sm font-heading font-semibold text-primary">
              Total : {periodStats.totalCA.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>
      )}
    </div>
  )
}