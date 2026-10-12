import { $, api, request, theme } from "./ui.js";
const token = new URLSearchParams(location.search).get("id");
$("btn-proceed").hidden = true;
api.storage.local.get({ theme: "dark" }).then((data) => theme(data.theme));
$("btn-leave").addEventListener("click", async () => {
  const tab = await api.tabs.getCurrent();
  if (tab?.id) await api.tabs.remove(tab.id);
  else location.href = "dashboard.html";
});
$("btn-proceed").addEventListener("click", async () => {
  if (
    !confirm(
      "Proceed to this exact page for five minutes? The medium-risk indicators remain present.",
    )
  )
    return;
  try {
    await request("PROCEED", { token });
  } catch (error) {
    $("subtitle").textContent = error.message;
  }
});
(async () => {
  try {
    const { result } = await request("GET_WARNING", { token });
    $("container").classList.add(result.threatLevel.toLowerCase());
    $("icon").textContent = result.threatLevel === "HIGH" ? "🚫" : "⚠";
    $("title").textContent =
      result.threatLevel === "HIGH" ? "High-risk page detected" : "Review this page";
    $("subtitle").textContent =
      "PhishGuard redirected this tab after detecting risk indicators. The page may have loaded before detection. Risk scores are heuristic assessments, not proof of phishing.";
    $("score-badge").textContent = `Risk score: ${result.score} / 100`;
    $("url-display").textContent = result.url;
    $("reasons-list").replaceChildren();
    for (const reason of result.reasons) {
      const row = document.createElement("div");
      row.className = "reason-item";
      row.textContent = reason;
      $("reasons-list").append(row);
    }
    $("btn-proceed").hidden = result.threatLevel !== "MEDIUM";
  } catch (error) {
    $("title").textContent = "Warning unavailable";
    $("subtitle").textContent = error.message;
    $("url-display").textContent = "Return to the dashboard or close this tab.";
  }
})();
