import { useState } from 'react'
import { usePurchases } from '../hooks/usePurchases'
import { Plus, X, TrendingDown, Package } from 'lucide-react'

const EMPTY = {
  supplier: '', notes: '',
  subtotal: '', transport_cost: '', customs_cost: '',
  status: 'en transit',
}

function PurchaseModal({ onClose, onSave }) {
  const [form,    setForm]    = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Coût total calculé en temps réel
  const total =
    (parseFloat(form.subtotal)        || 0) +
    (parseFloat(form.transport_cost)  || 0) +
    (parseFloat(form.customs_cost)    || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSave({
        supplier:       form.supplier,
        notes:          form.notes,
        subtotal:       parseFloat(form.subtotal)       || 0,
        transport_cost: parseFloat(form.transport_cost) || 0,
        customs_cost:   parseFloat(form.customs_cost)   || 0,
        status:         form.status,
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
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            Nouvel achat / Import
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

          <div>
            <label className="label">Fournisseur *</label>
            <input className="input" placeholder="Ex: Shenzhen Tech Co."
              value={form.supplier} onChange={set('supplier')} required />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="label">Coût produits (FCFA) *</label>
              <input type="number" className="input" placeholder="0" min="0"
                value={form.subtotal} onChange={set('subtotal')} required />
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

          {/* Total calculé */}
          {total > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3
                            flex items-center justify-between">
              <span className="text-sm text-blue-700 flex items-center gap-2">
                <TrendingDown size={14} /> Coût total réel
              </span>
              <span className="font-heading font-bold text-blue-700">
                {total.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )}

          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="en transit">En transit</option>
              <option value="reçu">Reçu</option>
              <option value="annulé">Annulé</option>
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Détails commande, numéro de suivi..."
              value={form.notes} onChange={set('notes')} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn flex-1 justify-center">
              Annuler
            </button>
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
            Achats & Importations
          </h1>
          <p className="text-sm text-gray-500">
            Suivi des commandes fournisseurs
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
          <p className="text-2xl font-heading font-semibold text-gray-900">
            {stats.total}
          </p>
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
          <button onClick={() => setModal(true)} className="btn btn-primary mx-auto">
            <Plus size={15} /> Ajouter le premier achat
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Réf</th>
                  <th className="th">Fournisseur</th>
                  <th className="th">Date</th>
                  <th className="th">Produits</th>
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
                      {p.supplier}
                    </td>
                    <td className="td text-xs text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="td">
                      {(p.subtotal || 0).toLocaleString('fr-FR')}
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
                      {/* Clic pour changer le statut */}
                      <select
                        value={p.status}
                        onChange={e => updateStatus(p.id, e.target.value)}
                        className={`pill cursor-pointer border-0 bg-transparent
                          font-medium text-xs outline-none
                          ${statusColor(p.status)}`}
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
          onClose={() => setModal(false)}
          onSave={createPurchase}
        />
      )}
    </div>
  )
}