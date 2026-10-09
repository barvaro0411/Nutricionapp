export function createAsyncCache<T>(maximum = 120, ttlMs = 6 * 3600000, now = Date.now) {
  const values = new Map<string, { value: T; until: number }>();
  const pending = new Map<string, Promise<T>>();
  return async (key: string, load: () => Promise<T>): Promise<T> => {
    const cached = values.get(key);
    if (cached && cached.until > now()) return cached.value;
    const running = pending.get(key); if (running) return running;
    const task = load().then(value => {
      if (values.size >= maximum) values.delete(values.keys().next().value!);
      values.set(key, { value, until: now() + ttlMs }); return value;
    });
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  };
}
