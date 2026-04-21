import { useState } from 'react'
import { useProducts } from '../hooks/useProducts'
import ProductModal from '../components/ProductModal'
import {
  Plus, Search, Edit2, Trash2,
  AlertTriangle, Package, RefreshCw
} from 'lucide-react'

export default function Products() {
  const {
    products, loading, error, stats, suppliers,
    createProduct, updateProduct, deleteProduct
  } = useProducts()

  const [modal,    setModal]    = useState(null)
  const [search,   setSearch]   = useState('')
  const [supplier, setSupplier] = useState('tous')

  // ─── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(search.toLowerCase())

    const matchSupplier =
      supplier === 'tous' ? true : p.supplier === supplier

    return matchSearch && matchSupplier
  })

  const handleSave = async (formData) => {
    if (modal === 'new') await createProduct(formData)
    else                 await updateProduct(modal.id, formData)
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`Supprimer "${product.name}" ?`)) return
    await deleteProduct(product.id)
  }

  const margin = (p) => {
    if (!p.purchase_price || p.purchase_price === 0) return null
    return (((p.sale_price - p.purchase_price) / p.purchase_price) * 100).toFixed(0)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
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
        <button onClick={() => setModal('new')} className="btn btn-primary">
          <Plus size={15} /> Ajouter produit
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total produits</p>
          <p className="text-2xl font-heading font-semibold">{stats.total}</p>
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
          <p className="text-lg font-heading font-semibold">
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

      {/* Search + filtre fournisseur */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Nom, catégorie..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filtre fournisseur dynamique */}
        <select
          className="input w-auto min-w-40"
          value={supplier}
          onChange={e => setSupplier(e.target.value)}
        >
          <option value="tous">Tous les fournisseurs</option>
          {suppliers.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* États */}
      {loading && (
        <div className="card p-12 text-center">
          <RefreshCw size={24} className="text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">Aucun produit trouvé.</p>
          {!search && supplier === 'tous' && (
            <button onClick={() => setModal('new')}
              className="btn btn-primary mx-auto">
              <Plus size={15} /> Ajouter un produit
            </button>
          )}
        </div>
      )}

      {/* Table */}
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
                  const m     = margin(p)
                  const isLow = p.quantity <= p.low_stock_threshold

                  return (
                    <tr key={p.id}
                      className="hover:bg-gray-50/50 transition-colors">

                      {/* Produit + image */}
                      <td className="td">
                        <div className="flex items-center gap-3">
                          {p.image_url ? (
                            <img
                              src={p.image_url}
                              alt={p.name}
                              className="w-10 h-10 rounded-lg object-cover
                                         border border-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100
                                            flex items-center justify-center flex-shrink-0">
                              <Package size={16} className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                            {p.description && (
                              <p className="text-xs text-gray-400 truncate max-w-36">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="td">
                        {p.category
                          ? <span className="pill pill-blue">{p.category}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>

                      <td className="td text-gray-600">
                        {p.purchase_price.toLocaleString('fr-FR')}
                      </td>

                      <td className="td font-medium text-primary">
                        {p.sale_price.toLocaleString('fr-FR')}
                      </td>

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

                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          {isLow && (
                            <AlertTriangle size={13}
                              className={p.quantity === 0
                                ? 'text-red-500' : 'text-amber-500'} />
                          )}
                          <span className={`pill ${
                            p.quantity === 0 ? 'pill-red'    :
                            isLow           ? 'pill-orange' :
                            'pill-green'
                          }`}>
                            {p.quantity}
                          </span>
                        </div>
                      </td>

                      <td className="td text-gray-500">
                        {p.supplier || '—'}
                      </td>

                      <td className="td">
                        <div className="flex gap-1.5">
                          <button onClick={() => setModal(p)}
                            className="p-1.5 rounded-lg hover:bg-blue-50
                                       text-blue-600 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50
                                       text-red-500 transition-colors">
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

      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}