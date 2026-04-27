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
    // 1. Super admin ?
    const { data: sa } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (sa) {
      set({ isSuperAdmin: true, myRole: 'superadmin' })
      return
    }

    // 2. Chercher membership actif (couvre admin ET employés)
    const { data: memberships, error } = await supabase
      .from('tenant_members')
      .select(`
        id, role, status, tenant_id,
        tenants (
          id, name, owner_id, plan,
          max_users, max_products, active
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (!error && memberships && memberships.length > 0) {
      const m = memberships[0]
      if (m.tenants) {
        set({ tenant: m.tenants, myRole: m.role })
        return
      }
    }

    // 3. Chercher si owner direct d'un tenant
    // (cas où l'admin n'a pas de membership créé)
    const { data: ownedTenants } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', user.id)

    if (ownedTenants && ownedTenants.length > 0) {
      set({ tenant: ownedTenants[0], myRole: 'admin' })

      // Créer automatiquement le membership s'il manque
      const { data: existing } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('tenant_id', ownedTenants[0].id)
        .maybeSingle()

      if (!existing) {
        await supabase.from('tenant_members').insert({
          tenant_id: ownedTenants[0].id,
          user_id:   user.id,
          email:     user.email,
          full_name: user.user_metadata?.full_name || '',
          role:      'admin',
          status:    'active',
          joined_at: new Date().toISOString(),
        })
      }
      return
    }

    // 4. Aucun tenant → onboarding
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