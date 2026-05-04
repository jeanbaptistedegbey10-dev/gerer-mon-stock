import { useState, useEffect } from 'react'
import { useNavigate }  from 'react-router-dom'
import { useStore }     from '../store/useStore'
import { supabase }     from '../lib/supabase'
import { Package, Building2, ArrowRight } from 'lucide-react'

export default function Onboarding() {
  const navigate              = useNavigate()
  const { user, tenant, loadTenantContext } = useStore()
  const [companyName, setCompanyName] = useState(
    localStorage.getItem('pending_company') || ''
  )
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error,   setError]   = useState('')

  // Si l'user a déjà un tenant → rediriger vers dashboard
  useEffect(() => {
    const check = async () => {
      if (!user) { setChecking(false); return }

      // Re-tenter de charger le contexte
      await loadTenantContext(user)

      // Vérifier directement en base
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (membership) {
        navigate('/dashboard', { replace: true })
        return
      }

      const { data: owned } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (owned) {
        navigate('/dashboard', { replace: true })
        return
      }

      setChecking(false)
    }
    check()
  }, [user])

  if (checking) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center
                        justify-center mx-auto mb-3 animate-pulse">
          <Package size={20} className="text-white" />
        </div>
        <p className="text-sm text-gray-400">Vérification...</p>
      </div>
    </div>
  )

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!companyName.trim()) return setError('Indiquez le nom de votre entreprise.')
    setError('')
    setLoading(true)
    try {
      // Créer le tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name:         companyName.trim(),
          owner_id:     user.id,
          plan:         'free',
          max_users:    2,
          max_products: 50,
        })
        .select()
        .single()

      if (tenantError) throw tenantError

      // Créer le membership admin
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: newTenant.id,
          user_id:   user.id,
          email:     user.email,
          full_name: user.user_metadata?.full_name || '',
          role:      'admin',
          status:    'active',
          joined_at: new Date().toISOString(),
        })

      if (memberError) throw memberError

      localStorage.removeItem('pending_company')

      // Recharger le contexte
      await loadTenantContext(user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center
                          justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Package size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-heading font-semibold text-gray-900">
            Bienvenue sur Gérer mon stock !
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Configurez votre espace de travail en quelques secondes.
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2
                          rounded-lg mb-4">
              {error}
            </p>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label flex items-center gap-1">
                <Building2 size={11} /> Nom de votre entreprise *
              </label>
              <input
                className="input"
                placeholder="Ex: Boutique Amara, Shop Koné..."
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="bg-primary/5 border border-primary/10
                            rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-primary">
                Plan Gratuit — ce que vous obtenez :
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <span>✓ 50 produits max</span>
                <span>✓ 2 utilisateurs</span>
                <span>✓ Ventes illimitées</span>
                <span>✓ Stock de base</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? 'Configuration...' : (
                <> Créer mon espace <ArrowRight size={16} /> </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}