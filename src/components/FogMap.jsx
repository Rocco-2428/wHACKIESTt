import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const FogMap = () => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  // Hampi Coordinates
  const START_LOCATION = [76.4600, 15.3350]; 

  useEffect(() => {
    if (mapInstance.current) return; // Prevent double load

    // Initialize Map
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors',
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
          }
        ]
      },
      center: START_LOCATION,
      zoom: 14,
    });

    mapInstance.current = map;

    // Add a simple marker to prove it's Hampi
    new maplibregl.Marker({ color: 'red' })
      .setLngLat(START_LOCATION)
      .addTo(map);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    // We use the EXACT same positioning that worked for the Red Screen
    <div 
      ref={mapContainer} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 1, // Sit on top of the beige background
        backgroundColor: '#e5e7eb' // Light gray placeholder
      }} 
    />
  );
};

export default FogMap;