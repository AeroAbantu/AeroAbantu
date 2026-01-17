
import React, { useState, useEffect } from 'react';
import { Search, Loader2, BookOpen, ExternalLink, Shield, Cpu, Activity, Info, Radio, Zap, Terminal, MapPin, Users } from 'lucide-react';
import { searchEmergencyResources } from '../geminiService';

const SafetyAdvicePanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; sources: any[] } | null>(null);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const advice = await searchEmergencyResources(searchQuery);
      setResult(advice);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-24">
      <div className="glass p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-cyan-500/30 relative overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.1)]">
        <div className="hud-corner hud-corner-tl border-cyan-500"></div>
        <div className="hud-corner hud-corner-tr border-cyan-500"></div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 space-y-4 sm:space-y-0 text-center sm:text-left">
           <div className="flex items-center space-x-4">
              <div className="p-3 sm:p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                <Terminal className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-orbitron font-black text-cyan-400 holo-text uppercase tracking-tighter leading-none mb-1">Safety Intel</h2>
                <div className="flex items-center space-x-2 justify-center sm:justify-start">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_green]"></span>
                  <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase font-black tracking-widest">AeroBantu Intelligence Node</p>
                </div>
              </div>
           </div>
           <div className="flex items-center space-x-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
              <Cpu className="w-3 h-3 text-cyan-500" />
              <span className="text-[7px] sm:text-[8px] font-mono text-cyan-500 uppercase">System Ready</span>
           </div>
        </div>
        
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors">
            <Search className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Query Node: 'Hijacking protocol', 'SAPS stations'..."
            className="w-full bg-black/40 border border-white/10 rounded-[1.5rem] sm:rounded-[1.8rem] py-4 sm:py-5 pl-12 sm:pl-14 pr-14 sm:pr-16 font-orbitron text-[10px] sm:text-xs text-white focus:outline-none focus:border-cyan-400 transition-all placeholder:text-gray-700 shadow-inner"
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-cyan-500 text-black rounded-xl sm:rounded-2xl hover:bg-cyan-400 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] active:scale-90"
          >
            {isLoading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <Zap className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </form>
      </div>

      {result ? (
        <div className="glass p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] animate-in fade-in zoom-in duration-700 border-cyan-500/20 relative">
          <div className="hud-corner hud-corner-bl border-cyan-500"></div>
          <div className="hud-corner hud-corner-br border-cyan-500"></div>
          
          <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
             <div className="flex items-center space-x-3">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                <h3 className="font-orbitron font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] text-cyan-400">Tactical Response</h3>
             </div>
             <div className="text-[7px] sm:text-[8px] font-mono text-gray-500 uppercase">Synchronized Matrix Uplink</div>
          </div>

          <div className="relative">
            <div className="absolute -left-4 top-0 w-[2px] h-full bg-gradient-to-b from-cyan-400/50 via-cyan-400/10 to-transparent"></div>
            <div className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-medium pl-2">
              {result.text}
            </div>
          </div>
          
          {result.sources.length > 0 && (
            <div className="mt-8 pt-8 border-t border-white/5">
              <h4 className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 flex items-center">
                <Shield className="w-3 h-3 mr-2 text-cyan-500" /> Grounded Intelligence Sources
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.sources.map((source, i) => (
                  <a 
                    key={i}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 sm:p-4 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all group shadow-sm"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                       <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500/50 group-hover:text-cyan-400 shrink-0" />
                       <span className="text-[9px] sm:text-[10px] font-black uppercase text-gray-300 truncate tracking-tight">{source.title}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 group-hover:text-cyan-400 transition-all shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="glass p-16 sm:p-20 rounded-[2.5rem] border-white/10 flex flex-col items-center justify-center space-y-6 opacity-60">
           <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping scale-150"></div>
              <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-400 animate-spin" />
           </div>
           <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] animate-pulse text-center">Scanning Tactical Archives...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-3 px-2 mb-2">
             <BookOpen className="w-4 h-4 text-cyan-500/50" />
             <h3 className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Rapid Command Templates</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              { label: "HIJACKING PROTOCOLS", icon: Shield, query: "Tactical response to hijacking in South Africa" },
              { label: "MEDICAL TRIAGE", icon: Activity, query: "First aid for trauma in South Africa" },
              { label: "NEAREST SAPS INFO", icon: MapPin, query: "How to contact nearest SAPS station" },
              { label: "COMMUNITY WATCH RSA", icon: Users, query: "Community safety initiatives in RSA" }
            ].map((item) => (
              <button 
                key={item.label}
                onClick={() => {
                  setQuery(item.query);
                  performSearch(item.query);
                }}
                className="glass p-5 sm:p-6 rounded-3xl border-white/5 flex items-center space-x-4 hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-all group text-left relative overflow-hidden"
              >
                <div className="p-2.5 sm:p-3 bg-white/5 rounded-xl group-hover:bg-cyan-500/10 transition-colors">
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 group-hover:text-cyan-400" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-gray-500 group-hover:text-white uppercase tracking-widest transition-colors">
                  {item.label}
                </span>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-cyan-400/10"></div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="glass p-5 sm:p-6 rounded-[2rem] border-cyan-500/20 bg-cyan-500/5 flex items-start space-x-4 sm:space-x-5 shadow-inner">
        <div className="p-2 sm:p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30 shrink-0">
          <Info className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
        </div>
        <div className="space-y-1">
          <p className="text-[9px] sm:text-[10px] text-gray-300 font-black uppercase tracking-widest">Archive Usage Protocol</p>
          <p className="text-[8px] sm:text-[9px] text-gray-500 leading-relaxed uppercase font-black tracking-tight">
            Intelligence nodes synchronize with national safety databases. If in immediate danger, do not delay—trigger the primary SOS uplink immediately.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SafetyAdvicePanel;