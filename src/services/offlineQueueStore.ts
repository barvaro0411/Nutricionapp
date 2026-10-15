import { supabaseUrl, supabaseAnonKey } from "@/services/supabase";

export interface QueuedMutation {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  body: any;
  createdAt: number;
  attempts: number;
  tag?: string;
  lastAttemptAt?: number;
  error?: string;
}

const DB_NAME = "nutricion-offline";
const STORE_NAME = "mutations";
const DB_VERSION = 1;

// Memoria interna como fallback cuando indexedDB no está disponible (ej. Node / Native)
let inMemoryQueue: QueuedMutation[] = [];
let customIDBFactory: IDBFactory | null = null;

export function setCustomIDBFactory(factory: IDBFactory | null) {
  customIDBFactory = factory;
}

function getIDB(): IDBFactory | undefined {
  if (customIDBFactory) return customIDBFactory;
  if (typeof indexedDB !== "undefined") return indexedDB;
  if (typeof window !== "undefined" && window.indexedDB) return window.indexedDB;
  return undefined;
}

function openDB(): Promise<IDBDatabase> {
  const idb = getIDB();
  if (!idb) return Promise.reject(new Error("IndexedDB no disponible"));

  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("Error al abrir IndexedDB"));
  });
}

/** Agrega una mutación a la cola persistente en IndexedDB */
export async function enqueueMutation(mutation: QueuedMutation): Promise<void> {
  const idb = getIDB();
  if (!idb) {
    inMemoryQueue.push(mutation);
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(mutation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    inMemoryQueue.push(mutation);
  }
}

/** Obtiene todas las mutaciones en espera */
export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const idb = getIDB();
  if (!idb) return [...inMemoryQueue].sort((a, b) => a.createdAt - b.createdAt);

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result || []) as QueuedMutation[];
        results.sort((a, b) => a.createdAt - b.createdAt);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [...inMemoryQueue];
  }
}

/** Elimina una mutación procesada con éxito */
export async function removeQueuedMutation(id: string): Promise<void> {
  const idb = getIDB();
  if (!idb) {
    inMemoryQueue = inMemoryQueue.filter((m) => m.id !== id);
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    inMemoryQueue = inMemoryQueue.filter((m) => m.id !== id);
  }
}

/** Actualiza el estado o número de intentos de una mutación */
export async function updateQueuedMutation(mutation: QueuedMutation): Promise<void> {
  const idb = getIDB();
  if (!idb) {
    const idx = inMemoryQueue.findIndex((m) => m.id === mutation.id);
    if (idx >= 0) inMemoryQueue[idx] = mutation;
    else inMemoryQueue.push(mutation);
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(mutation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const idx = inMemoryQueue.findIndex((m) => m.id === mutation.id);
    if (idx >= 0) inMemoryQueue[idx] = mutation;
    else inMemoryQueue.push(mutation);
  }
}

/** Limpia todas las mutaciones */
export async function clearQueue(): Promise<void> {
  inMemoryQueue = [];
  const idb = getIDB();
  if (!idb) return;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignorar
  }
}

/** Actualiza el access token de Supabase en todas las mutaciones en espera */
export async function updateAccessTokens(newAccessToken: string): Promise<void> {
  const queued = await getQueuedMutations();
  for (const item of queued) {
    if (item.headers?.Authorization) {
      item.headers.Authorization = `Bearer ${newAccessToken}`;
      await updateQueuedMutation(item);
    }
  }
}

/** Solicita Background Sync al navegador */
export async function requestBackgroundSync(): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "SyncManager" in window
  ) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ("sync" in registration) {
        await (registration as any).sync.register("nutricion-offline-sync");
        return true;
      }
    } catch {
      // Fallback a sincronización en primer plano
    }
  }
  return false;
}

/** Construye una mutación auto-contenida para guardar una comida via RPC save_meal */
export function buildMealMutation(params: {
  id: string;
  accessToken: string;
  mealType: string;
  items: any[];
  imagePath?: string | null;
  notes?: string | null;
  loggedAt?: Date;
  clientRequestId?: string;
}): QueuedMutation {
  return {
    id: params.id,
    url: `${supabaseUrl}/rest/v1/rpc/save_meal`,
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: {
      p_meal_type: params.mealType,
      p_items: params.items,
      p_image_path: params.imagePath || null,
      p_notes: params.notes || null,
      p_logged_at: (params.loggedAt || new Date()).toISOString(),
      ...(params.clientRequestId ? { p_client_request_id: params.clientRequestId } : {}),
    },
    createdAt: Date.now(),
    attempts: 0,
    tag: "meal",
  };
}

/** Construye una mutación auto-contenida para registrar agua */
export function buildWaterMutation(params: {
  id: string;
  accessToken: string;
  userId: string;
  amountMl: number;
  loggedAt?: Date;
}): QueuedMutation {
  return {
    id: params.id,
    url: `${supabaseUrl}/rest/v1/water_logs`,
    method: "POST",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: {
      user_id: params.userId,
      amount_ml: params.amountMl,
      logged_at: (params.loggedAt || new Date()).toISOString(),
    },
    createdAt: Date.now(),
    attempts: 0,
    tag: "water",
  };
}
