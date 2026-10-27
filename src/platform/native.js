import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { ScreenOrientation } from "@capacitor/screen-orientation";

export async function initNative({ pause, back }) {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.classList.add("native-app");
  try {
    await ScreenOrientation.lock({ orientation: "landscape" });
  } catch {}
  await App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) pause();
  });
  await App.addListener("backButton", () => back());
}
