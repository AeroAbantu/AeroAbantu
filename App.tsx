
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Settings as SettingsIcon, 
  MessageSquare, 
  Mic, 
  Home,
  Navigation2,
  Lock,
  MapPin,
  Watch,
  Activity,
  User as UserIcon,
  Save
} from 'lucide-react';
import { AppState, Contact, ContactCategory, LocationData, EmergencySession, WearableDevice, User } from './types';
import Dashboard from './components/Dashboard';
import ContactsPanel from './components/ContactsPanel';
import EmergencyActive from './components/EmergencyActive';
import VoiceGuard from './components/VoiceGuard';
import SafetyAdvicePanel from './components/SafetyAdvicePanel';
import LiveTracking from './components/LiveTracking';
import Starfield from './components/Starfield';
import SafeZones from './components/SafeZones';
import WearableSync from './components/WearableSync';
import Auth from './components/Auth';
import CosmoLogo from './components/CosmoLogo';
import { apiFetch } from './api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('aerobantu_session_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [appState, setAppState] = useState<AppState>(() => {
    const savedState = localStorage.getItem('aerobantu_state') as AppState;
    if (savedState === 'EMERGENCY') return 'EMERGENCY';
    return user ? 'IDLE' : 'AUTH';
  });
  
  const [secretPhrase] = useState('KEY');
  const [pairedWearables, setPairedWearables] = useState<WearableDevice[]>(() => {
    const saved = localStorage.getItem('aerobantu_wearables');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const savedContacts = localStorage.getItem('aerobantu_contacts');
    if (savedContacts) {
      try {
        return JSON.parse(savedContacts);
      } catch (e) {
        console.error("Tactical Database Read Error", e);
      }
    }
    return [
      { id: '1', name: 'SAPS (Police)', phone: '10111', email: '', category: ContactCategory.AUTHORITIES, enabled: true, priority: 0 },
      { id: '2', name: 'Emergency Medical (RSA)', phone: '112', email: '', category: ContactCategory.MEDICAL, enabled: true, priority: 1 },
      { id: '3', name: 'Netcare 911 / ER24', phone: '082911', email: '', category: ContactCategory.MEDICAL, enabled: true, priority: 2 },
      { id: '4', name: 'Primary Guardian', phone: '0821234567', email: 'guardian@example.co.za', category: ContactCategory.FAMILY, enabled: true, priority: 3 },
    ];
  });
  
  const [currentSession, setCurrentSession] = useState<EmergencySession | null>(() => {
    const saved = localStorage.getItem('aerobantu_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [lastDispatchSuccess, setLastDispatchSuccess] = useState<boolean>(false);
  const locationIntervalRef = useRef<number | null>(null);

  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    bloodType: user?.bloodType || 'N/A',
    emergencyNote: user?.emergencyNote || ''
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || '',
        bloodType: user.bloodType || 'N/A',
        emergencyNote: user.emergencyNote || ''
      });
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('aerobantu_state', appState);
    localStorage.setItem('aerobantu_contacts', JSON.stringify(contacts));
    localStorage.setItem('aerobantu_wearables', JSON.stringify(pairedWearables));
    if (currentSession) localStorage.setItem('aerobantu_session', JSON.stringify(currentSession));
    else localStorage.removeItem('aerobantu_session');
  }, [appState, currentSession, contacts, pairedWearables]);

  const handleAuthenticated = (authUser: User) => {
    setUser(authUser);
    localStorage.setItem('aerobantu_session_user', JSON.stringify(authUser));
    setAppState('IDLE');
  };

  const handleLogout = () => {
    if (appState === 'EMERGENCY') return; 
    localStorage.removeItem('aerobantu_session_user');
    setUser(null);
    setAppState('AUTH');
  };

  const saveProfileInfo = async () => {
    if (!user) return;
    const updatedUser = { ...user, ...profileForm };
    setUser(updatedUser);
    localStorage.setItem('aerobantu_session_user', JSON.stringify(updatedUser));
    const token = localStorage.getItem('aerobantu_token');
    if (token) {
      try {
        await apiFetch<{ ok: true }>(
          '/user/profile',
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            body: JSON.stringify(profileForm),
          }
        );
      } catch (e) {
        console.error('PROFILE_SYNC_FAILED', e);
      }
    }
    alert('TACTICAL_PROFILE_SYNC: Profile updated.');
  };

  const startEmergency = useCallback(async (reason?: string) => {
    if (appState === 'EMERGENCY') return;
    setLastDispatchSuccess(false);
    const session: EmergencySession = {
      id: Math.random().toString(36).substr(2, 9),
      startTime: Date.now(),
      lastLocation: null,
      isActive: true,
      reason: reason || 'Manual user trigger'
    };
    setCurrentSession(session);
    setAppState('EMERGENCY');
    if (navigator.geolocation) {
      const updateLocation = (pos: GeolocationPosition) => {
        const data: LocationData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          timestamp: pos.timestamp
        };
        setCurrentSession(prev => prev ? { ...prev, lastLocation: data } : null);
      };
      navigator.geolocation.getCurrentPosition(updateLocation);
      locationIntervalRef.current = window.setInterval(() => navigator.geolocation.getCurrentPosition(updateLocation), 10000);
    }
  }, [appState]);

  const endEmergency = useCallback(() => {
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    setCurrentSession(null);
    setAppState(user ? 'IDLE' : 'AUTH');
    localStorage.removeItem('aerobantu_state');
  }, [user]);

  const showNav = appState !== 'AUTH' && appState !== 'EMERGENCY';

  return (
    <div className="min-h-screen relative text-white selection:bg-cyan-500 selection:text-white overflow-x-hidden">
      <Starfield />
      
      {appState !== 'AUTH' && (
        <nav className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 flex justify-between items-center glass border-b border-cyan-500/30 transition-all duration-500 ${appState === 'EMERGENCY' ? 'pointer-events-none opacity-50' : 'opacity-100'}`}>
          <div className="flex items-center space-x-2">
            <CosmoLogo size={40} className="sm:w-10 sm:h-10" />
            <div className="flex flex-col">
              <h1 className="text-base sm:text-lg font-orbitron font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 leading-none holo-text">
                AEROBANTU
              </h1>
              <span className="text-[7px] font-black text-cyan-500/70 tracking-[0.3em] uppercase mt-1">RSA-GRID-8</span>
            </div>
          </div>
          
          {showNav && (
            <div className="flex items-center space-x-4">
              <button onClick={() => setAppState('IDLE')} className={`p-1.5 transition-colors ${appState === 'IDLE' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}><Home className="w-5 h-5" /></button>
              <button onClick={() => setAppState('CONTACTS')} className={`p-1.5 transition-colors ${appState === 'CONTACTS' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}><Users className="w-5 h-5" /></button>
              <button onClick={() => setAppState('SETTINGS')} className={`p-1.5 transition-colors ${appState === 'SETTINGS' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}><SettingsIcon className="w-5 h-5" /></button>
            </div>
          )}
        </nav>
      )}

      <main className={`pt-20 pb-32 px-4 max-w-4xl mx-auto relative z-10 ${appState === 'AUTH' ? 'pt-0' : ''}`}>
        {appState === 'AUTH' && <Auth onAuthenticated={handleAuthenticated} />}
        {appState === 'IDLE' && <Dashboard onTriggerSOS={() => startEmergency()} setAppState={setAppState} lastDispatchSuccess={lastDispatchSuccess} pairedWearables={pairedWearables} />}
        {appState === 'EMERGENCY' && <EmergencyActive session={currentSession} contacts={contacts} onCancel={endEmergency} onAlertsSent={() => setLastDispatchSuccess(true)} />}
        {appState === 'CONTACTS' && <ContactsPanel contacts={contacts} setContacts={setContacts} />}
        {appState === 'VOICE_GUARD' && <VoiceGuard onExit={() => setAppState('IDLE')} onSOS={(r) => startEmergency(r)} secretPhrase={secretPhrase} />}
        {appState === 'SAFETY_ADVICE' && <SafetyAdvicePanel />}
        {appState === 'LIVE_TRACKING' && <LiveTracking contacts={contacts} />}
        {appState === 'SAFE_ZONES' && <SafeZones />}
        {appState === 'WEARABLE_SYNC' && <WearableSync pairedDevices={pairedWearables} setPairedDevices={setPairedWearables} />}
        {appState === 'SETTINGS' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="glass p-6 sm:p-8 rounded-[2rem] border-cyan-500/30 relative">
              <h2 className="text-xl font-orbitron mb-6 text-cyan-400 uppercase flex items-center"><UserIcon className="w-5 h-5 mr-3" /> Tactical Bio</h2>
              <div className="space-y-4">
                <input type="text" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} placeholder="Full Name" className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-orbitron text-xs text-white" />
                <select value={profileForm.bloodType} onChange={e => setProfileForm({...profileForm, bloodType: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-orbitron text-xs text-cyan-400">
                  {['N/A', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                </select>
                <textarea value={profileForm.emergencyNote} onChange={e => setProfileForm({...profileForm, emergencyNote: e.target.value})} placeholder="Tactical Medical Notes..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 font-medium text-xs text-gray-300 min-h-[100px]" />
                <button onClick={saveProfileInfo} className="w-full py-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center space-x-2"><Save className="w-4 h-4" /> <span>Sync Profile</span></button>
              </div>
            </div>
            <div className="glass p-6 sm:p-8 rounded-[2rem] border-cyan-500/30">
               <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-500 uppercase">Node Identity</span>
                    <span className="text-xs font-orbitron font-black text-white">{user?.username}</span>
                  </div>
                  <button onClick={handleLogout} className="py-2 px-4 bg-red-600/10 border border-red-500/30 rounded-xl text-[9px] font-black text-red-500 uppercase tracking-widest">Terminate</button>
               </div>
            </div>
          </div>
        )}
      </main>

      {showNav && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 glass p-2 rounded-3xl border-cyan-500/50 z-50 max-w-[95vw]">
          <button onClick={() => setAppState('VOICE_GUARD')} className={`flex flex-col items-center p-2 transition-colors ${appState === 'VOICE_GUARD' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}><Mic className="w-5 h-5 mb-1" /><span className="text-[7px] uppercase font-black">Voice</span></button>
          <div className="w-[1px] h-6 bg-cyan-500/30"></div>
          <button onClick={() => setAppState('WEARABLE_SYNC')} className={`flex flex-col items-center p-2 transition-colors ${appState === 'WEARABLE_SYNC' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}><Watch className="w-5 h-5 mb-1" /><span className="text-[7px] uppercase font-black">Wear</span></button>
          <button onClick={() => startEmergency()} className="bg-red-600 text-white p-3 rounded-full shadow-[0_0_20px_rgba(255,23,68,0.5)] mx-2 active:scale-95 transition-all"><ShieldAlert className="w-6 h-6" /></button>
          <button onClick={() => setAppState('LIVE_TRACKING')} className={`flex flex-col items-center p-2 transition-colors ${appState === 'LIVE_TRACKING' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}><Navigation2 className="w-5 h-5 mb-1" /><span className="text-[7px] uppercase font-black">Track</span></button>
          <div className="w-[1px] h-6 bg-cyan-500/30"></div>
          <button onClick={() => setAppState('SAFETY_ADVICE')} className={`flex flex-col items-center p-2 transition-colors ${appState === 'SAFETY_ADVICE' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}><MessageSquare className="w-5 h-5 mb-1" /><span className="text-[7px] uppercase font-black">Chat</span></button>
        </div>
      )}
    </div>
  );
};

export default App;
