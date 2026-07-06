import React, { useEffect, useRef } from 'react';
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
  height?: string;
}

const createColoredIcon = (color: string, number?: number) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid rgba(255,255,255,0.9);
        box-shadow: 0 3px 12px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
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
  height = '420px',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(center, zoom);

    mapInstanceRef.current = map;

    // CartoDB dark tiles for travel feel
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ prefix: '© OSM · CartoDB' }).addTo(map);

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
  }, []);

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

    if (showRoute && markers.length > 1) {
      const positions = markers.map(m => m.position as L.LatLngExpression);
      polylineRef.current = L.polyline(positions, {
        color: '#0EA5E9',
        weight: 3,
        opacity: 0.8,
        dashArray: '8, 8',
      }).addTo(mapInstanceRef.current);
    }
  }, [markers, showRoute]);

  return (
    <div
      ref={mapRef}
      style={{
        height,
        width: '100%',
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        zIndex: 0,
      }}
    />
  );
};
