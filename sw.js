/* 아파트 시세 트래킹 PWA 서비스워커 — 오프라인 캐시 */
const CACHE = "apt-tracker-v2";
const SHELL = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  // HTML(내비게이션): 네트워크 우선 → 실패 시 캐시 (최신 데이터 우선, 오프라인 대비)
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req, { cache: "no-store" }) // HTML은 항상 최신으로 (캐시 우회)
        .then((res) => { const cl = res.clone(); caches.open(CACHE).then((c) => c.put("./", cl)); return res; })
        .catch(() => caches.match(req).then((m) => m || caches.match("./")))
    );
    return;
  }
  // 그 외(CDN 스크립트·아이콘 등): 캐시 우선 → 네트워크(받으면 캐시)
  e.respondWith(
    caches.match(req).then((m) =>
      m || fetch(req).then((res) => {
        try { const cl = res.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); } catch (x) {}
        return res;
      }).catch(() => m)
    )
  );
});
