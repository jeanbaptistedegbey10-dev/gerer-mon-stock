import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useDrivers() {
  const { user }     = useStore()
  const [drivers,    setDrivers]  = useState([])
  const [rates,      setRates]    = useState([])
  const [loading,    setLoading]  = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [driversRes, ratesRes] = await Promise.all([
        supabase
          .from('delivery_drivers')
          .select('*')
          .eq('user_id', user.id)
          .eq('active', true)
          .order('name'),
        supabase
          .from('delivery_rates')
          .select('*')
          .eq('user_id', user.id)
          .order('min_km'),
      ])
      setDrivers(driversRes.data || [])
      setRates(ratesRes.data   || [])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  // ── CRUD Livreurs ─────────────────────────────────────────────────────────
  const createDriver = async (data) => {
    const { error } = await supabase
      .from('delivery_drivers')
      .insert({ ...data, user_id: user.id })
    if (error) throw error
    await fetch()
  }

  const updateDriver = async (id, data) => {
    const { error } = await supabase
      .from('delivery_drivers')
      .update(data)
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    await fetch()
  }

  const deleteDriver = async (id) => {
    const { error } = await supabase
      .from('delivery_drivers')
      .update({ active: false })   // soft delete
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    setDrivers(prev => prev.filter(d => d.id !== id))
  }

  // ── CRUD Tarifs ───────────────────────────────────────────────────────────
  const createRate = async (data) => {
    const { error } = await supabase
      .from('delivery_rates')
      .insert({ ...data, user_id: user.id })
    if (error) throw error
    await fetch()
  }

  const deleteRate = async (id) => {
    const { error } = await supabase
      .from('delivery_rates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) throw error
    setRates(prev => prev.filter(r => r.id !== id))
  }

  // ── Calcul tarif selon distance ───────────────────────────────────────────
  const getFeeForDistance = (km) => {
    if (!km || rates.length === 0) return 0
    const rate = rates.find(r => km >= r.min_km && km <= r.max_km)
    return rate ? rate.price : null   // null = hors zone configurée
  }

  return {
    drivers, rates, loading,
    createDriver, updateDriver, deleteDriver,
    createRate, deleteRate,
    getFeeForDistance,
    refresh: fetch,
  }
}