import React, { useState, useCallback, useMemo } from 'react';
import {
    AlertTriangle, Bus, CheckCircle2, Clock, Bell, BellRing,
    Plus, X, ChevronRight, ShieldCheck, Wrench, UserX,
    RefreshCw, AlertCircle, Info
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type DisruptionReason = 'breakdown' | 'reassigned' | 'driver_absent' | 'accident' | 'other';

export interface TransportDisruption {
    id: string;
    affectedBusName: string;
    affectedBusReg: string;
    affectedRoute: string;
    reason: DisruptionReason;
    message: string;
    replacementBusName?: string;
    replacementBusReg?: string;
    replacementDriver?: string;
    affectedStudentCount: number;
    status: 'active' | 'resolved';
    createdAt: string;
    resolvedAt?: string;
    acknowledgedBy: string[];
}

interface FleetVehicle {
    id?: string;
    name: string;
    reg: string;
    route: string;
    driver: string;
    status: 'active' | 'idle' | 'maintenance';
    capacity: number;
}

interface TransportDisruptionAlertProps {
    mode: 'admin' | 'parent';
    alerts: TransportDisruption[];
    onAddAlert?: (alert: TransportDisruption) => void;
    onResolveAlert?: (id: string) => void;
    onAcknowledge?: (id: string, parentId: string) => void;
    parentId?: string;
    parentChildRoutes?: string[]; // route names for this parent's children
    vehicles?: any[];
    routes?: any[];
    users?: any[];
    institutionId?: string;
}

// ─── Demo fleet data fallback ─────────────────────────────────────────────────

const DEMO_FLEET: FleetVehicle[] = [
    { name: 'Bus 04', reg: 'KDC 992P', route: 'Route A – Kilimani & Hurlingham', driver: 'Douglas Omwamba', status: 'active', capacity: 30 },
    { name: 'Bus 02', reg: 'KBB 120Z', route: 'Route B – Langata & Karen', driver: 'James Kamau', status: 'active', capacity: 35 },
    { name: 'Bus 07', reg: 'KDM 441X', route: 'Route C – Westlands & Spring Valley', driver: 'Faith Wanjiku', status: 'idle', capacity: 30 },
    { name: 'Bus 09', reg: 'KCP 338B', route: 'Route D – South C & Embakasi', driver: 'Grace Muthoni', status: 'maintenance', capacity: 28 },
    { name: 'Bus 11', reg: 'KDK 771Q', route: 'Route E – Thika Road', driver: 'Peter Kimani', status: 'active', capacity: 32 },
];

const REASON_META: Record<DisruptionReason, { label: string; icon: React.FC<any>; color: string; bg: string; border: string }> = {
    breakdown:      { label: 'Mechanical Breakdown', icon: Wrench,        color: 'text-rose-600',   bg: 'bg-rose-50 dark:bg-rose-950/30',   border: 'border-rose-200 dark:border-rose-800' },
    reassigned:     { label: 'Vehicle Reassigned',   icon: RefreshCw,     color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
    driver_absent:  { label: 'Driver Absent',        icon: UserX,         color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800' },
    accident:       { label: 'Road Accident',        icon: AlertTriangle, color: 'text-red-700',    bg: 'bg-red-50 dark:bg-red-950/30',     border: 'border-red-300 dark:border-red-800' },
    other:          { label: 'Other Disruption',     icon: Info,          color: 'text-slate-600',  bg: 'bg-slate-50 dark:bg-slate-800',    border: 'border-slate-200 dark:border-slate-700' },
};

const AI_MESSAGES: Record<DisruptionReason, string> = {
    breakdown:     'We regret to inform you that your child\'s scheduled bus has experienced a mechanical issue and cannot complete its route today. We have arranged an alternative vehicle. Please ensure your child waits at the usual pick-up point.',
    reassigned:    'Please note that your child\'s usual bus has been temporarily reassigned for an urgent school function. An alternative bus has been arranged for today\'s route. The schedule remains the same.',
    driver_absent: 'Due to an unexpected absence by your child\'s regular driver, we have deployed a replacement driver and vehicle for today\'s route. All safety protocols remain in place.',
    accident:      'This is an urgent safety notification. Your child\'s bus was involved in a minor incident. All students are safe and accounted for. An alternative vehicle has been dispatched immediately.',
    other:         'There has been a change in your child\'s transport arrangement today. A replacement vehicle has been organised. We apologise for any inconvenience and appreciate your understanding.',
};

// ─── Admin: Log Disruption Form ───────────────────────────────────────────────

const LogDisruptionForm: React.FC<{
    fleet: FleetVehicle[];
    onSubmit: (alert: TransportDisruption) => void;
    onCancel: () => void;
}> = ({ fleet, onSubmit, onCancel }) => {
    const [affectedBus, setAffectedBus] = useState('');
    const [reason, setReason] = useState<DisruptionReason>('breakdown');
    const [message, setMessage] = useState('');
    const [replacementBus, setReplacementBus] = useState('');
    const [aiUsed, setAiUsed] = useState(false);

    const selectedFleet = fleet.find(f => f.reg === affectedBus || (f.id && f.id === affectedBus));
    // Only buses NOT matching the affected one AND not in maintenance are valid replacements
    const availableReplacement = fleet.filter(
        f => f.reg !== affectedBus && (!f.id || f.id !== affectedBus) && f.status !== 'maintenance'
    );
    const selectedReplacement = fleet.find(f => f.reg === replacementBus || (f.id && f.id === replacementBus));

    const handleUseAiMessage = () => {
        setMessage(AI_MESSAGES[reason]);
        setAiUsed(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!affectedBus || !message) return;

        const alert: TransportDisruption = {
            id: `alert_${Date.now()}`,
            affectedBusName: selectedFleet?.name || affectedBus,
            affectedBusReg: selectedFleet?.reg || affectedBus,
            affectedRoute: selectedFleet?.route || 'School Transit Route',
            reason,
            message,
            replacementBusName: selectedReplacement?.name,
            replacementBusReg: selectedReplacement?.reg || replacementBus || undefined,
            replacementDriver: selectedReplacement?.driver,
            affectedStudentCount: selectedFleet?.capacity || 30,
            status: 'active',
            createdAt: new Date().toISOString(),
            acknowledgedBy: [],
        };
        onSubmit(alert);
    };

    const reasonEntry = REASON_META[reason];
    const ReasonIcon = reasonEntry.icon;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Affected Bus */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Affected Bus *</label>
                    <select
                        value={affectedBus}
                        onChange={e => setAffectedBus(e.target.value)}
                        required
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-rose-400 dark:text-white transition-all outline-none"
                    >
                        <option value="">Select bus...</option>
                        {fleet.map(f => (
                            <option key={f.id || f.reg} value={f.reg}>
                                {f.name} ({f.reg}) {f.route ? `— ${f.route}` : ''} {f.driver && f.driver !== 'Not Assigned' ? `• Driver: ${f.driver}` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Reason */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Disruption Reason *</label>
                    <select
                        value={reason}
                        onChange={e => { setReason(e.target.value as DisruptionReason); setAiUsed(false); setMessage(''); }}
                        className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-rose-400 dark:text-white transition-all outline-none"
                    >
                        {(Object.entries(REASON_META) as [DisruptionReason, typeof REASON_META[DisruptionReason]][]).map(([key, val]) => (
                            <option key={key} value={key}>{val.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Reason badge preview */}
            <div className={`flex items-center gap-3 p-4 rounded-2xl ${reasonEntry.bg} border ${reasonEntry.border}`}>
                <ReasonIcon className={`w-5 h-5 flex-shrink-0 ${reasonEntry.color}`} />
                <span className={`text-xs font-black uppercase tracking-widest ${reasonEntry.color}`}>{reasonEntry.label}</span>
                {selectedFleet && (
                    <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {selectedFleet.capacity} students on this route
                    </span>
                )}
            </div>

            {/* Parent Message */}
            <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message to Parents *</label>
                    <button
                        type="button"
                        onClick={handleUseAiMessage}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-violet-100 transition-all"
                    >
                        ✨ AI Draft
                    </button>
                </div>
                <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Type your message to parents, or use the AI Draft button above..."
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-medium dark:text-white focus:ring-2 focus:ring-rose-400 outline-none resize-none transition-all"
                />
                {aiUsed && (
                    <p className="text-[9px] font-bold text-violet-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                        ✨ AI-generated message — feel free to edit before sending
                    </p>
                )}
            </div>

            {/* Replacement Bus */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Auto-Assign Replacement Bus
                    <span className="ml-2 text-emerald-500 font-bold normal-case tracking-normal">{availableReplacement.length} available</span>
                </label>
                <select
                    value={replacementBus}
                    onChange={e => setReplacementBus(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold focus:ring-2 focus:ring-emerald-400 dark:text-white transition-all outline-none"
                >
                    <option value="">No replacement (notify only)</option>
                    {availableReplacement.map(f => (
                        <option key={f.reg} value={f.reg}>
                            {f.name} ({f.reg}) — Driver: {f.driver} — {f.status === 'idle' ? '🟢 Available' : '🔵 On Route'}
                        </option>
                    ))}
                </select>
                {selectedReplacement && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                                {selectedReplacement.name} ({selectedReplacement.reg}) will be auto-assigned
                            </p>
                            <p className="text-[10px] font-bold text-emerald-600/70 mt-0.5">
                                Driver: {selectedReplacement.driver} · Capacity: {selectedReplacement.capacity} seats
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 pt-2">
                <button
                    type="submit"
                    className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <BellRing className="w-4 h-4" />
                    Send Alert & Notify Parents
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-8 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const TransportDisruptionAlert: React.FC<TransportDisruptionAlertProps> = ({
    mode,
    alerts,
    onAddAlert,
    onResolveAlert,
    onAcknowledge,
    parentId = 'parent_user',
    parentChildRoutes = [],
    vehicles,
    routes,
    users,
    institutionId,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [resolvedJustNow, setResolvedJustNow] = useState<string[]>([]);

    // Dynamically resolve real institutional fleet, falling back gracefully if empty
    const fleet: FleetVehicle[] = useMemo(() => {
        // 1. Check passed vehicles
        let rawVehicles: any[] = Array.isArray(vehicles) && vehicles.length > 0 ? vehicles : [];

        // 2. If not passed as props, check localStorage for this institution
        if (rawVehicles.length === 0) {
            const instKey = institutionId ? `eduai_vehicles_${institutionId}` : null;
            const savedInst = instKey ? localStorage.getItem(instKey) : null;
            if (savedInst) {
                try {
                    const parsed = JSON.parse(savedInst);
                    if (Array.isArray(parsed) && parsed.length > 0) rawVehicles = parsed;
                } catch (_) {}
            }
        }

        // 3. Check generic cached vehicles if still empty
        if (rawVehicles.length === 0) {
            try {
                const savedGlobal = localStorage.getItem('eduai_vehicles');
                if (savedGlobal) {
                    const parsed = JSON.parse(savedGlobal);
                    if (Array.isArray(parsed) && parsed.length > 0) rawVehicles = parsed;
                }
            } catch (_) {}
        }

        // 4. If real vehicles exist, map them with route and driver details
        if (rawVehicles.length > 0) {
            let resolvedRoutes: any[] = Array.isArray(routes) && routes.length > 0 ? routes : [];
            if (resolvedRoutes.length === 0 && institutionId) {
                try {
                    const rSaved = localStorage.getItem(`eduai_transport_bus_routes_${institutionId}`) || localStorage.getItem(`eduai_transport_route_fee_settings_${institutionId}`);
                    if (rSaved) {
                        const parsed = JSON.parse(rSaved);
                        if (Array.isArray(parsed)) resolvedRoutes = parsed;
                    }
                } catch (_) {}
            }

            return rawVehicles.map((v, index) => {
                const reg = (v.plateNumber || v.registrationNumber || v.plate || v.reg || `BUS-${index + 1}`).trim().toUpperCase();
                const name = (v.model || v.name || `Bus ${reg}`).trim();

                // Driver resolution
                let driver = (v.driverName || v.driver || '').trim();
                if (!driver && v.driverId && Array.isArray(users)) {
                    const matchedUser = users.find(u => u.id === v.driverId);
                    if (matchedUser?.name) driver = matchedUser.name.trim();
                }
                if (!driver) driver = 'Not Assigned';

                // Route resolution
                let route = (v.route || v.routeName || '').trim();
                if (!route && resolvedRoutes.length > 0) {
                    const matchedRoute = resolvedRoutes.find(r => 
                        r.id === v.routeId ||
                        r.routeId === v.routeId ||
                        (r.bus && (r.bus.toUpperCase().includes(reg) || (name && r.bus.toLowerCase().includes(name.toLowerCase()))))
                    );
                    if (matchedRoute) {
                        route = matchedRoute.name || matchedRoute.routeName || '';
                    }
                }
                if (!route) {
                    route = `Route ${String.fromCharCode(65 + (index % 26))}`;
                }

                const capacity = Number(v.capacity || v.seats || 30);
                const status = (v.status === 'maintenance' || v.status === 'repair') 
                    ? 'maintenance' 
                    : (v.status === 'idle' ? 'idle' : 'active');

                return {
                    id: v.id || `veh_${reg}`,
                    name,
                    reg,
                    route,
                    driver,
                    status,
                    capacity: isNaN(capacity) || capacity <= 0 ? 30 : capacity
                };
            });
        }

        // 5. If demo institution with no vehicles yet, use demo fleet
        return DEMO_FLEET;
    }, [vehicles, routes, users, institutionId]);

    const handleSubmit = useCallback((alert: TransportDisruption) => {
        onAddAlert?.(alert);
        setShowForm(false);
    }, [onAddAlert]);

    const handleResolve = useCallback((id: string) => {
        setResolvedJustNow(prev => [...prev, id]);
        setTimeout(() => onResolveAlert?.(id), 400);
    }, [onResolveAlert]);

    const activeAlerts = alerts.filter(a => a.status === 'active');
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

    // ── PARENT MODE ────────────────────────────────────────────────────────────
    if (mode === 'parent') {
        // Filter alerts that affect this parent's children's routes
        const relevant = activeAlerts.filter(a =>
            parentChildRoutes.length === 0 || parentChildRoutes.some(r => a.affectedRoute.includes(r.split('–')[0]?.trim() || r))
        );

        if (relevant.length === 0) return null;

        return (
            <div className="space-y-4">
                {relevant.map(alert => {
                    const meta = REASON_META[alert.reason] || REASON_META.other;
                    const MetaIcon = meta.icon || Info;
                    const alreadyAcknowledged = alert.acknowledgedBy ? alert.acknowledgedBy.includes(parentId) : false;

                    return (
                        <div
                            key={alert.id}
                            className={`relative overflow-hidden rounded-[2.5rem] border-2 ${meta.border} ${meta.bg} p-6 shadow-lg`}
                        >
                            {/* Pulsing attention dot */}
                            {!alreadyAcknowledged && (
                                <span className="absolute top-5 right-5 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                </span>
                            )}

                            <div className="flex items-start gap-4">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${meta.bg} border ${meta.border}`}>
                                    <MetaIcon className={`w-6 h-6 ${meta.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${meta.color}`}>
                                            {meta.label}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(alert.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className={`text-base font-black uppercase tracking-tight ${meta.color}`}>
                                        {alert.affectedBusName} ({alert.affectedBusReg}) — {alert.affectedRoute}
                                    </h4>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                                        {alert.message}
                                    </p>

                                    {/* Replacement info */}
                                    {alert.replacementBusName && (
                                        <div className="mt-4 flex items-center gap-3 p-4 bg-white/70 dark:bg-slate-800/70 rounded-2xl border border-white/50 dark:border-slate-600">
                                            <Bus className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                                                    Replacement Arranged
                                                </p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                                                    {alert.replacementBusName} ({alert.replacementBusReg}) · Driver: {alert.replacementDriver}
                                                </p>
                                            </div>
                                            <ShieldCheck className="w-5 h-5 text-emerald-500 ml-auto flex-shrink-0" />
                                        </div>
                                    )}

                                    {/* Acknowledge button */}
                                    <div className="mt-4">
                                        {alreadyAcknowledged ? (
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <CheckCircle2 className="w-5 h-5" />
                                                <span className="text-xs font-black uppercase tracking-widest">Alert Acknowledged</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => onAcknowledge?.(alert.id, parentId)}
                                                className={`px-8 py-3 ${meta.color.replace('text-', 'bg-').replace('-600', '-600').replace('-700', '-700')} bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2`}
                                            >
                                                <Bell className="w-4 h-4" />
                                                I Acknowledge This Alert
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    // ── ADMIN MODE ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        Transport Disruption Alerts
                    </h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Log bus unavailability, auto-assign replacements, and notify parents instantly
                    </p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-3 px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-100 dark:shadow-none transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Log Disruption
                    </button>
                )}
            </div>

            {/* Summary badges */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Active Alerts', value: activeAlerts.length, color: 'from-rose-500 to-rose-600', icon: AlertCircle },
                    { label: 'Parents Notified', value: activeAlerts.reduce((s, a) => s + a.acknowledgedBy.length, 0), color: 'from-emerald-500 to-emerald-600', icon: CheckCircle2 },
                    { label: 'Resolved Today', value: resolvedAlerts.length, color: 'from-slate-500 to-slate-600', icon: ShieldCheck },
                ].map(stat => (
                    <div key={stat.label} className={`bg-gradient-to-br ${stat.color} p-5 rounded-[2rem] text-white shadow-lg`}>
                        <stat.icon className="w-5 h-5 opacity-70 mb-2" />
                        <p className="text-2xl font-black">{stat.value}</p>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Log Disruption Form */}
            {showForm && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Log New Disruption</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All parents on affected route will be notified</p>
                            </div>
                        </div>
                        <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    <LogDisruptionForm fleet={fleet} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
                </div>
            )}

            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-between">
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-tight">Active Disruptions</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activeAlerts.length} alert{activeAlerts.length !== 1 ? 's' : ''} currently in effect</p>
                        </div>
                        <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700">
                        {activeAlerts.map(alert => {
                            const meta = REASON_META[alert.reason] || REASON_META.other;
                            const MetaIcon = meta.icon || Info;
                            const isResolvingNow = resolvedJustNow.includes(alert.id);
                            const ackPct = Math.round(((alert.acknowledgedBy || []).length / Math.max(alert.affectedStudentCount, 1)) * 100);

                            return (
                                <div key={alert.id} className={`p-6 transition-all ${isResolvingNow ? 'opacity-40 scale-95' : ''}`}>
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                        {/* Left: info */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${meta.bg} border ${meta.border}`}>
                                                <MetaIcon className={`w-6 h-6 ${meta.color}`} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${meta.color}`}>{meta.label}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 uppercase tracking-tight">
                                                    {alert.affectedBusName} ({alert.affectedBusReg})
                                                </p>
                                                <p className="text-xs font-bold text-slate-500 mt-0.5">{alert.affectedRoute}</p>
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 dark:text-slate-400">{alert.message}</p>
                                            </div>
                                        </div>

                                        {/* Middle: replacement & stats */}
                                        <div className="flex flex-col gap-2 lg:w-56">
                                            {alert.replacementBusName ? (
                                                <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                                    <Bus className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Replacement</p>
                                                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">{alert.replacementBusName} · {alert.replacementDriver}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-800">
                                                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">No Replacement Set</p>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                    {alert.acknowledgedBy.length} acknowledged
                                                </span>
                                                <span>{alert.affectedStudentCount} affected</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                                <div
                                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.min(ackPct, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Right: action */}
                                        <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                                            <button
                                                onClick={() => handleResolve(alert.id)}
                                                className="flex items-center gap-2 px-5 py-3 bg-slate-900 dark:bg-slate-700 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                                Mark Resolved
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Resolved Alerts */}
            {resolvedAlerts.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-50 dark:border-slate-700">
                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-400">Resolved Alerts</h4>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-700">
                        {resolvedAlerts.map(alert => {
                            const meta = REASON_META[alert.reason] || REASON_META.other;
                            const MetaIcon = meta.icon || Info;
                            return (
                                <div key={alert.id} className="p-5 flex items-center gap-4 opacity-60">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        <MetaIcon className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                                            {alert.affectedBusName} — {alert.affectedRoute}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{meta.label} · Resolved</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-600">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Resolved</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {alerts.length === 0 && !showForm && (
                <div className="bg-white dark:bg-slate-800 p-16 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-700 text-center">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">All Clear</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">No active transport disruptions. All buses are operating normally.</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="mt-6 inline-flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Log a Disruption
                    </button>
                </div>
            )}
        </div>
    );
};
