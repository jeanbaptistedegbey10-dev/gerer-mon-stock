import { useState, useMemo } from 'react'
import { useDeliveries }    from '../hooks/useDeliveries'
import { useDrivers }       from '../hooks/useDrivers'
import { useSales }         from '../hooks/useSales'
import { useTeamMembers }   from '../hooks/useTeamMembers'
import { useNotifications } from '../hooks/useNotifications'
import { usePermissions }   from '../hooks/usePermissions'
import { useStore }         from '../store/useStore'
import {
  Plus, X, Truck, Phone, MapPin,
  User, FileText, Trash2, RefreshCw,
  Search, ChevronDown, Bell
} from 'lucide-react'

const STATUS_CONFIG = {
  'en attente': { pill: 'pill-gray',   label: 'En attente' },
  'en cours':   { pill: 'pill-orange', label: 'En cours'   },
  'livré':      { pill: 'pill-green',  label: 'Livré'      },
  'annulé':     { pill: 'pill-red',    label: 'Annulé'     },
}

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
              : 'bg-gray-100 text-gray-400'}`}>
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

// ── Modal livraison ───────────────────────────────────────────────────────────
function DeliveryModal({ sales, usedSaleIds = [], onClose, onSave }) {
  const { drivers } = useDrivers()
  const [form, setForm] = useState({
    sale_id: '', client_name: '', client_phone: '',
    client_address: '', driver_id: '', driver_name: '',
    driver_phone: '', delivery_fee: '', status: 'en attente', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const availableSales = sales.filter(s => !usedSaleIds.includes(s.id))

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

  const handleDriverChange = (e) => {
    const driver = drivers.find(d => d.id === e.target.value)
    if (!driver) return
    setForm(f => ({
      ...f,
      driver_id:    driver.id,
      driver_name:  driver.name,
      driver_phone: driver.phone,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.client_phone)
      return setError('Le téléphone client est obligatoire.')
    if (!form.client_address)
      return setError("L'adresse de livraison est obligatoire.")
    setError('')
    setLoading(true)
    try {
      await onSave({
        sale_id:        form.sale_id      || null,
        client_name:    form.client_name.trim()   || null,
        client_phone:   form.client_phone.trim(),
        client_address: form.client_address.trim(),
        driver_id:      form.driver_id    || null,
        driver_name:    form.driver_name  || null,
        driver_phone:   form.driver_phone || null,
        delivery_fee:   parseFloat(form.delivery_fee) || 0,
        status:         form.status,
        notes:          form.notes.trim(),
      })
      onClose()
    } catch (err) {
      if (err.message?.includes('unique')) {
        setError('Cette vente a déjà une livraison associée.')
      } else {
        setError(err.message)
      }
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

          {/* Vente liée */}
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

          {/* Client */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Client
            </p>
            <div>
              <label className="label flex items-center gap-1">
                <User size={11} /> Nom client
                <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
              </label>
              <input className="input" placeholder="Nom du client..."
                value={form.client_name} onChange={set('client_name')} />
            </div>
            <div>
              <label className="label flex items-center gap-1">
                <Phone size={11} /> Téléphone *
              </label>
              <input className="input" placeholder="+228 90 00 00 00"
                type="tel" value={form.client_phone}
                onChange={set('client_phone')} required />
            </div>
          </div>

          {/* Adresse */}
          <div>
            <label className="label flex items-center gap-1">
              <MapPin size={11} /> Adresse de livraison *
            </label>
            <textarea className="input resize-none" rows={2}
              placeholder="Quartier, rue, point de repère..."
              value={form.client_address}
              onChange={set('client_address')} required />
          </div>

          {/* Frais */}
          <div>
            <label className="label">Frais de livraison (FCFA)</label>
            <input type="number" min="0" className="input"
              placeholder="0" value={form.delivery_fee}
              onChange={set('delivery_fee')} />
          </div>

          {/* Livreur */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Livreur
            </p>
            {drivers.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠ Aucun livreur enregistré.
              </p>
            ) : (
              <>
                <select className="input" value={form.driver_id}
                  onChange={handleDriverChange}>
                  <option value="">-- Choisir un livreur --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.phone}
                      {d.note ? ` (${d.note})` : ''}
                    </option>
                  ))}
                </select>
                {form.driver_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600
                                  bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <Truck size={14} className="text-primary" />
                    <span className="font-medium">{form.driver_name}</span>
                    <span className="text-gray-400">·</span>
                    <span>{form.driver_phone}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Statut */}
          <div>
            <label className="label">Statut initial</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="en attente">En attente</option>
              <option value="en cours">En cours</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Instructions spéciales..."
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
    deliveries, loading, stats, usedSaleIds,
    createDelivery, updateStatus, deleteDelivery,
  } = useDeliveries()

  const { sales }              = useSales()
  const { members }            = useTeamMembers()
  const { sendNotification }   = useNotifications()
  const { can, isRole }        = usePermissions()
  const { user }               = useStore()

  const [modal,          setModal]          = useState(false)
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('tous')
  const [employeeFilter, setEmployeeFilter] = useState('tous')
  const [expanded,       setExpanded]       = useState(null)

  // ── Vue livreur — uniquement SES livraisons ───────────────────────────────
  // Remplacez le filtre livreur
    const baseDeliveries = isRole('livreur')
      ? deliveries.filter(d =>
          d.driver_user_id === user?.id ||  // ← nouveau champ
          d.driver_id === user?.id           // ← fallback ancien
        )
      : deliveries

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return baseDeliveries.filter(d => {
      const matchSearch =
        (d.client_name    || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.client_address || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.client_phone   || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.driver_name    || '').toLowerCase().includes(search.toLowerCase())
      const matchStatus =
        statusFilter === 'tous' ? true : d.status === statusFilter
      const matchEmployee =
        employeeFilter === 'tous' ? true : d.created_by === employeeFilter
      return matchSearch && matchStatus && matchEmployee
    })
  }, [baseDeliveries, search, statusFilter, employeeFilter])

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette livraison ?')) return
    await deleteDelivery(id)
  }

  // ── Notification livreur ──────────────────────────────────────────────────
  const handleNotify = async (delivery, type) => {
    try {
      const msg = type === 'completed'
        ? `Livraison pour ${delivery.client_name || delivery.client_phone} effectuée`
        : `Livraison pour ${delivery.client_name || delivery.client_phone} annulée`
      await sendNotification({
        deliveryId: delivery.id,
        type,
        message:    msg,
      })
      alert(type === 'completed'
        ? '✅ Notification envoyée — Livraison effectuée !'
        : '❌ Notification envoyée — Livraison annulée !')
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  // Nom de l'employé
  const getMemberName = (userId) => {
    const m = members.find(m => m.user_id === userId)
    return m ? (m.full_name || m.email) : null
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            {isRole('livreur') ? 'Mes livraisons' : 'Livraisons'}
          </h1>
          <p className="text-sm text-gray-500">
            {isRole('livreur')
              ? 'Vos livraisons assignées'
              : 'Suivi des commandes client'}
          </p>
        </div>
        {/* Bouton — admin, manager, caissier */}
        {can('manage_deliveries') && !isRole('livreur') && (
          <button onClick={() => setModal(true)} className="btn btn-primary">
            <Plus size={15} /> Nouvelle livraison
          </button>
        )}
      </div>

      {/* KPIs — masqués pour livreur */}
      {!isRole('livreur') && (
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
      )}

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9"
            placeholder="Client, adresse, livreur..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filtre statut */}
        <div className="flex gap-2 flex-wrap">
          {['tous', 'en attente', 'en cours', 'livré', 'annulé'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`btn text-xs capitalize
                ${statusFilter === f ? 'btn-primary' : ''}`}>
              {f === 'tous' ? 'Toutes' : f}
            </button>
          ))}
        </div>

        {/* Filtre employé — admin/manager seulement */}
        {!isRole('livreur') && !isRole('caissier') && (
          <select
            className="input w-auto min-w-40"
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
          >
            <option value="tous">Tous les employés</option>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name || m.email}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="card p-12 text-center">
          <RefreshCw size={22} className="text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Truck size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            {isRole('livreur')
              ? 'Aucune livraison vous est assignée.'
              : 'Aucune livraison trouvée.'}
          </p>
          {can('manage_deliveries') && !isRole('livreur') && (
            <button onClick={() => setModal(true)}
              className="btn btn-primary mx-auto">
              <Plus size={15} /> Créer une livraison
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const isOpen = expanded === d.id
            const cfg    = STATUS_CONFIG[d.status] || STATUS_CONFIG['en attente']
            const items  = d.sales?.sale_items || []
            const createdByName = getMemberName(d.created_by)

            return (
              <div key={d.id} className="card overflow-hidden">

                {/* Ligne principale */}
                <div
                  onClick={() => setExpanded(prev => prev === d.id ? null : d.id)}
                  className="p-4 flex items-center gap-3 cursor-pointer
                             hover:bg-gray-50/50 transition-colors"
                >
                  {/* Voyant notification clignotant */}
                  {d.notification_pending && !isRole('livreur') && (
                    <span className="relative flex h-3 w-3 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex
                                       h-full w-full rounded-full bg-green-400
                                       opacity-75"></span>
                      <span className="relative inline-flex rounded-full
                                       h-3 w-3 bg-green-500"></span>
                    </span>
                  )}

                  {/* Icône statut */}
                  <div className={`w-10 h-10 rounded-xl flex items-center
                    justify-center flex-shrink-0
                    ${d.status === 'livré'    ? 'bg-green-50'  :
                      d.status === 'en cours' ? 'bg-amber-50'  :
                      d.status === 'annulé'   ? 'bg-red-50'    :
                      'bg-gray-100'}`}>
                    <Truck size={18} className={
                      d.status === 'livré'    ? 'text-green-600' :
                      d.status === 'en cours' ? 'text-amber-500' :
                      d.status === 'annulé'   ? 'text-red-400'   :
                      'text-gray-400'
                    } />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">
                        {d.client_name || d.client_phone}
                      </p>
                      <span className={`pill ${cfg.pill}`}>{cfg.label}</span>
                      {d.notification_pending && !isRole('livreur') && (
                        <span className={`pill text-xs flex items-center gap-1
                          ${d.notification_type === 'completed'
                            ? 'pill-green' : 'pill-red'}`}>
                          <Bell size={9} />
                          {d.notification_type === 'completed'
                            ? 'Effectuée' : 'Annulée'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone size={10} /> {d.client_phone}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin size={10} />
                        {(d.client_address || '').slice(0, 40)}
                        {(d.client_address || '').length > 40 ? '...' : ''}
                      </span>
                    </div>
                    {/* Créé par */}
                    {createdByName && !isRole('livreur') && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Par : {createdByName}
                      </p>
                    )}
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

                  <ChevronDown size={16}
                    className={`text-gray-400 flex-shrink-0 transition-transform
                      ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {/* Détails */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-4 space-y-4
                                  bg-gray-50/30">

                    {/* Stepper + changement statut — pas pour livreur */}
                    {!isRole('livreur') && (
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Progression</p>
                          {d.status === 'annulé' ? (
                            <span className="pill pill-red">Annulée</span>
                          ) : (
                            <StatusStepper status={d.status} />
                          )}
                        </div>
                        {can('manage_deliveries') && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              Mettre à jour
                            </p>
                            <select
                              value={d.status}
                              onChange={e => updateStatus(d.id, e.target.value)}
                              className="input text-sm py-1.5 w-auto"
                              onClick={e => e.stopPropagation()}
                            >
                              <option value="en attente">En attente</option>
                              <option value="en cours">En cours</option>
                              <option value="livré">Livré ✓</option>
                              <option value="annulé">Annulé ✗</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Boutons livreur — notifier */}
                    {isRole('livreur') && d.status === 'en cours' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleNotify(d, 'completed')}
                          className="btn flex-1 justify-center text-sm
                                     bg-green-500 text-white border-green-500
                                     hover:bg-green-600"
                        >
                          ✅ Livraison effectuée
                        </button>
                        <button
                          onClick={() => handleNotify(d, 'cancelled')}
                          className="btn flex-1 justify-center text-sm
                                     text-red-500 hover:bg-red-50"
                        >
                          ❌ Annulée
                        </button>
                      </div>
                    )}

                    {/* Info livreur — visible pour livreur aussi */}
                    {isRole('livreur') && (
                      <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-medium text-blue-700">
                          Détails de votre livraison
                        </p>
                        <p className="text-xs text-blue-600">
                          📍 {d.client_address}
                        </p>
                        <p className="text-xs text-blue-600">
                          📞 {d.client_phone}
                        </p>
                        {d.notes && (
                          <p className="text-xs text-blue-600">
                            📝 {d.notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Livreur assigné */}
                    {d.driver_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Truck size={13} className="text-primary flex-shrink-0" />
                        <span>Livreur :</span>
                        <span className="font-medium">{d.driver_name}</span>
                        <span className="text-gray-400">·</span>
                        <span>{d.driver_phone}</span>
                      </div>
                    )}

                    {/* Produits */}
                    {items.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Produits</p>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item, i) => (
                            <span key={i} className="pill pill-blue">
                              {item.product_name} × {item.quantity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vente liée */}
                    {d.sales && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText size={13} className="text-primary flex-shrink-0" />
                        <span>Vente liée :</span>
                        <span className="font-medium text-primary">
                          #{d.sales.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-gray-400">—</span>
                        <span>{(d.sales.total || 0).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    )}

                    {/* Notes */}
                    {d.notes && !isRole('livreur') && (
                      <div className="bg-amber-50 border border-amber-100
                                      rounded-lg px-3 py-2">
                        <p className="text-xs text-amber-700">📝 {d.notes}</p>
                      </div>
                    )}

                    {/* Réf + supprimer */}
                    {!isRole('livreur') && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-gray-400">
                          #{d.id.slice(0, 8).toUpperCase()}
                        </span>
                        {can('manage_deliveries') && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(d.id) }}
                            className="flex items-center gap-1 text-xs text-red-400
                                       hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={12} /> Supprimer
                          </button>
                        )}
                      </div>
                    )}
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
          usedSaleIds={usedSaleIds}
          onClose={() => setModal(false)}
          onSave={createDelivery}
        />
      )}
    </div>
  )
}