import { createClient } from '@supabase/supabase-js'

// Singleton — une seule instance dans toute l'app
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)