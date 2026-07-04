export function userScopedStorageKey(baseKey: string, userId?: string) {
  return userId ? `${baseKey}.${userId}` : baseKey;
}

interface LoadUserScopedStorageParams<T> {
  storageKey: string;
  legacyKey: string;
  fallback: T;
  parse: (value: unknown) => T;
}

export function loadUserScopedStorage<T>({
  storageKey,
  legacyKey,
  fallback,
  parse,
}: LoadUserScopedStorageParams<T>): T {
  try {
    const stored = localStorage.getItem(storageKey) ?? localStorage.getItem(legacyKey);
    if (stored == null) return fallback;

    if (storageKey !== legacyKey && !localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, stored);
      localStorage.removeItem(legacyKey);
    }

    let parsed: unknown = stored;
    try {
      parsed = JSON.parse(stored);
    } catch {
      // Legacy scalar values may have been stored as plain strings.
    }

    return parse(parsed);
  } catch {
    return fallback;
  }
}
