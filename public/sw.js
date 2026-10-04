// CareSense service worker.
// Purpose: show medicine reminders as real phone notifications and handle
// taps on them. It deliberately caches NOTHING, so the app is never stale
// and no health data is stored by the worker.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function openMedicines() {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of all) {
    if ("focus" in client) {
      await client.focus();
      if ("navigate" in client) await client.navigate("/parent/medicines").catch(() => {});
      return;
    }
  }
  await self.clients.openWindow("/parent/medicines");
}

async function tellPagesToRefresh() {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  all.forEach((c) => c.postMessage({ type: "cs:refresh" }));
}

self.addEventListener("notificationclick", (event) => {
  const d = event.notification.data || {};
  event.notification.close();

  // "Taken" button on the notification: record it without opening the app.
  if (event.action === "taken" && d.medication_id) {
    event.waitUntil(
      fetch("/api/medications/log", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medication_id: d.medication_id, date: d.date, time: d.time, status: "taken" }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("log failed");
          return tellPagesToRefresh();
        })
        .catch(() => openMedicines()), // if it could not be saved, open the app so she can tap it there
    );
    return;
  }
  event.waitUntil(openMedicines());
});
