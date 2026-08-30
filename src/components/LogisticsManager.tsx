
import React, { useState, useMemo } from 'react';
import { 
    Truck, 
    Package, 
    MapPin, 
    ShieldCheck, 
    Navigation, 
    Signature, 
    Camera, 
    Calendar, 
    BarChart3, 
    Plus, 
    Search, 
    MoreHorizontal,
    ArrowRight,
    Fuel,
    AlertCircle,
    User,
    CheckCircle2,
    Clock,
    Armchair,
    DoorOpen,
    QrCode,
    Smartphone,
    UserPlus,
    Receipt,
    Ticket,
    Landmark,
    Users,
    Bell,
    Edit3,
    Trash2,
    Filter,
    GraduationCap,
    Layers,
    X,
    FileText,
    Printer,
    Download,
    DollarSign,
    CheckCircle,
    TrendingUp,
    Briefcase
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Institution, User as UserType } from '../types';
import { getStudentResolvedAdm, getStudentResolvedClass } from './his/RegisterPatientModal';
import { TransportDisruptionAlert } from './TransportDisruptionAlert';
import type { TransportDisruption } from './TransportDisruptionAlert';
import { TransportBillingManager } from './TransportBillingManager';
import type { RouteFeeSetting, TransportFeeInvoice, BillingCycle } from './TransportBillingManager';
import { TransportManager } from './TransportManager';
import { apiService } from '../services/apiService';

interface Shipment {
    id: string;
    trackingId: string;
    origin: string;
    destination: string;
    status: 'pending' | 'in_transit' | 'delivered' | 'delayed';
    clientName: string;
    weight: string;
    driverId: string;
    eta: string;
    proofOfDelivery?: {
        signatureUrl?: string;
        photoUrl?: string;
        timestamp: string;
        receiverName: string;
    }
}

interface LogisticsManagerProps {
    currentInstitution: Institution;
    users: UserType[];
}

