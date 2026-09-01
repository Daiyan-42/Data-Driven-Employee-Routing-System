import React from 'react';
import { useAddress } from '../../services/geocode';

/**
 * Plain-text address for a coordinate pair. Resolves instantly from the
 * localStorage geocode cache (home addresses land here when the employee pins
 * them on the map), otherwise looks it up via Photon in the background. While
 * resolving it shows a muted placeholder rather than repeating the coordinates
 * that are usually printed underneath.
 *
 * Pass `className` to style the resolved text (defaults to `text-slate-300`).
 */
export const AddressText: React.FC<{ lat?: number | null; lng?: number | null; className?: string }> = ({
  lat,
  lng,
  className,
}) => {
  const address = useAddress(lat, lng);
  if (lat == null || lng == null) return <span className="text-slate-500">No location set</span>;
  if (!address) return <span className="text-slate-500">Locating address…</span>;
  return <span className={className ?? 'text-slate-300'}>{address}</span>;
};
