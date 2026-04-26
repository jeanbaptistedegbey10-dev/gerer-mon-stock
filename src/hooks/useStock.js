import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useStock() {
  const { tenant }   = useStore()
  const [moves,    setMoves]   = useState([])
  const [loading,  setLoading] = useState(true)
  const [error,    setError]   = useState(null)

  const fetch = useCallback(async () => {
    if (!tenant) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('stock_moves')
        .select('*')
        .eq('tenant_id', tenant.id)          // ← tenant_id
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setMoves(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tenant])

  useEffect(() => { fetch() }, [fetch])

  const stats = {
    totalEntrees: moves
      .filter(m => m.type === 'entrée')
      .reduce((s, m) => s + m.quantity, 0),
    totalSorties: moves
      .filter(m => m.type === 'sortie')
      .reduce((s, m) => s + m.quantity, 0),
    mouvements:   moves.length,
  }

  return { moves, loading, error, stats, refresh: fetch }
}