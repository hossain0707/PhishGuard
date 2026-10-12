// Public client configuration. Never put a service-role key here.
const defaults = {
  SUPABASE_URL: "https://cubeknefkcszbnpzosxb.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_oWimwzoeMpGMIOZh-ePhKA_UQWiJj_N",
  WEBSITE_URL: "",
  VERSION: "4.1.0",
};
// Build-time values are public client settings, validated before either bundle is emitted.
export const CONFIG =
  typeof __PHISHGUARD_CONFIG__ === "undefined" ? defaults : __PHISHGUARD_CONFIG__;
