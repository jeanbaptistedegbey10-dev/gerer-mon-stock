import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function usePurchases() {
  const { user, tenant }  = useStore()
  const [purchases,   setPurchases] = useState([])
  const [loading,     setLoading]   = useState(true)
  const [error,       setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('tenant_id', tenant.id)          // ← tenant_id
        .order('created_at', { ascending: false })
      if (error) throw error
      setPurchases(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => { fetch() }, [fetch])

  const createPurchase = async (formData) => {
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        ...formData,
        tenant_id: tenant.id,                // ← tenant_id
        user_id:   user.id,
      })
      .select()
      .single()
    if (error) throw error

    // Incrémenter le stock si statut = reçu
    if (formData.status === 'reçu') {
      const { data: product } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', formData.product_id)
        .single()

      await supabase
        .from('products')
        .update({ quantity: (product?.quantity || 0) + formData.quantity_received })
        .eq('id', formData.product_id)

      await supabase.from('stock_moves').insert({
        tenant_id:    tenant.id,             // ← tenant_id
        user_id:      user.id,
        product_id:   formData.product_id,
        product_name: formData.product_name,
        type:         'entrée',
        quantity:     formData.quantity_received,
        reason:       `Achat — ${formData.supplier}`,
      })
    }

    await fetch()
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('purchases')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenant.id)            // ← tenant_id
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