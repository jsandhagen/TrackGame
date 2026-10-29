import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

// Keep a synchronous snapshot for the simulation and serialize native writes. `legacy` also reads
// careers saved under the prototype keys, for the first slot only.
export async function createPersistence(key, { legacy = true } = {}) {
  let snapshot = null;
  let queue = Promise.resolve();
  let writeError = null;
  const native = Capacitor.isNativePlatform();
  if (native) {
    try {
      snapshot = (await Preferences.get({ key })).value;
    } catch (error) {
      throw new Error("Native saves are unavailable. Restart before playing.", {
        cause: error,
      });
    }
  }
  if (!snapshot) {
    try {
      snapshot = localStorage.getItem(key) || (legacy ? localStorage.getItem("ring-sector-club-coach-v3") || localStorage.getItem("ring-sector-club-v2") : null);
    } catch {}
  }
  return {
    read: () => snapshot,
    async flush() {
      await queue;
      if (writeError) throw writeError;
    },
    // Empty the slot everywhere it is kept.
    async clear() {
      snapshot = null;
      await queue;
      try {
        localStorage.removeItem(key);
      } catch {}
      if (native) await Preferences.remove({ key });
    },
    write(value) {
      snapshot = value;
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        if (!native) throw error;
      }
      if (native)
        queue = queue
          .then(async () => {
            await Preferences.set({ key, value });
            writeError = null;
          })
          .catch((error) => {
            writeError = error;
            console.error("Native save failed", error);
            window.dispatchEvent(new Event("save-error"));
          });
      return queue;
    },
  };
}
