import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Navigation2, 
  Share2, 
  Shield, 
  Activity, 
  Users, 
  Battery, 
  MapPin, 
  Gauge, 
  AlertCircle, 
  Info, 
  Wifi, 
  Radio, 
  ChevronRight,
  Target,
  Maximize2,
  Minimize2,
  Layers,
  RefreshCw,
  Clock,
  Compass,
  Crosshair,
  Signal,
  Eye,
  Zap
} from 'lucide-react';
import { Contact, LocationData } from '../types';
import { apiFetch } from '../api';

interface LiveTrackingProps {
  contacts: Contact[];
}

type TrackingMode = 'TRANSMIT' | 'RECEIVE';
type MapType = 'k' | 'm'; // k = satellite, m = roadmap

const LiveTracking: React.FC<LiveTrackingProps> = ({ contacts }) => {
  const [mode, setMode] = useState<TrackingMode>('TRANSMIT');
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [pathHistory, setPathHistory] = useState<{ lat: number; lng: number }[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [sessionID, setSessionID] = useState<string>('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinedSessionData, setJoinedSessionData] = useState<any>(null);
  const [mapType, setMapType] = useState<MapType>('k');
  const [showDetails, setShowDetails] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Ref to track last re-centered location to avoid iframe flickering
  const lastCenteredLocation = useRef<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -26.2041, lng: 28.0473 });

  // RSA Highway Limit
  const SPEED_THRESHOLD = 120;
  const RECENTER_THRESHOLD_METERS = 0.0001; // Approx 10 meters

  useEffect(() => {
    let watchId: number;

    if (isTracking && mode === 'TRANSMIT' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          // Fix: timestamp belongs to GeolocationPosition, not GeolocationCoordinates
          const { latitude, longitude, accuracy, speed } = pos.coords;
          const { timestamp } = pos;
          const speedKmh = speed ? (speed * 3.6) : 0;
          
          setCurrentSpeed(Math.max(0, speedKmh));
          
          const newLoc = {
            latitude,
            longitude,
            accuracy,
            speed,
            timestamp
          };
          
          setLocation(newLoc);

          // Update path history (max 50 points)
          setPathHistory(prev => {
            const last = prev[prev.length - 1];
            if (last && last.lat === latitude && last.lng === longitude) return prev;
            const updated = [...prev, { lat: latitude, lng: longitude }];
            return updated.slice(-50);
          });

          // Only update map center if we moved significant distance to prevent iframe flicker
          if (!lastCenteredLocation.current || 
              Math.abs(lastCenteredLocation.current.lat - latitude) > RECENTER_THRESHOLD_METERS ||
              Math.abs(lastCenteredLocation.current.lng - longitude) > RECENTER_THRESHOLD_METERS) {
            setMapCenter({ lat: latitude, lng: longitude });
            lastCenteredLocation.current = { lat: latitude, lng: longitude };
          }
          
          setIsSyncing(true);
          setTimeout(() => setIsSyncing(false), 800);

          // Push latest location to backend so others can join this session.
          // We keep the UI the same and silently use/remember a session code.
          const sid = (localStorage.getItem('aerobantu_tracking_session') || `TX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`).toUpperCase();
          localStorage.setItem('aerobantu_tracking_session', sid);
          apiFetch('/tracking/update', {
            method: 'POST',
            body: JSON.stringify({
              sessionId: sid,
              lat: latitude,
              lng: longitude,
              accuracy: accuracy || 0,
              speedKmh: speedKmh,
              battery: (newLoc as any).batteryLevel ? Math.round((newLoc as any).batteryLevel * 100) : null,
              network: (newLoc as any).networkType || null,
            }),
          }).catch(() => undefined);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );

      // Transmit mode uses real device location; receiver mode pulls real locations from backend.
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, mode, contacts]);

  const toggleTracking = () => {
    if (!isTracking) {
      setPathHistory([]);
      lastCenteredLocation.current = null;
    }
    setIsTracking(!isTracking);
  };

  const handleManualRefresh = () => {
    setIsSyncing(true);
    (async () => {
      try {
        if (mode === 'RECEIVE' && joinedSessionData) {
          const r = await apiFetch<{ ok: true; data: any }>(`/tracking/${joinedSessionData.sessionId}`);
          const d = r.data;
          setJoinedSessionData({
            ...joinedSessionData,
            speed: Math.round(d.speedKmh),
            battery: d.battery ?? joinedSessionData.battery,
            lat: d.lat,
            lng: d.lng,
            accuracy: d.accuracy,
            lastUpdate: 'Just now',
            network: d.network || joinedSessionData.network,
          });
          setMapCenter({ lat: d.lat, lng: d.lng });
        }
      } finally {
        setIsSyncing(false);
      }
    })();
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionID.trim()) return;
    
    setIsJoining(true);
    try {
      const id = sessionID.trim().toUpperCase();
      const r = await apiFetch<{ ok: true; data: any }>(`/tracking/${id}`);
      const d = r.data;
      setJoinedSessionData({
        sessionId: id,
        targetName: `Guardian Node ${id.substring(id.length - 4)}`,
        speed: Math.round(d.speedKmh),
        battery: d.battery ?? 0,
        lat: d.lat,
        lng: d.lng,
        accuracy: d.accuracy,
        lastUpdate: 'Just now',
        network: d.network || 'RSA Network'
      });
      setMapCenter({ lat: d.lat, lng: d.lng });
      setIsTracking(true);
    } catch {
      setJoinedSessionData(null);
    } finally {
      setIsJoining(false);
    }
  };

  const mapUrl = useMemo(() => {
    return `https://maps.google.com/maps?q=${mapCenter.lat},${mapCenter.lng}&z=16&output=embed&t=${mapType}`;
  }, [mapCenter, mapType]);

  // Calculate pixel positions for SVG path trace
  // At zoom 16, roughly 1 pixel = 1 meter at equator. 
  // We use the center of the iframe (50%, 50%) as the origin.
  const pathData = useMemo(() => {
    if (!location || pathHistory.length < 2) return "";
    
    const currentLat = location.latitude;
    const currentLng = location.longitude;
    
    // Width and height of the map container are roughly 100% (container size)
    // We assume 1000x1000 units for the SVG coordinate system
    const scale = 500000; // Arbitrary scale factor for lat/lng to SVG units
    
    return pathHistory.map((point, i) => {
      const dx = (point.lng - currentLng) * scale * Math.cos(currentLat * Math.PI / 180);
      const dy = (currentLat - point.lat) * scale;
      const x = 500 + dx;
      const y = 500 + dy;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(" ");
  }, [location, pathHistory]);

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-24">
      <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10 glass">
        <button 
          onClick={() => { setMode('TRANSMIT'); setIsTracking(false); setJoinedSessionData(null); }}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-orbitron font-bold text-[10px] tracking-widest uppercase transition-all ${mode === 'TRANSMIT' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-white'}`}
        >
          <Radio className="w-4 h-4" />
          <span>Transmitter</span>
        </button>
        <button 
          onClick={() => { setMode('RECEIVE'); setIsTracking(false); }}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl font-orbitron font-bold text-[10px] tracking-widest uppercase transition-all ${mode === 'RECEIVE' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-gray-500 hover:text-white'}`}
        >
          <Target className="w-4 h-4" />
          <span>Receiver</span>
        </button>
      </div>

      {mode === 'TRANSMIT' ? (
        <>
          <div className="glass p-6 rounded-3xl border-cyan-500/30 flex items-center justify-between shadow-[0_0_30px_rgba(0,229,255,0.1)]">
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-2xl ${isTracking ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'}`}>
                <Activity className={`w-8 h-8 ${isTracking ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <h2 className="text-2xl font-orbitron font-black text-cyan-400 tracking-tighter uppercase leading-none mb-1">Satellite Uplink</h2>
                <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-ping' : 'bg-red-500'}`}></span>
                  <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-gray-400">
                    {isTracking ? 'Broadcasting RSA Encrypted Stream' : 'Stationary - Offline'}
                  </p>
                </div>
              </div>
            </div>
            <button 
              onClick={toggleTracking}
              className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                isTracking 
                ? 'bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500/20' 
                : 'bg-cyan-500 text-black hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/20'
              }`}
            >
              {isTracking ? 'Cut Signal' : 'Start Stream'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-3xl border-cyan-500/20 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30"></div>
              <Gauge className={`w-12 h-12 ${currentSpeed > SPEED_THRESHOLD ? 'text-red-500 animate-bounce' : 'text-cyan-400'}`} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Velocity (GPS)</p>
                <div className="flex items-baseline justify-center space-x-2">
                  <span className={`text-5xl font-orbitron font-black ${currentSpeed > SPEED_THRESHOLD ? 'text-red-500' : 'text-white'}`}>
                    {Math.round(currentSpeed)}
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase">km/h</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 glass rounded-3xl border-cyan-500/30 overflow-hidden relative group h-[460px] cursor-crosshair shadow-[0_0_40px_rgba(0,229,255,0.1)]">
              {/* HUD OVERLAYS */}
              <div className="absolute inset-0 z-20 pointer-events-none p-4">
                <div className="flex flex-col space-y-2 items-start h-full">
                  <div className="glass p-2 px-3 rounded-xl border-cyan-500/50 flex items-center space-x-2 pointer-events-auto shadow-xl bg-black/60">
                    <Navigation2 className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-orbitron font-black text-white uppercase tracking-widest">GRID_ALPHA_RSA</span>
                  </div>
                  
                  {isTracking && showDetails && (
                    <div className="glass p-4 rounded-2xl border-white/10 bg-black/80 backdrop-blur-xl space-y-3 animate-in fade-in slide-in-from-left duration-500 min-w-[210px] pointer-events-auto shadow-2xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                        <div className="flex items-center space-x-2">
                          <Activity className="w-3 h-3 text-cyan-400" />
                          <span className="text-[9px] text-cyan-400 uppercase font-black tracking-widest">Telemetry</span>
                        </div>
                        <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                          <Minimize2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <div className="space-y-0.5">
                          <span className="text-[7px] text-gray-500 uppercase font-black block">Velocity</span>
                          <span className="text-[11px] font-orbitron font-black text-cyan-400">{Math.round(currentSpeed)} km/h</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[7px] text-gray-500 uppercase font-black block">Accuracy</span>
                          <span className="text-[11px] font-mono text-cyan-400">±{Math.round(location?.accuracy || 0)}m</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-white/5 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-gray-600 uppercase font-black">LAT</span>
                          <span className="text-[9px] font-mono text-white">{location?.latitude.toFixed(6) || '--'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] text-gray-600 uppercase font-black">LNG</span>
                          <span className="text-[9px] font-mono text-white">{location?.longitude.toFixed(6) || '--'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MAP ACTION CONTROLS */}
              <div className="absolute top-4 right-4 z-30 flex flex-col space-y-2">
                <button 
                  onClick={() => setMapType(mapType === 'k' ? 'm' : 'k')}
                  className="glass p-3 rounded-xl border-white/10 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all shadow-xl active:scale-95 cursor-pointer bg-black/60"
                >
                  <Layers className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleManualRefresh}
                  className={`glass p-3 rounded-xl border-white/10 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all shadow-xl bg-black/60 active:scale-95 ${isSyncing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="w-full h-full bg-[#02040a] relative">
                {isTracking ? (
                  <>
                    <iframe 
                      key={mapUrl}
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      src={mapUrl}
                      className="pointer-events-auto"
                      style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(1.2) contrast(1.1)', opacity: 0.9 }}
                    />
                    
                    {/* VECTOR TRACE PATH OVERLAY */}
                    <svg 
                      className="absolute inset-0 z-10 pointer-events-none" 
                      viewBox="0 0 1000 1000" 
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                        <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="rgba(0, 229, 255, 0.1)" />
                          <stop offset="100%" stopColor="rgba(0, 229, 255, 1)" />
                        </linearGradient>
                      </defs>
                      <path 
                        d={pathData} 
                        fill="none" 
                        stroke="url(#pathGradient)" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        filter="url(#glow)"
                        className="opacity-80"
                      />
                    </svg>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[11] pointer-events-none">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <div className="absolute inset-0 border-[0.5px] border-cyan-500/20 rounded-full animate-[ping_3s_infinite]"></div>
                        <div className="absolute inset-2 border border-cyan-500/10 rounded-full animate-pulse"></div>
                        <Target className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="relative">
                      <div className="w-24 h-24 border border-dashed border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Wifi className="w-10 h-10 text-cyan-500/30 animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-orbitron font-black text-cyan-500/50 uppercase tracking-[0.5em]">Establishing Uplink</h3>
                      <p className="text-[9px] text-gray-700 uppercase font-black tracking-widest">Awaiting local GPS vector lock...</p>
                    </div>
                  </div>
                )}
                
                {isSyncing && (
                  <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
                    <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(0,229,255,1)] animate-[radar-sweep_1.5s_ease-in-out_infinite]"></div>
                    <div className="absolute inset-0 bg-cyan-400/5 animate-pulse"></div>
                  </div>
                )}
                
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30 pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500/30 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500/30 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30 pointer-events-none"></div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="glass p-8 rounded-3xl border-cyan-500/30 space-y-6 shadow-[0_0_30px_rgba(0,229,255,0.1)] relative overflow-hidden">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-orbitron font-black text-cyan-400 tracking-widest uppercase holo-text">Remote Intelligence</h3>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-[0.2em]">Synchronize with External Guardian Node</p>
          </div>

          <form onSubmit={handleJoinSession} className="relative max-w-md mx-auto">
            <input 
              type="text"
              value={sessionID}
              onChange={(e) => setSessionID(e.target.value)}
              placeholder="TX-CODE-RSA"
              className="w-full bg-black/60 border border-white/10 rounded-2xl py-5 px-6 font-mono text-cyan-400 focus:outline-none focus:border-cyan-400 transition-all uppercase placeholder:text-gray-700 shadow-inner"
            />
            <button 
              type="submit"
              disabled={isJoining}
              className="absolute right-2 top-2 bottom-2 bg-cyan-500 text-black px-8 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-colors flex items-center shadow-lg shadow-cyan-500/20 disabled:opacity-50 active:scale-95"
            >
              {isJoining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <>Link <ChevronRight className="w-4 h-4 ml-1" /></>}
            </button>
          </form>
          
          {joinedSessionData && (
            <div className="glass p-6 rounded-3xl border-green-500/30 bg-green-500/5 animate-in zoom-in duration-500">
               <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                     <div className="p-3 bg-green-500/20 rounded-xl">
                        <Target className="w-6 h-6 text-green-400" />
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-white uppercase">{joinedSessionData.targetName}</h4>
                        <span className="text-[8px] text-green-500 font-black uppercase tracking-widest animate-pulse">Connection Stable</span>
                     </div>
                  </div>
                  <button onClick={() => setJoinedSessionData(null)} className="text-[8px] font-black text-gray-500 uppercase hover:text-red-500">Sever Link</button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                     <p className="text-[7px] text-gray-500 uppercase font-black">Velocity</p>
                     <p className="text-sm font-orbitron font-black text-white">{joinedSessionData.speed} km/h</p>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                     <p className="text-[7px] text-gray-500 uppercase font-black">Precision</p>
                     <p className="text-sm font-orbitron font-black text-white">±{joinedSessionData.accuracy}m</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      <div className="glass p-6 rounded-3xl border-cyan-500/20 bg-cyan-500/5 flex items-start space-x-5 shadow-inner">
        <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
          <Info className="w-6 h-6 text-cyan-400 shrink-0" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">RSA Tactical Protocol v8.2</p>
          <p className="text-[9px] text-gray-500 leading-relaxed uppercase font-bold tracking-tight">
            Map vectors are processed through regional RSA cloud gateways. Path history is stored in local volatile buffer. If the trace line jitters, calibrate your device GPS antenna in clear sky.
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes radar-sweep {
          0% { top: 0%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}} />
    </div>
  );
};

export default LiveTracking;