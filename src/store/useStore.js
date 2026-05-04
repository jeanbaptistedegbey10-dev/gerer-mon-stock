import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set, get) => ({
  user:         null,
  tenant:       null,
  myRole:       null,
  isSuperAdmin: false,
  loading:      true,
  tenantLoaded: false,  // ← nouveau flag

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
          set({
            tenant:       null,
            myRole:       null,
            isSuperAdmin: false,
            tenantLoaded: false,
          })
        }
      })
    } catch (err) {
      console.error('init error:', err)
      set({ loading: false, tenantLoaded: true })
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
        set({
          isSuperAdmin: true,
          myRole:       'superadmin',
          tenantLoaded: true,
        })
        return
      }

      // 2. Membership actif → query séparée
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('id, role, status, tenant_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (membership?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', membership.tenant_id)
          .maybeSingle()

        if (tenantData) {
          set({
            tenant:       tenantData,
            myRole:       membership.role,
            tenantLoaded: true,
          })
          return
        }
      }

      // 3. Owner direct ?
      const { data: ownedTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (ownedTenant) {
        set({
          tenant:       ownedTenant,
          myRole:       'admin',
          tenantLoaded: true,
        })

        // Créer membership manquant
        const { data: existing } = await supabase
          .from('tenant_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('tenant_id', ownedTenant.id)
          .maybeSingle()

        if (!existing) {
          await supabase.from('tenant_members').insert({
            tenant_id: ownedTenant.id,
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

      // 4. Vraiment aucun tenant
      set({ tenant: null, myRole: null, tenantLoaded: true })

    } catch (err) {
      console.error('loadTenantContext error:', err)
      set({ tenant: null, myRole: null, tenantLoaded: true })
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password,
    })
    if (error) throw error
    set({ user: data.user, tenantLoaded: false })
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
    set({
      user:         null,
      tenant:       null,
      myRole:       null,
      isSuperAdmin: false,
      tenantLoaded: false,
    })
  },
}))