import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import ProductModal from '../components/ProductModal'
import {
  Plus, Search, Edit2, Trash2,
  AlertTriangle, Package, RefreshCw
} from 'lucide-react'

export default function Products() {
  const { products, loading, error, stats, createProduct, updateProduct, deleteProduct } = useProducts()

  // null = fermé | 'new' = ajout | {product} = édition
  const [modal,  setModal]  = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('tous') // tous | low_stock

  // ─── Filtrage local (rapide, sans appel réseau) ────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.supplier || '').toLowerCase().includes(search.toLowerCase())

    const matchFilter =
      filter === 'tous' ? true : p.quantity <= p.low_stock_threshold

    return matchSearch && matchFilter
  })

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSave = async (formData) => {
    if (modal === 'new') {
      await createProduct(formData)
    } else {
      await updateProduct(modal.id, formData)
    }
  }

  const handleDelete = async (product) => {
    const ok = window.confirm(`Supprimer "${product.name}" ?`)
    if (!ok) return
    await deleteProduct(product.id)
  }

  // ─── Calcul marge ─────────────────────────────────────────────────────────
  const margin = (p) => {
    if (!p.purchase_price || p.purchase_price === 0) return null
    return (((p.sale_price - p.purchase_price) / p.purchase_price) * 100).toFixed(0)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Produits
          </h1>
          <p className="text-sm text-gray-500">
            {stats.total} produits
            {stats.lowStock > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                · {stats.lowStock} en stock faible
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="btn btn-primary"
        >
          <Plus size={15} /> Ajouter produit
        </button>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total produits</p>
          <p className="text-2xl font-heading font-semibold text-gray-900">
            {stats.total}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Stock faible</p>
          <p className={`text-2xl font-heading font-semibold
            ${stats.lowStock > 0 ? 'text-red-500' : 'text-gray-900'}`}>
            {stats.lowStock}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Valeur achat</p>
          <p className="text-lg font-heading font-semibold text-gray-900">
            {stats.totalValue.toLocaleString('fr-FR')}
            <span className="text-xs text-gray-400 ml-1">FCFA</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Valeur vente</p>
          <p className="text-lg font-heading font-semibold text-green-600">
            {stats.totalRevenue.toLocaleString('fr-FR')}
            <span className="text-xs text-gray-400 ml-1">FCFA</span>
          </p>
        </div>
      </div>

      {/* ── Search + filtres ───────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            className="input pl-9"
            placeholder="Nom, catégorie, fournisseur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['tous', 'low_stock'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn text-sm ${
                filter === f ? 'btn-primary' : ''
              }`}
            >
              {f === 'tous' ? 'Tous' : '⚠ Stock faible'}
            </button>
          ))}
        </div>
      </div>

      {/* ── État chargement / erreur / vide ────────────────────────────────── */}
      {loading && (
        <div className="card p-12 text-center">
          <RefreshCw size={24} className="text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      )}

      {error && (
        <div className="card p-6 text-center border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            {search || filter !== 'tous'
              ? 'Aucun produit ne correspond à votre recherche.'
              : 'Aucun produit encore. Ajoutez votre premier produit !'}
          </p>
          {!search && filter === 'tous' && (
            <button
              onClick={() => setModal('new')}
              className="btn btn-primary mx-auto"
            >
              <Plus size={15} /> Ajouter un produit
            </button>
          )}
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Produit</th>
                  <th className="th">Catégorie</th>
                  <th className="th">Prix achat</th>
                  <th className="th">Prix vente</th>
                  <th className="th">Marge</th>
                  <th className="th">Stock</th>
                  <th className="th">Fournisseur</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const m      = margin(p)
                  const isLow  = p.quantity <= p.low_stock_threshold
                  const isZero = p.quantity === 0

                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">

                      {/* Nom */}
                      <td className="td">
                        <p className="font-medium text-gray-900">{p.name}</p>
                        {p.description && (
                          <p className="text-xs text-gray-400 truncate max-w-48">
                            {p.description}
                          </p>
                        )}
                      </td>

                      {/* Catégorie */}
                      <td className="td">
                        {p.category
                          ? <span className="pill pill-blue">{p.category}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>

                      {/* Prix achat */}
                      <td className="td text-gray-600">
                        {p.purchase_price.toLocaleString('fr-FR')}
                      </td>

                      {/* Prix vente */}
                      <td className="td font-medium text-primary">
                        {p.sale_price.toLocaleString('fr-FR')}
                      </td>

                      {/* Marge */}
                      <td className="td">
                        {m !== null && (
                          <span className={`pill ${
                            parseFloat(m) > 20  ? 'pill-green'  :
                            parseFloat(m) > 0   ? 'pill-orange' :
                            'pill-red'
                          }`}>
                            {parseFloat(m) > 0 ? '+' : ''}{m}%
                          </span>
                        )}
                      </td>

                      {/* Stock — avec alerte visuelle */}
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          {(isLow || isZero) && (
                            <AlertTriangle
                              size={13}
                              className={isZero ? 'text-red-500' : 'text-amber-500'}
                            />
                          )}
                          <span className={`pill ${
                            isZero ? 'pill-red'    :
                            isLow  ? 'pill-orange' :
                            'pill-green'
                          }`}>
                            {p.quantity}
                          </span>
                        </div>
                      </td>

                      {/* Fournisseur */}
                      <td className="td text-gray-500">
                        {p.supplier || '—'}
                      </td>

                      {/* Actions */}
                      <td className="td">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setModal(p)}
                            className="p-1.5 rounded-lg hover:bg-blue-50
                                       text-blue-600 transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50
                                       text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSubmit => handleSave(handleSubmit)}
        />
      )}
    </div>
  )
}