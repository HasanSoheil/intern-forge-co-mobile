import Constants from "expo-constants";

/**
 * Backend keys, injected at build time via app.config.ts -> extra (sourced from .env).
 * Same Supabase project + keys as the web app.
 */
type Extra = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_PROJECT_ID?: string;
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  LOVABLE_API_KEY?: string;
  GITHUB_TOKEN?: string;
  STRIPE_SECRET_KEY?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  SUPABASE_URL: extra.SUPABASE_URL ?? "",
  SUPABASE_PUBLISHABLE_KEY: extra.SUPABASE_PUBLISHABLE_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: extra.SUPABASE_SERVICE_ROLE_KEY ?? "",
  SUPABASE_PROJECT_ID: extra.SUPABASE_PROJECT_ID ?? "",
  GROQ_API_KEY: extra.GROQ_API_KEY ?? "",
  GROQ_MODEL: extra.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  GEMINI_API_KEY: extra.GEMINI_API_KEY ?? "",
  GEMINI_MODEL: extra.GEMINI_MODEL ?? "gemini-2.5-flash",
  LOVABLE_API_KEY: extra.LOVABLE_API_KEY ?? "",
  GITHUB_TOKEN: extra.GITHUB_TOKEN ?? "",
  STRIPE_SECRET_KEY: extra.STRIPE_SECRET_KEY ?? "",
};
