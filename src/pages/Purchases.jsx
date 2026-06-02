import { usePurchases }   from '../hooks/usePurchases'
import { useProducts }    from '../hooks/useProducts'
import { useTeamMembers } from '../hooks/useTeamMembers'
import { usePermissions } from '../hooks/usePermissions'
import {
  Plus, X, TrendingDown, Package,
  Edit2, Trash2, Save, RefreshCw
} from 'lucide-react'

// ── Modal modification achat ──────────────────────────────────────────────────
function EditPurchaseModal({ purchase, products, onClose, onSave }) {
  const [form, setForm] = useState({
    supplier:          purchase.supplier          || '',
    quantity_received: purchase.quantity_received || '',
    transport_cost:    purchase.transport_cost    || '',
    customs_cost:      purchase.customs_cost      || '',
    status:            purchase.status            || 'reçu',
    notes:             purchase.notes             || '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(false)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const selectedProduct = products.find(p => p.id === purchase.product_id)
  const qty          = parseInt(form.quantity_received) || 0
  const prixAchat    = selectedProduct?.purchase_price  || 0
  const transport    = parseFloat(form.transport_cost)  || 0
  const douane       = parseFloat(form.customs_cost)    || 0
  const coutProduits = prixAchat * qty
  const coutTotal    = coutProduits + transport + douane
  const coutUnitaire = qty > 0 ? coutTotal / qty : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSave(purchase.id, {
        supplier:           form.supplier,
        product_id:         purchase.product_id,
        product_name:       purchase.product_name,
        quantity_received:  qty,
        subtotal:           coutProduits,
        transport_cost:     transport,
        customs_cost:       douane,
        cout_unitaire_reel: coutUnitaire,
        status:             form.status,
        notes:              form.notes,
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
        <div className="flex items-center justify-between p-5
                        border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            Modifier l'achat
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

          {/* Produit — lecture seule */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Produit</p>
            <p className="font-medium text-gray-900">
              {purchase.product_name}
            </p>
          </div>

          <div>
            <label className="label">Fournisseur</label>
            <input className="input" value={form.supplier}
              onChange={set('supplier')} />
          </div>

          <div>
            <label className="label">Quantité reçue</label>
            <input type="number" min="1" className="input"
              value={form.quantity_received}
              onChange={set('quantity_received')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Transport (FCFA)</label>
              <input type="number" min="0" className="input"
                value={form.transport_cost}
                onChange={set('transport_cost')} />
            </div>
            <div>
              <label className="label">Douane (FCFA)</label>
              <input type="number" min="0" className="input"
                value={form.customs_cost}
                onChange={set('customs_cost')} />
            </div>
          </div>

          {/* Récap */}
          {qty > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl
                            p-4 space-y-1.5">
              <div className="flex justify-between text-sm text-blue-700">
                <span>Coût produits</span>
                <span>{coutProduits.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between font-semibold text-blue-800
                              border-t border-blue-200 pt-1.5">
                <span>Coût total</span>
                <span>{coutTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between text-xs text-blue-600">
                <span>Coût réel / unité</span>
                <span>{Math.round(coutUnitaire).toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          )}

          <div>
            <label className="label">Statut</label>
            <select className="input" value={form.status}
              onChange={set('status')}>
              <option value="reçu">Reçu</option>
              <option value="en transit">En transit</option>
              <option value="annulé">Annulé</option>
            </select>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2}
              value={form.notes} onChange={set('notes')} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">Annuler</button>
            <button type="submit" disabled={loading}
              className="btn btn-primary flex-1 justify-center">
              {loading
                ? <><RefreshCw size={13} className="animate-spin" /> Sauvegarde...</>
                : <><Save size={13} /> Sauvegarder</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Dans le composant Purchases, ajoutez :
export default function Purchases() {
  const {
    purchases, loading, stats,
    createPurchase, updatePurchase,
    deletePurchase, updateStatus
  } = usePurchases()
  const { products }  = useProducts()
  const { members }   = useTeamMembers()
  const { can }       = usePermissions()

  const [modal,          setModal]          = useState(false)
  const [editModal,      setEditModal]      = useState(null)
  const [period,         setPeriod]         = useState(30)
  const [employeeFilter, setEmployeeFilter] = useState('tous')
  const [productFilter,  setProductFilter]  = useState('')

  const PERIODS = [
    { label: '1 jour',     days: 1   },
    { label: '1 semaine',  days: 7   },
    { label: '2 semaines', days: 14  },
    { label: '1 mois',     days: 30  },
    { label: '3 mois',     days: 90  },
    { label: '1 an',       days: 365 },
  ]

  const since = new Date()
  since.setDate(since.getDate() - period)
  since.setHours(0, 0, 0, 0)

  const filtered = purchases.filter(p => {
    const matchPeriod   = new Date(p.created_at) >= since
    const matchEmployee = employeeFilter === 'tous'
      ? true : p.created_by === employeeFilter
    const matchProduct  = productFilter === ''
      ? true : p.product_name === productFilter
    return matchPeriod && matchEmployee && matchProduct
  })

  // Liste produits uniques pour le filtre
  const allProductNames = [...new Set(
    purchases.map(p => p.product_name).filter(Boolean)
  )].sort()

  const getMemberName = (userId) =>
    members.find(m => m.user_id === userId)?.full_name || '—'

  const handleDelete = async (purchase) => {
    if (!window.confirm(
      `Supprimer cet achat ?\n\n` +
      `${purchase.status === 'reçu'
        ? '⚠ Le stock sera décrémenté automatiquement.'
        : ''}`
    )) return
    try {
      await deletePurchase(purchase.id)
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

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
            Le stock est mis à jour automatiquement
          </p>
        </div>
        {can('manage_purchases') && (
          <button onClick={() => setModal(true)} className="btn btn-primary">
            <Plus size={15} /> Nouvel achat
          </button>
        )}
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
            ${stats.transit > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
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

      {/* Filtres période */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {PERIODS.map(p => (
          <button key={p.days} onClick={() => setPeriod(p.days)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium
              transition-all border
              ${period === p.days
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-500 border-gray-200 hover:border-primary/30'
              }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Filtres produit + employé */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select className="input w-auto min-w-48"
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}>
          <option value="">Tous les produits</option>
          {allProductNames.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className="input w-auto min-w-40"
          value={employeeFilter}
          onChange={e => setEmployeeFilter(e.target.value)}>
          <option value="tous">Tous les employés</option>
          {members.map(m => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name || m.email}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 text-center text-sm text-gray-400">
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            Aucun achat sur cette période.
          </p>
          {can('manage_purchases') && (
            <button onClick={() => setModal(true)}
              className="btn btn-primary mx-auto">
              <Plus size={15} /> Premier achat
            </button>
          )}
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
                  <th className="th">Qté</th>
                  <th className="th">Coût/unité</th>
                  <th className="th">Total</th>
                  <th className="th">Employé</th>
                  <th className="th">Statut</th>
                  {can('manage_purchases') && <th className="th">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}
                    className="hover:bg-gray-50/50 transition-colors">
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
                    <td className="td text-xs font-medium text-primary">
                      {p.cout_unitaire_reel
                        ? `${Math.round(p.cout_unitaire_reel).toLocaleString('fr-FR')} FCFA`
                        : '—'}
                    </td>
                    <td className="td font-semibold text-gray-900">
                      {(p.total || 0).toLocaleString('fr-FR')}
                      <span className="text-xs text-gray-400 ml-1">FCFA</span>
                    </td>
                    <td className="td text-xs text-gray-500">
                      {getMemberName(p.created_by)}
                    </td>
                    <td className="td">
                      {can('manage_purchases') ? (
                        <select
                          value={p.status}
                          onChange={e => updateStatus(p.id, e.target.value)}
                          className={`pill cursor-pointer border-0
                            bg-transparent font-medium text-xs outline-none
                            ${statusColor(p.status)}`}>
                          <option value="en transit">en transit</option>
                          <option value="reçu">reçu</option>
                          <option value="annulé">annulé</option>
                        </select>
                      ) : (
                        <span className={`pill ${statusColor(p.status)}`}>
                          {p.status}
                        </span>
                      )}
                    </td>
                    {can('manage_purchases') && (
                      <td className="td">
                        <div className="flex gap-1.5">
                          <button onClick={() => setEditModal(p)}
                            className="p-1.5 rounded-lg hover:bg-amber-50
                                       text-amber-500 transition-colors"
                            title="Modifier">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg hover:bg-red-50
                                       text-red-400 transition-colors"
                            title="Supprimer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <PurchaseModal
          products={products}
          onClose={() => setModal(false)}
          onSave={createPurchase}
        />
      )}
      {editModal && (
        <EditPurchaseModal
          purchase={editModal}
          products={products}
          onClose={() => setEditModal(null)}
          onSave={updatePurchase}
        />
      )}
    </div>
  )
}