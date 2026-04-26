import { useState, useEffect } from 'react'
import { useStore }       from '../store/useStore'
import { usePermissions } from '../hooks/usePermissions'
import { supabase }       from '../lib/supabase'
import {
  Plus, X, Mail, Shield, CheckCircle2,
  Clock, XCircle, Trash2, RefreshCw,
  Crown, Users, ChevronDown, Building2,
  AlertTriangle
} from 'lucide-react'

// ── Config rôles ──────────────────────────────────────────────────────────────
const ROLES = {
  admin:      { label: 'Admin',      color: 'pill-orange', icon: Crown,         desc: 'Accès complet'                        },
  manager:    { label: 'Manager',    color: 'pill-blue',   icon: Shield,        desc: 'Ventes, stock, rapports'              },
  caissier:   { label: 'Caissier',   color: 'pill-green',  icon: Users,         desc: 'Ventes + POS uniquement'              },
  vendeur:    { label: 'Vendeur',    color: 'pill-green',  icon: Users,         desc: 'Ventes + consultation stock'          },
  livreur:    { label: 'Livreur',    color: 'pill-gray',   icon: Users,         desc: 'Livraisons uniquement'                },
  comptable:  { label: 'Comptable',  color: 'pill-blue',   icon: Users,         desc: 'Rapports + finances — lecture seule'  },
}

const STATUS = {
  active:   { label: 'Actif',      color: 'pill-green',  Icon: CheckCircle2 },
  pending:  { label: 'En attente', color: 'pill-orange', Icon: Clock        },
  disabled: { label: 'Désactivé',  color: 'pill-red',    Icon: XCircle      },
}

// ── Permissions par rôle ──────────────────────────────────────────────────────
const ROLE_PERMS = {
  admin:     ['Dashboard','Produits','Achats','Ventes','Livraisons','Rapports','Utilisateurs','Paramètres'],
  manager:   ['Dashboard','Produits','Achats','Ventes','Livraisons','Rapports','Utilisateurs'],
  caissier:  ['Dashboard','Ventes'],
  vendeur:   ['Dashboard','Produits','Ventes'],
  livreur:   ['Dashboard','Livraisons'],
  comptable: ['Dashboard','Ventes','Achats','Rapports'],
}

