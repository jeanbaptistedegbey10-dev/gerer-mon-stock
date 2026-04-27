import { useState, useEffect } from 'react'
import { useStore }       from '../store/useStore'
import { usePermissions } from '../hooks/usePermissions'
import { supabase }       from '../lib/supabase'
import {
  Plus, X, Mail, Shield, CheckCircle2,
  Clock, XCircle, Trash2, RefreshCw,
  Crown, Users, ChevronDown, Building2,
  AlertTriangle, Eye, EyeOff
} from 'lucide-react'

// ── Config rôles ──────────────────────────────────────────────────────────────
const ROLES = {
  admin:     { label: 'Admin',     color: 'pill-orange', icon: Crown,  desc: 'Accès complet'                       },
  manager:   { label: 'Manager',   color: 'pill-blue',   icon: Shield, desc: 'Ventes, stock, rapports'             },
  caissier:  { label: 'Caissier',  color: 'pill-green',  icon: Users,  desc: 'Ventes + POS uniquement'             },
  vendeur:   { label: 'Vendeur',   color: 'pill-green',  icon: Users,  desc: 'Ventes + consultation stock'         },
  livreur:   { label: 'Livreur',   color: 'pill-gray',   icon: Users,  desc: 'Livraisons uniquement'               },
  comptable: { label: 'Comptable', color: 'pill-blue',   icon: Users,  desc: 'Rapports + finances — lecture seule' },
}

// ── Config statuts ────────────────────────────────────────────────────────────
const STATUS = {
  active:   { label: 'Actif',      color: 'pill-green',  Icon: CheckCircle2 },
  pending:  { label: 'En attente', color: 'pill-orange', Icon: Clock        },
  disabled: { label: 'Désactivé',  color: 'pill-red',    Icon: XCircle      },
}

// ── Permissions par rôle ──────────────────────────────────────────────────────
const ROLE_PERMS = {
  admin:     ['Dashboard', 'Produits', 'Achats', 'Ventes', 'Livraisons', 'Rapports', 'Utilisateurs', 'Paramètres'],
  manager:   ['Dashboard', 'Produits', 'Achats', 'Ventes', 'Livraisons', 'Rapports', 'Utilisateurs'],
  caissier:  ['Dashboard', 'Ventes'],
  vendeur:   ['Dashboard', 'Produits', 'Ventes'],
  livreur:   ['Dashboard', 'Livraisons'],
  comptable: ['Dashboard', 'Ventes', 'Achats', 'Rapports'],
}

