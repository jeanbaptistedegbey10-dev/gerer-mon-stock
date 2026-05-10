import { useState, useRef, useEffect } from 'react'
import { useStore }       from '../store/useStore'
import { useSettings }    from '../hooks/useSettings'
import { usePermissions } from '../hooks/usePermissions'
import {
  Building2, User, CreditCard, Globe,
  Camera, Save, Eye, EyeOff, Check,
  AlertTriangle, Package, Phone,
  MapPin, Mail, Lock, RefreshCw
} from 'lucide-react'

const CURRENCIES = [
  { code: 'FCFA', label: 'FCFA — Franc CFA' },
  { code: 'EUR',  label: 'EUR — Euro'        },
  { code: 'USD',  label: 'USD — Dollar US'   },
  { code: 'GHS',  label: 'GHS — Cedi Ghana'  },
  { code: 'NGN',  label: 'NGN — Naira Nigéria' },
  { code: 'XOF',  label: 'XOF — Franc CFA BCEAO' },
]

const COUNTRIES = [
  'Togo', 'Bénin', 'Côte d\'Ivoire', 'Sénégal', 'Mali',
  'Burkina Faso', 'Niger', 'Ghana', 'Nigeria', 'Cameroun',
  'France', 'Belgique', 'Autre',
]

const TABS = [
  { id: 'boutique', label: 'Ma boutique',   icon: Building2  },
  { id: 'profil',   label: 'Mon profil',    icon: User       },
  { id: 'devise',   label: 'Devise & Pays', icon: Globe      },
  { id: 'plan',     label: 'Mon plan',      icon: CreditCard },
]

// ── Toast local ───────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

