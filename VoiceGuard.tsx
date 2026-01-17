
import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Info, Loader2, Lock, Radio, Activity, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData, encode, SOS_FUNCTION_DECLARATION } from '../geminiService';

interface VoiceGuardProps {
  onExit: () => void;
  onSOS: (reason?: string) => void;
  secretPhrase: string;
}

const VoiceGuard: React.FC<VoiceGuardProps> = ({ onExit, onSOS, secretPhrase }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(0);
  const [pendingReason, setPendingReason] = useState<string | undefined>();
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const countdownIntervalRef = useRef<number | null>(null);

  const startConfirmationGracePeriod = (reason?: string) => {
    setIsAwaitingConfirmation(true);
    setPendingReason(reason);
    setConfirmCountdown(5);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    countdownIntervalRef.current = window.setInterval(() => {
      setConfirmCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          setIsAwaitingConfirmation(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelConfirmation = () => {
    setIsAwaitingConfirmation(false);
    setPendingReason(undefined);
    setConfirmCountdown(0);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const handleSOSDispatch = () => {
    const reason = pendingReason;
    cancelConfirmation();
    onSOS(reason);
  };

  const toggleSession = async () => {
    if (isActive) {
      if (sessionRef.current) sessionRef.current.close();
      setIsActive(false);
      return;
    }

    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are AeroBantu Voice Sentinel. 
          Your objective is to listen for the specific trigger word: "${secretPhrase}". 
          PROTOCOL:
          1. If you hear "${secretPhrase}", you MUST NOT trigger SOS immediately. Instead, verbally ask: "Keyword detected. Confirm emergency deployment?".
          2. ONLY if the user says "Yes", "Confirm", "Do it", or similar affirmative, call the 'triggerSOS' tool.
          3. If the user says "No", "Cancel", or does not confirm, stay silent.
          Maintain silent surveillance otherwise. If asked for status, confirm monitoring for "${secretPhrase}".`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          tools: [{ functionDeclarations: [SOS_FUNCTION_DECLARATION] }],
        },
        callbacks: {
          onopen: () => {
            console.log('Voice Sentinel session opened');
            setIsActive(true);
            setIsConnecting(false);
            
            const source = audioCtxRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioCtxRef.current!.destination);
          },
          onmessage: async (msg) => {
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                if (fc.name === 'triggerSOS') {
                  const reason = (fc.args as any)?.reason;
                  console.log('Voice confirmation received. Executing SOS with reason:', reason);
                  setPendingReason(reason);
                  handleSOSDispatch();
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "SOS_ACTIVATED" } }
                  }));
                }
              }
            }

            const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputCtxRef.current) {
              const outCtx = outputCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              
              // If the AI asks for confirmation, we show the UI overlay
              if (msg.serverContent?.outputTranscription?.text?.toLowerCase().includes("confirm")) {
                startConfirmationGracePeriod();
              }
            }

            if (msg.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            if (msg.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev.slice(-4), `AI: ${msg.serverContent!.outputTranscription!.text}`]);
            } else if (msg.serverContent?.inputTranscription) {
              setTranscription(prev => [...prev.slice(-4), `YOU: ${msg.serverContent!.inputTranscription!.text}`]);
            }
          },
          onerror: () => {
            setIsActive(false);
            setIsConnecting(false);
          },
          onclose: () => {
            setIsActive(false);
            setIsConnecting(false);
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (outputCtxRef.current) outputCtxRef.current.close();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="glass p-8 rounded-[3rem] border-cyan-500/30 text-center space-y-8 relative overflow-hidden">
        {/* HUD Corners */}
        <div className="hud-corner hud-corner-tl border-cyan-500"></div>
        <div className="hud-corner hud-corner-tr border-cyan-500"></div>
        <div className="hud-corner hud-corner-bl border-cyan-500"></div>
        <div className="hud-corner hud-corner-br border-cyan-500"></div>

        <div className="absolute top-4 right-6">
          <button onClick={onExit} className="p-3 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="pt-8">
          <h2 className="text-3xl font-orbitron font-black text-cyan-400 tracking-tighter uppercase leading-none holo-text">AeroBantu Sentinel</h2>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <Radio className={`w-3 h-3 ${isActive ? 'text-green-500 animate-pulse' : 'text-gray-600'}`} />
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-[0.2em]">Keyword-Only Listening Mode</p>
          </div>
        </div>

        {isAwaitingConfirmation ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-6 animate-in zoom-in duration-300">
            <div className="relative">
              <div className="absolute inset-0 bg-red-600 blur-3xl opacity-20 animate-pulse"></div>
              <div className="w-40 h-40 rounded-full border-4 border-red-500/40 flex flex-col items-center justify-center bg-red-600/10 relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.3)]">
                <AlertCircle className="w-12 h-12 text-red-500 mb-2 animate-bounce" />
                <span className="text-4xl font-orbitron font-black text-white">{confirmCountdown}</span>
              </div>
            </div>
            <div className="space-y-4 max-w-xs mx-auto">
              <h3 className="text-lg font-orbitron font-black text-red-500 uppercase tracking-tight">Confirm Dispatch?</h3>
              <p className="text-[10px] text-gray-400 uppercase font-black leading-relaxed">
                Keyword detected. Say <span className="text-white">"YES"</span> or press below to deploy tactical emergency protocol.
              </p>
              <div className="flex space-x-3">
                <button 
                  onClick={handleSOSDispatch}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                >
                  DEPLOY SOS
                </button>
                <button 
                  onClick={cancelConfirmation}
                  className="flex-1 py-4 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  ABORT
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              {isActive && (
                <>
                  <div className="absolute inset-0 bg-cyan-400/20 rounded-full animate-ping"></div>
                  <div className="absolute inset-0 bg-cyan-400/10 rounded-full animate-[ping_3s_infinite] scale-150"></div>
                  <div className="absolute inset-[-40px] border border-cyan-500/10 rounded-full animate-pulse"></div>
                </>
              )}
              <button 
                onClick={toggleSession}
                disabled={isConnecting}
                className={`relative w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'bg-cyan-500 text-black shadow-[0_0_60px_rgba(0,229,255,0.5)] border-4 border-white/20' : 'bg-white/5 text-gray-400 border border-white/10'}`}
              >
                {isConnecting ? (
                  <Loader2 className="w-14 h-14 animate-spin" />
                ) : isActive ? (
                  <Activity className="w-14 h-14" />
                ) : (
                  <MicOff className="w-14 h-14" />
                )}
              </button>
            </div>
            <div className="flex flex-col items-center space-y-2">
               <span className={`text-xs font-black uppercase tracking-[0.3em] ${isActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                {isConnecting ? 'Establishing Link...' : isActive ? 'Tactical Monitoring' : 'Sentinel Idle'}
              </span>
              {isActive && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2 bg-black/40 px-3 py-1 rounded-full border border-cyan-500/30">
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">TRIGGER: {secretPhrase}</span>
                  </div>
                  <p className="text-[8px] text-gray-600 font-black uppercase tracking-tighter">Only the phrase above will deploy SOS</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="glass bg-black/30 p-5 rounded-[2rem] border border-white/5 min-h-[140px] text-left custom-scrollbar overflow-y-auto max-h-[200px] relative">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
          <div className="flex items-center space-x-2 mb-3 border-b border-white/5 pb-2">
            <Volume2 className="w-4 h-4 text-cyan-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Acoustic Signature Log</span>
          </div>
          <div className="space-y-2">
            {transcription.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-2 opacity-30">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest text-center">Awaiting Tactical Command...</p>
              </div>
            ) : (
              transcription.map((t, i) => (
                <p key={i} className={`text-[11px] font-medium leading-relaxed animate-in slide-in-from-left duration-300 ${t.startsWith('AI:') ? 'text-cyan-400' : 'text-gray-300'}`}>
                  {t}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl flex items-start space-x-4 text-left">
          <div className="bg-cyan-500/20 p-2 rounded-xl">
            <Info className="w-5 h-5 text-cyan-400 shrink-0" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">2-Step Tactical Verification</p>
            <p className="text-[9px] text-gray-500 leading-relaxed uppercase font-bold tracking-tight">
              SOS logic requires confirmation. Sentinel will verbally verify detection of the tactical keyword before deploying dispatch. Accidental triggers are neutralized via grace period abort.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceGuard;