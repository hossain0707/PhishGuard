import { $, api, request, guarded, toggleTheme, status } from "./ui.js";
async function load() {
  try {
    const { user, version } = await guarded();
    $("name").value = user.name;
    $("email").textContent = user.email;
    $("created").textContent = new Date(user.createdAt).toLocaleDateString();
    $("version").textContent = version;
    $("reputation-opt-in").checked = (await request("GET_REPUTATION_CONSENT")).enabled;
  } catch (error) {
    status(error.message);
  }
}
$("back").addEventListener("click", () => (location.href = "dashboard.html"));
$("theme").addEventListener("click", toggleTheme);
$("connect-browser").addEventListener("click", async () => {
  try {
    if (
      api.runtime.getManifest().browser_specific_settings?.gecko &&
      !(await api.permissions.request({ data_collection: ["technicalAndInteraction"] }))
    ) {
      status("Browser registration was not enabled. Local monitoring is unaffected.");
      return;
    }
    status((await request("REGISTER_BROWSER")).notice);
  } catch (error) {
    status(error.message);
  }
});
$("logout").addEventListener("click", async () => {
  try {
    await request("AUTH_LOGOUT");
    location.href = "auth.html";
  } catch (error) {
    status(error.message);
  }
});
$("profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("PROFILE_UPDATE", { name: $("name").value });
    status("Profile saved.");
  } catch (error) {
    status(error.message);
  }
});
$("erase").addEventListener("click", async () => {
  if (
    confirm("Permanently delete all local scan history for this account? This cannot be undone.")
  ) {
    try {
      await request("ERASE_HISTORY");
      status("Your local history was deleted.");
    } catch (error) {
      status(error.message);
    }
  }
});
load();

$("reputation-opt-in").addEventListener("change", async () => {
  try {
    await request("SET_REPUTATION_CONSENT", { enabled: $("reputation-opt-in").checked });
    status($("reputation-opt-in").checked ? "Optional URL reputation checking enabled on this device." : "URL reputation checking disabled.");
  } catch (error) { status(error.message); }
});
