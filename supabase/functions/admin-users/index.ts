// Supabase Edge Function: admin-users
// Creates / updates / removes team members. Needs the service-role key, so it must run on the
// server — the browser only calls it. Only an active *admin* may call it.
//
// Deploy:  supabase functions deploy admin-users
// (SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

const PERMISSIONS = ["overview", "orders", "products", "products.delete", "categories", "customers", "team", "settings", "reviews", "brands"]

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } },
    })
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)

    const { data: who } = await caller.auth.getUser()
    if (!who?.user) return reply({ error: "Not signed in" }, 401)
    const { data: me } = await admin.from("profiles").select("role, active").eq("id", who.user.id).maybeSingle()
    if (!me?.active || me.role !== "admin") return reply({ error: "Admins only" }, 403)

    const body = await request.json()

    if (body.action === "create") {
      const email = String(body.email || "").trim().toLowerCase()
      const password = String(body.password || "")
      if (!email.includes("@") || password.length < 8) return reply({ error: "Valid e-mail and an 8+ character password are required" }, 400)
      const role = body.role === "admin" ? "admin" : "staff"
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: body.name || "" },
      })
      if (error) return reply({ error: error.message }, 400)
      // handle_new_user() already created the profile row; promote it.
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          name: body.name || "",
          role,
          active: body.active !== false,
          permissions: role === "admin" ? PERMISSIONS : (body.permissions || []).filter((p: string) => PERMISSIONS.includes(p) && p !== "team"),
        })
        .eq("id", data.user.id)
      if (updateError) return reply({ error: updateError.message }, 400)
      return reply({ id: data.user.id })
    }

    if (body.action === "set-password") {
      if (String(body.password || "").length < 8) return reply({ error: "Password must be at least 8 characters" }, 400)
      const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password })
      return error ? reply({ error: error.message }, 400) : reply({ ok: true })
    }

    if (body.action === "delete") {
      if (body.id === who.user.id) return reply({ error: "You cannot delete your own account" }, 400)
      const { error } = await admin.auth.admin.deleteUser(body.id)
      return error ? reply({ error: error.message }, 400) : reply({ ok: true })
    }

    return reply({ error: "Unknown action" }, 400)
  } catch (error) {
    return reply({ error: String((error as Error).message || error) }, 500)
  }
})
