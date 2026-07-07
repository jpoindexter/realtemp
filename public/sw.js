/* RealTemp service worker — payload-free push (card L8).
   The push wakes us; the warning text is local. No user data transits the push service. */

self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Heat warning — RealTemp', {
      body: "Today's high crosses your threshold. Check your safe windows before heading out.",
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'realtemp-heat',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
