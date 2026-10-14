// Service worker di Instagram Studio: mostra i promemoria e apre la pagina giusta al tocco.
self.addEventListener("push", (event) => {
  let dati = {};
  try {
    dati = event.data ? event.data.json() : {};
  } catch {
    dati = { corpo: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(dati.titolo || "Instagram Studio", {
      body: dati.corpo || "",
      tag: dati.tag,
      icon: "/icona-192.png",
      badge: "/icona-192.png",
      data: { url: dati.url || "/piano" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/piano", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) {
        if (new URL(f.url).origin === self.location.origin && "focus" in f) {
          f.navigate(url);
          return f.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
