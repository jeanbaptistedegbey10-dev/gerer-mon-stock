import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useSales }    from '../hooks/useSales'
import { generateReceipt } from '../utils/pdf'
import {
  Search, Plus, Minus, Trash2,
  ShoppingCart, FileText, ArrowLeft, User
} from 'lucide-react'

export default function NewSale() {
  const navigate = useNavigate()
  const { products } = useProducts()
  const { createSale } = useSales()

  // ─── State panier ─────────────────────────────────────────────────────────
  const [cart,       setCart]       = useState([])   // { product, quantity, unit_price }
  const [search,     setSearch]     = useState('')
  const [clientName, setClientName] = useState('')
  const [status,     setStatus]     = useState('payé')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // ─── Produits filtrés (hors rupture) ──────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.quantity > 0 &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     (p.category || '').toLowerCase().includes(search.toLowerCase()))
  )

  // ─── Actions panier ───────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        // Limite à la quantité disponible
        if (existing.quantity >= product.quantity) return prev
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { product, quantity: 1, unit_price: product.sale_price }]
    })
  }

  const updateQty = (productId, delta) => {
    setCart(prev =>
      prev
        .map(i => i.product.id === productId
          ? { ...i, quantity: i.quantity + delta }
          : i
        )
        .filter(i => i.quantity > 0) // retire si qty = 0
    )
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  const updatePrice = (productId, value) => {
    setCart(prev => prev.map(i =>
      i.product.id === productId
        ? { ...i, unit_price: parseFloat(value) || 0 }
        : i
    ))
  }

  // ─── Calculs ──────────────────────────────────────────────────────────────
  const subtotal  = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  // ─── Validation ───────────────────────────────────────────────────────────
  const handleSubmit = async (withPDF = false) => {
    if (cart.length === 0) return setError('Ajoutez au moins un produit.')
    setError('')
    setLoading(true)
    try {
      const sale = await createSale({ cartItems: cart, clientName, status })

      if (withPDF) {
        // Construire les items au format PDF
        const pdfItems = cart.map(i => ({
          product_name: i.product.name,
          quantity:     i.quantity,
          unit_price:   i.unit_price,
          total:        i.unit_price * i.quantity,
        }))
        generateReceipt({ ...sale, total: subtotal }, pdfItems)
      }

      navigate('/sales')
    } catch (err) {
      setError(err.message || 'Erreur lors de la création de la vente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="btn p-2"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-heading font-semibold text-gray-900">
            Nouvelle vente
          </h1>
          <p className="text-sm text-gray-500">
            Sélectionnez les produits à vendre
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Catalogue produits (2/3) ──────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Grille produits */}
          {filteredProducts.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">
              Aucun produit disponible.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.product.id === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`card p-4 text-left transition-all hover:shadow-md
                      hover:border-primary/30 active:scale-95
                      ${inCart ? 'border-primary/40 bg-primary/5' : ''}
                    `}
                  >
                    {/* Indicateur quantité dans le panier */}
                    {inCart && (
                      <span className="inline-block mb-2 px-2 py-0.5 bg-primary
                                       text-white text-xs rounded-full font-medium">
                        x{inCart.quantity} dans panier
                      </span>
                    )}
                    <p className="font-medium text-gray-900 text-sm leading-tight mb-1">
                      {p.name}
                    </p>
                    {p.category && (
                      <p className="text-xs text-gray-400 mb-2">{p.category}</p>
                    )}
                    <p className="text-base font-semibold text-primary">
                      {p.sale_price.toLocaleString('fr-FR')}
                      <span className="text-xs text-gray-400 font-normal ml-1">FCFA</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Stock : {p.quantity}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Panier (1/3) ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-6">

            {/* Header panier */}
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={16} className="text-primary" />
              <h2 className="font-heading font-semibold text-gray-900">
                Panier
              </h2>
              {itemCount > 0 && (
                <span className="ml-auto pill pill-blue">
                  {itemCount} article{itemCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Panier vide */}
            {cart.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">
                <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
                Cliquez sur un produit pour l'ajouter
              </div>
            )}

            {/* Items */}
            <div className="space-y-3 mb-4">
              {cart.map(item => (
                <div key={item.product.id}
                  className="flex flex-col gap-2 pb-3 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 leading-tight flex-1">
                      {item.product.name}
                    </p>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Contrôle quantité */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="w-6 h-6 rounded border border-gray-200 flex items-center
                                   justify-center hover:bg-gray-100 transition-colors"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        disabled={item.quantity >= item.product.quantity}
                        className="w-6 h-6 rounded border border-gray-200 flex items-center
                                   justify-center hover:bg-gray-100 transition-colors
                                   disabled:opacity-30"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Prix unitaire éditable */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updatePrice(item.product.id, e.target.value)}
                        className="w-24 text-right text-sm border border-gray-200
                                   rounded px-2 py-0.5 focus:outline-none focus:border-primary"
                      />
                      <span className="text-xs text-gray-400">FCFA</span>
                    </div>
                  </div>

                  {/* Sous-total ligne */}
                  <p className="text-xs text-right text-gray-500">
                    = {(item.unit_price * item.quantity).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              ))}
            </div>

            {/* Client + Statut */}
            {cart.length > 0 && (
              <div className="space-y-3 mb-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="label flex items-center gap-1">
                    <User size={11} /> Client (optionnel)
                  </label>
                  <input
                    className="input text-sm"
                    placeholder="Nom du client..."
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Statut paiement</label>
                  <select
                    className="input text-sm"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="payé">Payé</option>
                    <option value="en attente">En attente</option>
                  </select>
                </div>
              </div>
            )}

            {/* Total */}
            {cart.length > 0 && (
              <div className="border-t border-gray-100 pt-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-xl font-heading font-bold text-primary">
                    {subtotal.toLocaleString('fr-FR')}
                    <span className="text-xs font-normal text-gray-400 ml-1">FCFA</span>
                  </span>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">
                {error}
              </p>
            )}

            {/* Boutons action */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleSubmit(true)}
                disabled={loading || cart.length === 0}
                className="btn btn-primary justify-center py-2.5"
              >
                <FileText size={15} />
                {loading ? 'Traitement...' : 'Valider + Reçu PDF'}
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={loading || cart.length === 0}
                className="btn justify-center"
              >
                Valider sans reçu
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}