import { useState } from 'react'
import { useNavigate }   from 'react-router-dom'
import { useProducts }   from '../hooks/useProducts'
import { useSales }      from '../hooks/useSales'
import { generateReceipt } from '../utils/pdf'
import {
  Search, Plus, Minus, Trash2,
  ShoppingCart, FileText, ArrowLeft,
  User, Phone, Tag, Package
} from 'lucide-react'

export default function NewSale() {
  const navigate = useNavigate()
  const { products } = useProducts()
  const { createSale } = useSales()

  const [cart,         setCart]         = useState([])
  const [search,       setSearch]       = useState('')
  const [clientName,   setClientName]   = useState('')
  const [clientPhone,  setClientPhone]  = useState('')
  const [status,       setStatus]       = useState('payé')
  const [discountType, setDiscountType] = useState('amount') // 'amount' | 'percent'
  const [discountVal,  setDiscountVal]  = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')

  const filteredProducts = products.filter(p =>
    p.quantity > 0 &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     (p.category || '').toLowerCase().includes(search.toLowerCase()))
  )

  // ─── Panier ───────────────────────────────────────────────────────────────
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.quantity) return prev
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, {
        product,
        quantity:   1,
        unit_price: product.sale_price, // prix fixe, non modifiable
      }]
    })
  }

  const updateQty = (productId, delta) => {
    setCart(prev =>
      prev
        .map(i => i.product.id === productId
          ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    )
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(i => i.product.id !== productId))
  }

  // ─── Calculs ──────────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0)

  const discountAmount = (() => {
    const v = parseFloat(discountVal) || 0
    if (discountType === 'percent') return Math.round(subtotal * v / 100)
    return v
  })()

  const total = Math.max(subtotal - discountAmount, 0)

  // ─── Validation ───────────────────────────────────────────────────────────
  const handleSubmit = async (withPDF = false) => {
    if (cart.length === 0) return setError('Ajoutez au moins un produit.')
    setError('')
    setLoading(true)
    try {
      const sale = await createSale({
        cartItems:    cart,
        clientName,
        clientPhone,
        status,
        discount:     discountAmount,
        discountType,
        total,        // total après réduction
      })

      if (withPDF) {
        const pdfItems = cart.map(i => ({
          product_name: i.product.name,
          quantity:     i.quantity,
          unit_price:   i.unit_price,
          total:        i.unit_price * i.quantity,
        }))
        generateReceipt(
          { ...sale, total, client_name: clientName, client_phone: clientPhone },
          pdfItems,
          discountAmount
        )
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

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="btn p-2">
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

        {/* Catalogue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Rechercher un produit..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="card p-8 text-center text-gray-400 text-sm">
              <Package size={28} className="mx-auto mb-2 opacity-30" />
              Aucun produit disponible en stock.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map(p => {
                const inCart = cart.find(i => i.product.id === p.id)
                return (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className={`card p-4 text-left transition-all
                      hover:shadow-md hover:border-primary/30 active:scale-95
                      ${inCart ? 'border-primary/40 bg-primary/5' : ''}`}
                  >
                    {/* Image si disponible */}
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name}
                        className="w-full h-20 object-cover rounded-lg mb-2" />
                    ) : (
                      <div className="w-full h-20 bg-gray-100 rounded-lg mb-2
                                      flex items-center justify-center">
                        <Package size={20} className="text-gray-300" />
                      </div>
                    )}
                    {inCart && (
                      <span className="inline-block mb-1 px-2 py-0.5 bg-primary
                                       text-white text-xs rounded-full font-medium">
                        x{inCart.quantity} dans panier
                      </span>
                    )}
                    <p className="font-medium text-gray-900 text-sm leading-tight mb-1">
                      {p.name}
                    </p>
                    <p className="text-base font-semibold text-primary">
                      {p.sale_price.toLocaleString('fr-FR')}
                      <span className="text-xs text-gray-400 font-normal ml-1">FCFA</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Stock : {p.quantity}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panier */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-6">

            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={16} className="text-primary" />
              <h2 className="font-heading font-semibold text-gray-900">Panier</h2>
              {itemCount > 0 && (
                <span className="ml-auto pill pill-blue">
                  {itemCount} art.
                </span>
              )}
            </div>

            {cart.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-sm">
                <ShoppingCart size={28} className="mx-auto mb-2 opacity-30" />
                Cliquez sur un produit
              </div>
            )}

            {/* Items — prix non modifiable */}
            <div className="space-y-3 mb-4">
              {cart.map(item => (
                <div key={item.product.id}
                  className="flex flex-col gap-1.5 pb-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 flex-1 leading-tight">
                      {item.product.name}
                    </p>
                    <button onClick={() => removeFromCart(item.product.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Contrôle quantité */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.product.id, -1)}
                        className="w-6 h-6 rounded border border-gray-200
                                   flex items-center justify-center
                                   hover:bg-gray-100 transition-colors">
                        <Minus size={11} />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">
                        {item.quantity}
                      </span>
                      <button onClick={() => updateQty(item.product.id, 1)}
                        disabled={item.quantity >= item.product.quantity}
                        className="w-6 h-6 rounded border border-gray-200
                                   flex items-center justify-center
                                   hover:bg-gray-100 transition-colors
                                   disabled:opacity-30">
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Prix — lecture seule */}
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {(item.unit_price * item.quantity).toLocaleString('fr-FR')}
                        <span className="text-xs text-gray-400 ml-1">FCFA</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.unit_price.toLocaleString('fr-FR')} / u
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="space-y-3 mb-4 pt-2 border-t border-gray-100">

                {/* Client */}
                <div>
                  <label className="label flex items-center gap-1">
                    <User size={11} /> Nom client
                  </label>
                  <input className="input text-sm" placeholder="Nom du client..."
                    value={clientName} onChange={e => setClientName(e.target.value)} />
                </div>

                {/* Téléphone */}
                <div>
                  <label className="label flex items-center gap-1">
                    <Phone size={11} /> Téléphone client
                  </label>
                  <input className="input text-sm" placeholder="+228 90 00 00 00"
                    type="tel"
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)} />
                </div>

                {/* Réduction */}
                <div>
                  <label className="label flex items-center gap-1">
                    <Tag size={11} /> Réduction
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="input text-sm w-28 flex-shrink-0"
                      value={discountType}
                      onChange={e => {
                        setDiscountType(e.target.value)
                        setDiscountVal('')
                      }}
                    >
                      <option value="amount">FCFA</option>
                      <option value="percent">%</option>
                    </select>
                    <input
                      type="number" min="0"
                      className="input text-sm"
                      placeholder={discountType === 'percent' ? 'Ex: 10' : 'Ex: 5000'}
                      value={discountVal}
                      onChange={e => setDiscountVal(e.target.value)}
                    />
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      − {discountAmount.toLocaleString('fr-FR')} FCFA de réduction
                    </p>
                  )}
                </div>

                {/* Statut */}
                <div>
                  <label className="label">Statut paiement</label>
                  <select className="input text-sm" value={status}
                    onChange={e => setStatus(e.target.value)}>
                    <option value="payé">Payé</option>
                    <option value="en attente">En attente</option>
                  </select>
                </div>
              </div>
            )}

            {/* Totaux */}
            {cart.length > 0 && (
              <div className="border-t border-gray-100 pt-3 mb-4 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Sous-total</span>
                  <span>{subtotal.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Réduction</span>
                    <span>− {discountAmount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1
                                border-t border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Total</span>
                  <span className="text-xl font-heading font-bold text-primary">
                    {total.toLocaleString('fr-FR')}
                    <span className="text-xs font-normal text-gray-400 ml-1">FCFA</span>
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2
                            rounded-lg mb-3">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <button onClick={() => handleSubmit(true)}
                disabled={loading || cart.length === 0}
                className="btn btn-primary justify-center py-2.5">
                <FileText size={15} />
                {loading ? 'Traitement...' : 'Valider + Reçu PDF'}
              </button>
              <button onClick={() => handleSubmit(false)}
                disabled={loading || cart.length === 0}
                className="btn justify-center">
                Valider sans reçu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}