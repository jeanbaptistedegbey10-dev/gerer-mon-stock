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
      // ── Charger les données des 7 derniers jours ──────────────────────────
      const since7 = new Date()
      since7.setDate(since7.getDate() - 6)
      since7.setHours(0, 0, 0, 0)

      const [salesRes, productsRes, purchasesRes] = await Promise.all([
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
          .from('purchases')
          .select('cout_unitaire_reel, product_id, quantity_received')
          .eq('user_id', user.id)
          .eq('status', 'reçu'),
      ])

      const sales     = salesRes.data     || []
      const products  = productsRes.data  || []
      const purchases = purchasesRes.data || []

      // ── Marge moyenne réelle basée sur les produits ───────────────────────
      // Priorité : coût réel d'achat depuis les achats enregistrés
      // Fallback : prix d'achat de la fiche produit
      const margeProduit = (product) => {
        // Cherche le dernier achat avec coût réel pour ce produit
        const achats = purchases.filter(p => p.product_id === product.id)

        if (achats.length > 0) {
          // Moyenne pondérée des coûts réels
          const totalQty  = achats.reduce((s, a) => s + (a.quantity_received || 0), 0)
          const totalCout = achats.reduce((s, a) =>
            s + (a.cout_unitaire_reel || 0) * (a.quantity_received || 0), 0)
          const coutMoyen = totalQty > 0 ? totalCout / totalQty : product.purchase_price

          return product.sale_price > 0
            ? (product.sale_price - coutMoyen) / product.sale_price
            : 0
        }

        // Fallback sur le prix d'achat de la fiche produit
        return product.purchase_price > 0 && product.sale_price > 0
          ? (product.sale_price - product.purchase_price) / product.sale_price
          : 0
      }

      // Marge moyenne sur tous les produits
      const margemoyenne = products.length > 0
        ? products.reduce((s, p) => s + margeProduit(p), 0) / products.length
        : 0.25 // fallback 25% si aucun produit

      // ── Données graphique 7 jours ─────────────────────────────────────────
      const chartData = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toDateString()
        const label   = i === 0
          ? "Auj."
          : d.toLocaleDateString('fr-FR', { weekday: 'short' })

        const daySales = sales.filter(s =>
          new Date(s.created_at).toDateString() === dateStr
        )

        const ventes    = daySales.reduce((s, v) => s + (v.total || 0), 0)
        const benefices = Math.round(ventes * margemoyenne)

        chartData.push({ label, ventes, benefices })
      }

      // ── KPIs du jour ──────────────────────────────────────────────────────
      const today      = new Date().toDateString()
      const todaySales = sales.filter(s =>
        new Date(s.created_at).toDateString() === today
      )

      const todayCA    = todaySales.reduce((s, v) => s + (v.total || 0), 0)
      const todayBenef = Math.round(todayCA * margemoyenne)

      // ── Alertes stock faible ──────────────────────────────────────────────
      const lowStock = products.filter(p =>
        p.quantity <= p.low_stock_threshold
      )

      const totalStock = products.reduce((s, p) => s + (p.quantity || 0), 0)

      // ── Valeur du stock (au coût réel) ────────────────────────────────────
      const valeurStock = products.reduce((s, p) => {
        const achats   = purchases.filter(a => a.product_id === p.id)
        const coutUnit = achats.length > 0
          ? achats[achats.length - 1].cout_unitaire_reel || p.purchase_price
          : p.purchase_price
        return s + coutUnit * (p.quantity || 0)
      }, 0)

      // ── Ventes récentes (5 dernières) ─────────────────────────────────────
      const recentSales = [...sales]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)

      // ── Stats marge pour affichage ────────────────────────────────────────
      const margeAffichee = Math.round(margemoyenne * 100)

      setData({
        chartData,
        kpis: {
          todayCA,
          todayBenef,
          todaySalesCount: todaySales.length,
          totalStock,
          valeurStock,
          lowStockCount:   lowStock.length,
          lowStockItems:   lowStock.slice(0, 3),
          margeAffichee,
        },
        recentSales,
      })

    } catch (err) {
      console.error('useStats error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refresh: fetch }
}