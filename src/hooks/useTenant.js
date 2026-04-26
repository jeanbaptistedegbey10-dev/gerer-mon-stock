import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useTenant() {
  const { user }    = useStore()
  const [tenant,    setTenant]   = useState(null)
  const [myRole,    setMyRole]   = useState(null)
  const [loading,   setLoading]  = useState(true)
  const [error,     setError]    = useState(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Chercher si l'user est membre d'un tenant
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('*, tenants(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (membership) {
        setTenant(membership.tenants)
        setMyRole(membership.role)
        return
      }

      // Sinon chercher si c'est un owner
      const { data: ownedTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (ownedTenant) {
        setTenant(ownedTenant)
        setMyRole('admin')
        return
      }

      // Pas de tenant → doit en créer un
      setTenant(null)
      setMyRole(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  // ── Créer un nouveau tenant (à l'inscription) ─────────────────────────────
  const createTenant = async (name) => {
    if (!user) throw new Error('Non connecté')

    // 1. Créer le tenant
    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name:         name.trim(),
        owner_id:     user.id,
        plan:         'free',
        max_users:    2,
        max_products: 50,
      })
      .select()
      .single()

    if (tenantError) throw tenantError

    // 2. Ajouter le owner comme Admin actif
    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: newTenant.id,
        user_id:   user.id,
        email:     user.email,
        full_name: user.user_metadata?.full_name || '',
        role:      'admin',
        status:    'active',
        joined_at: new Date().toISOString(),
      })

    if (memberError) throw memberError

    setTenant(newTenant)
    setMyRole('admin')
    return newTenant
  }

  // ── Rejoindre un tenant existant (employé invité) ─────────────────────────
  const joinTenant = async () => {
    if (!user) throw new Error('Non connecté')

    // Chercher une invitation en attente pour cet email
    const { data: invitation } = await supabase
      .from('tenant_members')
      .select('*, tenants(*)')
      .eq('email', user.email.toLowerCase())
      .eq('status', 'pending')
      .single()

    if (!invitation) return null

    // Accepter l'invitation
    const { error } = await supabase
      .from('tenant_members')
      .update({
        user_id:   user.id,
        status:    'active',
        joined_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    if (error) throw error

    setTenant(invitation.tenants)
    setMyRole(invitation.role)
    return invitation.tenants
  }

  // ── Mettre à jour le tenant ───────────────────────────────────────────────
  const updateTenant = async (data) => {
    if (!tenant) return
    const { error } = await supabase
      .from('tenants')
      .update(data)
      .eq('id', tenant.id)
    if (error) throw error
    setTenant(prev => ({ ...prev, ...data }))
  }

  return {
    tenant, myRole, loading, error,
    createTenant, joinTenant, updateTenant,
    refresh: fetch,
  }
}