import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
export async function exportBackup(text) {
  if (Capacitor.isNativePlatform()) {
    const file = await Filesystem.writeFile({
      path: "ring-sector-save.json",
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "Ring & Sector club backup",
      files: [file.uri],
    });
  } else {
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ring-sector-save.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
