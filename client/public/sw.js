// public/sw.js
self.addEventListener("push", function (event) {
  if (!event.data) return;
  const data = event.data.json();

  self.registration.showNotification(data.title, {
    body: data.message,
    icon: "/mail_icon.png",
    badge: "/bell_icon_1.png",
    data: data.url || "/inbox",
    requireInteraction: true, // ✅ added (notification stays)
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data));
});
