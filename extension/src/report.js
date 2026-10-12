import { $, request, guarded, toggleTheme, cell, status } from "./ui.js";
import { monthKey, selectMonth, countRisks } from "../../shared/history.js";
import { makeReport } from "../../shared/pdf.js";
let state;
$("month").value = monthKey();
$("month").max = monthKey();
function render() {
  const month = $("month").value;
  const log = selectMonth(state.log, month);
  const counts = countRisks(log);
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
    state = await guarded();
    render();
    if (state.notice) status(state.notice);
  } catch (error) {
    status(error.message);
  }
}
$("month").addEventListener("change", () => {
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
      selectMonth(state.log, $("month").value),
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
