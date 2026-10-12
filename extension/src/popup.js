import { $, api, request, theme, toggleTheme } from "./ui.js";
$("theme-toggle").addEventListener("click", toggleTheme);
$("btn-dashboard").addEventListener("click", () =>
  api.tabs.create({ url: api.runtime.getURL("dashboard.html") }),
);
(async () => {
  const container = $("content");
  try {
    const state = await request("GET_STATE");
    theme(state.theme);
    if (!state.user) {
      document.querySelector(".live").textContent = "LOGIN REQUIRED";
      throw new Error("Log in from the dashboard to activate monitoring.");
    }
    const [tab] = await api.tabs.query({ active: true, currentWindow: true });
    const { result } = await request("GET_TAB_RESULT", { tabId: tab.id });
    if (!result)
      throw new Error(
        "No analysis for this tab. Reload an HTTP/HTTPS page. Browser internal pages cannot be scanned.",
      );
    container.replaceChildren();
    const section = document.createElement("section");
    section.className = "score-section";
    const score = document.createElement("div");
    score.className = `score-circle score-${result.threatLevel.toLowerCase()}`;
    score.textContent = result.score;
    score.style.margin = "0 auto 16px";
    const label = document.createElement("p");
    label.className = `threat-label label-${result.threatLevel.toLowerCase()}`;
    label.textContent = `${result.threatLevel} RISK`;
    const host = document.createElement("p");
    host.className = "url-text";
    host.textContent = result.hostname;
    section.append(score, label, host);
    container.append(section);
    const reasons = document.createElement("div");
    reasons.className = "reasons-box";
    for (const reason of result.reasons.length
      ? result.reasons
      : ["No indicators detected. This is not a guarantee that the page is safe."]) {
      const row = document.createElement("div");
      row.className = "reason-item";
      row.textContent = reason;
      reasons.append(row);
    }
    container.append(reasons);
  } catch (error) {
    const text = document.createElement("div");
    text.className = "no-data";
    text.textContent = error.message;
    container.replaceChildren(text);
  }
})();
