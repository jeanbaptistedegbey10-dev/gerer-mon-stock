import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore }   from '../store/useStore'
import { useTenant }  from '../hooks/useTenant'
import { Package, AlertCircle, CheckCircle2, Building2 } from 'lucide-react'

const STEPS = ['compte', 'entreprise']

export default function Register() {
  const [step,   setStep]   = useState(0)
  const [form,   setForm]   = useState({
    fullName:     '',
    email:        '',
    password:     '',
    confirm:      '',
    companyName:  '',
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signUp } = useStore()
  const navigate   = useNavigate()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Étape 1 : valider le compte ─────────────────────────────────────────
  const handleStep1 = (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm)
      return setError('Les mots de passe ne correspondent pas.')
    if (form.password.length < 6)
      return setError('Minimum 6 caractères.')
    setStep(1)
  }

  // ── Étape 2 : créer compte + tenant ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.companyName.trim())
      return setError('Le nom de votre entreprise est obligatoire.')
    setError('')
    setLoading(true)
    try {
      // 1. Créer le compte Supabase
      const { data } = await signUp(form.email, form.password, form.fullName)

      // 2. Si email confirmé directement → créer tenant
      // Sinon → le tenant sera créé après confirmation (via onboarding)
      if (data?.session) {
        // Email confirmation désactivée → créer tenant maintenant
        const { useTenant: hook } = await import('../hooks/useTenant')
        // On stocke le nom en localStorage pour le créer après confirmation
      }

      // Stocker le nom d'entreprise pour l'onboarding post-confirmation
      localStorage.setItem('pending_company', form.companyName.trim())
      localStorage.setItem('pending_name',    form.fullName.trim())

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center
                        justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-green-600" />
        </div>
        <h2 className="text-xl font-heading font-semibold text-gray-900 mb-2">
          Compte créé !
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Vérifiez votre email <strong>{form.email}</strong> pour confirmer
          votre compte. Votre entreprise sera configurée automatiquement
          à la première connexion.
        </p>
        <Link to="/login" className="btn btn-primary w-full justify-center">
          Aller à la connexion
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center
                          justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Package size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-heading font-semibold text-gray-900">
            Créer un compte
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Commencez à gérer votre stock gratuitement
          </p>
        </div>

        {/* Indicateur étapes */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center
                justify-center text-xs font-bold transition-all
                ${i <= step
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 text-gray-400'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs capitalize ${
                i === step ? 'text-primary font-medium' : 'text-gray-400'
              }`}>
                {s === 'compte' ? 'Votre compte' : 'Votre entreprise'}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 ${
                  i < step ? 'bg-primary' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="card p-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700
                            text-sm px-3 py-2.5 rounded-lg mb-4
                            border border-red-100">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── Étape 1 : Compte ────────────────────────────────────────── */}
          {step === 0 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="label">Nom complet *</label>
                <input className="input" placeholder="Amara Koné"
                  value={form.fullName} onChange={set('fullName')} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input"
                  placeholder="vous@exemple.com"
                  value={form.email} onChange={set('email')} required />
              </div>
              <div>
                <label className="label">Mot de passe *</label>
                <input type="password" className="input"
                  placeholder="Minimum 6 caractères"
                  value={form.password} onChange={set('password')} required />
              </div>
              <div>
                <label className="label">Confirmer *</label>
                <input type="password" className="input"
                  placeholder="••••••••"
                  value={form.confirm} onChange={set('confirm')} required />
              </div>
              <button type="submit"
                className="btn btn-primary w-full justify-center py-2.5">
                Suivant →
              </button>
            </form>
          )}

          {/* ── Étape 2 : Entreprise ────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl
                                flex items-center justify-center mx-auto mb-2">
                  <Building2 size={22} className="text-primary" />
                </div>
                <p className="text-sm text-gray-600">
                  Donnez un nom à votre entreprise
                </p>
              </div>
              <div>
                <label className="label">Nom de l'entreprise *</label>
                <input className="input"
                  placeholder="Ex: Boutique Amara, Shop Koné..."
                  value={form.companyName} onChange={set('companyName')}
                  required autoFocus />
              </div>

              {/* Plan gratuit par défaut */}
              <div className="bg-green-50 border border-green-100
                              rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="pill pill-green">Plan Gratuit</span>
                </div>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>✓ Jusqu'à 50 produits</li>
                  <li>✓ 2 utilisateurs inclus</li>
                  <li>✓ Ventes + Stock de base</li>
                  <li className="text-gray-400">
                    → Passez à Pro pour débloquer tout
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(0)}
                  className="btn flex-1 justify-center">
                  ← Retour
                </button>
                <button type="submit" disabled={loading}
                  className="btn btn-primary flex-1 justify-center py-2.5">
                  {loading ? 'Création...' : 'Créer mon compte'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Déjà un compte ?{' '}
          <Link to="/login"
            className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}