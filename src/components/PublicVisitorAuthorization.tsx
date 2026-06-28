import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/apiService';
import { Visitor, User } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { UserIcon } from './icons/UserIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { CreditCardIcon as IdentificationIcon } from './icons/CreditCardIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';

interface PublicVisitorAuthorizationProps {
    visitorId: string;
}

export const PublicVisitorAuthorization: React.FC<PublicVisitorAuthorizationProps> = ({ visitorId }) => {
    const [visitor, setVisitor] = useState<Visitor | null>(null);
    const [hostUser, setHostUser] = useState<User | null>(null);
    const [status, setStatus] = useState<'loading' | 'error' | 'ready' | 'saving' | 'approved' | 'declined'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [hostSignature, setHostSignature] = useState<string | null>(null);

    const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const loadVisitorAndHost = async () => {
            if (!visitorId) {
                setError('Invalid authorization token or missing visitor reference.');
                setStatus('error');
                return;
            }
            try {
                setStatus('loading');
                const vis = await apiService.fetchModuleRecord<Visitor>('visitors', visitorId);
                if (!vis) {
                    setError('The requested visitor log record does not exist or has been removed.');
                    setStatus('error');
                    return;
                }
                setVisitor(vis);

                if (vis.status === 'authorized' || vis.status === 'approved') {
                    setStatus('approved');
                    return;
                }
                if (vis.status === 'declined' || vis.status === 'rejected') {
                    setStatus('declined');
                    return;
                }

                if (vis.hostId) {
                    const usersList = await apiService.fetchUsers();
                    const matchedHost = usersList.find(u => u.id === vis.hostId);
                    if (matchedHost) {
                        setHostUser(matchedHost);
                    }
                }
                setStatus('ready');
            } catch (err: any) {
                console.error("Failed to load visitor for authorization:", err);
                setError(err.message || 'Unable to connect to database. Please check your network.');
                setStatus('error');
            }
        };

        loadVisitorAndHost();
    }, [visitorId]);

    const handleClearCanvas = () => {
        const canvas = sigCanvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                setHostSignature(null);
            }
        }
    };

    const handleAction = async (approve: boolean) => {
        if (!visitor) return;
        if (approve && !hostSignature) {
            alert('Please sign on the canvas below before confirming visitor access.');
            return;
        }

        try {
            setStatus('saving');
            const now = new Date().toTimeString().split(' ')[0].substring(0, 5);
            const today = new Date().toISOString().split('T')[0];

            const updatedRecord = {
                ...visitor,
                status: approve ? 'authorized' : 'declined',
                hostSignature: approve ? hostSignature : null,
                authorizationTime: now,
                authorizationDate: today,
                lastUpdated: new Date().toISOString()
            };

            await apiService.saveModuleRecord('visitors', updatedRecord);
            setStatus(approve ? 'approved' : 'declined');
        } catch (err: any) {
            console.error("Failed to update visitor authorization status:", err);
            alert(`Error during update: ${err.message || 'System fault'}`);
            setStatus('ready');
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
                <div className="relative flex flex-col items-center max-w-sm w-full text-center">
                    <ArrowPathIcon className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                    <h3 className="text-lg font-black uppercase tracking-wider">Verifying Gateway Ticket</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">Retrieving visitor logs & authorization tokens...</p>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
                <div className="bg-slate-800/80 border border-slate-700/50 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center backdrop-blur-md">
                    <XCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-tight">Authorization Link Failed</h3>
                    <p className="text-sm font-bold text-slate-400 mt-2">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-6 w-full py-3.5 bg-slate-750 hover:bg-slate-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                        Retry Load
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'approved') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
                <div className="bg-slate-800/80 border border-emerald-500/20 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center backdrop-blur-md">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 border border-emerald-500/20 animate-pulse">
                        <CheckCircleIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-emerald-400">Entry Authorized</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-2">You have signed and approved access for this guest.</p>
                    
                    {visitor && (
                        <div className="mt-6 p-4 bg-slate-855 rounded-2xl border border-slate-700 text-left space-y-2.5">
                            <div className="text-xs font-black uppercase text-slate-400 tracking-wider">Guest Details</div>
                            <div className="text-sm font-black text-white uppercase">{visitor.name}</div>
                            <div className="text-xs text-slate-400">Purpose: <span className="font-bold text-indigo-400 uppercase">{visitor.purpose}</span></div>
                            {visitor.vehiclePlate && <div className="text-xs text-slate-400">Vehicle: <span className="font-mono text-white font-bold">{visitor.vehiclePlate}</span></div>}
                        </div>
                    )}

                    <div className="mt-8 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        Security gate has been notified automatically
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'declined') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
                <div className="bg-slate-800/80 border border-red-500/20 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center backdrop-blur-md">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-red-400 border border-red-500/20">
                        <XCircleIcon className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-red-400">Entry Declined</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-2">You have rejected gate entry for this visitor.</p>
                    
                    <div className="mt-8 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        Security gate has been notified automatically
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 text-white">
            <div className="w-full max-w-lg bg-slate-800/90 border border-slate-750 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl space-y-6 backdrop-blur-md">
                
                {/* Header branding */}
                <div className="flex items-center gap-3 border-b border-slate-750 pb-5">
                    <div className="p-3 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                        <ShieldCheckIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight text-white">Host Authorization</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Verify & Sign Gate Clearance</p>
                    </div>
                </div>

                {/* Visitor Credentials Cards */}
                <div className="space-y-4">
                    <div className="bg-slate-850 p-5 rounded-2xl border border-slate-700/50 space-y-3.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Visitor Info</span>
                            <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-black text-[8px] rounded-md uppercase tracking-wider">Awaiting Sign-off</span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <UserIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-base font-black uppercase tracking-tight text-white">{visitor?.name}</h4>
                                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Phone: {visitor?.phoneNumber}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800">
                            <div>
                                <div className="text-[8px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5"><IdentificationIcon className="w-3 h-3 text-slate-400" /> ID Number</div>
                                <div className="text-xs font-bold text-slate-300 mt-1 uppercase">{visitor?.idNumber || 'Not Specified'}</div>
                            </div>
                            <div>
                                <div className="text-[8px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5"><MapPinIcon className="w-3 h-3 text-slate-400" /> Purpose</div>
                                <div className="text-xs font-black text-indigo-400 mt-1 uppercase truncate">{visitor?.purpose}</div>
                            </div>
                        </div>

                        {visitor?.vehiclePlate && (
                            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Vehicle Details</span>
                                <span className="px-2.5 py-0.5 bg-slate-900 border border-slate-700 font-mono text-[10px] rounded-md text-white font-bold tracking-tight">{visitor.vehiclePlate}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Host signature Canvas */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Host Digital Signature</label>
                        <button 
                            type="button" 
                            onClick={handleClearCanvas}
                            className="text-[9px] font-black text-red-400 hover:text-red-300 uppercase tracking-widest transition-colors"
                        >
                            Clear Pad
                        </button>
                    </div>

                    <div className="relative bg-slate-900 rounded-2xl border border-slate-755 overflow-hidden select-none">
                        <canvas
                            ref={sigCanvasRef}
                            width={450}
                            height={130}
                            className="w-full block bg-slate-900 cursor-crosshair touch-none"
                            onPointerDown={(e) => {
                                isDrawingRef.current = true;
                                const c = sigCanvasRef.current;
                                if (!c) return;
                                const r = c.getBoundingClientRect();
                                lastPointRef.current = { 
                                    x: (e.clientX - r.left) * (c.width / r.width), 
                                    y: (e.clientY - r.top) * (c.height / r.height) 
                                };
                            }}
                            onPointerMove={(e) => {
                                if (!isDrawingRef.current) return;
                                const c = sigCanvasRef.current;
                                if (!c) return;
                                const ctx = c.getContext('2d');
                                if (!ctx || !lastPointRef.current) return;
                                const r = c.getBoundingClientRect();
                                const x = (e.clientX - r.left) * (c.width / r.width);
                                const y = (e.clientY - r.top) * (c.height / r.height);
                                
                                ctx.beginPath();
                                ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
                                ctx.lineTo(x, y);
                                ctx.strokeStyle = '#6366f1';
                                ctx.lineWidth = 3.0;
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                ctx.stroke();
                                lastPointRef.current = { x, y };
                            }}
                            onPointerUp={() => {
                                isDrawingRef.current = false;
                                lastPointRef.current = null;
                                const c = sigCanvasRef.current;
                                if (c) setHostSignature(c.toDataURL('image/png'));
                            }}
                            onPointerLeave={() => {
                                isDrawingRef.current = false;
                                lastPointRef.current = null;
                            }}
                        />
                        {!hostSignature && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1 bg-slate-950/20">
                                <p className="text-[10px] font-black text-indigo-400/50 uppercase tracking-widest">Authorize Access</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase">Draw your signature with pointer or finger</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4 border-t border-slate-750">
                    <button
                        onClick={() => handleAction(false)}
                        disabled={status === 'saving'}
                        className="flex-1 h-14 bg-slate-750 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent disabled:opacity-50 text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        Decline Entry
                    </button>
                    <button
                        onClick={() => handleAction(true)}
                        disabled={status === 'saving'}
                        className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-indigo-650/10 flex items-center justify-center gap-2"
                    >
                        {status === 'saving' ? (
                            <>
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Authorize Entry'
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
