import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function usePurchases() {
  const { user }      = useStore()
  const [purchases,   setPurchases] = useState([])
  const [loading,     setLoading]   = useState(true)
  const [error,       setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setPurchases(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const createPurchase = async (formData) => {
    // 1. Enregistrer l'achat
    const { data, error } = await supabase
      .from('purchases')
      .insert({ ...formData, user_id: user.id })
      .select()
      .single()
    if (error) throw error

    // 2. Incrémenter le stock du produit
    const { data: product } = await supabase
      .from('products')
      .select('quantity')
      .eq('id', formData.product_id)
      .single()

    await supabase
      .from('products')
      .update({ quantity: (product?.quantity || 0) + formData.quantity_received })
      .eq('id', formData.product_id)

    // 3. Log mouvement stock
    await supabase.from('stock_moves').insert({
      user_id:      user.id,
      product_id:   formData.product_id,
      product_name: formData.product_name,
      type:         'entrée',
      quantity:     formData.quantity_received,
      reason:       `Achat — ${formData.supplier}`,
    })

    await fetch()
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('purchases')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    setPurchases(prev =>
      prev.map(p => p.id === id ? { ...p, status } : p)
    )
  }

  const stats = {
    total:       purchases.length,
    transit:     purchases.filter(p => p.status === 'en transit').length,
    totalSpent:  purchases
      .filter(p => p.status === 'reçu')
      .reduce((s, p) => s + (p.total || 0), 0),
  }

  return {
    purchases, loading, error, stats,
    createPurchase, updateStatus, refresh: fetch,
  }
}