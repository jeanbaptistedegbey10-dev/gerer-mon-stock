import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useSuperAdmin() {
  const { isSuperAdmin }  = useStore()
  const [tenants,  setTenants]  = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetchTenants = useCallback(async () => {
    if (!isSuperAdmin) return
    setLoading(true)
    try {
      // Charger tous les tenants avec leurs membres
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_members (
            id, role, status, email, full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTenants(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isSuperAdmin])

  const fetchStats = useCallback(async () => {
    if (!isSuperAdmin) return
    try {
      const { data, error } = await supabase
        .rpc('get_global_stats')
      if (error) throw error
      setStats(typeof data === 'string' ? JSON.parse(data) : data)
    } catch (err) {
      console.error('fetchStats error:', err)
    }
  }, [isSuperAdmin])

  useEffect(() => {
    fetchTenants()
    fetchStats()
  }, [fetchTenants, fetchStats])

  // ── Changer le plan d'un tenant ───────────────────────────────────────────
  const updateTenantPlan = async (tenantId, plan) => {
    const limits = {
      free:       { max_users: 2,    max_products: 50   },
      pro:        { max_users: 10,   max_products: 500  },
      enterprise: { max_users: null, max_products: null },
    }

    const { error } = await supabase
      .from('tenants')
      .update({
        plan,
        max_users:    limits[plan].max_users,
        max_products: limits[plan].max_products,
      })
      .eq('id', tenantId)

    if (error) throw error
    await fetchTenants()
  }

  // ── Activer / Bloquer un tenant ───────────────────────────────────────────
  const toggleTenant = async (tenantId, active) => {
    const { error } = await supabase
      .from('tenants')
      .update({ active })
      .eq('id', tenantId)
    if (error) throw error
    setTenants(prev =>
      prev.map(t => t.id === tenantId ? { ...t, active } : t)
    )
  }

  // ── Supprimer un tenant ───────────────────────────────────────────────────
  const deleteTenant = async (tenantId) => {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenantId)
    if (error) throw error
    setTenants(prev => prev.filter(t => t.id !== tenantId))
    await fetchStats()
  }

  // ── Mettre à jour les limites custom ─────────────────────────────────────
  const updateLimits = async (tenantId, { maxUsers, maxProducts }) => {
    const { error } = await supabase
      .from('tenants')
      .update({
        max_users:    maxUsers    ? parseInt(maxUsers)    : null,
        max_products: maxProducts ? parseInt(maxProducts) : null,
      })
      .eq('id', tenantId)
    if (error) throw error
    await fetchTenants()
  }

  return {
    tenants, stats, loading, error,
    updateTenantPlan, toggleTenant,
    deleteTenant, updateLimits,
    refresh: () => { fetchTenants(); fetchStats() },
  }
}