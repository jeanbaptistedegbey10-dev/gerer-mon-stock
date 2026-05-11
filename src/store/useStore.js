import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set, get) => ({
  user:         null,
  tenant:       null,
  myRole:       null,
  isSuperAdmin: false,
  loading:      true,
  tenantLoaded: false,

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
    // 1. Vérifier super admin
    const { data: sa } = await supabase
      .from('super_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (sa) {
      // Super admin → charger AUSSI son tenant s'il en a un
      set({ isSuperAdmin: true, myRole: 'superadmin' })

      // Chercher son membership normal
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
            myRole:       'admin',      // dans son entreprise il est admin
            tenantLoaded: true,
          })
          return
        }
      }

      // Chercher si owner d'un tenant
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
        return
      }

      // Super admin sans tenant → pas d'onboarding
      set({ tenant: null, myRole: 'superadmin', tenantLoaded: true })
      return
    }

    // 2. Appeler la fonction SQL sécurisée
    const { data, error } = await supabase
      .rpc('get_my_tenant_context')

    console.log('tenant context:', data, error)

    if (!error && data?.found) {
      const tenant = typeof data.tenant === 'string'
        ? JSON.parse(data.tenant)
        : data.tenant

      set({
        tenant:       tenant,
        myRole:       data.role,
        tenantLoaded: true,
      })
      return
    }

    // 3. Aucun tenant
    set({ tenant: null, myRole: null, tenantLoaded: true })

  } catch (err) {
    console.error('loadTenantContext error:', err)
    set({ tenant: null, myRole: null, tenantLoaded: true })
  }
},
   // Dans le store, cette ligne doit exister
setTenant: (tenant) => set({ tenant }),
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