// ── Modal invitation ──────────────────────────────────────────────────────────
function InviteModal({ tenant, membersCount, onClose, onSave }) {
  const [form,    setForm]    = useState({ email: '', fullName: '', role: 'vendeur' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Vérifier limite du plan
  const maxUsers   = tenant?.max_users
  const limitAtteinte = maxUsers && membersCount >= maxUsers

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (limitAtteinte)
      return setError(`Limite de ${maxUsers} utilisateurs atteinte. Passez au plan supérieur.`)
    if (!form.email)    return setError('L\'email est obligatoire.')
    if (!form.fullName) return setError('Le nom est obligatoire.')
    setError('')
    setLoading(true)
    try {
      await onSave(form)
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
            Inviter un membre
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

          {limitAtteinte && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg
                            px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                Limite de <strong>{maxUsers}</strong> utilisateurs atteinte
                sur votre plan <strong>{tenant?.plan}</strong>.
              </p>
            </div>
          )}

          <div>
            <label className="label flex items-center gap-1">
              <Mail size={11} /> Email *
            </label>
            <input type="email" className="input"
              placeholder="employe@exemple.com"
              value={form.email} onChange={set('email')}
              required disabled={limitAtteinte} />
          </div>

          <div>
            <label className="label">Nom complet *</label>
            <input className="input" placeholder="Prénom Nom"
              value={form.fullName} onChange={set('fullName')}
              required disabled={limitAtteinte} />
          </div>

          <div>
            <label className="label flex items-center gap-1">
              <Shield size={11} /> Rôle *
            </label>
            <div className="space-y-2 mt-1">
              {Object.entries(ROLES).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <label key={key}
                    className={`flex items-start gap-3 p-3 rounded-xl
                      border-2 cursor-pointer transition-all
                      ${form.role === key
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}>
                    <input type="radio" name="role" value={key}
                      checked={form.role === key}
                      onChange={set('role')}
                      className="mt-0.5 accent-primary" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon size={13} className={
                          form.role === key ? 'text-primary' : 'text-gray-400'
                        } />
                        <span className="text-sm font-medium text-gray-900">
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {cfg.desc}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <p className="text-xs text-blue-700">
              ℹ️ L'employé doit créer un compte avec cet email exact.
              Il sera automatiquement rattaché à votre entreprise
              <strong> {tenant?.name}</strong>.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">Annuler</button>
            <button type="submit" disabled={loading || limitAtteinte}
              className="btn btn-primary flex-1 justify-center">
              {loading ? 'Invitation...' : 'Inviter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page Utilisateurs ─────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user, tenant } = useStore()
  const { can }          = usePermissions()

  const [members,  setMembers]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [search,   setSearch]   = useState('')

  const fetchMembers = async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('tenant_members')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('invited_at', { ascending: false })
      setMembers(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMembers() }, [tenant])

  const inviteMember = async ({ email, fullName, role }) => {
    const exists = members.find(m =>
      m.email.toLowerCase() === email.toLowerCase()
    )
    if (exists) throw new Error('Cet email est déjà dans votre équipe.')

    const { error } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenant.id,
        email:     email.toLowerCase().trim(),
        full_name: fullName.trim(),
        role,
        status:    'pending',
      })
    if (error) throw error
    await fetchMembers()
  }

  const updateRole = async (id, role) => {
    await supabase
      .from('tenant_members')
      .update({ role })
      .eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
  }

  const updateStatus = async (id, status) => {
    await supabase
      .from('tenant_members')
      .update({ status })
      .eq('id', id)
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status } : m))
  }

  const removeMember = async (id, name) => {
    if (!window.confirm(`Retirer "${name}" de l'équipe ?`)) return
    await supabase.from('tenant_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const filtered = members.filter(m =>
    (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  const maxUsers       = tenant?.max_users
  const usersUsed      = members.filter(m => m.status !== 'disabled').length + 1
  const limitAtteinte  = maxUsers && usersUsed >= maxUsers

  // Plan badge
  const planColor = {
    free:       'pill-gray',
    pro:        'pill-blue',
    enterprise: 'pill-orange',
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Utilisateurs
          </h1>
          <p className="text-sm text-gray-500">
            Gérez votre équipe — {tenant?.name}
          </p>
        </div>
        {can('manage_users') && (
          <button onClick={() => setModal(true)}
            className="btn btn-primary">
            <Plus size={15} /> Inviter un membre
          </button>
        )}
      </div>

      {/* Info plan + limite */}
      <div className="card p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center
                          justify-center">
            <Building2 size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{tenant?.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`pill ${planColor[tenant?.plan || 'free']}`}>
                {tenant?.plan === 'free'       ? 'Plan Gratuit'    :
                 tenant?.plan === 'pro'        ? 'Plan Pro'        :
                 'Plan Enterprise'}
              </span>
              <span className="text-xs text-gray-500">
                {usersUsed} / {maxUsers ?? '∞'} utilisateurs
              </span>
            </div>
          </div>
        </div>

        {/* Barre d'utilisation */}
        {maxUsers && (
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usersUsed >= maxUsers ? 'bg-red-400' :
                  usersUsed >= maxUsers * 0.8 ? 'bg-amber-400' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min((usersUsed / maxUsers) * 100, 100)}%` }}
              />
            </div>
            {limitAtteinte && (
              <span className="text-xs text-red-500 font-medium">
                Limite atteinte
              </span>
            )}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total membres</p>
          <p className="text-2xl font-heading font-semibold">
            {members.length + 1}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Actifs</p>
          <p className="text-2xl font-heading font-semibold text-green-600">
            {members.filter(m => m.status === 'active').length + 1}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">En attente</p>
          <p className={`text-2xl font-heading font-semibold ${
            members.filter(m => m.status === 'pending').length > 0
              ? 'text-amber-500' : 'text-gray-400'
          }`}>
            {members.filter(m => m.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Votre compte */}
      <div className="card p-4 mb-3 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center
                          justify-center text-white font-semibold text-sm">
            {(user?.user_metadata?.full_name || user?.email || 'A')
              .slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-gray-900 text-sm">
                {user?.user_metadata?.full_name || 'Vous'}
              </p>
              <span className="pill pill-orange flex items-center gap-1">
                <Crown size={10} /> Admin
              </span>
              <span className="pill pill-green text-xs">Vous</span>
            </div>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      {members.length > 0 && (
        <div className="relative mb-3">
          <Users size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9"
            placeholder="Rechercher..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="card p-12 text-center">
          <RefreshCw size={22}
            className="text-gray-300 mx-auto mb-3 animate-spin" />
        </div>
      ) : filtered.length === 0 && !search ? (
        <div className="card p-12 text-center">
          <Users size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            Aucun membre dans votre équipe.
          </p>
          {can('manage_users') && (
            <button onClick={() => setModal(true)}
              className="btn btn-primary mx-auto">
              <Plus size={15} /> Inviter le premier membre
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => {
            const roleCfg   = ROLES[member.role]   || ROLES.vendeur
            const statusCfg = STATUS[member.status] || STATUS.pending
            const RoleIcon   = roleCfg.icon
            const { Icon: StatusIcon } = statusCfg
            const permsRole = ROLE_PERMS[member.role] || []

            return (
              <div key={member.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center
                                  justify-center text-gray-600 font-semibold text-sm">
                    {(member.full_name || member.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">
                        {member.full_name || 'Sans nom'}
                      </p>
                      <span className={`pill ${roleCfg.color} flex items-center gap-1`}>
                        <RoleIcon size={10} /> {roleCfg.label}
                      </span>
                      <span className={`pill ${statusCfg.color} flex items-center gap-1`}>
                        <StatusIcon size={10} /> {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{member.email}</p>
                  </div>

                  {can('manage_users') && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select value={member.role}
                        onChange={e => updateRole(member.id, e.target.value)}
                        className="input text-xs py-1.5 w-auto">
                        {Object.entries(ROLES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                      {member.status === 'disabled' ? (
                        <button
                          onClick={() => updateStatus(member.id, 'active')}
                          className="btn text-xs py-1.5 text-green-600 hover:bg-green-50">
                          <CheckCircle2 size={13} /> Activer
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(member.id, 'disabled')}
                          className="btn text-xs py-1.5 text-amber-600 hover:bg-amber-50">
                          <XCircle size={13} /> Désactiver
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(member.id, member.full_name || member.email)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Permissions */}
                <details className="mt-3">
                  <summary className="text-xs text-gray-400 cursor-pointer
                                      hover:text-gray-600 select-none
                                      flex items-center gap-1 w-fit">
                    <ChevronDown size={12} /> Voir les accès
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {['Dashboard','Produits','Achats','Ventes',
                      'Livraisons','Rapports','Utilisateurs','Paramètres'
                    ].map(perm => (
                      <span key={perm}
                        className={`text-xs px-2 py-0.5 rounded-full
                          ${permsRole.includes(perm)
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-400 line-through'
                          }`}>
                        {perm}
                      </span>
                    ))}
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <InviteModal
          tenant={tenant}
          membersCount={usersUsed}
          onClose={() => setModal(false)}
          onSave={inviteMember}
        />
      )}
    </div>
  )
}