import { $, api, request, toggleTheme, cell, status } from "./ui.js";
import { countRisks } from "../../shared/history.js";
async function load() {
  try {
    const state = await request("GET_STATE");
    status(
      state.guestMode
        ? "Guest mode: scans and reports remain private on this device. Sign in from Profile to use an account."
        : state.notice || "",
    );
    const log = state.log
      .filter((row) => row.timestamp > state.dashboardSince)
      .slice(-200)
      .reverse();
    const counts = countRisks(log);
    $("stat-total").textContent = log.length;
    for (const level of ["LOW", "MEDIUM", "HIGH"])
      $(`stat-${level.toLowerCase()}`).textContent = counts[level];
    $("log-body").replaceChildren();
    for (const item of log) {
      const row = document.createElement("tr");
      cell(row, new Date(item.timestamp).toLocaleString());
      cell(row, item.hostname);
      cell(row, `${item.score} / 100`);
      const badge = document.createElement("span");
      badge.className = `badge badge-${item.threatLevel.toLowerCase()}`;
      badge.textContent = item.threatLevel;
      cell(row, "").append(badge);
      cell(row, item.reasons.join("; ") || "No indicators detected");
      $("log-body").append(row);
    }
    if (!log.length) {
      const row = document.createElement("tr");
      const td = cell(
        row,
        "No scans recorded for this account. Reload a web page after logging in.",
      );
      td.colSpan = 5;
      $("log-body").append(row);
    }
    const notice = (await api.storage.session.get("registrationNotice")).registrationNotice;
    if (notice) status(notice);
  } catch (error) {
    status(error.message);
  }
}
$("btn-clear").addEventListener("click", async () => {
  if (confirm("Hide previous dashboard entries? Your report history will be preserved.")) {
    await request("CLEAR_DASHBOARD");
    load();
  }
});
$("btn-report").addEventListener("click", () => (location.href = "report.html"));
$("btn-profile").addEventListener("click", async () => {
  const state = await request("GET_STATE");
  location.href = state.guestMode ? "auth.html" : "profile.html";
});
$("theme-toggle").addEventListener("click", toggleTheme);
api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && Object.keys(changes).some((key) => key.startsWith("history:"))) load();
});
load();
