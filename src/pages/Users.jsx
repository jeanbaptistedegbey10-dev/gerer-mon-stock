import { useState } from 'react'
import { useTeam }  from '../hooks/useTeam'
import { useStore } from '../store/useStore'
import {
  Plus, X, Users, Mail, Shield,
  CheckCircle2, Clock, XCircle,
  Trash2, RefreshCw, Crown,
  ChevronDown
} from 'lucide-react'

// ── Config rôles ──────────────────────────────────────────────────────────────
const ROLES = {
  admin: {
    label: 'Admin',
    color: 'pill-orange',
    icon:  Crown,
    desc:  'Accès complet à toutes les fonctionnalités',
  },
  manager: {
    label: 'Manager',
    color: 'pill-blue',
    icon:  Shield,
    desc:  'Ventes, stock, achats, rapports — pas de config',
  },
  employee: {
    label: 'Employé',
    color: 'pill-gray',
    icon:  Users,
    desc:  'Ventes uniquement — lecture du stock',
  },
}

// ── Config statuts ────────────────────────────────────────────────────────────
const STATUS = {
  active:   { label: 'Actif',     color: 'pill-green',  icon: CheckCircle2 },
  pending:  { label: 'En attente',color: 'pill-orange', icon: Clock        },
  disabled: { label: 'Désactivé', color: 'pill-red',    icon: XCircle      },
}

// ── Modal invitation ──────────────────────────────────────────────────────────
function InviteModal({ onClose, onSave }) {
  const [form,    setForm]    = useState({
    email:    '',
    fullName: '',
    role:     'employee',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
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
        <div className="flex items-center justify-between p-5
                        border-b border-gray-100">
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

          <div>
            <label className="label flex items-center gap-1">
              <Mail size={11} /> Email *
            </label>
            <input type="email" className="input"
              placeholder="employe@exemple.com"
              value={form.email} onChange={set('email')} required autoFocus />
          </div>

          <div>
            <label className="label">Nom complet *</label>
            <input className="input" placeholder="Prénom Nom"
              value={form.fullName} onChange={set('fullName')} required />
          </div>

          {/* Sélection rôle avec descriptions */}
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
                        <Icon size={14} className={
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

          {/* Info invitation */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg
                          px-4 py-3">
            <p className="text-xs text-blue-700">
              ℹ️ L'employé devra créer un compte avec cet email sur votre
              application pour rejoindre l'équipe.
              Son statut passera à <strong>Actif</strong> après connexion.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">
              Annuler
            </button>
            <button type="submit" disabled={loading}
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
  const { user }  = useStore()
  const {
    members, loading, error, stats,
    inviteMember, updateRole, updateStatus, removeMember,
  } = useTeam()

  const [modal,  setModal]  = useState(false)
  const [search, setSearch] = useState('')

  const filtered = members.filter(m =>
    (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  )

  const handleRemove = async (member) => {
    if (!window.confirm(
      `Retirer "${member.full_name || member.email}" de l'équipe ?`
    )) return
    await removeMember(member.id)
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
            Gérez votre équipe et leurs permissions
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn btn-primary">
          <Plus size={15} /> Inviter un membre
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total membres</p>
          <p className="text-2xl font-heading font-semibold text-gray-900">
            {stats.total + 1}
            <span className="text-xs text-gray-400 ml-1">
              (vous inclus)
            </span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Actifs</p>
          <p className="text-2xl font-heading font-semibold text-green-600">
            {stats.active + 1}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">En attente</p>
          <p className={`text-2xl font-heading font-semibold
            ${stats.pending > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            {stats.pending}
          </p>
        </div>
      </div>

      {/* Votre compte — affiché en premier */}
      <div className="card p-4 mb-4 border-primary/20 bg-primary/5">
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
              <span className="pill pill-green">Vous</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      {members.length > 0 && (
        <div className="relative mb-4">
          <Users size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9"
            placeholder="Rechercher par nom, email, rôle..."
            value={search} onChange={e => setSearch(e.target.value)} />
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
            Invitez des employés pour qu'ils accèdent à l'application
            avec des permissions limitées.
          </p>
          <button onClick={() => setModal(true)}
            className="btn btn-primary mx-auto">
            <Plus size={15} /> Inviter le premier membre
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(member => {
            const roleCfg   = ROLES[member.role]   || ROLES.employee
            const statusCfg = STATUS[member.status] || STATUS.pending
            const RoleIcon   = roleCfg.icon
            const StatusIcon = statusCfg.icon

            return (
              <div key={member.id} className="card p-4">
                <div className="flex items-center gap-3">

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
                      Invité le{' '}
                      {new Date(member.invited_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                      {member.joined_at && (
                        <span className="ml-2 text-green-600">
                          · Rejoint le{' '}
                          {new Date(member.joined_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">

                    {/* Changer le rôle */}
                    <select
                      value={member.role}
                      onChange={e => updateRole(member.id, e.target.value)}
                      className="input text-xs py-1.5 w-auto"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="employee">Employé</option>
                    </select>

                    {/* Activer / Désactiver */}
                    {member.status === 'disabled' ? (
                      <button
                        onClick={() => updateStatus(member.id, 'active')}
                        className="btn text-xs py-1.5 text-green-600
                                   hover:bg-green-50"
                        title="Réactiver"
                      >
                        <CheckCircle2 size={13} /> Activer
                      </button>
                    ) : (
                      <button
                        onClick={() => updateStatus(member.id, 'disabled')}
                        className="btn text-xs py-1.5 text-amber-600
                                   hover:bg-amber-50"
                        title="Désactiver"
                      >
                        <XCircle size={13} /> Désactiver
                      </button>
                    )}

                    {/* Supprimer */}
                    <button
                      onClick={() => handleRemove(member)}
                      className="p-1.5 rounded-lg hover:bg-red-50
                                 text-red-400 transition-colors"
                      title="Retirer de l'équipe"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Permissions détaillées — expandable */}
                <details className="mt-3">
                  <summary className="text-xs text-gray-400 cursor-pointer
                                      hover:text-gray-600 select-none
                                      flex items-center gap-1 w-fit">
                    <ChevronDown size={12} />
                    Voir les permissions
                  </summary>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {[
                      ['Tableau de bord',  'view_dashboard'],
                      ['Produits',         'manage_products'],
                      ['Achats',           'manage_purchases'],
                      ['Ventes',           'manage_sales'],
                      ['Livraisons',       'manage_deliveries'],
                      ['Rapports',         'view_reports'],
                      ['Utilisateurs',     'manage_users'],
                      ['Paramètres',       'manage_settings'],
                    ].map(([label, perm]) => {
                      const rolePerms = {
                        admin:    ['view_dashboard','manage_products','manage_purchases','manage_sales','manage_deliveries','view_reports','manage_users','manage_settings'],
                        manager:  ['view_dashboard','manage_products','manage_purchases','manage_sales','manage_deliveries','view_reports'],
                        employee: ['view_dashboard','manage_sales'],
                      }
                      const allowed = (rolePerms[member.role] || []).includes(perm)
                      return (
                        <div key={perm}
                          className="flex items-center gap-1.5 text-xs">
                          <span className={allowed
                            ? 'text-green-500' : 'text-gray-300'}>
                            {allowed ? '✓' : '✗'}
                          </span>
                          <span className={allowed
                            ? 'text-gray-700' : 'text-gray-400'}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </details>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <InviteModal
          onClose={() => setModal(false)}
          onSave={inviteMember}
        />
      )}
    </div>
  )
}