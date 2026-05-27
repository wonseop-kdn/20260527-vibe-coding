// KDN 사업관리 시스템 - Service Worker
const SW_VERSION = '1.0.0';

// 예약된 알림을 메모리에 보관 (재시작 전까지)
const scheduledNotifications = new Map();

// ------------------------------------------------------------
// Install: 즉시 활성화
// ------------------------------------------------------------
self.addEventListener('install', (event) => {
  console.log('[SW] install v' + SW_VERSION);
  self.skipWaiting();
});

// ------------------------------------------------------------
// Activate: 모든 클라이언트 즉시 제어 + 예약 알림 재등록
// ------------------------------------------------------------
self.addEventListener('activate', (event) => {
  console.log('[SW] activate v' + SW_VERSION);
  event.waitUntil(
    clients.claim().then(() => checkScheduled())
  );
});

// ------------------------------------------------------------
// Message: SCHEDULE_NOTIFICATION 처리
// ------------------------------------------------------------
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SCHEDULE_NOTIFICATION') return;

  const { id, title, body, scheduledTime, icon } = data;
  if (!id || !title || !scheduledTime) return;

  // 기존 예약이 있으면 취소
  if (scheduledNotifications.has(id)) {
    clearTimeout(scheduledNotifications.get(id).timerId);
  }

  const now = Date.now();
  const delay = Math.max(0, new Date(scheduledTime).getTime() - now);

  const timerId = setTimeout(() => {
    fireNotification(id, title, body, icon);
  }, delay);

  scheduledNotifications.set(id, { timerId, title, body, scheduledTime, icon });
  console.log('[SW] Notification scheduled:', id, 'delay:', delay, 'ms');

  // 응답이 필요한 경우
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage({ ok: true, id });
  }
});

// ------------------------------------------------------------
// Notification Click: 앱 창 포커스 또는 새 창 열기
// ------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/20260527-vibe-coding/');
      }
    })
  );
});

// ------------------------------------------------------------
// Fetch: 캐싱 없이 네트워크 그대로 통과
// ------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// ------------------------------------------------------------
// Helper: 알림 표시 후 Map에서 제거
// ------------------------------------------------------------
function fireNotification(id, title, body, icon) {
  const options = {
    body: body || '',
    icon: icon || '/20260527-vibe-coding/icon-192.png',
    badge: '/20260527-vibe-coding/icon-192.png',
    tag: 'kdn-notification-' + id,
    renotify: true,
    data: { id }
  };
  self.registration.showNotification(title, options);
  scheduledNotifications.delete(id);
  console.log('[SW] Notification fired:', id);
}

// ------------------------------------------------------------
// checkScheduled: activate 시 저장된 예약 알림 재등록
// (IndexedDB 등 영구 저장소와 연동할 경우 이 함수를 확장)
// ------------------------------------------------------------
function checkScheduled() {
  const now = Date.now();
  for (const [id, entry] of scheduledNotifications.entries()) {
    const delay = Math.max(0, new Date(entry.scheduledTime).getTime() - now);
    clearTimeout(entry.timerId);
    entry.timerId = setTimeout(() => {
      fireNotification(id, entry.title, entry.body, entry.icon);
    }, delay);
    console.log('[SW] Re-scheduled notification:', id, 'delay:', delay, 'ms');
  }
}
