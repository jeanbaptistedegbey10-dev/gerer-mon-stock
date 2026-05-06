import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useTeamMembers() {
  const { tenant }        = useStore()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenant) return

    const fetch = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('tenant_members')
          .select('user_id, full_name, email, role, status')
          .eq('tenant_id', tenant.id)
          .eq('status', 'active')
          .order('full_name')

        setMembers(data || [])
      } catch (err) {
        console.error('useTeamMembers error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [tenant])

  // Retrouver le nom d'un membre par son user_id
  const getMemberName = (userId) => {
    if (!userId) return '—'
    const m = members.find(m => m.user_id === userId)
    return m ? (m.full_name || m.email) : '—'
  }

  return { members, loading, getMemberName }
}