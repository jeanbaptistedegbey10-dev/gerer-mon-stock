import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useSettings() {
  const { user, tenant, setTenant } = useStore()
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)

  // ── Mettre à jour la boutique ─────────────────────────────────────────────
  const updateShop = async (data) => {
    if (!tenant) return
    setSaving(true)
    try {
      const { data: updated, error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', tenant.id)
        .select()
        .single()
      if (error) throw error
      setTenant(updated)
      return updated
    } finally {
      setSaving(false)
    }
  }

  // ── Uploader le logo ──────────────────────────────────────────────────────
  const uploadLogo = async (file) => {
    if (!tenant) return null
    const ext  = file.name.split('.').pop()
    const path = `${tenant.id}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('logos')
      .getPublicUrl(path)

    // Forcer le rechargement en ajoutant un timestamp
    const logoUrl = `${data.publicUrl}?t=${Date.now()}`

    await updateShop({ logo_url: logoUrl })
    return logoUrl
  }

  // ── Mettre à jour le profil utilisateur ───────────────────────────────────
  const updateProfile = async ({ fullName }) => {
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      })
      if (error) throw error
    } finally {
      setSaving(false)
    }
  }

  // ── Changer le mot de passe ───────────────────────────────────────────────
  const updatePassword = async ({ currentPassword, newPassword }) => {
    setSaving(true)
    try {
      // Vérifier l'ancien mot de passe
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    user.email,
        password: currentPassword,
      })
      if (signInError) throw new Error('Mot de passe actuel incorrect.')

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error
    } finally {
      setSaving(false)
    }
  }

  return {
    loading, saving,
    updateShop, uploadLogo,
    updateProfile, updatePassword,
  }
}