import React, { useState, useEffect } from 'react';
import { Watch, Signal, Battery, RefreshCw, Smartphone, Bluetooth, CheckCircle2, AlertCircle, Info, Radio, Zap, ShieldAlert, Wifi } from 'lucide-react';
import { WearableDevice } from '../types';

interface WearableSyncProps {
  pairedDevices: WearableDevice[];
  setPairedDevices: React.Dispatch<React.SetStateAction<WearableDevice[]>>;
}

const WearableSync: React.FC<WearableSyncProps> = ({ pairedDevices, setPairedDevices }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<WearableDevice[]>([]);

  const startScan = async () => {
    setIsScanning(true);
    setScannedDevices([]);
    try {
      // Real scan via Web Bluetooth. This prompts the user and returns one selected device.
      // Note: Web Bluetooth is supported on Chrome/Edge (Android & desktop) and requires HTTPS.
      const navAny = navigator as any;
      if (!navAny.bluetooth?.requestDevice) {
        throw new Error('WEB_BLUETOOTH_UNAVAILABLE');
      }

      const btDevice = await navAny.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service'],
      });

      const id = btDevice.id || `bt-${Math.random().toString(36).slice(2, 10)}`;
      const name = btDevice.name || 'Bluetooth Device';

      // Classify device type heuristically without changing UI behavior.
      const lower = name.toLowerCase();
      const type: WearableDevice['type'] = lower.includes('watch')
        ? 'WATCH'
        : lower.includes('band') || lower.includes('fit')
          ? 'BAND'
          : 'EARPIECE';

      const candidate: WearableDevice = {
        id,
        name,
        type,
        status: 'PAIRING',
        battery: 0,
        lastSync: Date.now(),
      };

      // Best-effort battery read
      try {
        const server = await btDevice.gatt?.connect();
        const service = await server?.getPrimaryService('battery_service');
        const ch = await service?.getCharacteristic('battery_level');
        const val = await ch?.readValue();
        const pct = val ? val.getUint8(0) : 0;
        candidate.battery = pct;
        server?.disconnect();
      } catch {
        // Battery service isn't always available; keep 0.
      }

      setScannedDevices(prev => {
        if (pairedDevices.some(p => p.id === candidate.id) || prev.some(p => p.id === candidate.id)) return prev;
        return [...prev, candidate];
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanning(false);
    }
  };

  const pairDevice = (device: WearableDevice) => {
    const connected = { ...device, status: 'CONNECTED' as const };
    setPairedDevices([...pairedDevices, connected]);
    setScannedDevices(scannedDevices.filter(d => d.id !== device.id));
  };

  const unpairDevice = (id: string) => {
    setPairedDevices(pairedDevices.filter(d => d.id !== id));
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-500 pb-20">
      <div className="glass p-8 rounded-[2.5rem] border-purple-500/30">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-orbitron font-black text-purple-400 tracking-tighter uppercase">Peripheral Grid</h2>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] flex items-center mt-1">
              <Bluetooth className="w-3 h-3 mr-1 text-purple-500" /> Bluetooth LE Node Control
            </p>
          </div>
          <button 
            onClick={startScan}
            disabled={isScanning}
            className={`p-4 bg-purple-500/10 rounded-2xl border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-all ${isScanning ? 'animate-pulse' : ''}`}
          >
            {isScanning ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Signal className="w-6 h-6" />}
          </button>
        </div>

        {/* Tactical Scan Animation */}
        {isScanning && (
          <div className="relative h-48 flex items-center justify-center mb-8">
            <div className="absolute inset-0 border-2 border-dashed border-purple-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute inset-8 border border-purple-500/10 rounded-full animate-[spin_5s_linear_infinite_reverse]"></div>
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center animate-ping">
              <Wifi className="w-6 h-6 text-purple-400" />
            </div>
            <p className="absolute bottom-0 text-[10px] font-black text-purple-500 uppercase tracking-[0.3em]">Sweeping local sectors...</p>
          </div>
        )}

        {/* Paired Section */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Active Uplinks</h3>
          </div>
          
          {pairedDevices.length === 0 ? (
            <div className="p-10 text-center opacity-30 border-2 border-dashed border-white/5 rounded-3xl">
              <Smartphone className="w-12 h-12 mx-auto mb-3 text-gray-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No Peripherals Connected</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pairedDevices.map(device => (
                <div key={device.id} className="glass bg-purple-500/5 p-5 rounded-3xl border-purple-500/20 flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
                      {device.type === 'WATCH' ? <Watch className="w-6 h-6" /> : device.type === 'BAND' ? <Radio className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-orbitron font-black text-white uppercase tracking-tight">{device.name}</h4>
                      <div className="flex items-center space-x-3 mt-1">
                        <div className="flex items-center space-x-1">
                          <Battery className={`w-3 h-3 ${device.battery < 20 ? 'text-red-500 animate-pulse' : 'text-green-500'}`} />
                          <span className="text-[9px] font-mono text-gray-400">{device.battery}%</span>
                        </div>
                        <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest">Active Trigger</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => unpairDevice(device.id)}
                    className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scanned Devices */}
        {scannedDevices.length > 0 && (
          <div className="mt-8 space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Discovered Nodes</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {scannedDevices.map(device => (
                <button 
                  key={device.id}
                  onClick={() => pairDevice(device)}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white/5 rounded-xl group-hover:text-purple-400">
                      {device.type === 'WATCH' ? <Watch className="w-5 h-5" /> : device.type === 'BAND' ? <Radio className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-tight">{device.name}</h4>
                      <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Signal Strength: Optimal</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-[9px] font-black text-purple-400 uppercase tracking-widest">
                    <span>Uplink</span>
                    <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 glass p-5 rounded-3xl border-purple-500/20 bg-purple-500/5 flex items-start space-x-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Info className="w-5 h-5 text-purple-400 shrink-0" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Wearable Protocol</p>
            <p className="text-[9px] text-gray-500 leading-relaxed uppercase font-bold tracking-tight">
              Wearable integration allows for stealth SOS triggers via double-tap or voice pass-through from your peripheral. Ensure "Background Monitoring" is enabled in your device settings for 100% uptime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WearableSync;