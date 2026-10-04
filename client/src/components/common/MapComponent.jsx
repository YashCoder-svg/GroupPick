import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Dynamic map view controller
const ChangeView = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
      setTimeout(() => map.invalidateSize(), 300);
    }
  }, [center, zoom, map]);
  return null;
};

// Create custom crisp SVG HTML DivIcon for places
const createCustomMarkerIcon = (label, color = '#F2542D', price = null) => {
  const priceBadge = price
    ? `<div style="font-size: 11px; font-weight: 700; background: #1A1915; color: #FFFFFF; padding: 1px 5px; border-radius: 4px; margin-top: 2px;">₹${price}</div>`
    : '';
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
        <div style="background-color: ${color}; color: #FFFFFF; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; box-shadow: 0 4px 10px rgba(28,27,24,0.18); border: 2px solid #FFFFFF;">
          ${label}
        </div>
        ${priceBadge}
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
  });
};

export const MapComponent = ({
  places = [],
  route = null,
  center = [28.6139, 77.209], // Default Delhi, India
  zoom = 13,
  height = '420px',
  onSelectPlace,
}) => {
  const validPlaces = places.filter((p) => p.location?.lat && p.location?.lng);
  const mapCenter =
    validPlaces.length > 0 ? [validPlaces[0].location.lat, validPlaces[0].location.lng] : center;

  const routePolyline =
    route?.stops
      ?.map((stop) => {
        if (stop.coordinates && stop.coordinates.length === 2) {
          return [stop.coordinates[1], stop.coordinates[0]];
        }
        return null;
      })
      .filter(Boolean) || [];

  return (
    <div
      style={{ height, width: '100%' }}
      className="relative rounded-card overflow-hidden border border-line dark:border-line-dark shadow-card"
    >
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <ChangeView center={mapCenter} zoom={zoom} />
        {/* OpenStreetMap Standard Tiles (No API key required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route Polyline for Trip Pack */}
        {routePolyline.length > 1 && (
          <Polyline
            positions={routePolyline}
            pathOptions={{ color: '#F2542D', weight: 4, dashArray: '5, 8', opacity: 0.9 }}
          />
        )}

        {/* Place Markers */}
        {validPlaces.map((place, idx) => {
          const lat = place.location.lat;
          const lng = place.location.lng;
          const cost = place.costPerPerson ?? place.cost ?? null;
          const archetypeColor =
            place.archetype === 'best_overall'
              ? '#F2542D'
              : place.archetype === 'fairest_to_everyone'
              ? '#1F6F54'
              : place.archetype === 'most_budget_friendly'
              ? '#D97706'
              : '#F2542D';

          const markerIcon = createCustomMarkerIcon(idx + 1, archetypeColor, cost);

          return (
            <Marker
              key={place.id || place.optionId || idx}
              position={[lat, lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => onSelectPlace && onSelectPlace(place),
              }}
            >
              <Popup>
                <div className="p-1 space-y-1">
                  <div className="font-bold text-sm text-ink dark:text-ink-dark">
                    {place.title || place.name}
                  </div>
                  <div className="text-xs text-muted dark:text-muted-dark">
                    {place.category} &bull; {place.address || place.city}
                  </div>
                  {cost && (
                    <div className="text-xs font-semibold text-tomato">
                      {place.priceSource === 'reported' ? `₹${cost} (reported)` : `About ₹${cost} (estimated)`}
                    </div>
                  )}
                  {place.overallScore && (
                    <div className="text-xs font-medium text-forest dark:text-emerald-400">
                      Satisfaction: {place.overallScore}%
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapComponent;
