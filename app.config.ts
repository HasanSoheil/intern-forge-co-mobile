import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Expo dynamic config. Reads the local .env (Expo loads it into process.env at
 * config-eval time) and injects the backend keys into `extra` so the running app
 * can read them via src/lib/env.ts. The same Supabase project + keys as the web app.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "CrewLink",
  slug: "internforge-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "internforgemobile",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.internforge.mobile",
  },
  android: {
    package: "com.internforge.mobile",
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      backgroundColor: "#F3F3F0",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-web-browser",
    "expo-video",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#F3F3F0",
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        dark: { backgroundColor: "#F3F3F0", image: "./assets/images/splash-icon.png", imageWidth: 200 },
      },
    ],
  ],
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
  extra: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PROJECT_ID: process.env.SUPABASE_PROJECT_ID,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GROQ_MODEL: process.env.GROQ_MODEL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    LOVABLE_API_KEY: process.env.LOVABLE_API_KEY,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  },
});
