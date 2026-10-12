import { $, api, request, theme, toggleTheme, status } from "./ui.js";
let mode = "login";
api.storage.local.get({ theme: "dark" }).then((data) => theme(data.theme));
$("theme-toggle").addEventListener("click", toggleTheme);
document.querySelectorAll(".tab[data-mode]").forEach((tab) =>
  tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    document
      .querySelectorAll(".tab[data-mode]")
      .forEach((item) => item.classList.toggle("active", item === tab));
    $("name-field").classList.toggle("hidden", mode !== "signup");
    $("name").required = mode === "signup";
    $("password").autocomplete = mode === "signup" ? "new-password" : "current-password";
    $("password").minLength = mode === "signup" ? 12 : 1;
    $("submit-button").textContent = mode === "signup" ? "Create Account" : "Log In";
    $("form-title").textContent = mode === "signup" ? "Create your account" : "Welcome back";
    status("");
  }),
);
$("password-toggle").addEventListener("click", () => {
  const show = $("password").type === "password";
  $("password").type = show ? "text" : "password";
  $("password-toggle").textContent = show ? "Hide" : "Show";
  $("password-toggle").setAttribute("aria-pressed", String(show));
  $("password-toggle").setAttribute("aria-label", show ? "Hide password" : "Show password");
});
$("account-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("submit-button").disabled = true;
  status("");
  try {
    const response = await request(mode === "signup" ? "AUTH_SIGNUP" : "AUTH_LOGIN", {
      email: $("email").value,
      password: $("password").value,
      name: $("name").value,
    });
    $("password").value = "";
    if (mode === "login") {
      if (response.notice) await api.storage.session.set({ registrationNotice: response.notice });
      location.href = "dashboard.html";
    } else status(response.notice);
  } catch (error) {
    status(error.message);
  } finally {
    $("submit-button").disabled = false;
  }
});
$("guest-mode").addEventListener("click", () => (location.href = "dashboard.html"));
$("forgot").addEventListener("click", async () => {
  $("forgot").disabled = true;
  try {
    status((await request("AUTH_RECOVER", { email: $("email").value })).notice);
  } catch (error) {
    status(error.message);
  } finally {
    $("forgot").disabled = false;
  }
});
