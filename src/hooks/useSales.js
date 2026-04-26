import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useSales() {
  const { user, tenant } = useStore()
  const [sales,    setSales]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [error,    setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id, product_name, quantity, unit_price, total
          )
        `)
        .eq('tenant_id', tenant.id)          // ← tenant_id
        .order('created_at', { ascending: false })
      if (error) throw error
      setSales(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => { fetch() }, [fetch])

  const createSale = async ({
    cartItems, clientName, clientPhone,
    status, discount, discountType, total
  }) => {
    // 1. Créer la vente
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        tenant_id:     tenant.id,            // ← tenant_id
        user_id:       user.id,
        client_name:   clientName   || null,
        client_phone:  clientPhone  || null,
        total,
        discount:      discount     || 0,
        discount_type: discountType || 'amount',
        status:        status       || 'payé',
      })
      .select()
      .single()
    if (saleError) throw saleError

    // 2. Créer les lignes
    const saleItems = cartItems.map(i => ({
      sale_id:      saleData.id,
      tenant_id:    tenant.id,               // ← tenant_id
      product_id:   i.product.id,
      product_name: i.product.name,
      quantity:     i.quantity,
      unit_price:   i.unit_price,
    }))
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItems)
    if (itemsError) throw itemsError

    // 3. Décrémenter stock + log
    for (const item of cartItems) {
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        p_product_id: item.product.id,
        p_quantity:   item.quantity,
      })
      if (stockError) {
        await supabase
          .from('products')
          .update({ quantity: item.product.quantity - item.quantity })
          .eq('id', item.product.id)
      }
      await supabase.from('stock_moves').insert({
        tenant_id:    tenant.id,             // ← tenant_id
        user_id:      user.id,
        product_id:   item.product.id,
        product_name: item.product.name,
        type:         'sortie',
        quantity:     item.quantity,
        reason:       `Vente #${saleData.id.slice(0, 8).toUpperCase()}`,
      })
    }

    await fetch()
    return { ...saleData, sale_items: saleItems }
  }

  const today = new Date().toDateString()
  const stats = {
    total:          sales.length,
    todayTotal:     sales
      .filter(s => new Date(s.created_at).toDateString() === today)
      .reduce((s, v) => s + v.total, 0),
    todayCount:     sales
      .filter(s => new Date(s.created_at).toDateString() === today)
      .length,
    pending:        sales.filter(s => s.status === 'en attente').length,
  }

  return { sales, loading, error, stats, createSale, refresh: fetch }
}