import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function usePurchases() {
  const { user }    = useStore()
  const [purchases, setPurchases] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

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
    const { error } = await supabase
      .from('purchases')
      .insert({ ...formData, user_id: user.id })
    if (error) throw error
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
    total:    purchases.length,
    transit:  purchases.filter(p => p.status === 'en transit').length,
    totalSpent: purchases
      .filter(p => p.status === 'reçu')
      .reduce((s, p) => s + (p.total || 0), 0),
  }

  return { purchases, loading, error, stats, createPurchase, updateStatus, refresh: fetch }
}