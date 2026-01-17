
import React from 'react';
import { AlertTriangle, MapPin, Phone, ShieldCheck, Zap, Globe, CheckCircle2, Navigation2, Watch, Signal, Target } from 'lucide-react';
import { AppState, WearableDevice } from '../types';

interface DashboardProps {
  onTriggerSOS: () => void;
  setAppState: (state: AppState) => void;
  lastDispatchSuccess?: boolean;
  pairedWearables?: WearableDevice[];
}

const Dashboard: React.FC<DashboardProps> = ({ onTriggerSOS, setAppState, lastDispatchSuccess, pairedWearables = [] }) => {
  const connectedWearables = pairedWearables.filter(w => w.status === 'CONNECTED');

  const colorStyles: Record<string, string> = {
    green: 'bg-green-500/20 text-green-400 border-green-500/30 group-hover:glow-green',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 group-hover:glow-cyan',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30 group-hover:glow-purple',
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30 group-hover:glow-blue',
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-20 animate-in fade-in zoom-in duration-1000">
      <div className="text-center px-2">
        <div className="flex flex-col items-center space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-[0_0_10px_rgba(0,229,255,0.1)]">
              <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[8px] sm:text-[10px] font-black text-cyan-400 uppercase tracking-widest">RSA Satellite Node: Synchronized</span>
            </div>
            {connectedWearables.length > 0 && (
              <div className="inline-flex items-center space-x-2 bg-purple-500/10 border border-purple-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                <Watch className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
                <span className="text-[8px] sm:text-[10px] font-black text-purple-400 uppercase tracking-widest">{connectedWearables.length} Peripheral Link</span>
              </div>
            )}
            {lastDispatchSuccess && (
              <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.1)] animate-in bounce-in">
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-400" />
                <span className="text-[8px] sm:text-[10px] font-black text-green-400 uppercase tracking-widest">Last Comms: Relayed</span>
              </div>
            )}
          </div>
        </div>
        
        <h2 className="text-3xl sm:text-5xl font-orbitron font-black mb-2 tracking-tighter holo-text">
          TERMINAL <span className="text-cyan-400">ACTIVE</span>
        </h2>
        <p className="text-gray-500 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.4em]">Integrated Space Safety Grid • Alpha 8.2</p>
      </div>

      <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8 relative">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
           <div className="w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] border border-cyan-500/20 rounded-full animate-ping"></div>
           <div className="w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] border border-cyan-500/10 rounded-full absolute animate-[ping_4s_infinite]"></div>
        </div>

        <div className="relative group">
          <div className="absolute inset-0 bg-red-600 blur-[80px] sm:blur-[100px] opacity-10 group-hover:opacity-30 transition-opacity rounded-full"></div>
          <button 
            onClick={onTriggerSOS}
            className="relative w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-red-600 via-red-800 to-black rounded-full border-[6px] sm:border-[10px] border-red-500/40 shadow-[0_0_50px_rgba(255,23,68,0.3)] sm:shadow-[0_0_80px_rgba(255,23,68,0.5)] pulse-red flex flex-col items-center justify-center space-y-2 sm:space-y-4 hover:scale-105 transition-all active:scale-95 z-10 overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 to-transparent"></div>
            <AlertTriangle className="w-12 h-12 sm:w-20 sm:h-20 text-white relative z-10" />
            <span className="text-2xl sm:text-4xl font-orbitron font-black tracking-[0.2em] text-white relative z-10">S.O.S</span>
          </button>
        </div>
        <div className="flex flex-col items-center space-y-2 relative z-20">
          <div className="flex items-center space-x-2 text-red-500">
             <Target className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
             <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] animate-pulse">
               Hold for 3s to Auto-Dispatch
             </p>
          </div>
          <div className="px-3 sm:px-4 py-1 bg-red-950/40 border border-red-500/20 rounded-full">
            <p className="text-[7px] sm:text-[8px] text-red-400 font-bold uppercase tracking-[0.2em]">DIRECT LINK: SAPS 10111 / EMS 112</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 px-2">
        {[
          { icon: Navigation2, title: 'Tactical Track', desc: 'Vector Movement Tracking', state: 'LIVE_TRACKING' as AppState, color: 'green' },
          { icon: Zap, title: 'Voice Guard', desc: 'Acoustic AI Sentinel', state: 'VOICE_GUARD' as AppState, color: 'cyan' },
          { icon: Watch, title: 'Peripheral Grid', desc: 'Wearable Sync Control', state: 'WEARABLE_SYNC' as AppState, color: 'purple' },
          { icon: MapPin, title: 'Safe Havens', desc: 'Nearest Secure Nodes', state: 'SAFE_ZONES' as AppState, color: 'blue' }
        ].map((item, idx) => (
          <div 
            key={idx}
            className="glass p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-cyan-500/20 hover:border-cyan-400/50 hover:bg-cyan-500/5 transition-all group cursor-pointer relative overflow-hidden"
            onClick={() => setAppState(item.state)}
          >
            <div className="hud-corner hud-corner-tl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="hud-corner hud-corner-br opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-center space-x-4 sm:space-x-5 relative z-10">
              <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all group-hover:scale-110 ${colorStyles[item.color]}`}>
                <item.icon className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h3 className="font-orbitron font-black text-[11px] sm:text-sm uppercase tracking-widest text-white group-hover:text-cyan-400 transition-colors">
                  {item.title}
                </h3>
                <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase font-bold tracking-widest mt-0.5 sm:mt-1">
                  {item.desc}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
