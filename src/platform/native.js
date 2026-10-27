import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { ScreenOrientation } from "@capacitor/screen-orientation";

export const isNativeApp = () => Capacitor.isNativePlatform();

export async function setOrientation(orientation = "auto") {
  if (!isNativeApp()) return;
  if (orientation === "auto") await ScreenOrientation.unlock();
  else if (["portrait", "landscape"].includes(orientation)) await ScreenOrientation.lock({ orientation });
}

export async function exitApp() {
  if (!isNativeApp()) return false;
  await App.exitApp();
  return true;
}

export async function initNative({ pause, back, orientation = "auto" }) {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("native-app");
  try {
    await setOrientation(orientation);
  } catch {}
  await App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) pause();
  });
  await App.addListener("backButton", () => back());
}
