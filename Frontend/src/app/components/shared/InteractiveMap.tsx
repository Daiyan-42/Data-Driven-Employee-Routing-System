import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  center: [number, number];
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  markers?: Array<{
    position: [number, number];
    label: string;
    color?: string;
  }>;
  showRoute?: boolean;
  /**
   * Road-following path from the solver, as [lat, lng] pairs. When present and
   * `showRoute` is on, it is drawn as a solid line instead of the dashed
   * marker-to-marker guess — the actual streets the vehicle drives. Omitted or
   * null (e.g. the backend ran the haversine fallback) keeps the dashed line,
   * which is honest about being an approximation.
   */
  routeGeometry?: [number, number][] | null;
  height?: string;
  /**
   * Mount the map only once it scrolls into view. Use on pages that render
   * many route cards, so a whole list of Leaflet maps isn't downloading OSM
   * tiles at once. Off-screen cards show a lightweight placeholder instead.
   */
  lazy?: boolean;
}

const createColoredIcon = (color: string, number?: number) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: 30px; height: 30px;">
        <div style="
          position: absolute;
          inset: 0;
          background-color: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          animation: map-pulse 1.8s ease-out infinite;
          pointer-events: none;
        "></div>
        <div style="
          position: absolute;
          inset: 0;
          background-color: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid rgba(255,255,255,0.9);
          box-shadow: 0 3px 12px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        ">
          <span style="
            transform: rotate(45deg);
            color: white;
            font-weight: 700;
            font-size: 13px;
            font-family: Rajdhani, sans-serif;
            line-height: 1;
          ">${number ?? ''}</span>
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -32],
  });
};

export const InteractiveMap: React.FC<MapPickerProps> = ({
  center,
  zoom = 13,
  onLocationSelect,
  markers = [],
  showRoute = false,
  routeGeometry = null,
  height = '420px',
  lazy = false,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);
  // Eager maps mount immediately; lazy maps wait until they scroll into view.
  const [visible, setVisible] = useState(!lazy);

  useEffect(() => {
    if (!lazy || visible) return;
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Preload slightly before the card scrolls fully into view.
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy, visible]);

  useEffect(() => {
    if (!visible) return;
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(center, zoom);

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ prefix: '© OpenStreetMap contributors' }).addTo(map);

    if (onLocationSelect) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onLocationSelect(lat, lng);

        if (selectedMarkerRef.current) {
          selectedMarkerRef.current.remove();
        }
        const m = L.marker([lat, lng], {
          icon: createColoredIcon('#F59E0B'),
        }).addTo(map);
        m.bindPopup(`<div style="background:#131929;color:#e8edf5;padding:8px 12px;border-radius:8px;font-size:12px;border:1px solid rgba(255,255,255,0.1)">
          <strong style="display:block;margin-bottom:2px">Selected Location</strong>
          <span style="color:#64748b;font-family:monospace">${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
        </div>`).openPopup();
        selectedMarkerRef.current = m;
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [visible]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    markers.forEach((md, idx) => {
      const marker = L.marker(md.position, {
        icon: createColoredIcon(md.color || '#0EA5E9', idx + 1),
      }).addTo(mapInstanceRef.current!);

      marker.bindPopup(`<div style="background:#131929;color:#e8edf5;padding:8px 12px;border-radius:8px;font-size:12px;border:1px solid rgba(255,255,255,0.1)">
        <strong style="display:block;margin-bottom:2px">${md.label}</strong>
        <span style="color:#64748b;font-family:monospace">${md.position[0].toFixed(5)}, ${md.position[1].toFixed(5)}</span>
      </div>`);

      markersRef.current.push(marker);
    });
  }, [markers]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current = null; }
    if (!showRoute) return;

    // Guard against a truncated or malformed geometry rather than handing
    // Leaflet a bad LatLng and blanking the whole map.
    const road = (routeGeometry || []).filter(
      p => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]),
    );

    if (road.length > 1) {
      polylineRef.current = L.polyline(road as L.LatLngExpression[], {
        color: '#0EA5E9',
        weight: 4,
        opacity: 0.9,
      }).addTo(mapInstanceRef.current);
    } else if (markers.length > 1) {
      // No geometry — dash it, so nobody mistakes a straight hop between stops
      // for a real driving path.
      polylineRef.current = L.polyline(markers.map(m => m.position as L.LatLngExpression), {
        color: '#0EA5E9',
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 8',
      }).addTo(mapInstanceRef.current);
    }
  }, [markers, showRoute, routeGeometry, visible]);

  return (
    <div
      ref={wrapperRef}
      style={{
        height,
        width: '100%',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 0,
        position: 'relative',
      }}
    >
      {lazy && !visible ? (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <span style={{ fontSize: 20, opacity: 0.4 }}>🗺️</span>
          <span style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.02em' }}>
            Map loads when visible
          </span>
        </div>
      ) : (
        <div
          ref={mapRef}
          style={{ height: '100%', width: '100%' }}
        />
      )}
    </div>
  );
};
