// public/sw.js

// 1️⃣ Listen for Push Notifications
self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();

  // 🛡️ Use waitUntil to keep the SW alive until notification is shown
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: "/logo.png", // Ensure this path is correct in your /public folder
      badge: "/badge.png", // Small icon for the OS status bar
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/inbox", // Path sent from notification.service.js
      },
    })
  );
});

// 2️⃣ Handle Notification Clicks
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = event.notification.data.url;

  // 🎯 Production Logic: Focus existing tab OR open new one
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Check if CRM tab is already open
        for (const client of clientList) {
          if (client.url.includes("/dashboard") && "focus" in client) {
            // If already open, navigate that tab to the inbox/conversation and focus
            return client.navigate(targetUrl).then((c) => c.focus());
          }
        }
        // If not open, open a new window
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
