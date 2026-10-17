import { CONFIG } from "../../shared/config.js";
import { archiveAssessment, deleteArchivedOwner, deleteArchivedMonth } from "../../shared/archive.js";
import { analyze, httpUrl } from "../../shared/risk.js";
import { appendHistory, historyKey, selectMonth } from "../../shared/history.js";
import { createAuth, publicUser, credentials, check } from "../../shared/auth.js";
import { logoutSession } from "../../shared/logout.js";
const api = globalThis.browser || globalThis.chrome;
const sessionStorage = {
  async getItem(key) {
    return (await api.storage.session.get(key))[key] || null;
  },
  async setItem(key, value) {
    await api.storage.session.set({ [key]: value });
  },
  async removeItem(key) {
    await api.storage.session.remove(key);
  },
};
const ready = (async () => {
  await api.storage.session.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" });
  await api.storage.local.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" });
  // Legacy global logs have no trustworthy owner. Preserve them but never show them to a new account.
  const old = await api.storage.local.get([
    "currentUser",
    "visitLog",
    "monthlyReportLog",
    "legacyHistory",
  ]);
  if (!old.legacyHistory && (old.visitLog?.length || old.monthlyReportLog?.length)) {
    await api.storage.local.set({
      legacyHistory: { visitLog: old.visitLog || [], monthlyReportLog: old.monthlyReportLog || [] },
    });
  }
  await api.storage.local.remove(["currentUser", "visitLog", "monthlyReportLog", "lastResult"]);
  return createAuth(CONFIG, sessionStorage, true);
})();
// One writer prevents lost scans and refresh-token races across tabs.
let queue = Promise.resolve();
const serial = (task) => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};
const root = api.runtime.getURL("");
// Guest assessments stay on-device and never share signed-in account history.
const GUEST_ID = "guest";
async function optionalUser(client) {
  try {
    return await user(client);
  } catch {
    // An unavailable authentication server must not disable local risk assessment.
    return null;
  }
}
const ownerId = (current) => current?.id || GUEST_ID;
function trusted(sender) {
  return (
    sender.id === api.runtime.id && typeof sender.url === "string" && sender.url.startsWith(root)
  );
}
async function user(client) {
  const { data, error } = await client.auth.getSession();
  check(error);
  return data.session?.user || null;
}
async function requireUser(client) {
  const current = await user(client);
  if (!current) throw new Error("Please log in to access your dashboard.");
  return current;
}
async function registerBrowser(client, current) {
  if (
    api.runtime.getManifest().browser_specific_settings?.gecko &&
    !(await api.permissions
      .contains({ data_collection: ["technicalAndInteraction"] })
      .catch(() => false))
  ) {
    return "Optional browser registration is disabled. You can enable it from your profile; local monitoring remains available.";
  }
  const stored = await api.storage.local.get("installationId");
  const installationId = stored.installationId || crypto.randomUUID();
  if (!stored.installationId) await api.storage.local.set({ installationId });
  const browserType = /Firefox/.test(navigator.userAgent)
    ? "Firefox"
    : /Edg\//.test(navigator.userAgent)
      ? "Edge"
      : "Chrome";
  const { error } = await client.from("extension_sessions").upsert(
    {
      user_id: current.id,
      installation_id: installationId,
      browser_type: browserType,
      extension_version: CONFIG.VERSION,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "user_id,installation_id" },
  );
  return error
    ? "Browser registration could not be saved. Local monitoring remains available; check database setup."
    : "";
}
async function state(client) {
  const current = await optionalUser(client);
  const owner = ownerId(current);
  const preferences = await api.storage.local.get({ theme: "dark", dashboardClear: {} });
  const log = (await api.storage.local.get(historyKey(owner)))[historyKey(owner)] || [];
  const notice = (await api.storage.session.get("historyNotice")).historyNotice || (await api.storage.session.get("archiveNotice")).archiveNotice || "";
  return {
    user: publicUser(current),
    theme: preferences.theme,
    log,
    dashboardSince: preferences.dashboardClear[owner] || "",
    guestMode: !current,
    version: CONFIG.VERSION,
    notice,
  };
}
async function analyzePage(client, message, sender) {
  if (sender.id !== api.runtime.id || !sender.tab || sender.frameId !== 0 || !httpUrl(sender.url))
    throw new Error("Invalid scan source");
  const current = await optionalUser(client);
  const owner = ownerId(current);
  // Browser-provided sender URL is authoritative, never a hostname supplied by the page.
  const actualTab = await api.tabs.get(sender.tab.id);
  if (actualTab.url !== sender.url) return { stale: true };
  const result = {
    ...analyze(sender.url, message.data || {}),
    timestamp: new Date().toISOString(),
    scanId: `${sender.tab.id}:${sender.documentId || message.documentId || "document"}`,
  };
  const key = historyKey(owner);
  const previous = (await api.storage.local.get(key))[key] || [];
  try {
    await api.storage.local.set({ [key]: appendHistory(previous, result) });
    await api.storage.session.remove("historyNotice");
  } catch {
    await api.storage.session.set({
      historyNotice:
        "Local history could not be saved. Storage may be full. Monitoring and risk redirects still operate; export or erase old history.",
    });
  }
  // Persist an independent monthly history without delaying the warning when storage fails.
  try { await archiveAssessment(owner, result); }
  catch { await api.storage.session.set({ archiveNotice: "Monthly archive unavailable; check device storage." }); }
  const tabKey = `tab:${sender.tab.id}`;
  const entries = await api.storage.session.get([tabKey, `exception:${sender.tab.id}`]);
  await api.storage.session.set({
    [tabKey]: { ...result, userId: owner, target: sender.url },
  });
  const exception = entries[`exception:${sender.tab.id}`];
  const allowed =
    result.threatLevel === "MEDIUM" &&
    exception?.userId === owner &&
    exception.target === sender.url &&
    exception.expires > Date.now();
  if (result.score > 30 && !allowed) {
    const token = crypto.randomUUID();
    await api.storage.session.set({
      [`warning:${sender.tab.id}`]: { token, target: sender.url, result, userId: owner },
    });
    // Check again after storage I/O so a slow scan never replaces a newer navigation.
    if ((await api.tabs.get(sender.tab.id)).url === sender.url)
      await api.tabs.update(sender.tab.id, { url: api.runtime.getURL(`warning.html?id=${token}`) });
  }
  return { result };
}
async function handle(message, sender) {
  const client = await ready;
  if (message?.type === "ANALYZE_PAGE") return analyzePage(client, message, sender);
  if (!trusted(sender)) throw new Error("This operation is only available to extension pages.");
  switch (message?.type) {
    case "AUTH_LOGIN": {
      const { data, error } = await client.auth.signInWithPassword(credentials(message));
      check(error);
      if (!data.user.email_confirmed_at) {
        await client.auth.signOut({ scope: "local" });
        throw new Error("Verify your email before logging in.");
      }
      const notice = await registerBrowser(client, data.user);
      return { user: publicUser(data.user), notice };
    }
    case "AUTH_SIGNUP": {
      const values = credentials(message);
      if (values.password.length < 12)
        throw new Error("Use a password with at least 12 characters.");
      const name = String(message.name || "")
        .trim()
        .slice(0, 100);
      if (!name) throw new Error("Enter your name.");
      const { error } = await client.auth.signUp({
        ...values,
        options: {
          data: { full_name: name },
          ...(CONFIG.WEBSITE_URL ? { emailRedirectTo: CONFIG.WEBSITE_URL } : {}),
        },
      });
      check(error);
      await client.auth.signOut({ scope: "local" });
      return {
        notice:
          "If registration is available for this email, a verification message will be sent. Verify it, then log in here.",
      };
    }
    case "AUTH_RECOVER": {
      const email = credentials({ email: message.email, password: "validation" }).email;
      const { error } = await client.auth.resetPasswordForEmail(
        email,
        CONFIG.WEBSITE_URL ? { redirectTo: CONFIG.WEBSITE_URL } : undefined,
      );
      check(error);
      return {
        notice:
          "If an account exists, check your email. Complete the reset on the website, then log in here.",
      };
    }
    case "AUTH_LOGOUT": {
      const notice = await logoutSession(
        client,
        () => api.storage.session.clear(),
        async () => {
          const current = await user(client);
          if (!current) return;
          const stored = await api.storage.local.get("installationId");
          if (stored.installationId) {
            const { error } = await client
              .from("extension_sessions")
              .delete()
              .eq("user_id", current.id)
              .eq("installation_id", stored.installationId);
            check(error);
          }
        },
      );
      return { notice };
    }
    case "GET_STATE":
      return state(client);
    case "PROFILE_UPDATE": {
      await requireUser(client);
      const name = String(message.name || "").trim();
      if (!name || name.length > 100) throw new Error("Name must contain 1–100 characters.");
      const { data, error } = await client.auth.updateUser({ data: { full_name: name } });
      check(error);
      return { user: publicUser(data.user) };
    }
    case "REGISTER_BROWSER": {
      const current = await requireUser(client);
      return { notice: (await registerBrowser(client, current)) || "Browser registration saved." };
    }
    case "GET_TAB_RESULT": {
      const current = await optionalUser(client);
      const owner = ownerId(current);
      const tab = await api.tabs.get(message.tabId);
      const result = (await api.storage.session.get(`tab:${message.tabId}`))[
        `tab:${message.tabId}`
      ];
      return {
        result:
          result?.userId === owner &&
          (tab.url === result.target || tab.url?.startsWith(api.runtime.getURL("warning.html")))
            ? result
            : null,
      };
    }
    case "GET_WARNING": {
      const current = await optionalUser(client);
      const owner = ownerId(current);
      const warning = (await api.storage.session.get(`warning:${sender.tab?.id}`))[
        `warning:${sender.tab?.id}`
      ];
      if (!warning || warning.userId !== owner || warning.token !== message.token)
        throw new Error("This warning has expired. Return to the dashboard.");
      return { result: warning.result };
    }
    case "PROCEED": {
      const current = await optionalUser(client);
      const owner = ownerId(current);
      const warning = (await api.storage.session.get(`warning:${sender.tab?.id}`))[
        `warning:${sender.tab?.id}`
      ];
      if (
        !warning ||
        warning.userId !== owner ||
        warning.token !== message.token ||
        warning.result.threatLevel !== "MEDIUM"
      )
        throw new Error("This warning cannot be bypassed.");
      await api.storage.session.set({
        [`exception:${sender.tab.id}`]: {
          userId: owner,
          target: warning.target,
          expires: Date.now() + 5 * 60000,
        },
      });
      await api.tabs.update(sender.tab.id, { url: warning.target });
      return {};
    }
    case "CLEAR_DASHBOARD": {
      const current = await optionalUser(client);
      const owner = ownerId(current);
      const stored = await api.storage.local.get({ dashboardClear: {} });
      await api.storage.local.set({
        dashboardClear: { ...stored.dashboardClear, [owner]: new Date().toISOString() },
      });
      return {};
    }
    case "CLEAR_MONTH": {
      const current = await optionalUser(client);
      const key = historyKey(ownerId(current));
      const log = (await api.storage.local.get(key))[key] || [];
      const removed = new Set(selectMonth(log, message.month).map((row) => row.scanId));
      await api.storage.local.set({ [key]: log.filter((row) => !removed.has(row.scanId)) });
      await deleteArchivedMonth(ownerId(current), message.month).catch(() => {});
      return {};
    }
    case "ERASE_HISTORY": {
      const current = await optionalUser(client);
      const owner = ownerId(current);
      await api.storage.local.remove(historyKey(owner));
      await deleteArchivedOwner(owner).catch(() => {});
      const tabs = await api.storage.session.get(null);
      const keys = Object.keys(tabs).filter(
        (key) => /^(tab|warning|exception):/.test(key) && tabs[key].userId === owner,
      );
      await api.storage.session.remove(keys);
      return {};
    }
    default:
      throw new Error("Unknown request");
  }
}
api.runtime.onMessage.addListener((message, sender, respond) => {
  serial(() => handle(message, sender)).then(
    (data) => respond({ ok: true, ...data }),
    (error) => respond({ ok: false, error: error.message || "Request failed" }),
  );
  return true;
});
api.tabs.onRemoved.addListener((tabId) =>
  serial(async () =>
    api.storage.session.remove([`tab:${tabId}`, `warning:${tabId}`, `exception:${tabId}`]),
  ),
);
api.runtime.onInstalled.addListener(() => {
  ready.then(() => api.tabs.create({ url: api.runtime.getURL("auth.html") })).catch(console.error);
});
