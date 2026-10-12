// Public client configuration. Never put a service-role key here.
const defaults = {
  SUPABASE_URL: "https://pbwthtftlfgonbhkytxh.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_IIrYSkTvZhYCdez9Hl9CNg_VSZs4IAb",
  WEBSITE_URL: "https://phishgurd.vercel.app/",
  VERSION: "4.1.0",
};
// Build-time values are public client settings, validated before either bundle is emitted.
export const CONFIG =
  typeof __PHISHGUARD_CONFIG__ === "undefined" ? defaults : __PHISHGUARD_CONFIG__;
