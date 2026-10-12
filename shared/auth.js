import { createClient } from "@supabase/supabase-js";
export function createAuth(config, storage, extension = false) {
  return createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage,
      storageKey: "phishguard_auth_v2",
      persistSession: true,
      autoRefreshToken: !extension,
      detectSessionInUrl: !extension,
      flowType: "implicit",
    },
    global: {
      fetch: (url, options = {}) =>
        fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(15000) }),
    },
  });
}
export function publicUser(user) {
  return user
    ? {
        id: user.id,
        name: user.user_metadata?.full_name || "PhishGuard user",
        email: user.email || "",
        createdAt: user.created_at,
      }
    : null;
}
export function check(error) {
  if (error) throw error;
}
export function credentials(input) {
  const email = String(input.email || "").trim();
  const password = String(input.password || "");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (!password || password.length > 128)
    throw new Error("Enter your password (maximum 128 characters).");
  return { email, password };
}
