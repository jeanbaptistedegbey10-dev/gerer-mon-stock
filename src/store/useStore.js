import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set, get) => ({
  user:      null,
  tenant:    null,
  myRole:    null,   // rôle dans le tenant
  isSuperAdmin: false,
  loading:   true,

  setUser:    (user)    => set({ user }),
  setTenant:  (tenant)  => set({ tenant }),
  setMyRole:  (myRole)  => set({ myRole }),
  setLoading: (loading) => set({ loading }),

  // ── Init au démarrage ───────────────────────────────────────────────────
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null

    if (user) {
      await get().loadTenantContext(user)
    }

    set({ user, loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      set({ user: u })
      if (u) await get().loadTenantContext(u)
      else set({ tenant: null, myRole: null, isSuperAdmin: false })
    })
  },

  // ── Charger le contexte tenant ──────────────────────────────────────────
  loadTenantContext: async (user) => {
    try {
      // Vérifier super admin
      const { data: sa } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single()

      if (sa) {
        set({ isSuperAdmin: true, myRole: 'superadmin' })
        return
      }

      // Chercher membership actif
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('role, tenant_id, tenants(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (membership) {
        set({
          tenant:  membership.tenants,
          myRole:  membership.role,
        })
        return
      }

      // Chercher si owner d'un tenant
      const { data: ownedTenant } = await supabase
        .from('tenants')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (ownedTenant) {
        set({ tenant: ownedTenant, myRole: 'admin' })
        return
      }

      // Vérifier invitation en attente
      const { data: invitation } = await supabase
        .from('tenant_members')
        .select('*, tenants(*)')
        .eq('email', user.email.toLowerCase())
        .eq('status', 'pending')
        .single()

      if (invitation) {
        // Auto-accepter l'invitation
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
      }
    } catch (err) {
      console.error('loadTenantContext error:', err)
    }
  },

  // ── Auth ────────────────────────────────────────────────────────────────
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