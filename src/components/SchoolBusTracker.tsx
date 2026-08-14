import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';
import { TruckIcon } from './icons/TruckIcon';

export const SchoolBusTracker: React.FC = () => {
    const [busPos, setBusPos] = useState({ x: 50, y: 150 });
    const [speedKmH, setSpeedKmH] = useState(38);
    const [smsLog, setSmsLog] = useState<string[]>([
        '📱 [06:45 AM] SMS sent to Parent (Mr. Kamau): School Bus #4 departed school depot.',
        '📱 [07:10 AM] SMS sent to Parent (Mrs. Otieno): Bus #4 is 5 minutes from Gate 3 pick-up point.'
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setBusPos(prev => {
                const nextX = prev.x >= 500 ? 50 : prev.x + 10;
                return { x: nextX, y: 150 + Math.sin(nextX / 30) * 20 };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const triggerManualSmsAlert = () => {
        const newMsg = `📱 [${new Date().toLocaleTimeString()}] SMS Alert: Bus #4 arriving at next stop in 3 minutes!`;
        setSmsLog(prev => [newMsg, ...prev]);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                        Transport & Fleet Management
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Live School Bus GPS Tracker & SMS Alerts</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Real-time GPS route map, driver speed monitor, and automated parent arrival SMS notifications
                    </p>
                </div>
                <button
                    onClick={triggerManualSmsAlert}
                    className="px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
                >
                    <span>📲 Send Parent SMS Alert</span>
                </button>
            </div>

            {/* GPS Canvas Map */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic flex items-center gap-2">
                        <TruckIcon className="w-5 h-5" />
                        <span>LIVE BUS ROUTE MAP — BUS #4 (NAIROBI WEST ROUTE)</span>
                    </h3>
                    <span className="text-xs font-mono font-bold text-emerald-400">Speed: {speedKmH} km/h • GPS Active</span>
                </div>

                <div className="w-full h-64 bg-slate-950 rounded-3xl border-2 border-slate-800 relative overflow-hidden flex items-center">
                    {/* Road line */}
                    <div className="w-full h-12 bg-slate-900 border-y-2 border-dashed border-slate-700 absolute"></div>

                    {/* Bus Icon */}
                    <div
                        className="w-12 h-10 bg-amber-400 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center shadow-lg absolute transition-all duration-1000"
                        style={{ left: `${busPos.x}px`, top: `${busPos.y}px` }}
                    >
                        🚌 #4
                    </div>
                </div>

                {/* SMS Log */}
                <div className="space-y-3 pt-4 border-t border-slate-800">
                    <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Automated Parent SMS Notifications Log:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {smsLog.map((log, idx) => (
                            <p key={idx} className="text-xs font-mono font-bold text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                                {log}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
