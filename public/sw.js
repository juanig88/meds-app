// PWA + push notifications
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

self.addEventListener("push", (event) => {
  if (!event.data) return
  let data = { title: "Meds App", body: "", url: "/" }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    data.body = event.data.text()
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon.svg",
      tag: "meds-reminder",
      data: { url: data.url || "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0 && clientList[0].url) {
        clientList[0].focus()
        clientList[0].navigate(url)
      } else if (self.clients.openWindow) {
        self.clients.openWindow(url)
      }
    })
  )
})
