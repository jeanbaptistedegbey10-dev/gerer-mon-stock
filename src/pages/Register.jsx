import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Package, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirm: ''
  })
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { signUp } = useStore()

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm)
      return setError('Les mots de passe ne correspondent pas.')
    if (form.password.length < 6)
      return setError('Minimum 6 caractères pour le mot de passe.')

    setLoading(true)
    try {
      await signUp(form.email, form.password, form.fullName)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte.')
    } finally {
      setLoading(false)
    }
  }

  // Écran de succès
  if (success) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-green-600" />
        </div>
        <h2 className="text-xl font-heading font-semibold text-gray-900 mb-2">
          Compte créé avec succès !
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Un email de confirmation a été envoyé à <strong>{form.email}</strong>.
          Vérifiez votre boîte mail puis connectez-vous.
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

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Package size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-heading font-semibold text-gray-900">
            Créer un compte
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Commencez à gérer votre stock gratuitement
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm px-3 py-2.5 rounded-lg mb-4 border border-red-100">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nom complet</label>
              <input
                className="input"
                placeholder="Amara Koné"
                value={form.fullName}
                onChange={set('fullName')}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="vous@exemple.com"
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input
                type="password"
                className="input"
                placeholder="Minimum 6 caractères"
                value={form.password}
                onChange={set('password')}
                required
              />
            </div>
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.confirm}
                onChange={set('confirm')}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}