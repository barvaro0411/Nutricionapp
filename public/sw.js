const CACHE_NAME = "nutricion-ia-__VERSION__";
const ASSETS_TO_CACHE = __ASSETS__;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("nutricion-ia-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/index.html")));
    return;
  }
  if (!ASSETS_TO_CACHE.includes(url.pathname)) return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached ||
      fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
    )
  );
});

/* ============================================================
 * PWA Background Sync: Replay de mutaciones offline hacia Supabase
 * ============================================================ */

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("nutricion-offline", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("mutations")) {
        db.createObjectStore("mutations", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getQueuedMutationsFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readonly");
    const req = tx.objectStore("mutations").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function deleteMutationFromDB(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readwrite");
    const req = tx.objectStore("mutations").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function updateMutationInDB(db, mutation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("mutations", "readwrite");
    const req = tx.objectStore("mutations").put(mutation);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function replayOfflineMutations() {
  let db;
  try {
    db = await openOfflineDB();
  } catch (err) {
    return;
  }

  const mutations = await getQueuedMutationsFromDB(db);
  if (!mutations.length) return;

  let syncedCount = 0;
  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: JSON.stringify(mutation.body),
      });

      if (response.ok) {
        await deleteMutationFromDB(db, mutation.id);
        syncedCount++;
      } else if (response.status === 401 || response.status === 408 || response.status === 429) {
        // Token expirado o limitación: conservar en la cola
        mutation.attempts = (mutation.attempts || 0) + 1;
        mutation.lastAttemptAt = Date.now();
        await updateMutationInDB(db, mutation);
      } else if (response.status >= 400 && response.status < 500) {
        // Error de cliente irrecuperable: descartar para no bloquear la cola
        await deleteMutationFromDB(db, mutation.id);
      } else {
        // Error 5xx temporal: reintentar luego
        mutation.attempts = (mutation.attempts || 0) + 1;
        mutation.lastAttemptAt = Date.now();
        await updateMutationInDB(db, mutation);
      }
    } catch {
      // Falla de red: reintentar en el próximo evento de sincronización
      mutation.attempts = (mutation.attempts || 0) + 1;
      mutation.lastAttemptAt = Date.now();
      await updateMutationInDB(db, mutation);
      break;
    }
  }

  if (syncedCount > 0) {
    const allClients = await self.clients.matchAll({ type: "window" });
    for (const client of allClients) {
      client.postMessage({
        type: "NUTRICION_SYNC_COMPLETE",
        count: syncedCount,
      });
    }
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === "nutricion-offline-sync") {
    event.waitUntil(replayOfflineMutations());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "TRIGGER_OFFLINE_SYNC") {
    event.waitUntil(replayOfflineMutations());
  }
});