// ── Section Boutique ──────────────────────────────────────────────────────────
function ShopSection({ tenant, updateShop, uploadLogo, saving }) {
  const [form,       setForm]       = useState({
    name:        tenant?.name        || '',
    phone:       tenant?.phone       || '',
    address:     tenant?.address     || '',
    city:        tenant?.city        || '',
    country:     tenant?.country     || 'Togo',
    description: tenant?.description || '',
  })
  const [logoPreview, setLogoPreview] = useState(tenant?.logo_url || null)
  const [uploading,   setUploading]   = useState(false)
  const [saved,       setSaved]       = useState(false)
  const fileRef = useRef()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      await uploadLogo(file)
    } catch (err) {
      alert('Erreur upload logo : ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await updateShop(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">

      {/* Logo */}
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
          Logo de la boutique
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2
                            border-dashed border-gray-300 overflow-hidden
                            flex items-center justify-center flex-shrink-0">
              {logoPreview ? (
                <img src={logoPreview} alt="logo"
                  className="w-full h-full object-cover" />
              ) : (
                <Package size={28} className="text-gray-300" />
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/70 rounded-2xl
                              flex items-center justify-center">
                <RefreshCw size={16} className="animate-spin text-primary" />
              </div>
            )}
          </div>
          <div>
            <button type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn btn-primary text-sm">
              <Camera size={14} />
              {uploading ? 'Upload...' : 'Changer le logo'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">
              PNG, JPG — Max 2Mo — Recommandé : 200×200px
            </p>
            <input ref={fileRef} type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden" onChange={handleLogoChange} />
          </div>
        </div>
      </div>

      {/* Infos boutique */}
      <div className="card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-gray-900 text-sm">
          Informations de la boutique
        </h3>

        <div>
          <label className="label flex items-center gap-1">
            <Building2 size={11} /> Nom de la boutique *
          </label>
          <input className="input" placeholder="Boutique Amara..."
            value={form.name} onChange={set('name')} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label flex items-center gap-1">
              <Phone size={11} /> Téléphone
            </label>
            <input className="input" placeholder="+228 90 00 00 00"
              type="tel" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label flex items-center gap-1">
              <MapPin size={11} /> Ville
            </label>
            <input className="input" placeholder="Lomé"
              value={form.city} onChange={set('city')} />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-1">
            <MapPin size={11} /> Adresse
          </label>
          <input className="input" placeholder="Quartier, rue, numéro..."
            value={form.address} onChange={set('address')} />
        </div>

        <div>
          <label className="label">Pays</label>
          <select className="input" value={form.country} onChange={set('country')}>
            {COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={2}
            placeholder="Description courte de votre activité..."
            value={form.description} onChange={set('description')} />
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="btn btn-primary w-full justify-center py-2.5">
        {saving ? (
          <><RefreshCw size={15} className="animate-spin" /> Sauvegarde...</>
        ) : saved ? (
          <><Check size={15} /> Sauvegardé !</>
        ) : (
          <><Save size={15} /> Sauvegarder les modifications</>
        )}
      </button>
    </form>
  )
}

// ── Section Profil ────────────────────────────────────────────────────────────
function ProfileSection({ user, updateProfile, updatePassword, saving }) {
  const [nameForm, setNameForm] = useState({
    fullName: user?.user_metadata?.full_name || '',
  })
  const [pwdForm,  setPwdForm]  = useState({
    current: '', newPwd: '', confirm: '',
  })
  const [showPwd,   setShowPwd]   = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [pwdSaved,  setPwdSaved]  = useState(false)
  const [pwdError,  setPwdError]  = useState('')

  const handleNameSave = async (e) => {
    e.preventDefault()
    try {
      await updateProfile({ fullName: nameForm.fullName })
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 2000)
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  const handlePwdSave = async (e) => {
    e.preventDefault()
    setPwdError('')
    if (pwdForm.newPwd.length < 6)
      return setPwdError('Minimum 6 caractères.')
    if (pwdForm.newPwd !== pwdForm.confirm)
      return setPwdError('Les mots de passe ne correspondent pas.')
    try {
      await updatePassword({
        currentPassword: pwdForm.current,
        newPassword:     pwdForm.newPwd,
      })
      setPwdSaved(true)
      setPwdForm({ current: '', newPwd: '', confirm: '' })
      setTimeout(() => setPwdSaved(false), 2000)
    } catch (err) {
      setPwdError(err.message)
    }
  }

  return (
    <div className="space-y-6">

      {/* Infos personnelles */}
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
          Informations personnelles
        </h3>
        <form onSubmit={handleNameSave} className="space-y-4">
          <div>
            <label className="label flex items-center gap-1">
              <User size={11} /> Nom complet
            </label>
            <input className="input"
              placeholder="Votre nom complet"
              value={nameForm.fullName}
              onChange={e => setNameForm({ fullName: e.target.value })} />
          </div>
          <div>
            <label className="label flex items-center gap-1">
              <Mail size={11} /> Email
            </label>
            <input className="input bg-gray-50 cursor-not-allowed"
              value={user?.email || ''} disabled
              title="L'email ne peut pas être modifié" />
            <p className="text-xs text-gray-400 mt-1">
              L'email ne peut pas être modifié.
            </p>
          </div>
          <button type="submit" disabled={saving}
            className="btn btn-primary justify-center">
            {nameSaved
              ? <><Check size={14} /> Sauvegardé !</>
              : <><Save size={14} /> Sauvegarder</>
            }
          </button>
        </form>
      </div>

      {/* Mot de passe */}
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4
                        flex items-center gap-2">
          <Lock size={15} className="text-gray-500" />
          Changer le mot de passe
        </h3>
        <form onSubmit={handlePwdSave} className="space-y-4">
          {pwdError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-700
                            text-sm px-3 py-2.5 rounded-lg border border-red-100">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {pwdError}
            </div>
          )}
          <div>
            <label className="label">Mot de passe actuel *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                className="input pr-10"
                placeholder="••••••••"
                value={pwdForm.current}
                onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))}
                required
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Nouveau mot de passe *</label>
            <input type="password" className="input"
              placeholder="Minimum 6 caractères"
              value={pwdForm.newPwd}
              onChange={e => setPwdForm(f => ({ ...f, newPwd: e.target.value }))}
              required />
          </div>
          <div>
            <label className="label">Confirmer le nouveau *</label>
            <input type="password" className="input"
              placeholder="••••••••"
              value={pwdForm.confirm}
              onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))}
              required />
          </div>
          <button type="submit" disabled={saving}
            className="btn btn-primary justify-center">
            {pwdSaved
              ? <><Check size={14} /> Mot de passe changé !</>
              : <><Lock size={14} /> Changer le mot de passe</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Section Devise ────────────────────────────────────────────────────────────
function CurrencySection({ tenant, updateShop, saving }) {
  const [form, setForm] = useState({
    currency: tenant?.currency || 'FCFA',
    country:  tenant?.country  || 'Togo',
  })
  const [saved, setSaved] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      await updateShop(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Erreur : ' + err.message)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="card p-5 space-y-4">
        <h3 className="font-heading font-semibold text-gray-900 text-sm">
          Devise et localisation
        </h3>

        <div>
          <label className="label flex items-center gap-1">
            <Globe size={11} /> Devise principale
          </label>
          <select className="input" value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Utilisée dans tous les reçus et rapports.
          </p>
        </div>

        <div>
          <label className="label">Pays</label>
          <select className="input" value={form.country}
            onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
            {COUNTRIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Aperçu */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Aperçu</p>
          <div className="space-y-1.5 text-sm text-gray-700">
            <p>Prix produit :
              <span className="font-semibold ml-2">
                15 000 {form.currency}
              </span>
            </p>
            <p>Total vente :
              <span className="font-semibold ml-2">
                127 500 {form.currency}
              </span>
            </p>
            <p>Date :
              <span className="font-semibold ml-2">
                {new Date().toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric'
                })}
              </span>
            </p>
          </div>
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="btn btn-primary w-full justify-center py-2.5">
        {saving ? (
          <><RefreshCw size={15} className="animate-spin" /> Sauvegarde...</>
        ) : saved ? (
          <><Check size={15} /> Sauvegardé !</>
        ) : (
          <><Save size={15} /> Sauvegarder</>
        )}
      </button>
    </form>
  )
}

