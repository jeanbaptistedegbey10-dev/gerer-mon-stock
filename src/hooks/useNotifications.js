import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useNotifications() {
  const { user, tenant } = useStore()
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)

  const fetch = useCallback(async () => {
    if (!tenant) return
    const { data } = await supabase
      .from('delivery_notifications')
      .select('*, deliveries(id, client_name, client_phone)')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const notifs = data || []
    setNotifications(notifs)

    // Compter les non-lues pour cet user
    const unread = notifs.filter(n => {
      const readBy = Array.isArray(n.read_by) ? n.read_by : []
      return !readBy.includes(user?.id)
    }).length
    setUnreadCount(unread)
  }, [tenant, user])

  useEffect(() => { fetch() }, [fetch])

  // Realtime — écouter les nouvelles notifications
  useEffect(() => {
    if (!tenant) return

    const channel = supabase
      .channel(`notifications-${tenant.id}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'delivery_notifications',
        filter: `tenant_id=eq.${tenant.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tenant])

  // Marquer comme lue
  const markAsRead = async (notificationId) => {
    if (!user) return
    const notif = notifications.find(n => n.id === notificationId)
    if (!notif) return

    const readBy = Array.isArray(notif.read_by) ? notif.read_by : []
    if (readBy.includes(user.id)) return

    const newReadBy = [...readBy, user.id]
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
  }

  // Marquer tout comme lu
  const markAllAsRead = async () => {
    if (!user) return
    const unread = notifications.filter(n => {
      const readBy = Array.isArray(n.read_by) ? n.read_by : []
      return !readBy.includes(user.id)
    })
    for (const n of unread) await markAsRead(n.id)
  }

  // Envoyer une notification (livreur)
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

    // Mettre à jour notification_pending sur la livraison
    await supabase
      .from('deliveries')
      .update({
        notification_pending: true,
        notification_type:    type,
      })
      .eq('id', deliveryId)
  }

  return {
    notifications, unreadCount,
    sendNotification, markAsRead, markAllAsRead,
    refresh: fetch,
  }
}