// Rappel du soir : reçu même quand l'app est fermée. Chargé par le service worker généré (vite.config.ts).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Billy', {
      body: data.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'rappel-soir',
    }),
  )
})

// Toucher la notification ouvre l'app sur « Noter ce qu'on a fait ».
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL('./#/noter?depuis=rappel', self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
