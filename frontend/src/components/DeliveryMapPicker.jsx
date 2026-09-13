// DeliveryMapPicker — click-to-pin delivery address picker for the buy modal.
//
// The buyer pans/zooms the map and clicks (or drags the pin) to choose exactly
// where the produce should be delivered. The chosen lat/lng is reported upward
// via onPositionChange, and also shown as a text caption.
//
// Props:
//   center          : [lat, lng] initial map center (default India)
//   markerPosition  : [lat, lng] | null — current pinned delivery point
//   onPositionChange: (lat, lng) => void
//   height          : px height of the map (default 210)

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
import { deliveryIcon } from './leafletIcons';

function ClickHandler({ onPositionChange }) {
  // Attach a one-shot click listener inside the map.
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function DeliveryMapPicker({
  center: [clat, clng] = [20.5937, 78.9629], // India
  markerPosition = null,
  onPositionChange,
  height = 210
}) {
  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onPositionChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-[#E5DCCF]" style={{ height }}>
        <MapContainer
          className="h-full w-full"
          style={{ height, width: '100%' }}
          center={markerPosition || [clat, clng]}
          zoom={5}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPositionChange={onPositionChange} />
          {markerPosition && (
            <Marker
              position={markerPosition}
              icon={deliveryIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng();
                  onPositionChange(lat, lng);
                }
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-[11px] text-[#6B7264]">
          {markerPosition
            ? `📍 Pin at ${markerPosition[0].toFixed(4)}, ${markerPosition[1].toFixed(4)}`
            : '🗺️ Click on the map to pin your delivery location'}
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2D5A38] hover:underline disabled:opacity-50"
        >
          <LocateFixed className="w-3 h-3" />
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>
    </div>
  );
}