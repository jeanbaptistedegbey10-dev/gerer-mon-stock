import { useState, useMemo } from 'react'
import { useStock }    from '../hooks/useStock'
import { useProducts } from '../hooks/useProducts'
import {
  ArrowDownCircle, ArrowUpCircle,
  RefreshCw, Search, Package
} from 'lucide-react'

const PERIODS = [
  { label: '1 jour',    days: 1   },
  { label: '1 semaine', days: 7   },
  { label: '2 semaines',days: 14  },
  { label: '1 mois',    days: 30  },
  { label: '3 mois',    days: 90  },
  { label: '1 an',      days: 365 },
]

export default function Stock() {
  const { moves, loading }         = useStock()
  const { products }               = useProducts()
  const [search,    setSearch]     = useState('')
  const [moveFilter, setMoveFilter]= useState('tous')   // tous | entrée | sortie
  const [period,    setPeriod]     = useState(30)       // jours pour stats produits

  // ── Filtre mouvements ──────────────────────────────────────────────────────
  const filteredMoves = useMemo(() => {
    return moves.filter(m => {
      const matchSearch = (m.product_name || '')
        .toLowerCase().includes(search.toLowerCase())
      const matchType = moveFilter === 'tous' ? true : m.type === moveFilter
      return matchSearch && matchType
    })
  }, [moves, search, moveFilter])

  // ── Stats par produit sur la période sélectionnée ─────────────────────────
  const productStats = useMemo(() => {
    const since = new Date()
    since.setDate(since.getDate() - period)
    since.setHours(0, 0, 0, 0)

    return products.map(p => {
      const prodMoves = moves.filter(m =>
        m.product_id === p.id &&
        new Date(m.created_at) >= since
      )
      const vendu  = prodMoves
        .filter(m => m.type === 'sortie')
        .reduce((s, m) => s + m.quantity, 0)
      const reçu   = prodMoves
        .filter(m => m.type === 'entrée')
        .reduce((s, m) => s + m.quantity, 0)

      return { ...p, vendu, reçu }
    })
  }, [products, moves, period])

  // Stats globales mouvements
  const totalEntrees = moves.filter(m => m.type === 'entrée').reduce((s, m) => s + m.quantity, 0)
  const totalSorties = moves.filter(m => m.type === 'sortie').reduce((s, m) => s + m.quantity, 0)
  const totalStock   = products.reduce((s, p) => s + (p.quantity || 0), 0)

  const filteredStats = productStats.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold text-gray-900">
          Stock
        </h1>
        <p className="text-sm text-gray-500">
          Quantités en stock et historique des mouvements
        </p>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total en stock</p>
          <p className="text-2xl font-heading font-semibold text-gray-900">
            {totalStock.toLocaleString('fr-FR')}
            <span className="text-xs text-gray-400 ml-1">unités</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total entrées</p>
          <p className="text-2xl font-heading font-semibold text-green-600">
            +{totalEntrees}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total sorties</p>
          <p className="text-2xl font-heading font-semibold text-red-500">
            -{totalSorties}
          </p>
        </div>
      </div>

      {/* ── Section 1 : Stock par produit ────────────────────────────────────── */}
      <div className="card mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-heading font-semibold text-gray-900 text-sm">
              Stock par produit
            </h2>
            {/* Filtre période */}
            <div className="flex gap-1.5 flex-wrap">
              {PERIODS.map(p => (
                <button
                  key={p.days}
                  onClick={() => setPeriod(p.days)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium
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
          </div>
          {/* Search */}
          <div className="relative mt-3">
            <Search size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-8 text-sm py-1.5"
              placeholder="Rechercher un produit..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Produit</th>
                <th className="th">Catégorie</th>
                <th className="th">Stock actuel</th>
                <th className="th">
                  Vendu
                  <span className="ml-1 font-normal text-gray-400">
                    ({PERIODS.find(p => p.days === period)?.label})
                  </span>
                </th>
                <th className="th">
                  Reçu
                  <span className="ml-1 font-normal text-gray-400">
                    ({PERIODS.find(p => p.days === period)?.label})
                  </span>
                </th>
                <th className="th">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td text-center text-gray-400 py-10">
                    Aucun produit trouvé.
                  </td>
                </tr>
              ) : filteredStats.map(p => {
                const isLow  = p.quantity <= p.low_stock_threshold
                const isZero = p.quantity === 0
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">

                    {/* Produit */}
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name}
                            className="w-8 h-8 rounded-lg object-cover
                                       border border-gray-100 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100
                                          flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                        <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                      </div>
                    </td>

                    {/* Catégorie */}
                    <td className="td">
                      {p.category
                        ? <span className="pill pill-blue">{p.category}</span>
                        : <span className="text-gray-300 text-sm">—</span>}
                    </td>

                    {/* Stock actuel */}
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-heading font-bold
                          ${isZero ? 'text-red-500'
                          : isLow  ? 'text-amber-500'
                          : 'text-gray-900'}`}>
                          {p.quantity}
                        </span>
                        {/* Barre visuelle */}
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isZero ? 'bg-red-500' :
                              isLow  ? 'bg-amber-400' : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                (p.quantity / Math.max(p.low_stock_threshold * 3, 1)) * 100,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Vendu sur la période */}
                    <td className="td">
                      {p.vendu > 0 ? (
                        <span className="flex items-center gap-1 text-red-500 font-medium text-sm">
                          <ArrowDownCircle size={13} />
                          {p.vendu}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">0</span>
                      )}
                    </td>

                    {/* Reçu sur la période */}
                    <td className="td">
                      {p.reçu > 0 ? (
                        <span className="flex items-center gap-1 text-green-600 font-medium text-sm">
                          <ArrowUpCircle size={13} />
                          {p.reçu}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">0</span>
                      )}
                    </td>

                    {/* Statut */}
                    <td className="td">
                      <span className={`pill ${
                        isZero ? 'pill-red'    :
                        isLow  ? 'pill-orange' :
                        'pill-green'
                      }`}>
                        {isZero ? 'Rupture' :
                         isLow  ? 'Faible'  : 'OK'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2 : Historique des mouvements ────────────────────────────── */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-heading font-semibold text-gray-900 text-sm">
              Historique des mouvements
            </h2>
            <div className="flex gap-2">
              {['tous', 'entrée', 'sortie'].map(f => (
                <button
                  key={f}
                  onClick={() => setMoveFilter(f)}
                  className={`btn text-xs py-1 capitalize
                    ${moveFilter === f ? 'btn-primary' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={22} className="text-gray-300 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-400">Chargement...</p>
          </div>
        ) : (
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
                {filteredMoves.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="td text-center text-gray-400 py-10">
                      Aucun mouvement trouvé.
                    </td>
                  </tr>
                ) : filteredMoves.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="td text-xs text-gray-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit'
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
                          : <ArrowDownCircle size={11} />}
                        {m.type}
                      </span>
                    </td>
                    <td className="td">
                      <span className={`font-semibold ${
                        m.type === 'entrée' ? 'text-green-600' : 'text-red-500'
                      }`}>
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
        )}
      </div>
    </div>
  )
}