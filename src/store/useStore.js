import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set, get) => ({
  user:         null,
  tenant:       null,
  myRole:       null,
  isSuperAdmin: false,
  loading:      true,

  setUser:    (user)    => set({ user }),
  setTenant:  (tenant)  => set({ tenant }),
  setMyRole:  (myRole)  => set({ myRole }),
  setLoading: (loading) => set({ loading }),

  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null

      if (user) {
        await get().loadTenantContext(user)
      }

      set({ user, loading: false })

      supabase.auth.onAuthStateChange(async (_event, session) => {
        const u = session?.user ?? null
        set({ user: u })
        if (u) {
          await get().loadTenantContext(u)
        } else {
          set({ tenant: null, myRole: null, isSuperAdmin: false })
        }
      })
    } catch (err) {
      console.error('init error:', err)
      set({ loading: false })
    }
  },

  loadTenantContext: async (user) => {
    try {
      // 1. Vérifier super admin
      const { data: sa } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()                     // ← maybeSingle au lieu de single

      if (sa) {
        set({ isSuperAdmin: true, myRole: 'superadmin' })
        return
      }

      // 2. Chercher membership actif
      const { data: memberships } = await supabase
        .from('tenant_members')
        .select('role, tenant_id, tenants(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)                          // ← limit au lieu de single

      if (memberships && memberships.length > 0) {
        const membership = memberships[0]
        set({
          tenant: membership.tenants,
          myRole: membership.role,
        })
        return
      }

      // 3. Chercher si owner d'un tenant
      const { data: ownedTenants } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1)                          // ← limit au lieu de single

      if (ownedTenants && ownedTenants.length > 0) {
        set({ tenant: ownedTenants[0], myRole: 'admin' })
        return
      }

      // 4. Chercher invitation en attente et auto-accepter
      const { data: invitations } = await supabase
        .from('tenant_members')
        .select('*, tenants(*)')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .limit(1)                          // ← limit au lieu de single

      if (invitations && invitations.length > 0) {
        const invitation = invitations[0]
        await supabase
          .from('tenant_members')
          .update({
            user_id:   user.id,
            status:    'active',
            joined_at: new Date().toISOString(),
          })
          .eq('id', invitation.id)

        set({
          tenant: invitation.tenants,
          myRole: invitation.role,
        })
        return
      }

      // 5. Aucun tenant trouvé → onboarding
      console.log('No tenant found for user:', user.id)
      set({ tenant: null, myRole: null })

    } catch (err) {
      console.error('loadTenantContext error:', err)
      set({ tenant: null, myRole: null })
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    })
    if (error) throw error
    set({ user: data.user })
    await get().loadTenantContext(data.user)
    return data
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, tenant: null, myRole: null, isSuperAdmin: false })
  },
}))