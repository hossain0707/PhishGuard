(() => {
  const api = globalThis.browser || globalThis.chrome;
  const documentId = crypto.randomUUID();
  let signature = "", timer, sent = 0;
  async function scan() {
    const data = {
      inputCount: document.querySelectorAll('input[type="password"]').length,
      formCount: document.forms.length,
      iframeCount: document.querySelectorAll("iframe").length
    };
    const next = JSON.stringify([location.href, data]);
    if (next === signature || sent >= 100) return;
    signature = next; sent++;
    try {
      const response = await api.runtime.sendMessage({ type: "ANALYZE_PAGE", data, documentId });
      if (response?.authenticationRequired) signature = "";
    } catch { /* Browser unloading the document or extension update. */ }
  }
  const schedule = () => { clearTimeout(timer); timer = setTimeout(scan, 750); };
  scan();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["type"] });
  const poll = setInterval(scan, 5000); // Also catches SPA URL changes and login after an initial scan.
  addEventListener("pagehide", () => { observer.disconnect(); clearInterval(poll); clearTimeout(timer); });
})();
