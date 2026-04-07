import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.100.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await adminClient.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Not admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create_admin") {
      const { email, password } = body;
      if (!email || !password) {
        return new Response(JSON.stringify({ error: "Email dan password wajib diisi" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Create user with service role
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Assign admin role
      await adminClient.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "remove_admin") {
      const { user_id: targetUserId } = body;
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Don't allow removing yourself
      if (targetUserId === user.id) {
        return new Response(JSON.stringify({ error: "Tidak bisa menghapus diri sendiri" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await adminClient.from("user_roles").delete().eq("user_id", targetUserId).eq("role", "admin");
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_admins") {
      const { data: adminRoles } = await adminClient.from("user_roles").select("user_id, role").eq("role", "admin");
      const adminIds = adminRoles?.map((r: any) => r.user_id) || [];
      
      const admins = [];
      for (const id of adminIds) {
        const { data: profile } = await adminClient.from("profiles").select("username, email, profile_code").eq("user_id", id).maybeSingle();
        admins.push({ user_id: id, ...profile });
      }
      
      return new Response(JSON.stringify({ admins }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
