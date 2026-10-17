// Device-local per-user archive independent from capped browser history.
const DATABASE = "phishguard-archive-v1",
  TABLE = "scans";
function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const r = indexedDB.open(DATABASE, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(TABLE)) {
        const store = r.result.createObjectStore(TABLE, { keyPath: "key" });
        store.createIndex("owner", "owner");
        store.createIndex("ownerMonth", "ownerMonth");
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function wait(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function write(operation) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(TABLE, "readwrite");
      try {
        operation(t.objectStore(TABLE));
      } catch (e) {
        t.abort();
        reject(e);
        return;
      }
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("Archive aborted"));
    });
  } finally {
    db.close();
  }
}
function entry(owner, scan) {
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(owner) || !scan.scanId)
    throw new Error("Invalid scan owner or ID");
  const date = new Date(scan.timestamp);
  if (Number.isNaN(date.valueOf())) throw new Error("Invalid timestamp");
  const month = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  return { ...scan, key: owner + ":" + scan.scanId, owner, month, ownerMonth: owner + ":" + month };
}
export async function archiveAssessment(owner, scan) {
  return write((s) => s.put(entry(owner, scan)));
}
export async function archiveExisting(owner, scans) {
  if (!scans.length) return;
  return write((s) => {
    for (const scan of scans) s.put(entry(owner, scan));
  });
}
export async function getArchivedMonth(owner, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month");
  const db = await open();
  try {
    const rows = await wait(
      db
        .transaction(TABLE, "readonly")
        .objectStore(TABLE)
        .index("ownerMonth")
        .getAll(owner + ":" + month),
    );
    return rows
      .map(({ key, owner, ownerMonth, month, ...scan }) => scan)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  } finally {
    db.close();
  }
}
export async function listArchivedMonths(owner) {
  const db = await open();
  try {
    const rows = await wait(
      db.transaction(TABLE, "readonly").objectStore(TABLE).index("owner").getAll(owner),
    );
    return [...new Set(rows.map((r) => r.month))].sort().reverse();
  } finally {
    db.close();
  }
}
async function removeByIndex(name, value) {
  return write((store) => {
    const req = store.index(name).openCursor(value);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
}
export async function deleteArchivedMonth(owner, month) {
  return removeByIndex("ownerMonth", owner + ":" + month);
}
export async function deleteArchivedOwner(owner) {
  return removeByIndex("owner", owner);
}
