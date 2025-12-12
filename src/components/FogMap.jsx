import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// Import marker icon (or use default)
import { MapPin } from 'lucide-react';

const FogMap = ({ quests }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const canvasRef = useRef(null);
  
  // Start user at Hampi (Virupaksha Temple area)
  // [Lng, Lat] format for MapLibre
  const START_LOCATION = [76.4600, 15.3350]; 

  const [visitedPath, setVisitedPath] = useState([START_LOCATION]);
  const [visibleQuests, setVisibleQuests] = useState([]);

// 1. Initialize Map
  useEffect(() => {
    // If a map already exists, don't create another one
    if (mapInstance.current) return;

    // Create the map instance
    const map = new maplibregl.Map({
      container: mapContainer.current,
      // USE OSM RASTER TILES (Reliable & Free)
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
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

    // Save to ref
    mapInstance.current = map;

    map.on('load', () => {
      drawFog();
      
      // Add a marker for the "User" (You)
      new maplibregl.Marker({ color: '#FF6D1F' })
        .setLngLat(START_LOCATION)
        .addTo(map); // Use 'map' local var, not ref, for safety here
    });

    map.on('move', drawFog);
    map.on('zoom', drawFog);
    map.on('resize', () => {
        resizeCanvas();
        drawFog();
    });
    
    resizeCanvas();

    // CLEANUP FUNCTION
    return () => {
        map.remove(); // Destroy the map
        mapInstance.current = null; // CRITICAL: Reset ref to null!
    };
  }, []);

  // 2. Track User & Update Path
  useEffect(() => {
    const interval = setInterval(() => {
        // Simulate walking around Hampi
        const newLat = START_LOCATION[1] + (Math.random() - 0.5) * 0.01;
        const newLng = START_LOCATION[0] + (Math.random() - 0.5) * 0.01;
        
        const newPoint = [newLng, newLat];

        setVisitedPath(prev => [...prev, newPoint]);
        checkQuestProximity(newPoint);
        drawFog();
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [quests]); 

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = mapContainer.current;
    if (canvas && container) {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }
  };

  const drawFog = () => {
    const map = mapInstance.current;
    const canvas = canvasRef.current;
    if (!map || !canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // A. Reset & Fill Fog
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(34, 34, 34, 0.95)'; // Dark Grey Fog
    ctx.fillRect(0, 0, width, height);

    // B. Punch Holes (Eraser Mode)
    ctx.globalCompositeOperation = 'destination-out';

    visitedPath.forEach(coord => {
        const screenPoint = map.project(coord);
        
        // Larger radius for better visibility
        const radius = 80; 
        const gradient = ctx.createRadialGradient(
            screenPoint.x, screenPoint.y, 15,
            screenPoint.x, screenPoint.y, radius
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Clear center
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Foggy edge

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPoint.x, screenPoint.y, radius, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
  };

  const checkQuestProximity = (userLoc) => {
    if(!quests) return;
    const detectionRange = 0.005; // ~500 meters

    const found = quests.filter(q => {
        // Safe check for missing coordinates
        if (!q.lat || !q.lng) return false;

        const distLat = Math.abs(q.lat - userLoc[1]);
        const distLng = Math.abs(q.lng - userLoc[0]);
        return (distLat < detectionRange && distLng < detectionRange);
    });

    setVisibleQuests(prev => {
        const ids = new Set(prev.map(p => p.id));
        const newFinds = found.filter(f => !ids.has(f.id));
        
        // If we found a NEW quest, add a marker to the map
        newFinds.forEach(quest => {
            const el = document.createElement('div');
            el.className = 'w-8 h-8 bg-brand-accent rounded-full border-2 border-white flex items-center justify-center text-xl shadow-lg animate-bounce';
            el.innerText = '📍';
            
            new maplibregl.Marker({ element: el })
                .setLngLat([quest.lng, quest.lat])
                .setPopup(new maplibregl.Popup().setHTML(`<b style="color:black">${quest.name}</b><br/><span style="color:black">+${quest.xp} XP</span>`))
                .addTo(mapInstance.current);
        });

        return [...prev, ...newFinds];
    });
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 z-0 bg-gray-200" />
      <canvas ref={canvasRef} className="absolute inset-0 z-10 pointer-events-none" />
      
      <div className="absolute top-24 left-6 z-20 bg-white/90 backdrop-blur p-4 rounded-xl shadow-xl border border-white/50">
         <h2 className="font-bold text-brand-dark text-lg">Quests Unlocked</h2>
         <div className="text-3xl font-black text-brand-accent">{visibleQuests.length} / {quests?.length || 0}</div>
         <p className="text-xs text-gray-500 mt-1">Walk around Hampi to reveal map!</p>
      </div>
    </div>
  );
};

export default FogMap;