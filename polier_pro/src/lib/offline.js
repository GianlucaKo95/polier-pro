import { sbFetch } from "./supabase.js";

export const IDB_NAME    = "polier-pro-offline";

export const IDB_STORE   = "sync-queue";

export const IDB_VERSION = 1;

export function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, { autoIncrement: true });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function idbQueue(action, data, token) {
  const db    = await idbOpen();
  const tx    = db.transaction(IDB_STORE, "readwrite");
  const store = tx.objectStore(IDB_STORE);
  store.add({ action, data, token, ts: Date.now() });
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
}

export async function idbDrainQueue() {
  const db    = await idbOpen();
  const tx    = db.transaction(IDB_STORE, "readwrite");
  const store = tx.objectStore(IDB_STORE);
  const all   = await new Promise((res, rej) => {
    const req = store.getAll(); req.onsuccess = () => res(req.result); req.onerror = rej;
  });
  const keys = await new Promise((res, rej) => {
    const req = store.getAllKeys(); req.onsuccess = () => res(req.result); req.onerror = rej;
  });

  let synced = 0;
  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    // Ohne Token wurde bisher unauthentifiziert gesendet — die RLS-Policies
    // lehnen das immer ab, der Fehler wurde verschluckt und der Eintrag blieb
    // für immer in der Queue hängen. Ein Item ohne Token kann grundsätzlich
    // nicht mehr sicher nachgereicht werden, also verwerfen statt endlos zu
    // wiederholen.
    if (!item.token) { store.delete(keys[i]); continue; }
    try {
      let result = null;
      if (item.action === "save-bericht") {
        result = await sbFetch("tagesberichte", {
          method: "POST",
          headers: { Authorization: `Bearer ${item.token}` },
          body: JSON.stringify(item.data),
        });
      }
      if (result === null) continue; // Fehlgeschlagen: in der Queue belassen, später erneut versuchen
      store.delete(keys[i]);
      synced++;
    } catch (e) {
    }
  }
  return synced;
}
