'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { SensorNode } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons based on status
const createIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

const liveIcon = createIcon('#22c55e'); // Green
const staleIcon = createIcon('#eab308'); // Yellow
const offlineIcon = createIcon('#6b7280'); // Gray

export default function Map({ nodes, getFreshness }: { nodes: SensorNode[], getFreshness: (ts: string) => { label: string } }) {
  const router = useRouter();
  
  // Default center (New Delhi roughly)
  const defaultCenter: [number, number] = [28.6139, 77.2090];
  
  // If we have nodes, center on the first one
  const center: [number, number] = nodes.length > 0 && nodes[0].latitude && nodes[0].longitude 
    ? [nodes[0].latitude, nodes[0].longitude] 
    : defaultCenter;

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {nodes.map(node => {
        if (!node.latitude || !node.longitude) return null;
        const freshness = getFreshness(node.last_seen);
        const icon = freshness.label === 'LIVE' ? liveIcon : freshness.label === 'STALE' ? staleIcon : offlineIcon;
        
        return (
          <Marker 
            key={node.node_id} 
            position={[node.latitude, node.longitude]} 
            icon={icon}
            eventHandlers={{
              click: () => router.push(`/nodes/${node.node_id}`)
            }}
          >
            <Popup>
              <strong>{node.name}</strong><br />
              {node.location_name}<br />
              Status: {freshness.label}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
