import { useState, useEffect } from 'react'
import { useNavigate }  from 'react-router-dom'
import { useStore }     from '../store/useStore'
import { useTenant }    from '../hooks/useTenant'
import { Package, Building2, Users, ArrowRight } from 'lucide-react'

export default function Onboarding() {
  const navigate = useNavigate()
  const { user } = useStore()
  const { createTenant, joinTenant } = useTenant()

  const [companyName, setCompanyName] = useState(
    localStorage.getItem('pending_company') || ''
  )
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Tenter de rejoindre un tenant via invitation
  useEffect(() => {
    const tryJoin = async () => {
      const joined = await joinTenant()
      if (joined) {
        localStorage.removeItem('pending_company')
        navigate('/dashboard')
      }
    }
    if (user) tryJoin()
  }, [user])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!companyName.trim()) return setError('Indiquez le nom de votre entreprise.')
    setError('')
    setLoading(true)
    try {
      await createTenant(companyName)
      localStorage.removeItem('pending_company')
      navigate('/dashboard')
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
              <input className="input"
                placeholder="Ex: Boutique Amara, Shop Koné..."
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required autoFocus />
            </div>

            {/* Plan gratuit */}
            <div className="bg-primary/5 border border-primary/10
                            rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-primary">
                Plan Gratuit — ce que vous obtenez :
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  ✓ 50 produits max
                </span>
                <span className="flex items-center gap-1">
                  ✓ 2 utilisateurs
                </span>
                <span className="flex items-center gap-1">
                  ✓ Ventes illimitées
                </span>
                <span className="flex items-center gap-1">
                  ✓ Stock de base
                </span>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn btn-primary w-full justify-center py-3 text-base">
              {loading ? 'Configuration...' : (
                <>
                  Créer mon espace
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}