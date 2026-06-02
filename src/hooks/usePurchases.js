import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function usePurchases() {
  const { user, tenant }  = useStore()
  const [purchases, setPurchases] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const fetch = useCallback(async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('tenant_id', tenant.id)
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

  // ── Créer un achat ────────────────────────────────────────────────────────
  const createPurchase = async (formData) => {
    const { data, error } = await supabase
      .from('purchases')
      .insert({
        ...formData,
        tenant_id:  tenant.id,
        user_id:    user.id,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) throw error

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
        tenant_id:    tenant.id,
        user_id:      user.id,
        created_by:   user.id,
        product_id:   formData.product_id,
        product_name: formData.product_name,
        type:         'entrée',
        quantity:     formData.quantity_received,
        reason:       `Achat — ${formData.supplier}`,
      })
    }

    await fetch()
  }

  // ── Modifier un achat ─────────────────────────────────────────────────────
  const updatePurchase = async (id, formData) => {
    const old = purchases.find(p => p.id === id)

    const { error } = await supabase
      .from('purchases')
      .update({ ...formData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant.id)
    if (error) throw error

    // Si quantité reçue a changé et statut = reçu → ajuster stock
    if (
      old &&
      formData.status === 'reçu' &&
      formData.quantity_received !== old.quantity_received
    ) {
      const diff = formData.quantity_received - (old.quantity_received || 0)
      if (diff !== 0) {
        const { data: product } = await supabase
          .from('products')
          .select('quantity')
          .eq('id', formData.product_id)
          .maybeSingle()

        if (product) {
          await supabase
            .from('products')
            .update({ quantity: Math.max(0, product.quantity + diff) })
            .eq('id', formData.product_id)

          await supabase.from('stock_moves').insert({
            tenant_id:    tenant.id,
            user_id:      user.id,
            product_id:   formData.product_id,
            product_name: formData.product_name,
            type:         diff > 0 ? 'entrée' : 'sortie',
            quantity:     Math.abs(diff),
            reason:       `Modification achat`,
          })
        }
      }
    }

    await fetch()
  }

  // ── Supprimer un achat ────────────────────────────────────────────────────
  const deletePurchase = async (id) => {
    const purchase = purchases.find(p => p.id === id)

    // Si l'achat était reçu → décrémenter le stock
    if (purchase?.status === 'reçu' && purchase.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', purchase.product_id)
        .maybeSingle()

      if (product) {
        await supabase
          .from('products')
          .update({
            quantity: Math.max(0, product.quantity - (purchase.quantity_received || 0))
          })
          .eq('id', purchase.product_id)

        await supabase.from('stock_moves').insert({
          tenant_id:    tenant.id,
          user_id:      user.id,
          product_id:   purchase.product_id,
          product_name: purchase.product_name,
          type:         'sortie',
          quantity:     purchase.quantity_received || 0,
          reason:       `Suppression achat`,
        })
      }
    }

    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.id)
    if (error) throw error
    setPurchases(prev => prev.filter(p => p.id !== id))
  }

  // ── Changer statut ────────────────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('purchases')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenant.id)
    if (error) throw error
    setPurchases(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const stats = {
    total:      purchases.length,
    transit:    purchases.filter(p => p.status === 'en transit').length,
    totalSpent: purchases
      .filter(p => p.status === 'reçu')
      .reduce((s, p) => s + (p.total || 0), 0),
  }

  return {
    purchases, loading, error, stats,
    createPurchase, updatePurchase, deletePurchase, updateStatus,
    refresh: fetch,
  }
}