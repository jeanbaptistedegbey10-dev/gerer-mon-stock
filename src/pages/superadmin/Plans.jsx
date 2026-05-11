import { useState } from 'react'
import { useSuperAdmin } from '../../hooks/useSuperAdmin'
import { Check, CreditCard, Users, Package } from 'lucide-react'

export default function SuperAdminPlans() {
  const { tenants } = useSuperAdmin()

  const planData = [
    {
      id:    'free',
      name:  'Gratuit',
      price: 0,
      color: 'border-gray-200 bg-gray-50',
      badge: 'pill-gray',
      features: ['50 produits', '2 utilisateurs', 'Ventes illimitées', 'Reçus PDF'],
    },
    {
      id:    'pro',
      name:  'Pro',
      price: 15000,
      color: 'border-blue-200 bg-blue-50/30',
      badge: 'pill-blue',
      popular: true,
      features: ['500 produits', '10 utilisateurs', 'Rapports avancés',
                 'Livraisons', 'Filtre employé', 'Support prioritaire'],
    },
    {
      id:    'enterprise',
      name:  'Enterprise',
      price: 45000,
      color: 'border-amber-200 bg-amber-50/30',
      badge: 'pill-orange',
      features: ['Illimité', 'Utilisateurs illimités', 'API access',
                 'Support dédié', 'Formation', 'SLA garanti'],
    },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold text-gray-900">
          Gestion des Plans
        </h1>
        <p className="text-sm text-gray-500">
          Vue d'ensemble des plans et leur utilisation
        </p>
      </div>

      {/* Grille plans */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {planData.map(plan => {
          const count = tenants.filter(t => t.plan === plan.id).length
          return (
            <div key={plan.id}
              className={`card p-5 border-2 relative ${plan.color}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-blue-600 text-white text-xs font-semibold
                                   px-3 py-1 rounded-full">
                    ⭐ Populaire
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <span className={`pill ${plan.badge}`}>
                  {count} entreprise{count > 1 ? 's' : ''}
                </span>
              </div>

              <div className="mb-4">
                <span className="text-3xl font-heading font-bold text-gray-900">
                  {plan.price.toLocaleString('fr-FR')}
                </span>
                <span className="text-xs text-gray-400 ml-1">FCFA / mois</span>
              </div>

              <ul className="space-y-2">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-700">
                    <Check size={12} className="text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Tableau utilisation par plan */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900 text-sm">
            Entreprises par plan
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Entreprise</th>
                <th className="th">Plan actuel</th>
                <th className="th">Utilisateurs</th>
                <th className="th">Produits max</th>
                <th className="th">Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="td font-medium text-gray-900">{t.name}</td>
                  <td className="td">
                    <span className={`pill ${
                      t.plan === 'free'       ? 'pill-gray'   :
                      t.plan === 'pro'        ? 'pill-blue'   :
                      'pill-orange'
                    }`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="td text-sm text-gray-600">
                    {t.max_users ?? '∞'}
                  </td>
                  <td className="td text-sm text-gray-600">
                    {t.max_products ?? '∞'}
                  </td>
                  <td className="td text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleDateString('fr-FR')}
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