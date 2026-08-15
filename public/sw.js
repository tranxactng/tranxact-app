// Tranxact push notification service worker.
// This file must be served from the root of the domain (e.g. app.tranxact.co/sw.js)
// so its scope covers the whole app — that's why it lives in /public, not /src.

self.addEventListener('push', (event) => {
  let data = { title: 'Tranxact', message: 'You have a new update.' };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // If the payload isn't JSON for some reason, fall back to the default above
    // rather than let the whole push silently fail.
  }

  const title = data.title || 'Tranxact';
  const options = {
    body: data.message || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses an already-open Tranxact tab if one
// exists, otherwise opens a new one — standard, expected behavior.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
