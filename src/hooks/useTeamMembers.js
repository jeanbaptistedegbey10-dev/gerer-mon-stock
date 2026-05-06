import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export function useTeamMembers() {
  const { tenant }    = useStore()
  const [members, setMembers] = useState([])

  useEffect(() => {
    if (!tenant) return
    supabase
      .from('tenant_members')
      .select('user_id, full_name, email, role')
      .eq('tenant_id', tenant.id)
      .eq('status', 'active')
      .then(({ data }) => setMembers(data || []))
  }, [tenant])

  return { members }
}