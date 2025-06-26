// src/components/MiniMap.jsx
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MiniMap.css'; // We'll create this file next

// Define initial settings for the map
const INITIAL_CENTER = [42.5, 12.5];
const INITIAL_ZOOM = 5;

/**
 * A controller component to programmatically change the map's view.
 * It will fly to the bounds of the provided feature.
 */
const MapController = ({ feature }) => {
  const map = useMap();

  useEffect(() => {
    if (feature?.geometry) {
      // If there's a feature with geometry, calculate its bounds
      const bounds = L.geoJSON(feature).getBounds();
      if (bounds.isValid()) {
        // Fly to the bounds of the feature with some padding
        map.flyToBounds(bounds, { padding: L.point(40, 40), duration: 0.75 });
      }
    } else {
      // If no feature (e.g., "Italia" view), reset to the national view
      map.flyTo(INITIAL_CENTER, INITIAL_ZOOM, { duration: 0.75 });
    }
  }, [feature, map]);

  return null; // This component does not render anything
};

const MiniMap = ({ feature, backgroundGeoData }) => {
  if (!backgroundGeoData) {
    return <div className="minimap-loading">Caricamento mappa...</div>;
  }

  // A key that changes when the feature changes, to force re-render of GeoJSON if needed
  const featureKey = feature?.properties?.DEN_PCM || feature?.properties?.DEN_REG || 'italia';

  return (
    <div className="minimap-container">
      <MapContainer
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        // Disable all user interactions to make it a static "viewfinder"
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        tap={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Layer 1: The background map of all of Italy (e.g., all regions) */}
        <GeoJSON
          key="background-map"
          data={backgroundGeoData}
          style={() => ({
            fillColor: '#424242', // Dark grey fill
            weight: 1,
            color: '#757575', // Lighter grey border
            fillOpacity: 0.8,
          })}
          interactive={false} // Make it non-clickable
        />

        {/* Layer 2: The highlighted feature, drawn on top */}
        {feature?.geometry && (
          <GeoJSON
            key={featureKey}
            data={feature}
            style={() => ({
              fillColor: '#3f51b5', // Primary color from your screenshot
              weight: 2,
              color: '#ffffff',     // White border to stand out
              fillOpacity: 0.7,
            })}
            interactive={false}
          />
        )}

        {/* The component that controls the zoom and pan */}
        <MapController feature={feature} />
      </MapContainer>
    </div>
  );
};

export default MiniMap;