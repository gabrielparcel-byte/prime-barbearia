self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || 'Prime Barbearia', {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    data: { apptId: data.apptId ?? null, notifType: data.notifType ?? null }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes('index_9.html') && 'focus' in c) return c.focus(); }
      return clients.openWindow('index_9.html');
    })
  );
});
