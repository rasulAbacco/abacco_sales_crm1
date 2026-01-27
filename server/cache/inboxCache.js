// server/cache/inboxCache.js

const inboxCache = new Map();
const TTL = 30_000; // 30 seconds

export function getInboxCache(key) {
  const item = inboxCache.get(key);
  if (!item) return null;

  if (Date.now() - item.time > TTL) {
    inboxCache.delete(key);
    return null;
  }

  return item.data;
}

export function setInboxCache(key, data) {
  inboxCache.set(key, {
    data,
    time: Date.now(),
  });
}

export function clearInboxCacheByAccount(accountId) {
  for (const key of inboxCache.keys()) {
    if (key.startsWith(`inbox:${accountId}:`)) {
      inboxCache.delete(key);
    }
  }
}
