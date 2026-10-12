export const api = globalThis.browser || globalThis.chrome;
export async function request(type, values = {}) {
  const response = await api.runtime.sendMessage({ type, ...values });
  if (!response?.ok)
    throw new Error(response?.error || "The extension could not respond. Reload this page.");
  return response;
}
export const $ = (id) => document.getElementById(id);
export function theme(value) {
  document.documentElement.dataset.theme = value === "light" ? "light" : "dark";
}
export async function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  await api.storage.local.set({ theme: next });
  theme(next);
}
export function status(message) {
  $("message").textContent = message;
}
export async function guarded() {
  const state = await request("GET_STATE");
  theme(state.theme);
  if (!state.user) {
    location.href = "auth.html";
    throw new Error("Please log in.");
  }
  return state;
}
export function cell(row, value) {
  const td = document.createElement("td");
  td.textContent = value;
  row.append(td);
  return td;
}
