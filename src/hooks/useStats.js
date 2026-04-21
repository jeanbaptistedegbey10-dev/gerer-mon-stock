import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useStats() {
  const { user } = useStore()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      // Charger les ventes des 7 derniers jours
      const since7 = new Date()
      since7.setDate(since7.getDate() - 6)
      since7.setHours(0, 0, 0, 0)

      const [salesRes, productsRes, movesRes] = await Promise.all([
        supabase
          .from('sales')
          .select('id, total, status, created_at')
          .eq('user_id', user.id)
          .gte('created_at', since7.toISOString())
          .order('created_at'),
        supabase
          .from('products')
          .select('id, name, quantity, low_stock_threshold, purchase_price, sale_price')
          .eq('user_id', user.id),
        supabase
          .from('stock_moves')
          .select('type, quantity, created_at')
          .eq('user_id', user.id)
          .gte('created_at', since7.toISOString()),
      ])

      const sales    = salesRes.data    || []
      const products = productsRes.data || []
      const moves    = movesRes.data    || []

      // ── Construire les données du graphique (7 jours) ─────────────────────
      const chartData = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toLocaleDateString('fr-FR', {
          weekday: i === 0 ? undefined : 'short',
          day:     i === 0 ? '2-digit' : undefined,
        })
        const label = i === 0 ? "Auj." : d.toLocaleDateString('fr-FR', { weekday: 'short' })
        const dateStr = d.toDateString()

        const daySales = sales.filter(s =>
          new Date(s.created_at).toDateString() === dateStr
        )
        const ventes    = daySales.reduce((s, v) => s + v.total, 0)
        // Bénéfice estimé à 25% (à affiner avec vos vrais coûts)
        const benefices = Math.round(ventes * 0.25)

        chartData.push({ label, ventes, benefices })
      }

      // ── KPIs du jour ──────────────────────────────────────────────────────
      const today     = new Date().toDateString()
      const todaySales = sales.filter(s =>
        new Date(s.created_at).toDateString() === today
      )
      const todayCA      = todaySales.reduce((s, v) => s + v.total, 0)
      const todayBenef   = Math.round(todayCA * 0.25)
      const lowStock     = products.filter(p => p.quantity <= p.low_stock_threshold)
      const totalStock   = products.reduce((s, p) => s + p.quantity, 0)

      setData({
        chartData,
        kpis: {
          todayCA,
          todayBenef,
          todaySalesCount: todaySales.length,
          totalStock,
          lowStockCount:   lowStock.length,
          lowStockItems:   lowStock.slice(0, 3),
        },
        recentSales: sales.slice(-5).reverse(),
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refresh: fetch }
}