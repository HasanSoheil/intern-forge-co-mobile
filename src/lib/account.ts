/** Account + admin operations (service-role). Ports the web server functions. */
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function deleteMyAccount(): Promise<{ ok: true }> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  await supabase.auth.signOut();
  return { ok: true };
}

async function assertAdmin() {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) throw new Error("Admin only");
  return userId;
}

export async function adminDeleteUser(targetUserId: string): Promise<{ ok: true }> {
  const me = await assertAdmin();
  if (targetUserId === me) throw new Error("You cannot delete your own admin account here");
  const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function adminCreateAdmin(email: string, password: string, fullName: string): Promise<{ ok: true }> {
  await assertAdmin();
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin", full_name: fullName },
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}
