import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useTeam() {
  const { user }    = useStore()
  const [members,   setMembers]  = useState([])
  const [loading,   setLoading]  = useState(true)
  const [error,     setError]    = useState(null)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('owner_id', user.id)
        .order('invited_at', { ascending: false })
      if (error) throw error
      setMembers(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  // ── Inviter un membre ─────────────────────────────────────────────────────
  const inviteMember = async ({ email, fullName, role }) => {
    // Vérifier si déjà invité
    const exists = members.find(m =>
      m.email.toLowerCase() === email.toLowerCase()
    )
    if (exists) throw new Error('Cet email est déjà dans votre équipe.')

    const { error } = await supabase
      .from('team_members')
      .insert({
        owner_id:  user.id,
        email:     email.toLowerCase().trim(),
        full_name: fullName.trim(),
        role,
        status:    'pending',
      })
    if (error) throw error
    await fetch()
  }

  // ── Changer le rôle ───────────────────────────────────────────────────────
  const updateRole = async (id, role) => {
    const { error } = await supabase
      .from('team_members')
      .update({ role })
      .eq('id', id)
      .eq('owner_id', user.id)
    if (error) throw error
    setMembers(prev =>
      prev.map(m => m.id === id ? { ...m, role } : m)
    )
  }

  // ── Activer / Désactiver ──────────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('team_members')
      .update({ status })
      .eq('id', id)
      .eq('owner_id', user.id)
    if (error) throw error
    setMembers(prev =>
      prev.map(m => m.id === id ? { ...m, status } : m)
    )
  }

  // ── Supprimer ─────────────────────────────────────────────────────────────
  const removeMember = async (id) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)
    if (error) throw error
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:    members.length,
    active:   members.filter(m => m.status === 'active').length,
    pending:  members.filter(m => m.status === 'pending').length,
    disabled: members.filter(m => m.status === 'disabled').length,
  }

  return {
    members, loading, error, stats,
    inviteMember, updateRole, updateStatus, removeMember,
    refresh: fetch,
  }
}