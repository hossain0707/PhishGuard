(() => {
  const api = globalThis.browser || globalThis.chrome;
  const documentId = crypto.randomUUID();
  let signature = "",
    timer;
  let recentScans = [];
  async function scan() {
    const data = {
      inputCount: document.querySelectorAll('input[type="password"]').length,
      formCount: document.forms.length,
      iframeCount: document.querySelectorAll("iframe").length,
      crossOriginPasswordForm: [...document.forms].filter((form) => {
        if (!form.querySelector('input[type="password"]')) return false;
        try { return new URL(form.action || location.href, location.href).origin !== location.origin; }
        catch { return false; }
      }).length,
    };
    const next = JSON.stringify([location.href, data]);
    if (next === signature) return;
    // Bounded rolling budget: monitoring resumes after the window rather than stopping forever.
    const now = Date.now();
    recentScans = recentScans.filter((timestamp) => now - timestamp < 600000);
    if (recentScans.length >= 100) return;
    signature = next;
    recentScans.push(now);
    try {
      const response = await api.runtime.sendMessage({ type: "ANALYZE_PAGE", data, documentId });
      if (response?.stale) signature = "";
    } catch {
      /* Browser unloading the document or extension update. */
    }
  }
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(scan, 750);
  };
  scan();
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["type"],
  });
  const poll = setInterval(scan, 5000); // Also catches SPA URL changes and login after an initial scan.
  addEventListener("pagehide", () => {
    observer.disconnect();
    clearInterval(poll);
    clearTimeout(timer);
  });
})();
