import { useState } from 'react'
import { useStock } from '../hooks/useStock'
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Search } from 'lucide-react'

export default function Stock() {
  const { moves, loading, stats } = useStock()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous')

  const filtered = moves.filter(m => {
    const matchSearch = (m.product_name || '')
      .toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'tous' ? true : m.type === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold text-gray-900">
          Mouvements de stock
        </h1>
        <p className="text-sm text-gray-500">
          Historique complet des entrées et sorties
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total mouvements</p>
          <p className="text-2xl font-heading font-semibold text-gray-900">
            {stats.mouvements}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total entrées</p>
          <p className="text-2xl font-heading font-semibold text-green-600">
            +{stats.totalEntrees}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total sorties</p>
          <p className="text-2xl font-heading font-semibold text-red-500">
            -{stats.totalSorties}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['tous', 'entrée', 'sortie'].map(f => (
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
        <div className="card p-12 text-center">
          <RefreshCw size={24} className="text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Produit</th>
                  <th className="th">Type</th>
                  <th className="th">Quantité</th>
                  <th className="th">Motif</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="td text-center text-gray-400 py-12">
                      Aucun mouvement trouvé.
                    </td>
                  </tr>
                ) : filtered.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="td text-xs text-gray-500">
                      {new Date(m.created_at).toLocaleDateString('fr-FR', {
                        day:    '2-digit',
                        month:  'short',
                        hour:   '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="td font-medium text-gray-900">
                      {m.product_name}
                    </td>
                    <td className="td">
                      <span className={`pill flex items-center gap-1 w-fit
                        ${m.type === 'entrée' ? 'pill-green' : 'pill-red'}`}>
                        {m.type === 'entrée'
                          ? <ArrowUpCircle size={11} />
                          : <ArrowDownCircle size={11} />
                        }
                        {m.type}
                      </span>
                    </td>
                    <td className="td">
                      <span className={`font-semibold
                        ${m.type === 'entrée' ? 'text-green-600' : 'text-red-500'}`}>
                        {m.type === 'entrée' ? '+' : '-'}{m.quantity}
                      </span>
                    </td>
                    <td className="td text-gray-500 text-sm">
                      {m.reason || '—'}
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