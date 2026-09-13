// RouteMap — read-only Leaflet map showing a delivery route.
//
// Renders a pickup marker (green), a delivery marker (red), and a polyline of
// the road geometry returned by the AI service. If no road polyline is present
// (OSRM fallback) it draws a straight great-circle line between the two. The
// view auto-fits to cover both markers + the polyline.
//
// Props:
//   pickup    : { lat, lng, label? }
//   delivery  : { lat, lng, label? }
//   polyline  : [{ lat, lng }, ...] | null — OSRM road geometry (optional)
//   height    : px height of the map (default 220)

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { pickupIcon, deliveryIcon } from './leafletIcons';

function FitBounds({ points }) {
  const map = useMap();
  if (points && points.length) {
    // Delay so the map has mounted before fitting bounds.
    setTimeout(() => map.fitBounds(points, { padding: [24, 24], maxZoom: 14 }), 0);
  }
  return null;
}

export default function RouteMap({ pickup, delivery, polyline, height = 220 }) {
  if (!pickup || !delivery) return null;

  const markerPoints = [
    [pickup.lat, pickup.lng],
    [delivery.lat, delivery.lng]
  ];
  const linePoints = (polyline && polyline.length >= 2)
    ? polyline.map((p) => [p.lat, p.lng])
    : markerPoints;

  return (
    <div
      className="rounded-xl overflow-hidden border border-[#E5DCCF]"
      style={{ height }}
    >
      <MapContainer
        className="h-full w-full"
        style={{ height, width: '100%' }}
        center={[delivery.lat, delivery.lng]}
        zoom={10}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={markerPoints} />
        <Polyline
          positions={linePoints}
          pathOptions={{ color: '#2D5A38', weight: 4, opacity: 0.85 }}
        />
        <Marker position={markerPoints[0]} icon={pickupIcon}>
          <Popup>{pickup.label || 'Farm Pickup'}</Popup>
        </Marker>
        <Marker position={markerPoints[1]} icon={deliveryIcon}>
          <Popup>{delivery.label || 'Delivery'}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}