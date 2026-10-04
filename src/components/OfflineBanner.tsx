"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";

export function OfflineBanner() {
  const t = useT();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="alert" className="sticky top-0 z-30 flex items-center gap-3 bg-warn-soft px-4 py-3 text-lg text-ink">
      <WifiOff className="h-6 w-6 shrink-0 text-warn" aria-hidden />
      {t("errors.offline")}
    </div>
  );
}
