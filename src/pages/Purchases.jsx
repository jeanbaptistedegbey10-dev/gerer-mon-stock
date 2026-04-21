import { useState } from 'react'
import { usePurchases } from '../hooks/usePurchases'
import { useProducts }  from '../hooks/useProducts'
import { Plus, X, TrendingDown, Package } from 'lucide-react'

function PurchaseModal({ products, onClose, onSave }) {
  const [form, setForm] = useState({
    product_id:        '',
    product_name:      '',
    supplier:          '',
    quantity_received: '',
    transport_cost:    '',
    customs_cost:      '',
    status:            'reçu',
    notes:             '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const suppliers = [...new Set(products.map(p => p.supplier).filter(Boolean))]

  // Produit sélectionné
  const selectedProduct = products.find(p => p.id === form.product_id)

  // Quand on sélectionne un produit → pré-remplir fournisseur
  const handleProductChange = (e) => {
    const product = products.find(p => p.id === e.target.value)
    if (!product) return
    setForm(f => ({
      ...f,
      product_id:   product.id,
      product_name: product.name,
      supplier:     product.supplier || f.supplier,
    }))
  }

  // ── Calculs automatiques ──────────────────────────────────────────────────
  const qty           = parseInt(form.quantity_received)  || 0
  const prixAchat     = selectedProduct?.purchase_price   || 0
  const transport     = parseFloat(form.transport_cost)   || 0
  const douane        = parseFloat(form.customs_cost)     || 0

  const coutProduits  = prixAchat * qty                   // non modifiable
  const coutTotal     = coutProduits + transport + douane
  const coutUnitaire  = qty > 0 ? coutTotal / qty : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.product_id)        return setError('Sélectionnez un produit.')
    if (!form.quantity_received) return setError('Indiquez la quantité reçue.')
    setError('')
    setLoading(true)
    try {
      await onSave({
        product_id:        form.product_id,
        product_name:      form.product_name,
        supplier:          form.supplier,
        quantity_received: qty,
        subtotal:          coutProduits,   // prix_achat * qté
        transport_cost:    transport,
        customs_cost:      douane,
        cout_unitaire_reel: coutUnitaire,  // coût réel/unité stocké
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
                  {p.name} — Stock : {p.quantity} — Prix achat : {p.purchase_price.toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
          </div>

          {/* Fournisseur */}
          <div>
            <label className="label">Fournisseur *</label>
            <select className="input" value={form.supplier}
              onChange={set('supplier')} required>
              <option value="">-- Sélectionner --</option>
              {suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              <option value="__autre__">Autre...</option>
            </select>
            {form.supplier === '__autre__' && (
              <input className="input mt-2" placeholder="Nom du fournisseur..."
                onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} />
            )}
          </div>

          {/* Quantité */}
          <div>
            <label className="label">Quantité reçue *</label>
            <input type="number" className="input" placeholder="0" min="1"
              value={form.quantity_received}
              onChange={set('quantity_received')} required />
          </div>

          {/* Coût produits — lecture seule, calculé auto */}
          <div>
            <label className="label">
              Coût produits (FCFA)
              <span className="ml-1 text-gray-400 font-normal">
                — calculé automatiquement
              </span>
            </label>
            <div className="input bg-gray-50 text-gray-500 cursor-not-allowed
                            flex items-center justify-between">
              <span>
                {selectedProduct
                  ? `${selectedProduct.purchase_price.toLocaleString('fr-FR')} × ${qty || 0}`
                  : 'Sélectionnez un produit'}
              </span>
              <span className="font-semibold text-gray-700">
                {coutProduits > 0
                  ? `= ${coutProduits.toLocaleString('fr-FR')} FCFA`
                  : '—'}
              </span>
            </div>
          </div>

          {/* Transport + Douane — modifiables */}
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

          {/* Récap coût — visible dès qu'un produit + quantité sont sélectionnés */}
          {selectedProduct && qty > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Coût produits</span>
                <span>{coutProduits.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {transport > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Transport</span>
                  <span>+ {transport.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              {douane > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Douane</span>
                  <span>+ {douane.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="border-t border-blue-200 pt-2 flex justify-between
                              font-heading font-semibold text-blue-800">
                <span className="flex items-center gap-1">
                  <TrendingDown size={14} /> Coût total
                </span>
                <span>{coutTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600">
                <span>Coût réel / unité</span>
                <span className="font-semibold">
                  {Math.round(coutUnitaire).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
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