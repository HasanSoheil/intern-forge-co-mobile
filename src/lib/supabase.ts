import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { env } from "@/lib/env";

/**
 * Supabase client for the app — uses the RLS-protected publishable key and
 * persists the session in AsyncStorage. Same project as the web app.
 */
export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Service-role client — bypasses RLS. Used only for admin operations and
 * account deletion (replicates the web's server functions). Bundled into the
 * app for the FYP/demo; for production move these to Supabase Edge Functions.
 */
export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);
