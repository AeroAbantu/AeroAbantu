
import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  Loader2, 
  ChevronRight, 
  Cpu, 
  CheckSquare, 
  Square, 
  Mail, 
  ShieldCheck, 
  KeyRound, 
  ShieldAlert, 
  Fingerprint,
  RefreshCw,
  ArrowLeft,
  Terminal,
  Eye,
  EyeOff,
  Star
} from 'lucide-react';
import { User } from '../types';
import CosmoLogo from './CosmoLogo';
import { apiFetch, ApiError } from '../api';

interface AuthProps {
  onAuthenticated: (user: User) => void;
}

type AuthStep = 'MAIN' | 'VERIFY_ACCOUNT' | 'LOGIN_OTP' | 'RECOVERY_OTP' | 'NEW_PASSWORD';

const Auth: React.FC<AuthProps> = ({ onAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<AuthStep>('MAIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState('');
  const [aiCommContent, setAiCommContent] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [tempUser, setTempUser] = useState<any>(null);

  useEffect(() => {
    const remembered = localStorage.getItem('aerobantu_remembered_node');
    if (remembered) {
      setUsername(remembered);
      setRememberMe(true);
    }
  }, []);

  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        setDispatchStatus('Locating Node Identity...');
        const resp = await apiFetch<{ ok: true; requiresMfa: true; preview?: string }>(
          '/auth/login',
          {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          }
        );
        setDispatchStatus('Relaying MFA Signal...');
        setAiCommContent(resp.preview || null);
        setTempUser({ username });
        setStep('LOGIN_OTP');
      } else {
        if (username.length < 3 || password.length < 6 || !email.includes('@')) {
          setError('PROTOCOL_ERROR: Security parameters out of bounds.');
          setIsLoading(false);
          return;
        }

        setDispatchStatus('Allocating Grid Resources...');
        const resp = await apiFetch<{ ok: true; preview?: string }>(
          '/auth/register',
          {
            method: 'POST',
            body: JSON.stringify({ username, password, email }),
          }
        );
        setDispatchStatus('Transmitting Verification Uplink...');
        setAiCommContent(resp.preview || null);
        setTempUser({ username, email });
        setStep('VERIFY_ACCOUNT');
      }
    } catch (err: any) {
      console.error(err);
      if (err instanceof ApiError) {
        if (err.payload?.error === 'UNVERIFIED') setError('IDENTITY_UNVERIFIED: Authentication pending activation.');
        else if (err.payload?.error === 'NOT_FOUND') setError('IDENTITY_NOT_FOUND: Node alias not recognized.');
        else if (err.payload?.error === 'BAD_PASSWORD') {
          setDispatchStatus('PASSKEY_REJECTED: Triggering Recovery...');
          try {
            const r = await apiFetch<{ ok: true; preview?: string }>(
              '/auth/recovery/start',
              { method: 'POST', body: JSON.stringify({ username }) }
            );
            setAiCommContent(r.preview || null);
            setTempUser({ username });
            setStep('RECOVERY_OTP');
            setError('SECURITY_OVERRIDE: Manual recovery token dispatched.');
          } catch (e) {
            setError('GRID_FAILURE: Secure connection interrupted.');
          }
        } else if (err.payload?.error === 'USERNAME_TAKEN') setError('NODE_CONFLICT: Alias already registered.');
        else setError('GRID_FAILURE: Secure connection interrupted.');
      } else {
        setError('GRID_FAILURE: Secure connection interrupted.');
      }
    } finally {
      setIsLoading(false);
      setDispatchStatus('');
    }
  };

  const handleVerifyOtp = async () => {
    if (!tempUser) {
      setStep('MAIN');
      return;
    }
    setIsLoading(true);
    setDispatchStatus('Validating Payload...');
    try {
      const r = await apiFetch<{ ok: true; preview?: string }>(
        '/auth/verify',
        { method: 'POST', body: JSON.stringify({ username: tempUser.username, code: otpInput }) }
      );
      setDispatchStatus('Handshake Verified...');
      setAiCommContent(r.preview || null);
      await new Promise(r2 => setTimeout(r2, 2000));
      setStep('MAIN');
      setIsLogin(true);
      setAiCommContent(null);
      setOtpInput('');
    } catch {
      setError('TOKEN_MISMATCH: Authorization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaOtp = async () => {
    if (!tempUser) {
      setStep('MAIN');
      return;
    }
    setIsLoading(true);
    setDispatchStatus('Syncing MFA Token...');
    try {
      const r = await apiFetch<{ ok: true; token: string; user: User }>(
        '/auth/mfa',
        { method: 'POST', body: JSON.stringify({ username: tempUser.username, code: otpInput }) }
      );
      if (rememberMe) localStorage.setItem('aerobantu_remembered_node', username);
      localStorage.setItem('aerobantu_token', r.token);
      onAuthenticated(r.user);
    } catch {
      setError('MFA_REJECTED: Unauthorized token input.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryOtp = async () => {
    if (!tempUser) {
      setStep('MAIN');
      return;
    }
    setIsLoading(true);
    setDispatchStatus('Authorizing Override...');
    try {
      const r = await apiFetch<{ ok: true; resetToken: string }>(
        '/auth/recovery/verify',
        { method: 'POST', body: JSON.stringify({ username: tempUser.username, code: otpInput }) }
      );
      setTempUser({ ...tempUser, resetToken: r.resetToken });
      setStep('NEW_PASSWORD');
      setOtpInput('');
      setError('');
    } catch {
      setError('OVERRIDE_FAILED: Token rejection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!tempUser) {
      setStep('MAIN');
      return;
    }
    if (password.length < 6) {
      setError('POLICY_VIOLATION: Passkey strength insufficient.');
      return;
    }
    setIsLoading(true);
    setDispatchStatus('Committing Reset...');
    try {
      await apiFetch<{ ok: true }>(
        '/auth/recovery/reset',
        { method: 'POST', body: JSON.stringify({ resetToken: tempUser.resetToken, newPassword: password }) }
      );
      setStep('MAIN');
      setAiCommContent(null);
      setIsLogin(true);
      setDispatchStatus('Reset Complete.');
      setTimeout(() => setDispatchStatus(''), 3000);
    } catch {
      setError('GRID_FAILURE: Secure connection interrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTerminalOutput = () => (
    <div className="mt-6 glass bg-black/80 border border-cyan-500/20 rounded-2xl p-4 sm:p-5 font-mono text-[10px] text-cyan-200/90 leading-relaxed whitespace-pre-wrap max-h-[180px] sm:max-h-[220px] overflow-y-auto custom-scrollbar relative animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3 h-3 text-cyan-500" />
          <span className="text-[8px] uppercase tracking-widest font-black text-cyan-500">Secure Signal Intercept</span>
        </div>
      </div>
      {aiCommContent}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden transition-all duration-700">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full animate-[pulse_5s_infinite]"></div>
      </div>

      <div className="w-full max-w-[95%] sm:max-w-md glass p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border-cyan-500/40 relative z-10 overflow-hidden shadow-[0_0_80px_rgba(0,229,255,0.15)] flex flex-col transition-all duration-300 animate-in fade-in zoom-in duration-1000 min-h-[500px]">
        <div className="hud-corner hud-corner-tl border-cyan-500"></div>
        <div className="hud-corner hud-corner-tr border-cyan-500"></div>
        <div className="hud-corner hud-corner-bl border-cyan-500"></div>
        <div className="hud-corner hud-corner-br border-cyan-500"></div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6 relative">
            <CosmoLogo size={80} className="relative z-10" />
          </div>
          <h2 className="text-2xl font-orbitron font-black text-white tracking-[0.1em] uppercase holo-text leading-tight">
            <span className="text-cyan-400">AERO BANTU</span>
            <span className="text-white opacity-80 block text-lg">RSA ACCESS</span>
          </h2>
        </div>

        <div className="flex-1 flex flex-col px-1">
          {step === 'MAIN' && (
            <div className="space-y-6">
              <div className="flex p-1 bg-black/40 rounded-2xl border border-white/10 mb-2">
                <button 
                  onClick={() => { setIsLogin(true); setError(''); }}
                  className={`flex-1 py-3 rounded-xl font-orbitron font-bold text-[10px] tracking-widest uppercase transition-all ${isLogin ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => { setIsLogin(false); setError(''); }}
                  className={`flex-1 py-3 rounded-xl font-orbitron font-bold text-[10px] tracking-widest uppercase transition-all ${!isLogin ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleMainSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Node Alias</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40" />
                    <input 
                      type="text" 
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="USERNAME"
                      className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 font-orbitron text-xs text-white focus:outline-none focus:border-cyan-400 uppercase tracking-widest"
                      required
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-1 animate-in slide-in-from-top duration-300">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Comm Uplink</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="SATELLITE@EMAIL.RSA"
                        className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 font-orbitron text-xs text-white focus:outline-none focus:border-cyan-400 uppercase tracking-widest"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">Passkey</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/40" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/60 border border-white/10 rounded-2xl py-4 pl-12 pr-12 font-mono text-xs text-cyan-400 focus:outline-none focus:border-cyan-400"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className={`p-3 rounded-2xl border flex items-start space-x-3 animate-in slide-in-from-top duration-300 ${error.includes('SECURITY_OVERRIDE') ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="text-[9px] font-black uppercase tracking-tight leading-relaxed">{error}</span>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center space-x-3 active:scale-[0.98] disabled:opacity-50 bg-cyan-500 text-black shadow-xl"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <span>{isLogin ? 'Initiate Sync' : 'Register Node'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {dispatchStatus && (
                  <div className="flex items-center justify-center space-x-3 animate-pulse">
                    <RefreshCw className="w-3 h-3 text-cyan-500 animate-spin-slow" />
                    <span className="text-[8px] font-black text-cyan-500 uppercase tracking-widest">{dispatchStatus}</span>
                  </div>
                )}
              </form>
            </div>
          )}

          {(step === 'VERIFY_ACCOUNT' || step === 'LOGIN_OTP' || step === 'RECOVERY_OTP') && (
            <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
              <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center shadow-xl ${step === 'RECOVERY_OTP' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                <KeyRound className={`w-14 h-14 mb-4 ${step === 'RECOVERY_OTP' ? 'text-yellow-500' : 'text-cyan-400'}`} />
                <h3 className="text-sm font-orbitron font-black text-white uppercase tracking-[0.2em] text-center">
                  Authentication Token
                </h3>
              </div>

              <div className="space-y-2">
                <input 
                  type="text" 
                  maxLength={6}
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={`w-full bg-black/80 border rounded-[2rem] py-6 text-center font-orbitron text-4xl tracking-[0.5em] focus:outline-none transition-all ${step === 'RECOVERY_OTP' ? 'text-yellow-500 border-yellow-500/40 focus:border-yellow-500' : 'text-cyan-400 border-cyan-500/30 focus:border-cyan-400'}`}
                />
              </div>

              <div className="space-y-3">
                <button 
                  onClick={step === 'VERIFY_ACCOUNT' ? handleVerifyOtp : step === 'RECOVERY_OTP' ? handleRecoveryOtp : handleMfaOtp}
                  disabled={isLoading || otpInput.length < 6}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.5em] transition-all flex items-center justify-center shadow-2xl active:scale-[0.98] disabled:opacity-30 ${step === 'RECOVERY_OTP' ? 'bg-yellow-500 text-black' : 'bg-cyan-500 text-black'}`}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payload'}
                </button>

                <button 
                  onClick={() => { setStep('MAIN'); setAiCommContent(null); setError(''); }}
                  className="w-full py-4 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Abort</span>
                </button>
              </div>

              {aiCommContent && renderTerminalOutput()}
            </div>
          )}

          {step === 'NEW_PASSWORD' && (
            <div className="space-y-8 animate-in slide-in-from-right duration-500">
              <div className="p-8 bg-red-600/10 border border-red-500/20 rounded-[2.5rem] flex flex-col items-center">
                <ShieldAlert className="w-14 h-14 text-red-500 mb-5 animate-pulse" />
                <p className="text-sm font-orbitron font-black text-red-500 uppercase tracking-widest">Manual Override Active</p>
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-4">New Tactical Passkey</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-red-500/40" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/80 border border-red-500/30 rounded-2xl py-5.5 px-12 font-mono text-white focus:outline-none focus:border-red-500 transition-all text-xl"
                    required
                  />
                </div>
              </div>

              <button 
                onClick={handlePasswordReset}
                className="w-full py-5.5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.5em] shadow-[0_0_50px_rgba(239,68,68,0.4)] active:scale-[0.98] transition-all"
              >
                Commit Reset
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto pt-8 border-t border-white/5 grid grid-cols-3 gap-4 opacity-30">
          <div className="flex flex-col items-center">
             <Cpu className="w-4 h-4 mb-2 text-cyan-400" />
             <span className="text-[7px] font-black uppercase text-cyan-500 tracking-tighter">AES-256</span>
          </div>
          <div className="flex flex-col items-center border-x border-white/10 px-4">
             <Fingerprint className="w-4 h-4 mb-2 text-cyan-400" />
             <span className="text-[7px] font-black uppercase text-cyan-500 tracking-tighter">BIO-SEC</span>
          </div>
          <div className="flex flex-col items-center">
             <ShieldCheck className="w-4 h-4 mb-2 text-cyan-400" />
             <span className="text-[7px] font-black uppercase text-cyan-500 tracking-tighter">RSA-G8</span>
          </div>
        </div>
      </div>
      
      <div className="mt-10 flex flex-col items-center space-y-2 opacity-50 px-4 z-10">
        <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.6em] animate-pulse text-center">Tactical Node Terminal • SL-4</p>
      </div>
    </div>
  );
};

export default Auth;
