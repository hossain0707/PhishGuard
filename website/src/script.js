import { createAuth, check, credentials } from "../../shared/auth.js";
const config = window.PHISHGUARD_CONFIG;
// Retire the old unrefreshed hand-written session format; users sign in through the SDK.
localStorage.removeItem("phishguard_session");
const client = createAuth(config, localStorage);
const $ = id => document.getElementById(id);
let session = null;
let recovering = new URLSearchParams(location.hash.slice(1)).get("type") === "recovery";
// Email links can reuse an already-open portal tab; the SDK processes callbacks on initialisation.
addEventListener("hashchange", () => {
  if (new URLSearchParams(location.hash.slice(1)).has("access_token")) location.reload();
});
const protectedViews = new Set(["dashboard", "profile", "reset"]);
function status(form, text) { const element = form.querySelector(".form-status"); element.textContent = text; element.hidden = !text; }
function globalStatus(text) { $("message-banner").textContent = text; $("message-banner").hidden = !text; }
function showView(requested) {
  const view = protectedViews.has(requested) && !session ? "login" : requested;
  document.querySelectorAll(".view").forEach(element => element.hidden = element.id !== `view-${view}`);
  document.querySelectorAll(".form-status").forEach(element => element.hidden = true);
  globalStatus("");
  if (view === "dashboard") loadBrowsers();
  if (view === "profile") $("profile-form").elements.full_name.value = session.user.user_metadata?.full_name || "";
  window.scrollTo({ top: 0 });
}
function updateSession(value) {
  session = value; $("guest-nav").hidden = !!value; $("user-nav").hidden = !value;
  if (value) {
    $("dashboard-name").textContent = value.user.user_metadata?.full_name || "PhishGuard user";
    $("dashboard-email").textContent = value.user.email;
    const form = $("profile-form"); form.elements.full_name.value = value.user.user_metadata?.full_name || "";
    form.elements.email.value = value.user.email; form.elements.user_id.value = value.user.id;
  }
}
async function loadBrowsers() {
  $("browser-count").textContent = "…"; $("browser-list").replaceChildren();
  const { data, error } = await client.from("extension_sessions").select("browser_type,extension_version,last_seen").order("last_seen", { ascending: false }).limit(100);
  if (error) { $("browser-count").textContent = "Unavailable"; globalStatus("Browser registrations are unavailable. Check database setup. Your extension dashboard stores browsing activity separately on your device."); return; }
  $("browser-count").textContent = data.length;
  for (const browser of data) { const item = document.createElement("li"); item.textContent = `${browser.browser_type} ${browser.extension_version} — last login: ${new Date(browser.last_seen).toLocaleString()}`; $("browser-list").append(item); }
}
function applyTheme(value) { document.documentElement.dataset.theme = value; localStorage.setItem("phishguard_theme", value); }
applyTheme(localStorage.getItem("phishguard_theme") === "light" ? "light" : "dark");
$("theme-button").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
$("start-button").addEventListener("click", () => showView("download"));
$("features-button").addEventListener("click", () => $("features").scrollIntoView({ behavior: "smooth" }));
function submit(id, action) {
  const form = $(id);
  form.addEventListener("submit", async event => {
    event.preventDefault(); const button = form.querySelector('[type="submit"]'); button.disabled = true; status(form, "");
    try { await action(form, new FormData(form)); } catch (error) { status(form, error.message || "Please try again."); } finally { button.disabled = false; }
  });
}
const redirectTo = `${location.origin}${location.pathname}`;
submit("signup-form", async (form, data) => {
  const values = credentials({ email: data.get("email"), password: data.get("password") });
  if (values.password.length < 12) throw new Error("Use a password with at least 12 characters.");
  const name = String(data.get("full_name") || "").trim();
  if (!name || name.length > 100) throw new Error("Name must contain 1–100 characters.");
  const { error } = await client.auth.signUp({ ...values, options: { emailRedirectTo: redirectTo, data: { full_name: name } } }); check(error);
  await client.auth.signOut({ scope: "local" }); form.reset();
  status(form, "If registration is available for this email, a verification message will be sent. Verify your email before logging in.");
});
submit("login-form", async (form, data) => {
  const { data: result, error } = await client.auth.signInWithPassword(credentials({ email: data.get("email"), password: data.get("password") })); check(error);
  if (!result.user.email_confirmed_at) { await client.auth.signOut({ scope: "local" }); throw new Error("Verify your email before logging in."); }
  updateSession(result.session); form.reset(); showView("dashboard");
});
submit("forgot-form", async (form, data) => {
  const { error } = await client.auth.resetPasswordForEmail(String(data.get("email")).trim(), { redirectTo }); check(error);
  status(form, "If an account exists for this email, a password recovery link will be sent.");
});
submit("reset-form", async (form, data) => {
  if (!recovering) throw new Error("Request a new recovery email to change your password.");
  const password = String(data.get("password"));
  if (password.length < 12 || password.length > 128 || password !== data.get("confirm")) throw new Error("Passwords must match and contain 12–128 characters.");
  const { error } = await client.auth.updateUser({ password }); check(error);
  await client.auth.signOut({ scope: "global" }); recovering = false; updateSession(null); form.reset(); showView("login");
  globalStatus("Password updated. Log in with your new password on the website and extension.");
});
submit("profile-form", async (form, data) => {
  const name = String(data.get("full_name") || "").trim();
  if (!name || name.length > 100) throw new Error("Name must contain 1–100 characters.");
  const { error } = await client.auth.updateUser({ data: { full_name: name } }); check(error); status(form, "Profile updated.");
});
$("logout-button").addEventListener("click", async () => {
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) { globalStatus("Sign-out could not reach the server. Please retry."); return; }
  updateSession(null); showView("home");
});
client.auth.onAuthStateChange((event, value) => {
  updateSession(value);
  if (event === "PASSWORD_RECOVERY") { recovering = true; showView("reset"); }
  if (event === "SIGNED_OUT") { const active = document.querySelector('.view:not([hidden])')?.id.replace("view-", ""); if (protectedViews.has(active)) showView("login"); }
});
(async () => {
  try {
    const { data, error } = await client.auth.getSession(); check(error); updateSession(data.session);
    // Remove credentials from browser history after the SDK processes an email link.
    if (location.hash) history.replaceState({}, "", location.pathname);
    if (recovering && session) showView("reset");
  } catch (error) { globalStatus(error.message); }
})();
