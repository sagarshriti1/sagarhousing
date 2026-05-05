import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, userId, email, password, displayName, role } = await req.json();

    if (action === "create_user") {
      if (!email || !password || !role) {
        return new Response(JSON.stringify({ error: "email, password, role are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName ?? "", role },
      });
      if (createErr || !created.user) {
        return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Replace default role with requested role, stamping the admin caller as updater
      await supabase.from("user_roles").delete().eq("user_id", created.user.id);
      await supabase.from("user_roles").insert({ user_id: created.user.id, role, updated_by: caller.id });
      // Stamp the new profile (auto-created by handle_new_user) with the admin as updater
      await supabase.from("profiles").update({ updated_by: caller.id }).eq("user_id", created.user.id);

      return new Response(JSON.stringify({ success: true, userId: created.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (action === "reset_password") {
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Send password reset email via admin API
      const { error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, message: "Password reset email sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "activate" || action === "deactivate") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update is_active in profiles
      const isActive = action === "activate";
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_active: isActive, updated_by: caller.id })
        .eq("user_id", userId);
      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Ban/unban user in auth
      const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: isActive ? "none" : "876600h", // ~100 years
      });
      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: `User ${action}d` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, message: "User deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