// ── Section Plan ──────────────────────────────────────────────────────────────
function PlanSection({ tenant }) {
  const plans = [
    {
      id:       'free',
      name:     'Gratuit',
      price:    '0',
      features: [
        '50 produits maximum',
        '2 utilisateurs',
        'Ventes illimitées',
        'Stock de base',
        'Reçus PDF',
      ],
      limits: [
        'Pas de rapports avancés',
        'Pas de livraisons',
        'Support standard',
      ],
      color: 'border-gray-200',
      badge: 'pill-gray',
    },
    {
      id:       'pro',
      name:     'Pro',
      price:    '15 000',
      features: [
        '500 produits',
        '10 utilisateurs',
        'Tout du plan Gratuit',
        'Rapports avancés',
        'Livraisons',
        'Filtres par employé',
        'Support prioritaire',
      ],
      limits: [],
      color:  'border-primary',
      badge:  'pill-blue',
      popular: true,
    },
    {
      id:       'enterprise',
      name:     'Enterprise',
      price:    '45 000',
      features: [
        'Produits illimités',
        'Utilisateurs illimités',
        'Tout du plan Pro',
        'Super Admin',
        'API access',
        'Support dédié',
        'Formation incluse',
      ],
      limits: [],
      color:  'border-amber-400',
      badge:  'pill-orange',
    },
  ]

  const currentPlan = tenant?.plan || 'free'

  return (
    <div className="space-y-4">

      {/* Plan actuel */}
      <div className="card p-4 flex items-center gap-3 border-primary/20 bg-primary/5">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center
                        justify-center flex-shrink-0">
          <CreditCard size={18} className="text-white" />
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">
            Votre plan actuel
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`pill ${
              currentPlan === 'free'       ? 'pill-gray'   :
              currentPlan === 'pro'        ? 'pill-blue'   :
              'pill-orange'
            }`}>
              {currentPlan === 'free'       ? 'Gratuit'    :
               currentPlan === 'pro'        ? 'Pro'        :
               'Enterprise'}
            </span>
            <span className="text-xs text-gray-500">
              {tenant?.max_users
                ? `${tenant.max_users} utilisateurs max`
                : 'Illimité'}
              {tenant?.max_products
                ? ` · ${tenant.max_products} produits max`
                : ' · Produits illimités'}
            </span>
          </div>
        </div>
      </div>

      {/* Grille plans */}
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.id}
            className={`card p-5 border-2 relative transition-all
              ${plan.color}
              ${currentPlan === plan.id ? 'shadow-md' : ''}
            `}>

            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-semibold
                                 px-3 py-1 rounded-full">
                  ⭐ Populaire
                </span>
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading font-semibold text-gray-900">
                  {plan.name}
                </h3>
                {currentPlan === plan.id && (
                  <span className="pill pill-green text-xs">Actuel</span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-heading font-bold text-gray-900">
                  {plan.price}
                </span>
                <span className="text-xs text-gray-400">
                  FCFA / mois
                </span>
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-700">
                  <Check size={12} className="text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
              {plan.limits.map(l => (
                <li key={l} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-3 h-3 flex-shrink-0 text-center">✗</span>
                  {l}
                </li>
              ))}
            </ul>

            {currentPlan === plan.id ? (
              <button disabled
                className="btn w-full justify-center text-sm
                           bg-gray-100 text-gray-400 cursor-not-allowed">
                Plan actuel
              </button>
            ) : (
              <button
                onClick={() => alert(
                  `Pour passer au plan ${plan.name}, contactez-nous.\n` +
                  `WhatsApp : +228 XX XX XX XX`
                )}
                className={`btn w-full justify-center text-sm
                  ${plan.id === 'pro'
                    ? 'btn-primary'
                    : 'border-amber-400 text-amber-600 hover:bg-amber-50'
                  }`}>
                {currentPlan === 'free' && plan.id === 'pro'
                  ? '⬆ Passer à Pro'
                  : plan.id === 'enterprise'
                  ? '⬆ Contacter'
                  : '⬇ Rétrograder'}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Utilisation actuelle */}
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-gray-900 text-sm mb-4">
          Utilisation actuelle
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Utilisateurs</span>
              <span className="font-medium">
                — / {tenant?.max_users ?? '∞'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-1/4" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Produits</span>
              <span className="font-medium">
                — / {tenant?.max_products ?? '∞'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full w-1/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page Paramètres ───────────────────────────────────────────────────────────
export default function Settings() {
  const { user, tenant }                          = useStore()
  const { saving, updateShop, uploadLogo,
          updateProfile, updatePassword }          = useSettings()
  const { can }                                   = usePermissions()
  const [activeTab, setActiveTab]                 = useState('boutique')

  // Si pas admin → seulement l'onglet profil
  const visibleTabs = TABS.filter(t => {
    if (t.id === 'boutique' || t.id === 'devise' || t.id === 'plan') {
      return can('manage_settings')
    }
    return true
  })

  // Rediriger vers profil si pas admin
  useEffect(() => {
    if (!can('manage_settings') && activeTab !== 'profil') {
      setActiveTab('profil')
    }
  }, [])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold text-gray-900">
          Paramètres
        </h1>
        <p className="text-sm text-gray-500">
          Gérez votre boutique et votre compte
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg
                text-sm font-medium transition-all whitespace-nowrap flex-1
                justify-center
                ${activeTab === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenu */}
      {activeTab === 'boutique' && can('manage_settings') && (
        <ShopSection
          tenant={tenant}
          updateShop={updateShop}
          uploadLogo={uploadLogo}
          saving={saving}
        />
      )}

      {activeTab === 'profil' && (
        <ProfileSection
          user={user}
          updateProfile={updateProfile}
          updatePassword={updatePassword}
          saving={saving}
        />
      )}

      {activeTab === 'devise' && can('manage_settings') && (
        <CurrencySection
          tenant={tenant}
          updateShop={updateShop}
          saving={saving}
        />
      )}

      {activeTab === 'plan' && can('manage_settings') && (
        <PlanSection tenant={tenant} />
      )}
    </div>
  )
}