import { useState, useEffect } from 'react'
import { X, TrendingUp } from 'lucide-react'

const EMPTY_FORM = {
  name:                '',
  description:         '',
  category:            '',
  supplier:            '',
  purchase_price:      '',
  sale_price:          '',
  quantity:            '',
  low_stock_threshold: 10,
}

export default function ProductModal({ product, onClose, onSave }) {
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Pré-remplir si édition
  useEffect(() => {
    if (product) {
      setForm({
        name:                product.name                || '',
        description:         product.description         || '',
        category:            product.category            || '',
        supplier:            product.supplier            || '',
        purchase_price:      product.purchase_price      || '',
        sale_price:          product.sale_price          || '',
        quantity:            product.quantity            || '',
        low_stock_threshold: product.low_stock_threshold || 10,
      })
    }
  }, [product])

  const set = (key) => (e) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  // Calcul marge en temps réel
  const margin = (() => {
    const buy  = parseFloat(form.purchase_price)
    const sell = parseFloat(form.sale_price)
    if (!buy || !sell || buy === 0) return null
    return (((sell - buy) / buy) * 100).toFixed(1)
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = {
        name:                form.name.trim(),
        description:         form.description.trim(),
        category:            form.category.trim(),
        supplier:            form.supplier.trim(),
        purchase_price:      parseFloat(form.purchase_price) || 0,
        sale_price:          parseFloat(form.sale_price)     || 0,
        quantity:            parseInt(form.quantity)          || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
      }

      await onSave(data) // délègue au parent (create ou update)
      onClose()
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'enregistrement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm
                    flex items-center justify-center p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            {product ? 'Modifier le produit' : 'Ajouter un produit'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700
                            text-sm px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="label">Nom du produit *</label>
            <input
              className="input"
              placeholder="Ex: Samsung Galaxy A35"
              value={form.name}
              onChange={set('name')}
              required
              autoFocus
            />
          </div>

          {/* Catégorie + Fournisseur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Catégorie</label>
              <input
                className="input"
                placeholder="Ex: Téléphonie"
                value={form.category}
                onChange={set('category')}
              />
            </div>
            <div>
              <label className="label">Fournisseur</label>
              <input
                className="input"
                placeholder="Ex: Shenzhen Tech"
                value={form.supplier}
                onChange={set('supplier')}
              />
            </div>
          </div>

          {/* Prix achat + vente + marge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prix d'achat (FCFA) *</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                value={form.purchase_price}
                onChange={set('purchase_price')}
                required
              />
            </div>
            <div>
              <label className="label">Prix de vente (FCFA) *</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                value={form.sale_price}
                onChange={set('sale_price')}
                required
              />
            </div>
          </div>

          {/* Indicateur marge en temps réel */}
          {margin !== null && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg
              ${parseFloat(margin) > 0
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
              }`}
            >
              <TrendingUp size={14} />
              <span>
                Marge : <strong>{margin}%</strong>
                {' '}—{' '}
                {parseFloat(form.sale_price) - parseFloat(form.purchase_price) > 0
                  ? `+${(parseFloat(form.sale_price) - parseFloat(form.purchase_price)).toLocaleString('fr-FR')} FCFA par unité`
                  : 'Prix de vente inférieur au prix d\'achat !'
                }
              </span>
            </div>
          )}

          {/* Quantité + seuil alerte */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantité en stock *</label>
              <input
                type="number"
                className="input"
                placeholder="0"
                min="0"
                value={form.quantity}
                onChange={set('quantity')}
                required
              />
            </div>
            <div>
              <label className="label">Seuil alerte stock</label>
              <input
                type="number"
                className="input"
                placeholder="10"
                min="0"
                value={form.low_stock_threshold}
                onChange={set('low_stock_threshold')}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Description optionnelle..."
              value={form.description}
              onChange={set('description')}
            />
          </div>

          {/* Actions */}
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
              disabled={loading}
              className="btn btn-primary flex-1 justify-center"
            >
              {loading
                ? 'Enregistrement...'
                : product ? 'Modifier' : 'Ajouter'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}