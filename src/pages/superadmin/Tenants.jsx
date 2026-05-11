import { useState } from 'react'
import { useSuperAdmin } from '../../hooks/useSuperAdmin'
import {
  Search, Building2, Users, ChevronDown,
  CheckCircle2, XCircle, Trash2, Edit2,
  X, Save, RefreshCw, CreditCard
} from 'lucide-react'

// ── Modal détails tenant ──────────────────────────────────────────────────────
function TenantModal({ tenant, onClose, onUpdatePlan, onUpdateLimits }) {
  const [plan,        setPlan]        = useState(tenant.plan)
  const [maxUsers,    setMaxUsers]    = useState(tenant.max_users    || '')
  const [maxProducts, setMaxProducts] = useState(tenant.max_products || '')
  const [loading,     setLoading]     = useState(false)
  const [saved,       setSaved]       = useState(false)

  const members = tenant.tenant_members || []
  const active  = members.filter(m => m.status === 'active')

  const handleSave = async () => {
    setLoading(true)
    try {
      if (plan !== tenant.plan) {
        await onUpdatePlan(tenant.id, plan)
      }
      await onUpdateLimits(tenant.id, {
        maxUsers:    maxUsers    || null,
        maxProducts: maxProducts || null,
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 1000)
    } catch (err) {
      alert('Erreur : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
                    flex items-center justify-center p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            {tenant.name}
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Infos générales */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Informations
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">ID</p>
                <p className="font-mono text-xs text-gray-700 truncate">
                  {tenant.id.slice(0, 16)}...
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Créé le</p>
                <p className="text-xs text-gray-700">
                  {new Date(tenant.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Pays</p>
                <p className="text-xs text-gray-700">{tenant.country || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Devise</p>
                <p className="text-xs text-gray-700">{tenant.currency || 'FCFA'}</p>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="label flex items-center gap-1">
              <CreditCard size={11} /> Plan
            </label>
            <select className="input" value={plan}
              onChange={e => setPlan(e.target.value)}>
              <option value="free">Gratuit — 2 users, 50 produits</option>
              <option value="pro">Pro — 10 users, 500 produits</option>
              <option value="enterprise">Enterprise — illimité</option>
            </select>
          </div>

          {/* Limites custom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Max utilisateurs</label>
              <input type="number" className="input" min="1"
                placeholder="Illimité si vide"
                value={maxUsers}
                onChange={e => setMaxUsers(e.target.value)} />
            </div>
            <div>
              <label className="label">Max produits</label>
              <input type="number" className="input" min="1"
                placeholder="Illimité si vide"
                value={maxProducts}
                onChange={e => setMaxProducts(e.target.value)} />
            </div>
          </div>

          {/* Membres */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase
                           tracking-wide mb-3">
              Membres ({active.length})
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {active.map(m => (
                <div key={m.id}
                  className="flex items-center gap-2 px-3 py-2
                             bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-purple-100
                                  flex items-center justify-center
                                  text-purple-700 text-xs font-semibold">
                    {(m.full_name || m.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {m.full_name || m.email}
                    </p>
                    <p className="text-xs text-gray-400">{m.email}</p>
                  </div>
                  <span className={`pill text-xs ${
                    m.role === 'admin'    ? 'pill-orange' :
                    m.role === 'manager' ? 'pill-blue'   :
                    'pill-gray'
                  }`}>
                    {m.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="btn flex-1 justify-center">
              Annuler
            </button>
            <button onClick={handleSave} disabled={loading}
              className="btn btn-primary flex-1 justify-center"
              style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>
              {loading ? (
                <><RefreshCw size={14} className="animate-spin" /> Sauvegarde...</>
              ) : saved ? (
                <><CheckCircle2 size={14} /> Sauvegardé !</>
              ) : (
                <><Save size={14} /> Sauvegarder</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page Tenants ──────────────────────────────────────────────────────────────
export default function SuperAdminTenants() {
  const {
    tenants, loading,
    updateTenantPlan, toggleTenant,
    deleteTenant, updateLimits,
  } = useSuperAdmin()

  const [search,       setSearch]       = useState('')
  const [planFilter,   setPlanFilter]   = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [selectedTenant, setSelectedTenant] = useState(null)

  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase())
    const matchPlan   = planFilter === 'tous'   ? true : t.plan    === planFilter
    const matchStatus = statusFilter === 'tous' ? true :
      statusFilter === 'actif'   ? t.active  === true  :
      t.active === false
    return matchSearch && matchPlan && matchStatus
  })

  const handleDelete = async (tenant) => {
    if (!window.confirm(
      `⚠ Supprimer "${tenant.name}" et TOUTES ses données ?\n\nCette action est IRRÉVERSIBLE.`
    )) return
    try {
      await deleteTenant(tenant.id)
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <RefreshCw size={24} className="text-gray-300 animate-spin" />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Entreprises
          </h1>
          <p className="text-sm text-gray-500">
            {tenants.length} entreprise{tenants.length > 1 ? 's' : ''} enregistrée{tenants.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* KPIs rapides */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="text-2xl font-heading font-bold text-gray-900">
            {tenants.filter(t => t.plan === 'free').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Plan Gratuit</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-heading font-bold text-blue-600">
            {tenants.filter(t => t.plan === 'pro').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Plan Pro</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-heading font-bold text-amber-500">
            {tenants.filter(t => t.plan === 'enterprise').length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Enterprise</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Rechercher une entreprise..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto"
          value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
          <option value="tous">Tous les plans</option>
          <option value="free">Gratuit</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select className="input w-auto"
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="tous">Tous statuts</option>
          <option value="actif">Actif</option>
          <option value="bloqué">Bloqué</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Aucune entreprise trouvée.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Entreprise</th>
                  <th className="th">Plan</th>
                  <th className="th">Membres</th>
                  <th className="th">Limites</th>
                  <th className="th">Pays</th>
                  <th className="th">Inscrit le</th>
                  <th className="th">Statut</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const activeMembers = (t.tenant_members || [])
                    .filter(m => m.status === 'active').length

                  return (
                    <tr key={t.id}
                      className="hover:bg-gray-50/50 transition-colors">

                      {/* Nom */}
                      <td className="td">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-100
                                          flex items-center justify-center
                                          font-semibold text-purple-700 text-sm
                                          flex-shrink-0">
                            {t.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {t.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate max-w-32">
                              {t.currency || 'FCFA'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="td">
                        <span className={`pill ${
                          t.plan === 'free'       ? 'pill-gray'   :
                          t.plan === 'pro'        ? 'pill-blue'   :
                          'pill-orange'
                        }`}>
                          {t.plan}
                        </span>
                      </td>

                      {/* Membres */}
                      <td className="td">
                        <div className="flex items-center gap-1 text-sm">
                          <Users size={12} className="text-gray-400" />
                          <span className="font-medium">{activeMembers}</span>
                          <span className="text-gray-400">
                            / {t.max_users ?? '∞'}
                          </span>
                        </div>
                      </td>

                      {/* Limites */}
                      <td className="td text-xs text-gray-500">
                        {t.max_products ?? '∞'} produits
                      </td>

                      {/* Pays */}
                      <td className="td text-xs text-gray-500">
                        {t.country || '—'}
                      </td>

                      {/* Date */}
                      <td className="td text-xs text-gray-500 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>

                      {/* Statut */}
                      <td className="td">
                        <span className={`pill ${t.active ? 'pill-green' : 'pill-red'}`}>
                          {t.active ? 'Actif' : 'Bloqué'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="td">
                        <div className="flex gap-1.5">
                          {/* Modifier */}
                          <button
                            onClick={() => setSelectedTenant(t)}
                            className="p-1.5 rounded-lg hover:bg-purple-50
                                       text-purple-600 transition-colors"
                            title="Gérer"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Bloquer / Activer */}
                          {t.active ? (
                            <button
                              onClick={() => {
                                if (window.confirm(`Bloquer "${t.name}" ?`))
                                  toggleTenant(t.id, false)
                              }}
                              className="p-1.5 rounded-lg hover:bg-amber-50
                                         text-amber-500 transition-colors"
                              title="Bloquer"
                            >
                              <XCircle size={13} />
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleTenant(t.id, true)}
                              className="p-1.5 rounded-lg hover:bg-green-50
                                         text-green-500 transition-colors"
                              title="Activer"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}

                          {/* Supprimer */}
                          <button
                            onClick={() => handleDelete(t)}
                            className="p-1.5 rounded-lg hover:bg-red-50
                                       text-red-400 transition-colors"
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

      {/* Modal */}
      {selectedTenant && (
        <TenantModal
          tenant={selectedTenant}
          onClose={() => setSelectedTenant(null)}
          onUpdatePlan={updateTenantPlan}
          onUpdateLimits={updateLimits}
        />
      )}
    </div>
  )
}