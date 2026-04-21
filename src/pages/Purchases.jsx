import { useState } from 'react'
import { usePurchases } from '../hooks/usePurchases'
import { useProducts }  from '../hooks/useProducts'
import { Plus, X, TrendingDown, Package } from 'lucide-react'

function PurchaseModal({ products, onClose, onSave }) {
  const [form,    setForm]    = useState({
    product_id:      '',
    product_name:    '',
    supplier:        '',
    quantity_received: '',
    subtotal:        '',
    transport_cost:  '',
    customs_cost:    '',
    status:          'reçu',
    notes:           '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Fournisseurs uniques depuis les produits
  const suppliers = [...new Set(products.map(p => p.supplier).filter(Boolean))]

  // Quand on sélectionne un produit → pré-remplir fournisseur
  const handleProductChange = (e) => {
    const product = products.find(p => p.id === e.target.value)
    if (!product) return
    setForm(f => ({
      ...f,
      product_id:   product.id,
      product_name: product.name,
      supplier:     product.supplier || f.supplier,
      subtotal:     product.purchase_price
        ? String(product.purchase_price)
        : f.subtotal,
    }))
  }

  const total =
    (parseFloat(form.subtotal)       || 0) +
    (parseFloat(form.transport_cost) || 0) +
    (parseFloat(form.customs_cost)   || 0)

  // Coût unitaire réel (avec frais)
  const unitCost = form.quantity_received > 0
    ? (total / parseInt(form.quantity_received)).toFixed(0)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id)         return setError('Sélectionnez un produit.')
    if (!form.quantity_received)  return setError('Indiquez la quantité reçue.')
    setError('')
    setLoading(true)
    try {
      await onSave({
        product_id:        form.product_id,
        product_name:      form.product_name,
        supplier:          form.supplier,
        quantity_received: parseInt(form.quantity_received),
        subtotal:          parseFloat(form.subtotal)       || 0,
        transport_cost:    parseFloat(form.transport_cost) || 0,
        customs_cost:      parseFloat(form.customs_cost)   || 0,
        status:            form.status,
        notes:             form.notes,
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
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            Nouvel achat / Réapprovisionnement
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Produit */}
          <div>
            <label className="label">Produit *</label>
            <select className="input" value={form.product_id}
              onChange={handleProductChange} required>
              <option value="">-- Sélectionner un produit --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.category ? `(${p.category})` : ''}
                  {' — Stock actuel : '}{p.quantity}
                </option>
              ))}
            </select>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="label">Fournisseur *</label>
            <select className="input" value={form.supplier}
              onChange={set('supplier')} required>
              <option value="">-- Sélectionner un fournisseur --</option>
              {suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__autre__">Autre (saisir manuellement)</option>
            </select>
            {/* Champ libre si "Autre" */}
            {form.supplier === '__autre__' && (
              <input className="input mt-2"
                placeholder="Nom du fournisseur..."
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
            )}
          </div>

          {/* Quantité reçue */}
          <div>
            <label className="label">Quantité reçue *</label>
            <input type="number" className="input" placeholder="0" min="1"
              value={form.quantity_received}
              onChange={set('quantity_received')} required />
          </div>

          {/* Coûts */}
          <div className="space-y-3">
            <div>
              <label className="label">Coût produits (FCFA)</label>
              <input type="number" className="input" placeholder="0" min="0"
                value={form.subtotal} onChange={set('subtotal')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Transport (FCFA)</label>
                <input type="number" className="input" placeholder="0" min="0"
                  value={form.transport_cost} onChange={set('transport_cost')} />
              </div>
              <div>
                <label className="label">Douane (FCFA)</label>
                <input type="number" className="input" placeholder="0" min="0"
                  value={form.customs_cost} onChange={set('customs_cost')} />
              </div>
            </div>
          </div>

          {/* Récap coût réel */}
          {total > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 flex items-center gap-2">
                  <TrendingDown size={14} /> Coût total
                </span>
                <span className="font-heading font-bold text-blue-700">
                  {total.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              {unitCost && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-500">Coût réel / unité</span>
                  <span className="text-xs font-semibold text-blue-600">
                    {parseInt(unitCost).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Statut */}
          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="reçu">Reçu — stock mis à jour immédiatement</option>
              <option value="en transit">En transit — stock mis à jour à la réception</option>
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2}
              placeholder="N° de suivi, détails..."
              value={form.notes} onChange={set('notes')} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">Annuler</button>
            <button type="submit" disabled={loading}
              className="btn btn-primary flex-1 justify-center">
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Purchases() {
  const { purchases, loading, stats, createPurchase, updateStatus } = usePurchases()
  const { products } = useProducts()
  const [modal, setModal] = useState(false)

  const statusColor = s =>
    s === 'reçu'       ? 'pill-green'  :
    s === 'en transit' ? 'pill-orange' :
    'pill-red'

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Achats & Réapprovisionnement
          </h1>
          <p className="text-sm text-gray-500">
            Le stock est mis à jour automatiquement à chaque achat
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn btn-primary">
          <Plus size={15} /> Nouvel achat
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total commandes</p>
          <p className="text-2xl font-heading font-semibold">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">En transit</p>
          <p className={`text-2xl font-heading font-semibold
            ${stats.transit > 0 ? 'text-amber-500' : 'text-gray-900'}`}>
            {stats.transit}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total dépensé</p>
          <p className="text-lg font-heading font-semibold text-red-500">
            {stats.totalSpent.toLocaleString('fr-FR')}
            <span className="text-xs text-gray-400 ml-1">FCFA</span>
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 text-center text-sm text-gray-400">
          Chargement...
        </div>
      ) : purchases.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">Aucun achat enregistré.</p>
          <button onClick={() => setModal(true)}
            className="btn btn-primary mx-auto">
            <Plus size={15} /> Premier achat
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Réf</th>
                  <th className="th">Produit</th>
                  <th className="th">Fournisseur</th>
                  <th className="th">Date</th>
                  <th className="th">Qté reçue</th>
                  <th className="th">Transport</th>
                  <th className="th">Douane</th>
                  <th className="th">Total</th>
                  <th className="th">Statut</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="td font-medium text-primary text-xs">
                      #{p.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="td font-medium text-gray-900">
                      {p.product_name || '—'}
                    </td>
                    <td className="td text-gray-500">{p.supplier}</td>
                    <td className="td text-xs text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="td">
                      <span className="pill pill-blue">
                        +{p.quantity_received}
                      </span>
                    </td>
                    <td className="td text-gray-500">
                      {(p.transport_cost || 0).toLocaleString('fr-FR')}
                    </td>
                    <td className="td text-gray-500">
                      {(p.customs_cost || 0).toLocaleString('fr-FR')}
                    </td>
                    <td className="td font-semibold text-gray-900">
                      {(p.total || 0).toLocaleString('fr-FR')}
                      <span className="text-xs text-gray-400 ml-1">FCFA</span>
                    </td>
                    <td className="td">
                      <select
                        value={p.status}
                        onChange={e => updateStatus(p.id, e.target.value)}
                        className={`pill cursor-pointer border-0 bg-transparent
                          font-medium text-xs outline-none ${statusColor(p.status)}`}
                      >
                        <option value="en transit">en transit</option>
                        <option value="reçu">reçu</option>
                        <option value="annulé">annulé</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <PurchaseModal
          products={products}
          onClose={() => setModal(false)}
          onSave={createPurchase}
        />
      )}
    </div>
  )
}