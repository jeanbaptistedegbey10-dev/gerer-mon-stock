import { useState } from 'react'
import { useSuperAdmin } from '../../hooks/useSuperAdmin'
import { Search, Users, Building2 } from 'lucide-react'

export default function SuperAdminUsers() {
  const { tenants, loading } = useSuperAdmin()
  const [search, setSearch]  = useState('')

  // Aplatir tous les membres avec leur tenant
  const allUsers = tenants.flatMap(t =>
    (t.tenant_members || []).map(m => ({
      ...m,
      tenant_name: t.name,
      tenant_plan: t.plan,
    }))
  ).filter(m =>
    (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.email     || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.tenant_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const roleColor = r =>
    r === 'admin'     ? 'pill-orange' :
    r === 'manager'   ? 'pill-blue'   :
    r === 'caissier'  ? 'pill-green'  :
    r === 'livreur'   ? 'pill-gray'   :
    r === 'comptable' ? 'pill-blue'   :
    'pill-gray'

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Tous les utilisateurs
          </h1>
          <p className="text-sm text-gray-500">
            {allUsers.length} utilisateur{allUsers.length > 1 ? 's' : ''} sur toutes les entreprises
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9"
          placeholder="Nom, email, entreprise..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Utilisateur</th>
                <th className="th">Email</th>
                <th className="th">Rôle</th>
                <th className="th">Entreprise</th>
                <th className="th">Plan</th>
                <th className="th">Statut</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.length === 0 ? (
                <tr>
                  <td colSpan={6}
                    className="td text-center text-gray-400 py-12">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : allUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-100
                                      flex items-center justify-center
                                      font-semibold text-gray-600 text-xs">
                        {(u.full_name || u.email).slice(0, 1).toUpperCase()}
                      </div>
                      <p className="font-medium text-gray-900 text-sm">
                        {u.full_name || 'Sans nom'}
                      </p>
                    </div>
                  </td>
                  <td className="td text-xs text-gray-500">{u.email}</td>
                  <td className="td">
                    <span className={`pill ${roleColor(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {u.tenant_name}
                      </span>
                    </div>
                  </td>
                  <td className="td">
                    <span className={`pill ${
                      u.tenant_plan === 'free'       ? 'pill-gray'   :
                      u.tenant_plan === 'pro'        ? 'pill-blue'   :
                      'pill-orange'
                    }`}>
                      {u.tenant_plan}
                    </span>
                  </td>
                  <td className="td">
                    <span className={`pill ${
                      u.status === 'active'   ? 'pill-green'  :
                      u.status === 'pending'  ? 'pill-orange' :
                      'pill-red'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}