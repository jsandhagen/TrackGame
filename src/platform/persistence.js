import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

// Keep a synchronous snapshot for the simulation and serialize native writes.
export async function createPersistence(key) {
  let snapshot = null;
  let queue = Promise.resolve();
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
      snapshot =
        localStorage.getItem(key) ||
        localStorage.getItem("ring-sector-club-coach-v3") ||
        localStorage.getItem("ring-sector-club-v2");
    } catch {}
  }
  return {
    read: () => snapshot,
    flush: () => queue,
    write(value) {
      snapshot = value;
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        if (!native) throw error;
      }
      if (native)
        queue = queue
          .then(() => Preferences.set({ key, value }))
          .catch((error) => {
            console.error("Native save failed", error);
            window.dispatchEvent(new Event("save-error"));
          });
      return queue;
    },
  };
}
