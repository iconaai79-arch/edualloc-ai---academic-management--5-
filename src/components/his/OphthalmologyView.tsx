import React, { useState } from 'react';
import { 
    EyeIcon, 
    PlusIcon, 
    SparklesIcon,
    ArrowPathIcon,
    SearchIcon,
    FileTextIcon,
    DownloadIcon
} from '../icons/index';

interface RefractionData {
    sphere: string;
    cylinder: string;
    axis: string;
    add: string;
    va: string;
}

interface OphthalmologyViewProps {
    onAddVisit?: () => void;
    onPrintRx?: (od: RefractionData, os: RefractionData) => void;
}

export const OphthalmologyView: React.FC<OphthalmologyViewProps> = ({ onAddVisit, onPrintRx }) => {
    const [od, setOd] = useState<RefractionData>({ sphere: '-2.25', cylinder: '-0.75', axis: '180', add: '+1.50', va: '6/6' });
    const [os, setOs] = useState<RefractionData>({ sphere: '-2.50', cylinder: '-0.50', axis: '175', add: '+1.50', va: '6/9' });

    const handleDataChange = (eye: 'od' | 'os', field: keyof RefractionData, value: string) => {
        if (eye === 'od') {
            setOd({ ...od, [field]: value });
        } else {
            setOs({ ...os, [field]: value });
        }
    };

    const handleNewExam = () => {
        setOd({ sphere: '', cylinder: '', axis: '', add: '', va: '6/6' });
        setOs({ sphere: '', cylinder: '', axis: '', add: '', va: '6/6' });
        onAddVisit?.(); // Open the clinical record modal
        alert("Board cleared. Opening clinical record for the new exam.");
    };

    const handlePrintRx = () => {
        if (onPrintRx) {
            onPrintRx(od, os);
        } else {
            alert("Prescription printing service is initializing...");
        }
    };

    const handleInitializeImaging = () => {
        alert("Connecting to Retinal Imaging Unit... Hardware ready.");
    };

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Optical <span className="text-blue-400">Refraction</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Precision visual acuity & prescription engine</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={handlePrintRx}
                        className="glass-morphism px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all text-blue-400 border border-blue-400/30"
                    >
                        <DownloadIcon className="w-4 h-4" /> Print Rx
                    </button>
                    <button 
                        onClick={handleNewExam}
                        className="bg-white text-slate-950 px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                    >
                        <PlusIcon className="w-4 h-4" /> New Exam
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Refraction Results Board */}
                <div className="md:col-span-8 space-y-8">
                    <div className="glass-morphism rounded-[3.5rem] border border-white/5 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Eye</th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Sphere (SPH)</th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Cylinder (CYL)</th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Axis</th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">Add</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center">VA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[
                                    { label: 'Right (OD)', data: od, color: 'text-blue-400' },
                                    { label: 'Left (OS)', data: os, color: 'text-indigo-400' }
                                ].map((row, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-10 py-10">
                                            <span className={`text-sm font-black uppercase italic ${row.color}`}>{row.label}</span>
                                        </td>
                                        {['sphere', 'cylinder', 'axis', 'add'].map((field) => (
                                            <td key={field} className="px-6 py-10">
                                                <input 
                                                    type="text"
                                                    value={(row.data as any)[field]}
                                                    onChange={(e) => handleDataChange(idx === 0 ? 'od' : 'os', field as keyof RefractionData, e.target.value)}
                                                    className="w-full bg-transparent text-center font-black text-xl outline-none focus:text-white transition-colors"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-10 py-10">
                                            <div className="flex justify-center">
                                                <span className="bg-white/5 px-4 py-2 rounded-xl font-black text-amber-400 border border-white/5">{row.data.va}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-morphism p-10 rounded-[3rem] border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Autorefractor Summary</p>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-slate-400">Pupillary Distance (PD)</span>
                                    <span className="text-sm font-black">64.5 mm</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-white/5">
                                    <span className="text-xs font-bold text-slate-400">Intraocular Pressure (IOP)</span>
                                    <span className="text-sm font-black text-emerald-400">14 / 15 mmHg</span>
                                </div>
                            </div>
                        </div>

                        <div className="glass-morphism p-10 rounded-[3rem] border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Lens Recommendations</p>
                            <div className="flex gap-3">
                                <span className="text-[9px] font-black px-4 py-2 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 uppercase tracking-widest">Anti-Glare</span>
                                <span className="text-[9px] font-black px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 uppercase tracking-widest">Blue-Cut</span>
                                <span className="text-[9px] font-black px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-widest">Photochromic</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Retinal & Diagnostics Column */}
                <div className="md:col-span-4 space-y-8">
                    <div className="glass-morphism p-10 rounded-[3.5rem] border border-white/5 h-full relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 blur-[80px] rounded-full -mr-24 -mt-24"></div>
                         
                         <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic">Diagnostics <span className="text-blue-400">Vault</span></h3>
                         
                         <div className="space-y-6">
                            {[
                                { label: 'Right Retinal Fundus', date: '15 Min Ago', status: 'Clean' },
                                { label: 'Corneal Topography', date: '2 hours ago', status: 'High Cyl' },
                                { label: 'OCT Scan - Macula', date: 'Today, 09:00', status: 'Healthy' }
                            ].map((scan, i) => (
                                <div key={i} className="group p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                                            <EyeIcon className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{scan.date}</span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-tight mb-1">{scan.label}</p>
                                    <p className={`text-[9px] font-black uppercase tracking-widest ${scan.status === 'Clean' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        AI Analysis: {scan.status}
                                    </p>
                                </div>
                            ))}
                         </div>

                         <button 
                            onClick={handleInitializeImaging}
                            className="w-full mt-10 py-5 bg-blue-500/10 text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all"
                         >
                            Initialize Imaging Unit
                         </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
