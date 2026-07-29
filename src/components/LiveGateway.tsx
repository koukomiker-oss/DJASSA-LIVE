import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Zap, ShieldCheck, Globe, Wifi, Activity } from 'lucide-react';

interface LiveGatewayProps {
  onConnected: () => void;
  sellerName: string;
}

export default function LiveGateway({ onConnected, sellerName }: LiveGatewayProps) {
  const [step, setStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const connectionSteps = [
    { label: "INITIALISATION DU TUNNEL SECURISE", icon: ShieldCheck, color: "text-blue-500" },
    { label: "RECHERCHE DE LA PASSERELLE VIDEO", icon: Globe, color: "text-purple-500" },
    { label: "OPTIMISATION DU BITRATE (4G/5G)", icon: Zap, color: "text-yellow-500" },
    { label: "SYNCHRONISATION AVEC LE RÉSEAU DJASSA", icon: Radio, color: "text-pink-500" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => {
        if (s >= connectionSteps.length - 1) {
          clearInterval(timer);
          setTimeout(onConnected, 1000);
          return s;
        }
        return s + 1;
      });
    }, 1200);

    const logTimer = setInterval(() => {
      const newLogs = [
        `Auth node: OK`,
        `Latency: ${Math.floor(Math.random() * 20) + 10}ms`,
        `CDN: Abidjan-South-1`,
        `Protocol: SRT/HLS`,
        `Client: Live-Gateway v2.0`
      ];
      setLogs(prev => [...prev.slice(-3), newLogs[Math.floor(Math.random() * newLogs.length)]]);
    }, 600);

    return () => {
      clearInterval(timer);
      clearInterval(logTimer);
    };
  }, [onConnected]);

  return (
    <div className="fixed inset-0 bg-black z-[300] flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Background Grid Animation */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center relative z-10"
      >
        <div className="w-24 h-24 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center mb-8 relative">
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 rounded-full bg-pink-500/20"
          />
          <Radio className="w-10 h-10 text-pink-500" />
        </div>

        <h2 className="text-2xl font-black text-center mb-2 uppercase tracking-tighter">
          ÉTABLISSEMENT DU DIRECT
        </h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-12 text-center">
          PASSERELLE DE STREAMING @{sellerName.toUpperCase()}
        </p>

        <div className="w-full space-y-6">
          {connectionSteps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isCompleted = i < step;

            return (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                  isActive ? `bg-zinc-800 border-${s.color.split('-')[1]}-500/50 shadow-lg shadow-pink-500/10` : 
                  isCompleted ? "bg-zinc-900 border-green-500/20" : "bg-black border-white/5"
                }`}>
                  <Icon className={`w-5 h-5 ${
                    isActive ? s.color : 
                    isCompleted ? "text-green-500" : "text-zinc-700"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-500 ${
                      isActive ? "text-white" : isCompleted ? "text-green-500/80" : "text-zinc-700"
                    }`}>
                      {s.label}
                    </span>
                    {isActive && (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Activity className="w-3 h-3 text-pink-500" />
                      </motion.div>
                    )}
                  </div>
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: isActive ? "60%" : isCompleted ? "100%" : "0%" }}
                      className={`h-full rounded-full ${isActive ? "bg-pink-500" : "bg-green-500"}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Console Logs */}
        <div className="mt-12 w-full bg-zinc-950 border border-white/5 p-4 rounded-2xl font-mono text-[9px] uppercase tracking-tighter">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5 opacity-50">
            <Wifi className="w-3 h-3" />
            <span>SYSTÈME DE TRANSMISSION</span>
          </div>
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-zinc-700">[{1000 + i}]</span>
                <span className="text-zinc-500">{log}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