// ── Modal création employé ────────────────────────────────────────────────────
function CreateMemberModal({ tenant, membersCount, onClose, onSave }) {
  const [form, setForm] = useState({
    email:    '',
    password: '',
    confirm:  '',
    fullName: '',
    role:     'vendeur',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const maxUsers      = tenant?.max_users
  const limitAtteinte = maxUsers && membersCount >= maxUsers

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (limitAtteinte)
      return setError(`Limite de ${maxUsers} utilisateurs atteinte.`)
    if (!form.fullName)
      return setError('Le nom est obligatoire.')
    if (!form.email)
      return setError('L\'email est obligatoire.')
    if (!form.password)
      return setError('Le mot de passe est obligatoire.')
    if (form.password.length < 6)
      return setError('Mot de passe minimum 6 caractères.')
    if (form.password !== form.confirm)
      return setError('Les mots de passe ne correspondent pas.')

    setError('')
    setLoading(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      console.error('createMember error:', err)
      setError(err.message || 'Erreur inconnue. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
                    flex items-center justify-center p-4">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5
                        border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            Créer un compte employé
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Erreur */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700
                            text-sm px-3 py-2.5 rounded-lg border border-red-100">
              <AlertTriangle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Alerte limite */}
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

          {/* Nom */}
          <div>
            <label className="label">Nom complet *</label>
            <input
              className="input"
              placeholder="Prénom Nom"
              value={form.fullName}
              onChange={set('fullName')}
              required
              autoFocus
              disabled={limitAtteinte}
            />
          </div>

          {/* Email */}
          <div>
            <label className="label flex items-center gap-1">
              <Mail size={11} /> Email de connexion *
            </label>
            <input
              type="email"
              className="input"
              placeholder="employe@votreboutique.com"
              value={form.email}
              onChange={set('email')}
              required
              disabled={limitAtteinte}
            />
            <p className="text-xs text-gray-400 mt-1">
              Cet email sera utilisé pour se connecter.
              Aucun email ne sera envoyé à l'employé.
            </p>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="label">Mot de passe *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Minimum 6 caractères"
                value={form.password}
                onChange={set('password')}
                required
                disabled={limitAtteinte}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirmer */}
          <div>
            <label className="label">Confirmer le mot de passe *</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={form.confirm}
              onChange={set('confirm')}
              required
              disabled={limitAtteinte}
            />
          </div>

          {/* Rôle */}
          <div>
            <label className="label flex items-center gap-1">
              <Shield size={11} /> Rôle *
            </label>
            <div className="space-y-2 mt-1">
              {Object.entries(ROLES).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-xl
                      border-2 cursor-pointer transition-all
                      ${form.role === key
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={key}
                      checked={form.role === key}
                      onChange={set('role')}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon size={13} className={
                          form.role === key ? 'text-primary' : 'text-gray-400'
                        } />
                        <span className="text-sm font-medium text-gray-900">
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{cfg.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Récapitulatif */}
          {form.fullName && form.email && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg
                            px-4 py-3 space-y-1">
              <p className="text-xs font-medium text-blue-700">
                Récapitulatif :
              </p>
              <p className="text-xs text-blue-600">
                👤 <strong>{form.fullName}</strong>
                {' · '}{ROLES[form.role]?.label}
              </p>
              <p className="text-xs text-blue-600">
                📧 Connexion avec : <strong>{form.email}</strong>
              </p>
              <p className="text-xs text-blue-600">
                🏢 Entreprise : <strong>{tenant?.name}</strong>
              </p>
            </div>
          )}

          {/* Boutons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn flex-1 justify-center"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || limitAtteinte}
              className="btn btn-primary flex-1 justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none"
                    viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Création...
                </>
              ) : 'Créer le compte'}
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
  const [toast,    setToast]    = useState(null)

  // ── Toast ────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Fetch membres ─────────────────────────────────────────────────────────
  const fetchMembers = async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tenant_members')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('invited_at', { ascending: false })
      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      console.error('fetchMembers error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMembers() }, [tenant])

  // ── Créer un employé ──────────────────────────────────────────────────────
  const createMember = async ({ email, password, fullName, role }) => {
  // Vérifier doublon
  const exists = members.find(m =>
    m.email.toLowerCase() === email.toLowerCase()
  )
  if (exists) throw new Error('Cet email existe déjà dans votre équipe.')

  // 1. Créer un client Supabase temporaire — ne touche PAS à la session admin
  const { createClient } = await import('@supabase/supabase-js')
  const tempClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession:   false,   // ← ne sauvegarde pas la session
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    }
  )

  // 2. Créer le compte via le client temporaire
  const { data: newUser, error: signUpError } =
    await tempClient.auth.signUp({
      email:    email.toLowerCase().trim(),
      password,
      options: {
        data: { full_name: fullName },
      },
    })

  if (signUpError) throw signUpError
  if (!newUser?.user) throw new Error('Erreur lors de la création du compte.')

  // 3. Créer le membership avec le client ADMIN (session courante)
  const { error: memberError } = await supabase
    .from('tenant_members')
    .insert({
      tenant_id: tenant.id,
      user_id:   newUser.user.id,
      email:     email.toLowerCase().trim(),
      full_name: fullName.trim(),
      role,
      status:    'active',
      joined_at: new Date().toISOString(),
    })

  if (memberError) throw memberError

  await fetchMembers()
  showToast(`Compte de "${fullName}" créé avec succès !`)
}

  // ── Changer le rôle ───────────────────────────────────────────────────────
  const updateRole = async (id, role) => {
    const { error } = await supabase
      .from('tenant_members')
      .update({ role })
      .eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m))
    showToast('Rôle mis à jour.')
  }

  // ── Activer / Désactiver ──────────────────────────────────────────────────
  const updateStatus = async (id, status, name) => {
    const { error } = await supabase
      .from('tenant_members')
      .update({ status })
      .eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status } : m))
    showToast(status === 'active'
      ? `${name} réactivé.`
      : `${name} désactivé.`
    )
  }

  // ── Supprimer ─────────────────────────────────────────────────────────────
  const removeMember = async (id, name) => {
    if (!window.confirm(`Retirer "${name}" de l'équipe ?`)) return
    const { error } = await supabase
      .from('tenant_members')
      .delete()
      .eq('id', id)
    if (error) { showToast(error.message, 'error'); return }
    setMembers(prev => prev.filter(m => m.id !== id))
    showToast(`${name} retiré de l'équipe.`)
  }

  // ── Filtrage ──────────────────────────────────────────────────────────────
  const filtered = members.filter(m =>
    (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  )

  const maxUsers      = tenant?.max_users
  const usersUsed     = members.filter(m => m.status !== 'disabled').length + 1
  const limitAtteinte = maxUsers && usersUsed >= maxUsers

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
          <button onClick={() => setModal(true)} className="btn btn-primary">
            <Plus size={15} /> Créer un employé
          </button>
        )}
      </div>

      {/* Info plan */}
      <div className="card p-4 mb-6 flex items-center justify-between
                      flex-wrap gap-3">
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
                  usersUsed >= maxUsers          ? 'bg-red-400'   :
                  usersUsed >= maxUsers * 0.8    ? 'bg-amber-400' :
                  'bg-green-500'
                }`}
                style={{
                  width: `${Math.min((usersUsed / maxUsers) * 100, 100)}%`
                }}
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
          <p className="text-2xl font-heading font-semibold text-gray-900">
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
          <p className="text-xs text-gray-500 mb-1">Désactivés</p>
          <p className={`text-2xl font-heading font-semibold ${
            members.filter(m => m.status === 'disabled').length > 0
              ? 'text-red-500' : 'text-gray-400'
          }`}>
            {members.filter(m => m.status === 'disabled').length}
          </p>
        </div>
      </div>

      {/* Votre compte admin */}
      <div className="card p-4 mb-3 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center
                          justify-center text-white font-semibold text-sm
                          flex-shrink-0">
            {(user?.user_metadata?.full_name || user?.email || 'A')
              .slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-gray-900 text-sm">
                {user?.user_metadata?.full_name || 'Vous'}
              </p>
              <span className="pill pill-orange flex items-center gap-1">
                <Crown size={10} /> Admin
              </span>
              <span className="pill pill-green text-xs">Vous</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      {members.length > 0 && (
        <div className="relative mb-3">
          <Users size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Rechercher par nom, email, rôle..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* Liste membres */}
      {loading ? (
        <div className="card p-12 text-center">
          <RefreshCw size={22}
            className="text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-gray-400">Chargement...</p>
        </div>
      ) : filtered.length === 0 && !search ? (
        <div className="card p-12 text-center">
          <Users size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-2">
            Aucun membre dans votre équipe.
          </p>
          <p className="text-gray-400 text-xs mb-4">
            Créez des comptes pour vos employés avec leurs identifiants.
          </p>
          {can('manage_users') && (
            <button onClick={() => setModal(true)}
              className="btn btn-primary mx-auto">
              <Plus size={15} /> Créer le premier employé
            </button>
          )}
        </div>
      ) : filtered.length === 0 && search ? (
        <div className="card p-8 text-center">
          <p className="text-gray-400 text-sm">Aucun résultat pour "{search}"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => {
            const roleCfg   = ROLES[member.role]   || ROLES.vendeur
            const statusCfg = STATUS[member.status] || STATUS.pending
            const RoleIcon   = roleCfg.icon
            const { Icon: StatusIcon } = statusCfg
            const permsRole  = ROLE_PERMS[member.role] || []

            return (
              <div key={member.id} className="card p-4">
                <div className="flex items-center gap-3 flex-wrap">

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gray-100
                                  flex items-center justify-center
                                  text-gray-600 font-semibold text-sm
                                  flex-shrink-0">
                    {(member.full_name || member.email)
                      .slice(0, 1).toUpperCase()}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 text-sm">
                        {member.full_name || 'Sans nom'}
                      </p>
                      <span className={`pill ${roleCfg.color}
                        flex items-center gap-1`}>
                        <RoleIcon size={10} />
                        {roleCfg.label}
                      </span>
                      <span className={`pill ${statusCfg.color}
                        flex items-center gap-1`}>
                        <StatusIcon size={10} />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {member.email}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Ajouté le{' '}
                      {new Date(member.invited_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                      {member.joined_at && (
                        <span className="ml-2 text-green-600">
                          · Connecté le{' '}
                          {new Date(member.joined_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  {can('manage_users') && (
                    <div className="flex items-center gap-2 flex-shrink-0
                                    flex-wrap">
                      {/* Changer rôle */}
                      <select
                        value={member.role}
                        onChange={e => updateRole(member.id, e.target.value)}
                        className="input text-xs py-1.5 w-auto"
                      >
                        {Object.entries(ROLES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>

                      {/* Activer / Désactiver */}
                      {member.status === 'disabled' ? (
                        <button
                          onClick={() => updateStatus(
                            member.id, 'active',
                            member.full_name || member.email
                          )}
                          className="btn text-xs py-1.5 text-green-600
                                     hover:bg-green-50"
                        >
                          <CheckCircle2 size={13} /> Activer
                        </button>
                      ) : (
                        <button
                          onClick={() => updateStatus(
                            member.id, 'disabled',
                            member.full_name || member.email
                          )}
                          className="btn text-xs py-1.5 text-amber-600
                                     hover:bg-amber-50"
                        >
                          <XCircle size={13} /> Désactiver
                        </button>
                      )}

                      {/* Supprimer */}
                      <button
                        onClick={() => removeMember(
                          member.id,
                          member.full_name || member.email
                        )}
                        className="p-1.5 rounded-lg hover:bg-red-50
                                   text-red-400 transition-colors"
                        title="Retirer de l'équipe"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Permissions détaillées */}
                <details className="mt-3">
                  <summary className="text-xs text-gray-400 cursor-pointer
                                      hover:text-gray-600 select-none
                                      flex items-center gap-1 w-fit">
                    <ChevronDown size={12} /> Voir les accès
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      'Dashboard', 'Produits', 'Achats', 'Ventes',
                      'Livraisons', 'Rapports', 'Utilisateurs', 'Paramètres'
                    ].map(perm => (
                      <span
                        key={perm}
                        className={`text-xs px-2 py-0.5 rounded-full
                          ${permsRole.includes(perm)
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-400 line-through'
                          }`}
                      >
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

      {/* Modal */}
      {modal && (
        <CreateMemberModal
          tenant={tenant}
          membersCount={usersUsed}
          onClose={() => setModal(false)}
          onSave={createMember}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl
          shadow-lg text-white text-sm font-medium flex items-center gap-2
          animate-in slide-in-from-bottom-2 duration-200
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
          {toast.type === 'success'
            ? <CheckCircle2 size={16} />
            : <AlertTriangle size={16} />
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}