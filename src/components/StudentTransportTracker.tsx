
import React from 'react';
import {
    TruckIcon, MapPinIcon, CheckCircleIcon,
    ClockIcon, PhoneIcon, UserIcon
} from './icons';
import type { Vehicle, TransportOnboarding, User } from '../types';

interface StudentTransportTrackerProps {
    student: User;
    activeOnboarding?: TransportOnboarding;
    assignedVehicle?: Vehicle;
    driver?: User;
    assistant?: User;
    onConfirmReceipt: (recordId: string) => Promise<void>;
}

export const StudentTransportTracker: React.FC<StudentTransportTrackerProps> = ({
    student, activeOnboarding, assignedVehicle, driver, assistant, onConfirmReceipt
}) => {
    if (!activeOnboarding) {
        return (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                <TruckIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Active Transit</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto font-medium">
                    When {student.name} boards the school vehicle, you'll be able to track their journey here in real-time.
                </p>
            </div>
        );
    }

    const isHomebound = activeOnboarding.direction === 'from_school';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
            {/* Live Map Placeholder / Header */}
            <div className="relative h-64 bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                {/* Simulated Map Background */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]"></div>
                </div>

                {activeOnboarding.locationLat && activeOnboarding.locationLng ? (
                    <div className="relative z-10 text-center">
                        <div className="relative inline-block mb-4">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl animate-pulse rounded-full"></div>
                            <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-2xl relative border-2 border-blue-500">
                                <TruckIcon className="w-16 h-16 text-blue-600" />
                            </div>
                            <div className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white dark:border-slate-800 animate-bounce"></div>
                        </div>
                        <p className="text-[10px] font-black uppercase text-blue-500 tracking-[0.3em] mb-1">Live Tracking Enabled</p>
                        <p className="text-xs font-bold text-slate-400">Coords: {activeOnboarding.locationLat.toFixed(4)}, {activeOnboarding.locationLng.toFixed(4)}</p>
                    </div>
                ) : (
                    <div className="text-center p-8 bg-orange-50 dark:bg-orange-900/20 rounded-3xl border-2 border-dashed border-orange-200 dark:border-orange-800 mx-6">
                        <MapPinIcon className="w-12 h-12 text-orange-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-orange-600 uppercase tracking-tighter leading-tight">Waiting for GPS Signal...</p>
                        <p className="text-[10px] text-orange-400 mt-1 font-medium">Vehicle is in motion. Tracking will resume shortly.</p>
                    </div>
                )}
            </div>

            <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${isHomebound ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isHomebound ? 'Homebound Journey' : 'Schoolbound Journey'}
                        </span>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-2 tracking-tighter">
                            {activeOnboarding.status === 'onboarded' ? 'In Transit' : activeOnboarding.status === 'offboarded' ? 'Arrived at Drop-off' : 'Arrival Confirmed'}
                        </h3>
                        <p className="text-slate-500 font-bold uppercase text-[10px] mt-1 tracking-widest flex items-center gap-2">
                            <ClockIcon className="w-3 h-3 text-blue-500" />
                            Estimated Arrival: <span className="text-slate-900 dark:text-white">15-20 Mins</span>
                        </p>
                    </div>
                    {assignedVehicle && (
                        <div className="text-right">
                            <p className="text-2xl font-black text-slate-900 dark:text-white border-2 border-slate-900 dark:border-white px-3 py-1 rounded-lg font-mono">
                                {assignedVehicle.plateNumber}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Fleet ID #{assignedVehicle.id.slice(-4)}</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {driver && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                                <UserIcon className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Master Driver</p>
                                <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{driver.name}</p>
                                <button className="mt-2 text-blue-600 font-black uppercase text-[10px] flex items-center gap-1 hover:underline">
                                    <PhoneIcon className="w-3 h-3" /> Contact Direct
                                </button>
                            </div>
                        </div>
                    )}
                    {assistant && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 shadow-sm">
                                <UserIcon className="w-8 h-8" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Route Assistant</p>
                                <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{assistant.name}</p>
                                <button className="mt-2 text-purple-600 font-black uppercase text-[10px] flex items-center gap-1 hover:underline">
                                    <PhoneIcon className="w-3 h-3" /> Call Assistant
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-700 pt-8">
                    {activeOnboarding.status === 'offboarded' && (
                        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-[2.5rem] border-2 border-green-500 animate-bounce-in">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="p-4 bg-green-500 rounded-full shadow-lg shadow-green-200">
                                    <CheckCircleIcon className="w-8 h-8 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-black text-green-800 dark:text-green-200 tracking-tighter">Verify Child Receipt</h4>
                                    <p className="text-sm text-green-600/80 font-medium">Please confirm that you have safely received {student.name} from the school transport team.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => onConfirmReceipt(activeOnboarding.id)}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-green-200 dark:shadow-none transition-all active:scale-[0.98] text-sm"
                            >
                                Confirm Safe Receipt
                            </button>
                        </div>
                    )}

                    {activeOnboarding.status === 'received' && (
                        <div className="text-center py-6">
                            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full inline-block mb-4">
                                <CheckCircleIcon className="w-12 h-12 text-blue-600" />
                            </div>
                            <h4 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Safe Completion</h4>
                            <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto mt-2">Transit session concluded. Thank you for using EduAlloc Transport.</p>
                        </div>
                    )}

                    {activeOnboarding.status === 'onboarded' && (
                        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-[2.5rem] flex flex-col items-center">
                            <div className="flex gap-2 mb-4">
                                {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>)}
                            </div>
                            <p className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-widest text-center">
                                {student.name} is currently secure in the {assignedVehicle?.model || 'vehicle'}. Notifications will trigger upon arrival at the drop-off point.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .animate-bounce-in {
                    animation: bounceIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); opacity: 1; }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};
