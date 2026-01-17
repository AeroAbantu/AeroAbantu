
import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Phone, 
  ShieldAlert, 
  Globe, 
  Navigation, 
  Mail, 
  CheckCircle2, 
  Loader2, 
  Battery, 
  Signal, 
  AlertTriangle, 
  Radio, 
  Activity, 
  Zap,
  Cpu,
  Gauge,
  Copy,
  Share2,
  Lock
} from 'lucide-react';
import { EmergencySession, Contact } from '../types';
import { generateEmergencyMessage } from '../geminiService';
import { apiFetch } from '../api';

interface EmergencyActiveProps {
  session: EmergencySession | null;
  contacts: Contact[];
  onCancel: () => void;
  onAlertsSent: () => void;
}

interface DispatchLog {
  id: string;
  contactName: string;
  target: string;
  status: 'PENDING' | 'UPLINKING' | 'GATEWAY_SYNC' | 'SENT' | 'FAILED';
  type: 'SMS' | 'EMAIL';
  timestamp: string;
}

const EmergencyActive: React.FC<EmergencyActiveProps> = ({ session, contacts, onCancel, onAlertsSent }) => {
  const [countdown, setCountdown] = useState(5);
  const [isAlertSent, setIsAlertSent] = useState(false);
  const [dispatchComplete, setDispatchComplete] = useState(false);
  const [logs, setLogs] = useState<DispatchLog[]>([]);
  const [distressMessage, setDistressMessage] = useState<string>("");
  const [confirmCallContact, setConfirmCallContact] = useState<Contact | null>(null);
  const [isGatewayActive, setIsGatewayActive] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const hasSentAlerts = useRef(false);

  useEffect(() => {
    if (countdown > 0 && !isAlertSent) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !isAlertSent && !hasSentAlerts.current) {
      dispatchEmergencyProtocol();
    }
  }, [countdown, isAlertSent, session]);

  const dispatchEmergencyProtocol = async () => {
    hasSentAlerts.current = true;
    setIsAlertSent(true);
    setIsGatewayActive(true);

    let msg = "AeroBantu SOS: Distress signal initiated. Assistance required.";
    if (session?.lastLocation) {
      try {
        msg = await generateEmergencyMessage('AeroBantu User', { 
          lat: session.lastLocation.latitude, 
          lng: session.lastLocation.longitude,
          batteryLevel: session.lastLocation.batteryLevel,
          networkType: session.lastLocation.networkType
        }, session.reason);
      } catch (e) {
        console.error("Failed to generate AI message", e);
      }
    }
    setDistressMessage(msg);

    const enabledContacts = contacts.filter(c => c.enabled);
    const initialLogs: DispatchLog[] = [];
    
    enabledContacts.forEach(contact => {
      if (contact.phone && contact.phone.trim() !== "") {
        initialLogs.push({
          id: `${contact.id}-sms`,
          contactName: contact.name,
          target: contact.phone,
          status: 'PENDING',
          type: 'SMS',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      }
      if (contact.email && contact.email.trim() !== "") {
        initialLogs.push({
          id: `${contact.id}-email`,
          contactName: contact.name,
          target: contact.email,
          status: 'PENDING',
          type: 'EMAIL',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      }
    });

    setLogs(initialLogs);

    // Mark all as uplinking while the backend dispatches
    setLogs(prev => prev.map(l => ({ ...l, status: 'UPLINKING' })));
    try {
      const r = await apiFetch<{
        ok: true;
        results: Array<{ id: string; type: 'SMS' | 'EMAIL'; ok: boolean; error?: string }>;
      }>(
        '/dispatch/alert',
        {
          method: 'POST',
          body: JSON.stringify({
            message: msg,
            contacts: enabledContacts.map(c => ({ id: c.id, name: c.name, phone: c.phone, email: c.email })),
          }),
        }
      );

      // Map backend results back to UI logs
      setLogs(prev =>
        prev.map(l => {
          const hit = r.results.find(x => x.id === l.id.split('-')[0] && x.type === l.type);
          if (!hit) return { ...l, status: 'FAILED' as const };
          return { ...l, status: hit.ok ? ('SENT' as const) : ('FAILED' as const) };
        })
      );
    } catch (e) {
      console.error('DISPATCH_FAILED', e);
      setLogs(prev => prev.map(l => ({ ...l, status: 'FAILED' })));
    }

    setIsGatewayActive(false);
    setDispatchComplete(true);
    onAlertsSent();
  };

  const copyTrackingLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
  };

  const getStatusProgress = (status: DispatchLog['status']) => {
    switch (status) {
      case 'PENDING': return '5%';
      case 'UPLINKING': return '35%';
      case 'GATEWAY_SYNC': return '70%';
      case 'SENT': return '100%';
      case 'FAILED': return '100%';
      default: return '0%';
    }
  };

  const getStatusColor = (status: DispatchLog['status']) => {
    switch (status) {
      case 'SENT': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
      case 'FAILED': return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      default: return 'bg-cyan-500 shadow-[0_0_10px_rgba(0,229,255,0.5)]';
    }
  };

  const colorStyles: Record<string, string> = {
    green: 'bg-green-500/10 border-green-500/20 text-green-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };

  const batteryLevel = session?.lastLocation?.batteryLevel;
  const batteryPctValue = batteryLevel !== undefined ? Math.round(batteryLevel * 100) : null;
  const speedValue = session?.lastLocation?.speed ? Math.round(session.lastLocation.speed * 3.6) : 0;

  return (
    <div className="space-y-6 animate-in zoom-in duration-500 relative pb-10">
      {confirmCallContact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="glass w-full max-w-sm rounded-[2rem] border-red-500/50 p-6 sm:p-8 shadow-[0_0_100px_rgba(239,68,68,0.4)] animate-in zoom-in duration-300 relative overflow-hidden text-center">
             <div className="hud-corner hud-corner-tl border-red-500"></div>
             <div className="hud-corner hud-corner-br border-red-500"></div>
            <div className="p-4 bg-red-600/20 rounded-full border border-red-500/50 inline-block mb-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-orbitron font-black text-white uppercase mb-2 holo-text">AUTHORITY CALL</h3>
            <p className="text-xs text-gray-300 mb-6 px-2">Dispatch tactical line to <span className="text-red-500 font-black">{confirmCallContact.name}</span>?</p>
            <button 
              onClick={() => { window.location.href = `tel:${confirmCallContact.phone}`; setConfirmCallContact(null); }}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(239,68,68,0.4)] active:scale-95 mb-3 transition-all"
            >
              Confirm Call
            </button>
            <button 
              onClick={() => setConfirmCallContact(null)}
              className="w-full py-3 bg-white/5 text-gray-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-red-600/10 border border-red-500/30 p-3 rounded-2xl flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Lock className="w-3 h-3 text-red-500" />
          <span className="text-[9px] font-black uppercase text-red-500 tracking-widest">Manual Stop Required</span>
        </div>
      </div>

      <div className="glass border-red-600/50 rounded-[2rem] p-6 sm:p-8 relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.1)]">
        <div className="hud-corner hud-corner-tl border-red-500"></div>
        <div className="hud-corner hud-corner-tr border-red-500"></div>
        <div className="hud-corner hud-corner-bl border-red-500"></div>
        <div className="hud-corner hud-corner-br border-red-500"></div>
        
        <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-6 text-center sm:text-left space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5">
            <div className="bg-red-600/20 p-4 rounded-2xl border border-red-500/30">
              <ShieldAlert className="w-8 h-8 text-red-500 relative z-10" />
            </div>
            <div>
              <h2 className="text-2xl font-orbitron font-black text-red-500 tracking-tighter uppercase holo-text leading-none">Broadcast Active</h2>
              <div className="flex items-center justify-center sm:justify-start space-x-2 mt-2">
                <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                <p className="text-[8px] text-gray-400 uppercase font-black tracking-[0.15em]">RSA-GATEWAY-1</p>
              </div>
            </div>
          </div>
        </div>

        {!isAlertSent ? (
          <div className="flex flex-col items-center justify-center py-6 bg-black/40 rounded-2xl border border-red-500/20 relative">
            <p className="text-[8px] font-black text-red-500/70 uppercase tracking-[0.3em] mb-4">Initial Delay Buffer</p>
            <div className="relative">
              <span className="text-6xl font-orbitron font-black text-red-500 relative holo-text">{countdown}</span>
            </div>
            <button onClick={onCancel} className="mt-6 px-6 py-2 bg-red-600/10 border border-red-500/30 rounded-full text-[8px] font-black text-red-500 uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
              Abort Protocol
            </button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/5 max-h-48 overflow-y-auto custom-scrollbar relative">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 opacity-30">
                  <Loader2 className="w-6 h-6 animate-spin mb-3 text-cyan-400" />
                  <p className="text-[8px] font-black uppercase tracking-widest">Initializing Uplink...</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex flex-col space-y-2 p-3 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {log.type === 'SMS' ? <Zap className="w-2.5 h-2.5 text-yellow-500" /> : <Mail className="w-2.5 h-2.5 text-blue-500" />}
                        <span className="text-[10px] font-black text-gray-100 uppercase truncate">{log.contactName}</span>
                      </div>
                      <span className={`text-[7px] font-mono font-black uppercase tracking-widest ${log.status === 'SENT' ? 'text-green-500' : 'text-cyan-400 animate-pulse'}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-700 ${getStatusColor(log.status)}`} style={{ width: getStatusProgress(log.status) }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {dispatchComplete && (
        <div className="glass p-6 rounded-[2rem] border-green-500/40 bg-green-500/5 animate-in slide-in-from-bottom duration-700 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="bg-green-500/20 p-3 rounded-xl border border-green-500/30">
                <Share2 className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-[12px] font-orbitron font-black text-green-400 uppercase tracking-widest holo-text">Tactical Link</h3>
                <p className="text-[8px] text-gray-400 uppercase font-black tracking-tight mt-1">Satellite tracking shared</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 bg-black/60 p-3 rounded-2xl border border-white/10 relative">
            <div className="flex-1 overflow-hidden">
              <p className="text-[7px] text-gray-500 font-black uppercase mb-1 tracking-widest">Tactical URL Signature</p>
              <p className="text-[9px] font-mono text-cyan-400 truncate tracking-tighter">
                {window.location.href}
              </p>
            </div>
            <button 
              onClick={copyTrackingLink}
              className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all flex items-center justify-center"
            >
              {showCopyFeedback ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>
        </div>
      )}

      {session?.lastLocation && (
        <div className="glass p-2 rounded-[2rem] border-cyan-500/30 bg-black/60 overflow-hidden relative group">
          <div className="absolute top-4 left-4 z-20 pointer-events-none scale-75 sm:scale-100">
            <div className="flex items-center space-x-3 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-full border border-red-500/50 shadow-2xl">
              <div className="relative">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                <div className="w-2 h-2 bg-red-600 rounded-full absolute inset-0"></div>
              </div>
              <span className="text-[10px] font-orbitron font-black text-red-500 uppercase tracking-widest holo-text">Feed</span>
            </div>
          </div>
          <div className="w-full aspect-video rounded-3xl overflow-hidden grayscale brightness-75 relative">
            <iframe 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              src={`https://maps.google.com/maps?q=${session.lastLocation.latitude},${session.lastLocation.longitude}&z=16&output=embed&t=k`}
              style={{ filter: 'invert(90%) hue-rotate(180deg) brightness(1.2)' }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: Battery, label: 'Power', value: batteryPctValue !== null ? `${batteryPctValue}%` : '---', color: batteryPctValue !== null && batteryPctValue < 20 ? 'red' : 'green' },
          { icon: Gauge, label: 'Velocity', value: `${speedValue} km/h`, color: 'yellow' },
          { icon: Signal, label: 'Signal', value: session?.lastLocation?.networkType?.toUpperCase() || 'SEARCH', color: 'cyan' }
        ].map((item, i) => (
          <div key={i} className="glass p-4 rounded-2xl border-white/10 flex flex-col items-center justify-center text-center space-y-1">
            <div className={`p-2 rounded-xl border mb-1 transition-transform ${colorStyles[item.color]}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <p className="text-[7px] text-gray-500 uppercase font-black tracking-widest">{item.label}</p>
            <p className="text-sm font-orbitron font-black text-white uppercase truncate max-w-full tracking-tighter">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="pt-4 sticky bottom-0 z-30">
        <button 
          onClick={onCancel}
          className="w-full flex items-center justify-center space-x-3 py-4 bg-black/80 backdrop-blur-2xl border border-red-500/30 hover:bg-red-600 hover:text-white transition-all rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.3em] active:scale-[0.98] shadow-2xl holo-text"
        >
          <X className="w-5 h-5" />
          <span>Cease Grid Broadcast</span>
        </button>
      </div>
    </div>
  );
};

export default EmergencyActive;
