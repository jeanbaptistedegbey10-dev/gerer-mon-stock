import { useState, useMemo }    from 'react'
import { useStock }             from '../hooks/useStock'
import { useProducts }          from '../hooks/useProducts'
import { usePermissions }       from '../hooks/usePermissions'
import { useStore }             from '../store/useStore'
import { supabase }             from '../lib/supabase'
import {
  ArrowDownCircle, ArrowUpCircle,
  RefreshCw, Search, Package,
  Plus, X, AlertTriangle
} from 'lucide-react'

const PERIODS = [
  { label: '1 jour',     days: 1   },
  { label: '1 semaine',  days: 7   },
  { label: '2 semaines', days: 14  },
  { label: '1 mois',     days: 30  },
  { label: '3 mois',     days: 90  },
  { label: '1 an',       days: 365 },
]

// ── Modal ajustement stock ────────────────────────────────────────────────────
function StockAdjustModal({ products, onClose, onSave }) {
  const [form, setForm] = useState({
    product_id:   '',
    product_name: '',
    type:         'entrée',
    quantity:     '',
    reason:       '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const selectedProduct = products.find(p => p.id === form.product_id)

  const handleProductChange = (e) => {
    const p = products.find(p => p.id === e.target.value)
    if (!p) return
    setForm(f => ({ ...f, product_id: p.id, product_name: p.name }))
  }

  // Stock résultant après ajustement
  const newStock = (() => {
    if (!selectedProduct || !form.quantity) return null
    const qty = parseInt(form.quantity) || 0
    return form.type === 'entrée'
      ? selectedProduct.quantity + qty
      : Math.max(selectedProduct.quantity - qty, 0)
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id) return setError('Sélectionnez un produit.')
    if (!form.quantity || parseInt(form.quantity) <= 0)
      return setError('Quantité invalide.')
    if (!form.reason.trim())
      return setError('Indiquez la raison de l\'ajustement.')
    setError('')
    setLoading(true)
    try {
      await onSave({
        product_id:   form.product_id,
        product_name: form.product_name,
        type:         form.type,
        quantity:     parseInt(form.quantity),
        reason:       form.reason.trim(),
        new_stock:    newStock,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
                    flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between p-5
                        border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            Ajuster le stock
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700
                            text-sm px-3 py-2.5 rounded-lg border border-red-100">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Produit */}
          <div>
            <label className="label">Produit *</label>
            <select className="input" value={form.product_id}
              onChange={handleProductChange} required>
              <option value="">-- Sélectionner un produit --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — Stock actuel : {p.quantity}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="label">Type d'ajustement *</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-3 rounded-xl
                border-2 cursor-pointer transition-all
                ${form.type === 'entrée'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="type" value="entrée"
                  checked={form.type === 'entrée'}
                  onChange={set('type')}
                  className="accent-green-500" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpCircle size={14} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-900">
                      Entrée
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ajouter du stock
                  </p>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 rounded-xl
                border-2 cursor-pointer transition-all
                ${form.type === 'sortie'
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="type" value="sortie"
                  checked={form.type === 'sortie'}
                  onChange={set('type')}
                  className="accent-red-500" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <ArrowDownCircle size={14} className="text-red-500" />
                    <span className="text-sm font-medium text-gray-900">
                      Sortie
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Retirer du stock
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Quantité */}
          <div>
            <label className="label">Quantité *</label>
            <input
              type="number" min="1" className="input"
              placeholder="Ex: 10"
              value={form.quantity}
              onChange={set('quantity')}
              required
            />
          </div>

          {/* Aperçu stock résultant */}
          {selectedProduct && newStock !== null && (
            <div className={`rounded-xl px-4 py-3 flex items-center
              justify-between
              ${form.type === 'entrée'
                ? 'bg-green-50 border border-green-100'
                : 'bg-red-50 border border-red-100'}`}>
              <div>
                <p className="text-xs text-gray-500">Stock actuel</p>
                <p className="text-lg font-heading font-bold text-gray-900">
                  {selectedProduct.quantity}
                </p>
              </div>
              <div className="text-2xl text-gray-400">→</div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Nouveau stock</p>
                <p className={`text-lg font-heading font-bold
                  ${form.type === 'entrée' ? 'text-green-600' : 'text-red-500'}`}>
                  {newStock}
                </p>
              </div>
            </div>
          )}

          {/* Raison */}
          <div>
            <label className="label">Raison de l'ajustement *</label>
            <select className="input mb-2" value={form.reason}
              onChange={set('reason')}>
              <option value="">-- Sélectionner une raison --</option>
              <optgroup label="Entrées">
                <option value="Réapprovisionnement">Réapprovisionnement</option>
                <option value="Retour client">Retour client</option>
                <option value="Correction inventaire (ajout)">
                  Correction inventaire (ajout)
                </option>
                <option value="Don / Cadeau reçu">Don / Cadeau reçu</option>
              </optgroup>
              <optgroup label="Sorties">
                <option value="Produit endommagé">Produit endommagé</option>
                <option value="Produit expiré">Produit expiré</option>
                <option value="Vol / Perte">Vol / Perte</option>
                <option value="Correction inventaire (retrait)">
                  Correction inventaire (retrait)
                </option>
                <option value="Usage interne">Usage interne</option>
                <option value="Autre">Autre</option>
              </optgroup>
            </select>
            {/* Raison personnalisée si "Autre" */}
            {form.reason === 'Autre' && (
              <input className="input" placeholder="Précisez la raison..."
                onChange={e => setForm(f => ({
                  ...f, reason: e.target.value || 'Autre'
                }))} />
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className={`btn flex-1 justify-center
                ${form.type === 'entrée' ? 'btn-primary' : 'btn-danger'}`}>
              {loading ? 'Enregistrement...' : (
                form.type === 'entrée'
                  ? '+ Ajouter au stock'
                  : '- Retirer du stock'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page Stock ────────────────────────────────────────────────────────────────
export default function Stock() {
  const { moves, loading, refresh } = useStock()
  const { products, refresh: refreshProducts } = useProducts()
  const { can }  = usePermissions()
  const { user, tenant } = useStore()

  const [search,      setSearch]      = useState('')
  const [moveFilter,  setMoveFilter]  = useState('tous')
  const [period,      setPeriod]      = useState(30)
  const [modal,       setModal]       = useState(false)

  // ── Filtre mouvements ─────────────────────────────────────────────────────
  const filteredMoves = useMemo(() => {
    return moves.filter(m => {
      const matchSearch = (m.product_name || '')
        .toLowerCase().includes(search.toLowerCase())
      const matchType = moveFilter === 'tous' ? true : m.type === moveFilter
      return matchSearch && matchType
    })
  }, [moves, search, moveFilter])

  // ── Stats par produit sur la période ─────────────────────────────────────
  const productStats = useMemo(() => {
    const since = new Date()
    since.setDate(since.getDate() - period)
    since.setHours(0, 0, 0, 0)

    return products.map(p => {
      const prodMoves = moves.filter(m =>
        m.product_id === p.id &&
        new Date(m.created_at) >= since
      )
      const vendu = prodMoves
        .filter(m => m.type === 'sortie')
        .reduce((s, m) => s + m.quantity, 0)
      const recu = prodMoves
        .filter(m => m.type === 'entrée')
        .reduce((s, m) => s + m.quantity, 0)
      return { ...p, vendu, recu }
    })
  }, [products, moves, period])

  // Stats globales
  const totalEntrees = moves
    .filter(m => m.type === 'entrée').reduce((s, m) => s + m.quantity, 0)
  const totalSorties = moves
    .filter(m => m.type === 'sortie').reduce((s, m) => s + m.quantity, 0)
  const totalStock   = products.reduce((s, p) => s + (p.quantity || 0), 0)

  const filteredStats = productStats.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── Ajustement manuel ─────────────────────────────────────────────────────
  const handleAdjust = async ({
    product_id, product_name, type, quantity, reason, new_stock
  }) => {
    // 1. Mettre à jour la quantité du produit
    const { error: productError } = await supabase
      .from('products')
      .update({ quantity: new_stock })
      .eq('id', product_id)
      .eq('tenant_id', tenant.id)

    if (productError) throw productError

    // 2. Logger le mouvement
    const { error: moveError } = await supabase
      .from('stock_moves')
      .insert({
        tenant_id:    tenant.id,
        user_id:      user.id,
        created_by:   user.id,
        product_id,
        product_name,
        type,
        quantity,
        reason: `Ajustement manuel — ${reason}`,
      })

    if (moveError) throw moveError

    // 3. Rafraîchir les données
    await Promise.all([refresh(), refreshProducts()])
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Stock
          </h1>
          <p className="text-sm text-gray-500">
            Quantités en stock et historique des mouvements
          </p>
        </div>
        {/* Bouton ajustement — admin et manager uniquement */}
        {can('manage_stock') && (
          <button onClick={() => setModal(true)} className="btn btn-primary">
            <Plus size={15} /> Ajuster le stock
          </button>
        )}
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

      {/* ── Section 1 : Stock par produit ──────────────────────────────────── */}
      <div className="card mb-6">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-heading font-semibold text-gray-900 text-sm">
              Stock par produit
            </h2>
            {/* Filtre période */}
            <div className="flex gap-1.5 flex-wrap">
              {PERIODS.map(p => (
                <button key={p.days} onClick={() => setPeriod(p.days)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium
                    transition-all border
                    ${period === p.days
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-primary/30'
                    }`}>
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
                {can('manage_stock') && <th className="th">Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={7}
                    className="td text-center text-gray-400 py-10">
                    Aucun produit trouvé.
                  </td>
                </tr>
              ) : filteredStats.map(p => {
                const isLow  = p.quantity <= p.low_stock_threshold
                const isZero = p.quantity === 0
                return (
                  <tr key={p.id}
                    className="hover:bg-gray-50/50 transition-colors">

                    {/* Produit */}
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name}
                            className="w-8 h-8 rounded-lg object-cover
                                       border border-gray-100 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-100
                                          flex items-center justify-center
                                          flex-shrink-0">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                        <p className="font-medium text-gray-900 text-sm">
                          {p.name}
                        </p>
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
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full
                                        overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isZero ? 'bg-red-500' :
                              isLow  ? 'bg-amber-400' : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                (p.quantity / Math.max(
                                  p.low_stock_threshold * 3, 1
                                )) * 100, 100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Vendu */}
                    <td className="td">
                      {p.vendu > 0 ? (
                        <span className="flex items-center gap-1
                                         text-red-500 font-medium text-sm">
                          <ArrowDownCircle size={13} />
                          {p.vendu}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-sm">0</span>
                      )}
                    </td>

                    {/* Reçu */}
                    <td className="td">
                      {p.recu > 0 ? (
                        <span className="flex items-center gap-1
                                         text-green-600 font-medium text-sm">
                          <ArrowUpCircle size={13} />
                          {p.recu}
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

                    {/* Action rapide */}
                    {can('manage_stock') && (
                      <td className="td">
                        <button
                          onClick={() => setModal(true)}
                          className="p-1.5 rounded-lg hover:bg-blue-50
                                     text-blue-600 transition-colors text-xs
                                     flex items-center gap-1"
                          title="Ajuster le stock"
                        >
                          <Plus size={12} /> Ajuster
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2 : Historique mouvements ──────────────────────────────── */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="font-heading font-semibold text-gray-900 text-sm">
              Historique des mouvements
            </h2>
            <div className="flex gap-2">
              {['tous', 'entrée', 'sortie'].map(f => (
                <button key={f} onClick={() => setMoveFilter(f)}
                  className={`btn text-xs py-1 capitalize
                    ${moveFilter === f ? 'btn-primary' : ''}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw size={22}
              className="text-gray-300 mx-auto mb-3 animate-spin" />
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
                    <td colSpan={5}
                      className="td text-center text-gray-400 py-10">
                      Aucun mouvement trouvé.
                    </td>
                  </tr>
                ) : filteredMoves.map(m => (
                  <tr key={m.id}
                    className="hover:bg-gray-50/50 transition-colors">
                    <td className="td text-xs text-gray-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit',
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

      {/* Modal ajustement */}
      {modal && can('manage_stock') && (
        <StockAdjustModal
          products={products}
          onClose={() => setModal(false)}
          onSave={handleAdjust}
        />
      )}
    </div>
  )
}