// Shared Leaflet marker icons.
//
// Leaflet's default marker images break under Vite bundling (URLs resolve
// relative to node_modules and 404), so we use divIcon with inline SVG pins —
// this also lets us color-code the pickup (green) vs delivery (red) markers.

import L from 'leaflet';

const SVG_PIN = (color) => `
  <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 1C7.27 1 1 7.27 1 15c0 9.1 12.4 24.6 13.2 25.7.5.6 1.1.6 1.6 0C16.6 39.6 29 24.1 29 15 29 7.27 22.73 1 15 1z"
      fill="${color}" stroke="#ffffff" stroke-width="2"/>
    <circle cx="15" cy="15" r="6" fill="#ffffff"/>
  </svg>`;

export const pickupIcon = new L.divIcon({
  className: '',
  html: SVG_PIN('#2D5A38'),
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -36]
});

export const deliveryIcon = new L.divIcon({
  className: '',
  html: SVG_PIN('#C0392B'),
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [0, -36]
});