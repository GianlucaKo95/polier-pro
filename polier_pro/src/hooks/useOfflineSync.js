import { useState, useEffect } from "react";
import { idbOpen, IDB_STORE, idbDrainQueue, idbQueue } from "../lib/offline.js";
import { lokaleNotification } from "../lib/push.js";

export function useOfflineSync(online, sbConnected) {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    idbOpen().then(db => {
      const tx    = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req   = store.count();
      req.onsuccess = () => setPending(req.result);
    }).catch(() => {});
  }, [online]);

  useEffect(() => {
    if (online && sbConnected && pending > 0) {
      setSyncing(true);
      idbDrainQueue().then(n => {
        setPending(p => Math.max(0, p - n));
        setSyncing(false);
        if (n > 0) lokaleNotification("✅ Synchronisiert", `${n} Eintrag${n > 1 ? "e" : ""} mit Supabase synchronisiert.`, "sync");
      });
    }
  }, [online, sbConnected]);

  async function speichereOffline(action, data) {
    await idbQueue(action, data);
    setPending(p => p + 1);
  }

  return { pending, syncing, speichereOffline };
}
