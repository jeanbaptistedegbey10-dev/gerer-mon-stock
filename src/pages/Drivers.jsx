import { useState } from 'react'
import { useDrivers }      from '../hooks/useDrivers'
import { useTeamMembers }  from '../hooks/useTeamMembers'
import { useStore }        from '../store/useStore'
import { supabase }        from '../lib/supabase'
import {
  Plus, X, Trash2, User, Phone,
  Truck, MapPin, Edit2, ChevronRight,
  Link, CheckCircle2
} from 'lucide-react'

// ── Modal Livreur ─────────────────────────────────────────────────────────────
function DriverModal({ driver, members, onClose, onSave }) {
  const [form, setForm] = useState({
  name:           driver?.name              || '',
  phone:          driver?.phone             || '',
  note:           driver?.note              || '',
  member_user_id: driver?.member_user_id    || '',
  whatsapp_phone:   driver?.whatsapp_phone  || '',
  whatsapp_api_key: driver?.whatsapp_api_key|| '',
})
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Quand on sélectionne un membre → pré-remplir le nom
  const handleMemberChange = (e) => {
    const memberId = e.target.value
    const member   = members.find(m => m.user_id === memberId)
    setForm(f => ({
      ...f,
      member_user_id: memberId,
      name: member ? (member.full_name || f.name) : f.name,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name)  return setError('Le nom est obligatoire.')
    if (!form.phone) return setError('Le téléphone est obligatoire.')
    setError('')
    setLoading(true)
    try {

          await onSave({
      name:             form.name.trim(),
      phone:            form.phone.trim(),
      note:             form.note.trim(),
      member_user_id:   form.member_user_id   || null,
      whatsapp_phone:   form.whatsapp_phone.trim()   || null,
      whatsapp_api_key: form.whatsapp_api_key.trim() || null,
          })
          
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Membres avec rôle livreur uniquement
  const livreurMembers = members.filter(m => m.role === 'livreur')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
                    flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="flex items-center justify-between p-5
                        border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            {driver ? 'Modifier livreur' : 'Ajouter un livreur'}
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

          {/* Lier à un compte employé livreur */}
          {livreurMembers.length > 0 && (
            <div>
              <label className="label flex items-center gap-1">
                <Link size={11} /> Lier à un compte employé
                <span className="ml-1 text-gray-400 font-normal">
                  (optionnel)
                </span>
              </label>
              <select
                className="input"
                value={form.member_user_id}
                onChange={handleMemberChange}
              >
                <option value="">-- Sans compte lié --</option>
                {livreurMembers.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Permet au livreur de se connecter et voir ses livraisons
              </p>
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="label flex items-center gap-1">
              <User size={11} /> Nom complet *
            </label>
            <input
              className="input"
              placeholder="Ex: Kofi Mensah"
              value={form.name}
              onChange={set('name')}
              required
              autoFocus
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="label flex items-center gap-1">
              <Phone size={11} /> Téléphone *
            </label>
            <input
              className="input"
              placeholder="+228 90 00 00 00"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              required
            />
          </div>

          <div className="border-t border-gray-100 pt-4 mt-2">
  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3
                flex items-center gap-1">
    📱 Notifications WhatsApp
    <span className="normal-case font-normal text-gray-400 ml-1">
      (optionnel)
    </span>
  </p>

  <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
    <p className="text-xs text-green-700 font-medium mb-1">
      Comment activer ?
    </p>
    <p className="text-xs text-green-600">
      Le livreur envoie <strong>"I allow callmebot to send me messages"</strong>
      {' '}au <strong>+34 644 59 72 64</strong> sur WhatsApp,
      puis partage son API Key avec vous.
    </p>
  </div>

  <div>
    <label className="label">Numéro WhatsApp du livreur</label>
    <input
      className="input"
      placeholder="+22890000000"
      value={form.whatsapp_phone}
      onChange={set('whatsapp_phone')}
    />
    <p className="text-xs text-gray-400 mt-1">
      Format international sans espaces : +228XXXXXXXX
    </p>
  </div>

  <div className="mt-3">
    <label className="label">API Key CallMeBot</label>
    <input
      className="input"
      placeholder="Ex: 123456"
      value={form.whatsapp_api_key}
      onChange={set('whatsapp_api_key')}
    />
    <p className="text-xs text-gray-400 mt-1">
      Reçue par le livreur après activation de CallMeBot
    </p>
  </div>
</div>

          {/* Note */}
          <div>
            <label className="label">Note / Véhicule</label>
            <input
              className="input"
              placeholder="Ex: moto, vélo, voiture..."
              value={form.note}
              onChange={set('note')}
            />
          </div>

          {/* Récap compte lié */}
          {form.member_user_id && (
            <div className="bg-green-50 border border-green-100 rounded-lg
                            px-3 py-2 flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-700">
                Ce livreur pourra se connecter et voir ses livraisons assignées
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="btn btn-primary flex-1 justify-center">
              {loading
                ? 'Enregistrement...'
                : driver ? 'Modifier' : 'Ajouter'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Tarif ───────────────────────────────────────────────────────────────
function RateModal({ onClose, onSave, existingRates }) {
  const [form,    setForm]    = useState({ min_km: '', max_km: '', price: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const min   = parseFloat(form.min_km)
    const max   = parseFloat(form.max_km)
    const price = parseFloat(form.price)

    if (isNaN(min) || isNaN(max) || isNaN(price))
      return setError('Veuillez remplir tous les champs.')
    if (max <= min)
      return setError('La distance max doit être supérieure au min.')
    if (price <= 0)
      return setError('Le tarif doit être supérieur à 0.')

    // Vérifier chevauchement
    const overlap = existingRates.some(r =>
      (min >= r.min_km && min <= r.max_km) ||
      (max >= r.min_km && max <= r.max_km) ||
      (min <= r.min_km && max >= r.max_km)
    )
    if (overlap)
      return setError('Cette tranche chevauche une tranche existante.')

    setError('')
    setLoading(true)
    try {
      await onSave({ min_km: min, max_km: max, price })
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
      <div className="card w-full max-w-sm">
        <div className="flex items-center justify-between p-5
                        border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            Ajouter un tarif
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Distance min (km)</label>
              <input
                type="number" step="0.1" min="0"
                className="input" placeholder="0"
                value={form.min_km} onChange={set('min_km')} required
              />
            </div>
            <div>
              <label className="label">Distance max (km)</label>
              <input
                type="number" step="0.1" min="0"
                className="input" placeholder="1"
                value={form.max_km} onChange={set('max_km')} required
              />
            </div>
          </div>

          <div>
            <label className="label">Tarif (FCFA)</label>
            <input
              type="number" min="0"
              className="input" placeholder="500"
              value={form.price} onChange={set('price')} required
            />
          </div>

          {/* Preview */}
          {form.min_km && form.max_km && form.price && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg
                            px-4 py-3 text-sm text-blue-700">
              De <strong>{form.min_km} km</strong> à{' '}
              <strong>{form.max_km} km</strong> →{' '}
              <strong>
                {parseFloat(form.price).toLocaleString('fr-FR')} FCFA
              </strong>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="btn btn-primary flex-1 justify-center">
              {loading ? 'Enregistrement...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page Livreurs ─────────────────────────────────────────────────────────────
export default function Drivers() {
  const {
    drivers, rates, loading,
    createDriver, updateDriver, deleteDriver,
    createRate, deleteRate,
  } = useDrivers()

  const { members }  = useTeamMembers()
  const { user }     = useStore()

  const [driverModal, setDriverModal] = useState(null)
  const [rateModal,   setRateModal]   = useState(false)
  const [pickupAddress,    setPickupAddress]    = useState('')
  const [savingPickup,     setSavingPickup]     = useState(false)
  const [pickupSaved,      setPickupSaved]      = useState(false)

  // Charger adresse de départ
  useState(() => {
    if (!user) return
    supabase
      .from('app_settings')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'pickup_address')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPickupAddress(data.value)
      })
  }, [user])

  const savePickupAddress = async () => {
    if (!pickupAddress.trim()) return
    setSavingPickup(true)
    try {
      await supabase
        .from('app_settings')
        .upsert({
          user_id: user.id,
          key:     'pickup_address',
          value:   pickupAddress.trim(),
        }, { onConflict: 'user_id,key' })
      setPickupSaved(true)
      setTimeout(() => setPickupSaved(false), 2000)
    } finally {
      setSavingPickup(false)
    }
  }

  // Trouver le nom du membre lié
  const getLinkedMember = (memberUserId) => {
    if (!memberUserId) return null
    return members.find(m => m.user_id === memberUserId)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold text-gray-900">
          Livreurs & Tarifs
        </h1>
        <p className="text-sm text-gray-500">
          Gérez vos livreurs et les tarifs de livraison par distance
        </p>
      </div>

      {/* Adresse de départ */}
      <div className="card p-5 mb-6">
        <h2 className="font-heading font-semibold text-gray-900 text-sm mb-1">
          📍 Adresse de départ (votre boutique)
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Utilisée comme point de départ pour calculer les distances.
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Ex: Quartier Bé, Rue des Cocotiers, Lomé, Togo"
            value={pickupAddress}
            onChange={e => setPickupAddress(e.target.value)}
          />
          <button
            onClick={savePickupAddress}
            disabled={savingPickup || !pickupAddress}
            className="btn btn-primary whitespace-nowrap"
          >
            {savingPickup   ? 'Sauvegarde...' :
             pickupSaved    ? '✓ Sauvegardé !' :
             'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* ── Livreurs ────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-gray-900 text-sm">
              Livreurs ({drivers.length})
            </h2>
            <button
              onClick={() => setDriverModal('new')}
              className="btn btn-primary text-xs py-1.5"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>

          {loading ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              Chargement...
            </div>
          ) : drivers.length === 0 ? (
            <div className="card p-8 text-center">
              <Truck size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">
                Aucun livreur enregistré.
              </p>
              <button
                onClick={() => setDriverModal('new')}
                className="btn btn-primary mx-auto text-sm"
              >
                <Plus size={13} /> Premier livreur
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {drivers.map(d => {
                const linked = getLinkedMember(d.member_user_id)
                return (
                  <div key={d.id} className="card p-4 flex items-center gap-3">

                    {/* Icône */}
                    <div className="w-10 h-10 rounded-xl bg-primary/10
                                    flex items-center justify-center flex-shrink-0">
                      <Truck size={17} className="text-primary" />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">
                          {d.name}
                        </p>
                        {/* Badge compte lié */}
                        {linked ? (
                          <span className="pill pill-green text-xs
                                           flex items-center gap-1">
                            <CheckCircle2 size={9} /> Compte actif
                          </span>
                        ) : (
                          <span className="pill pill-gray text-xs">
                            Sans compte
                          </span>
                        )}
                        {d.note && (
                          <span className="pill pill-blue text-xs">
                            {d.note}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Phone size={10} /> {d.phone}
                      </p>
                      {/* Email du compte lié */}
                      {linked && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          🔗 {linked.email}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setDriverModal(d)}
                        className="p-1.5 rounded-lg hover:bg-blue-50
                                   text-blue-600 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Désactiver "${d.name}" ?`))
                            deleteDriver(d.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50
                                   text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Info si des livreurs sans compte existent */}
          {drivers.some(d => !d.member_user_id) && (
            <div className="mt-3 bg-amber-50 border border-amber-100
                            rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">
                ⚠ Certains livreurs n'ont pas de compte.
                Créez-leur un compte dans{' '}
                <strong>Utilisateurs → Créer un employé</strong>{' '}
                avec le rôle <strong>Livreur</strong>, puis liez-le ici.
              </p>
            </div>
          )}
        </div>

        {/* ── Tarifs ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-gray-900 text-sm">
              Tarifs par distance ({rates.length})
            </h2>
            <button
              onClick={() => setRateModal(true)}
              className="btn btn-primary text-xs py-1.5"
            >
              <Plus size={13} /> Ajouter
            </button>
          </div>

          {rates.length === 0 ? (
            <div className="card p-8 text-center">
              <MapPin size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">
                Aucun tarif configuré.
              </p>
              <button
                onClick={() => setRateModal(true)}
                className="btn btn-primary mx-auto text-sm"
              >
                <Plus size={13} /> Premier tarif
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Distance</th>
                    <th className="th">Tarif</th>
                    <th className="th"></th>
                  </tr>
                </thead>
                <tbody>
                  {rates
                    .sort((a, b) => a.min_km - b.min_km)
                    .map(r => (
                      <tr key={r.id}
                        className="hover:bg-gray-50/50 transition-colors">
                        <td className="td">
                          <span className="flex items-center gap-1.5 text-sm">
                            <ChevronRight size={13} className="text-gray-400" />
                            <span className="font-medium">{r.min_km} km</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-medium">{r.max_km} km</span>
                          </span>
                        </td>
                        <td className="td">
                          <span className="font-semibold text-primary">
                            {r.price.toLocaleString('fr-FR')} FCFA
                          </span>
                        </td>
                        <td className="td">
                          <button
                            onClick={() => {
                              if (window.confirm('Supprimer ce tarif ?'))
                                deleteRate(r.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50
                                       text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {/* Aperçu tranches */}
              <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500 mb-2">
                  Aperçu des tranches
                </p>
                <div className="flex flex-wrap gap-2">
                  {rates
                    .sort((a, b) => a.min_km - b.min_km)
                    .map(r => (
                      <span key={r.id}
                        className="text-xs bg-white border border-gray-200
                                   rounded-lg px-2 py-1 text-gray-600">
                        {r.min_km}–{r.max_km}km =
                        <span className="font-semibold text-primary ml-1">
                          {r.price.toLocaleString('fr-FR')}F
                        </span>
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {driverModal && (
        <DriverModal
          driver={driverModal === 'new' ? null : driverModal}
          members={members}
          onClose={() => setDriverModal(null)}
          onSave={driverModal === 'new'
            ? createDriver
            : (data) => updateDriver(driverModal.id, data)
          }
        />
      )}

      {rateModal && (
        <RateModal
          onClose={() => setRateModal(false)}
          onSave={createRate}
          existingRates={rates}
        />
      )}
    </div>
  )
}