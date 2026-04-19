import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useStore = create((set) => ({
  // ─── State ───────────────────────────────────────
  user:    null,
  loading: true,   // true au démarrage → évite le flash de redirect

  // ─── Actions ─────────────────────────────────────
  setUser:    (user)    => set({ user }),
  setLoading: (loading) => set({ loading }),

  // Appelé une seule fois dans App.jsx au montage
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ user: session?.user ?? null, loading: false })

    // Écoute les changements (logout depuis un autre onglet, token refresh...)
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null })
    })
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({ user: data.user })
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
    set({ user: null })
  },
}))