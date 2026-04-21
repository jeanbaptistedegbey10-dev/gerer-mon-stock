import { useState, useEffect, useRef } from 'react'
import { X, TrendingUp, ImagePlus, Loader } from 'lucide-react'
import { uploadProductImage } from '../hooks/useProducts'
import { useStore } from '../store/useStore'

const EMPTY_FORM = {
  name:                '',
  description:         '',
  category:            '',
  supplier:            '',
  purchase_price:      '',
  sale_price:          '',
  low_stock_threshold: 10,
  image_url:           '',
}

export default function ProductModal({ product, onClose, onSave }) {
  const { user }  = useStore()
  const [form,    setForm]       = useState(EMPTY_FORM)
  const [preview, setPreview]    = useState(null)
  const [imgLoad, setImgLoad]    = useState(false)
  const [loading, setLoading]    = useState(false)
  const [error,   setError]      = useState('')
  const fileRef = useRef()

  useEffect(() => {
    if (product) {
      setForm({
        name:                product.name                || '',
        description:         product.description         || '',
        category:            product.category            || '',
        supplier:            product.supplier            || '',
        purchase_price:      product.purchase_price      || '',
        sale_price:          product.sale_price          || '',
        low_stock_threshold: product.low_stock_threshold || 10,
        image_url:           product.image_url           || '',
      })
      setPreview(product.image_url || null)
    }
  }, [product])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Marge temps réel
  const margin = (() => {
    const buy  = parseFloat(form.purchase_price)
    const sell = parseFloat(form.sale_price)
    if (!buy || !sell || buy === 0) return null
    return (((sell - buy) / buy) * 100).toFixed(1)
  })()

  // ─── Gestion image ─────────────────────────────────────────────────────────
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview immédiate
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setImgLoad(true)
    setError('')

    try {
      const publicUrl = await uploadProductImage(file, user.id)
      setForm(f => ({ ...f, image_url: publicUrl }))
    } catch (err) {
      setError('Erreur upload image : ' + err.message)
      setPreview(null)
    } finally {
      setImgLoad(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSave({
        name:                form.name.trim(),
        description:         form.description.trim(),
        category:            form.category.trim(),
        supplier:            form.supplier.trim(),
        purchase_price:      parseFloat(form.purchase_price) || 0,
        sale_price:          parseFloat(form.sale_price)     || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
        image_url:           form.image_url || null,
      })
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
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            {product ? 'Modifier le produit' : 'Ajouter un produit'}
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700
                            text-sm px-3 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          {/* ── Upload image ─────────────────────────────────────────────── */}
          <div>
            <label className="label">Image du produit</label>
            <div
              onClick={() => !imgLoad && fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl
                          flex flex-col items-center justify-center
                          transition-all cursor-pointer
                          ${imgLoad ? 'opacity-60 cursor-wait' : 'hover:border-primary/50 hover:bg-blue-50/30'}
                          ${preview ? 'border-primary/30 h-36' : 'border-gray-200 h-28'}`}
            >
              {imgLoad && (
                <div className="absolute inset-0 flex items-center justify-center
                                bg-white/70 rounded-xl z-10">
                  <Loader size={20} className="animate-spin text-primary" />
                  <span className="ml-2 text-sm text-primary">Compression...</span>
                </div>
              )}

              {preview ? (
                <img
                  src={preview}
                  alt="preview"
                  className="h-full w-full object-contain rounded-xl p-2"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <ImagePlus size={24} className="mx-auto mb-1" />
                  <p className="text-xs">Cliquez pour ajouter une image</p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Compressée automatiquement à 8ko
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {preview && (
              <button
                type="button"
                onClick={() => { setPreview(null); setForm(f => ({ ...f, image_url: '' })) }}
                className="text-xs text-red-400 hover:text-red-600 mt-1"
              >
                Retirer l'image
              </button>
            )}
          </div>

          {/* ── Nom ────────────────────────────────────────────────────────── */}
          <div>
            <label className="label">Nom du produit *</label>
            <input className="input" placeholder="Ex: Samsung Galaxy A35"
              value={form.name} onChange={set('name')} required autoFocus />
          </div>

          {/* ── Catégorie + Fournisseur ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Catégorie</label>
              <input className="input" placeholder="Ex: Téléphonie"
                value={form.category} onChange={set('category')} />
            </div>
            <div>
              <label className="label">Fournisseur</label>
              <input className="input" placeholder="Ex: Shenzhen Tech"
                value={form.supplier} onChange={set('supplier')} />
            </div>
          </div>

          {/* ── Prix ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prix d'achat (FCFA) *</label>
              <input type="number" className="input" placeholder="0" min="0"
                value={form.purchase_price} onChange={set('purchase_price')} required />
            </div>
            <div>
              <label className="label">Prix de vente (FCFA) *</label>
              <input type="number" className="input" placeholder="0" min="0"
                value={form.sale_price} onChange={set('sale_price')} required />
            </div>
          </div>

          {/* ── Marge temps réel ─────────────────────────────────────────── */}
          {margin !== null && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg
              ${parseFloat(margin) > 0 ? 'bg-green-50 text-green-700'
                                       : 'bg-red-50 text-red-700'}`}>
              <TrendingUp size={14} />
              <span>
                Marge : <strong>{margin}%</strong>
                {' — '}
                {parseFloat(form.sale_price) - parseFloat(form.purchase_price) > 0
                  ? `+${(parseFloat(form.sale_price) - parseFloat(form.purchase_price))
                      .toLocaleString('fr-FR')} FCFA / unité`
                  : 'Prix vente inférieur au prix achat !'
                }
              </span>
            </div>
          )}

          {/* ── Seuil alerte ─────────────────────────────────────────────── */}
          <div>
            <label className="label">Seuil alerte stock faible</label>
            <input type="number" className="input" placeholder="10" min="0"
              value={form.low_stock_threshold}
              onChange={set('low_stock_threshold')} />
            <p className="text-xs text-gray-400 mt-1">
              Une alerte s'affichera quand le stock passe sous ce seuil
            </p>
          </div>

          {/* ── Description ──────────────────────────────────────────────── */}
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Description optionnelle..."
              value={form.description} onChange={set('description')} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="btn flex-1 justify-center">
              Annuler
            </button>
            <button type="submit" disabled={loading || imgLoad}
              className="btn btn-primary flex-1 justify-center">
              {loading ? 'Enregistrement...' : product ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}