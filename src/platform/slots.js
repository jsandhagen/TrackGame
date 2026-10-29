import { createPersistence } from "./persistence.js";

// Three career slots. Slot 0 keeps the original career key, so existing saves, the updater's
// pre-update backup and older game bundles all still find the first club.
export const SLOT_KEYS = ["ring-sector-leagues-v3", "ring-sector-leagues-v3-slot2", "ring-sector-leagues-v3-slot3"];
const ACTIVE_KEY = "ring-sector-active-slot",
  META_KEY = "ring-sector-slot-meta";

const stores = new Map();
export async function slotStore(n) {
  if (!stores.has(n)) stores.set(n, await createPersistence(SLOT_KEYS[n], { legacy: n === 0 }));
  return stores.get(n);
}
async function metaStore() {
  return createPersistence(META_KEY, { legacy: false });
}
const parse = (text) => {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

export async function activeSlot() {
  const n = Number((await createPersistence(ACTIVE_KEY, { legacy: false })).read());
  return n >= 0 && n < SLOT_KEYS.length ? n : 0;
}
export async function setActiveSlot(n) {
  const store = await createPersistence(ACTIVE_KEY, { legacy: false });
  store.write(String(n));
  await store.flush();
}
// When each slot was last saved, kept beside the careers so the save format stays as it is.
export async function touchSlot(n) {
  const store = await metaStore(),
    meta = parse(store.read()) || {};
  meta[n] = { savedAt: Date.now() };
  store.write(JSON.stringify(meta));
}
// What the menu shows for each slot: null when empty. `summarise` turns a stored career into
// a short description, or throws if it can't be read.
export async function listSlots(summarise) {
  const meta = parse((await metaStore()).read()) || {};
  return Promise.all(
    SLOT_KEYS.map(async (_, n) => {
      const text = (await slotStore(n)).read();
      if (!text) return null;
      try {
        return { n, ...summarise(JSON.parse(text)), savedAt: meta[n]?.savedAt || null };
      } catch {
        return { n, broken: true, savedAt: meta[n]?.savedAt || null };
      }
    }),
  );
}
export async function clearSlot(n) {
  await (await slotStore(n)).clear();
  const store = await metaStore(),
    meta = parse(store.read()) || {};
  delete meta[n];
  store.write(JSON.stringify(meta));
}
