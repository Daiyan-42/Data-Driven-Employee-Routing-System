import { useEffect, useState } from 'react';

/**
 * Reverse-geocoding helpers shared by the location picker and anywhere we
 * display coordinates (e.g. a route assignment). We use the Photon geocoder
 * (komoot) for reverse lookups: it's free, keyless, sends
 * `Access-Control-Allow-Origin: *`, and returns clean, readable fields.
 * (Nominatim's `reverse` endpoint doesn't send CORS headers, so browsers
 * silently block it — which made coordinates show where an address should.)
 *
 * Every lookup:
 *   1. checks the localStorage cache first (instant for already-pinned spots),
 *   2. aborts after 8s and falls back to the raw coordinates.
 */

const GEO_CACHE_KEY = 'map_address_cache';

const cacheKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

export const cachedAddress = (lat: number, lng: number): string | null => {
  try {
    const cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
    return cache[cacheKey(lat, lng)] ?? null;
  } catch {
    return null;
  }
};

const cacheAddress = (lat: number, lng: number, address: string) => {
  try {
    const cache = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || '{}');
    cache[cacheKey(lat, lng)] = address;
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
};

const coordinateFallback = (lat: number, lng: number) => `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/** Build a compact, readable address from Photon's properties object. */
const formatPhotonAddress = (props: Record<string, unknown>): string => {
  const parts: string[] = [];
  if (props.name && props.name !== props.street) parts.push(String(props.name));
  if (props.housenumber) parts.push(String(props.housenumber));
  if (props.street) parts.push(String(props.street));
  if (props.city || props.county) parts.push(String(props.city || props.county));
  if (props.state) parts.push(String(props.state));
  if (props.country) parts.push(String(props.country));
  return parts.filter(Boolean).join(', ').trim();
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  const cached = cachedAddress(lat, lng);
  if (cached) return cached;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
      { signal: ctrl.signal },
    );
    const data = (await res.json()) as { features?: Array<{ properties?: Record<string, unknown> }> };
    const props = data.features?.[0]?.properties;
    const address = props ? formatPhotonAddress(props) : '';
    const result = address || coordinateFallback(lat, lng);
    cacheAddress(lat, lng, result);
    return result;
  } catch {
    return coordinateFallback(lat, lng);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * React hook: resolves a coordinate pair to a plain-text address.
 * Shows the cached address immediately if available, then upgrades from
 * Nominatim in the background. Returns null until something is resolved.
 */
export const useAddress = (lat?: number | null, lng?: number | null): string | null => {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (lat == null || lng == null) {
      setAddress(null);
      return;
    }
    const cached = cachedAddress(lat, lng);
    if (cached) {
      setAddress(cached);
      return;
    }
    setAddress(null);
    let cancelled = false;
    reverseGeocode(lat, lng).then(addr => {
      if (!cancelled) setAddress(addr);
    });
    return () => { cancelled = true; };
  }, [lat, lng]);

  return address;
};
