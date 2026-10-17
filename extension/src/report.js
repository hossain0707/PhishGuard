import { $, request, toggleTheme, cell, status } from "./ui.js";
import { monthKey, selectMonth, countRisks } from "../../shared/history.js";
import { makeReport } from "../../shared/pdf.js";
import { archiveExisting, getArchivedMonth, listArchivedMonths } from "../../shared/archive.js";
let state;
let owner = "guest";
let archiveLog = [];
let archivedMonths = [];
$("month").value = monthKey();
$("month").max = monthKey();
async function render() {
  archiveLog = await getArchivedMonth(owner, $("month").value).catch(() => []);
  const month = $("month").value;
  const log = archiveLog.length ? archiveLog : selectMonth(state.log, month);
  const counts = countRisks(log);
  $("archived-months").textContent = archivedMonths.length
    ? "Available archives: " + archivedMonths.join(", ")
    : "No archived months yet; new scans are automatically archived.";
  $("period").textContent =
    `Reporting period: ${month} | ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  $("user-name").textContent = state.user.name;
  $("user-email").textContent = state.user.email;
  $("generated").textContent = new Date().toLocaleString();
  $("total").textContent = log.length;
  for (const level of ["LOW", "MEDIUM", "HIGH"]) $(level.toLowerCase()).textContent = counts[level];
  $("content").hidden = false;
  $("empty").hidden = log.length > 0;
  $("clear-report").disabled = !log.length;
  $("visits").replaceChildren();
  for (const item of [...log].reverse()) {
    const row = document.createElement("tr");
    cell(row, new Date(item.timestamp).toLocaleString());
    cell(row, item.url);
    cell(row, `${item.score} / 100`);
    cell(row, item.threatLevel);
    cell(row, item.reasons.join("; ") || "No indicators detected");
    $("visits").append(row);
  }
  document.title = `PhishGuard Report ${month}`;
}
async function load() {
  try {
    state = await request("GET_STATE");
    owner = state.user?.id || "guest";
    await archiveExisting(owner, state.log).catch(() => {});
    archivedMonths = await listArchivedMonths(owner).catch(() => []);
    if (state.guestMode) state.user = { name: "Local guest", email: "Not signed in" };
    await render();
    if (state.notice) status(state.notice);
  } catch (error) {
    status(error.message);
  }
}
$("month").addEventListener("change", async () => {
  try {
    render();
  } catch (error) {
    status(error.message);
  }
});
$("back").addEventListener("click", () => (location.href = "dashboard.html"));
$("theme-toggle").addEventListener("click", toggleTheme);
$("download").addEventListener("click", async () => {
  try {
    const report = await makeReport(
      await getArchivedMonth(owner, $("month").value).catch(() =>
        selectMonth(state.log, $("month").value),
      ),
      state.user,
      $("month").value,
    );
    const url = URL.createObjectURL(new Blob([report.bytes], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `PhishGuard-${$("month").value}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    status(`PDF export failed: ${error.message}. You can use Print instead.`);
  }
});
$("print").addEventListener("click", () => window.print());
$("clear-report").addEventListener("click", async () => {
  if (
    !confirm(
      `Permanently delete all local scan records for ${$("month").value}? This also removes those records from the dashboard.`,
    )
  )
    return;
  try {
    await request("CLEAR_MONTH", { month: $("month").value });
    await load();
  } catch (error) {
    status(error.message);
  }
});
load();