export const LogisticsManager: React.FC<LogisticsManagerProps> = ({ currentInstitution, users }) => {
    const isShuttle = currentInstitution.category === 'Staff Shuttle' || currentInstitution.category === 'Corporate Shuttle';
    const isPublicTransport = currentInstitution.category === 'Public Transport' || currentInstitution.institutionType === 'Logistics' && currentInstitution.category === 'Cargo & Delivery';
    // Actually, based on user request, let's explicitly detect Public Transport
    const isSACCO = currentInstitution.category === 'Public Transport' || currentInstitution.category?.includes('SACCO');
    const isEduTransport = currentInstitution.category === 'Educational Transport' || currentInstitution.institutionType === 'Education' || currentInstitution.institutionType === 'Primary' || currentInstitution.institutionType === 'Secondary';

    const [activeTab, setActiveTab] = useState<'manifest' | 'fleet' | 'vehicle_reg' | 'analytics' | 'epod' | 'shuttle' | 'sacco' | 'trips' | 'alerts' | 'billing' | 'reports'>(
        isSACCO ? 'sacco' : isShuttle ? 'shuttle' : 'manifest'
    );
    const [searchTerm, setSearchTerm] = useState('');
    const [reportSubTab, setReportSubTab] = useState<'billing' | 'routes' | 'fleet' | 'trips' | 'alerts'>('billing');
    const [reportSearch, setReportSearch] = useState('');
    const [reportStatusFilter, setReportStatusFilter] = useState('ALL');

    // Vehicles state & API operations for Vehicle Registration tab & fleet selections
    const [dbVehicles, setDbVehicles] = useState<any[]>(() => {
        const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : 'eduai_vehicles';
        const saved = localStorage.getItem(key) ?? localStorage.getItem('eduai_vehicles');
        if (saved !== null) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.error('Failed to parse saved vehicles from localStorage:', e);
            }
        }
        if (currentInstitution?.id?.startsWith('demo_')) {
            const demo = [
                { id: 'vh_demo_1', plateNumber: 'KDC 992P', model: 'Bus 04', vehicleType: 'bus', capacity: 51, status: 'active', institutionId: currentInstitution?.id, driverName: 'Douglas Omwamba' },
                { id: 'vh_demo_2', plateNumber: 'KBB 120Z', model: 'Bus 02', vehicleType: 'bus', capacity: 33, status: 'active', institutionId: currentInstitution?.id, driverName: 'James Kamau' },
                { id: 'vh_demo_3', plateNumber: 'KDM 441X', model: 'Bus 07', vehicleType: 'bus', capacity: 25, status: 'active', institutionId: currentInstitution?.id, driverName: 'Douglas Omwamba' },
            ];
            localStorage.setItem(key, JSON.stringify(demo));
            localStorage.setItem('eduai_vehicles', JSON.stringify(demo));
            return demo;
        }
        return [];
    });
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    const fetchVehiclesList = async () => {
        setIsLoadingVehicles(true);
        try {
            const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : 'eduai_vehicles';
            const apiRecords = await apiService.fetchModuleRecords('vehicles', currentInstitution.id).catch(() => []);
            if (Array.isArray(apiRecords) && apiRecords.length > 0) {
                setDbVehicles(apiRecords);
                localStorage.setItem(key, JSON.stringify(apiRecords));
                localStorage.setItem('eduai_vehicles', JSON.stringify(apiRecords));
            } else {
                const saved = localStorage.getItem(key) ?? localStorage.getItem('eduai_vehicles');
                if (saved !== null) {
                    try {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed)) setDbVehicles(parsed);
                    } catch (e) {}
                } else if (currentInstitution?.id?.startsWith('demo_')) {
                    const demo = [
                        { id: 'vh_demo_1', plateNumber: 'KDC 992P', model: 'Bus 04', vehicleType: 'bus', capacity: 51, status: 'active', institutionId: currentInstitution?.id, driverName: 'Douglas Omwamba' },
                        { id: 'vh_demo_2', plateNumber: 'KBB 120Z', model: 'Bus 02', vehicleType: 'bus', capacity: 33, status: 'active', institutionId: currentInstitution?.id, driverName: 'James Kamau' },
                        { id: 'vh_demo_3', plateNumber: 'KDM 441X', model: 'Bus 07', vehicleType: 'bus', capacity: 25, status: 'active', institutionId: currentInstitution?.id, driverName: 'Douglas Omwamba' },
                    ];
                    setDbVehicles(demo);
                    localStorage.setItem(key, JSON.stringify(demo));
                    localStorage.setItem('eduai_vehicles', JSON.stringify(demo));
                } else {
                    setDbVehicles([]);
                }
            }
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        } finally {
            setIsLoadingVehicles(false);
        }
    };

    React.useEffect(() => {
        fetchVehiclesList();
    }, [currentInstitution.id]);

    const handleAddVehicle = async (vehicleData: any) => {
        try {
            const newVehicle = {
                ...vehicleData,
                id: `vh_${Date.now()}`,
                institutionId: currentInstitution.id
            };
            const next = [newVehicle, ...dbVehicles];
            setDbVehicles(next);
            const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : 'eduai_vehicles';
            localStorage.setItem(key, JSON.stringify(next));
            localStorage.setItem('eduai_vehicles', JSON.stringify(next));

            await apiService.saveModuleRecord('vehicles', newVehicle).catch(() => {});
        } catch (err: any) {
            alert('Failed to add vehicle: ' + (err.message || err));
        }
    };

    const handleUpdateVehicle = async (id: string, updates: any) => {
        try {
            const next = dbVehicles.map(v => v.id === id ? { ...v, ...updates } : v);
            setDbVehicles(next);
            const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : 'eduai_vehicles';
            localStorage.setItem(key, JSON.stringify(next));
            localStorage.setItem('eduai_vehicles', JSON.stringify(next));

            const updatedVehicle = next.find(v => v.id === id);
            if (updatedVehicle) {
                await apiService.saveModuleRecord('vehicles', updatedVehicle).catch(() => {});
            }
        } catch (err: any) {
            alert('Failed to update vehicle: ' + (err.message || err));
        }
    };

    const handleDeleteVehicle = async (id: string) => {
        try {
            const next = dbVehicles.filter(v => v.id !== id);
            setDbVehicles(next);
            const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : 'eduai_vehicles';
            localStorage.setItem(key, JSON.stringify(next));
            localStorage.setItem('eduai_vehicles', JSON.stringify(next));

            await apiService.deleteModuleRecord('vehicles', id).catch(() => {});
        } catch (err: any) {
            alert('Failed to delete vehicle: ' + (err.message || err));
        }
    };

    const handleAddUser = async (userData: any) => {
        try {
            const newUser = {
                ...userData,
                id: `usr_${Date.now()}`,
                institutionId: currentInstitution.id
            };
            await apiService.saveModuleRecord('users', newUser);
            alert('Driver added successfully!');
        } catch (err: any) {
            alert('Failed to add driver: ' + (err.message || err));
        }
    };

    const handleEditUser = async (userId: string, data: any) => {
        try {
            const existingUser = users.find(u => u.id === userId);
            const updated = {
                ...existingUser,
                ...data,
                id: userId
            };
            await apiService.saveModuleRecord('users', updated);
            alert('Driver updated successfully!');
        } catch (err: any) {
            alert('Failed to update driver: ' + (err.message || err));
        }
    };

    // Transport Disruption Alerts state
    const [transportAlerts, setTransportAlerts] = useState<TransportDisruption[]>([]);

    const handleAddAlert = (alert: TransportDisruption) => {
        setTransportAlerts(prev => [alert, ...prev]);
    };

    const handleResolveAlert = (id: string) => {
        setTransportAlerts(prev => prev.map(a => a.id === id
            ? { ...a, status: 'resolved', resolvedAt: new Date().toISOString() }
            : a
        ));
    };

    const handleAcknowledgeAlert = (id: string, parentId: string) => {
        setTransportAlerts(prev => prev.map(a => a.id === id
            ? { ...a, acknowledgedBy: [...a.acknowledgedBy.filter(p => p !== parentId), parentId] }
            : a
        ));
    };
    // ── TRANSPORT BILLING STATE ────────────────────────────────────────────────
    const [routeFeeSetting, setRouteFeeSetting] = useState<RouteFeeSetting[]>(() => {
        const instKey = currentInstitution?.id ? `eduai_transport_route_fee_settings_${currentInstitution.id}` : null;
        const saved = (instKey ? localStorage.getItem(instKey) : null) ?? localStorage.getItem('eduai_transport_route_fee_settings');
        if (saved !== null) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.error('Error parsing route settings:', e);
            }
        }
        const defaultFees = [
            { routeId: 'route_1', routeName: 'Route A – Kilimani & Hurlingham', termFee: 8500,  monthlyFee: 3200, currency: 'KES' },
            { routeId: 'route_2', routeName: 'Route B – Langata & Karen',        termFee: 9500,  monthlyFee: 3600, currency: 'KES' },
            { routeId: 'route_3', routeName: 'Route C – Westlands & Spring Valley', termFee: 7800, monthlyFee: 3000, currency: 'KES' },
        ];
        if (instKey) localStorage.setItem(instKey, JSON.stringify(defaultFees));
        localStorage.setItem('eduai_transport_route_fee_settings', JSON.stringify(defaultFees));
        return defaultFees;
    });

    React.useEffect(() => {
        const key = currentInstitution?.id ? `eduai_transport_route_fee_settings_${currentInstitution.id}` : 'eduai_transport_route_fee_settings';
        localStorage.setItem(key, JSON.stringify(routeFeeSetting));
        localStorage.setItem('eduai_transport_route_fee_settings', JSON.stringify(routeFeeSetting));
    }, [routeFeeSetting, currentInstitution?.id]);

    const [transportInvoices, setTransportInvoices] = useState<TransportFeeInvoice[]>(() => {
        const key = currentInstitution?.id ? `eduai_transport_fee_invoices_${currentInstitution.id}` : 'eduai_transport_fee_invoices';
        const saved = localStorage.getItem(key) ?? localStorage.getItem('eduai_transport_fee_invoices');
        if (saved !== null) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.error('Error parsing transport invoices from localStorage:', e);
            }
        }
        return [];
    });

    React.useEffect(() => {
        const key = currentInstitution?.id ? `eduai_transport_fee_invoices_${currentInstitution.id}` : 'eduai_transport_fee_invoices';
        localStorage.setItem(key, JSON.stringify(transportInvoices));
        localStorage.setItem('eduai_transport_fee_invoices', JSON.stringify(transportInvoices));
    }, [transportInvoices, currentInstitution?.id]);

    const [studentCommutePrefs, setStudentCommutePrefs] = useState<Record<string, { routeId: string; preference: 'round_trip' | 'one_way_pickup' | 'one_way_drop' | 'none' }>>(() => {
        const instKey = currentInstitution?.id ? `eduai_student_commute_prefs_${currentInstitution.id}` : null;
        const saved = (instKey ? localStorage.getItem(instKey) : null) ?? localStorage.getItem('eduai_student_commute_prefs');
        if (saved !== null) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {
                console.error('Error parsing student commute prefs:', e);
            }
        }
        return {};
    });

    React.useEffect(() => {
        const key = currentInstitution?.id ? `eduai_student_commute_prefs_${currentInstitution.id}` : 'eduai_student_commute_prefs';
        localStorage.setItem(key, JSON.stringify(studentCommutePrefs));
        localStorage.setItem('eduai_student_commute_prefs', JSON.stringify(studentCommutePrefs));
    }, [studentCommutePrefs, currentInstitution?.id]);

    const [defaultOneWayPercentage, setDefaultOneWayPercentage] = useState<number>(() => {
        const instKey = currentInstitution?.id ? `eduai_transport_oneway_pct_${currentInstitution.id}` : null;
        const saved = (instKey ? localStorage.getItem(instKey) : null) ?? localStorage.getItem('eduai_transport_oneway_pct');
        if (saved !== null) {
            const val = Number(saved);
            if (!isNaN(val) && val >= 1 && val <= 100) return val;
        }
        return 60;
    });

    React.useEffect(() => {
        const key = currentInstitution?.id ? `eduai_transport_oneway_pct_${currentInstitution.id}` : 'eduai_transport_oneway_pct';
        localStorage.setItem(key, String(defaultOneWayPercentage));
        localStorage.setItem('eduai_transport_oneway_pct', String(defaultOneWayPercentage));
    }, [defaultOneWayPercentage, currentInstitution?.id]);

    const PREF_MULTIPLIER: Record<string, number> = { round_trip: 1.0, one_way_pickup: 0.6, one_way_drop: 0.6, none: 0 };

    const handleUpdateRouteFee = (routeId: string, termFee: number, monthlyFee: number, routeName?: string, oneWayPercentage?: number) => {
        setRouteFeeSetting(prev => prev.map(r => r.routeId === routeId ? {
            ...r,
            termFee,
            monthlyFee,
            ...(routeName ? { routeName } : {}),
            ...(oneWayPercentage !== undefined ? { oneWayPercentage } : {})
        } : r));
        if (routeName) {
            setBusRoutes(prev => prev.map(br => br.id === routeId ? { ...br, name: routeName } : br));
        }
    };

    const handleGenerateInvoices = (cycle: BillingCycle, period: string) => {
        const demoStudents = [
            { id: 'st_1', name: 'Kelvin Kiprop',  admissionNumber: 'ADM/8821/24' },
            { id: 'st_2', name: 'Alisha Wanjiku', admissionNumber: 'ADM/9012/24' },
            { id: 'st_3', name: 'Liam Otieno',    admissionNumber: 'ADM/8774/24' },
            { id: 'st_4', name: 'Chloe Kamau',    admissionNumber: 'ADM/9331/25' },
            { id: 'st_5', name: 'Ethan Ndwiga',   admissionNumber: 'ADM/8109/23' },
        ];
        const sourceStudents = students.length > 0
            ? students.map(s => ({ id: s.id, name: s.name, admissionNumber: (s as any).admissionNumber || `ADM/${Math.floor(Math.random()*9000+1000)}/24` }))
            : demoStudents;

        const newInvoices: TransportFeeInvoice[] = [];
        const due = new Date(); due.setDate(due.getDate() + 14);

        sourceStudents.forEach((student, idx) => {
            const pref = studentCommutePrefs[student.id];
            if (!pref || pref.preference === 'none') return;
            const route = routeFeeSetting.find(r => r.routeId === (pref?.routeId || ['route_1','route_2','route_3'][idx % 3]));
            if (!route) return;
            const oneWayPct = (route.oneWayPercentage ?? defaultOneWayPercentage ?? 60) / 100;
            const multiplier = pref.preference === 'round_trip' ? 1.0 : oneWayPct;
            const base = cycle === 'term' ? route.termFee : route.monthlyFee;
            const finalAmt = Math.round(base * multiplier);
            if (finalAmt === 0) return;
            // avoid duplicates for the same period
            if (transportInvoices.some(i => i.studentId === student.id && i.period === period)) return;
            newInvoices.push({
                id: `tinv_${Date.now()}_${idx}`,
                studentId: student.id,
                studentName: student.name,
                admissionNumber: student.admissionNumber,
                routeId: route.routeId,
                routeName: route.routeName,
                preference: pref.preference,
                billingCycle: cycle,
                period,
                baseAmount: base,
                discountAmount: 0,
                finalAmount: finalAmt,
                status: 'pending',
                issuedDate: new Date().toISOString(),
                dueDate: due.toISOString(),
            });
        });
        setTransportInvoices(prev => [...prev, ...newInvoices]);
    };

    const handleMarkPaid = (invoiceId: string, method: string) => {
        setTransportInvoices(prev => prev.map(i => i.id === invoiceId
            ? { ...i, status: 'paid', paidDate: new Date().toISOString(), paymentMethod: method }
            : i
        ));
    };

    const handleWaiveFee = (invoiceId: string, _reason: string) => {
        setTransportInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'waived' } : i));
    };
    // ─────────────────────────────────────────────────────────────────────────

    // Commute Sub-Tabs inside manifest view
    const [commuteSubTab, setCommuteSubTab] = useState<'monitor' | 'routes' | 'students'>('monitor');

    // Security Checkout State: maps run.id to checkout information
    const [securityCheckouts, setSecurityCheckouts] = useState<Record<string, { cleared: boolean; checkedOutBy?: string; checkedOutAt?: string }>>({
        'run_1': { cleared: false }, // Let's make the active bus (Bus 04 / run_1) start as NOT cleared so parents/admins see the interactive security prompt!
        'run_2': { cleared: true, checkedOutBy: 'Officer Joseph W.', checkedOutAt: '06:12 AM' },
        'run_3': { cleared: true, checkedOutBy: 'Officer Grace M.', checkedOutAt: '03:15 PM' },
    });

    // School Bus Routes State
    const [busRoutes, setBusRoutes] = useState<Array<{
        id: string;
        name: string;
        startPoint: string;
        endPoint: string;
        bus: string;
        driver: string;
        attendant: string;
    }>>(() => {
        const instKey = currentInstitution?.id ? `eduai_transport_bus_routes_${currentInstitution.id}` : null;
        const saved = (instKey ? localStorage.getItem(instKey) : null) ?? localStorage.getItem('eduai_transport_bus_routes');
        if (saved !== null) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.error('Error parsing bus routes from localStorage:', e);
            }
        }
        const defaultRoutes = [
            { id: 'route_1', name: 'Route A - Kilimani & Hurlingham', startPoint: 'Hurlingham Shopping Center', endPoint: 'Westlands School Gate', bus: 'Bus 04 (KDC 992P)', driver: 'Douglas Omwamba', attendant: 'Sarah Wanjiku' },
            { id: 'route_2', name: 'Route B - Langata & Karen', startPoint: 'Karen Hub', endPoint: 'Westlands School Gate', bus: 'Bus 02 (KBB 120Z)', driver: 'James Kamau', attendant: 'Mercy Nyambura' },
            { id: 'route_3', name: 'Route C - Westlands & Spring Valley', startPoint: 'Spring Valley Estate', endPoint: 'Westlands School Gate', bus: 'Bus 07 (KDM 441X)', driver: 'Douglas Omwamba', attendant: 'Sarah Wanjiku' },
        ];
        if (instKey) localStorage.setItem(instKey, JSON.stringify(defaultRoutes));
        localStorage.setItem('eduai_transport_bus_routes', JSON.stringify(defaultRoutes));
        return defaultRoutes;
    });

    React.useEffect(() => {
        const key = currentInstitution?.id ? `eduai_transport_bus_routes_${currentInstitution.id}` : 'eduai_transport_bus_routes';
        localStorage.setItem(key, JSON.stringify(busRoutes));
        localStorage.setItem('eduai_transport_bus_routes', JSON.stringify(busRoutes));
    }, [busRoutes, currentInstitution?.id]);

    // Route Registration & Editing Modal States
    const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
    const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>('ALL');
    const [editingRoute, setEditingRoute] = useState<{
        id: string;
        name: string;
        startPoint: string;
        endPoint: string;
        bus: string;
        driver: string;
        attendant: string;
    } | null>(null);
    const [newRouteName, setNewRouteName] = useState('');
    const [newRouteStart, setNewRouteStart] = useState('');
    const [newRouteEnd, setNewRouteEnd] = useState('');
    const [newRouteBus, setNewRouteBus] = useState('Bus 04 (KDC 992P)');
    const [newRouteDriver, setNewRouteDriver] = useState('');
    const [newRouteAttendant, setNewRouteAttendant] = useState('');

    const getStudentResolvedStream = (u: any): string => {
        if (!u) return '';
        const stream = (
            u.stream ||
            u.stream_name ||
            u.metadata?.stream ||
            u.metadata?.streamName ||
            u.metadata?.stream_name ||
            u.metadata?.stream_title ||
            u.metadata?.section ||
            u.metadata?.arm ||
            ''
        );
        return String(stream).trim();
    };

    const getStudentBaseClass = (u: any): string => {
        if (!u) return 'Unassigned';
        const rawClass = (
            u.studentClass ||
            u.supervisedClass ||
            u.metadata?.studentClass ||
            u.metadata?.className ||
            u.metadata?.gradeLevel ||
            u.metadata?.class_level ||
            u.metadata?.grade_level ||
            u.metadata?.grade ||
            u.metadata?.class ||
            u.metadata?.class_name ||
            u.metadata?.courseLevel ||
            u.metadata?.academicLevel ||
            u.metadata?.form ||
            u.metadata?.level ||
            u.className ||
            u.gradeLevel ||
            u.grade ||
            u.class ||
            ''
        );
        const stream = getStudentResolvedStream(u);
        let classStr = String(rawClass).trim();
        if (stream && classStr.toLowerCase().endsWith(stream.toLowerCase())) {
            classStr = classStr.substring(0, classStr.length - stream.length).trim();
        }
        return classStr || 'Unassigned';
    };

    const handleOpenAddRoute = () => {
        setEditingRoute(null);
        setNewRouteName('');
        setNewRouteStart('');
        setNewRouteEnd(currentInstitution.name ? `${currentInstitution.name} Main Gate` : 'School Main Gate');
        const defaultVehicle = availableVehicleOptions[0];
        setNewRouteBus(defaultVehicle?.label || '');
        setNewRouteDriver(defaultVehicle?.driver || drivers[0]?.name || '');
        setNewRouteAttendant(assistants[0]?.name || '');
        setIsAddRouteModalOpen(true);
    };

    const handleOpenEditRoute = (route: {
        id: string;
        name: string;
        startPoint: string;
        endPoint: string;
        bus: string;
        driver: string;
        attendant: string;
    }) => {
        setEditingRoute(route);
        setNewRouteName(route.name);
        setNewRouteStart(route.startPoint);
        setNewRouteEnd(route.endPoint);
        setNewRouteBus(route.bus || availableVehicleOptions[0]?.label || '');
        setNewRouteDriver(route.driver || '');
        setNewRouteAttendant(route.attendant || '');
        setIsAddRouteModalOpen(true);
    };

    const handleDeleteRoute = (routeId: string) => {
        const routeToDelete = busRoutes.find(r => r.id === routeId);
        if (!routeToDelete) return;
        if (!window.confirm(`Are you sure you want to delete the route "${routeToDelete.name}"? This action cannot be undone.`)) {
            return;
        }

        const nextRoutes = busRoutes.filter(r => r.id !== routeId);
        const nextFees = routeFeeSetting.filter(rf => rf.routeId !== routeId);

        setBusRoutes(nextRoutes);
        setRouteFeeSetting(nextFees);

        const routeKey = currentInstitution?.id ? `eduai_transport_bus_routes_${currentInstitution.id}` : 'eduai_transport_bus_routes';
        const feeKey = currentInstitution?.id ? `eduai_transport_route_fee_settings_${currentInstitution.id}` : 'eduai_transport_route_fee_settings';
        localStorage.setItem(routeKey, JSON.stringify(nextRoutes));
        localStorage.setItem('eduai_transport_bus_routes', JSON.stringify(nextRoutes));
        localStorage.setItem(feeKey, JSON.stringify(nextFees));
        localStorage.setItem('eduai_transport_route_fee_settings', JSON.stringify(nextFees));

        // Clean up student preferences assigned to this route
        setStudentCommutePrefs(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(stId => {
                if (next[stId]?.routeId === routeId) {
                    delete next[stId];
                }
            });
            const prefKey = currentInstitution?.id ? `eduai_student_commute_prefs_${currentInstitution.id}` : 'eduai_student_commute_prefs';
            localStorage.setItem(prefKey, JSON.stringify(next));
            localStorage.setItem('eduai_student_commute_prefs', JSON.stringify(next));
            return next;
        });
    };

    const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);

    // Automatically map existing students to initial routes ONLY on first-ever load if nothing has been saved yet
    React.useEffect(() => {
        if (!isEduTransport) return;
        const key = currentInstitution?.id ? `eduai_student_commute_prefs_${currentInstitution.id}` : 'eduai_student_commute_prefs';
        const saved = localStorage.getItem(key) ?? localStorage.getItem('eduai_student_commute_prefs');
        if (saved !== null) {
            // User already has saved preferences (even if empty after deleting routes), do NOT overwrite!
            return;
        }
        if (busRoutes.length === 0) return;
        const initialPrefs: typeof studentCommutePrefs = {};
        students.forEach((student, index) => {
            const routes = busRoutes.map(r => r.id);
            const prefs: ('round_trip' | 'one_way_pickup' | 'one_way_drop' | 'none')[] = ['round_trip', 'one_way_pickup', 'one_way_drop'];
            initialPrefs[student.id] = {
                routeId: routes[index % routes.length],
                preference: prefs[index % prefs.length]
            };
        });
        setStudentCommutePrefs(initialPrefs);
    }, [students, isEduTransport, busRoutes, currentInstitution?.id]);

    const [schoolTrips, setSchoolTrips] = useState<Array<{
        id: string;
        name: string;
        destination: string;
        date: string;
        time: string;
        leadTeacher: string;
        vehicle: string;
        passengers: string;
        status: 'approved' | 'pending' | 'completed' | 'cancelled';
    }>>(() => {
        const key = currentInstitution?.id ? `eduai_school_trips_${currentInstitution.id}` : 'eduai_school_trips';
        const saved = localStorage.getItem(key) ?? localStorage.getItem('eduai_school_trips');
        if (saved !== null) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved school trips', e);
            }
        }
        // Only seed initial demo trips for demo institutions
        if (currentInstitution?.id?.startsWith('demo_')) {
            const initialDemoTrips = [
                { id: 'trip_1', name: 'National Museum Geography Tour', destination: 'Nairobi National Museum', date: '2026-06-28', time: '08:30 AM', leadTeacher: 'Mr. Benson Kiprop', vehicle: 'KDC 992P (Bus 04)', passengers: '45 Students', status: 'approved' as const },
                { id: 'trip_2', name: 'Inter-School Athletics Competition', destination: 'Kasarani Stadium', date: '2026-07-02', time: '07:00 AM', leadTeacher: 'Mrs. Janet Otieno', vehicle: 'KBB 120Z (Bus 02)', passengers: '38 Athletes', status: 'approved' as const },
                { id: 'trip_3', name: 'Primary School Science Field Trip', destination: 'Karura Forest Reserve', date: '2026-07-10', time: '09:00 AM', leadTeacher: 'Miss Emily Muthoni', vehicle: 'KDM 441X (Bus 07)', passengers: '50 Students', status: 'pending' as const },
            ];
            localStorage.setItem(key, JSON.stringify(initialDemoTrips));
            localStorage.setItem('eduai_school_trips', JSON.stringify(initialDemoTrips));
            return initialDemoTrips;
        }
        // Fresh accounts start with an empty trips list
        return [];
    });

    React.useEffect(() => {
        if (!isEduTransport) return;
        const key = currentInstitution?.id ? `eduai_school_trips_${currentInstitution.id}` : 'eduai_school_trips';
        const saved = localStorage.getItem(key) ?? localStorage.getItem('eduai_school_trips');
        if (saved !== null) {
            try {
                setSchoolTrips(JSON.parse(saved));
            } catch (e) {}
        } else if (currentInstitution?.id?.startsWith('demo_')) {
            const initialDemoTrips = [
                { id: 'trip_1', name: 'National Museum Geography Tour', destination: 'Nairobi National Museum', date: '2026-06-28', time: '08:30 AM', leadTeacher: 'Mr. Benson Kiprop', vehicle: 'KDC 992P (Bus 04)', passengers: '45 Students', status: 'approved' as const },
                { id: 'trip_2', name: 'Inter-School Athletics Competition', destination: 'Kasarani Stadium', date: '2026-07-02', time: '07:00 AM', leadTeacher: 'Mrs. Janet Otieno', vehicle: 'KBB 120Z (Bus 02)', passengers: '38 Athletes', status: 'approved' as const },
                { id: 'trip_3', name: 'Primary School Science Field Trip', destination: 'Karura Forest Reserve', date: '2026-07-10', time: '09:00 AM', leadTeacher: 'Miss Emily Muthoni', vehicle: 'KDM 441X (Bus 07)', passengers: '50 Students', status: 'pending' as const },
            ];
            setSchoolTrips(initialDemoTrips);
            localStorage.setItem(key, JSON.stringify(initialDemoTrips));
            localStorage.setItem('eduai_school_trips', JSON.stringify(initialDemoTrips));
        } else {
            setSchoolTrips([]);
        }
    }, [currentInstitution?.id, isEduTransport]);

    // Modal state for adding a new trip
    const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);
    const [newTripName, setNewTripName] = useState('');
    const [newTripDestination, setNewTripDestination] = useState('');
    const [newTripDate, setNewTripDate] = useState('');
    const [newTripTime, setNewTripTime] = useState('');
    const [newTripTeacher, setNewTripTeacher] = useState('');
    const [newTripVehicle, setNewTripVehicle] = useState('');
    const [newTripPassengers, setNewTripPassengers] = useState('');

    // GPS Map Simulation State
    const [simulatedBusPos, setSimulatedBusPos] = useState({ x: 80, y: 140 });
    const [currentCheckPoint, setCurrentCheckPoint] = useState('Kilimani Sub-Station');
    const [simulatedSpeed, setSimulatedSpeed] = useState(38);
    const [parentLinkCopied, setParentLinkCopied] = useState(false);

    React.useEffect(() => {
        if (!isEduTransport) return;
        
        const checkpoints = [
            { name: 'Kilimani Sub-Station', x: 80, y: 140, speed: 38 },
            { name: 'Hurlingham Junction', x: 180, y: 120, speed: 45 },
            { name: 'Valley Arcade Roundabout', x: 260, y: 180, speed: 30 },
            { name: 'Westlands School Gate', x: 380, y: 90, speed: 0 }
        ];

        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % checkpoints.length;
            const target = checkpoints[index];
            setSimulatedBusPos({ x: target.x, y: target.y });
            setCurrentCheckPoint(target.name);
            setSimulatedSpeed(target.speed);
        }, 6000);

        return () => clearInterval(interval);
    }, [isEduTransport]);

    const drivers = useMemo(() => users.filter(u => u.role === 'driver' || u.roles?.includes('driver')), [users]);
    const assistants = useMemo(() => users.filter(u => u.role === 'transport_assistant' || u.roles?.includes('transport_assistant') || u.role === 'staff'), [users]);

    const availableVehicleOptions = useMemo(() => {
        if (dbVehicles && dbVehicles.length > 0) {
            return dbVehicles.map(v => {
                const plate = (v.plateNumber || v.registrationNumber || v.plate || '').trim();
                const modelOrName = (v.model || v.name || 'Vehicle').trim();
                const label = plate ? (modelOrName ? `${modelOrName} (${plate})` : plate) : modelOrName;
                return {
                    id: v.id,
                    label,
                    plate,
                    model: v.model || '',
                    driver: v.driverName || v.driver || '',
                    capacity: v.capacity || v.seats || ''
                };
            });
        }
        if (currentInstitution?.id?.startsWith('demo_')) {
            return [
                { id: 'vh_demo_1', label: 'Bus 04 (KDC 992P)', plate: 'KDC 992P', model: 'Bus 04', driver: 'Douglas Omwamba', capacity: '51' },
                { id: 'vh_demo_2', label: 'Bus 02 (KBB 120Z)', plate: 'KBB 120Z', model: 'Bus 02', driver: 'James Kamau', capacity: '33' },
                { id: 'vh_demo_3', label: 'Bus 07 (KDM 441X)', plate: 'KDM 441X', model: 'Bus 07', driver: 'Douglas Omwamba', capacity: '25' },
            ];
        }
        return [];
    }, [dbVehicles, currentInstitution?.id]);

    const displayStudents = useMemo(() => {
        const rawStudents = students.length > 0 ? students : [
            { id: 'st_1', name: 'Kelvin Kiprop', role: 'student', studentClass: 'Grade 4', stream: 'North', metadata: { admissionNumber: 'ADM/8821/24', studentClass: 'Grade 4', stream: 'North' } },
            { id: 'st_2', name: 'Alisha Wanjiku', role: 'student', studentClass: 'Grade 3', stream: 'East', metadata: { admissionNumber: 'ADM/9012/24', studentClass: 'Grade 3', stream: 'East' } },
            { id: 'st_3', name: 'Liam Otieno', role: 'student', studentClass: 'Grade 5', stream: 'West', metadata: { admissionNumber: 'ADM/8774/24', studentClass: 'Grade 5', stream: 'West' } },
            { id: 'st_4', name: 'Chloe Kamau', role: 'student', studentClass: 'Grade 2', stream: 'Blue', metadata: { admissionNumber: 'ADM/9331/25', studentClass: 'Grade 2', stream: 'Blue' } },
            { id: 'st_5', name: 'Ethan Ndwiga', role: 'student', studentClass: 'Grade 6', stream: 'Gold', metadata: { admissionNumber: 'ADM/8109/23', studentClass: 'Grade 6', stream: 'Gold' } },
        ];

        return rawStudents.map(s => {
            const resolvedAdm = getStudentResolvedAdm(s, true);
            const resolvedClass = getStudentResolvedClass(s) || 'Unassigned Class';
            const baseClass = getStudentBaseClass(s);
            const stream = getStudentResolvedStream(s) || (s.metadata?.stream || (s as any).stream || '');

            return {
                ...s,
                id: s.id,
                name: s.name,
                admissionNumber: resolvedAdm,
                studentClass: resolvedClass,
                baseClass: baseClass || 'Unassigned',
                stream: stream || ''
            };
        });
    }, [students]);

    // Dynamic list of unique classes for filtering
    const availableClasses = useMemo(() => {
        const set = new Set<string>();
        displayStudents.forEach(s => {
            if (s.baseClass && s.baseClass !== 'Unassigned') {
                set.add(s.baseClass);
            }
        });
        return Array.from(set).sort();
    }, [displayStudents]);

    // Dynamic list of unique streams for filtering
    const availableStreams = useMemo(() => {
        const set = new Set<string>();
        displayStudents.forEach(s => {
            if (s.stream) {
                set.add(s.stream);
            }
        });
        return Array.from(set).sort();
    }, [displayStudents]);

    const filteredStudents = useMemo(() => {
        return displayStudents.filter(s => {
            const searchLower = searchTerm.toLowerCase().trim();
            const matchesSearch = !searchLower || 
                s.name.toLowerCase().includes(searchLower) || 
                s.admissionNumber.toLowerCase().includes(searchLower) ||
                s.studentClass.toLowerCase().includes(searchLower) ||
                s.stream.toLowerCase().includes(searchLower);

            const matchesClass = 
                selectedClassFilter === 'ALL' || 
                s.baseClass.toLowerCase() === selectedClassFilter.toLowerCase() ||
                s.studentClass.toLowerCase().includes(selectedClassFilter.toLowerCase());

            const matchesStream = 
                selectedStreamFilter === 'ALL' || 
                s.stream.toLowerCase() === selectedStreamFilter.toLowerCase();

            return matchesSearch && matchesClass && matchesStream;
        });
    }, [displayStudents, searchTerm, selectedClassFilter, selectedStreamFilter]);

    const shipments: Shipment[] = [
        { 
            id: '1', 
            trackingId: 'LOG-7729-KE', 
            origin: 'Mombasa Port', 
            destination: 'Nairobi ICD', 
            status: 'in_transit', 
            clientName: 'Global Retail Ltd', 
            weight: '12.5 Tons', 
            driverId: drivers[0]?.id || 'dr_1', 
            eta: '2024-10-22 14:00' 
        },
        { 
            id: '2', 
            trackingId: 'LOG-8114-UG', 
            origin: 'Nairobi', 
            destination: 'Kampala', 
            status: 'pending', 
            clientName: 'Eco-Builders NGO', 
            weight: '4.2 Tons', 
            driverId: drivers[1]?.id || 'dr_2', 
            eta: '2024-10-24 10:00' 
        },
        { 
            id: '3', 
            trackingId: 'LOG-9912-KE', 
            origin: 'Kisumu', 
            destination: 'Eldoret', 
            status: 'delivered', 
            clientName: 'Prime Distributors', 
            weight: '2.8 Tons', 
            driverId: drivers[0]?.id || 'dr_1', 
            eta: '2024-10-21 09:30',
            proofOfDelivery: {
                receiverName: 'Samuel Kamau',
                timestamp: '2024-10-21 09:45'
            }
        }
    ];

    const filteredShipments = shipments.filter(s => 
        s.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = isSACCO ? [
        { label: 'SACCO Members', value: '42', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Fleet Strength', value: '124', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Trip Commission', value: 'KES 84k', icon: Receipt, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Pending Licenses', value: '8', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    ] : isShuttle ? [
        { label: 'Total Passengers', value: users.length.toString(), icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Shuttles', value: '8', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Seat Occupancy', value: '74%', icon: Armchair, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Departures (Today)', value: '14', icon: DoorOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
    ] : isEduTransport ? [
        { label: 'School Buses on Route', value: '5', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Commuting Students', value: '184', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'GPS Signal Feed', value: 'Active', icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'School Trips Today', value: '2', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    ] : [
        { label: 'Active Shipments', value: '24', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Idle Fleet', value: '3', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Fuel Efficiency', value: '88%', icon: Fuel, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Delayed', value: '2', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    const renderStudentCommute = () => {
        const schoolRuns = busRoutes.map((r, idx) => ({
            id: `run_${r.id}`,
            routeName: r.name,
            runType: idx % 2 === 0 ? 'Morning Pick-up' : 'Afternoon Drop-off',
            driver: r.driver || 'Douglas Omwamba',
            vehicle: r.bus || (availableVehicleOptions[0]?.label || 'Unassigned Vehicle'),
            attendant: r.attendant || 'Sarah Wanjiku',
            status: idx === 0 ? 'boarding' : idx === 1 ? 'in_transit' : 'completed',
            students: '24/30',
            startTime: idx % 2 === 0 ? '06:15 AM' : '03:30 PM'
        }));

        const filteredRuns = schoolRuns.filter(r => 
            r.routeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            r.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const handleCopyLink = () => {
            setParentLinkCopied(true);
            navigator.clipboard.writeText("https://edualloc.ai/track/bus-04?auth=live-parent-token");
            setTimeout(() => setParentLinkCopied(false), 2000);
        };

        const handleSaveRoute = (e: React.FormEvent) => {
            e.preventDefault();
            if (!newRouteName.trim() || !newRouteStart.trim() || !newRouteEnd.trim()) {
                alert('Please fill in Route Name, Starting Landmark, and Terminal Landmark.');
                return;
            }

            let nextRoutes: typeof busRoutes;
            let nextFees: typeof routeFeeSetting;

            if (editingRoute) {
                // Updating existing route
                nextRoutes = busRoutes.map(r => r.id === editingRoute.id ? {
                    ...r,
                    name: newRouteName.trim(),
                    startPoint: newRouteStart.trim(),
                    endPoint: newRouteEnd.trim(),
                    bus: newRouteBus,
                    driver: newRouteDriver.trim() || 'TBD',
                    attendant: newRouteAttendant.trim() || 'TBD'
                } : r);
                nextFees = routeFeeSetting.map(rf => rf.routeId === editingRoute.id ? {
                    ...rf,
                    routeName: newRouteName.trim()
                } : rf);
            } else {
                // Adding new route
                const routeId = `route_${Date.now()}`;
                const newRoute = {
                    id: routeId,
                    name: newRouteName.trim(),
                    startPoint: newRouteStart.trim(),
                    endPoint: newRouteEnd.trim(),
                    bus: newRouteBus,
                    driver: newRouteDriver.trim() || 'TBD',
                    attendant: newRouteAttendant.trim() || 'TBD'
                };
                nextRoutes = [...busRoutes, newRoute];
                nextFees = [
                    ...routeFeeSetting,
                    {
                        routeId,
                        routeName: newRouteName.trim(),
                        termFee: 8000,
                        monthlyFee: 3000,
                        currency: 'KES'
                    }
                ];
            }

            setBusRoutes(nextRoutes);
            setRouteFeeSetting(nextFees);

            const routeKey = currentInstitution?.id ? `eduai_transport_bus_routes_${currentInstitution.id}` : 'eduai_transport_bus_routes';
            const feeKey = currentInstitution?.id ? `eduai_transport_route_fee_settings_${currentInstitution.id}` : 'eduai_transport_route_fee_settings';
            localStorage.setItem(routeKey, JSON.stringify(nextRoutes));
            localStorage.setItem('eduai_transport_bus_routes', JSON.stringify(nextRoutes));
            localStorage.setItem(feeKey, JSON.stringify(nextFees));
            localStorage.setItem('eduai_transport_route_fee_settings', JSON.stringify(nextFees));

            setIsAddRouteModalOpen(false);
            setEditingRoute(null);
            setNewRouteName('');
            setNewRouteStart('');
            setNewRouteEnd('');
            setNewRouteDriver('');
            setNewRouteAttendant('');
        };

        return (
            <div className="animate-fade-in-up space-y-8">
                {/* Commute Sub-navigation */}
                <div className="flex overflow-x-auto whitespace-nowrap bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl w-full border border-slate-200 dark:border-slate-800 scrollbar-none">
                    <button onClick={() => setCommuteSubTab('monitor')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${commuteSubTab === 'monitor' ? 'bg-white dark:bg-slate-650 text-indigo-650 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Live Monitor</button>
                    <button onClick={() => setCommuteSubTab('routes')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${commuteSubTab === 'routes' ? 'bg-white dark:bg-slate-650 text-indigo-650 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Register Routes</button>
                    <button onClick={() => setCommuteSubTab('students')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${commuteSubTab === 'students' ? 'bg-white dark:bg-slate-650 text-indigo-650 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Student Assignment</button>
                </div>

                {commuteSubTab === 'monitor' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Simulated Geolocation Map & Tablet Telemetry */}
                        <div className="bg-slate-900 rounded-[3rem] p-8 min-h-[420px] relative overflow-hidden group shadow-2xl border border-white/5">
                            <div className="absolute inset-0 bg-radial-gradient from-indigo-900/40 via-transparent to-transparent pointer-events-none animate-pulse"></div>
                            
                            <div className="relative z-10 flex flex-col lg:flex-row gap-8 h-full">
                                {/* Map Simulator Panel */}
                                <div className="flex-1 bg-slate-950/80 rounded-[2.5rem] p-6 border border-white/10 relative overflow-hidden h-[300px] lg:h-[350px]">
                                    {/* Grid background representing roads */}
                                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px] opacity-20"></div>
                                    
                                    {/* Simulated Route Path */}
                                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                        <path 
                                            d="M 50 150 Q 150 100 250 150 T 450 100" 
                                            fill="none" 
                                            stroke="rgba(99, 102, 241, 0.4)" 
                                            strokeWidth="6" 
                                            strokeLinecap="round"
                                            strokeDasharray="8 6"
                                        />
                                        <circle cx="450" cy="100" r="16" fill="rgba(79, 70, 229, 0.2)" />
                                        <circle cx="450" cy="100" r="8" fill="#4f46e5" />
                                        <circle cx="80" cy="140" r="6" fill="#f59e0b" className="animate-ping" style={{ transformOrigin: '80px 140px' }} />
                                        <circle cx="80" cy="140" r="4" fill="#f59e0b" />
                                        <circle cx="180" cy="120" r="4" fill="#e2e8f0" />
                                        <circle cx="260" cy="180" r="4" fill="#e2e8f0" />
                                    </svg>

                                    {/* Simulated Active School Bus Position */}
                                    <div 
                                        className="absolute transition-all duration-1000 ease-in-out bg-amber-400 text-slate-950 p-2.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center cursor-pointer"
                                        style={{ 
                                            left: `${simulatedBusPos.x}px`, 
                                            top: `${simulatedBusPos.y}px`,
                                            transform: 'translate(-50%, -50%)' 
                                        }}
                                    >
                                        <Truck className="w-5 h-5" />
                                        <span className="absolute -top-8 bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full border border-white whitespace-nowrap shadow uppercase tracking-wide">
                                            Bus 04 (Active)
                                        </span>
                                    </div>

                                    {/* Geofence Alert Overlay */}
                                    <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                            Parent GPS Tracking Active
                                        </span>
                                    </div>
                                </div>

                                {/* Tablet Geolocation / Telemetry Panel */}
                                <div className="w-full lg:w-[360px] flex flex-col justify-between space-y-6">
                                    <div className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 rounded-3xl">
                                        <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1.5">Realtime Geolocation Feed</p>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                                            <Smartphone className="w-5 h-5 text-indigo-400" />
                                            Tablet Telemetry
                                        </h3>

                                        <div className="space-y-4 text-xs">
                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Active Device</span>
                                                <span className="text-white font-black">Driver's Tablet (Lenovo Tab M10)</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">GPS Coordinates</span>
                                                <span className="text-white font-mono font-bold">1.2921° S, 36.8219° E</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Current Checkpoint</span>
                                                <span className="text-amber-400 font-black">{currentCheckPoint}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Estimated Speed</span>
                                                <span className="text-white font-black">{simulatedSpeed} km/h</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Battery / Signal</span>
                                                <span className="text-green-400 font-black">88% • Excellent 4G</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Share Live Tracking Link with Parents */}
                                    <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 p-6 rounded-3xl border border-indigo-500/20">
                                        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">Live Parent Tracker</h4>
                                        <p className="text-slate-300 text-[11px] leading-relaxed mb-4">
                                            Parents can follow this vehicle in real-time. Share the dynamic boarding link via SMS.
                                        </p>
                                        <button 
                                            onClick={handleCopyLink}
                                            className="w-full bg-white hover:bg-slate-100 text-indigo-950 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
                                        >
                                            {parentLinkCopied ? (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    Tracking Link Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Smartphone className="w-4 h-4 text-indigo-650" />
                                                    Copy Tracker Link
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* School Runs Tables */}
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Daily Commutes</h3>
                                    <p className="text-slate-500 font-medium text-xs mt-1">Real-time tracking of morning drop-offs and evening student returns.</p>
                                </div>
                                <div className="relative w-full md:w-96">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        placeholder="Search by Route or Driver..." 
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none outline-none font-bold text-sm"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Route / Run ID</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Driver & Attendant</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Vehicle & Capacity</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Commuters</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {filteredRuns.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    No active school commute runs. Register routes in the &quot;Register Routes&quot; tab.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRuns.map(run => (
                                                <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer group">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-3 rounded-2xl ${run.status === 'in_transit' ? 'bg-indigo-100 text-indigo-600' : run.status === 'boarding' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                                                                <Navigation className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{run.routeName}</p>
                                                                <p className="text-[10px] font-black text-slate-400 tracking-widest">{run.runType} • Starts: {run.startTime}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="font-bold text-slate-700 dark:text-slate-200">{run.driver}</p>
                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Attendant: {run.attendant}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="font-bold text-slate-650 dark:text-slate-350">{run.vehicle}</p>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GPS Enabled Tablet</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="font-black text-slate-800 dark:text-white">{run.students}</span>
                                                        <span className="text-[10px] text-slate-400 block tracking-wider font-bold">Students Checked-in</span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                            run.status === 'in_transit' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                                            run.status === 'boarding' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-650 border-green-100'
                                                        }`}>
                                                            {run.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {commuteSubTab === 'routes' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Bus Routes Registry */}
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Registered Bus Routes</h3>
                                    <p className="text-slate-500 font-medium text-xs mt-1">Onboard and configure bus routes, start and terminal landmarks, and assign personnel.</p>
                                </div>
                                <button 
                                    onClick={handleOpenAddRoute}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    Register Route
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Route Name</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Starting Point</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">School Terminal</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Assigned Bus</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Driver</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Attendant</th>
                                            <th className="px-8 py-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {busRoutes.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-8 py-16 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Navigation className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                                        <p className="font-black text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500">No Registered Bus Routes</p>
                                                        <p className="text-[11px] text-slate-400 font-medium">Click &quot;+ Register Route&quot; above to add a new route.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            busRoutes.map(route => (
                                                <tr key={route.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                                                    <td className="px-8 py-6">
                                                        <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{route.name}</p>
                                                    </td>
                                                    <td className="px-8 py-6 font-bold text-slate-700 dark:text-slate-200">
                                                        {route.startPoint}
                                                    </td>
                                                    <td className="px-8 py-6 font-bold text-slate-700 dark:text-slate-200">
                                                        {route.endPoint}
                                                    </td>
                                                    <td className="px-8 py-6 font-black text-indigo-650 dark:text-indigo-400">
                                                        {route.bus}
                                                    </td>
                                                    <td className="px-8 py-6 font-bold text-slate-700 dark:text-slate-200">
                                                        {route.driver}
                                                    </td>
                                                    <td className="px-8 py-6 font-bold text-slate-500">
                                                        {route.attendant}
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditRoute(route)}
                                                                className="p-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                                                title="Edit Route"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                <span className="text-[9px] font-black uppercase tracking-wider">Edit</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteRoute(route.id)}
                                                                className="p-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                                                                title="Delete Route"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                <span className="text-[9px] font-black uppercase tracking-wider">Delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Add / Edit Route Modal */}
                        {isAddRouteModalOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative animate-fade-in-up">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                                        {editingRoute ? 'Edit Bus Route' : 'Register Bus Route'}
                                    </h3>
                                    <p className="text-slate-500 text-xs font-medium mb-6">
                                        {editingRoute ? 'Modify route landmarks, assigned bus vehicle, and designated personnel.' : 'Create school run routes, specify geographic bounds, and assign fleet vehicles.'}
                                    </p>
                                    
                                    <form onSubmit={handleSaveRoute} className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Route Name *</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={newRouteName}
                                                onChange={e => setNewRouteName(e.target.value)}
                                                placeholder="e.g. Route D - Eastlands / Buruburu"
                                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Starting Landmark *</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={newRouteStart}
                                                    onChange={e => setNewRouteStart(e.target.value)}
                                                    placeholder="e.g. Buruburu Shopping Center"
                                                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Terminal Landmark *</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={newRouteEnd}
                                                    onChange={e => setNewRouteEnd(e.target.value)}
                                                    placeholder="Westlands School Gate"
                                                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Bus / Vehicle *</label>
                                                {availableVehicleOptions.length > 0 ? (
                                                    <select 
                                                        value={newRouteBus}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            setNewRouteBus(val);
                                                            const matched = availableVehicleOptions.find(o => o.label === val || o.plate === val);
                                                            if (matched?.driver && !newRouteDriver) {
                                                                setNewRouteDriver(matched.driver);
                                                            }
                                                        }}
                                                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                                    >
                                                        <option value="">Select registered vehicle...</option>
                                                        {availableVehicleOptions.map(opt => (
                                                            <option key={opt.id} value={opt.label}>{opt.label}</option>
                                                        ))}
                                                        {newRouteBus && !availableVehicleOptions.some(o => o.label === newRouteBus) && (
                                                            <option value={newRouteBus}>{newRouteBus}</option>
                                                        )}
                                                    </select>
                                                ) : (
                                                    <input 
                                                        type="text"
                                                        value={newRouteBus}
                                                        onChange={e => setNewRouteBus(e.target.value)}
                                                        placeholder="e.g. Bus 01 (KDA 123X)"
                                                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver</label>
                                                <input 
                                                    type="text" 
                                                    value={newRouteDriver}
                                                    onChange={e => setNewRouteDriver(e.target.value)}
                                                    placeholder="Douglas Omwamba"
                                                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendant</label>
                                                <input 
                                                    type="text" 
                                                    value={newRouteAttendant}
                                                    onChange={e => setNewRouteAttendant(e.target.value)}
                                                    placeholder="Sarah Wanjiku"
                                                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-4 pt-4">
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setIsAddRouteModalOpen(false);
                                                    setEditingRoute(null);
                                                }}
                                                className="flex-1 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit"
                                                className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-colors cursor-pointer"
                                            >
                                                {editingRoute ? 'Update Route' : 'Register Route'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {commuteSubTab === 'students' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Student Commute Registry */}
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-700 space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Student Commute Registry</h3>
                                        <p className="text-slate-500 font-medium text-xs mt-1">Specify student commute preferences (round trip, one-way pick-up, one-way drop-off) and assign routes.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/40">
                                            {filteredStudents.length} / {displayStudents.length} Students
                                        </span>
                                    </div>
                                </div>

                                {/* Filter Controls Bar */}
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-center">
                                    {/* Search Bar */}
                                    <div className="relative col-span-1 md:col-span-1 lg:col-span-2">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input 
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Search by student name or ADM..." 
                                            className="w-full pl-11 pr-9 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700 outline-none font-bold text-xs focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                                title="Clear search"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Class Filter */}
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <GraduationCap className="w-4 h-4" />
                                        </div>
                                        <select
                                            value={selectedClassFilter}
                                            onChange={e => setSelectedClassFilter(e.target.value)}
                                            className="w-full pl-10 pr-8 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700 outline-none font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                                        >
                                            <option value="ALL">All Classes {availableClasses.length > 0 ? `(${availableClasses.length})` : ''}</option>
                                            {availableClasses.map(cls => (
                                                <option key={cls} value={cls}>{cls}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <Filter className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    {/* Stream Filter */}
                                    <div className="relative">
                                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        <select
                                            value={selectedStreamFilter}
                                            onChange={e => setSelectedStreamFilter(e.target.value)}
                                            className="w-full pl-10 pr-8 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-700 outline-none font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                                        >
                                            <option value="ALL">All Streams {availableStreams.length > 0 ? `(${availableStreams.length})` : ''}</option>
                                            {availableStreams.map(str => (
                                                <option key={str} value={str}>{str}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <Filter className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                </div>

                                {/* Active Filter Chips */}
                                {(selectedClassFilter !== 'ALL' || selectedStreamFilter !== 'ALL' || searchTerm) && (
                                    <div className="flex items-center gap-2 flex-wrap pt-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Active Filters:</span>
                                        {selectedClassFilter !== 'ALL' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                                                Class: {selectedClassFilter}
                                                <button onClick={() => setSelectedClassFilter('ALL')} className="hover:text-rose-500 cursor-pointer"><X className="w-3 h-3" /></button>
                                            </span>
                                        )}
                                        {selectedStreamFilter !== 'ALL' && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-purple-200 dark:border-purple-800">
                                                Stream: {selectedStreamFilter}
                                                <button onClick={() => setSelectedStreamFilter('ALL')} className="hover:text-rose-500 cursor-pointer"><X className="w-3 h-3" /></button>
                                            </span>
                                        )}
                                        {searchTerm && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-600">
                                                Search: "{searchTerm}"
                                                <button onClick={() => setSearchTerm('')} className="hover:text-rose-500 cursor-pointer"><X className="w-3 h-3" /></button>
                                            </span>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedClassFilter('ALL');
                                                setSelectedStreamFilter('ALL');
                                                setSearchTerm('');
                                            }}
                                            className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:underline ml-2 cursor-pointer"
                                        >
                                            Reset All Filters
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Student</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Admission No.</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Class & Stream</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Assigned Commute Route</th>
                                            <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Daily Schedule / Direction</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {filteredStudents.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-16 text-center text-slate-400 text-sm font-bold">
                                                    No students found matching the selected class, stream, or search criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStudents.map(student => {
                                                const currentPref = studentCommutePrefs[student.id] || { routeId: 'none', preference: 'none' };
                                                return (
                                                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 rounded-xl flex items-center justify-center font-black">
                                                                    {student.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-800 dark:text-white uppercase tracking-tight">{student.name}</p>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                                                        {student.studentClass}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className="px-3.5 py-1.5 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl font-mono font-black text-xs tracking-wider border border-indigo-100 dark:border-indigo-900/50 inline-flex items-center gap-1.5 shadow-sm">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                                {student.admissionNumber}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-750 dark:text-slate-200 rounded-lg text-xs font-black uppercase tracking-tight w-fit">
                                                                    {student.baseClass}
                                                                </span>
                                                                {student.stream && (
                                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-0.5">
                                                                        Stream: {student.stream}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <select
                                                                value={currentPref.routeId}
                                                                onChange={e => {
                                                                    setStudentCommutePrefs({
                                                                        ...studentCommutePrefs,
                                                                        [student.id]: { ...currentPref, routeId: e.target.value }
                                                                    });
                                                                }}
                                                                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
                                                            >
                                                                <option value="none">-- Unassigned --</option>
                                                                {busRoutes.map(route => (
                                                                    <option key={route.id} value={route.id}>{route.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <select
                                                                value={currentPref.preference}
                                                                onChange={e => {
                                                                    setStudentCommutePrefs({
                                                                        ...studentCommutePrefs,
                                                                        [student.id]: { ...currentPref, preference: e.target.value as any }
                                                                    });
                                                                }}
                                                                className={`px-4 py-2.5 border rounded-xl font-black uppercase text-[10px] tracking-wider outline-none cursor-pointer ${
                                                                    currentPref.preference === 'round_trip' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800' :
                                                                    currentPref.preference === 'one_way_pickup' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' :
                                                                    currentPref.preference === 'one_way_drop' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' :
                                                                    'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-700'
                                                                }`}
                                                            >
                                                                <option value="none">✕ Not Commuting</option>
                                                                <option value="round_trip">🔄 Round Trip</option>
                                                                <option value="one_way_pickup">🌅 Morning Pick-up</option>
                                                                <option value="one_way_drop">🌇 Afternoon Drop-off</option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderSchoolTrips = () => {
        const filteredTrips = schoolTrips.filter(t => 
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            t.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.leadTeacher.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const handleAddTrip = (e: React.FormEvent) => {
            e.preventDefault();
            if (!newTripName.trim() || !newTripDestination.trim() || !newTripDate || !newTripTime.trim() || !newTripTeacher.trim()) {
                alert('Please fill in all required fields');
                return;
            }
            const newTrip = {
                id: `trip_${Date.now()}`,
                name: newTripName.trim(),
                destination: newTripDestination.trim(),
                date: newTripDate,
                time: newTripTime.trim(),
                leadTeacher: newTripTeacher.trim(),
                vehicle: newTripVehicle.trim() || 'TBD',
                passengers: newTripPassengers.trim() || 'TBD',
                status: 'pending' as const
            };
            const nextTrips = [...schoolTrips, newTrip];
            setSchoolTrips(nextTrips);
            const tripKey = currentInstitution?.id ? `eduai_school_trips_${currentInstitution.id}` : 'eduai_school_trips';
            localStorage.setItem(tripKey, JSON.stringify(nextTrips));
            localStorage.setItem('eduai_school_trips', JSON.stringify(nextTrips));

            setIsAddTripModalOpen(false);
            // Reset fields
            setNewTripName('');
            setNewTripDestination('');
            setNewTripDate('');
            setNewTripTime('');
            setNewTripTeacher('');
            setNewTripVehicle('');
            setNewTripPassengers('');
        };

        const handleDeleteTrip = (tripId: string) => {
            if (!window.confirm('Are you sure you want to delete this trip schedule?')) return;
            const nextTrips = schoolTrips.filter(t => t.id !== tripId);
            setSchoolTrips(nextTrips);
            const tripKey = currentInstitution?.id ? `eduai_school_trips_${currentInstitution.id}` : 'eduai_school_trips';
            localStorage.setItem(tripKey, JSON.stringify(nextTrips));
            localStorage.setItem('eduai_school_trips', JSON.stringify(nextTrips));
        };

        const handleToggleTripStatus = (tripId: string) => {
            const nextTrips = schoolTrips.map(t => {
                if (t.id !== tripId) return t;
                const nextStatus: typeof t.status = t.status === 'approved' ? 'pending' : 'approved';
                return { ...t, status: nextStatus };
            });
            setSchoolTrips(nextTrips);
            const tripKey = currentInstitution?.id ? `eduai_school_trips_${currentInstitution.id}` : 'eduai_school_trips';
            localStorage.setItem(tripKey, JSON.stringify(nextTrips));
            localStorage.setItem('eduai_school_trips', JSON.stringify(nextTrips));
        };

        return (
            <div className="animate-fade-in-up space-y-8">
                {/* Trip Registry Header & Actions */}
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Academic & School Trips</h3>
                            <p className="text-slate-500 font-medium text-xs mt-1">Manage educational excursions, field trips, transport logistics and route clearance.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search school trips..." 
                                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none outline-none font-bold text-xs"
                                />
                            </div>
                            <button 
                                onClick={() => setIsAddTripModalOpen(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Schedule Trip
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Trip / Event Name</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Destination</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Departure Date & Time</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Lead Teacher</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Assigned Bus</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Capacity</th>
                                    <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Approval</th>
                                    <th className="px-8 py-6 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {filteredTrips.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-16 text-center">
                                            <div className="max-w-sm mx-auto space-y-4">
                                                <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                                                    <Calendar className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-tight">No Scheduled Trips Found</p>
                                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                                        {searchTerm ? "No trips matched your search filter." : "No school trips scheduled yet. Click below to schedule a new educational trip."}
                                                    </p>
                                                </div>
                                                {!searchTerm && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsAddTripModalOpen(true)}
                                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md cursor-pointer"
                                                    >
                                                        Schedule First Trip
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTrips.map(trip => (
                                        <tr key={trip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-xl">
                                                        <Calendar className="w-5 h-5" />
                                                    </div>
                                                    <p className="font-bold text-slate-800 dark:text-white tracking-tight">{trip.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-bold text-slate-700 dark:text-slate-200">{trip.destination}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-bold text-slate-650 dark:text-slate-350">{trip.date}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{trip.time}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-bold text-slate-700 dark:text-slate-200">{trip.leadTeacher}</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-bold text-indigo-600 dark:text-indigo-400">{trip.vehicle}</p>
                                            </td>
                                            <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-300">
                                                {trip.passengers}
                                            </td>
                                            <td className="px-8 py-6">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleTripStatus(trip.id)}
                                                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                                        trip.status === 'approved' 
                                                            ? 'bg-green-50 text-green-750 border-green-150 dark:bg-green-950/20 dark:text-green-400 hover:opacity-80' 
                                                            : 'bg-amber-50 text-amber-750 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 hover:opacity-80'
                                                    }`}
                                                >
                                                    {trip.status}
                                                </button>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteTrip(trip.id)}
                                                        title="Delete Trip"
                                                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Add Trip Modal Form */}
                {isAddTripModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative animate-fade-in-up">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Schedule School Trip</h3>
                            <p className="text-slate-500 text-xs font-medium mb-6">Complete trip specifics to assign school buses and notify lead instructors.</p>
                            
                            <form onSubmit={handleAddTrip} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trip / Event Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={newTripName}
                                        onChange={e => setNewTripName(e.target.value)}
                                        placeholder="e.g. Geography Museum Outing"
                                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={newTripDestination}
                                            onChange={e => setNewTripDestination(e.target.value)}
                                            placeholder="e.g. Karura Forest"
                                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead Teacher *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={newTripTeacher}
                                            onChange={e => setNewTripTeacher(e.target.value)}
                                            placeholder="e.g. Mrs. Smith"
                                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure Date *</label>
                                        <input 
                                            type="date" 
                                            required
                                            value={newTripDate}
                                            onChange={e => setNewTripDate(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure Time *</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={newTripTime}
                                            onChange={e => setNewTripTime(e.target.value)}
                                            placeholder="e.g. 08:30 AM"
                                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Vehicle</label>
                                        {availableVehicleOptions.length > 0 ? (
                                            <select
                                                value={newTripVehicle}
                                                onChange={e => setNewTripVehicle(e.target.value)}
                                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                            >
                                                <option value="">Select registered vehicle...</option>
                                                {availableVehicleOptions.map(opt => (
                                                    <option key={opt.id} value={opt.label}>{opt.label}</option>
                                                ))}
                                                {newTripVehicle && !availableVehicleOptions.some(o => o.label === newTripVehicle) && (
                                                    <option value={newTripVehicle}>{newTripVehicle}</option>
                                                )}
                                            </select>
                                        ) : (
                                            <input 
                                                type="text" 
                                                value={newTripVehicle}
                                                onChange={e => setNewTripVehicle(e.target.value)}
                                                placeholder="e.g. KDC 992P (Bus 04)"
                                                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Capacity / Passengers</label>
                                        <input 
                                            type="text" 
                                            value={newTripPassengers}
                                            onChange={e => setNewTripPassengers(e.target.value)}
                                            placeholder="e.g. 45 Students"
                                            className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border-none outline-none font-bold text-xs"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setIsAddTripModalOpen(false)}
                                        className="flex-1 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-colors"
                                    >
                                        Save Trip
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderManifest = () => (
        <div className="animate-fade-in-up space-y-8">
            {/* Real-time Tracking Map Placeholder */}
            <div className="bg-slate-900 rounded-[3rem] p-8 h-[300px] relative overflow-hidden group shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] opacity-30 mix-blend-overlay bg-center bg-cover"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10">
                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-1">Fleet Pulse</p>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Active Route Monitor</h3>
                        </div>
                        <div className="flex gap-2">
                            <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/30 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                Live GPS Feed
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                        {shipments.filter(s => s.status === 'in_transit').map(s => (
                            <div key={s.id} className="min-w-[250px] bg-white/90 backdrop-blur rounded-2xl p-4 shadow-xl border border-white/20">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Navigation className="w-4 h-4" />
                                    </div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{s.trackingId}</p>
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-500 gap-4">
                                    <div className="flex-1">
                                        <p className="uppercase tracking-widest opacity-60">Near</p>
                                        <p className="text-slate-800 line-clamp-1">Athi River Bypass</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="uppercase tracking-widest opacity-60">ETA</p>
                                        <p className="text-indigo-600">45 Mins</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Shipment Manifest Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Cargo manifest</h3>
                        <p className="text-slate-500 font-medium text-xs mt-1">Full registry of active and historical delivery manifests.</p>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Track Shipment ID or Client..." 
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-none outline-none font-bold text-sm"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Shipment / ID</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Client & Payload</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Route</th>
                                <th className="px-8 py-6 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                <th className="px-8 py-6 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {filteredShipments.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-2xl ${s.status === 'in_transit' ? 'bg-blue-100 text-blue-600' : s.status === 'delivered' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Package className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{s.trackingId}</p>
                                                <p className="text-[10px] font-black text-slate-400 tracking-widest">ETA: {s.eta.split(' ')[0]}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-bold text-slate-700 dark:text-slate-200">{s.clientName}</p>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{s.weight}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                                            <span>{s.origin}</span>
                                            <ArrowRight className="w-3 h-3 text-slate-300" />
                                            <span>{s.destination}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            s.status === 'in_transit' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                            s.status === 'delivered' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }`}>
                                            {s.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <button className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all">
                                            <MoreHorizontal className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderFleet = () => (
        <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Vehicle Health & Maintenance */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <Truck className="w-6 h-6 text-indigo-600" />
                            {isEduTransport ? 'School Bus Fleet Health' : 'Fleet Health'}
                        </h3>
                        <button className="bg-slate-50 dark:bg-slate-900 px-4 py-1.5 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 dark:border-slate-700">
                            Manage All
                        </button>
                    </div>
                    <div className="space-y-4">
                        {(dbVehicles.length > 0 ? dbVehicles.map((v, i) => ({
                            plate: v.plateNumber || v.registrationNumber || v.plate || `Vehicle #${i + 1}`,
                            fuel: v.fuelLevel || (v.capacity ? Math.min(95, Math.max(25, Number(v.capacity) * 2)) : 60),
                            status: v.status === 'active' || v.status === 'Healthy' ? 'Healthy' : (v.status || 'Active'),
                            health: v.healthScore || 92,
                            label: v.model ? `${v.model} (${v.capacity || 30} Seater)` : (v.name || 'School Fleet'),
                            alert: v.status === 'maintenance' || v.status === 'Maintenance Due',
                            lowFuel: false
                        })) : (currentInstitution?.id?.startsWith('demo_') ? [
                            { plate: 'KDC 992P', fuel: 45, status: 'Healthy', health: 92, label: 'Bus 04 (51 Seater)', alert: false, lowFuel: false },
                            { plate: 'KBB 120Z', fuel: 90, status: 'Maintenance Due', health: 65, alert: true, lowFuel: false },
                            { plate: 'KDM 441X', fuel: 12, status: 'Healthy', health: 88, lowFuel: true, alert: false },
                        ] : [])).length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[2rem]">
                                <Truck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Vehicles Registered</p>
                                <p className="text-[11px] text-slate-400 font-medium mt-1">Register school fleet vehicles in the Vehicle Registration tab.</p>
                            </div>
                        ) : (
                            (dbVehicles.length > 0 ? dbVehicles.map((v, i) => ({
                                plate: v.plateNumber || v.registrationNumber || v.plate || `Vehicle #${i + 1}`,
                                fuel: v.fuelLevel || (v.capacity ? Math.min(95, Math.max(25, Number(v.capacity) * 2)) : 60),
                                status: v.status === 'active' || v.status === 'Healthy' ? 'Healthy' : (v.status || 'Active'),
                                health: v.healthScore || 92,
                                label: v.model ? `${v.model} (${v.capacity || 30} Seater)` : (v.name || 'School Fleet'),
                                alert: v.status === 'maintenance' || v.status === 'Maintenance Due',
                                lowFuel: false
                            })) : [
                                { plate: 'KDC 992P', fuel: 45, status: 'Healthy', health: 92, label: 'Bus 04 (51 Seater)', alert: false, lowFuel: false },
                                { plate: 'KBB 120Z', fuel: 90, status: 'Maintenance Due', health: 65, alert: true, lowFuel: false },
                                { plate: 'KDM 441X', fuel: 12, status: 'Healthy', health: 88, lowFuel: true, alert: false },
                            ]).map((v, i) => (
                            <div key={i} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-transparent hover:border-indigo-100 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{v.plate}</p>
                                        {isEduTransport && <p className="text-xs font-black text-indigo-650 dark:text-indigo-400 mb-1">{v.label}</p>}
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${v.alert ? 'text-red-500' : 'text-slate-400'}`}>{v.status}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-800 dark:text-white italic">{isEduTransport ? 'Safety Rating' : 'Engine Life'}</p>
                                        <p className="text-sm font-black text-slate-950 dark:text-white">{isEduTransport ? 'Compliant' : `${v.health}%`}</p>
                                        <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
                                            <div className={`h-full rounded-full ${v.health > 80 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${v.health}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <Fuel className={`w-4 h-4 ${v.lowFuel ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                                        <span className="text-xs font-black text-slate-600 dark:text-slate-300">{v.fuel}L Left</span>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        {isEduTransport ? (
                                            <>
                                                <ShieldCheck className="w-4 h-4 text-green-500" />
                                                <span className="text-[10px] font-black text-slate-650 dark:text-slate-300 uppercase tracking-wider truncate">Governor Compliant</span>
                                            </>
                                        ) : (
                                            <>
                                                <MapPin className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest truncate">Athi River</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )))}
                    </div>
                </div>

                {/* Driver Performance */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3 mb-8">
                        <Users className="w-6 h-6 text-blue-600" />
                        Driver Efficiency
                    </h3>
                    <div className="space-y-6">
                        {drivers.slice(0, 4).map((d, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">
                                    {d.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-bold text-slate-800 dark:text-white uppercase tracking-tight">{d.name}</p>
                                        <p className="text-[10px] font-black text-green-600">Top Performer</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            {isEduTransport ? '99.1% Route Safety' : '98.2% On Time'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <ShieldCheck className="w-3 h-3" />
                                            Safety Score: 4.9/5
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderShuttleHub = () => (
        <div className="animate-fade-in-up space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Real-time Departure Board */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <DoorOpen className="w-6 h-6 text-indigo-600" />
                            Live Departures
                        </h3>
                        <div className="flex gap-2">
                             <span className="px-3 py-1 bg-slate-50 dark:bg-slate-900 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">Main Hub</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {[
                            { route: 'Nairobi CBD - Upperhill', time: '07:30 AM', status: 'boarding', vehicle: 'KDC 992P', occupancy: 85 },
                            { route: 'Westlands - Industrial Area', time: '08:00 AM', status: 'scheduled', vehicle: 'KBB 120Z', occupancy: 42 },
                            { route: 'Airport Link - Cargo Hub', time: '08:15 AM', status: 'delayed', vehicle: 'KDM 441X', occupancy: 0 },
                        ].map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-transparent hover:border-indigo-100 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className={`p-4 rounded-2xl ${d.status === 'boarding' ? 'bg-indigo-100 text-indigo-600 animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-sm'}`}>
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{d.route}</p>
                                        <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{d.time} • {d.vehicle}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                        d.status === 'boarding' ? 'bg-green-100 text-green-700' : 
                                        d.status === 'delayed' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                        {d.status}
                                    </span>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{d.occupancy}% Booked</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* QR Presence Monitor */}
                <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                                <QrCode className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Boarding Access</h3>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active QR Attendance</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            {users.slice(0, 3).map((u, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-500/20 text-indigo-300 rounded-xl flex items-center justify-center font-black">
                                            {u.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm tracking-tight">{u.name}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Boarded: 07:28 AM</p>
                                        </div>
                                    </div>
                                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                                </div>
                            ))}
                        </div>

                        <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-indigo-900/50 transition-all flex items-center justify-center gap-3 active:scale-95">
                            <Smartphone className="w-5 h-5" />
                            Open Mobile Scanner
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Seat Map / Reservation Center */}
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[4rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden text-center flex flex-col items-center">
                <Armchair className="w-16 h-16 text-indigo-100 mb-6 animate-bounce" />
                <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4">Seat Reservation Center</h3>
                <p className="text-slate-500 font-medium max-w-sm mb-10">Employees can book their preferred seats for tomorrow's morning commute once the schedule is released.</p>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3 max-w-2xl">
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`w-8 h-8 rounded-lg cursor-pointer transition-all ${i % 3 === 0 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700 hover:bg-indigo-200'} border border-transparent`}></div>
                    ))}
                </div>
                <div className="mt-8 flex gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-indigo-600"></div>
                        <span>Occupied</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700"></div>
                        <span>Available</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderSACCOHub = () => (
        <div className="animate-fade-in-up space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Member & Vehicle Registry */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <UserPlus className="w-6 h-6 text-indigo-600" />
                            Member Registry
                        </h3>
                        <button className="bg-indigo-600 text-white px-6 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95">
                            Onboard Owner
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50">
                                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Owner</th>
                                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Vehicle (Plate)</th>
                                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Memb. Fee</th>
                                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Trips MTD</th>
                                    <th className="px-6 py-4 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {[
                                    { owner: 'Joseph Mwaniki', plate: 'KDC 992P', fee: 'Paid', trips: 142, revenue: 'KES 42,500' },
                                    { owner: 'Grace Wambui', plate: 'KBB 120Z', fee: 'Paid', trips: 89, revenue: 'KES 28,100' },
                                    { owner: 'Kevin Otieno', plate: 'KDM 441X', fee: 'Pending', trips: 12, revenue: 'KES 4,200' },
                                ].map((m, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{m.owner}</td>
                                        <td className="px-6 py-4 font-black text-indigo-600">{m.plate}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${m.fee === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {m.fee}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-600">{m.trips}</td>
                                        <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-white uppercase tracking-tighter">{m.revenue}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Commision & License Tracking */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <Landmark className="w-6 h-6 text-indigo-400" />
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Financial Engine</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Trip Commission Rate</p>
                                    <div className="flex justify-between items-end">
                                        <p className="text-2xl font-black text-white uppercase tracking-tighter">15.0%</p>
                                        <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">Adjust</button>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-sm">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Municipal Daily Levy</p>
                                    <div className="flex justify-between items-end">
                                        <p className="text-2xl font-black text-white uppercase tracking-tighter">KES 300</p>
                                        <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">Apply</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3 mb-6">
                            <Receipt className="w-5 h-5 text-green-600" />
                            License Wallet
                        </h3>
                        <div className="space-y-4">
                            {[
                                { item: 'Municipality Permit', due: 'Expires in 4 days', color: 'text-red-500' },
                                { item: 'NTSA Inspection', due: 'Due next month', color: 'text-slate-400' },
                                { item: 'Insurance (Fleet)', due: 'Up to date', color: 'text-green-600' }
                            ].map((l, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                    <div>
                                        <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{l.item}</p>
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${l.color}`}>{l.due}</p>
                                    </div>
                                    <button className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl shadow-sm transition-all">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Public Booking Portal Preview */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-12 rounded-[4rem] text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="max-w-2xl relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                        <Ticket className="w-3 h-3" />
                        Online Booking Portal Active
                    </div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">Public Ticket Gateway</h2>
                    <p className="text-blue-50 font-medium mb-8">Passengers can now discover routes and book seats online. All revenue is automatically split between the SACCO and the vehicle owner.</p>
                    <div className="flex gap-4">
                        <button className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:translate-y-[-2px] transition-all active:scale-95">Preview Public Portal</button>
                        <button className="bg-blue-500/30 border border-white/20 px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-500/40 transition-all">Configure Pricing</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderEPOD = () => (
        <div className="animate-fade-in-up space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                            <Signature className="w-8 h-8 text-indigo-600" />
                            Digital Proof of Delivery (e-POD)
                        </h3>
                        <p className="text-slate-500 font-medium text-sm mt-1">Review legal delivery evidence including signatures, geostamps, and photos.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {shipments.filter(s => s.status === 'delivered').map(s => (
                        <div key={s.id} className="bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">{s.trackingId}</p>
                                        <h4 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">{s.clientName}</h4>
                                    </div>
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>

                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                        <User className="w-4 h-4" />
                                        Received By: {s.proofOfDelivery?.receiverName}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                        <Clock className="w-4 h-4" />
                                        Delivered At: {s.proofOfDelivery?.timestamp}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                        <MapPin className="w-4 h-4 text-green-500" />
                                        Geofence Verified
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                                        <Signature className="w-4 h-4" />
                                        View Sign
                                    </button>
                                    <button className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all">
                                        <Camera className="w-4 h-4" />
                                        View Photo
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderReports = () => {
        const totalBilled = transportInvoices.reduce((acc, inv) => acc + (inv.amount || inv.finalAmount || 0), 0);
        const totalPaid = transportInvoices.reduce((acc, inv) => acc + (inv.paidAmount || (inv.status === 'paid' ? (inv.amount || inv.finalAmount || 0) : 0) || 0), 0);
        const totalOutstanding = Math.max(0, totalBilled - totalPaid);
        const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

        const filteredInvoices = transportInvoices.filter(inv => {
            const sName = inv.studentName || '';
            const adm = inv.admissionNumber || '';
            const rName = inv.routeName || '';
            const invNo = inv.invoiceNumber || inv.id || '';
            const matchesSearch = !reportSearch || 
                sName.toLowerCase().includes(reportSearch.toLowerCase()) || 
                adm.toLowerCase().includes(reportSearch.toLowerCase()) || 
                rName.toLowerCase().includes(reportSearch.toLowerCase()) ||
                invNo.toLowerCase().includes(reportSearch.toLowerCase());
            const matchesStatus = reportStatusFilter === 'ALL' || inv.status === reportStatusFilter;
            return matchesSearch && matchesStatus;
        });

        const filteredRoutes = busRoutes.filter(r => {
            return !reportSearch || r.name.toLowerCase().includes(reportSearch.toLowerCase()) || (r.bus || '').toLowerCase().includes(reportSearch.toLowerCase()) || (r.driver || '').toLowerCase().includes(reportSearch.toLowerCase());
        });

        const filteredVehicles = dbVehicles.filter(v => {
            return !reportSearch || 
                (v.plateNumber || '').toLowerCase().includes(reportSearch.toLowerCase()) || 
                (v.model || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                (v.driverName || '').toLowerCase().includes(reportSearch.toLowerCase());
        });

        const filteredTrips = schoolTrips.filter(t => {
            return !reportSearch || 
                t.name.toLowerCase().includes(reportSearch.toLowerCase()) || 
                t.destination.toLowerCase().includes(reportSearch.toLowerCase()) ||
                (t.leadTeacher || '').toLowerCase().includes(reportSearch.toLowerCase());
        });

        const filteredAlerts = transportAlerts.filter(a => {
            return !reportSearch ||
                (a.message || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                (a.route || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                (a.vehiclePlate || '').toLowerCase().includes(reportSearch.toLowerCase());
        });

        const handleExportExcel = () => {
            if (reportSubTab === 'billing') {
                const data = filteredInvoices.map((inv, idx) => ({
                    '#': idx + 1,
                    'Invoice No': inv.invoiceNumber || inv.id,
                    'Student Name': inv.studentName,
                    'Admission No': inv.admissionNumber,
                    'Route': inv.routeName,
                    'Commute Mode': inv.preference || (inv as any).commutePreference || 'Round Trip',
                    'Billing Period': inv.period,
                    'Amount (KES)': inv.amount || inv.finalAmount || 0,
                    'Paid (KES)': inv.paidAmount || (inv.status === 'paid' ? (inv.amount || inv.finalAmount || 0) : 0),
                    'Balance (KES)': inv.balance !== undefined ? inv.balance : ((inv.amount || inv.finalAmount || 0) - (inv.paidAmount || (inv.status === 'paid' ? (inv.amount || inv.finalAmount || 0) : 0))),
                    'Status': (inv.status || 'Pending').toUpperCase(),
                    'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Transport Billing');
                XLSX.writeFile(wb, `Transport_Billing_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else if (reportSubTab === 'routes') {
                const data = filteredRoutes.map((r, idx) => {
                    const studentCount = Object.values(studentCommutePrefs).filter(p => p.routeId === r.id && p.preference !== 'none').length;
                    return {
                        '#': idx + 1,
                        'Route Name': r.name,
                        'Start Point': r.startPoint,
                        'End Point': r.endPoint,
                        'Assigned Bus': r.bus,
                        'Driver': r.driver,
                        'Attendant': r.attendant,
                        'Enrolled Students': studentCount
                    };
                });
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Route Manifest');
                XLSX.writeFile(wb, `Transport_Route_Manifest_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else if (reportSubTab === 'fleet') {
                const data = filteredVehicles.map((v, idx) => ({
                    '#': idx + 1,
                    'Plate Number': v.plateNumber,
                    'Model': v.model,
                    'Vehicle Type': v.vehicleType || 'Bus',
                    'Seating Capacity': v.capacity,
                    'Assigned Driver': v.driverName || 'Unassigned',
                    'Status': (v.status || 'Active').toUpperCase()
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Vehicle Fleet');
                XLSX.writeFile(wb, `Transport_Fleet_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else if (reportSubTab === 'trips') {
                const data = filteredTrips.map((t, idx) => ({
                    '#': idx + 1,
                    'Trip Name': t.name,
                    'Destination': t.destination,
                    'Date': t.date,
                    'Time': t.time,
                    'Lead Teacher': t.leadTeacher,
                    'Vehicle Assigned': t.vehicle,
                    'Passengers': t.passengers,
                    'Status': t.status.toUpperCase()
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'School Trips');
                XLSX.writeFile(wb, `School_Trips_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else if (reportSubTab === 'alerts') {
                const data = filteredAlerts.map((a, idx) => ({
                    '#': idx + 1,
                    'Severity': (a.severity || 'Normal').toUpperCase(),
                    'Category': (a.type || 'Notice').toUpperCase(),
                    'Route': a.route || 'All Routes',
                    'Vehicle Plate': a.vehiclePlate || 'N/A',
                    'Driver': a.driverName || 'N/A',
                    'Message': a.message,
                    'Status': (a.status || 'Active').toUpperCase(),
                    'Created At': a.createdAt ? new Date(a.createdAt).toLocaleString() : 'N/A'
                }));
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Disruptions');
                XLSX.writeFile(wb, `Transport_Disruptions_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            }
        };

        const activeCommutersCount = Object.values(studentCommutePrefs).filter(p => p.preference !== 'none').length;

        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                {/* Reports Header & KPI Strip */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-indigo-650 via-indigo-700 to-slate-900 text-white p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Total Transport Invoiced</p>
                        <h3 className="text-3xl font-black tracking-tight">KES {totalBilled.toLocaleString()}</h3>
                        <div className="flex items-center gap-2 mt-4 text-[10px] font-bold text-indigo-200">
                            <Receipt className="w-3.5 h-3.5" />
                            <span>{transportInvoices.length} Total Invoices</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Collected</p>
                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                {collectionRate}% Rate
                            </span>
                        </div>
                        <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">KES {totalPaid.toLocaleString()}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-4 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Net verified revenue</span>
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Outstanding Balance</p>
                        <h3 className="text-3xl font-black text-rose-600 dark:text-rose-400 tracking-tight">KES {totalOutstanding.toLocaleString()}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-4 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Pending fee settlements</span>
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fleet & Commuters</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{dbVehicles.length}</h3>
                            <span className="text-xs font-bold text-slate-400">Buses / {busRoutes.length} Routes</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-4 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{activeCommutersCount} Active Commuters</span>
                        </p>
                    </div>
                </div>

                {/* Sub-Tabs & Action Bar */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
                        {/* Sub-tab Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { id: 'billing', label: 'Billing & Fee Balances', icon: Receipt, count: filteredInvoices.length },
                                { id: 'routes', label: 'Route Manifests', icon: MapPin, count: filteredRoutes.length },
                                { id: 'fleet', label: 'Fleet & Drivers', icon: Truck, count: filteredVehicles.length },
                                { id: 'trips', label: 'School Trips', icon: Calendar, count: filteredTrips.length, show: isEduTransport },
                                { id: 'alerts', label: 'Disruptions Log', icon: Bell, count: filteredAlerts.length, show: isEduTransport },
                            ].filter(t => t.show !== false).map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setReportSubTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                                        reportSubTab === tab.id
                                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 dark:shadow-none scale-105'
                                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                                        reportSubTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Export Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export Excel</span>
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-5 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print</span>
                            </button>
                        </div>
                    </div>

                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={reportSearch}
                                onChange={e => setReportSearch(e.target.value)}
                                placeholder={
                                    reportSubTab === 'billing' ? 'Search student name, adm no, route, or invoice...' :
                                    reportSubTab === 'routes' ? 'Search route name, bus, or driver...' :
                                    reportSubTab === 'fleet' ? 'Search plate number, model, or driver...' :
                                    reportSubTab === 'trips' ? 'Search trip name, destination, or teacher...' :
                                    'Search disruption alert notices...'
                                }
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>

                        {reportSubTab === 'billing' && (
                            <select
                                value={reportStatusFilter}
                                onChange={e => setReportStatusFilter(e.target.value)}
                                className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shrink-0"
                            >
                                <option value="ALL">All Payment Statuses</option>
                                <option value="paid">Paid in Full</option>
                                <option value="pending">Pending Payment</option>
                                <option value="waived">Waived Fees</option>
                            </select>
                        )}
                    </div>

                    {/* Report Content Tables */}
                    {reportSubTab === 'billing' && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Student Details</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Route & Mode</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Period</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Invoiced</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Paid</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Balance</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-slate-400 font-bold">
                                                No transport invoices found matching your filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.map(inv => {
                                            const amt = inv.amount || inv.finalAmount || 0;
                                            const paid = inv.paidAmount || (inv.status === 'paid' ? amt : 0);
                                            const bal = inv.balance !== undefined ? inv.balance : Math.max(0, amt - paid);
                                            return (
                                                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                    <td className="p-4">
                                                        <p className="font-black text-slate-900 dark:text-white">{inv.studentName}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{inv.admissionNumber || inv.invoiceNumber || inv.id}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{inv.routeName}</p>
                                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                            {inv.preference || (inv as any).commutePreference || 'Round Trip'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-bold text-slate-600 dark:text-slate-300">{inv.period}</td>
                                                    <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">KES {amt.toLocaleString()}</td>
                                                    <td className="p-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">KES {paid.toLocaleString()}</td>
                                                    <td className="p-4 text-right font-mono font-black text-rose-600 dark:text-rose-400">KES {bal.toLocaleString()}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                            inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                            inv.status === 'waived' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                                                            'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                        }`}>
                                                            {inv.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-slate-500">
                                                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {reportSubTab === 'routes' && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Route Name</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Coverage Points</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Bus</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Crew (Driver & Attendant)</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Commuting Students</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                                    {filteredRoutes.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">No route records found.</td>
                                        </tr>
                                    ) : (
                                        filteredRoutes.map(r => {
                                            const studentCount = Object.values(studentCommutePrefs).filter(p => p.routeId === r.id && p.preference !== 'none').length;
                                            return (
                                                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                    <td className="p-4 font-black text-slate-900 dark:text-white">{r.name}</td>
                                                    <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                                                        <span className="font-bold">{r.startPoint}</span> ➔ <span>{r.endPoint}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black rounded-lg text-xs">
                                                            {r.bus}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">👨‍✈️ {r.driver}</p>
                                                        <p className="text-[10px] text-slate-400">👩‍💼 {r.attendant || 'No attendant assigned'}</p>
                                                    </td>
                                                    <td className="p-4 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                                        {studentCount} Students
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {reportSubTab === 'fleet' && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Plate & Identification</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Vehicle Model & Type</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Driver</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Seating Capacity</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Fleet Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                                    {filteredVehicles.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">No vehicles registered in fleet.</td>
                                        </tr>
                                    ) : (
                                        filteredVehicles.map(v => (
                                            <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                <td className="p-4">
                                                    <span className="font-mono font-black text-slate-900 dark:text-white px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800">
                                                        {v.plateNumber}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{v.model}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase">{v.vehicleType || 'School Bus'}</p>
                                                </td>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">
                                                    {v.driverName || 'Unassigned'}
                                                </td>
                                                <td className="p-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {v.capacity} Seats
                                                </td>
                                                <td className="p-4 text-center">
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-black uppercase rounded-full">
                                                        {v.status || 'Active'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {reportSubTab === 'trips' && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Trip Title</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Destination</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Date & Time</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Lead Teacher</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Assigned Bus</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                                    {filteredTrips.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400 font-bold">No school excursion records found.</td>
                                        </tr>
                                    ) : (
                                        filteredTrips.map(t => (
                                            <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                <td className="p-4 font-black text-slate-900 dark:text-white">{t.name}</td>
                                                <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">{t.destination}</td>
                                                <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                                                    {t.date} at {t.time}
                                                </td>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{t.leadTeacher}</td>
                                                <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{t.vehicle}</td>
                                                <td className="p-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                        t.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                                        t.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' :
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                    }`}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {reportSubTab === 'alerts' && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700">
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Severity</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Route & Bus</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Disruption Advisory</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                                        <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Logged Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                                    {filteredAlerts.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">No disruption alerts or route delay incidents recorded.</td>
                                        </tr>
                                    ) : (
                                        filteredAlerts.map(a => (
                                            <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                        a.severity === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                                                        a.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                                        'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                                    }`}>
                                                        {a.severity}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <p className="font-bold text-slate-800 dark:text-slate-200">{a.route || 'All Routes'}</p>
                                                    <p className="text-[10px] font-mono text-slate-400">{a.vehiclePlate || 'N/A'}</p>
                                                </td>
                                                <td className="p-4 font-medium text-slate-700 dark:text-slate-300 max-w-md">{a.message}</td>
                                                <td className="p-4">
                                                    <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-bold text-slate-500">
                                                    {a.createdAt ? new Date(a.createdAt).toLocaleString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 lg:p-10 space-y-10 group/logistics">
            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto whitespace-nowrap items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-[2rem] w-full border border-slate-200 dark:border-slate-800 shadow-inner scrollbar-none">
                {[
                    { id: 'sacco', label: 'SACCO Hub', icon: Landmark, show: isSACCO },
                    { id: 'shuttle', label: 'Shuttle Control', icon: DoorOpen, show: isShuttle },
                    { id: 'manifest', label: isSACCO ? 'Trip Registry' : isShuttle ? 'Route History' : isEduTransport ? 'Student Commute' : 'Cargo Manifest', icon: isEduTransport ? MapPin : Package, show: true },
                    { id: 'trips', label: 'School Trips', icon: Calendar, show: isEduTransport },
                    { id: 'fleet', label: isSACCO ? 'Vehicle Registry' : isEduTransport ? 'Bus Fleet' : 'Fleet Control', icon: Truck, show: true },
                    { id: 'vehicle_reg', label: 'Vehicle Registration', icon: Truck, show: true },
                    { id: 'analytics', label: isSACCO ? 'Dividend Data' : isShuttle ? 'Commute Data' : isEduTransport ? 'Commute Insights' : 'Route Science', icon: BarChart3, show: true },
                    { id: 'alerts',  label: 'Disruption Alerts', icon: Bell,    show: isEduTransport },
                    { id: 'billing', label: 'Transport Billing', icon: Receipt, show: isEduTransport },
                    { id: 'reports', label: 'Reports', icon: FileText, show: true },
                    { id: 'epod', label: 'Proof Center', icon: Signature, show: !isShuttle && !isSACCO && !isEduTransport }
                ].filter(t => t.show).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-3 px-8 py-3 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all shrink-0 ${
                            activeTab === tab.id 
                            ? 'bg-white dark:bg-slate-800 text-indigo-650 shadow-xl' 
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-650' : 'text-slate-400'}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Contextual Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                            {isSACCO ? <Landmark className="w-6 h-6 text-indigo-400" /> : isShuttle ? <DoorOpen className="w-6 h-6 text-indigo-400" /> : <Truck className="w-6 h-6 text-indigo-400" />}
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                            {isSACCO ? 'Transport SACCO' : isShuttle ? 'Shuttle' : isEduTransport ? 'School Commute' : 'Logistics'} <span className="text-indigo-600">{isSACCO ? 'Ledger' : isShuttle ? 'Operations' : isEduTransport ? 'Hub' : 'Control'}</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 font-medium max-w-xl group-hover/logistics:text-slate-600 transition-colors">
                        {isSACCO 
                            ? 'The cooperative management hub. Onboard individual vehicle owners, manage municipal licenses, track trip commissions, and oversee public online bookings.'
                            : isShuttle 
                            ? 'Corporate & staff mobility management. Track shuttle routes, manage seat reservations, and monitor real-time staff boarding and attendance.' 
                            : isEduTransport
                            ? 'Real-time student pick-up and drop-off coordination, live bus tracking for parents, and academic field trip booking and administration.'
                            : 'The mission control for your supply chain. Real-time fleet tracking, automated manifests, and digital proof-of-delivery for modern cargo operations.'}
                    </p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => {
                            if (isEduTransport) {
                                setIsAddTripModalOpen(true);
                            }
                        }}
                        className="px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-slate-200 dark:shadow-none hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center gap-3"
                    >
                        <Plus className="w-5 h-5" />
                        {isSACCO ? 'Register Member' : isShuttle ? 'Add New Route' : isEduTransport ? 'Schedule Trip' : 'Plan New Trip'}
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group/stat relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-900/50 rotate-45 translate-x-12 -translate-y-12 transition-colors group-hover/stat:bg-indigo-50/50"></div>
                        <div className="relative z-10 flex items-center gap-6">
                            <div className={`w-16 h-16 ${stat.bg} ${stat.color} rounded-[1.5rem] flex items-center justify-center transition-transform group-hover/stat:scale-110`}>
                                <stat.icon className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="min-h-[60vh]">
                {activeTab === 'manifest' && (isEduTransport ? renderStudentCommute() : renderManifest())}
                {activeTab === 'fleet' && renderFleet()}
                {activeTab === 'vehicle_reg' && (
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                        {isLoadingVehicles ? (
                            <div className="p-12 text-center text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
                                Loading Vehicle Registry...
                            </div>
                        ) : (
                            <TransportManager
                                currentInstitution={currentInstitution}
                                vehicles={dbVehicles}
                                users={users}
                                onAddVehicle={handleAddVehicle}
                                onUpdateVehicle={handleUpdateVehicle}
                                onDeleteVehicle={handleDeleteVehicle}
                                onAddUser={handleAddUser}
                                onEditUser={handleEditUser}
                            />
                        )}
                    </div>
                )}
                {activeTab === 'epod' && renderEPOD()}
                {activeTab === 'shuttle' && renderShuttleHub()}
                {activeTab === 'sacco' && renderSACCOHub()}
                {activeTab === 'trips' && isEduTransport && renderSchoolTrips()}
                {activeTab === 'analytics' && (
                    <div className="bg-white dark:bg-slate-800 p-20 rounded-[4rem] text-center border-4 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center">
                        <BarChart3 className="w-16 h-16 text-indigo-200 mb-8 animate-pulse" />
                        <h3 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">
                            {isEduTransport ? 'School Transit Safety Engine' : 'AI Route Science Engine'}
                        </h3>
                        <p className="text-slate-400 mt-4 max-w-sm">
                            {isEduTransport 
                                ? 'Analyzing daily driver speed profiles, fuel efficiency, and route arrival schedules to optimize student safety...'
                                : 'Generating optimal routes based on current traffic patterns and vessel arrival times...'}
                        </p>
                    </div>
                )}
                {activeTab === 'alerts' && isEduTransport && (
                    <TransportDisruptionAlert
                        mode="admin"
                        alerts={transportAlerts}
                        onAddAlert={handleAddAlert}
                        onResolveAlert={handleResolveAlert}
                        onAcknowledge={handleAcknowledgeAlert}
                    />
                )}
                {activeTab === 'billing' && isEduTransport && (
                    <TransportBillingManager
                        routeSettings={routeFeeSetting}
                        invoices={transportInvoices}
                        onUpdateRouteFee={handleUpdateRouteFee}
                        onDeleteRoute={handleDeleteRoute}
                        onGenerateInvoices={handleGenerateInvoices}
                        onMarkPaid={handleMarkPaid}
                        onWaive={handleWaiveFee}
                        defaultOneWayPercentage={defaultOneWayPercentage}
                        onUpdateDefaultOneWayPercentage={setDefaultOneWayPercentage}
                    />
                )}
                {activeTab === 'reports' && renderReports()}
            </div>
        </div>
    );
};

interface Users {
    length: number;
    filter(arg0: (u: any) => boolean): any;
    slice(arg0: number, arg1: number): any[];
}

