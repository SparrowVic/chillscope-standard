export function openLocalStorage(document: Document): Storage | undefined {
  try {
    return document.defaultView?.localStorage;
  } catch {
    return undefined;
  }
}

export function readJson(storage: Storage | undefined, key: string): unknown {
  try {
    const stored = storage?.getItem(key);
    return stored === null || stored === undefined ? undefined : JSON.parse(stored);
  } catch {
    return undefined;
  }
}

export function writeJson(storage: Storage | undefined, key: string, value: unknown): boolean {
  if (storage === undefined) {
    return false;
  }
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
