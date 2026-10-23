// Cached lookup of this PC's own /24 prefix, used to decide which saved
// tunnel addresses belong to the WiFi we're on right now (issue #48).
//
// Short TTL on purpose: the whole point is that the user switches networks,
// and a stale prefix would filter out exactly the addresses we want. The
// cache only exists so a burst of callers (launch auto-connect, pin
// reconnect, the WiFi panel) share one round trip.

import { wifiHostNetwork } from '../services/api';

const TTL_MS = 10_000;

let cachedPrefix: string | null = null;
let cachedAt = 0;
let inflight: Promise<string | null> | null = null;

export const getHostPrefix = (force = false): Promise<string | null> => {
  if (!force && cachedAt && Date.now() - cachedAt < TTL_MS) {
    return Promise.resolve(cachedPrefix);
  }
  if (inflight) return inflight;
  inflight = wifiHostNetwork()
    .then((r) => {
      cachedPrefix = r?.prefix || null;
      cachedAt = Date.now();
      return cachedPrefix;
    })
    // Treat a failed probe as "unknown", which makes callers fall back to
    // trying every saved address rather than none.
    .catch(() => null)
    .finally(() => { inflight = null; });
  return inflight;
};
