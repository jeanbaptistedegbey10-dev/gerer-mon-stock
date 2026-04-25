import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useDeliveries() {
  const { user }         = useStore()
  const [deliveries, setDeliveries] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetch = useCallback(async () => {
    if (!user) return
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeliveries(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  // ── Créer une livraison ───────────────────────────────────────────────────
  const createDelivery = async (formData) => {
    const { error } = await supabase
      .from('deliveries')
      .insert({ ...formData, user_id: user.id })
    if (error) throw error
    await fetch()
  }

  // ── Mettre à jour le statut ───────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('deliveries')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    setDeliveries(prev =>
      prev.map(d => d.id === id ? { ...d, status } : d)
    )
  }

  // ── Supprimer ─────────────────────────────────────────────────────────────
  const deleteDelivery = async (id) => {
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    setDeliveries(prev => prev.filter(d => d.id !== id))
  }

  // ── IDs des ventes déjà liées à une livraison ─────────────────────────────
  const usedSaleIds = deliveries
    .filter(d => d.sale_id)
    .map(d => d.sale_id)

  // ── Stats ─────────────────────────────────────────────────────────────────
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