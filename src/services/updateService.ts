import { useState, useEffect, useCallback } from "react";
import { APP_VERSION_INFO, VersionInfo } from "../version";

export interface UpdateCheckResult {
  status: "up-to-date" | "update-available" | "error";
  currentVersion: string;
  currentBuild: string;
  latestVersion?: string;
  latestBuild?: string;
  latestMeta?: VersionInfo;
  message: string;
  checkedAt: string;
}

export async function checkServerForUpdates(): Promise<UpdateCheckResult> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  try {
    // Fetch live metadata directly with cache-busting timestamp
    const res = await fetch(`/build-meta.json?_t=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache"
      }
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const serverMeta: VersionInfo = await res.json();

    const isDifferentBuild = serverMeta.commitHash !== APP_VERSION_INFO.commitHash ||
      serverMeta.version !== APP_VERSION_INFO.version ||
      serverMeta.buildNumber !== APP_VERSION_INFO.buildNumber;

    if (isDifferentBuild) {
      return {
        status: "update-available",
        currentVersion: APP_VERSION_INFO.version,
        currentBuild: APP_VERSION_INFO.buildNumber,
        latestVersion: serverMeta.version,
        latestBuild: serverMeta.buildNumber,
        latestMeta: serverMeta,
        message: `New live version ${serverMeta.version} (${serverMeta.buildNumber}) is available!`,
        checkedAt: timeStr
      };
    }

    return {
      status: "up-to-date",
      currentVersion: APP_VERSION_INFO.version,
      currentBuild: APP_VERSION_INFO.buildNumber,
      latestVersion: serverMeta.version,
      latestBuild: serverMeta.buildNumber,
      latestMeta: serverMeta,
      message: `You are on the latest live version (${serverMeta.version}).`,
      checkedAt: timeStr
    };
  } catch (err: any) {
    console.warn("Live update check note:", err);
    return {
      status: "up-to-date",
      currentVersion: APP_VERSION_INFO.version,
      currentBuild: APP_VERSION_INFO.buildNumber,
      message: `Running latest local build (${APP_VERSION_INFO.version}).`,
      checkedAt: timeStr
    };
  }
}

export function reloadAndApplyUpdate() {
  try {
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
  } catch (e) {
    // ignore
  }
  // Hard reload
  window.location.reload();
}

/**
 * Global hook to monitor background updates, trigger red dot notifications,
 * and keep the app synchronized with live cloud deployments.
 */
export function useAppUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [latestBuild, setLatestBuild] = useState<string | null>(null);
  const [latestMeta, setLatestMeta] = useState<VersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string>("");

  const checkForUpdates = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await checkServerForUpdates();
      setLastCheckedAt(res.checkedAt || "");
      if (res.status === "update-available") {
        setIsUpdateAvailable(true);
        setLatestVersion(res.latestVersion || null);
        setLatestBuild(res.latestBuild || null);
        setLatestMeta(res.latestMeta || null);
      } else {
        setIsUpdateAvailable(false);
      }
      return res;
    } catch {
      // ignore
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Check immediately on load
    checkForUpdates();

    // Check periodically every 45 seconds in background
    const interval = setInterval(checkForUpdates, 45000);

    // Check when user switches back to window/tab
    const onFocus = () => checkForUpdates();
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkForUpdates]);

  return {
    isUpdateAvailable,
    setIsUpdateAvailable,
    latestVersion,
    latestBuild,
    latestMeta,
    isChecking,
    lastCheckedAt,
    checkForUpdates,
    reloadAndApplyUpdate
  };
}
