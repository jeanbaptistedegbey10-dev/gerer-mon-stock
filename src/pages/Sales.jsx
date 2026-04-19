import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSales }    from '../hooks/useSales'
import { generateReceipt } from '../utils/pdf'
import { Plus, FileText, Search, TrendingUp } from 'lucide-react'

export default function Sales() {
  const navigate = useNavigate()
  const { sales, loading, stats } = useSales()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')

  const filtered = sales.filter(s => {
    const matchSearch =
      (s.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'tous' ? true : s.status === filter
    return matchSearch && matchFilter
  })

  const handlePDF = (sale) => {
    generateReceipt(sale, sale.sale_items || [])
  }

  const statusColor = (s) =>
    s === 'payé'       ? 'pill-green'  :
    s === 'en attente' ? 'pill-orange' :
    'pill-red'

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">Ventes</h1>
          <p className="text-sm text-gray-500">{stats.total} ventes enregistrées</p>
        </div>
        <button onClick={() => navigate('/sales/new')} className="btn btn-primary">
          <Plus size={15} /> Nouvelle vente
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Ventes aujourd'hui</p>
          <p className="text-2xl font-heading font-semibold text-gray-900">
            {stats.todayCount}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">CA aujourd'hui</p>
          <p className="text-lg font-heading font-semibold text-primary">
            {stats.todayTotal.toLocaleString('fr-FR')}
            <span className="text-xs text-gray-400 ml-1">FCFA</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">En attente</p>
          <p className={`text-2xl font-heading font-semibold
            ${stats.pending > 0 ? 'text-amber-500' : 'text-gray-900'}`}>
            {stats.pending}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total ventes</p>
          <p className="text-2xl font-heading font-semibold text-gray-900">
            {stats.total}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Client, référence..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['tous', 'payé', 'en attente'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn text-sm capitalize ${filter === f ? 'btn-primary' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400 text-sm">Chargement...</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Référence</th>
                  <th className="th">Date</th>
                  <th className="th">Client</th>
                  <th className="th">Produits</th>
                  <th className="th">Total</th>
                  <th className="th">Statut</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="td font-medium text-primary text-xs">
                      #{sale.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="td text-gray-500 text-xs">
                      {new Date(sale.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="td">{sale.client_name || <span className="text-gray-300">—</span>}</td>
                    <td className="td text-gray-500 text-xs">
                      {(sale.sale_items || []).map(i => `${i.product_name} x${i.quantity}`).join(', ')}
                    </td>
                    <td className="td font-semibold text-gray-900">
                      {sale.total.toLocaleString('fr-FR')}
                      <span className="text-xs text-gray-400 ml-1">FCFA</span>
                    </td>
                    <td className="td">
                      <span className={`pill ${statusColor(sale.status)}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="td">
                      <button
                        onClick={() => handlePDF(sale)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                        title="Télécharger le reçu"
                      >
                        <FileText size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-gray-400 text-sm">
                Aucune vente trouvée.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}