import React, { useState, useMemo } from 'react';
import type { SecurityAlert, User } from '../types';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';


interface SecurityAlertManagerProps {
    alerts: SecurityAlert[];
    users: User[];
    onAddAlert: (data: Omit<SecurityAlert, 'id' | 'institutionId' | 'createdBy' | 'createdAt' | 'status'>) => void;
    onResolveAlert: (alertId: string) => void;
}

export const SecurityAlertManager: React.FC<SecurityAlertManagerProps> = ({ alerts, users, onAddAlert, onResolveAlert }) => {
    const [targetType, setTargetType] = useState<'student' | 'lecturer' | 'guest'>('student');
    const [targetId, setTargetId] = useState('');
    const [guestName, setGuestName] = useState('');
    const [alertType, setAlertType] = useState<SecurityAlert['type']>('Disciplinary');
    const [severity, setSeverity] = useState<SecurityAlert['severity']>('Medium');
    const [description, setDescription] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return [];
        const lower = searchTerm.toLowerCase();
        return users.filter(u => 
            u.role === targetType && 
            (u.name.toLowerCase().includes(lower) || (u.staffId?.toLowerCase().includes(lower) ?? false))
        ).slice(0, 10);
    }, [users, targetType, searchTerm]);

    const activeAlerts = useMemo(() => alerts.filter(a => a.status === 'active'), [alerts]);
    const resolvedAlerts = useMemo(() => alerts.filter(a => a.status === 'resolved'), [alerts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalTargetId = targetId;
        let finalTargetName = '';

        if (targetType === 'guest') {
            finalTargetId = `guest-${Date.now()}`; // Simple ID for guest
            finalTargetName = guestName;
        } else {
            const user = users.find(u => u.id === targetId);
            if (!user) {
                alert('Please select a valid user.');
                return;
            }
            finalTargetName = user.name;
        }

        if (!description) {
            alert('Please provide a description.');
            return;
        }

        onAddAlert({
            targetId: finalTargetId,
            targetName: finalTargetName,
            targetRole: targetType,
            type: alertType,
            severity,
            description
        });

        // Reset form
        setTargetId('');
        setGuestName('');
        setDescription('');
        setSearchTerm('');
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Create Alert Form */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm h-fit">
                    <h3 className="text-lg font-bold mb-4 text-red-600 dark:text-red-400 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" /> Raise Security Alert
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Target Group</label>
                            <div className="flex gap-4">
                                <label className="inline-flex items-center">
                                    <input type="radio" className="form-radio text-red-600" name="targetType" value="student" checked={targetType === 'student'} onChange={() => { setTargetType('student'); setTargetId(''); setSearchTerm(''); }} />
                                    <span className="ml-2">Student</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" className="form-radio text-red-600" name="targetType" value="lecturer" checked={targetType === 'lecturer'} onChange={() => { setTargetType('lecturer'); setTargetId(''); setSearchTerm(''); }} />
                                    <span className="ml-2">Lecturer/Staff</span>
                                </label>
                                <label className="inline-flex items-center">
                                    <input type="radio" className="form-radio text-red-600" name="targetType" value="guest" checked={targetType === 'guest'} onChange={() => { setTargetType('guest'); setTargetId(''); }} />
                                    <span className="ml-2">Guest</span>
                                </label>
                            </div>
                        </div>

                        {targetType === 'guest' ? (
                            <div>
                                <label className="block text-sm font-medium mb-1">Guest Name / ID</label>
                                <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} className="form-input w-full" placeholder="Enter Guest Name or ID No." required />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium mb-1">Search {targetType === 'student' ? 'Student' : 'Staff'}</label>
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    className="form-input w-full" 
                                    placeholder="Start typing name or ID..." 
                                />
                                {searchTerm && (
                                    <ul className="mt-2 border rounded-md max-h-32 overflow-y-auto bg-slate-50 dark:bg-slate-700">
                                        {filteredUsers.map(u => (
                                            <li 
                                                key={u.id} 
                                                className={`p-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 text-sm ${targetId === u.id ? 'bg-blue-100 dark:bg-blue-900' : ''}`}
                                                onClick={() => { setTargetId(u.id); setSearchTerm(u.name); }}
                                            >
                                                {u.name} ({u.staffId})
                                            </li>
                                        ))}
                                        {filteredUsers.length === 0 && <li className="p-2 text-sm text-gray-500">No results found.</li>}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Alert Type</label>
                                <select value={alertType} onChange={e => setAlertType(e.target.value as any)} className="form-select w-full">
                                    <option>Disciplinary</option>
                                    <option>Fee Balance</option>
                                    <option>Security Risk</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Severity</label>
                                <select value={severity} onChange={e => setSeverity(e.target.value as any)} className="form-select w-full">
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Description / Reason</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="form-input w-full" placeholder="e.g., Pending disciplinary hearing, Restricted access..." required></textarea>
                        </div>

                        <button type="submit" className="w-full btn-primary bg-red-600 hover:bg-red-700 text-white">
                            <PlusIcon className="w-5 h-5 mr-2" /> Create Alert
                        </button>
                    </form>
                </div>

                {/* Active Alerts List */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm h-fit">
                    <h3 className="text-lg font-bold mb-4">Active Security Alerts ({activeAlerts.length})</h3>
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {activeAlerts.length > 0 ? activeAlerts.map(alert => (
                            <div key={alert.id} className={`p-4 border-l-4 rounded-r-md shadow-sm bg-slate-50 dark:bg-slate-700/50 flex justify-between items-start ${
                                alert.severity === 'High' ? 'border-red-500' : 
                                alert.severity === 'Medium' ? 'border-yellow-500' : 'border-blue-500'
                            }`}>
                                <div>
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{alert.targetName} <span className="text-xs font-normal text-slate-500 ml-2 capitalize">({alert.targetRole})</span></p>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium mb-2 ${
                                        alert.severity === 'High' ? 'bg-red-100 text-red-800' : 
                                        alert.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {alert.type} - {alert.severity}
                                    </span>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{alert.description}</p>
                                    <p className="text-xs text-slate-400 mt-2">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'N/A'}</p>
                                </div>
                                <button onClick={() => onResolveAlert(alert.id)} className="text-green-600 hover:text-green-800 text-sm font-medium flex items-center gap-1">
                                    <CheckIcon className="w-4 h-4" /> Resolve
                                </button>
                            </div>
                        )) : (
                            <p className="text-center text-slate-500 py-4">No active security alerts.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Resolved History (Optional/Collapsible could be better, simple list for now) */}
             {resolvedAlerts.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-bold mb-4 text-slate-500">Resolved History</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500 border-b dark:border-slate-700">
                                    <th className="pb-2">Target</th>
                                    <th className="pb-2">Type</th>
                                    <th className="pb-2">Description</th>
                                    <th className="pb-2">Date Created</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resolvedAlerts.slice(0, 5).map(alert => (
                                    <tr key={alert.id} className="border-b dark:border-slate-700 last:border-0">
                                        <td className="py-2">{alert.targetName}</td>
                                        <td className="py-2">{alert.type}</td>
                                        <td className="py-2 text-slate-500 truncate max-w-xs">{alert.description}</td>
                                        <td className="py-2 text-slate-400">{alert.createdAt ? new Date(alert.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <style>{`
                .form-radio { appearance: none; border-radius: 50%; border: 1px solid #d1d5db; width: 1rem; height: 1rem; display: inline-block; vertical-align: middle; background-origin: border-box; user-select: none; flex-shrink: 0; color: currentColor; }
                .form-radio:checked { background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='3'/%3e%3c/svg%3e"); border-color: transparent; background-color: currentColor; background-size: 100% 100%; background-position: center; background-repeat: no-repeat; }
            `}</style>
        </div>
    );
};

