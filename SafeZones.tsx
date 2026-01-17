
import React, { useState, useEffect } from 'react';
import { MapPin, Shield, Activity, Phone, ExternalLink, Loader2, Info, Navigation, Globe, Search } from 'lucide-react';
import { findNearbySafePlaces } from '../geminiService';

const SafeZones: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ text: string; places: any[] } | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          fetchSafeZones(loc.lat, loc.lng);
        },
        () => {
          // Default to Joburg if denied for demo
          const loc = { lat: -26.2041, lng: 28.0473 };
          setLocation(loc);
          fetchSafeZones(loc.lat, loc.lng);
        }
      );
    }
  }, []);

  const fetchSafeZones = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const result = await findNearbySafePlaces(lat, lng);
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-20">
      <div className="glass p-8 rounded-[2.5rem] border-cyan-500/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-orbitron font-black text-cyan-400 tracking-tighter uppercase">Safe Zones</h2>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] flex items-center mt-1">
              <Globe className="w-3 h-3 mr-1 text-cyan-500" /> Regional RSA Security Grid
            </p>
          </div>
          <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/30">
            <Shield className="w-8 h-8 text-cyan-400" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping"></div>
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
            </div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest animate-pulse">Scanning Nearby Sectors...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Tactical Map Embed */}
            {location && (
              <div className="aspect-video bg-black rounded-3xl border border-cyan-500/20 overflow-hidden relative group">
                <iframe 
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  src={`https://maps.google.com/maps?q=police+station+hospital+near+${location.lat},${location.lng}&z=13&output=embed&t=m`}
                  style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(1.1) contrast(1.2)', opacity: 0.8 }}
                />
                <div className="absolute inset-0 pointer-events-none border-2 border-cyan-500/10"></div>
                <div className="absolute bottom-4 right-4 glass p-2 rounded-xl text-[8px] font-black text-cyan-400 uppercase tracking-widest flex items-center">
                  <Navigation className="w-3 h-3 mr-1" /> Vector Scan Active
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
                <Search className="w-4 h-4 text-cyan-500" />
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Detection Results</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.places.map((place: any, i: number) => (
                  <a 
                    key={i}
                    href={place.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass p-5 rounded-2xl border-white/5 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
                          {place.title.toLowerCase().includes('police') ? <Shield className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-tight line-clamp-1">{place.title}</h4>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-cyan-400" />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">RSA Secure Node</span>
                      <span className="text-[9px] font-black text-cyan-400 uppercase">View Grid</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div className="glass p-5 rounded-3xl border-cyan-500/20 bg-cyan-500/5 flex items-start space-x-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Info className="w-5 h-5 text-cyan-400 shrink-0" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Tactical Disclaimer</p>
                <p className="text-[9px] text-gray-500 leading-relaxed uppercase font-bold">
                  Safe zones are verified via satellite metadata. SAPS response times vary by sector. In extreme cases, prioritize private security hubs or high-visibility medical facilities.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SafeZones;
