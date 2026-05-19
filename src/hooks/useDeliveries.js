import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { sendWhatsApp, composeDeliveryMessage } from '../utils/whatsapp'

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
        .eq('tenant_id', tenant.id)
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

  // ── Créer une livraison ───────────────────────────────────────────────────
  const createDelivery = async (formData) => {
    // 1. Récupérer driver_user_id + infos WhatsApp depuis delivery_drivers
    let driverUserId   = null
    let driverWhatsApp = null

    if (formData.driver_id) {
      const { data: driverData } = await supabase
        .from('delivery_drivers')
        .select('member_user_id, whatsapp_phone, whatsapp_api_key, name')
        .eq('id', formData.driver_id)
        .maybeSingle()

      if (driverData) {
        driverUserId   = driverData.member_user_id || null
        driverWhatsApp = driverData
      }
    }

    // 2. Créer la livraison avec driver_user_id
    const { error } = await supabase
      .from('deliveries')
      .insert({
        ...formData,
        tenant_id:      tenant.id,
        user_id:        user.id,
        created_by:     user.id,
        driver_user_id: driverUserId,
      })

    if (error) throw error

    // 3. Envoyer WhatsApp si CallMeBot configuré
    if (
      driverWhatsApp?.whatsapp_phone &&
      driverWhatsApp?.whatsapp_api_key
    ) {
      try {
        const appUrl = window.location.origin
        const message = composeDeliveryMessage({
          driverName:    formData.driver_name || driverWhatsApp.name,
          clientName:    formData.client_name,
          clientPhone:   formData.client_phone,
          clientAddress: formData.client_address,
          deliveryFee:   formData.delivery_fee,
          notes:         formData.notes,
          appUrl,
        })

        // Non bloquant — envoie en arrière-plan
        sendWhatsApp({
          phone:  driverWhatsApp.whatsapp_phone,
          apiKey: driverWhatsApp.whatsapp_api_key,
          message,
        }).then(ok => {
          if (ok) {
            console.log('✅ WhatsApp envoyé au livreur')
          } else {
            console.warn('⚠ WhatsApp non envoyé — vérifiez la config CallMeBot')
          }
        })
      } catch (waErr) {
        // Ne pas bloquer la création si WhatsApp échoue
        console.error('WhatsApp error:', waErr)
      }
    }

    await fetch()
  }

  // ── Mettre à jour le statut ───────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('deliveries')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenant.id)

    if (error) throw error

    // Optimistic update
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
      .eq('tenant_id', tenant.id)

    if (error) throw error
    setDeliveries(prev => prev.filter(d => d.id !== id))
  }

  // ── IDs des ventes déjà liées ─────────────────────────────────────────────
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