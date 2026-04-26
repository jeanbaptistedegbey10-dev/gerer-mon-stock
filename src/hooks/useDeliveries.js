import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useDeliveries() {
  const { user, tenant } = useStore()
  const [deliveries, setDeliveries] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetch = useCallback(async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          sales (
            id, total, client_name,
            sale_items ( product_name, quantity )
          )
        `)
        .eq('tenant_id', tenant.id)          // ← tenant_id
        .order('created_at', { ascending: false })
      if (error) throw error
      setDeliveries(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => { fetch() }, [fetch])

  const createDelivery = async (formData) => {
    const { error } = await supabase
      .from('deliveries')
      .insert({
        ...formData,
        tenant_id: tenant.id,                // ← tenant_id
        user_id:   user.id,
      })
    if (error) throw error
    await fetch()
  }

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('deliveries')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenant.id)            // ← tenant_id
    if (error) throw error
    setDeliveries(prev =>
      prev.map(d => d.id === id ? { ...d, status } : d)
    )
  }

  const deleteDelivery = async (id) => {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.id)            // ← tenant_id
    if (error) throw error
    setDeliveries(prev => prev.filter(d => d.id !== id))
  }

  const usedSaleIds = deliveries
    .filter(d => d.sale_id)
    .map(d => d.sale_id)

  const stats = {
    total:      deliveries.length,
    enAttente:  deliveries.filter(d => d.status === 'en attente').length,
    enCours:    deliveries.filter(d => d.status === 'en cours').length,
    livrees:    deliveries.filter(d => d.status === 'livré').length,
    annulees:   deliveries.filter(d => d.status === 'annulé').length,
    totalFrais: deliveries
      .filter(d => d.status === 'livré')
      .reduce((s, d) => s + (d.delivery_fee || 0), 0),
  }

  return {
    deliveries, loading, error, stats, usedSaleIds,
    createDelivery, updateStatus, deleteDelivery,
    refresh: fetch,
  }
}