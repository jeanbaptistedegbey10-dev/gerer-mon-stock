import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useNotifications() {
  const { user, tenant } = useStore()
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)

  const fetch = useCallback(async () => {
    if (!tenant) return
    try {
      const { data } = await supabase
        .from('delivery_notifications')
        .select('*, deliveries(id, client_name, client_phone)')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(50)

      const notifs = data || []
      setNotifications(notifs)

      const unread = notifs.filter(n => {
        const readBy = Array.isArray(n.read_by) ? n.read_by : []
        return !readBy.includes(user?.id)
      }).length
      setUnreadCount(unread)
    } catch (err) {
      console.error('fetchNotifications error:', err)
    }
  }, [tenant, user])

  useEffect(() => { fetch() }, [fetch])

  // Realtime — avec gestion d'erreur propre
  useEffect(() => {
    if (!tenant) return

    let channel = null

    try {
      channel = supabase
        .channel(`notifs-${tenant.id}`)
        .on(
          'postgres_changes',
          {
            event:  'INSERT',
            schema: 'public',
            table:  'delivery_notifications',
            filter: `tenant_id=eq.${tenant.id}`,
          },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev])
            setUnreadCount(prev => prev + 1)
          }
        )

      // Vérifier si subscribe réussit avant d'appeler
      channel.subscribe((status, err) => {
        if (err) {
          console.warn('Realtime subscription warning:', err.message)
          // Pas critique — on désactive silencieusement le realtime
        }
      })
    } catch (err) {
      console.warn('Realtime non disponible:', err.message)
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch (e) {
          // Ignorer
        }
      }
    }
  }, [tenant])

  const markAsRead = async (notificationId) => {
    if (!user) return
    const notif = notifications.find(n => n.id === notificationId)
    if (!notif) return

    const readBy = Array.isArray(notif.read_by) ? notif.read_by : []
    if (readBy.includes(user.id)) return

    const newReadBy = [...readBy, user.id]
    try {
      await supabase
        .from('delivery_notifications')
        .update({ read_by: newReadBy })
        .eq('id', notificationId)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId
          ? { ...n, read_by: newReadBy } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('markAsRead error:', err)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return
    const unread = notifications.filter(n => {
      const readBy = Array.isArray(n.read_by) ? n.read_by : []
      return !readBy.includes(user.id)
    })
    for (const n of unread) await markAsRead(n.id)
  }

  const sendNotification = async ({ deliveryId, type, message }) => {
    if (!user || !tenant) return
    const { error } = await supabase
      .from('delivery_notifications')
      .insert({
        tenant_id:   tenant.id,
        delivery_id: deliveryId,
        driver_id:   user.id,
        driver_name: user.user_metadata?.full_name || user.email,
        type,
        message,
        read_by:     [],
      })
    if (error) throw error

    await supabase
      .from('deliveries')
      .update({
        notification_pending: true,
        notification_type:    type,
      })
      .eq('id', deliveryId)

    // Rafraîchir manuellement si realtime indisponible
    await fetch()
  }

  return {
    notifications, unreadCount,
    sendNotification, markAsRead, markAllAsRead,
    refresh: fetch,
  }
}