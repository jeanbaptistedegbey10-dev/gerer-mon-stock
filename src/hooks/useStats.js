import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useStats() {
  const { tenant } = useStore()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const since7 = new Date()
      since7.setDate(since7.getDate() - 6)
      since7.setHours(0, 0, 0, 0)

      const [salesRes, productsRes, purchasesRes, saleItemsRes] =
        await Promise.all([
          supabase
            .from('sales')
            .select('id, total, status, created_at')
            .eq('tenant_id', tenant.id)
            .gte('created_at', since7.toISOString())
            .order('created_at'),

          supabase
            .from('products')
            .select('id, name, quantity, low_stock_threshold, purchase_price, sale_price')
            .eq('tenant_id', tenant.id),

          // Tous les achats reçus avec coût unitaire réel
          supabase
            .from('purchases')
            .select('product_id, product_name, quantity_received, cout_unitaire_reel, created_at')
            .eq('tenant_id', tenant.id)
            .eq('status', 'reçu')
            .order('created_at', { ascending: false }),

          // Sale items des 7 derniers jours pour calcul bénéfice précis
          supabase
            .from('sale_items')
            .select('product_id, product_name, quantity, unit_price, total, sale_id')
            .in(
              'sale_id',
              (await supabase
                .from('sales')
                .select('id')
                .eq('tenant_id', tenant.id)
                .gte('created_at', since7.toISOString())
              ).data?.map(s => s.id) || []
            ),
        ])

      const sales     = salesRes.data     || []
      const products  = productsRes.data  || []
      const purchases = purchasesRes.data || []
      const saleItems = saleItemsRes.data || []

      // ── Coût unitaire réel par produit ───────────────────────────────────
      // On prend le dernier achat reçu pour chaque produit
      // Si pas d'achat → on utilise le prix d'achat de la fiche produit
      const coutUnitaireParProduit = {}

      purchases.forEach(p => {
        if (
          p.product_id &&
          p.cout_unitaire_reel &&
          !coutUnitaireParProduit[p.product_id]
        ) {
          // Le premier trouvé est le plus récent (ORDER BY created_at DESC)
          coutUnitaireParProduit[p.product_id] = p.cout_unitaire_reel
        }
      })

      // Fallback sur prix d'achat fiche produit
      products.forEach(p => {
        if (!coutUnitaireParProduit[p.id]) {
          coutUnitaireParProduit[p.id] = p.purchase_price || 0
        }
      })

      // ── Calcul bénéfice réel par sale_item ───────────────────────────────
      const getBeneficeReel = (saleItemsList) => {
        return saleItemsList.reduce((total, item) => {
          const coutUnit = coutUnitaireParProduit[item.product_id] || 0
          const revenueItem = item.unit_price * item.quantity
          const coutItem    = coutUnit        * item.quantity
          return total + (revenueItem - coutItem)
        }, 0)
      }

      // ── Marge moyenne ────────────────────────────────────────────────────
      const totalRevenuItems = saleItems.reduce((s, i) =>
        s + (i.unit_price * i.quantity), 0)
      const totalCoutItems   = saleItems.reduce((s, i) => {
        const cout = coutUnitaireParProduit[i.product_id] || 0
        return s + cout * i.quantity
      }, 0)
      const margeGlobale = totalRevenuItems > 0
        ? (totalRevenuItems - totalCoutItems) / totalRevenuItems
        : 0

      // ── Données graphique 7 jours ────────────────────────────────────────
      const chartData = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toDateString()
        const label   = i === 0 ? 'Auj.'
          : d.toLocaleDateString('fr-FR', { weekday: 'short' })

        const daySales = sales.filter(s =>
          new Date(s.created_at).toDateString() === dateStr
        )
        const daySaleIds = daySales.map(s => s.id)

        const dayItems   = saleItems.filter(i => daySaleIds.includes(i.sale_id))
        const ventes     = daySales.reduce((s, v) => s + (v.total || 0), 0)
        const benefices  = Math.round(getBeneficeReel(dayItems))

        chartData.push({ label, ventes, benefices })
      }

      // ── KPIs du jour ──────────────────────────────────────────────────────
      const today      = new Date().toDateString()
      const todaySales = sales.filter(s =>
        new Date(s.created_at).toDateString() === today
      )
      const todaySaleIds = todaySales.map(s => s.id)
      const todayItems   = saleItems.filter(i => todaySaleIds.includes(i.sale_id))

      const todayCA      = todaySales.reduce((s, v) => s + (v.total || 0), 0)
      const todayBenef   = Math.round(getBeneficeReel(todayItems))
      const margeAffichee = Math.round(margeGlobale * 100)

      const lowStock   = products.filter(p => p.quantity <= p.low_stock_threshold)
      const totalStock = products.reduce((s, p) => s + (p.quantity || 0), 0)

      // Valeur du stock au coût réel
      const valeurStock = products.reduce((s, p) => {
        const cout = coutUnitaireParProduit[p.id] || p.purchase_price || 0
        return s + cout * (p.quantity || 0)
      }, 0)

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
        recentSales: [...sales]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5),
        coutUnitaireParProduit,
      })
    } catch (err) {
      console.error('useStats error:', err)
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refresh: fetch }
}