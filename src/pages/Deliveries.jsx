import { useState, useMemo } from 'react'
import { useDeliveries } from '../hooks/useDeliveries'
import { useSales }      from '../hooks/useSales'
import {
  Plus, X, Truck, Phone, MapPin,
  User, FileText, Trash2, RefreshCw,
  Search, ChevronDown, Package
} from 'lucide-react'

// ── Couleurs statuts ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  'en attente': { pill: 'pill-gray',   label: 'En attente' },
  'en cours':   { pill: 'pill-orange', label: 'En cours'   },
  'livré':      { pill: 'pill-green',  label: 'Livré'      },
  'annulé':     { pill: 'pill-red',    label: 'Annulé'     },
}

// ── Étapes visuelles du suivi ─────────────────────────────────────────────────
const STEPS = ['en attente', 'en cours', 'livré']

function StatusStepper({ status }) {
  const currentIdx = STEPS.indexOf(status)
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center
            text-xs font-bold transition-all
            ${i <= currentIdx && status !== 'annulé'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-400'
            }`}>
            {i < currentIdx && status !== 'annulé' ? '✓' : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-0.5 transition-all
              ${i < currentIdx && status !== 'annulé'
                ? 'bg-primary' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Modal ajout livraison ─────────────────────────────────────────────────────
function DeliveryModal({ sales, onClose, onSave }) {
  const [form, setForm] = useState({
    sale_id:       '',
    client_name:   '',
    client_phone:  '',
    client_address:'',
    delivery_fee:  '',
    status:        'en attente',
    notes:         '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Quand on sélectionne une vente → pré-remplir le client
  const handleSaleChange = (e) => {
    const sale = sales.find(s => s.id === e.target.value)
    if (!sale) return
    setForm(f => ({
      ...f,
      sale_id:      sale.id,
      client_name:  sale.client_name  || f.client_name,
      client_phone: sale.client_phone || f.client_phone,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.client_name)    return setError('Indiquez le nom du client.')
    if (!form.client_address) return setError('Indiquez l\'adresse de livraison.')
    setError('')
    setLoading(true)
    try {
      await onSave({
        sale_id:        form.sale_id        || null,
        client_name:    form.client_name.trim(),
        client_phone:   form.client_phone.trim(),
        client_address: form.client_address.trim(),
        delivery_fee:   parseFloat(form.delivery_fee) || 0,
        status:         form.status,
        notes:          form.notes.trim(),
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Ventes disponibles (non annulées)
  const availableSales = sales.filter(s => s.status !== 'remboursé')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
                    flex items-center justify-center p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            Nouvelle livraison
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

          {/* Vente liée — optionnel */}
          <div>
            <label className="label">
              Vente liée
              <span className="ml-1 text-gray-400 font-normal">(optionnel)</span>
            </label>
            <select className="input" value={form.sale_id}
              onChange={handleSaleChange}>
              <option value="">-- Sélectionner une vente --</option>
              {availableSales.map(s => (
                <option key={s.id} value={s.id}>
                  #{s.id.slice(0, 8).toUpperCase()}
                  {s.client_name ? ` — ${s.client_name}` : ''}
                  {' — '}{(s.total || 0).toLocaleString('fr-FR')} FCFA
                </option>
              ))}
            </select>
          </div>

          {/* Infos client */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Informations client
            </p>
            <div>
              <label className="label flex items-center gap-1">
                <User size={11} /> Nom client *
              </label>
              <input className="input" placeholder="Nom complet..."
                value={form.client_name} onChange={set('client_name')} required />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <Phone size={11} /> Téléphone
              </label>
              <input className="input" placeholder="+228 90 00 00 00"
                type="tel"
                value={form.client_phone} onChange={set('client_phone')} />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <MapPin size={11} /> Adresse de livraison *
              </label>
              <textarea className="input resize-none" rows={2}
                placeholder="Quartier, rue, point de repère..."
                value={form.client_address} onChange={set('client_address')}
                required />
            </div>
          </div>

          {/* Frais + statut */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Frais livraison (FCFA)</label>
              <input type="number" className="input" placeholder="0" min="0"
                value={form.delivery_fee} onChange={set('delivery_fee')} />
            </div>
            <div>
              <label className="label">Statut initial</label>
              <select className="input" value={form.status}
                onChange={set('status')}>
                <option value="en attente">En attente</option>
                <option value="en cours">En cours</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Instructions spéciales, notes livreur..."
              value={form.notes} onChange={set('notes')} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">Annuler</button>
            <button type="submit" disabled={loading}
              className="btn btn-primary flex-1 justify-center">
              {loading ? 'Création...' : 'Créer la livraison'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Deliveries() {
  const {
    deliveries, loading, stats,
    createDelivery, updateStatus, deleteDelivery
  } = useDeliveries()
  const { sales } = useSales()

  const [modal,        setModal]        = useState(false)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [expanded,     setExpanded]     = useState(null) // id de la livraison ouverte

  // ── Filtrage ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return deliveries.filter(d => {
      const matchSearch =
        (d.client_name    || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.client_address || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.client_phone   || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus =
        statusFilter === 'tous' ? true : d.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [deliveries, search, statusFilter])

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette livraison ?')) return
    await deleteDelivery(id)
  }

  const toggleExpand = (id) => {
    setExpanded(prev => prev === id ? null : id)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Livraisons
          </h1>
          <p className="text-sm text-gray-500">
            Suivi des commandes client
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn btn-primary">
          <Plus size={15} /> Nouvelle livraison
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">En attente</p>
          <p className={`text-2xl font-heading font-semibold
            ${stats.enAttente > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
            {stats.enAttente}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">En cours</p>
          <p className={`text-2xl font-heading font-semibold
            ${stats.enCours > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            {stats.enCours}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Livrées</p>
          <p className="text-2xl font-heading font-semibold text-green-600">
            {stats.livrees}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Frais collectés</p>
          <p className="text-lg font-heading font-semibold text-primary">
            {stats.totalFrais.toLocaleString('fr-FR')}
            <span className="text-xs text-gray-400 ml-1">FCFA</span>
          </p>
        </div>
      </div>

      {/* Search + filtres statut */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9"
            placeholder="Client, adresse, téléphone..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['tous', 'en attente', 'en cours', 'livré', 'annulé'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`btn text-xs capitalize
                ${statusFilter === f ? 'btn-primary' : ''}`}>
              {f === 'tous' ? 'Toutes' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Liste livraisons */}
      {loading ? (
        <div className="card p-12 text-center">
          <RefreshCw size={22} className="text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Truck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            Aucune livraison trouvée.
          </p>
          <button onClick={() => setModal(true)}
            className="btn btn-primary mx-auto">
            <Plus size={15} /> Créer une livraison
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const isOpen   = expanded === d.id
            const cfg      = STATUS_CONFIG[d.status] || STATUS_CONFIG['en attente']
            const products = d.sales?.sale_items || []

            return (
              <div key={d.id}
                className="card overflow-hidden transition-all">

                {/* ── Ligne principale ────────────────────────────────────── */}
                <div
                  className="p-4 flex items-center gap-3 cursor-pointer
                              hover:bg-gray-50/50 transition-colors"
                  onClick={() => toggleExpand(d.id)}
                >
                  {/* Icône statut */}
                  <div className={`w-10 h-10 rounded-xl flex items-center
                    justify-center flex-shrink-0
                    ${d.status === 'livré'    ? 'bg-green-50' :
                      d.status === 'en cours' ? 'bg-amber-50' :
                      d.status === 'annulé'   ? 'bg-red-50'   :
                      'bg-gray-100'}`}>
                    <Truck size={18} className={
                      d.status === 'livré'    ? 'text-green-600' :
                      d.status === 'en cours' ? 'text-amber-500' :
                      d.status === 'annulé'   ? 'text-red-400'   :
                      'text-gray-400'
                    } />
                  </div>

                  {/* Infos client */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">
                        {d.client_name}
                      </p>
                      <span className={`pill ${cfg.pill}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {d.client_phone && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone size={10} /> {d.client_phone}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={10} /> {d.client_address}
                      </span>
                    </div>
                  </div>

                  {/* Frais + date */}
                  <div className="text-right flex-shrink-0">
                    {d.delivery_fee > 0 && (
                      <p className="text-sm font-medium text-primary">
                        {d.delivery_fee.toLocaleString('fr-FR')} FCFA
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(d.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short'
                      })}
                    </p>
                  </div>

                  <ChevronDown
                    size={16}
                    className={`text-gray-400 flex-shrink-0 transition-transform
                      ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* ── Détails expandables ──────────────────────────────────── */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-4
                                  bg-gray-50/30">

                    {/* Stepper statut */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-2">
                          Progression
                        </p>
                        {d.status === 'annulé' ? (
                          <span className="pill pill-red">Annulée</span>
                        ) : (
                          <StatusStepper status={d.status} />
                        )}
                      </div>

                      {/* Changer statut */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Mettre à jour
                        </p>
                        <select
                          value={d.status}
                          onChange={e => updateStatus(d.id, e.target.value)}
                          className="input text-sm py-1.5 w-auto"
                        >
                          <option value="en attente">En attente</option>
                          <option value="en cours">En cours</option>
                          <option value="livré">Livré ✓</option>
                          <option value="annulé">Annulé ✗</option>
                        </select>
                      </div>
                    </div>

                    {/* Produits livrés */}
                    {products.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                          <Package size={11} /> Produits
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {products.map((item, i) => (
                            <span key={i} className="pill pill-blue">
                              {item.product_name} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vente liée */}
                    {d.sales && (
                      <div className="flex items-center gap-2 text-sm
                                      text-gray-600">
                        <FileText size={13} className="text-primary" />
                        <span>Vente liée :</span>
                        <span className="font-medium text-primary">
                          #{d.sales.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-gray-400">—</span>
                        <span>{(d.sales.total || 0).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}

                    {/* Notes */}
                    {d.notes && (
                      <div className="bg-amber-50 border border-amber-100
                                      rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-700">
                          📝 {d.notes}
                        </p>
                      </div>
                    )}

                    {/* Réf + supprimer */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400">
                        Réf : #{d.id.slice(0, 8).toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="flex items-center gap-1 text-xs text-red-400
                                   hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={12} /> Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <DeliveryModal
          sales={sales}
          onClose={() => setModal(false)}
          onSave={createDelivery}
        />
      )}
    </div>
  )
}