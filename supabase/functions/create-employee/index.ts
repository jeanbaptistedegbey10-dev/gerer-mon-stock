import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const { email, password, fullName, role, tenantId } = await req.json()

    // Client admin avec service_role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Créer le compte sans envoyer d'email de confirmation
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,   // ← confirme direct, pas d'email envoyé
        user_metadata: { full_name: fullName },
      })

    if (userError) throw userError

    // 2. Créer le membership
    const { error: memberError } = await supabaseAdmin
      .from('tenant_members')
      .insert({
        tenant_id: tenantId,
        user_id:   userData.user.id,
        email:     email.toLowerCase(),
        full_name: fullName,
        role,
        status:    'active',
        joined_at: new Date().toISOString(),
      })

    if (memberError) throw memberError

    return new Response(
      JSON.stringify({ success: true, userId: userData.user.id }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})