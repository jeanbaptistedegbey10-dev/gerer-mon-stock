import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useProducts() {
  const { user } = useStore()
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  // ─── Create ───────────────────────────────────────────────────────────────
  const createProduct = async (formData) => {
    const { error } = await supabase
      .from('products')
      .insert({ ...formData, user_id: user.id })

    if (error) throw error

    // Log mouvement de stock initial
    if (formData.quantity > 0) {
      await supabase.from('stock_moves').insert({
        user_id:      user.id,
        product_id:   null, // on le mettra à jour après
        product_name: formData.name,
        type:         'entrée',
        quantity:     formData.quantity,
        reason:       'Stock initial',
      })
    }

    await fetch() // Refresh
  }

  // ─── Update ───────────────────────────────────────────────────────────────
  const updateProduct = async (id, formData) => {
    // Récupérer l'ancienne quantité pour logguer le mouvement
    const old = products.find(p => p.id === id)
    const diff = formData.quantity - (old?.quantity || 0)

    const { error } = await supabase
      .from('products')
      .update(formData)
      .eq('id', id)
      .eq('user_id', user.id) // sécurité

    if (error) throw error

    // Log si la quantité a changé
    if (diff !== 0) {
      await supabase.from('stock_moves').insert({
        user_id:      user.id,
        product_id:   id,
        product_name: formData.name,
        type:         diff > 0 ? 'entrée' : 'sortie',
        quantity:     Math.abs(diff),
        reason:       'Ajustement manuel',
      })
    }

    await fetch()
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  const deleteProduct = async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error
    // Optimistic update — retire immédiatement de l'UI sans attendre fetch()
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  // ─── Stats calculées ──────────────────────────────────────────────────────
  const stats = {
    total:        products.length,
    lowStock:     products.filter(p => p.quantity <= p.low_stock_threshold).length,
    totalValue:   products.reduce((s, p) => s + p.purchase_price * p.quantity, 0),
    totalRevenue: products.reduce((s, p) => s + p.sale_price * p.quantity, 0),
  }

  return {
    products,
    loading,
    error,
    stats,
    refresh: fetch,
    createProduct,
    updateProduct,
    deleteProduct,
  }
}