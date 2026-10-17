
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    Briefcase,
    Cloud,
    RefreshCw,
    Radio,
    UploadCloud,
    PiggyBank,
    Wallet,
    Coins,
    CreditCard,
    ArrowDownRight,
    ArrowUpRight,
    Percent,
    Shield,
    Sliders,
    AlertTriangle,
    Calculator,
    Clock3
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Institution, User as UserType, Course, StudentEnrollment, TransportSaccoAccount, TransportSaccoTransaction, TransportSaccoSavingsCategory, SaccoRemittanceTier, SaccoRemittanceSettings, SaccoDailyRemittanceRecord, SaccoLoanSettings, SaccoRoleLoanThreshold } from '../types';
import { getStudentResolvedAdm, getStudentResolvedClass } from './his/RegisterPatientModal';
import { TransportDisruptionAlert } from './TransportDisruptionAlert';
import type { TransportDisruption } from './TransportDisruptionAlert';
import { TransportBillingManager } from './TransportBillingManager';
import type { RouteFeeSetting, TransportFeeInvoice, BillingCycle } from './TransportBillingManager';
import { TransportOpeningBalancesModal } from './TransportOpeningBalancesModal';
import { TransportManager } from './TransportManager';
import { apiService, safeLocalStorage } from '../services/apiService';
import { useToast } from '../services/ToastContext';

const safeSetLocalItem = (key: string, value: any) => {
    try {
        const strVal = typeof value === 'string' ? value : JSON.stringify(value);
        safeLocalStorage.setItem(key, strVal);
    } catch (_) {
        // Safe fall-through: never crash component on storage quota limits
    }
};

const filterActiveCommutePrefs = (prefs: Record<string, any>) => {
    if (!prefs || typeof prefs !== 'object') return {};
    const clean: Record<string, any> = {};
    Object.entries(prefs).forEach(([stId, p]) => {
        if (p && p.preference && p.preference !== 'none' && p.routeId && p.routeId !== 'none') {
            clean[stId] = p;
        }
    });
    return clean;
};

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
    courses?: Course[];
}

export const LogisticsManager: React.FC<LogisticsManagerProps> = ({ currentInstitution, users, courses: initialCourses = [] }) => {
    const { success: toastSuccess, error: toastError } = useToast();
    const isShuttle = currentInstitution.category === 'Staff Shuttle' || currentInstitution.category === 'Corporate Shuttle';
    const isPublicTransport = currentInstitution.category === 'Public Transport' || currentInstitution.institutionType === 'Logistics' && currentInstitution.category === 'Cargo & Delivery';
    // Explicitly detect Public Transport & SACCO
    const isSACCO = currentInstitution.category === 'Public Transport' || currentInstitution.category === 'Public Transport SACCO' || currentInstitution.category?.includes('SACCO');
    const isSaccoSavings = currentInstitution.category === 'SACCO Savings' || currentInstitution.category === 'Transport SACCO & Savings' || currentInstitution.category?.toLowerCase().includes('savings');
    const isEduTransport = currentInstitution.category === 'Educational Transport' || currentInstitution.institutionType === 'Education' || currentInstitution.institutionType === 'Primary' || currentInstitution.institutionType === 'Secondary';

    const [activeTab, setActiveTab] = useState<'manifest' | 'fleet' | 'vehicle_reg' | 'analytics' | 'epod' | 'shuttle' | 'sacco' | 'sacco_savings' | 'sacco_remittance' | 'sacco_settings' | 'trips' | 'alerts' | 'billing' | 'reports'>(
        isSaccoSavings ? 'sacco_savings' : isSACCO ? 'sacco' : isShuttle ? 'shuttle' : 'manifest'
    );
    const [searchTerm, setSearchTerm] = useState('');
    const [reportSubTab, setReportSubTab] = useState<'billing' | 'routes' | 'fleet' | 'trips' | 'alerts'>('billing');
    const [reportSearch, setReportSearch] = useState('');
    const [reportStatusFilter, setReportStatusFilter] = useState('ALL');

    // Courses and Enrollments state for comprehensive class & stream resolving
    const [loadedCourses, setLoadedCourses] = useState<Course[]>(initialCourses);
    const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);

    useEffect(() => {
        if (!currentInstitution?.id) return;

        // Fetch courses if initialCourses is empty
        if (!initialCourses || initialCourses.length === 0) {
            apiService.fetchCourses(currentInstitution.id)
                .then(data => {
                    if (data && data.length > 0) setLoadedCourses(data);
                })
                .catch(e => console.warn('Could not load courses for logistics:', e));
        }

        // Fetch student enrollments
        apiService.fetchModuleRecords<StudentEnrollment>('student_enrollments', currentInstitution.id)
            .then(data => {
                if (data && Array.isArray(data)) setEnrollments(data);
            })
            .catch(e => console.warn('Could not load student enrollments for logistics:', e));
    }, [currentInstitution?.id, initialCourses]);

    useEffect(() => {
        if (initialCourses && initialCourses.length > 0) {
            setLoadedCourses(initialCourses);
        }
    }, [initialCourses]);

    // Vehicles state & API operations for Vehicle Registration tab & fleet selections
    const [dbVehicles, setDbVehicles] = useState<any[]>(() => {
        const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : null;
        const saved = key ? localStorage.getItem(key) : null;
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
            if (key) safeSetLocalItem(key, demo);
            return demo;
        }
        return [];
    });
    const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

    const fetchVehiclesList = async () => {
        if (!currentInstitution?.id) return;
        setIsLoadingVehicles(true);
        try {
            const key = `eduai_vehicles_${currentInstitution.id}`;
            const localSaved = localStorage.getItem(key);
            let localVehicles: any[] = [];
            if (localSaved) {
                try {
                    const parsed = JSON.parse(localSaved);
                    if (Array.isArray(parsed)) localVehicles = parsed;
                } catch (_) {}
            }

            const apiRecords = await apiService.fetchModuleRecords('vehicles', currentInstitution.id).catch(() => []);
            const remoteVehicles: any[] = (Array.isArray(apiRecords) ? apiRecords : []).filter((v: any) => {
                const vInst = v.institutionId || v.institution_id;
                return !vInst || vInst === currentInstitution.id;
            });

            // If remoteVehicles table is empty, check if hub has vehicles saved from another device
            if (remoteVehicles.length === 0) {
                try {
                    const hubData = await apiService.fetchTransportLogisticsHub(currentInstitution.id);
                    const hubVehicles = Array.isArray(hubData?.vehicles) ? hubData.vehicles : [];
                    if (hubVehicles.length > 0) {
                        remoteVehicles.push(...hubVehicles.filter((v: any) => !v.institutionId || v.institutionId === currentInstitution.id));
                    }
                } catch (_) {}
            }

            // Bi-directional vehicle synchronization:
            // If local storage has vehicles not yet in Supabase, upload them!
            const scopedLocalVehicles = localVehicles.filter((lv: any) => !lv.institutionId || lv.institutionId === currentInstitution.id);
            if (scopedLocalVehicles.length > 0) {
                for (const lv of scopedLocalVehicles) {
                    const normPlate = (lv.plateNumber || lv.registrationNumber || lv.plate || '').trim().toUpperCase();
                    const exists = remoteVehicles.some(rv => {
                        const rvPlate = (rv.plateNumber || rv.registrationNumber || rv.plate || '').trim().toUpperCase();
                        return (rv.id && rv.id === lv.id) || (normPlate && rvPlate === normPlate);
                    });
                    if (!exists && (normPlate || lv.model)) {
                        try {
                            const uploaded = await apiService.saveModuleRecord('vehicles', {
                                ...lv,
                                institutionId: currentInstitution.id,
                                institution_id: currentInstitution.id
                            });
                            remoteVehicles.push(uploaded || lv);
                        } catch (e) {
                            console.warn('Failed to upload local vehicle to cloud:', e);
                        }
                    }
                }
            }

            const merged = remoteVehicles.length > 0 ? remoteVehicles : scopedLocalVehicles;

            if (merged.length > 0) {
                setDbVehicles(merged);
                if (key) safeSetLocalItem(key, merged);
            } else if (currentInstitution?.id?.startsWith('demo_')) {
                const demo = [
                    { id: 'vh_demo_1', plateNumber: 'KDC 992P', model: 'Bus 04', vehicleType: 'bus', capacity: 51, status: 'active', institutionId: currentInstitution?.id, driverName: 'Douglas Omwamba' },
                    { id: 'vh_demo_2', plateNumber: 'KBB 120Z', model: 'Bus 02', vehicleType: 'bus', capacity: 33, status: 'active', institutionId: currentInstitution?.id, driverName: 'James Kamau' },
                    { id: 'vh_demo_3', plateNumber: 'KDM 441X', model: 'Bus 07', vehicleType: 'bus', capacity: 25, status: 'active', institutionId: currentInstitution?.id, driverName: 'Douglas Omwamba' },
                ];
                setDbVehicles(demo);
                if (key) safeSetLocalItem(key, demo);
            } else {
                setDbVehicles([]);
            }
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        } finally {
            setIsLoadingVehicles(false);
        }
    };

    React.useEffect(() => {
        fetchVehiclesList();
    }, [currentInstitution?.id]);

    const saveVehiclesToHub = async (vehiclesList: any[]) => {
        if (!currentInstitution?.id) return;
        try {
            const existingHub = await apiService.fetchTransportLogisticsHub(currentInstitution.id).catch(() => null);
            const hubPayload = {
                ...(existingHub || {}),
                vehicles: vehiclesList,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveTransportLogisticsHub(currentInstitution.id, hubPayload);
        } catch (_) {}
    };

    // ═════════════════════════════════════════════════════════════════════════
    // TRANSPORT SACCO REMITTANCE & LATE PENALTY CONFIGURATION
    // ═════════════════════════════════════════════════════════════════════════
    const DEFAULT_SACCO_REMITTANCE_SETTINGS: SaccoRemittanceSettings = {
        enabled: true,
        tiers: [
            { id: 'tier_silver', tierName: 'Silver', dailyTarget: 1500, description: 'Standard 14-seater matatu rate', color: 'slate' },
            { id: 'tier_bronze', tierName: 'Bronze', dailyTarget: 1600, description: 'Mid-capacity express shuttle rate', color: 'amber' },
            { id: 'tier_gold', tierName: 'Gold', dailyTarget: 1700, description: 'High-capacity 33+ seater or prime route rate', color: 'yellow' }
        ],
        cutoffTime: '22:00', // 10:00 PM same day
        latePenaltyAmount: 100, // +KES 100 if late by 1 minute
        nextDayCutoffTime: '10:00', // 10:00 AM next day
        nextDayDelayPenaltyAmount: 200, // +KES 200 additional if past 10:00 AM next day
        graceMinutes: 0,
        enforcePenalties: true,
        sinkingFundDeduction: 0
    };

    const calculateRemittanceFee = (
        targetDate: string, // YYYY-MM-DD
        submissionDate: Date,
        baseTarget: number,
        settings: SaccoRemittanceSettings
    ) => {
        if (!settings.enforcePenalties) {
            return {
                isLate: false,
                isNextDayOverdue: false,
                latePenalty: 0,
                nextDayPenalty: 0,
                totalPenalty: 0,
                totalPayable: baseTarget,
                status: 'on_time' as const,
                ruleMessage: 'Penalties disabled in settings'
            };
        }

        const [c1H, c1M] = (settings.cutoffTime || '22:00').split(':').map(Number);
        const cutoff1 = new Date(`${targetDate}T${String(c1H).padStart(2, '0')}:${String(c1M).padStart(2, '0')}:00`);
        const graceMs = (settings.graceMinutes || 0) * 60 * 1000;
        const effectiveCutoff1 = new Date(cutoff1.getTime() + graceMs);

        const [c2H, c2M] = (settings.nextDayCutoffTime || '10:00').split(':').map(Number);
        const nextDay = new Date(`${targetDate}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        const y2 = nextDay.getFullYear();
        const m2 = String(nextDay.getMonth() + 1).padStart(2, '0');
        const d2 = String(nextDay.getDate()).padStart(2, '0');
        const cutoff2 = new Date(`${y2}-${m2}-${d2}T${String(c2H).padStart(2, '0')}:${String(c2M).padStart(2, '0')}:00`);

        let isLate = false;
        let isNextDayOverdue = false;
        let latePenalty = 0;
        let nextDayPenalty = 0;
        let status: 'on_time' | 'late' | 'overdue' = 'on_time';
        let ruleMessage = `Submitted before ${settings.cutoffTime} deadline. No penalty assessed.`;

        if (submissionDate > cutoff2) {
            isLate = true;
            isNextDayOverdue = true;
            latePenalty = Number(settings.latePenaltyAmount) || 100;
            nextDayPenalty = Number(settings.nextDayDelayPenaltyAmount) || 200;
            status = 'overdue';
            ruleMessage = `Delayed past next-day ${settings.nextDayCutoffTime} cutoff (+KES ${latePenalty} Level 1 Late + KES ${nextDayPenalty} Level 2 Delayed).`;
        } else if (submissionDate > effectiveCutoff1) {
            isLate = true;
            latePenalty = Number(settings.latePenaltyAmount) || 100;
            status = 'late';
            ruleMessage = `Late submission after ${settings.cutoffTime} cutoff (+KES ${latePenalty} Level 1 Late penalty).`;
        }

        const totalPenalty = latePenalty + nextDayPenalty;
        return {
            isLate,
            isNextDayOverdue,
            latePenalty,
            nextDayPenalty,
            totalPenalty,
            totalPayable: baseTarget + totalPenalty,
            status,
            ruleMessage
        };
    };

    // ═════════════════════════════════════════════════════════════════════════
    // TRANSPORT SACCO LOAN & SAVINGS-BACKED CREDIT POLICY CONFIGURATION
    // ═════════════════════════════════════════════════════════════════════════
    const DEFAULT_SACCO_LOAN_SETTINGS: SaccoLoanSettings = {
        enabled: true,
        loanMultiplier: 3, // 3x cumulative savings
        minSavingsThreshold: 10000, // General fallback threshold KES 10,000
        roleMinSavingsThresholds: {
            driver: 10000, // PSV Driver must have saved above 10,000 to qualify
            owner: 20000, // Vehicle Owner minimum threshold
            conductor: 5000, // Conductor minimum threshold
            staff: 10000 // SACCO Staff threshold
        },
        interestRate: 12, // 12% per annum (1.0% monthly)
        interestRatePeriod: 'annual',
        interestCalculationMethod: 'reducing_balance', // Reducing balance
        maxRepaymentMonths: 12,
        minMembershipMonths: 3,
        guarantorsRequired: 2,
        processingFeePercent: 1.5,
        emergencyLoanMaxAmount: 30000,
        emergencyInterestRate: 10
    };

    const computeMemberLoanEligibility = (
        savingsBalance: number,
        role: 'Owner' | 'Driver' | 'Conductor' | 'Staff' | string,
        settings: SaccoLoanSettings
    ) => {
        if (!settings.enabled) {
            return {
                isEligible: false,
                minRequired: 0,
                maxLoanLimit: 0,
                shortfall: 0,
                reason: 'SACCO Credit Facility is currently disabled in settings.'
            };
        }

        const roleKey = (role ? role.toLowerCase() : 'driver') as keyof SaccoRoleLoanThreshold;
        const minRequired = settings.roleMinSavingsThresholds?.[roleKey] ?? settings.minSavingsThreshold;

        if (savingsBalance < minRequired) {
            const shortfall = minRequired - savingsBalance;
            return {
                isEligible: false,
                minRequired,
                maxLoanLimit: 0,
                shortfall,
                reason: `${role} must have saved above KES ${minRequired.toLocaleString()} to qualify (Shortfall: KES ${shortfall.toLocaleString()})`
            };
        }

        const maxLoanLimit = Math.round(savingsBalance * (settings.loanMultiplier || 3));
        return {
            isEligible: true,
            minRequired,
            maxLoanLimit,
            shortfall: 0,
            reason: `Eligible for up to ${settings.loanMultiplier}x savings (Max KES ${maxLoanLimit.toLocaleString()})`
        };
    };

    const calculateLoanRepayment = (
        principal: number,
        months: number,
        interestRate: number,
        method: 'reducing_balance' | 'flat_rate',
        period: 'annual' | 'monthly' = 'annual'
    ) => {
        if (principal <= 0 || months <= 0) {
            return { monthlyInstallment: 0, totalInterest: 0, totalRepayment: 0 };
        }

        const annualRate = period === 'monthly' ? interestRate * 12 : interestRate;
        const monthlyRate = annualRate / 100 / 12;

        if (method === 'flat_rate') {
            const totalInterest = principal * (annualRate / 100) * (months / 12);
            const totalRepayment = principal + totalInterest;
            const monthlyInstallment = totalRepayment / months;
            return {
                monthlyInstallment: Math.round(monthlyInstallment),
                totalInterest: Math.round(totalInterest),
                totalRepayment: Math.round(totalRepayment)
            };
        } else {
            if (monthlyRate === 0) {
                return {
                    monthlyInstallment: Math.round(principal / months),
                    totalInterest: 0,
                    totalRepayment: principal
                };
            }
            const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
            const totalRepayment = emi * months;
            const totalInterest = totalRepayment - principal;
            return {
                monthlyInstallment: Math.round(emi),
                totalInterest: Math.max(0, Math.round(totalInterest)),
                totalRepayment: Math.round(totalRepayment)
            };
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // TRANSPORT SACCO SAVINGS STATE & WORKFLOWS
    // ═════════════════════════════════════════════════════════════════════════
    const defaultSaccoAccounts: TransportSaccoAccount[] = [
        {
            id: 'ts_acc_1',
            memberId: 'ts_mbr_1',
            memberName: 'Joseph Mwaniki',
            memberNumber: 'TS-MBR-1001',
            memberRole: 'Owner',
            phoneNumber: '0722123456',
            vehiclePlate: 'KDC 992P',
            vehicleModel: 'Isuzu NQR (33-Seater)',
            savingsCategory: 'Daily Sinking Fund',
            savingsBalance: 485000,
            shareCapital: 100000,
            welfareBalance: 25000,
            dailyTarget: 1700,
            remittanceTier: 'Gold',
            loanEligibility: 1455000,
            status: 'Active',
            joinedDate: '2023-01-15',
            lastDepositDate: new Date().toISOString().split('T')[0]
        },
        {
            id: 'ts_acc_2',
            memberId: 'ts_mbr_2',
            memberName: 'Grace Wambui',
            memberNumber: 'TS-MBR-1002',
            memberRole: 'Owner',
            phoneNumber: '0723456789',
            vehiclePlate: 'KBB 120Z',
            vehicleModel: 'Toyota HiAce (14-Seater)',
            savingsCategory: 'Member Savings',
            savingsBalance: 320000,
            shareCapital: 80000,
            welfareBalance: 20000,
            dailyTarget: 1600,
            remittanceTier: 'Bronze',
            loanEligibility: 960000,
            status: 'Active',
            joinedDate: '2023-04-10',
            lastDepositDate: new Date().toISOString().split('T')[0]
        },
        {
            id: 'ts_acc_3',
            memberId: 'ts_mbr_3',
            memberName: 'Douglas Omwamba',
            memberNumber: 'TS-MBR-1003',
            memberRole: 'Driver',
            phoneNumber: '0712345678',
            vehiclePlate: 'KDC 992P',
            vehicleModel: 'Isuzu NQR (33-Seater)',
            savingsCategory: 'Welfare & Emergency',
            savingsBalance: 68000,
            shareCapital: 20000,
            welfareBalance: 15000,
            dailyTarget: 1700,
            remittanceTier: 'Gold',
            loanEligibility: 204000,
            status: 'Active',
            joinedDate: '2023-06-20',
            lastDepositDate: new Date().toISOString().split('T')[0]
        },
        {
            id: 'ts_acc_4',
            memberId: 'ts_mbr_4',
            memberName: 'James Kamau',
            memberNumber: 'TS-MBR-1004',
            memberRole: 'Driver',
            phoneNumber: '0722345678',
            vehiclePlate: 'KBB 120Z',
            vehicleModel: 'Toyota HiAce (14-Seater)',
            savingsCategory: 'Daily Sinking Fund',
            savingsBalance: 45000,
            shareCapital: 15000,
            welfareBalance: 12000,
            dailyTarget: 1500,
            remittanceTier: 'Silver',
            loanEligibility: 135000,
            status: 'Active',
            joinedDate: '2023-08-05',
            lastDepositDate: new Date().toISOString().split('T')[0]
        },
        {
            id: 'ts_acc_5',
            memberId: 'ts_mbr_5',
            memberName: 'Kevin Otieno',
            memberNumber: 'TS-MBR-1005',
            memberRole: 'Owner',
            phoneNumber: '0733567890',
            vehiclePlate: 'KDM 441X',
            vehicleModel: 'Mitsubishi Rosa (25-Seater)',
            savingsCategory: 'Fleet Expansion',
            savingsBalance: 610000,
            shareCapital: 120000,
            welfareBalance: 30000,
            dailyTarget: 1500,
            remittanceTier: 'Silver',
            loanEligibility: 1830000,
            status: 'Active',
            joinedDate: '2023-09-12',
            lastDepositDate: new Date().toISOString().split('T')[0]
        },
        {
            id: 'ts_acc_6',
            memberId: 'ts_mbr_6',
            memberName: 'Mary Atieno',
            memberNumber: 'TS-MBR-1006',
            memberRole: 'Conductor',
            phoneNumber: '0745678901',
            vehiclePlate: 'KDM 441X',
            vehicleModel: 'Mitsubishi Rosa (25-Seater)',
            savingsCategory: 'Holiday Scheme',
            savingsBalance: 38500,
            shareCapital: 10000,
            welfareBalance: 10000,
            dailyTarget: 100,
            loanEligibility: 115500,
            status: 'Active',
            joinedDate: '2024-01-18',
            lastDepositDate: new Date().toISOString().split('T')[0]
        }
    ];

    const defaultSaccoTransactions: TransportSaccoTransaction[] = [
        {
            id: 'tx_sav_1',
            accountId: 'ts_acc_3',
            memberId: 'ts_mbr_3',
            memberName: 'Douglas Omwamba',
            vehiclePlate: 'KDC 992P',
            savingsCategory: 'Daily Sinking Fund',
            transactionType: 'deposit',
            amount: 150,
            paymentMethod: 'mpesa',
            reference: 'QHK9012KA',
            recordedAt: new Date().toISOString(),
            notes: 'Daily driver sinking fund contribution'
        },
        {
            id: 'tx_sav_2',
            accountId: 'ts_acc_1',
            memberId: 'ts_mbr_1',
            memberName: 'Joseph Mwaniki',
            vehiclePlate: 'KDC 992P',
            savingsCategory: 'Member Savings',
            transactionType: 'deposit',
            amount: 15000,
            paymentMethod: 'bank',
            reference: 'EQUIT-88192',
            recordedAt: new Date(Date.now() - 86400000).toISOString(),
            notes: 'Monthly voluntary member savings deposit'
        },
        {
            id: 'tx_sav_3',
            accountId: 'ts_acc_2',
            memberId: 'ts_mbr_2',
            memberName: 'Grace Wambui',
            vehiclePlate: 'KBB 120Z',
            savingsCategory: 'Daily Sinking Fund',
            transactionType: 'deposit',
            amount: 300,
            paymentMethod: 'daily_deduction',
            reference: 'DD-KBB120Z',
            recordedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            notes: 'Trip check-off daily route maintenance deduction'
        },
        {
            id: 'tx_sav_4',
            accountId: 'ts_acc_5',
            memberId: 'ts_mbr_5',
            memberName: 'Kevin Otieno',
            vehiclePlate: 'KDM 441X',
            savingsCategory: 'Fleet Expansion',
            transactionType: 'deposit',
            amount: 50000,
            paymentMethod: 'bank',
            reference: 'KCB-77102',
            recordedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            notes: 'Asset finance savings for 33-seater chassis'
        },
        {
            id: 'tx_sav_5',
            accountId: 'ts_acc_6',
            memberId: 'ts_mbr_6',
            memberName: 'Mary Atieno',
            vehiclePlate: 'KDM 441X',
            savingsCategory: 'Welfare & Emergency',
            transactionType: 'deposit',
            amount: 200,
            paymentMethod: 'mpesa',
            reference: 'QHJ8839LM',
            recordedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
            notes: 'Weekly conductor emergency benevolent cover'
        }
    ];

    const [saccoAccounts, setSaccoAccounts] = useState<TransportSaccoAccount[]>(() => {
        const key = currentInstitution?.id ? `eduai_transport_sacco_savings_${currentInstitution.id}` : null;
        if (key) {
            try {
                const saved = localStorage.getItem(key);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch (_) {}
        }
        return defaultSaccoAccounts;
    });

    const [saccoTransactions, setSaccoTransactions] = useState<TransportSaccoTransaction[]>(() => {
        const key = currentInstitution?.id ? `eduai_transport_sacco_tx_${currentInstitution.id}` : null;
        if (key) {
            try {
                const saved = localStorage.getItem(key);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch (_) {}
        }
        return defaultSaccoTransactions;
    });

    const [savingsSchemeFilter, setSavingsSchemeFilter] = useState<'ALL' | TransportSaccoSavingsCategory>('ALL');
    const [savingsRoleFilter, setSavingsRoleFilter] = useState<'ALL' | 'Owner' | 'Driver' | 'Conductor' | 'Staff'>('ALL');
    const [savingsSearchTerm, setSavingsSearchTerm] = useState('');

    // Modal states for Deposit
    const [isRecordDepositModalOpen, setIsRecordDepositModalOpen] = useState(false);
    const [depositAccountId, setDepositAccountId] = useState('');
    const [depositCategory, setDepositCategory] = useState<TransportSaccoSavingsCategory>('Daily Sinking Fund');
    const [depositAmount, setDepositAmount] = useState<string>('');
    const [depositMethod, setDepositMethod] = useState<'mpesa' | 'bank' | 'cash' | 'daily_deduction'>('mpesa');
    const [depositRef, setDepositRef] = useState('');
    const [depositNotes, setDepositNotes] = useState('');

    // Modal states for Onboarding Member
    const [isOnboardMemberModalOpen, setIsOnboardMemberModalOpen] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<'Owner' | 'Driver' | 'Conductor' | 'Staff'>('Owner');
    const [newMemberPlate, setNewMemberPlate] = useState('');
    const [newMemberModel, setNewMemberModel] = useState('');
    const [newMemberCategory, setNewMemberCategory] = useState<TransportSaccoSavingsCategory>('Daily Sinking Fund');
    const [newMemberDeposit, setNewMemberDeposit] = useState<string>('5000');
    const [newMemberShareCapital, setNewMemberShareCapital] = useState<string>('20000');
    const [newMemberDailyTarget, setNewMemberDailyTarget] = useState<string>('1500');
    const [newMemberRemittanceTier, setNewMemberRemittanceTier] = useState<string>('Silver');

    // ═════════════════════════════════════════════════════════════════════════
    // SACCO DAILY REMITTANCE & CUTOFF SETTINGS STATE
    // ═════════════════════════════════════════════════════════════════════════
    const [remittanceSettings, setRemittanceSettings] = useState<SaccoRemittanceSettings>(() => {
        const key = currentInstitution?.id ? `eduai_sacco_remittance_settings_${currentInstitution.id}` : null;
        if (key) {
            try {
                const saved = localStorage.getItem(key);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && Array.isArray(parsed.tiers) && parsed.tiers.length > 0) return parsed;
                }
            } catch (_) {}
        }
        return DEFAULT_SACCO_REMITTANCE_SETTINGS;
    });

    const [remittanceRecords, setRemittanceRecords] = useState<SaccoDailyRemittanceRecord[]>(() => {
        const key = currentInstitution?.id ? `eduai_sacco_remittance_records_${currentInstitution.id}` : null;
        if (key) {
            try {
                const saved = localStorage.getItem(key);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed)) return parsed;
                }
            } catch (_) {}
        }
        return [];
    });

    const [selectedRemittanceDate, setSelectedRemittanceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [remittanceSearchTerm, setRemittanceSearchTerm] = useState<string>('');
    const [remittanceFilterStatus, setRemittanceFilterStatus] = useState<'ALL' | 'on_time' | 'late' | 'overdue' | 'pending'>('ALL');

    // Record Remittance Modal
    const [isRecordRemittanceModalOpen, setIsRecordRemittanceModalOpen] = useState(false);
    const [activeRemittanceDriver, setActiveRemittanceDriver] = useState<any | null>(null);
    const [remittancePaymentDate, setRemittancePaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [remittancePaymentTime, setRemittancePaymentTime] = useState<string>(() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    });
    const [remittancePaidAmount, setRemittancePaidAmount] = useState<string>('');
    const [remittancePaymentMethod, setRemittancePaymentMethod] = useState<'mpesa' | 'cash' | 'bank' | 'daily_deduction'>('mpesa');
    const [remittanceRefCode, setRemittanceRefCode] = useState<string>('');
    const [remittanceNotes, setRemittanceNotes] = useState<string>('');

    // Simulator State (for SACCO Settings)
    const [simTierName, setSimTierName] = useState<string>('Silver');
    const [simSubmissionDate, setSimSubmissionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [simSubmissionTime, setSimSubmissionTime] = useState<string>('22:05'); // 10:05 PM test default (+100)

    // Add / Edit Tier Modal State
    const [isAddTierModalOpen, setIsAddTierModalOpen] = useState(false);
    const [editingTierId, setEditingTierId] = useState<string | null>(null);
    const [newTierName, setNewTierName] = useState('');
    const [newTierTarget, setNewTierTarget] = useState('1800');
    const [newTierDesc, setNewTierDesc] = useState('');
    const [newTierColor, setNewTierColor] = useState('indigo');

    // ═════════════════════════════════════════════════════════════════════════
    // SACCO LOAN & CREDIT POLICY SETTINGS STATE
    // ═════════════════════════════════════════════════════════════════════════
    const [loanSettings, setLoanSettings] = useState<SaccoLoanSettings>(() => {
        const key = currentInstitution?.id ? `eduai_sacco_loan_settings_${currentInstitution.id}` : null;
        if (key) {
            try {
                const saved = localStorage.getItem(key);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed.loanMultiplier === 'number') return parsed;
                }
            } catch (_) {}
        }
        return DEFAULT_SACCO_LOAN_SETTINGS;
    });

    // Loan Simulator State (for SACCO Settings)
    const [simLoanRole, setSimLoanRole] = useState<'Driver' | 'Owner' | 'Conductor' | 'Staff'>('Driver');
    const [simLoanSavings, setSimLoanSavings] = useState<string>('15000'); // KES 15,000 (qualifies above KES 10,000 driver min)
    const [simLoanAmount, setSimLoanAmount] = useState<string>('40000');
    const [simLoanTenureMonths, setSimLoanTenureMonths] = useState<number>(12);

    const handleRecordSavingsDeposit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(depositAmount);
        if (isNaN(amt) || amt <= 0) {
            alert('Please enter a valid deposit amount greater than 0.');
            return;
        }

        const account = saccoAccounts.find(a => a.id === depositAccountId);
        if (!account) {
            alert('Please select an active member savings account.');
            return;
        }

        const updatedAccounts = saccoAccounts.map(acc => {
            if (acc.id !== depositAccountId) return acc;
            let updatedSavings = acc.savingsBalance;
            let updatedShare = acc.shareCapital;
            let updatedWelfare = acc.welfareBalance;

            if (depositCategory === 'Share Capital') {
                updatedShare += amt;
            } else if (depositCategory === 'Welfare & Emergency') {
                updatedWelfare += amt;
            } else {
                updatedSavings += amt;
            }

            const elig = computeMemberLoanEligibility(updatedSavings, acc.memberRole, loanSettings);

            return {
                ...acc,
                savingsBalance: updatedSavings,
                shareCapital: updatedShare,
                welfareBalance: updatedWelfare,
                loanEligibility: elig.maxLoanLimit,
                lastDepositDate: new Date().toISOString().split('T')[0]
            };
        });

        const newTx: TransportSaccoTransaction = {
            id: `tx_sav_${Date.now()}`,
            accountId: account.id,
            memberId: account.memberId,
            memberName: account.memberName,
            vehiclePlate: account.vehiclePlate,
            savingsCategory: depositCategory,
            transactionType: 'deposit',
            amount: amt,
            paymentMethod: depositMethod,
            reference: depositRef.trim() || `MPESA-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
            recordedAt: new Date().toISOString(),
            notes: depositNotes.trim() || `${depositCategory} contribution`
        };

        const updatedTxs = [newTx, ...saccoTransactions];

        setSaccoAccounts(updatedAccounts);
        setSaccoTransactions(updatedTxs);

        if (currentInstitution?.id) {
            const accKey = `eduai_transport_sacco_savings_${currentInstitution.id}`;
            const txKey = `eduai_transport_sacco_tx_${currentInstitution.id}`;
            safeSetLocalItem(accKey, updatedAccounts);
            safeSetLocalItem(txKey, updatedTxs);
        }

        persistHubToCloud({ saccoAccounts: updatedAccounts, saccoTransactions: updatedTxs });

        toastSuccess(`✅ Deposit of KES ${amt.toLocaleString()} recorded for ${account.memberName} (${account.vehiclePlate}).`);
        setIsRecordDepositModalOpen(false);
        setDepositAmount('');
        setDepositRef('');
        setDepositNotes('');
    };

    const handleOnboardSaccoMember = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberName.trim() || !newMemberPhone.trim() || !newMemberPlate.trim()) {
            alert('Please fill in Member Name, Phone Number, and Vehicle Plate.');
            return;
        }

        const memberNum = `TS-MBR-${1000 + saccoAccounts.length + 1}`;
        const initDeposit = parseFloat(newMemberDeposit) || 0;
        const initShare = parseFloat(newMemberShareCapital) || 10000;
        const target = parseFloat(newMemberDailyTarget) || 1500;

        const newAccount: TransportSaccoAccount = {
            id: `ts_acc_${Date.now()}`,
            memberId: `ts_mbr_${Date.now()}`,
            memberName: newMemberName.trim(),
            memberNumber: memberNum,
            memberRole: newMemberRole,
            phoneNumber: newMemberPhone.trim(),
            vehiclePlate: newMemberPlate.trim().toUpperCase(),
            vehicleModel: newMemberModel.trim() || 'PSV / Matatu',
            savingsCategory: newMemberCategory,
            savingsBalance: initDeposit,
            shareCapital: initShare,
            welfareBalance: 1000,
            dailyTarget: target,
            remittanceTier: newMemberRemittanceTier || 'Silver',
            loanEligibility: computeMemberLoanEligibility(initDeposit, newMemberRole, loanSettings).maxLoanLimit,
            status: 'Active',
            joinedDate: new Date().toISOString().split('T')[0],
            lastDepositDate: new Date().toISOString().split('T')[0]
        };

        const updatedAccounts = [newAccount, ...saccoAccounts];
        let updatedTxs = [...saccoTransactions];

        if (initDeposit > 0) {
            updatedTxs = [{
                id: `tx_sav_${Date.now()}_dep`,
                accountId: newAccount.id,
                memberId: newAccount.memberId,
                memberName: newAccount.memberName,
                vehiclePlate: newAccount.vehiclePlate,
                savingsCategory: newMemberCategory,
                transactionType: 'deposit',
                amount: initDeposit,
                paymentMethod: 'cash',
                reference: `OB-DEP-${memberNum}`,
                recordedAt: new Date().toISOString(),
                notes: 'Initial account opening savings deposit'
            }, ...updatedTxs];
        }

        setSaccoAccounts(updatedAccounts);
        setSaccoTransactions(updatedTxs);

        if (currentInstitution?.id) {
            const accKey = `eduai_transport_sacco_savings_${currentInstitution.id}`;
            const txKey = `eduai_transport_sacco_tx_${currentInstitution.id}`;
            safeSetLocalItem(accKey, updatedAccounts);
            safeSetLocalItem(txKey, updatedTxs);
        }

        persistHubToCloud({ saccoAccounts: updatedAccounts, saccoTransactions: updatedTxs });

        toastSuccess(`🎉 Member ${newMemberName} successfully onboarded with Account #${memberNum}!`);
        setIsOnboardMemberModalOpen(false);
        setNewMemberName('');
        setNewMemberPhone('');
        setNewMemberPlate('');
        setNewMemberModel('');
        setNewMemberRemittanceTier('Silver');
    };

    const handleExportSavingsExcel = () => {
        try {
            const rows = filteredSaccoAccounts.map(acc => {
                const elig = computeMemberLoanEligibility(acc.savingsBalance, acc.memberRole, loanSettings);
                return {
                    'Member Number': acc.memberNumber,
                    'Member Name': acc.memberName,
                    'Role': acc.memberRole,
                    'Phone': acc.phoneNumber,
                    'Vehicle Plate': acc.vehiclePlate,
                    'Vehicle Model': acc.vehicleModel || 'N/A',
                    'Savings Scheme / Category': acc.savingsCategory,
                    'Savings Balance (KES)': acc.savingsBalance,
                    'Share Capital (KES)': acc.shareCapital,
                    'Welfare Reserve (KES)': acc.welfareBalance,
                    'Total Funds (KES)': acc.savingsBalance + acc.shareCapital + acc.welfareBalance,
                    'Daily Target (KES)': acc.dailyTarget,
                    'Loan Limit (KES)': elig.maxLoanLimit,
                    'Loan Qualification Status': elig.isEligible ? `Qualified (${loanSettings.loanMultiplier}x Savings)` : `Ineligible (< KES ${elig.minRequired.toLocaleString()} Min)`,
                    'Status': acc.status,
                    'Joined Date': acc.joinedDate,
                    'Last Deposit': acc.lastDepositDate
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'SACCO Savings');
            const fileName = `Transport_SACCO_Savings_${(currentInstitution?.name || 'EduAI').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toastSuccess('📊 SACCO Savings portfolio exported to Excel successfully!');
        } catch (e: any) {
            console.error('Export error:', e);
            toastError('Failed to generate Excel export.');
        }
    };

    // ═════════════════════════════════════════════════════════════════════════
    // SACCO DAILY REMITTANCE & PENALTY ENGINE HANDLERS
    // ═════════════════════════════════════════════════════════════════════════
    const handleSaveRemittanceSettings = () => {
        if (!currentInstitution?.id) return;
        const key = `eduai_sacco_remittance_settings_${currentInstitution.id}`;
        safeSetLocalItem(key, remittanceSettings);
        persistHubToCloud({ saccoRemittanceSettings: remittanceSettings });
        toastSuccess('⚙️ SACCO Remittance & Late Penalty settings successfully updated & synced to cloud!');
    };

    const handleResetRemittanceSettings = () => {
        setRemittanceSettings(DEFAULT_SACCO_REMITTANCE_SETTINGS);
        if (currentInstitution?.id) {
            safeSetLocalItem(`eduai_sacco_remittance_settings_${currentInstitution.id}`, DEFAULT_SACCO_REMITTANCE_SETTINGS);
        }
        persistHubToCloud({ saccoRemittanceSettings: DEFAULT_SACCO_REMITTANCE_SETTINGS });
        toastSuccess('🔄 Restored default remittance tiers (Silver KES 1500, Bronze KES 1600, Gold KES 1700) & cutoff rules (10 PM +100, 10 AM next day +200).');
    };

    const handleSaveLoanSettings = () => {
        if (!currentInstitution?.id) return;
        const key = `eduai_sacco_loan_settings_${currentInstitution.id}`;
        safeSetLocalItem(key, loanSettings);
        persistHubToCloud({ saccoLoanSettings: loanSettings });
        toastSuccess('🏦 SACCO Loan & Credit Policy settings successfully saved & synced to cloud!');
    };

    const handleResetLoanSettings = () => {
        setLoanSettings(DEFAULT_SACCO_LOAN_SETTINGS);
        if (currentInstitution?.id) {
            safeSetLocalItem(`eduai_sacco_loan_settings_${currentInstitution.id}`, DEFAULT_SACCO_LOAN_SETTINGS);
        }
        persistHubToCloud({ saccoLoanSettings: DEFAULT_SACCO_LOAN_SETTINGS });
        toastSuccess('🔄 Restored default SACCO loan limits (Driver min KES 10,000, 3x savings, 12% p.a. reducing balance).');
    };

    const handleSaveTier = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTierName.trim() || !newTierTarget) {
            toastError('Please specify Tier Name and Daily Remittance Target amount.');
            return;
        }
        const targetVal = parseFloat(newTierTarget) || 1500;
        let updatedTiers = [...remittanceSettings.tiers];
        if (editingTierId) {
            updatedTiers = updatedTiers.map(t => t.id === editingTierId ? {
                ...t,
                tierName: newTierName.trim(),
                dailyTarget: targetVal,
                description: newTierDesc.trim() || t.description,
                color: newTierColor
            } : t);
            toastSuccess(`Updated tier "${newTierName}" to KES ${targetVal.toLocaleString()}/day.`);
        } else {
            const newTier: SaccoRemittanceTier = {
                id: `tier_${Date.now()}`,
                tierName: newTierName.trim(),
                dailyTarget: targetVal,
                description: newTierDesc.trim() || `${newTierName} daily operational remittance target`,
                color: newTierColor
            };
            updatedTiers.push(newTier);
            toastSuccess(`Added new remittance tier "${newTierName}" at KES ${targetVal.toLocaleString()}/day.`);
        }

        const nextSettings: SaccoRemittanceSettings = {
            ...remittanceSettings,
            tiers: updatedTiers
        };
        setRemittanceSettings(nextSettings);
        if (currentInstitution?.id) {
            safeSetLocalItem(`eduai_sacco_remittance_settings_${currentInstitution.id}`, nextSettings);
        }
        persistHubToCloud({ saccoRemittanceSettings: nextSettings });
        setIsAddTierModalOpen(false);
        setEditingTierId(null);
        setNewTierName('');
        setNewTierTarget('1800');
        setNewTierDesc('');
    };

    const handleDeleteTier = (tierId: string) => {
        if (remittanceSettings.tiers.length <= 1) {
            toastError('At least one remittance tier must be maintained for the SACCO.');
            return;
        }
        const updatedTiers = remittanceSettings.tiers.filter(t => t.id !== tierId);
        const nextSettings = { ...remittanceSettings, tiers: updatedTiers };
        setRemittanceSettings(nextSettings);
        if (currentInstitution?.id) {
            safeSetLocalItem(`eduai_sacco_remittance_settings_${currentInstitution.id}`, nextSettings);
        }
        persistHubToCloud({ saccoRemittanceSettings: nextSettings });
        toastSuccess('Remittance tier removed.');
    };

    const handleOpenRecordRemittance = (account: TransportSaccoAccount, existingRecord?: SaccoDailyRemittanceRecord) => {
        setActiveRemittanceDriver(account);
        const todayStr = selectedRemittanceDate || new Date().toISOString().split('T')[0];
        setRemittancePaymentDate(todayStr);

        const now = new Date();
        const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setRemittancePaymentTime(currentHHmm);

        const tierName = account.remittanceTier || 'Silver';
        const tier = remittanceSettings.tiers.find(t => t.tierName.toLowerCase() === tierName.toLowerCase()) || remittanceSettings.tiers[0];
        const baseTarget = tier ? tier.dailyTarget : (account.dailyTarget || 1500);

        const paymentDateTime = new Date(`${todayStr}T${currentHHmm}:00`);
        const feeCalc = calculateRemittanceFee(todayStr, paymentDateTime, baseTarget, remittanceSettings);

        if (existingRecord) {
            setRemittancePaidAmount(String(existingRecord.amountPaid || feeCalc.totalPayable));
            setRemittancePaymentMethod(existingRecord.paymentMethod || 'mpesa');
            setRemittanceRefCode(existingRecord.referenceNumber || `REM-${Date.now().toString().slice(-6)}`);
            setRemittanceNotes(existingRecord.notes || '');
        } else {
            setRemittancePaidAmount(String(feeCalc.totalPayable));
            setRemittancePaymentMethod('mpesa');
            setRemittanceRefCode(`REM-${account.vehiclePlate.replace(/\s+/g, '')}-${Date.now().toString().slice(-4)}`);
            setRemittanceNotes(`Daily check-off remittance for ${account.vehiclePlate} (${account.memberName})`);
        }

        setIsRecordRemittanceModalOpen(true);
    };

    const handleSaveRemittanceRecord = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRemittanceDriver) return;

        const targetDate = remittancePaymentDate || selectedRemittanceDate;
        const tierName = activeRemittanceDriver.remittanceTier || 'Silver';
        const tier = remittanceSettings.tiers.find(t => t.tierName.toLowerCase() === tierName.toLowerCase()) || remittanceSettings.tiers[0];
        const baseTarget = tier ? tier.dailyTarget : (activeRemittanceDriver.dailyTarget || 1500);

        const paymentDateTime = new Date(`${targetDate}T${remittancePaymentTime || '20:00'}:00`);
        const feeCalc = calculateRemittanceFee(targetDate, paymentDateTime, baseTarget, remittanceSettings);

        const paid = parseFloat(remittancePaidAmount) || 0;
        const balance = Math.max(0, feeCalc.totalPayable - paid);

        const newRecord: SaccoDailyRemittanceRecord = {
            id: `rem_${targetDate}_${activeRemittanceDriver.id}`,
            institutionId: currentInstitution?.id,
            accountId: activeRemittanceDriver.id,
            memberId: activeRemittanceDriver.memberId,
            memberName: activeRemittanceDriver.memberName,
            vehiclePlate: activeRemittanceDriver.vehiclePlate,
            driverName: activeRemittanceDriver.memberName,
            driverPhone: activeRemittanceDriver.phoneNumber,
            tierName: tier ? tier.tierName : tierName,
            baseAmount: baseTarget,
            scheduledDate: targetDate,
            submittedAt: paymentDateTime.toISOString(),
            latePenalty: feeCalc.latePenalty,
            nextDayPenalty: feeCalc.nextDayPenalty,
            totalPayable: feeCalc.totalPayable,
            amountPaid: paid,
            balance: balance,
            status: feeCalc.status,
            paymentMethod: remittancePaymentMethod,
            referenceNumber: remittanceRefCode || `REM-${Date.now().toString().slice(-6)}`,
            notes: remittanceNotes,
            recordedBy: 'SACCO Cashier Desk'
        };

        const existingIdx = remittanceRecords.findIndex(r => (r.accountId === activeRemittanceDriver.id || r.vehiclePlate === activeRemittanceDriver.vehiclePlate) && r.scheduledDate === targetDate);
        let updatedRecords: SaccoDailyRemittanceRecord[];
        if (existingIdx >= 0) {
            updatedRecords = [...remittanceRecords];
            updatedRecords[existingIdx] = newRecord;
        } else {
            updatedRecords = [newRecord, ...remittanceRecords];
        }

        setRemittanceRecords(updatedRecords);
        if (currentInstitution?.id) {
            safeSetLocalItem(`eduai_sacco_remittance_records_${currentInstitution.id}`, updatedRecords);
        }
        persistHubToCloud({ saccoRemittanceRecords: updatedRecords });

        toastSuccess(`✅ Remittance of KES ${paid.toLocaleString()} recorded for ${activeRemittanceDriver.vehiclePlate} (${activeRemittanceDriver.memberName})! [Status: ${feeCalc.status.toUpperCase()} - ${feeCalc.ruleMessage}]`);
        setIsRecordRemittanceModalOpen(false);
        setActiveRemittanceDriver(null);
    };

    const handleExportRemittanceExcel = () => {
        try {
            const dateRecords = saccoAccounts.map(acc => {
                const existing = remittanceRecords.find(r => (r.accountId === acc.id || r.vehiclePlate === acc.vehiclePlate) && r.scheduledDate === selectedRemittanceDate);
                const tierName = acc.remittanceTier || 'Silver';
                const tier = remittanceSettings.tiers.find(t => t.tierName.toLowerCase() === tierName.toLowerCase()) || remittanceSettings.tiers[0];
                const baseTarget = tier ? tier.dailyTarget : (acc.dailyTarget || 1500);

                return {
                    'Date': selectedRemittanceDate,
                    'Vehicle Plate': acc.vehiclePlate,
                    'Driver / Member': acc.memberName,
                    'Role': acc.memberRole,
                    'Phone': acc.phoneNumber,
                    'Remittance Tier': tierName,
                    'Base Target (KES)': baseTarget,
                    'Submitted At': existing?.submittedAt ? new Date(existing.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending',
                    'Level 1 Late Fee (KES)': existing?.latePenalty ?? 0,
                    'Level 2 Delayed Fee (KES)': existing?.nextDayPenalty ?? 0,
                    'Total Payable (KES)': existing ? existing.totalPayable : baseTarget,
                    'Amount Paid (KES)': existing ? existing.amountPaid : 0,
                    'Balance Due (KES)': existing ? existing.balance : baseTarget,
                    'Status': existing ? existing.status.toUpperCase() : 'PENDING',
                    'Payment Mode': existing?.paymentMethod || 'N/A',
                    'Receipt / Ref Code': existing?.referenceNumber || 'N/A'
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(dateRecords);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, `Daily Remittance ${selectedRemittanceDate}`);
            const fileName = `SACCO_Daily_Remittance_${selectedRemittanceDate}_${(currentInstitution?.name || 'SACCO').replace(/\s+/g, '_')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toastSuccess(`📊 Remittance audit ledger for ${selectedRemittanceDate} exported to Excel!`);
        } catch (e) {
            console.error('Export error:', e);
            toastError('Failed to generate daily remittance Excel export.');
        }
    };

    const openDepositModalForAccount = (accountId: string, category?: TransportSaccoSavingsCategory) => {
        setDepositAccountId(accountId);
        if (category) setDepositCategory(category);
        else {
            const acc = saccoAccounts.find(a => a.id === accountId);
            if (acc) setDepositCategory(acc.savingsCategory);
        }
        setIsRecordDepositModalOpen(true);
    };

    const filteredSaccoAccounts = useMemo(() => {
        return saccoAccounts.filter(acc => {
            const matchesScheme = savingsSchemeFilter === 'ALL' || acc.savingsCategory === savingsSchemeFilter;
            const matchesRole = savingsRoleFilter === 'ALL' || acc.memberRole === savingsRoleFilter;
            const q = savingsSearchTerm.toLowerCase();
            const matchesSearch = !q ||
                acc.memberName.toLowerCase().includes(q) ||
                acc.vehiclePlate.toLowerCase().includes(q) ||
                acc.memberNumber.toLowerCase().includes(q) ||
                acc.phoneNumber.includes(q);
            return matchesScheme && matchesRole && matchesSearch;
        });
    }, [saccoAccounts, savingsSchemeFilter, savingsRoleFilter, savingsSearchTerm]);

    const totalSaccoSavingsPool = useMemo(() => {
        return saccoAccounts.reduce((sum, a) => sum + (a.savingsBalance || 0), 0);
    }, [saccoAccounts]);

    const totalSinkingFundPool = useMemo(() => {
        return saccoAccounts
            .filter(a => a.savingsCategory === 'Daily Sinking Fund')
            .reduce((sum, a) => sum + (a.savingsBalance || 0), 0);
    }, [saccoAccounts]);

    const totalShareCapitalPool = useMemo(() => {
        return saccoAccounts.reduce((sum, a) => sum + (a.shareCapital || 0), 0);
    }, [saccoAccounts]);

    const totalLoanCollateralPool = useMemo(() => {
        return saccoAccounts.reduce((sum, a) => {
            const elig = computeMemberLoanEligibility(a.savingsBalance, a.memberRole, loanSettings);
            return sum + elig.maxLoanLimit;
        }, 0);
    }, [saccoAccounts, loanSettings]);

    const handleAddVehicle = async (vehicleData: any) => {
        try {
            const newVehicle = {
                ...vehicleData,
                id: `vh_${Date.now()}`,
                institutionId: currentInstitution.id
            };
            const next = [newVehicle, ...dbVehicles];
            setDbVehicles(next);
            const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : null;
            if (key) safeSetLocalItem(key, next);

            saveVehiclesToHub(next);
            await apiService.saveModuleRecord('vehicles', newVehicle).catch(() => {});
        } catch (err: any) {
            alert('Failed to add vehicle: ' + (err.message || err));
        }
    };

    const handleUpdateVehicle = async (id: string, updates: any) => {
        try {
            const next = dbVehicles.map(v => v.id === id ? { ...v, ...updates } : v);
            setDbVehicles(next);
            const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : null;
            if (key) safeSetLocalItem(key, next);

            saveVehiclesToHub(next);
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
            const key = currentInstitution?.id ? `eduai_vehicles_${currentInstitution.id}` : null;
            if (key) safeSetLocalItem(key, next);

            saveVehiclesToHub(next);
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

    const [localUsers, setLocalUsers] = useState<UserType[]>(users);

    useEffect(() => {
        setLocalUsers(users);
    }, [users]);

    const handleEditUser = async (userId: string, data: any) => {
        try {
            const existingUser = (localUsers || users).find(u => u.id === userId);
            const isStudent = existingUser?.role === 'student' || data.vehicleId !== undefined || (data.metadata && data.metadata.vehicleId !== undefined);

            const updated = {
                ...existingUser,
                ...data,
                id: userId,
                vehicleId: data.vehicleId !== undefined ? data.vehicleId : existingUser?.vehicleId,
                metadata: {
                    ...(existingUser?.metadata || {}),
                    ...(data.metadata || {}),
                    ...(data.vehicleId !== undefined ? { vehicleId: data.vehicleId, assignedVehicleId: data.vehicleId } : {})
                }
            };

            setLocalUsers(prev => prev.map(u => u.id === userId ? updated : u));
            await apiService.saveModuleRecord('users', updated);

            if (isStudent) {
                try {
                    const instId = currentInstitution?.id || '';
                    const studentVehiclesKey = `eduai_transport_student_vehicles_${instId}`;
                    const cachedMap = JSON.parse(localStorage.getItem(studentVehiclesKey) || '{}');
                    cachedMap[userId] = data.vehicleId || '';
                    safeSetLocalItem(studentVehiclesKey, cachedMap);
                } catch (e) {}

                alert('Student transport vehicle assigned successfully!');
            } else {
                alert('Driver updated successfully!');
            }
        } catch (err: any) {
            alert('Failed to update: ' + (err.message || err));
        }
    };

    // Transport Disruption Alerts state
    const [transportAlerts, setTransportAlerts] = useState<TransportDisruption[]>([]);
    // ── TRANSPORT BILLING & ROUTES STATE (SCOPED STRICTLY BY INSTITUTION) ────
    const [routeFeeSetting, setRouteFeeSetting] = useState<RouteFeeSetting[]>(() => {
        const instKey = currentInstitution?.id ? `eduai_transport_route_fee_settings_${currentInstitution.id}` : null;
        const saved = instKey ? localStorage.getItem(instKey) : null;
        if (saved !== null) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.error('Error parsing route settings:', e);
            }
        }
        if (currentInstitution?.id?.startsWith('demo_')) {
            const defaultFees = [
                { routeId: 'route_1', routeName: 'Route A – Kilimani & Hurlingham', termFee: 8500,  monthlyFee: 3200, currency: 'KES' },
                { routeId: 'route_2', routeName: 'Route B – Langata & Karen',        termFee: 9500,  monthlyFee: 3600, currency: 'KES' },
                { routeId: 'route_3', routeName: 'Route C – Westlands & Spring Valley', termFee: 7800, monthlyFee: 3000, currency: 'KES' },
            ];
            if (instKey) safeSetLocalItem(instKey, defaultFees);
            return defaultFees;
        }
        return [];
    });

    React.useEffect(() => {
        if (!currentInstitution?.id) return;
        const key = `eduai_transport_route_fee_settings_${currentInstitution.id}`;
        safeSetLocalItem(key, routeFeeSetting);
    }, [routeFeeSetting, currentInstitution?.id]);

    const [transportInvoices, setTransportInvoices] = useState<TransportFeeInvoice[]>(() => {
        const key = currentInstitution?.id ? `eduai_transport_fee_invoices_${currentInstitution.id}` : null;
        const saved = key ? localStorage.getItem(key) : null;
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
        if (!currentInstitution?.id) return;
        const key = `eduai_transport_fee_invoices_${currentInstitution.id}`;
        safeSetLocalItem(key, transportInvoices);
    }, [transportInvoices, currentInstitution?.id]);

    const [studentCommutePrefs, setStudentCommutePrefs] = useState<Record<string, { routeId: string; preference: 'round_trip' | 'one_way_pickup' | 'one_way_drop' | 'none' }>>(() => {
        const instKey = currentInstitution?.id ? `eduai_student_commute_prefs_${currentInstitution.id}` : null;
        const saved = instKey ? localStorage.getItem(instKey) : null;
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
        if (!currentInstitution?.id) return;
        const key = `eduai_student_commute_prefs_${currentInstitution.id}`;
        safeSetLocalItem(key, filterActiveCommutePrefs(studentCommutePrefs));
    }, [studentCommutePrefs, currentInstitution?.id]);

    const [defaultOneWayPercentage, setDefaultOneWayPercentage] = useState<number>(() => {
        const instKey = currentInstitution?.id ? `eduai_transport_oneway_pct_${currentInstitution.id}` : null;
        const saved = instKey ? localStorage.getItem(instKey) : null;
        if (saved !== null) {
            const val = Number(saved);
            if (!isNaN(val) && val >= 1 && val <= 100) return val;
        }
        return 60;
    });

    React.useEffect(() => {
        if (!currentInstitution?.id) return;
        const key = `eduai_transport_oneway_pct_${currentInstitution.id}`;
        safeSetLocalItem(key, String(defaultOneWayPercentage));
    }, [defaultOneWayPercentage, currentInstitution?.id]);

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
        const saved = instKey ? localStorage.getItem(instKey) : null;
        if (saved !== null) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                console.error('Error parsing bus routes from localStorage:', e);
            }
        }

        const defaultRoutes = [
            { id: 'route_1', name: 'Route A - Main Corridor & Kilimani', startPoint: 'Main Center / Junction', endPoint: `${currentInstitution?.name || 'School'} Gate`, bus: 'Bus 01 (KDC 992P)', driver: 'Douglas Omwamba', attendant: 'Sarah Wanjiku' },
            { id: 'route_2', name: 'Route B - Residential Suburbs & Karen', startPoint: 'Karen Hub / Roundabout', endPoint: `${currentInstitution?.name || 'School'} Gate`, bus: 'Bus 02 (KBB 120Z)', driver: 'James Kamau', attendant: 'Mercy Nyambura' },
            { id: 'route_3', name: 'Route C - Central Shuttle & Westlands', startPoint: 'Westlands Bus Park', endPoint: `${currentInstitution?.name || 'School'} Gate`, bus: 'Bus 03 (KDM 441X)', driver: 'Paul Mwangi', attendant: 'Grace Achieng' },
        ];
        if (instKey) safeSetLocalItem(instKey, defaultRoutes);
        return defaultRoutes;
    });

    React.useEffect(() => {
        if (!currentInstitution?.id) return;
        const key = `eduai_transport_bus_routes_${currentInstitution.id}`;
        safeSetLocalItem(key, busRoutes);
    }, [busRoutes, currentInstitution?.id]);

    // School Trips State
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
        const key = currentInstitution?.id ? `eduai_school_trips_${currentInstitution.id}` : null;
        if (key) {
            const saved = localStorage.getItem(key);
            if (saved !== null) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse saved school trips', e);
                }
            }
        }
        if (currentInstitution?.id?.startsWith('demo_')) {
            const initialDemoTrips = [
                { id: 'trip_1', name: 'National Museum Geography Tour', destination: 'Nairobi National Museum', date: '2026-06-28', time: '08:30 AM', leadTeacher: 'Mr. Benson Kiprop', vehicle: 'KDC 992P (Bus 04)', passengers: '45 Students', status: 'approved' as const },
                { id: 'trip_2', name: 'Inter-School Athletics Competition', destination: 'Kasarani Stadium', date: '2026-07-02', time: '07:00 AM', leadTeacher: 'Mrs. Janet Otieno', vehicle: 'KBB 120Z (Bus 02)', passengers: '38 Athletes', status: 'approved' as const },
                { id: 'trip_3', name: 'Primary School Science Field Trip', destination: 'Karura Forest Reserve', date: '2026-07-10', time: '09:00 AM', leadTeacher: 'Miss Emily Muthoni', vehicle: 'KDM 441X (Bus 07)', passengers: '50 Students', status: 'pending' as const },
            ];
            if (key) safeSetLocalItem(key, initialDemoTrips);
            return initialDemoTrips;
        }
        return [];
    });

    React.useEffect(() => {
        if (!isEduTransport || !currentInstitution?.id) return;
        const key = `eduai_school_trips_${currentInstitution.id}`;
        safeSetLocalItem(key, schoolTrips);
    }, [schoolTrips, currentInstitution?.id, isEduTransport]);

    // Cloud Database Synchronization State & Helpers
    const [isCloudSyncing, setIsCloudSyncing] = useState(false);
    const [lastSyncedTime, setLastSyncedTime] = useState<Date | null>(null);

    const persistHubToCloud = (updates: Partial<{
        busRoutes: any[];
        studentCommutePrefs: any;
        routeFeeSetting: any[];
        defaultOneWayPercentage: number;
        schoolTrips: any[];
        transportInvoices: any[];
        transportAlerts: any[];
        studentVehicles: any;
        vehicles: any[];
        saccoAccounts?: TransportSaccoAccount[];
        saccoTransactions?: TransportSaccoTransaction[];
        saccoRemittanceSettings?: SaccoRemittanceSettings;
        saccoRemittanceRecords?: SaccoDailyRemittanceRecord[];
        saccoLoanSettings?: SaccoLoanSettings;
    }>) => {
        if (!currentInstitution?.id) return;
        const studentVehiclesKey = `eduai_transport_student_vehicles_${currentInstitution.id}`;
        let localStudentVehicles: Record<string, string> = {};
        try {
            const sv = localStorage.getItem(studentVehiclesKey);
            if (sv) localStudentVehicles = JSON.parse(sv);
        } catch (_) {}

        const vehiclesKey = `eduai_vehicles_${currentInstitution.id}`;
        let localVehicles: any[] = [];
        try {
            const vh = localStorage.getItem(vehiclesKey);
            if (vh) localVehicles = JSON.parse(vh);
        } catch (_) {}

        const currentVehicles = updates.vehicles !== undefined ? updates.vehicles : (dbVehicles.length > 0 ? dbVehicles : localVehicles);

        const payload = {
            busRoutes: updates.busRoutes !== undefined ? updates.busRoutes : busRoutes,
            studentCommutePrefs: updates.studentCommutePrefs !== undefined ? updates.studentCommutePrefs : studentCommutePrefs,
            routeFeeSetting: updates.routeFeeSetting !== undefined ? updates.routeFeeSetting : routeFeeSetting,
            defaultOneWayPercentage: updates.defaultOneWayPercentage !== undefined ? updates.defaultOneWayPercentage : defaultOneWayPercentage,
            schoolTrips: updates.schoolTrips !== undefined ? updates.schoolTrips : schoolTrips,
            transportInvoices: updates.transportInvoices !== undefined ? updates.transportInvoices : transportInvoices,
            transportAlerts: updates.transportAlerts !== undefined ? updates.transportAlerts : transportAlerts,
            studentVehicles: updates.studentVehicles !== undefined ? updates.studentVehicles : localStudentVehicles,
            vehicles: currentVehicles,
            saccoAccounts: updates.saccoAccounts !== undefined ? updates.saccoAccounts : saccoAccounts,
            saccoTransactions: updates.saccoTransactions !== undefined ? updates.saccoTransactions : saccoTransactions,
            saccoRemittanceSettings: updates.saccoRemittanceSettings !== undefined ? updates.saccoRemittanceSettings : remittanceSettings,
            saccoRemittanceRecords: updates.saccoRemittanceRecords !== undefined ? updates.saccoRemittanceRecords : remittanceRecords,
            saccoLoanSettings: updates.saccoLoanSettings !== undefined ? updates.saccoLoanSettings : loanSettings,
            updatedAt: new Date().toISOString()
        };
        apiService.saveTransportLogisticsHub(currentInstitution.id, payload).catch(err => {
            console.warn('[LogisticsManager] Failed to persist hub update to cloud:', err);
        });
    };

    const handleAddAlert = (alert: TransportDisruption) => {
        const next = [alert, ...transportAlerts];
        setTransportAlerts(next);
        persistHubToCloud({ transportAlerts: next });
    };

    const handleResolveAlert = (id: string) => {
        const next = transportAlerts.map(a => a.id === id
            ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
            : a
        );
        setTransportAlerts(next);
        persistHubToCloud({ transportAlerts: next });
    };

    const handleAcknowledgeAlert = (id: string, parentId: string) => {
        const next = transportAlerts.map(a => a.id === id
            ? { ...a, acknowledgedBy: [...a.acknowledgedBy.filter(p => p !== parentId), parentId] }
            : a
        );
        setTransportAlerts(next);
        persistHubToCloud({ transportAlerts: next });
    };

    const syncWithCloud = async (forcePush = false) => {
        if (!currentInstitution?.id) return;
        setIsCloudSyncing(true);
        try {
            const instId = currentInstitution.id;
            const routeKey = `eduai_transport_bus_routes_${instId}`;
            const prefKey = `eduai_student_commute_prefs_${instId}`;
            const feeKey = `eduai_transport_route_fee_settings_${instId}`;
            const tripKey = `eduai_school_trips_${instId}`;
            const invKey = `eduai_transport_fee_invoices_${instId}`;
            const pctKey = `eduai_transport_oneway_pct_${instId}`;
            const studentVehiclesKey = `eduai_transport_student_vehicles_${instId}`;
            const vehiclesKey = `eduai_vehicles_${instId}`;

            // Read local storage data
            let localRoutes: any[] = [];
            try { const r = localStorage.getItem(routeKey); if (r) localRoutes = JSON.parse(r); } catch (_) {}
            let localPrefs: Record<string, any> = {};
            try { const p = localStorage.getItem(prefKey); if (p) localPrefs = JSON.parse(p); } catch (_) {}
            let localFees: any[] = [];
            try { const f = localStorage.getItem(feeKey); if (f) localFees = JSON.parse(f); } catch (_) {}
            let localTrips: any[] = [];
            try { const t = localStorage.getItem(tripKey); if (t) localTrips = JSON.parse(t); } catch (_) {}
            let localInvs: any[] = [];
            try { const i = localStorage.getItem(invKey); if (i) localInvs = JSON.parse(i); } catch (_) {}
            let localStudentVehicles: Record<string, string> = {};
            try { const sv = localStorage.getItem(studentVehiclesKey); if (sv) localStudentVehicles = JSON.parse(sv); } catch (_) {}
            let localVehicles: any[] = [];
            try { const vh = localStorage.getItem(vehiclesKey); if (vh) localVehicles = JSON.parse(vh); } catch (_) {}

            const currentVehicles = dbVehicles.length > 0 ? dbVehicles : localVehicles;

            const cloudData = await apiService.fetchTransportLogisticsHub(instId);

            // Normalize cloud routes (support both camelCase busRoutes and snake_case bus_routes)
            const rawCloudRoutes = Array.isArray(cloudData?.busRoutes) ? cloudData.busRoutes : (Array.isArray(cloudData?.bus_routes) ? cloudData.bus_routes : []);
            const cloudRoutes = rawCloudRoutes.map((r: any) => ({
                id: r.id,
                name: r.name || r.routeName || r.route_name || '',
                startPoint: r.startPoint || r.start_point || '',
                endPoint: r.endPoint || r.end_point || '',
                bus: r.bus || '',
                driver: r.driver || '',
                attendant: r.attendant || ''
            }));

            // Normalize student commute preferences (support both studentCommutePrefs and student_commute_prefs)
            const rawCloudPrefs = (cloudData?.studentCommutePrefs && typeof cloudData.studentCommutePrefs === 'object')
                ? cloudData.studentCommutePrefs
                : ((cloudData?.student_commute_prefs && typeof cloudData.student_commute_prefs === 'object') ? cloudData.student_commute_prefs : {});

            const cloudPrefs: Record<string, { routeId: string; preference: 'round_trip' | 'one_way_pickup' | 'one_way_drop' | 'none' }> = {};
            Object.entries(rawCloudPrefs).forEach(([stId, prefObj]: [string, any]) => {
                if (prefObj && typeof prefObj === 'object') {
                    cloudPrefs[stId] = {
                        routeId: prefObj.routeId || prefObj.route_id || 'none',
                        preference: prefObj.preference || 'none'
                    };
                }
            });

            const cloudFees = Array.isArray(cloudData?.routeFeeSetting)
                ? cloudData.routeFeeSetting
                : (Array.isArray(cloudData?.route_fee_setting) ? cloudData.route_fee_setting : []);

            const cloudTrips = Array.isArray(cloudData?.schoolTrips)
                ? cloudData.schoolTrips
                : (Array.isArray(cloudData?.school_trips) ? cloudData.school_trips : []);

            const cloudInvs = Array.isArray(cloudData?.transportInvoices)
                ? cloudData.transportInvoices
                : (Array.isArray(cloudData?.transport_invoices) ? cloudData.transport_invoices : []);

            const cloudAlerts = Array.isArray(cloudData?.transportAlerts)
                ? cloudData.transportAlerts
                : (Array.isArray(cloudData?.transport_alerts) ? cloudData.transport_alerts : []);

            const cloudPct = cloudData?.defaultOneWayPercentage || cloudData?.default_one_way_percentage;
            const cloudStudentVehicles = cloudData?.studentVehicles || cloudData?.student_vehicles || {};

            const rawCloudVehicles = Array.isArray(cloudData?.vehicles) ? cloudData.vehicles : [];
            const cloudVehicles = rawCloudVehicles.map((v: any) => ({
                id: v.id,
                plateNumber: v.plateNumber || v.plate_number || '',
                model: v.model || '',
                vehicleType: v.vehicleType || v.vehicle_type || 'bus',
                capacity: Number(v.capacity) || 14,
                status: v.status || 'active',
                institutionId: v.institutionId || v.institution_id || instId,
                driverName: v.driverName || v.driver_name || (v.metadata && v.metadata.driverName) || '',
                driverId: v.driverId || v.driver_id || null,
                assistantId: v.assistantId || v.assistant_id || null
            }));

            const hasCloudData = cloudRoutes.length > 0 || Object.keys(cloudPrefs).length > 0 || cloudFees.length > 0 || cloudTrips.length > 0 || cloudVehicles.length > 0 || (cloudStudentVehicles && Object.keys(cloudStudentVehicles).length > 0);

            if (forcePush) {
                // EXPLICIT USER SYNC: Upload all current logistics data to Supabase
                const payload = {
                    busRoutes: localRoutes.length > 0 ? localRoutes : busRoutes,
                    studentCommutePrefs: Object.keys(localPrefs).length > 0 ? localPrefs : studentCommutePrefs,
                    routeFeeSetting: localFees.length > 0 ? localFees : routeFeeSetting,
                    defaultOneWayPercentage: defaultOneWayPercentage,
                    schoolTrips: localTrips.length > 0 ? localTrips : schoolTrips,
                    transportInvoices: localInvs.length > 0 ? localInvs : transportInvoices,
                    transportAlerts: transportAlerts,
                    studentVehicles: localStudentVehicles,
                    vehicles: currentVehicles,
                    saccoAccounts: saccoAccounts,
                    saccoTransactions: saccoTransactions,
                    saccoRemittanceSettings: remittanceSettings,
                    saccoRemittanceRecords: remittanceRecords,
                    saccoLoanSettings: loanSettings,
                    updatedAt: new Date().toISOString()
                };
                await apiService.saveTransportLogisticsHub(instId, payload);
                for (const v of currentVehicles) {
                    apiService.saveModuleRecord('vehicles', { ...v, institutionId: instId }).catch(() => {});
                }
                const syncTime = new Date();
                setLastSyncedTime(syncTime);

                const commuterCount = Object.values(payload.studentCommutePrefs).filter((p: any) => p?.preference && p.preference !== 'none').length;
                toastSuccess(`✅ Cloud Sync Complete: ${payload.busRoutes.length} route(s), ${currentVehicles.length} vehicle(s), and ${commuterCount} commuter allocation(s) updated.`);
            } else if (hasCloudData) {
                // CLOUD-FIRST LOAD: Browser 2 (or reload) loads the rich cloud dataset without overwriting
                if (cloudRoutes.length > 0) {
                    setBusRoutes(cloudRoutes);
                    safeSetLocalItem(routeKey, cloudRoutes);
                }
                if (Object.keys(cloudPrefs).length > 0) {
                    setStudentCommutePrefs(cloudPrefs);
                    safeSetLocalItem(prefKey, filterActiveCommutePrefs(cloudPrefs));
                }
                if (cloudFees.length > 0) {
                    setRouteFeeSetting(cloudFees);
                    safeSetLocalItem(feeKey, cloudFees);
                }
                if (cloudPct) {
                    setDefaultOneWayPercentage(cloudPct);
                    safeSetLocalItem(pctKey, String(cloudPct));
                }
                if (cloudTrips.length > 0) {
                    setSchoolTrips(cloudTrips);
                    safeSetLocalItem(tripKey, cloudTrips);
                }
                if (cloudInvs.length > 0) {
                    setTransportInvoices(cloudInvs);
                    safeSetLocalItem(invKey, cloudInvs);
                }
                if (cloudAlerts.length > 0) {
                    setTransportAlerts(cloudAlerts);
                }
                if (cloudVehicles.length > 0) {
                    setDbVehicles(cloudVehicles);
                    safeSetLocalItem(vehiclesKey, cloudVehicles);
                }
                if (cloudData?.saccoRemittanceSettings && Array.isArray(cloudData.saccoRemittanceSettings.tiers) && cloudData.saccoRemittanceSettings.tiers.length > 0) {
                    setRemittanceSettings(cloudData.saccoRemittanceSettings);
                    safeSetLocalItem(`eduai_sacco_remittance_settings_${instId}`, cloudData.saccoRemittanceSettings);
                }
                if (Array.isArray(cloudData?.saccoRemittanceRecords)) {
                    setRemittanceRecords(cloudData.saccoRemittanceRecords);
                    safeSetLocalItem(`eduai_sacco_remittance_records_${instId}`, cloudData.saccoRemittanceRecords);
                }
                if (cloudData?.saccoLoanSettings && typeof cloudData.saccoLoanSettings.loanMultiplier === 'number') {
                    setLoanSettings(cloudData.saccoLoanSettings);
                    safeSetLocalItem(`eduai_sacco_loan_settings_${instId}`, cloudData.saccoLoanSettings);
                }
                if (Array.isArray(cloudData?.saccoAccounts) && cloudData.saccoAccounts.length > 0) {
                    setSaccoAccounts(cloudData.saccoAccounts);
                    safeSetLocalItem(`eduai_transport_sacco_savings_${instId}`, cloudData.saccoAccounts);
                }
                if (Array.isArray(cloudData?.saccoTransactions)) {
                    setSaccoTransactions(cloudData.saccoTransactions);
                    safeSetLocalItem(`eduai_transport_sacco_tx_${instId}`, cloudData.saccoTransactions);
                }
                if (cloudStudentVehicles && typeof cloudStudentVehicles === 'object' && Object.keys(cloudStudentVehicles).length > 0) {
                    try {
                        const existing = JSON.parse(localStorage.getItem(studentVehiclesKey) || '{}');
                        safeSetLocalItem(studentVehiclesKey, { ...existing, ...cloudStudentVehicles });
                    } catch (_) {}

                    // Ensure vehicle badges render immediately on student cards on device 2
                    setLocalUsers(prev => prev.map(u => {
                        const assignedVh = cloudStudentVehicles[u.id];
                        if (assignedVh !== undefined) {
                            return {
                                ...u,
                                vehicleId: assignedVh,
                                metadata: {
                                    ...(u.metadata || {}),
                                    vehicleId: assignedVh,
                                    assignedVehicleId: assignedVh
                                }
                            };
                        }
                        return u;
                    }));
                }
                setLastSyncedTime(new Date());
            } else if (localRoutes.length > 0 || Object.keys(localPrefs).length > 0 || currentVehicles.length > 0) {
                // Cloud is empty and local has custom data, push initial local data
                const payload = {
                    busRoutes: localRoutes,
                    studentCommutePrefs: localPrefs,
                    routeFeeSetting: localFees,
                    defaultOneWayPercentage,
                    schoolTrips: localTrips,
                    transportInvoices: localInvs,
                    transportAlerts,
                    studentVehicles: localStudentVehicles,
                    vehicles: currentVehicles,
                    updatedAt: new Date().toISOString()
                };
                await apiService.saveTransportLogisticsHub(instId, payload);
                setLastSyncedTime(new Date());
            }
        } catch (e: any) {
            console.error('Error synchronizing transport logistics with cloud:', e);
            if (forcePush) {
                toastError(`Cloud sync failed: ${e?.message || 'Unable to update cloud database.'}`);
            }
        } finally {
            setIsCloudSyncing(false);
        }
    };

    // Synchronize all states whenever institution switches to guarantee 100% tenant isolation
    React.useEffect(() => {
        if (!currentInstitution?.id) return;
        
        // 1. Bus Routes
        const routeKey = `eduai_transport_bus_routes_${currentInstitution.id}`;
        const savedRoutes = localStorage.getItem(routeKey);
        if (savedRoutes !== null) {
            try { 
                const parsed = JSON.parse(savedRoutes);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setBusRoutes(parsed);
                }
            } catch (e) { setBusRoutes([]); }
        }

        // 2. Route Fees
        const feeKey = `eduai_transport_route_fee_settings_${currentInstitution.id}`;
        const savedFees = localStorage.getItem(feeKey);
        if (savedFees !== null) {
            try { 
                const parsed = JSON.parse(savedFees);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setRouteFeeSetting(parsed);
                }
            } catch (e) { setRouteFeeSetting([]); }
        }

        // 3. Invoices
        const invKey = `eduai_transport_fee_invoices_${currentInstitution.id}`;
        const savedInvs = localStorage.getItem(invKey);
        if (savedInvs !== null) {
            try { setTransportInvoices(JSON.parse(savedInvs)); } catch (e) { setTransportInvoices([]); }
        } else {
            setTransportInvoices([]);
        }

        // 4. Commute Preferences
        const prefKey = `eduai_student_commute_prefs_${currentInstitution.id}`;
        const savedPrefs = localStorage.getItem(prefKey);
        if (savedPrefs !== null) {
            try { setStudentCommutePrefs(JSON.parse(savedPrefs)); } catch (e) { setStudentCommutePrefs({}); }
        } else {
            setStudentCommutePrefs({});
        }

        // 5. One Way %
        const pctKey = `eduai_transport_oneway_pct_${currentInstitution.id}`;
        const savedPct = localStorage.getItem(pctKey);
        if (savedPct !== null) {
            setDefaultOneWayPercentage(Number(savedPct) || 60);
        } else {
            setDefaultOneWayPercentage(60);
        }

        // 6. School Trips
        const tripKey = `eduai_school_trips_${currentInstitution.id}`;
        const savedTrips = localStorage.getItem(tripKey);
        if (savedTrips !== null) {
            try { setSchoolTrips(JSON.parse(savedTrips)); } catch (e) { setSchoolTrips([]); }
        } else {
            setSchoolTrips([]);
        }

        // 7. Perform cloud database synchronization
        syncWithCloud();
    }, [currentInstitution?.id]);

    const PREF_MULTIPLIER: Record<string, number> = { round_trip: 1.0, one_way_pickup: 0.6, one_way_drop: 0.6, none: 0 };

    const handleUpdateRouteFee = (routeId: string, termFee: number, monthlyFee: number, routeName?: string, oneWayPercentage?: number) => {
        let updatedRoutes = busRoutes;
        const updatedFees = routeFeeSetting.map(r => r.routeId === routeId ? {
            ...r,
            termFee,
            monthlyFee,
            ...(routeName ? { routeName } : {}),
            ...(oneWayPercentage !== undefined ? { oneWayPercentage } : {})
        } : r);
        setRouteFeeSetting(updatedFees);
        if (routeName) {
            updatedRoutes = busRoutes.map(br => br.id === routeId ? { ...br, name: routeName } : br);
            setBusRoutes(updatedRoutes);
        }
        persistHubToCloud({ routeFeeSetting: updatedFees, busRoutes: updatedRoutes });
    };

    const handleGenerateInvoices = async (cycle: BillingCycle, period: string, notifySms: boolean = true) => {
        const demoStudents = [
            { id: 'st_1', name: 'Kelvin Kiprop',  admissionNumber: 'ADM/8821/24', parentPhone: '0712345678' },
            { id: 'st_2', name: 'Alisha Wanjiku', admissionNumber: 'ADM/9012/24', parentPhone: '0723456789' },
            { id: 'st_3', name: 'Liam Otieno',    admissionNumber: 'ADM/8774/24', parentPhone: '0734567890' },
            { id: 'st_4', name: 'Chloe Kamau',    admissionNumber: 'ADM/9331/25', parentPhone: '0745678901' },
            { id: 'st_5', name: 'Ethan Ndwiga',   admissionNumber: 'ADM/8109/23', parentPhone: '0756789012' },
        ];
        const sourceStudents = students.length > 0
            ? students.map(s => {
                const userObj = users.find(u => u.id === s.id || u.email === (s as any).email);
                const phone = (s as any).parentPhone || (s as any).guardianPhoneNumber || (s as any).phoneNumber || (userObj as any)?.guardianPhoneNumber || (userObj as any)?.guardianPhone || (userObj as any)?.parentPhone || (userObj as any)?.phoneNumber;
                return {
                    id: s.id,
                    name: s.name,
                    admissionNumber: (s as any).admissionNumber || `ADM/${Math.floor(Math.random()*9000+1000)}/24`,
                    parentPhone: phone || '0700000000'
                };
            })
            : demoStudents;

        const newInvoices: TransportFeeInvoice[] = [];
        const due = new Date(); due.setDate(due.getDate() + 14);

        for (let idx = 0; idx < sourceStudents.length; idx++) {
            const student = sourceStudents[idx];
            const pref = studentCommutePrefs[student.id];
            if (!pref || pref.preference === 'none') continue;
            const route = routeFeeSetting.find(r => r.routeId === (pref?.routeId || ['route_1','route_2','route_3'][idx % 3]));
            if (!route) continue;
            const oneWayPct = (route.oneWayPercentage ?? defaultOneWayPercentage ?? 60) / 100;
            const multiplier = pref.preference === 'round_trip' ? 1.0 : oneWayPct;
            const base = cycle === 'term' ? route.termFee : route.monthlyFee;
            const finalAmt = Math.round(base * multiplier);
            if (finalAmt === 0) continue;
            // avoid duplicates for the same period
            if (transportInvoices.some(i => i.studentId === student.id && i.period === period)) continue;

            const inv: TransportFeeInvoice = {
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
                parentPhone: student.parentPhone,
            };

            newInvoices.push(inv);

            // Optional SMS invoice notification dispatch
            if (notifySms && student.parentPhone && student.parentPhone !== '0700000000') {
                const msg = `Dear Parent, Transport invoice of KES ${finalAmt.toLocaleString()} for ${student.name} (${student.admissionNumber}) on route ${route.routeName} (${period}) has been generated. Due date: ${due.toLocaleDateString()}. Thank you, ${currentInstitution?.name || 'School Transport Desk'}.`;
                apiService.sendSms(student.parentPhone, msg, (currentInstitution as any)?.smsConfig, 1, currentInstitution?.id).catch(e => console.warn('SMS invoice dispatch error:', e));
            }
        }

        const nextInvs = [...transportInvoices, ...newInvoices];
        setTransportInvoices(nextInvs);
        persistHubToCloud({ transportInvoices: nextInvs });
    };

    const handleMarkPaid = (invoiceId: string, method: string, transactionCode?: string) => {
        const nextInvs = transportInvoices.map(i => i.id === invoiceId
            ? {
                ...i,
                status: 'paid' as const,
                paidDate: new Date().toISOString(),
                paymentMethod: method,
                transactionCode: transactionCode || i.transactionCode,
                receiptNumber: `TR-REC-${invoiceId.slice(-6).toUpperCase()}`
            }
            : i
        );
        setTransportInvoices(nextInvs);
        persistHubToCloud({ transportInvoices: nextInvs });
    };

    const handleWaiveFee = (invoiceId: string, _reason: string) => {
        const nextInvs = transportInvoices.map(i => i.id === invoiceId ? { ...i, status: 'waived' as const } : i);
        setTransportInvoices(nextInvs);
        persistHubToCloud({ transportInvoices: nextInvs });
    };

    const handleSaveOpeningBalance = (invoice: TransportFeeInvoice) => {
        const exists = transportInvoices.some(i => i.id === invoice.id || (
            i.studentId === invoice.studentId &&
            (i.isOpeningBalance || (i.period && (i.period.toLowerCase().includes('opening') || i.period.toLowerCase().includes('b/f'))))
        ));

        let nextInvs: TransportFeeInvoice[];
        if (exists) {
            nextInvs = transportInvoices.map(i => {
                if (i.id === invoice.id || (
                    i.studentId === invoice.studentId &&
                    (i.isOpeningBalance || (i.period && (i.period.toLowerCase().includes('opening') || i.period.toLowerCase().includes('b/f'))))
                )) {
                    return invoice;
                }
                return i;
            });
        } else {
            nextInvs = [invoice, ...transportInvoices];
        }

        setTransportInvoices(nextInvs);
        const invKey = currentInstitution?.id ? `eduai_transport_fee_invoices_${currentInstitution.id}` : null;
        if (invKey) safeSetLocalItem(invKey, nextInvs);
        persistHubToCloud({ transportInvoices: nextInvs });
        toastSuccess(`Opening balance for ${invoice.studentName} updated successfully.`);
    };

    const handleImportOpeningBalances = (importedInvoices: TransportFeeInvoice[]) => {
        if (!importedInvoices || importedInvoices.length === 0) return;

        const importedMap = new Map<string, TransportFeeInvoice>();
        importedInvoices.forEach(inv => {
            importedMap.set(inv.studentId, inv);
        });

        const updatedExisting = transportInvoices.map(i => {
            const isOpening = i.isOpeningBalance || (i.period && (i.period.toLowerCase().includes('opening') || i.period.toLowerCase().includes('b/f')));
            if (isOpening && importedMap.has(i.studentId)) {
                const replacement = importedMap.get(i.studentId)!;
                importedMap.delete(i.studentId);
                return replacement;
            }
            return i;
        });

        const newRecords = Array.from(importedMap.values());
        const nextInvs = [...newRecords, ...updatedExisting];

        setTransportInvoices(nextInvs);
        const invKey = currentInstitution?.id ? `eduai_transport_fee_invoices_${currentInstitution.id}` : null;
        if (invKey) safeSetLocalItem(invKey, nextInvs);
        persistHubToCloud({ transportInvoices: nextInvs });
        toastSuccess(`Successfully imported ${importedInvoices.length} commuter opening balance(s).`);
    };

    const handleDeleteOpeningBalance = (invoiceId: string) => {
        const nextInvs = transportInvoices.filter(i => i.id !== invoiceId);
        setTransportInvoices(nextInvs);
        const invKey = currentInstitution?.id ? `eduai_transport_fee_invoices_${currentInstitution.id}` : null;
        if (invKey) safeSetLocalItem(invKey, nextInvs);
        persistHubToCloud({ transportInvoices: nextInvs });
        toastSuccess('Opening balance record removed.');
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

    // Remove redundant old busRoutes definition (already hoisted above)

    // Route Registration & Editing Modal States
    const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);
    const [isOpeningBalancesModalOpen, setIsOpeningBalancesModalOpen] = useState(false);
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

    const getStudentResolvedStream = (u: any, enr?: any): string => {
        if (!u && !enr) return '';
        const stream = (
            enr?.metadata?.stream ||
            enr?.metadata?.streamName ||
            enr?.metadata?.stream_name ||
            enr?.metadata?.section ||
            enr?.metadata?.arm ||
            (enr as any)?.stream ||
            u?.stream ||
            u?.stream_name ||
            u?.metadata?.stream ||
            u?.metadata?.streamName ||
            u?.metadata?.stream_name ||
            u?.metadata?.stream_title ||
            u?.metadata?.section ||
            u?.metadata?.arm ||
            ''
        );
        return String(stream).trim();
    };

    const getStudentBaseClass = (u: any, enr?: any, matchedCourse?: Course): string => {
        if (matchedCourse?.name) return matchedCourse.name.trim();
        const rawClass = (
            enr?.metadata?.gradeLevel ||
            enr?.metadata?.className ||
            enr?.metadata?.class ||
            u?.studentClass ||
            u?.supervisedClass ||
            u?.metadata?.studentClass ||
            u?.metadata?.className ||
            u?.metadata?.gradeLevel ||
            u?.metadata?.class_level ||
            u?.metadata?.grade_level ||
            u?.metadata?.grade ||
            u?.metadata?.class ||
            u?.metadata?.class_name ||
            u?.metadata?.courseLevel ||
            u?.metadata?.academicLevel ||
            u?.metadata?.form ||
            u?.metadata?.level ||
            u?.className ||
            u?.gradeLevel ||
            u?.grade ||
            u?.class ||
            ''
        );
        const stream = getStudentResolvedStream(u, enr);
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

        const routeKey = currentInstitution?.id ? `eduai_transport_bus_routes_${currentInstitution.id}` : null;
        const feeKey = currentInstitution?.id ? `eduai_transport_route_fee_settings_${currentInstitution.id}` : null;
        if (routeKey) safeSetLocalItem(routeKey, nextRoutes);
        if (feeKey) safeSetLocalItem(feeKey, nextFees);

        // Clean up student preferences assigned to this route
        let updatedPrefs = studentCommutePrefs;
        setStudentCommutePrefs(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(stId => {
                if (next[stId]?.routeId === routeId) {
                    delete next[stId];
                }
            });
            updatedPrefs = next;
            const prefKey = currentInstitution?.id ? `eduai_student_commute_prefs_${currentInstitution.id}` : null;
            if (prefKey) safeSetLocalItem(prefKey, filterActiveCommutePrefs(next));
            return next;
        });

        persistHubToCloud({ busRoutes: nextRoutes, routeFeeSetting: nextFees, studentCommutePrefs: updatedPrefs });
    };

    // Filter users strictly to current institution to prevent cross-institution data bleed
    const institutionUsers = useMemo(() => {
        if (!currentInstitution?.id) return users;
        return users.filter(u => {
            const uInst = u.institutionId || (u as any).institution_id || (u as any).schoolId;
            return uInst === currentInstitution.id;
        });
    }, [users, currentInstitution?.id]);

    // Safe helper to check roles whether u.roles is an array, a string, or undefined
    const hasAnyRole = (u: any, targetRoles: string[]): boolean => {
        if (!u) return false;
        const roleStr = String(u.role || '').toLowerCase();
        if (targetRoles.some(tr => tr === roleStr)) return true;

        if (Array.isArray(u.roles)) {
            if (u.roles.some((r: any) => targetRoles.includes(String(r).toLowerCase()))) return true;
        } else if (typeof u.roles === 'string' && u.roles.trim()) {
            const raw = u.roles.toLowerCase();
            if (targetRoles.some(tr => raw.includes(tr))) return true;
        }

        const staffRoleStr = String(u.staffRole || u.metadata?.staffRole || '').toLowerCase();
        if (staffRoleStr && targetRoles.some(tr => staffRoleStr.includes(tr))) return true;

        const jobTitleStr = String(u.jobTitle || u.metadata?.jobTitle || '').toLowerCase();
        if (jobTitleStr && targetRoles.some(tr => jobTitleStr.includes(tr))) return true;

        return false;
    };

    const students = useMemo(() => institutionUsers.filter(u => u.role === 'student'), [institutionUsers]);
    const drivers = useMemo(() => {
        return institutionUsers.filter(u => {
            const roleStr = String(u.role || '').toLowerCase();
            return roleStr === 'driver' || 
                   roleStr === 'county_driver' || 
                   hasAnyRole(u, ['driver', 'county_driver']);
        });
    }, [institutionUsers]);
    const assistants = useMemo(() => institutionUsers.filter(u => {
        const roleStr = String(u.role || '').toLowerCase();
        return roleStr === 'transport_assistant' || 
               roleStr === 'staff' || 
               hasAnyRole(u, ['transport_assistant', 'assistant']);
    }), [institutionUsers]);

    // Strictly scope courses and enrollments to current institution
    const institutionCourses = useMemo(() => {
        if (!currentInstitution?.id) return loadedCourses;
        return loadedCourses.filter(c => {
            const instId = c.institutionId || (c as any).institution_id || (c as any).schoolId;
            return !instId || instId === currentInstitution.id;
        });
    }, [loadedCourses, currentInstitution?.id]);

    const institutionEnrollments = useMemo(() => {
        if (!currentInstitution?.id) return enrollments;
        return enrollments.filter(e => {
            const instId = e.institutionId || (e as any).institution_id || (e as any).schoolId;
            return !instId || instId === currentInstitution.id;
        });
    }, [enrollments, currentInstitution?.id]);

    // Helper to format class name cleanly in Title Case / clean capitalization matching school standards
    const normalizeClassName = (raw: string, registeredCourses: Course[]): string => {
        const trimmed = raw.trim();
        if (!trimmed || trimmed.toLowerCase() === 'unassigned') return '';
        // If there is an exact case-insensitive match in registered courses, use official course name!
        const matchedCourse = registeredCourses.find(c => c.name && c.name.trim().toLowerCase() === trimmed.toLowerCase());
        if (matchedCourse?.name) {
            return matchedCourse.name.trim();
        }
        // Normalize "FORM 3" -> "Form 3", "GRADE 4" -> "Grade 4"
        return trimmed.replace(/\b([a-z])([a-z]+)?\b/gi, (match, p1, p2) => {
            if (/^(pp|cbc|ecd|dpt|kg)\d*$/i.test(match)) return match.toUpperCase();
            return p1.toUpperCase() + (p2 ? p2.toLowerCase() : '');
        });
    };

    // Automatically map existing students to initial routes ONLY on first-ever load if nothing has been saved yet
    React.useEffect(() => {
        if (!isEduTransport || !currentInstitution?.id) return;
        const key = `eduai_student_commute_prefs_${currentInstitution.id}`;
        const saved = localStorage.getItem(key);
        if (saved !== null) {
            return;
        }
        if (busRoutes.length === 0 || students.length === 0) return;
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

    const resolvedCommuterStudents = useMemo(() => {
        const list: Array<{
            id: string;
            name: string;
            admissionNumber?: string;
            studentClass?: string;
            parentPhone?: string;
            assignedRouteId?: string;
        }> = (students || []).map(s => {
            const userObj = users.find(u => u.id === s.id || u.email === (s as any).email);
            const phone = (s as any).parentPhone || (s as any).guardianPhoneNumber || (s as any).phoneNumber || (userObj as any)?.guardianPhoneNumber || (userObj as any)?.guardianPhone || (userObj as any)?.parentPhone || (userObj as any)?.phoneNumber || '';
            const adm = getStudentResolvedAdm(s) || (s as any).admissionNumber || '';
            const enr = institutionEnrollments.find(e => e.studentId === s.id);
            const cls = getStudentBaseClass(s, enr);
            const routePref = studentCommutePrefs[s.id]?.routeId;

            return {
                id: s.id,
                name: s.name,
                admissionNumber: adm,
                studentClass: cls,
                parentPhone: phone,
                assignedRouteId: routePref && routePref !== 'none' ? routePref : ''
            };
        });

        const seen = new Set(list.map(s => s.id));
        transportInvoices.forEach(inv => {
            if (inv.studentId && !seen.has(inv.studentId)) {
                seen.add(inv.studentId);
                list.push({
                    id: inv.studentId,
                    name: inv.studentName,
                    admissionNumber: inv.admissionNumber || '',
                    studentClass: '',
                    parentPhone: inv.parentPhone || '',
                    assignedRouteId: inv.routeId || ''
                });
            }
        });

        return list;
    }, [students, users, institutionEnrollments, studentCommutePrefs, transportInvoices]);

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

    // Drivers selectable from support staff with driver role/designation, plus vehicle drivers
    const availableDrivers = useMemo(() => {
        const list: { id: string; name: string; detail?: string }[] = [];
        const seenNames = new Set<string>();

        // 1. Support staff list with the role driver
        drivers.forEach(u => {
            if (u.name && !seenNames.has(u.name.trim().toLowerCase())) {
                seenNames.add(u.name.trim().toLowerCase());
                const staffRoleStr = String((u as any).staffRole || (u as any).metadata?.staffRole || '').toLowerCase();
                const roleLabel = staffRoleStr.includes('driver') ? 'Support Staff (Driver)' : 'Driver';
                const detail = u.phoneNumber ? `${u.phoneNumber} • ${roleLabel}` : roleLabel;
                list.push({ id: u.id, name: u.name.trim(), detail });
            }
        });

        // 2. Also drivers linked to registered vehicles
        availableVehicleOptions.forEach(v => {
            if (v.driver && v.driver.trim() && !seenNames.has(v.driver.trim().toLowerCase()) && v.driver.trim().toUpperCase() !== 'TBD') {
                seenNames.add(v.driver.trim().toLowerCase());
                list.push({ id: `veh_drv_${v.id}`, name: v.driver.trim(), detail: `Vehicle: ${v.label}` });
            }
        });

        // 3. Fallback demo drivers for demo institutions
        if (list.length === 0 && currentInstitution?.id?.startsWith('demo_')) {
            list.push(
                { id: 'drv_demo_1', name: 'Douglas Omwamba', detail: '0712345678 • Driver' },
                { id: 'drv_demo_2', name: 'James Kamau', detail: '0722345678 • Driver' }
            );
        }

        return list;
    }, [drivers, availableVehicleOptions, currentInstitution?.id]);

    // Attendants: teachers & academic staff
    const teacherAttendants = useMemo(() => {
        const teacherRoles = ['teacher', 'head_teacher', 'deputy', 'dos', 'hod', 'lecturer', 'academics_officer', 'class_supervisor', 'instructor'];
        const list: { id: string; name: string; detail?: string }[] = [];
        const seenNames = new Set<string>();

        institutionUsers.forEach(u => {
            const isTeacher = hasAnyRole(u, teacherRoles);

            if (isTeacher && u.name && !seenNames.has(u.name.trim().toLowerCase())) {
                seenNames.add(u.name.trim().toLowerCase());
                const roleStr = String(u.role || '').toLowerCase();
                const cleanRole = roleStr === 'teacher' ? 'Teacher' : (roleStr.replace(/_/g, ' ') || 'Teacher');
                const detail = u.phoneNumber ? `${u.phoneNumber} • ${cleanRole}` : cleanRole;
                list.push({ id: u.id, name: u.name.trim(), detail });
            }
        });

        if (list.length === 0 && currentInstitution?.id?.startsWith('demo_')) {
            list.push(
                { id: 'tch_demo_1', name: 'Madam Beatrice Chebet', detail: 'Teacher' },
                { id: 'tch_demo_2', name: 'Mr. David Kiprop', detail: 'Teacher' }
            );
        }

        return list;
    }, [institutionUsers, currentInstitution?.id]);

    // Attendants: support staff & assistants
    const supportAttendants = useMemo(() => {
        const nonStaffRoles = ['student', 'parent', 'guardian', 'alumni', 'alumna', 'voter'];
        const teacherRoles = ['teacher', 'head_teacher', 'deputy', 'dos', 'hod', 'lecturer', 'academics_officer', 'class_supervisor', 'instructor'];
        const list: { id: string; name: string; detail?: string }[] = [];
        const seenNames = new Set<string>();

        institutionUsers.forEach(u => {
            const roleStr = String(u.role || '').toLowerCase();
            if (nonStaffRoles.includes(roleStr)) return;
            if (hasAnyRole(u, teacherRoles)) return;

            if (u.name && !seenNames.has(u.name.trim().toLowerCase())) {
                seenNames.add(u.name.trim().toLowerCase());
                const staffLabel = (u as any).staffRole || ((u.role as string) === 'staff' ? 'Support Staff' : String(u.role || 'Staff').replace(/_/g, ' '));
                const detail = u.phoneNumber ? `${u.phoneNumber} • ${staffLabel}` : staffLabel;
                list.push({ id: u.id, name: u.name.trim(), detail });
            }
        });

        if (list.length === 0 && currentInstitution?.id?.startsWith('demo_')) {
            list.push(
                { id: 'att_demo_1', name: 'Sarah Wanjiku', detail: 'Support Staff' },
                { id: 'att_demo_2', name: 'Mary Atieno', detail: 'Transport Assistant' }
            );
        }

        return list;
    }, [institutionUsers, currentInstitution?.id]);

    const displayStudents = useMemo(() => {
        const rawStudents = students.length > 0 ? students : (currentInstitution?.id?.startsWith('demo_') ? [
            { id: 'st_1', name: 'Kelvin Kiprop', role: 'student', studentClass: 'Grade 4', stream: 'North', metadata: { admissionNumber: 'ADM/8821/24', studentClass: 'Grade 4', stream: 'North' } },
            { id: 'st_2', name: 'Alisha Wanjiku', role: 'student', studentClass: 'Grade 3', stream: 'East', metadata: { admissionNumber: 'ADM/9012/24', studentClass: 'Grade 3', stream: 'East' } },
            { id: 'st_3', name: 'Liam Otieno', role: 'student', studentClass: 'Grade 5', stream: 'West', metadata: { admissionNumber: 'ADM/8774/24', studentClass: 'Grade 5', stream: 'West' } },
            { id: 'st_4', name: 'Chloe Kamau', role: 'student', studentClass: 'Grade 2', stream: 'Blue', metadata: { admissionNumber: 'ADM/9331/25', studentClass: 'Grade 2', stream: 'Blue' } },
            { id: 'st_5', name: 'Ethan Ndwiga', role: 'student', studentClass: 'Grade 6', stream: 'Gold', metadata: { admissionNumber: 'ADM/8109/23', studentClass: 'Grade 6', stream: 'Gold' } },
        ] : []);

        return rawStudents.map(s => {
            const enr = institutionEnrollments.find(e => e.userId === s.id || e.id === s.id || (e.metadata as any)?.userId === s.id);
            const matchedCourse = institutionCourses.find(c => 
                c.id === enr?.courseId || 
                c.id === (s as any).courseId || 
                c.id === s.metadata?.courseId ||
                (c.name && enr?.metadata?.gradeLevel && c.name.trim().toLowerCase() === String(enr.metadata.gradeLevel).trim().toLowerCase())
            );
            const resolvedAdm = enr?.admissionNumber || (enr as any)?.admission_number || enr?.metadata?.admissionNumber || getStudentResolvedAdm(s, true);
            const rawBaseClass = getStudentBaseClass(s, enr, matchedCourse);
            const baseClass = normalizeClassName(rawBaseClass, institutionCourses);
            const stream = getStudentResolvedStream(s, enr);
            const resolvedClass = matchedCourse?.name || (stream ? `${baseClass} ${stream}` : baseClass);

            return {
                ...s,
                id: s.id,
                name: s.name,
                admissionNumber: resolvedAdm,
                studentClass: resolvedClass,
                baseClass: baseClass || 'Unassigned',
                stream: stream || '',
                courseId: matchedCourse?.id || enr?.courseId || (s as any).courseId || ''
            };
        });
    }, [students, institutionEnrollments, institutionCourses, currentInstitution?.id]);

    // Dynamic list of unique classes for filtering strictly within current institution
    const availableClasses = useMemo(() => {
        const map = new Map<string, string>(); // lowerCaseKey -> displayValue

        // 1. Registered school courses are the primary authority
        institutionCourses.forEach(c => {
            if (c.name && c.name.trim()) {
                const norm = c.name.trim();
                map.set(norm.toLowerCase(), norm);
            }
        });

        // 2. Add from student enrollments only if valid and not already mapped
        institutionEnrollments.forEach(e => {
            const g = e.metadata?.gradeLevel || e.metadata?.className;
            if (g && String(g).trim()) {
                const norm = normalizeClassName(String(g), institutionCourses);
                if (norm && !map.has(norm.toLowerCase())) {
                    map.set(norm.toLowerCase(), norm);
                }
            }
        });

        // 3. Add from students in this institution
        displayStudents.forEach(s => {
            if (s.baseClass && s.baseClass !== 'Unassigned') {
                const norm = normalizeClassName(s.baseClass, institutionCourses);
                if (norm && !map.has(norm.toLowerCase())) {
                    map.set(norm.toLowerCase(), norm);
                }
            }
        });

        return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [institutionCourses, institutionEnrollments, displayStudents]);

    // Dynamic list of unique streams for filtering strictly within current institution
    const availableStreams = useMemo(() => {
        const map = new Map<string, string>(); // lowerCaseKey -> displayValue

        institutionCourses.forEach(c => {
            if (Array.isArray(c.streams)) {
                c.streams.forEach(s => {
                    if (s && String(s).trim()) {
                        const trimmed = String(s).trim();
                        map.set(trimmed.toLowerCase(), trimmed);
                    }
                });
            }
            if (Array.isArray((c as any).metadata?.streams)) {
                (c as any).metadata.streams.forEach((s: any) => {
                    if (s && String(s).trim()) {
                        const trimmed = String(s).trim();
                        map.set(trimmed.toLowerCase(), trimmed);
                    }
                });
            }
        });

        institutionEnrollments.forEach(e => {
            const st = e.metadata?.stream || e.metadata?.streamName || (e as any).stream;
            if (st && String(st).trim()) {
                const trimmed = String(st).trim();
                map.set(trimmed.toLowerCase(), trimmed);
            }
        });

        displayStudents.forEach(s => {
            if (s.stream && String(s.stream).trim()) {
                const trimmed = String(s.stream).trim();
                map.set(trimmed.toLowerCase(), trimmed);
            }
        });

        return Array.from(map.values()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }, [institutionCourses, institutionEnrollments, displayStudents]);

    const filteredStudents = useMemo(() => {
        return displayStudents.filter(s => {
            const searchLower = searchTerm.toLowerCase().trim();
            const matchesSearch = !searchLower || 
                (s.name || '').toLowerCase().includes(searchLower) || 
                (s.admissionNumber || '').toLowerCase().includes(searchLower) ||
                (s.studentClass || '').toLowerCase().includes(searchLower) ||
                (s.stream || '').toLowerCase().includes(searchLower);

            const matchesClass = 
                selectedClassFilter === 'ALL' || 
                (s.baseClass || '').toLowerCase() === selectedClassFilter.toLowerCase() ||
                (s.studentClass || '').toLowerCase().includes(selectedClassFilter.toLowerCase()) ||
                (s as any).courseId === selectedClassFilter;

            const matchesStream = 
                selectedStreamFilter === 'ALL' || 
                (s.stream || '').toLowerCase() === selectedStreamFilter.toLowerCase();

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

    const activeCommutersCount = useMemo(() => {
        return Object.values(studentCommutePrefs).filter(p => p.preference && p.preference !== 'none').length;
    }, [studentCommutePrefs]);

    const stats = isSACCO ? [
        { label: 'SACCO Members', value: '42', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Fleet Strength', value: dbVehicles.length.toString(), icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Trip Commission', value: 'KES 84k', icon: Receipt, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Pending Licenses', value: '8', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
    ] : isShuttle ? [
        { label: 'Total Passengers', value: users.length.toString(), icon: User, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Active Shuttles', value: dbVehicles.length > 0 ? dbVehicles.length.toString() : '8', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Seat Occupancy', value: '74%', icon: Armchair, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Departures (Today)', value: '14', icon: DoorOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
    ] : isEduTransport ? [
        { label: 'Registered Bus Routes', value: busRoutes.length.toString(), icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Commuting Students', value: activeCommutersCount.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'GPS Signal Feed', value: busRoutes.length > 0 ? 'Active' : 'Standby', icon: MapPin, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'School Trips Today', value: schoolTrips.length.toString(), icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    ] : [
        { label: 'Active Shipments', value: '24', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Idle Fleet', value: dbVehicles.length.toString(), icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Fuel Efficiency', value: '88%', icon: Fuel, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Delayed', value: '2', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    ];

    const renderStudentCommute = () => {
        const schoolRuns = busRoutes.map((r, idx) => {
            const enrolledCount = Object.values(studentCommutePrefs).filter(p => p.routeId === r.id && p.preference !== 'none').length;
            const matchedVeh = availableVehicleOptions.find(v => v.label === r.bus || v.plate === r.bus);
            const cap = matchedVeh?.capacity || '30';
            return {
                id: `run_${r.id}`,
                routeName: r.name,
                runType: idx % 2 === 0 ? 'Morning Pick-up' : 'Afternoon Drop-off',
                driver: r.driver || (matchedVeh?.driver || 'Unassigned Driver'),
                vehicle: r.bus || (availableVehicleOptions[0]?.label || 'Unassigned Vehicle'),
                attendant: r.attendant || 'Assigned Staff',
                status: idx === 0 ? 'boarding' : idx === 1 ? 'in_transit' : 'completed',
                students: `${enrolledCount}/${cap}`,
                startTime: idx % 2 === 0 ? '06:15 AM' : '03:30 PM'
            };
        });

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

            if (currentInstitution?.id) {
                const routeKey = `eduai_transport_bus_routes_${currentInstitution.id}`;
                const feeKey = `eduai_transport_route_fee_settings_${currentInstitution.id}`;
                safeSetLocalItem(routeKey, nextRoutes);
                safeSetLocalItem(feeKey, nextFees);
            }

            persistHubToCloud({ busRoutes: nextRoutes, routeFeeSetting: nextFees });

            setIsAddRouteModalOpen(false);
            setEditingRoute(null);
            setNewRouteName('');
            setNewRouteStart('');
            setNewRouteEnd('');
            setNewRouteDriver('');
            setNewRouteAttendant('');
        };

        return (
            <div className="animate-fade-in-up flex flex-col lg:flex-row gap-8 items-start">
                {/* Vertical Navigation Menu */}
                <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-4 lg:sticky lg:top-6">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Student Commute</span>
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Navigation</h4>
                        </div>

                        {/* Button 1: Live Monitor */}
                        <button
                            type="button"
                            onClick={() => setCommuteSubTab('monitor')}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group cursor-pointer ${
                                commuteSubTab === 'monitor'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                            }`}
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    commuteSubTab === 'monitor'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform'
                                }`}>
                                    <Radio className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-xs uppercase tracking-wider truncate">Live Monitor</p>
                                    <p className={`text-[10px] truncate ${commuteSubTab === 'monitor' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        Telemetry & Tracking
                                    </p>
                                </div>
                            </div>
                            <span className={`flex h-2.5 w-2.5 relative shrink-0 ${commuteSubTab === 'monitor' ? '' : 'opacity-80'}`}>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        </button>

                        {/* Button 2: Register Routes */}
                        <button
                            type="button"
                            onClick={() => setCommuteSubTab('routes')}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group cursor-pointer ${
                                commuteSubTab === 'routes'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                            }`}
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    commuteSubTab === 'routes'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform'
                                }`}>
                                    <Navigation className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-xs uppercase tracking-wider truncate">Register Routes</p>
                                    <p className={`text-[10px] truncate ${commuteSubTab === 'routes' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        Corridors & Vehicles
                                    </p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                commuteSubTab === 'routes'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                            }`}>
                                {busRoutes.length}
                            </span>
                        </button>

                        {/* Button 3: Student Assignment */}
                        <button
                            type="button"
                            onClick={() => setCommuteSubTab('students')}
                            className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group cursor-pointer ${
                                commuteSubTab === 'students'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750'
                            }`}
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    commuteSubTab === 'students'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform'
                                }`}>
                                    <Users className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-black text-xs uppercase tracking-wider truncate">Student Assignment</p>
                                    <p className={`text-[10px] truncate ${commuteSubTab === 'students' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        Preferences & Roster
                                    </p>
                                </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                                commuteSubTab === 'students'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                            }`}>
                                {displayStudents.length}
                            </span>
                        </button>
                    </div>

                    {/* Quick Overview Card in Sidebar */}
                    <div className="hidden lg:block bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-[2.5rem] text-white space-y-4 shadow-xl border border-white/5">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Transit Stats</span>
                            <MapPin className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Routes</p>
                                <p className="text-xl font-black text-white">{busRoutes.length}</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Commuters</p>
                                <p className="text-xl font-black text-white">{activeCommutersCount}</p>
                            </div>
                        </div>
                        <div className="p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-[10px] font-bold text-indigo-200">
                            💡 Changes to route and commute preferences save and sync automatically to the cloud.
                        </div>
                    </div>
                </div>

                {/* Right Side Content Panel */}
                <div className="flex-1 min-w-0 w-full">

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
                        {isAddRouteModalOpen && typeof document !== 'undefined' && createPortal(
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 overflow-y-auto animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl p-6 sm:p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden">
                                    <div className="flex justify-between items-start mb-4 shrink-0">
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                                                {editingRoute ? 'Edit Bus Route' : 'Register Bus Route'}
                                            </h3>
                                            <p className="text-slate-500 text-xs font-medium">
                                                {editingRoute ? 'Modify route landmarks, assigned bus vehicle, and designated personnel.' : 'Create school run routes, specify geographic bounds, and assign fleet vehicles.'}
                                            </p>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsAddRouteModalOpen(false);
                                                setEditingRoute(null);
                                            }}
                                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    <form onSubmit={handleSaveRoute} className="flex flex-col flex-1 overflow-hidden">
                                        <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Route Name *</label>
                                                <input 
                                                    type="text" 
                                                    required
                                                    value={newRouteName}
                                                    onChange={e => setNewRouteName(e.target.value)}
                                                    placeholder="e.g. Route D - Eastlands / Buruburu"
                                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Starting Landmark *</label>
                                                    <input 
                                                        type="text" 
                                                        required
                                                        value={newRouteStart}
                                                        onChange={e => setNewRouteStart(e.target.value)}
                                                        placeholder="e.g. Buruburu Shopping Center"
                                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
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
                                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Bus / Vehicle *</label>
                                                    {availableVehicleOptions.length > 0 ? (
                                                        <select 
                                                            value={newRouteBus}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setNewRouteBus(val);
                                                                const matched = availableVehicleOptions.find(o => o.label === val || o.plate === val);
                                                                if (matched?.driver && (!newRouteDriver || newRouteDriver === 'TBD')) {
                                                                    setNewRouteDriver(matched.driver);
                                                                }
                                                            }}
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
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
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver</label>
                                                    {availableDrivers.length > 0 ? (
                                                        <select 
                                                            value={newRouteDriver}
                                                            onChange={e => setNewRouteDriver(e.target.value)}
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
                                                        >
                                                            <option value="">Select driver from support staff...</option>
                                                            <option value="TBD">TBD (To Be Determined)</option>
                                                            {newRouteDriver && newRouteDriver !== 'TBD' && !availableDrivers?.some(d => String(d?.name || '').toLowerCase() === newRouteDriver.toLowerCase()) && (
                                                                <option value={newRouteDriver}>{newRouteDriver}</option>
                                                            )}
                                                            {availableDrivers?.map(d => (
                                                                <option key={d.id} value={d.name}>
                                                                    {d.name} {d.detail ? `(${d.detail})` : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            value={newRouteDriver}
                                                            onChange={e => setNewRouteDriver(e.target.value)}
                                                            placeholder="Douglas Omwamba"
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
                                                        />
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Attendant</label>
                                                    {((teacherAttendants?.length || 0) > 0 || (supportAttendants?.length || 0) > 0) ? (
                                                        <select 
                                                            value={newRouteAttendant}
                                                            onChange={e => setNewRouteAttendant(e.target.value)}
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
                                                        >
                                                            <option value="">Select attendant (Teacher or Support Staff)...</option>
                                                            <option value="TBD">TBD (To Be Determined)</option>
                                                            {newRouteAttendant && newRouteAttendant !== 'TBD' && 
                                                             !teacherAttendants?.some(t => String(t?.name || '').toLowerCase() === newRouteAttendant.toLowerCase()) && 
                                                             !supportAttendants?.some(s => String(s?.name || '').toLowerCase() === newRouteAttendant.toLowerCase()) && (
                                                                <option value={newRouteAttendant}>{newRouteAttendant}</option>
                                                            )}
                                                            {teacherAttendants.length > 0 && (
                                                                <optgroup label="Teachers & Academic Staff">
                                                                    {teacherAttendants.map(t => (
                                                                        <option key={t.id} value={t.name}>
                                                                            {t.name} {t.detail ? `(${t.detail})` : ''}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                            {supportAttendants.length > 0 && (
                                                                <optgroup label="Support Staff & Assistants">
                                                                    {supportAttendants.map(s => (
                                                                        <option key={s.id} value={s.name}>
                                                                            {s.name} {s.detail ? `(${s.detail})` : ''}
                                                                        </option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                    ) : (
                                                        <input 
                                                            type="text" 
                                                            value={newRouteAttendant}
                                                            onChange={e => setNewRouteAttendant(e.target.value)}
                                                            placeholder="Sarah Wanjiku"
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-700 shrink-0">
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setIsAddRouteModalOpen(false);
                                                    setEditingRoute(null);
                                                }}
                                                className="flex-1 py-3.5 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit"
                                                className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-colors cursor-pointer"
                                            >
                                                {editingRoute ? 'Update Route' : 'Register Route'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>,
                            document.body
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
                                                                    const nextPrefs = {
                                                                        ...studentCommutePrefs,
                                                                        [student.id]: { ...currentPref, routeId: e.target.value }
                                                                    };
                                                                    setStudentCommutePrefs(nextPrefs);
                                                                    const prefKey = currentInstitution?.id ? `eduai_student_commute_prefs_${currentInstitution.id}` : null;
                                                                    if (prefKey) safeSetLocalItem(prefKey, filterActiveCommutePrefs(nextPrefs));
                                                                    persistHubToCloud({ studentCommutePrefs: nextPrefs });
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
                                                                    const nextPrefs = {
                                                                        ...studentCommutePrefs,
                                                                        [student.id]: { ...currentPref, preference: e.target.value as any }
                                                                    };
                                                                    setStudentCommutePrefs(nextPrefs);
                                                                    const prefKey = currentInstitution?.id ? `eduai_student_commute_prefs_${currentInstitution.id}` : null;
                                                                    if (prefKey) safeSetLocalItem(prefKey, filterActiveCommutePrefs(nextPrefs));
                                                                    persistHubToCloud({ studentCommutePrefs: nextPrefs });
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
            if (currentInstitution?.id) {
                const tripKey = `eduai_school_trips_${currentInstitution.id}`;
                safeSetLocalItem(tripKey, nextTrips);
            }
            persistHubToCloud({ schoolTrips: nextTrips });

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
            if (currentInstitution?.id) {
                const tripKey = `eduai_school_trips_${currentInstitution.id}`;
                safeSetLocalItem(tripKey, nextTrips);
            }
            persistHubToCloud({ schoolTrips: nextTrips });
        };

        const handleToggleTripStatus = (tripId: string) => {
            const nextTrips = schoolTrips.map(t => {
                if (t.id !== tripId) return t;
                const nextStatus: typeof t.status = t.status === 'approved' ? 'pending' : 'approved';
                return { ...t, status: nextStatus };
            });
            setSchoolTrips(nextTrips);
            if (currentInstitution?.id) {
                const tripKey = `eduai_school_trips_${currentInstitution.id}`;
                safeSetLocalItem(tripKey, nextTrips);
            }
            persistHubToCloud({ schoolTrips: nextTrips });
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
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setActiveTab('sacco_savings')}
                                className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-indigo-100 flex items-center gap-2"
                            >
                                <PiggyBank className="w-3.5 h-3.5" />
                                SACCO Savings
                            </button>
                            <button
                                onClick={() => setIsOnboardMemberModalOpen(true)}
                                className="bg-indigo-600 text-white px-5 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Onboard Member
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50">
                                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Member / Owner</th>
                                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Vehicle (Plate)</th>
                                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">Savings Scheme</th>
                                    <th className="px-6 py-4 text-right text-[9px] font-black uppercase text-slate-400 tracking-widest">Savings Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                {saccoAccounts.slice(0, 6).map((m, i) => (
                                    <tr key={m.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700 dark:text-slate-200">{m.memberName}</div>
                                            <div className="text-[10px] text-slate-400">{m.memberNumber} • {m.memberRole}</div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-indigo-600">{m.vehiclePlate}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">
                                            <span className="text-xs font-black">{m.savingsCategory}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                            KES {m.savingsBalance.toLocaleString()}
                                        </td>
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

    const renderSACCOSavings = () => {
        const categoriesList: { category: 'ALL' | TransportSaccoSavingsCategory; label: string; desc: string; icon: any }[] = [
            { category: 'ALL', label: 'All Schemes', desc: 'Consolidated member deposits', icon: Landmark },
            { category: 'Daily Sinking Fund', label: 'Daily Sinking Fund', desc: 'Vehicle repair, tires & NTSA inspection', icon: Shield },
            { category: 'Member Savings', label: 'Member Savings', desc: 'Voluntary dividend-earning deposits', icon: PiggyBank },
            { category: 'Share Capital', label: 'Share Capital', desc: 'Statutory member equity & voting shares', icon: Coins },
            { category: 'Welfare & Emergency', label: 'Welfare & Emergency', desc: 'Crew medical, legal & benevolent fund', icon: Wallet },
            { category: 'Fleet Expansion', label: 'Fleet Expansion', desc: 'New bus & route acquisition fund', icon: TrendingUp },
            { category: 'Holiday Scheme', label: 'Holiday Scheme', desc: 'End-year festive & school fees bonus', icon: Calendar }
        ];

        return (
            <div className="animate-fade-in-up space-y-8">
                {/* SACCO Savings Header Banner */}
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-8 sm:p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-indigo-800/40">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3 backdrop-blur-md">
                                <PiggyBank className="w-3.5 h-3.5 text-indigo-400" />
                                Cooperative Thrift & Credit Architecture
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                                SACCO Savings & <span className="text-indigo-400">Asset Finance</span>
                            </h2>
                            <p className="text-slate-300 text-sm max-w-2xl mt-2 font-medium">
                                Manage Kenyan transport cooperative thrift schemes: daily vehicle sinking funds, dividend-yielding member savings, statutory share capital, crew emergency reserves, and 3x loan guarantee collateral.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <button
                                onClick={handleExportSavingsExcel}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-wider backdrop-blur-sm border border-white/10 transition-all active:scale-95 shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Export Ledger
                            </button>
                            <button
                                onClick={() => setIsOnboardMemberModalOpen(true)}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
                            >
                                <UserPlus className="w-4 h-4" />
                                Onboard Member
                            </button>
                            <button
                                onClick={() => {
                                    if (saccoAccounts.length > 0) {
                                        setDepositAccountId(saccoAccounts[0].id);
                                        setDepositCategory(saccoAccounts[0].savingsCategory);
                                    }
                                    setIsRecordDepositModalOpen(true);
                                }}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                            >
                                <Plus className="w-4 h-4 text-slate-950" />
                                Record Deposit
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Stat Cards (4 Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                            <PiggyBank className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Savings Pool</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                            KES {totalSaccoSavingsPool.toLocaleString()}
                        </h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-bold flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            {saccoAccounts.length} active member accounts
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                            <Shield className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Sinking Fund</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                            KES {totalSinkingFundPool.toLocaleString()}
                        </h3>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-bold">
                            Ring-fenced maintenance reserve
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                            <Coins className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SACCO Share Capital</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                            KES {totalShareCapitalPool.toLocaleString()}
                        </h3>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-bold">
                            Statutory equity (SASRA compliant)
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/40 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                            <Percent className="w-6 h-6" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3x Loan Guarantee Limit</p>
                        <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                            KES {totalLoanCollateralPool.toLocaleString()}
                        </h3>
                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-bold">
                            Available credit borrowing ceiling
                        </p>
                    </div>
                </div>

                {/* Scheme / Category Filter Pills */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-700/60 shadow-sm">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {categoriesList.map(cat => {
                            const count = cat.category === 'ALL'
                                ? saccoAccounts.length
                                : saccoAccounts.filter(a => a.savingsCategory === cat.category).length;
                            const isSelected = savingsSchemeFilter === cat.category;
                            const IconComponent = cat.icon;
                            return (
                                <button
                                    key={cat.category}
                                    onClick={() => setSavingsSchemeFilter(cat.category)}
                                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shrink-0 transition-all ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                                    }`}
                                >
                                    <IconComponent className="w-3.5 h-3.5" />
                                    <span>{cat.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Search & Role Filter Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={savingsSearchTerm}
                            onChange={e => setSavingsSearchTerm(e.target.value)}
                            placeholder="Search member name, vehicle plate (e.g. KDC 992P), member ID, phone..."
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">Role:</span>
                        {(['ALL', 'Owner', 'Driver', 'Conductor', 'Staff'] as const).map(role => (
                            <button
                                key={role}
                                onClick={() => setSavingsRoleFilter(role)}
                                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                    savingsRoleFilter === role
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                        : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Member Accounts Registry Table & Live Transaction Feed */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Left: Accounts Registry (2 Columns) */}
                    <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-[3rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-700/60 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                    Member Savings Ledger
                                </h3>
                                <p className="text-slate-400 text-xs font-medium mt-0.5">
                                    Showing {filteredSaccoAccounts.length} of {saccoAccounts.length} accounts
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOnboardMemberModalOpen(true)}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-100 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Member
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                        <th className="px-4 py-3.5 rounded-l-2xl">Member</th>
                                        <th className="px-4 py-3.5">Vehicle & Role</th>
                                        <th className="px-4 py-3.5">Scheme</th>
                                        <th className="px-4 py-3.5 text-right">Savings (KES)</th>
                                        <th className="px-4 py-3.5 text-right">Share Cap.</th>
                                        <th className="px-4 py-3.5 text-right">3x Loan Limit</th>
                                        <th className="px-4 py-3.5 text-center rounded-r-2xl">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-xs">
                                    {filteredSaccoAccounts.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-slate-400">
                                                <PiggyBank className="w-10 h-10 mx-auto text-slate-300 mb-3 opacity-60" />
                                                <p className="font-bold text-sm">No member savings accounts found</p>
                                                <p className="text-xs text-slate-400 mt-1">Try resetting your filter or onboard a new member.</p>
                                                <button
                                                    onClick={() => {
                                                        setSavingsSchemeFilter('ALL');
                                                        setSavingsRoleFilter('ALL');
                                                        setSavingsSearchTerm('');
                                                    }}
                                                    className="mt-3 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:underline"
                                                >
                                                    Clear Filters
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSaccoAccounts.map(acc => {
                                            const roleColor = acc.memberRole === 'Owner'
                                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                                                : acc.memberRole === 'Driver'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                                                : acc.memberRole === 'Conductor'
                                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300';

                                            return (
                                                <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm">
                                                                {acc.memberName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 dark:text-white leading-tight">
                                                                    {acc.memberName}
                                                                </p>
                                                                <p className="text-[10px] font-semibold text-slate-400">
                                                                    {acc.memberNumber} • {acc.phoneNumber}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] border border-slate-200 dark:border-slate-700">
                                                                {acc.vehiclePlate}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${roleColor}`}>
                                                                {acc.memberRole}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                                                            {acc.vehicleModel || 'PSV Matatu'}
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80">
                                                            {acc.savingsCategory}
                                                        </span>
                                                        <p className="text-[9px] text-slate-400 mt-0.5">
                                                            KES {acc.dailyTarget}/day target
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white">
                                                        KES {acc.savingsBalance.toLocaleString()}
                                                        <p className="text-[9px] font-normal text-slate-400">
                                                            Last: {acc.lastDepositDate || 'N/A'}
                                                        </p>
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right font-bold text-slate-600 dark:text-slate-300">
                                                        KES {acc.shareCapital.toLocaleString()}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-right">
                                                        {(() => {
                                                            const elig = computeMemberLoanEligibility(acc.savingsBalance, acc.memberRole, loanSettings);
                                                            if (elig.isEligible) {
                                                                return (
                                                                    <div>
                                                                        <span className="font-black text-purple-600 dark:text-purple-400 font-mono">
                                                                            KES {elig.maxLoanLimit.toLocaleString()}
                                                                        </span>
                                                                        <span className="block text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                                                            {loanSettings.loanMultiplier}x Qualified
                                                                        </span>
                                                                    </div>
                                                                );
                                                            } else {
                                                                return (
                                                                    <div title={elig.reason}>
                                                                        <span className="font-bold text-slate-400 font-mono text-xs line-through">
                                                                            KES 0
                                                                        </span>
                                                                        <span className="block text-[8px] font-black uppercase text-rose-500">
                                                                            &lt; KES {elig.minRequired.toLocaleString()} Min
                                                                        </span>
                                                                    </div>
                                                                );
                                                            }
                                                        })()}
                                                    </td>

                                                    <td className="px-4 py-3.5 text-center">
                                                        <button
                                                            onClick={() => openDepositModalForAccount(acc.id, acc.savingsCategory)}
                                                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                        >
                                                            + Deposit
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right: Live Inflow Stream & Regulatory Summary */}
                    <div className="space-y-6">
                        {/* Live Inflow Feed */}
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-6 border border-slate-100 dark:border-slate-700/60 shadow-sm">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-500" />
                                    Live Inflow Stream
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400">
                                    Real-time
                                </span>
                            </div>

                            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                                {saccoTransactions.length === 0 ? (
                                    <p className="text-center py-8 text-xs text-slate-400">No deposit transactions logged yet.</p>
                                ) : (
                                    saccoTransactions.slice(0, 8).map(tx => (
                                        <div
                                            key={tx.id}
                                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:bg-slate-100/70 dark:hover:bg-slate-900 transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="font-black text-xs text-slate-900 dark:text-white truncate">
                                                        {tx.memberName}
                                                    </span>
                                                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded">
                                                        {tx.vehiclePlate}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 truncate">
                                                    {tx.savingsCategory} • {tx.paymentMethod.toUpperCase()}
                                                    {tx.reference ? ` (${tx.reference})` : ''}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                                    {new Date(tx.recordedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                    +KES {tx.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* SASRA & Transport PSV Cooperative Framework */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                            <div className="flex items-center gap-2 mb-3">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">
                                    SASRA & NTSA PSV Compliance
                                </h4>
                            </div>
                            <ul className="space-y-2 text-[11px] text-slate-300 font-medium">
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                                    <span><strong>Daily Sinking Funds</strong> are ring-fenced exclusively for vehicle mechanical overhaul, tire renewal, and mandatory NTSA PSV annual roadworthiness inspection.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                                    <span><strong>3x Credit Collateral:</strong> Active members can qualify for up to 300% of their cumulative savings balance in micro-loans or asset financing.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0"></span>
                                    <span><strong>Share Capital</strong> forms the permanent, non-withdrawable institutional equity qualifying owners & crews for annual statutory dividend payouts.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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
            const invNo = (inv as any).invoiceNumber || inv.id || '';
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
            const aAny = a as any;
            return !reportSearch ||
                (a.message || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                (aAny.route || a.affectedRoute || '').toLowerCase().includes(reportSearch.toLowerCase()) ||
                (aAny.vehiclePlate || a.affectedBusReg || '').toLowerCase().includes(reportSearch.toLowerCase());
        });

        const handleExportExcel = () => {
            if (reportSubTab === 'billing') {
                const data = filteredInvoices.map((inv, idx) => {
                    const invAny = inv as any;
                    const amt = invAny.amount || inv.finalAmount || 0;
                    const paid = invAny.paidAmount || (inv.status === 'paid' ? amt : 0);
                    const bal = invAny.balance !== undefined ? invAny.balance : Math.max(0, amt - paid);
                    return {
                        '#': idx + 1,
                        'Invoice No': invAny.invoiceNumber || inv.id,
                        'Student Name': inv.studentName,
                        'Admission No': inv.admissionNumber,
                        'Route': inv.routeName,
                        'Commute Mode': inv.preference || invAny.commutePreference || 'Round Trip',
                        'Billing Period': inv.period,
                        'Amount (KES)': amt,
                        'Paid (KES)': paid,
                        'Balance (KES)': bal,
                        'Status': (inv.status || 'Pending').toUpperCase(),
                        'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'
                    };
                });
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
                const data = filteredAlerts.map((a, idx) => {
                    const aAny = a as any;
                    return {
                        '#': idx + 1,
                        'Severity': (aAny.severity || a.reason || 'Normal').toUpperCase(),
                        'Category': (aAny.type || a.reason || 'Notice').toUpperCase(),
                        'Route': aAny.route || a.affectedRoute || 'All Routes',
                        'Vehicle Plate': aAny.vehiclePlate || a.affectedBusReg || 'N/A',
                        'Driver': aAny.driverName || a.replacementDriver || 'N/A',
                        'Message': a.message,
                        'Status': (a.status || 'Active').toUpperCase(),
                        'Created At': a.createdAt ? new Date(a.createdAt).toLocaleString() : 'N/A'
                    };
                });
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
                            {reportSubTab === 'billing' && isEduTransport && (
                                <button
                                    onClick={() => setIsOpeningBalancesModalOpen(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-md active:scale-95 cursor-pointer"
                                    title="Update or import commuter opening balances (B/F Arrears & Advance)"
                                >
                                    <UploadCloud className="w-3.5 h-3.5" />
                                    <span>Opening Balances (B/F)</span>
                                </button>
                            )}
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
                                            const invAny = inv as any;
                                            const amt = invAny.amount || inv.finalAmount || 0;
                                            const paid = invAny.paidAmount || (inv.status === 'paid' ? amt : 0);
                                            const bal = invAny.balance !== undefined ? invAny.balance : Math.max(0, amt - paid);
                                            return (
                                                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                    <td className="p-4">
                                                        <p className="font-black text-slate-900 dark:text-white">{inv.studentName}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{inv.admissionNumber || invAny.invoiceNumber || inv.id}</p>
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
                                        filteredAlerts.map(a => {
                                            const aAny = a as any;
                                            const severity = aAny.severity || 'low';
                                            return (
                                                <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors">
                                                    <td className="p-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                            severity === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' :
                                                            severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                                                            'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                                        }`}>
                                                            {severity}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{aAny.route || a.affectedRoute || 'All Routes'}</p>
                                                        <p className="text-[10px] font-mono text-slate-400">{aAny.vehiclePlate || a.affectedBusReg || 'N/A'}</p>
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
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderSACCORemittance = () => {
        // Calculate consolidated driver remittance rows for selectedRemittanceDate
        const activeRows = saccoAccounts.map(acc => {
            const existingRecord = remittanceRecords.find(r => 
                (r.accountId === acc.id || r.vehiclePlate === acc.vehiclePlate) && 
                r.scheduledDate === selectedRemittanceDate
            );

            const tierName = acc.remittanceTier || 'Silver';
            const tierObj = remittanceSettings.tiers.find(t => t.tierName.toLowerCase() === tierName.toLowerCase()) || remittanceSettings.tiers[0];
            const baseTarget = tierObj ? tierObj.dailyTarget : (acc.dailyTarget || 1500);

            // Compute current fee calculation if pending
            const now = new Date();
            const todayStr = new Date().toISOString().split('T')[0];
            const checkDateTime = selectedRemittanceDate === todayStr ? now : new Date(`${selectedRemittanceDate}T23:59:59`);
            const liveCalc = calculateRemittanceFee(selectedRemittanceDate, checkDateTime, baseTarget, remittanceSettings);

            return {
                account: acc,
                existingRecord,
                tierName: tierObj ? tierObj.tierName : tierName,
                baseTarget,
                submittedAt: existingRecord?.submittedAt,
                latePenalty: existingRecord ? existingRecord.latePenalty : (liveCalc.isLate ? liveCalc.latePenalty : 0),
                nextDayPenalty: existingRecord ? existingRecord.nextDayPenalty : (liveCalc.isNextDayOverdue ? liveCalc.nextDayPenalty : 0),
                totalPayable: existingRecord ? existingRecord.totalPayable : liveCalc.totalPayable,
                amountPaid: existingRecord ? existingRecord.amountPaid : 0,
                balance: existingRecord ? existingRecord.balance : liveCalc.totalPayable,
                status: existingRecord ? existingRecord.status : (liveCalc.isLate ? (liveCalc.isNextDayOverdue ? 'overdue' as const : 'late' as const) : 'pending' as const),
                ruleMessage: existingRecord?.notes || liveCalc.ruleMessage
            };
        });

        // Filter by search & status
        const filteredRows = activeRows.filter(row => {
            if (remittanceFilterStatus !== 'ALL' && row.status !== remittanceFilterStatus) return false;
            if (!remittanceSearchTerm) return true;
            const q = remittanceSearchTerm.toLowerCase();
            return (
                row.account.memberName.toLowerCase().includes(q) ||
                row.account.vehiclePlate.toLowerCase().includes(q) ||
                row.account.phoneNumber.toLowerCase().includes(q) ||
                row.tierName.toLowerCase().includes(q)
            );
        });

        // Metrics
        const totalScheduledTarget = activeRows.reduce((sum, r) => sum + r.baseTarget, 0);
        const totalCollected = activeRows.reduce((sum, r) => sum + r.amountPaid, 0);
        const totalPenalties = activeRows.reduce((sum, r) => sum + (r.latePenalty + r.nextDayPenalty), 0);
        const pendingCount = activeRows.filter(r => r.amountPaid === 0 || r.status === 'pending').length;

        const todayIso = new Date().toISOString().split('T')[0];
        const yesterdayIso = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        return (
            <div className="animate-fade-in-up space-y-8">
                {/* Remittance Header Banner */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-indigo-800/40">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3 backdrop-blur-md">
                                <Clock3 className="w-3.5 h-3.5 text-indigo-400" />
                                <span>SACCO Daily Remittance & Late Penalty Ledger</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                                Daily Driver <span className="text-indigo-400">Remittance & Check-off</span>
                            </h2>
                            <p className="text-slate-300 text-sm max-w-2xl mt-2 font-medium">
                                Enforce daily vehicle remittance rates (Silver KES 1,500, Bronze KES 1,600, Gold KES 1,700). Submissions after {remittanceSettings.cutoffTime} incur +KES {remittanceSettings.latePenaltyAmount} late penalty. Payments past {remittanceSettings.nextDayCutoffTime} next morning add +KES {remittanceSettings.nextDayDelayPenaltyAmount} overdue penalty.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <div className="flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-2xl p-1.5 backdrop-blur-sm">
                                <button
                                    onClick={() => setSelectedRemittanceDate(todayIso)}
                                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                        selectedRemittanceDate === todayIso
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    Today
                                </button>
                                <button
                                    onClick={() => setSelectedRemittanceDate(yesterdayIso)}
                                    className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                                        selectedRemittanceDate === yesterdayIso
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    Yesterday
                                </button>
                                <input
                                    type="date"
                                    value={selectedRemittanceDate}
                                    onChange={e => setSelectedRemittanceDate(e.target.value)}
                                    className="bg-transparent px-3 py-1.5 text-xs font-bold text-white outline-none cursor-pointer"
                                />
                            </div>

                            <button
                                onClick={handleExportRemittanceExcel}
                                className="flex items-center gap-2 px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-wider backdrop-blur-sm border border-white/10 transition-all active:scale-95 shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Export Excel
                            </button>
                            <button
                                onClick={() => setActiveTab('sacco_settings')}
                                className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
                            >
                                <Sliders className="w-4 h-4" />
                                Adjust Settings
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Metrics HUD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Landmark className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Scheduled Target</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    KES {totalScheduledTarget.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Collected Today</p>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                    KES {totalCollected.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Late Penalties Assessed</p>
                                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                                    +KES {totalPenalties.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pending Check-offs</p>
                                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                                    {pendingCount} Vehicles
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deadlines & Penalty Rules Notice Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-bold text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="font-black uppercase tracking-wider block sm:inline mr-2">Enforced Remittance Policy:</span>
                            <span>Daily cutoff is <strong>{remittanceSettings.cutoffTime} (10:00 PM)</strong>. Late by &ge; 1 minute incurs <strong>+KES {remittanceSettings.latePenaltyAmount}</strong>. Delaying past <strong>{remittanceSettings.nextDayCutoffTime} (10:00 AM next day)</strong> adds an extra <strong>+KES {remittanceSettings.nextDayDelayPenaltyAmount}</strong> (+KES {remittanceSettings.latePenaltyAmount + remittanceSettings.nextDayDelayPenaltyAmount} total penalty).</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setActiveTab('sacco_settings')}
                        className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-wider shrink-0 transition-all shadow-sm"
                    >
                        Configure Rules
                    </button>
                </div>

                {/* Search, Filter Tabs & Ledger Table */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        {/* Status Filter Tabs */}
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { id: 'ALL', label: 'All Drivers', count: activeRows.length },
                                { id: 'on_time', label: 'On Time (0 fee)', count: activeRows.filter(r => r.status === 'on_time').length },
                                { id: 'late', label: `Late (+KES ${remittanceSettings.latePenaltyAmount})`, count: activeRows.filter(r => r.status === 'late').length },
                                { id: 'overdue', label: `Overdue (+KES ${remittanceSettings.latePenaltyAmount + remittanceSettings.nextDayDelayPenaltyAmount})`, count: activeRows.filter(r => r.status === 'overdue').length },
                                { id: 'pending', label: 'Pending Check-off', count: activeRows.filter(r => r.status === 'pending').length },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setRemittanceFilterStatus(tab.id as any)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                                        remittanceFilterStatus === tab.id
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                        remittanceFilterStatus === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-72">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={remittanceSearchTerm}
                                onChange={e => setRemittanceSearchTerm(e.target.value)}
                                placeholder="Search driver, plate, phone..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-700/80 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <th className="pb-3 px-4">Vehicle & Driver</th>
                                    <th className="pb-3 px-4">Remittance Tier</th>
                                    <th className="pb-3 px-4">Cutoff / Submitted</th>
                                    <th className="pb-3 px-4">Late Penalty</th>
                                    <th className="pb-3 px-4">Total Payable</th>
                                    <th className="pb-3 px-4">Amount Paid</th>
                                    <th className="pb-3 px-4">Balance</th>
                                    <th className="pb-3 px-4">Status</th>
                                    <th className="pb-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40 text-xs">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-slate-400 font-bold uppercase text-[11px] tracking-widest">
                                            No vehicle remittances found for {selectedRemittanceDate} matching filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map(row => {
                                        const isPaid = row.amountPaid >= row.totalPayable && row.totalPayable > 0;
                                        return (
                                            <tr key={row.account.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="py-4 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-mono font-black text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                                            {row.account.vehiclePlate}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-800 dark:text-slate-100">
                                                                {row.account.memberName}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-medium">
                                                                {row.account.memberRole} • {row.account.phoneNumber}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                                                        <span className={`w-2 h-2 rounded-full ${
                                                            row.tierName === 'Gold' ? 'bg-amber-400' : row.tierName === 'Bronze' ? 'bg-orange-500' : 'bg-slate-400'
                                                        }`}></span>
                                                        <span>{row.tierName}</span>
                                                        <span className="text-slate-400 font-normal">({row.baseTarget.toLocaleString()}/d)</span>
                                                    </div>
                                                </td>

                                                <td className="py-4 px-4 font-bold text-slate-600 dark:text-slate-300">
                                                    {row.submittedAt ? (
                                                        <div>
                                                            <span className="text-slate-900 dark:text-white font-black">
                                                                {new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 block font-medium">
                                                                {new Date(row.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
                                                            <Clock className="w-3 h-3 text-slate-400" />
                                                            <span>Cutoff: {remittanceSettings.cutoffTime}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 font-black">
                                                    {row.latePenalty === 0 && row.nextDayPenalty === 0 ? (
                                                        <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">KES 0</span>
                                                    ) : row.nextDayPenalty > 0 ? (
                                                        <span className="text-rose-600 dark:text-rose-400 text-[11px]" title="Level 1 Late + Level 2 Delayed past 10 AM">
                                                            +KES {(row.latePenalty + row.nextDayPenalty).toLocaleString()}
                                                            <span className="block text-[9px] font-bold text-rose-500">(100+200)</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600 dark:text-amber-400 text-[11px]" title="Level 1 Late (>10:00 PM)">
                                                            +KES {row.latePenalty.toLocaleString()}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 font-black text-slate-900 dark:text-white">
                                                    KES {row.totalPayable.toLocaleString()}
                                                </td>

                                                <td className="py-4 px-4 font-black text-emerald-600 dark:text-emerald-400">
                                                    KES {row.amountPaid.toLocaleString()}
                                                </td>

                                                <td className="py-4 px-4 font-black">
                                                    <span className={row.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}>
                                                        KES {row.balance.toLocaleString()}
                                                    </span>
                                                </td>

                                                <td className="py-4 px-4">
                                                    {row.status === 'on_time' && (
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                                            On Time
                                                        </span>
                                                    )}
                                                    {row.status === 'late' && (
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                                                            Late (+100)
                                                        </span>
                                                    )}
                                                    {row.status === 'overdue' && (
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                                                            Delayed (+300)
                                                        </span>
                                                    )}
                                                    {row.status === 'pending' && (
                                                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-4 px-4 text-right">
                                                    <button
                                                        onClick={() => handleOpenRecordRemittance(row.account, row.existingRecord)}
                                                        className={`px-3.5 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all shadow-sm ${
                                                            isPaid
                                                                ? 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200'
                                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                                                        }`}
                                                    >
                                                        {isPaid ? 'View / Receipt' : 'Check Off'}
                                                    </button>
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
        );
    };

    const renderSACCOSettings = () => {
        // Calculate simulated fee
        const simTierObj = remittanceSettings.tiers.find(t => t.tierName.toLowerCase() === simTierName.toLowerCase()) || remittanceSettings.tiers[0];
        const simBaseTarget = simTierObj ? simTierObj.dailyTarget : 1500;
        const simDateTime = new Date(`${simSubmissionDate}T${simSubmissionTime || '22:00'}:00`);
        const simResult = calculateRemittanceFee(simSubmissionDate, simDateTime, simBaseTarget, remittanceSettings);

        const todayIso = new Date().toISOString().split('T')[0];
        const nextDayIso = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        return (
            <div className="animate-fade-in-up space-y-8">
                {/* SACCO Settings Header */}
                <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-8 sm:p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden border border-indigo-800/40">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3 backdrop-blur-md">
                                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Cooperative Policy Engine</span>
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight">
                                SACCO Remittance, Loans & <span className="text-indigo-400">Credit Policies</span>
                            </h2>
                            <p className="text-slate-300 text-sm max-w-2xl mt-2 font-medium">
                                Configure daily vehicle remittance targets, cutoff deadlines & penalties, savings-backed loan limits (e.g. Driver minimum savings KES 10,000 for 3x loan eligibility), and cooperative interest rates.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    handleResetRemittanceSettings();
                                    handleResetLoanSettings();
                                }}
                                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-wider backdrop-blur-sm border border-white/10 transition-all"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Restore All Defaults
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleSaveRemittanceSettings();
                                    handleSaveLoanSettings();
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Save & Sync Cloud
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 1: Daily Remittance Tiers Configuration */}
                <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                                <DollarSign className="w-5 h-5 text-indigo-600" />
                                Daily Remittance Tiers (Vehicle Classes)
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                Set daily remittance targets per vehicle classification. Drivers are assigned to tiers during member onboarding.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setEditingTierId(null);
                                setNewTierName('');
                                setNewTierTarget('1800');
                                setNewTierDesc('');
                                setNewTierColor('indigo');
                                setIsAddTierModalOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 font-black uppercase text-[10px] tracking-wider hover:bg-indigo-100 transition-all flex items-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Custom Tier
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {remittanceSettings.tiers.map(tier => {
                            const assignedCount = saccoAccounts.filter(a => (a.remittanceTier || 'Silver').toLowerCase() === tier.tierName.toLowerCase()).length;
                            return (
                                <div
                                    key={tier.id}
                                    className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-4 hover:border-indigo-300 transition-all relative group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${
                                                tier.tierName === 'Gold' ? 'bg-amber-400 ring-4 ring-amber-400/20' :
                                                tier.tierName === 'Bronze' ? 'bg-orange-500 ring-4 ring-orange-500/20' :
                                                'bg-slate-400 ring-4 ring-slate-400/20'
                                            }`} />
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {tier.tierName} Tier
                                            </h4>
                                        </div>

                                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingTierId(tier.id);
                                                    setNewTierName(tier.tierName);
                                                    setNewTierTarget(String(tier.dailyTarget));
                                                    setNewTierDesc(tier.description || '');
                                                    setNewTierColor(tier.color || 'indigo');
                                                    setIsAddTierModalOpen(true);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                title="Edit Tier Target"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            {remittanceSettings.tiers.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteTier(tier.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                                                    title="Remove Tier"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Daily Target</div>
                                        <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-0.5">
                                            KES {tier.dailyTarget.toLocaleString()}
                                            <span className="text-xs font-bold text-slate-400 ml-1">/ day</span>
                                        </div>
                                    </div>

                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-2">
                                        {tier.description || 'Standard vehicle check-off remittance'}
                                    </p>

                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] font-bold text-slate-500">
                                        <span>Assigned Vehicles:</span>
                                        <span className="font-black text-slate-800 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                                            {assignedCount} Member(s)
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Section 2: Cutoff Deadlines & Automated Late Fee Engine */}
                <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                            <Clock3 className="w-5 h-5 text-indigo-600" />
                            Cutoff Deadlines & Automated Late Fee Escalation
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                            Define exact cutoff times for daily remittance submission and how late penalties escalate across hours.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cutoff Level 1: Same Day 10 PM */}
                        <div className="p-6 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                                        Level 1: Daily Cutoff Deadline
                                    </h4>
                                    <p className="text-[11px] font-medium text-slate-500">Default: 10:00 PM (22:00) on scheduled date</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        Submission Cutoff Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={remittanceSettings.cutoffTime}
                                        onChange={e => setRemittanceSettings({ ...remittanceSettings, cutoffTime: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        Late Penalty Amount (KES) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">KES</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={remittanceSettings.latePenaltyAmount}
                                            onChange={e => setRemittanceSettings({ ...remittanceSettings, latePenaltyAmount: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-100/60 dark:bg-amber-900/30 rounded-xl text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                ⚠️ If driver is late by <strong>1 minute</strong> (e.g. 22:01), <strong>+KES {remittanceSettings.latePenaltyAmount}</strong> is automatically added to the amount payable.
                            </div>
                        </div>

                        {/* Cutoff Level 2: Next Day 10 AM */}
                        <div className="p-6 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-700 dark:text-rose-400">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                                        Level 2: Next-Day Extended Delay
                                    </h4>
                                    <p className="text-[11px] font-medium text-slate-500">Default: 10:00 AM the morning after</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        Next-Day Cutoff Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={remittanceSettings.nextDayCutoffTime}
                                        onChange={e => setRemittanceSettings({ ...remittanceSettings, nextDayCutoffTime: e.target.value })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        Additional Delay Penalty (KES) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">KES</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={remittanceSettings.nextDayDelayPenaltyAmount}
                                            onChange={e => setRemittanceSettings({ ...remittanceSettings, nextDayDelayPenaltyAmount: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-rose-100/60 dark:bg-rose-900/30 rounded-xl text-[11px] font-bold text-rose-900 dark:text-rose-200">
                                🚨 If payment is delayed past <strong>{remittanceSettings.nextDayCutoffTime} (10:00 AM next day)</strong>, an extra <strong>+KES {remittanceSettings.nextDayDelayPenaltyAmount}</strong> is added (Total penalty = KES {remittanceSettings.latePenaltyAmount + remittanceSettings.nextDayDelayPenaltyAmount}).
                            </div>
                        </div>
                    </div>

                    {/* Enforcement Toggle and Grace Period */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={remittanceSettings.enforcePenalties}
                                onChange={e => setRemittanceSettings({ ...remittanceSettings, enforcePenalties: e.target.checked })}
                                className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                            />
                            <div>
                                <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    Enforce Automated Late Remittance Penalties
                                </span>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    When checked, penalty fees will automatically calculate based on payment timestamps.
                                </p>
                            </div>
                        </label>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0">
                                Grace Minutes:
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="60"
                                value={remittanceSettings.graceMinutes || 0}
                                onChange={e => setRemittanceSettings({ ...remittanceSettings, graceMinutes: parseInt(e.target.value) || 0 })}
                                className="w-20 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-center outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Interactive Late Penalty Simulator */}
                <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl space-y-6 border border-slate-800 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-2">
                                <Calculator className="w-3.5 h-3.5" />
                                <span>Interactive Sandbox</span>
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight">
                                Remittance & Penalty Simulator
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                Test any driver tier and submission time to preview the exact penalties and total amount payable.
                            </p>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSimSubmissionDate(todayIso);
                                    setSimSubmissionTime('21:45');
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-emerald-300 transition-colors"
                            >
                                9:45 PM (On Time)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSimSubmissionDate(todayIso);
                                    setSimSubmissionTime('22:01');
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-amber-300 transition-colors"
                            >
                                10:01 PM (+100 Late)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSimSubmissionDate(todayIso);
                                    setSimSubmissionTime('23:30');
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-amber-300 transition-colors"
                            >
                                11:30 PM (+100 Late)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSimSubmissionDate(nextDayIso);
                                    setSimSubmissionTime('08:30');
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-amber-300 transition-colors"
                            >
                                Next Day 8:30 AM (+100)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSimSubmissionDate(nextDayIso);
                                    setSimSubmissionTime('10:05');
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-rose-300 transition-colors"
                            >
                                Next Day 10:05 AM (+300 Overdue)
                            </button>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Driver Vehicle Tier
                            </label>
                            <select
                                value={simTierName}
                                onChange={e => setSimTierName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 font-black text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {remittanceSettings.tiers.map(t => (
                                    <option key={t.id} value={t.tierName}>
                                        {t.tierName} Tier (Base: KES {t.dailyTarget.toLocaleString()}/day)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Submission Date
                            </label>
                            <input
                                type="date"
                                value={simSubmissionDate}
                                onChange={e => setSimSubmissionDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 font-bold text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Submission Time
                            </label>
                            <input
                                type="time"
                                value={simSubmissionTime}
                                onChange={e => setSimSubmissionTime(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 font-black text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Simulator Result Breakdown Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. Base Remittance</span>
                            <div className="text-2xl font-black text-white mt-1">
                                KES {simBaseTarget.toLocaleString()}
                            </div>
                            <span className="text-[10px] text-slate-400">{simTierName} Tier</span>
                        </div>

                        <div className={`p-4 rounded-2xl border ${
                            simResult.latePenalty > 0 ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'
                        }`}>
                            <span className="text-[10px] font-black uppercase tracking-wider">2. Cutoff Late Fee (&gt;10 PM)</span>
                            <div className="text-2xl font-black mt-1">
                                {simResult.latePenalty > 0 ? `+KES ${simResult.latePenalty.toLocaleString()}` : 'KES 0'}
                            </div>
                            <span className="text-[10px]">
                                {simResult.latePenalty > 0 ? 'Late submission' : 'Submitted on time'}
                            </span>
                        </div>

                        <div className={`p-4 rounded-2xl border ${
                            simResult.nextDayPenalty > 0 ? 'bg-rose-500/10 border-rose-500/40 text-rose-300' : 'bg-white/5 border-white/10 text-slate-400'
                        }`}>
                            <span className="text-[10px] font-black uppercase tracking-wider">3. Delayed Fee (&gt;10 AM Next Day)</span>
                            <div className="text-2xl font-black mt-1">
                                {simResult.nextDayPenalty > 0 ? `+KES ${simResult.nextDayPenalty.toLocaleString()}` : 'KES 0'}
                            </div>
                            <span className="text-[10px]">
                                {simResult.nextDayPenalty > 0 ? 'Next-day delay applied' : 'Within morning limit'}
                            </span>
                        </div>

                        <div className="p-4 rounded-2xl bg-indigo-600/30 border border-indigo-500/40">
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">4. Total Amount Payable</span>
                            <div className="text-3xl font-black text-white mt-1">
                                KES {simResult.totalPayable.toLocaleString()}
                            </div>
                            <span className="text-[10px] text-indigo-300 font-bold uppercase">
                                Status: {simResult.status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Rule Outcome: {simResult.ruleMessage}</span>
                    </div>
                </div>

                {/* Section 4: SACCO Loan Limit & Savings Qualification Policy */}
                <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                                <Wallet className="w-3.5 h-3.5" />
                                <span>Savings-Backed Credit Policy</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                                <PiggyBank className="w-5 h-5 text-purple-600" />
                                Loan Limit Based on Member Savings
                            </h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">
                                Configure borrowing eligibility rules. Set the loan multiplier (e.g. 3x savings) and mandatory minimum qualifying savings threshold for drivers and members.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-3 cursor-pointer p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                                <input
                                    type="checkbox"
                                    checked={loanSettings.enabled}
                                    onChange={e => setLoanSettings({ ...loanSettings, enabled: e.target.checked })}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 accent-purple-600"
                                />
                                <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                    Credit Facility Active
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Multiplier Card */}
                        <div className="p-6 rounded-3xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 space-y-3">
                            <div className="flex items-center gap-2.5 text-purple-700 dark:text-purple-300">
                                <Percent className="w-5 h-5" />
                                <h4 className="font-black text-sm uppercase tracking-wider">
                                    Savings Loan Multiplier
                                </h4>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Maximum loan amount a member can borrow relative to their qualifying savings balance.
                            </p>
                            <div className="relative pt-2">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-purple-500 font-mono">X</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    step="0.5"
                                    value={loanSettings.loanMultiplier}
                                    onChange={e => setLoanSettings({ ...loanSettings, loanMultiplier: parseFloat(e.target.value) || 3 })}
                                    className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                                />
                            </div>
                            <div className="p-2.5 bg-purple-100/60 dark:bg-purple-900/30 rounded-xl text-[10px] font-bold text-purple-900 dark:text-purple-200">
                                📊 e.g. With a <strong>{loanSettings.loanMultiplier}x</strong> ratio, a member with KES 20,000 savings qualifies for up to <strong>KES {(20000 * loanSettings.loanMultiplier).toLocaleString()}</strong>.
                            </div>
                        </div>

                        {/* General Minimum Threshold Card */}
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                                <Shield className="w-5 h-5 text-indigo-600" />
                                <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                                    General Savings Threshold
                                </h4>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Base qualifying floor across all members before credit assessment begins.
                            </p>
                            <div className="relative pt-2">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400 font-mono">KES</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={loanSettings.minSavingsThreshold}
                                    onChange={e => setLoanSettings({ ...loanSettings, minSavingsThreshold: parseFloat(e.target.value) || 10000 })}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">
                                Fallback threshold applied if no role-specific override is set.
                            </p>
                        </div>

                        {/* Minimum Tenure & Guarantors */}
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                                <Users className="w-5 h-5 text-emerald-600" />
                                <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                                    Vetting & Guarantorship
                                </h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        Min Membership
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={loanSettings.minMembershipMonths}
                                        onChange={e => setLoanSettings({ ...loanSettings, minMembershipMonths: parseInt(e.target.value) || 3 })}
                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none text-center"
                                    />
                                    <span className="text-[9px] text-slate-400 block text-center mt-0.5">Months Active</span>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        Guarantors
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={loanSettings.guarantorsRequired}
                                        onChange={e => setLoanSettings({ ...loanSettings, guarantorsRequired: parseInt(e.target.value) || 2 })}
                                        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none text-center"
                                    />
                                    <span className="text-[9px] text-slate-400 block text-center mt-0.5">Active Members</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Role-Specific Minimum Qualifying Savings Thresholds */}
                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-purple-600" />
                                    Role-Based Minimum Qualifying Savings Thresholds
                                </h4>
                                <p className="text-[11px] text-slate-400 font-medium">
                                    Enforce customized qualifying savings balance floors depending on member role in the SACCO.
                                </p>
                            </div>
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                Strict Enforcement
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* PSV Driver Threshold */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/40 space-y-2 shadow-sm relative">
                                <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest">
                                    Primary Rule
                                </span>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        PSV Driver *
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Driver Fleet</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400 font-mono">KES</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={loanSettings.roleMinSavingsThresholds.driver}
                                        onChange={e => setLoanSettings({
                                            ...loanSettings,
                                            roleMinSavingsThresholds: {
                                                ...loanSettings.roleMinSavingsThresholds,
                                                driver: parseFloat(e.target.value) || 0
                                            }
                                        })}
                                        className="w-full pl-11 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                    Driver must save <strong>above KES {loanSettings.roleMinSavingsThresholds.driver.toLocaleString()}</strong> to qualify for credit.
                                </p>
                            </div>

                            {/* Vehicle Owner Threshold */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        Vehicle Owner
                                    </span>
                                    <span className="text-[10px] font-bold text-indigo-500">Asset Holder</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400 font-mono">KES</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={loanSettings.roleMinSavingsThresholds.owner}
                                        onChange={e => setLoanSettings({
                                            ...loanSettings,
                                            roleMinSavingsThresholds: {
                                                ...loanSettings.roleMinSavingsThresholds,
                                                owner: parseFloat(e.target.value) || 0
                                            }
                                        })}
                                        className="w-full pl-11 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                    Owner must save <strong>above KES {loanSettings.roleMinSavingsThresholds.owner.toLocaleString()}</strong> to qualify.
                                </p>
                            </div>

                            {/* Conductor Threshold */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        Conductor
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-500">Fare Crew</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400 font-mono">KES</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={loanSettings.roleMinSavingsThresholds.conductor}
                                        onChange={e => setLoanSettings({
                                            ...loanSettings,
                                            roleMinSavingsThresholds: {
                                                ...loanSettings.roleMinSavingsThresholds,
                                                conductor: parseFloat(e.target.value) || 0
                                            }
                                        })}
                                        className="w-full pl-11 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                    Conductor must save <strong>above KES {loanSettings.roleMinSavingsThresholds.conductor.toLocaleString()}</strong> to qualify.
                                </p>
                            </div>

                            {/* SACCO Staff Threshold */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        SACCO Staff
                                    </span>
                                    <span className="text-[10px] font-bold text-purple-500">Operations</span>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400 font-mono">KES</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="500"
                                        value={loanSettings.roleMinSavingsThresholds.staff}
                                        onChange={e => setLoanSettings({
                                            ...loanSettings,
                                            roleMinSavingsThresholds: {
                                                ...loanSettings.roleMinSavingsThresholds,
                                                staff: parseFloat(e.target.value) || 0
                                            }
                                        })}
                                        className="w-full pl-11 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                                    Staff member must save <strong>above KES {loanSettings.roleMinSavingsThresholds.staff.toLocaleString()}</strong> to qualify.
                                </p>
                            </div>
                        </div>

                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>
                                📌 <strong>Enforcement Mechanism:</strong> Any member whose cumulative savings balance is lower than their role threshold will automatically have a <strong>KES 0 borrowing limit</strong> displayed across the SACCO Savings Ledger, with an explicit shortfall indicator.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section 5: Interest Rate Settings & Repayment Tenure */}
                <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                            <Percent className="w-3.5 h-3.5" />
                            <span>Loan Pricing & Finance Charges</span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2.5">
                            <Coins className="w-5 h-5 text-emerald-600" />
                            SACCO Loan Interest Rates & Tenure Terms
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                            Define standard interest rate calculation methods (reducing balance vs flat rate), maximum repayment tenure, appraisal fees, and emergency loan rates.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Primary Interest Rate Card */}
                        <div className="p-6 rounded-3xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                                    Base Interest Rate *
                                </h4>
                                <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                                    {loanSettings.interestRatePeriod === 'annual' ? 'Per Annum' : 'Monthly'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={loanSettings.interestRate}
                                        onChange={e => setLoanSettings({ ...loanSettings, interestRate: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-sm text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400">%</span>
                                </div>

                                <select
                                    value={loanSettings.interestRatePeriod}
                                    onChange={e => setLoanSettings({ ...loanSettings, interestRatePeriod: e.target.value as any })}
                                    className="px-3 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="annual">p.a. (Annual)</option>
                                    <option value="monthly">p.m. (Monthly)</option>
                                </select>
                            </div>

                            <div className="p-2.5 bg-emerald-100/60 dark:bg-emerald-900/30 rounded-xl text-[10px] font-bold text-emerald-900 dark:text-emerald-200">
                                📈 Equivalent to <strong>{loanSettings.interestRatePeriod === 'annual' ? (loanSettings.interestRate / 12).toFixed(2) : loanSettings.interestRate}%</strong> per month on outstanding loans.
                            </div>
                        </div>

                        {/* Calculation Method Card */}
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                            <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                                Interest Calculation Formula *
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                                Choose how the cooperative levies monthly loan interest charges.
                            </p>
                            <select
                                value={loanSettings.interestCalculationMethod}
                                onChange={e => setLoanSettings({ ...loanSettings, interestCalculationMethod: e.target.value as any })}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="reducing_balance">Reducing Balance (SACCO Standard)</option>
                                <option value="flat_rate">Flat Rate (Constant Principal)</option>
                            </select>
                            <p className="text-[10px] text-slate-400 font-medium">
                                {loanSettings.interestCalculationMethod === 'reducing_balance'
                                    ? '✔️ Reducing Balance charges interest only on the declining principal each month (fairer for borrowers).'
                                    : 'ℹ️ Flat Rate calculates interest uniformly across the entire loan tenure.'}
                            </p>
                        </div>

                        {/* Tenure & Processing Fee */}
                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                            <h4 className="font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                                Max Tenure & Appraisal Fee
                            </h4>
                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        Max Tenure
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={loanSettings.maxRepaymentMonths}
                                            onChange={e => setLoanSettings({ ...loanSettings, maxRepaymentMonths: parseInt(e.target.value) || 12 })}
                                            className="w-full pl-3 pr-8 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none font-mono"
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">Mo</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                        Appraisal Fee
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="10"
                                            step="0.1"
                                            value={loanSettings.processingFeePercent}
                                            onChange={e => setLoanSettings({ ...loanSettings, processingFeePercent: parseFloat(e.target.value) || 0 })}
                                            className="w-full pl-3 pr-7 py-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 outline-none font-mono"
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">%</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-[10px] text-slate-400 font-medium">
                                Appraisal fee of {loanSettings.processingFeePercent}% deducted upon disbursement.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Section 6: Interactive Loan Eligibility & EMI Simulator */}
                <div className="bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl space-y-6 border border-slate-800 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 border border-purple-500/30">
                                <Calculator className="w-3.5 h-3.5" />
                                <span>Credit Underwriting Sandbox</span>
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight">
                                Loan Eligibility & EMI Repayment Simulator
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                Test any driver or member savings amount to verify loan qualification against the threshold (Driver min: KES {loanSettings.roleMinSavingsThresholds.driver.toLocaleString()}) and preview monthly installments (EMI).
                            </p>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSimLoanRole('Driver');
                                    setSimLoanSavings('8000');
                                    setSimLoanAmount('20000');
                                    setSimLoanTenureMonths(12);
                                }}
                                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-rose-500/30"
                            >
                                Driver KES 8,000 (Test &lt; 10K Fail)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSimLoanRole('Driver');
                                    setSimLoanSavings('15000');
                                    setSimLoanAmount('40000');
                                    setSimLoanTenureMonths(12);
                                }}
                                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors border border-emerald-500/30"
                            >
                                Driver KES 15,000 (Pass 3x = 45K)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSimLoanRole('Driver');
                                    setSimLoanSavings('25000');
                                    setSimLoanAmount('75000');
                                    setSimLoanTenureMonths(12);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                                Driver KES 25,000 (Pass 3x = 75K)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSimLoanRole('Owner');
                                    setSimLoanSavings('60000');
                                    setSimLoanAmount('150000');
                                    setSimLoanTenureMonths(24);
                                }}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
                            >
                                Owner KES 60,000 (Pass 3x = 180K)
                            </button>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Member Role
                            </label>
                            <select
                                value={simLoanRole}
                                onChange={e => setSimLoanRole(e.target.value as any)}
                                className="w-full px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 font-black text-xs text-white outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="Driver">PSV Driver (Min: KES {loanSettings.roleMinSavingsThresholds.driver.toLocaleString()})</option>
                                <option value="Owner">Vehicle Owner (Min: KES {loanSettings.roleMinSavingsThresholds.owner.toLocaleString()})</option>
                                <option value="Conductor">Conductor (Min: KES {loanSettings.roleMinSavingsThresholds.conductor.toLocaleString()})</option>
                                <option value="Staff">SACCO Staff (Min: KES {loanSettings.roleMinSavingsThresholds.staff.toLocaleString()})</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Current Savings Balance (KES) *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400 font-mono">KES</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={simLoanSavings}
                                    onChange={e => setSimLoanSavings(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800 rounded-xl border border-slate-700 font-black text-xs text-white outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                Desired Borrowing Sum (KES) *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-slate-400 font-mono">KES</span>
                                <input
                                    type="number"
                                    min="1000"
                                    step="1000"
                                    value={simLoanAmount}
                                    onChange={e => setSimLoanAmount(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-slate-800 rounded-xl border border-slate-700 font-black text-xs text-white outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                <span>Repayment Tenure</span>
                                <span className="text-[9px] text-purple-400 font-mono">{simLoanTenureMonths} Months</span>
                            </label>
                            <input
                                type="range"
                                min="1"
                                max={Math.max(24, loanSettings.maxRepaymentMonths)}
                                value={simLoanTenureMonths}
                                onChange={e => setSimLoanTenureMonths(parseInt(e.target.value) || 12)}
                                className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 mt-2"
                            />
                        </div>
                    </div>

                    {/* Live Evaluation Box */}
                    {(() => {
                        const simSavingsVal = parseFloat(simLoanSavings) || 0;
                        const simReqVal = parseFloat(simLoanAmount) || 0;
                        const simElig = computeMemberLoanEligibility(simSavingsVal, simLoanRole, loanSettings);
                        const effectivePrincipal = Math.min(simReqVal, simElig.maxLoanLimit);
                        const simRepayment = calculateLoanRepayment(
                            effectivePrincipal,
                            simLoanTenureMonths,
                            loanSettings.interestRate,
                            loanSettings.interestCalculationMethod,
                            loanSettings.interestRatePeriod
                        );

                        return (
                            <div className="space-y-4 pt-1">
                                {!simElig.isEligible ? (
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-black text-xs uppercase tracking-wider text-rose-400">
                                                DISQUALIFIED: Savings Below Minimum Threshold
                                            </h5>
                                            <p className="text-xs mt-1 leading-relaxed">
                                                A <strong>{simLoanRole}</strong> must have cumulative savings strictly above <strong>KES {simElig.minRequired.toLocaleString()}</strong> to qualify for any loan. Current savings of <strong>KES {simSavingsVal.toLocaleString()}</strong> fall short by <strong className="underline font-bold">KES {simElig.shortfall.toLocaleString()}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h5 className="font-black text-xs uppercase tracking-wider text-emerald-400">
                                                QUALIFIED FOR LOAN: Savings Threshold Attained
                                            </h5>
                                            <p className="text-xs mt-1 leading-relaxed">
                                                {simLoanRole} savings of <strong>KES {simSavingsVal.toLocaleString()}</strong> exceed the KES {simElig.minRequired.toLocaleString()} qualification floor. The member qualifies for up to <strong>{loanSettings.loanMultiplier}x their savings</strong>, yielding a maximum credit ceiling of <strong>KES {simElig.maxLoanLimit.toLocaleString()}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Results Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">1. Max Approved Ceiling</span>
                                        <div className={`text-2xl font-black mt-1 font-mono ${simElig.isEligible ? 'text-purple-400' : 'text-slate-500 line-through'}`}>
                                            KES {simElig.maxLoanLimit.toLocaleString()}
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {simElig.isEligible ? `${loanSettings.loanMultiplier}x Savings Multiplier` : 'Zero Borrowing Power'}
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">2. Monthly Installment (EMI)</span>
                                        <div className="text-2xl font-black text-white mt-1 font-mono">
                                            KES {simRepayment.monthlyInstallment.toLocaleString()}
                                            <span className="text-xs font-normal text-slate-400 ml-1">/ mo</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            Tenure: {simLoanTenureMonths} Months
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">3. Total Interest Levied</span>
                                        <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                                            +KES {simRepayment.totalInterest.toLocaleString()}
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {loanSettings.interestRate}% {loanSettings.interestCalculationMethod === 'reducing_balance' ? 'Reducing Bal.' : 'Flat Rate'}
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-purple-600/30 border border-purple-500/40">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">4. Total Repayment Sum</span>
                                        <div className="text-3xl font-black text-white mt-1 font-mono">
                                            KES {simRepayment.totalRepayment.toLocaleString()}
                                        </div>
                                        <span className="text-[10px] text-purple-300 font-bold uppercase">
                                            Principal: KES {effectivePrincipal.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        );
    };

    const navTabs = [
        { id: 'sacco_savings', label: 'SACCO Savings', subLabel: 'Thrift & Sinking Funds', icon: PiggyBank, show: isSACCO || isSaccoSavings },
        { id: 'sacco_remittance', label: 'Daily Remittance', subLabel: 'Driver Check-off & Penalties', icon: Clock3, show: isSACCO || isSaccoSavings },
        { id: 'sacco_settings', label: 'SACCO Settings', subLabel: 'Remittance Tiers, Loans & Cutoffs', icon: Sliders, show: isSACCO || isSaccoSavings },
        { id: 'sacco', label: 'SACCO Hub', subLabel: 'Member Registry & Licences', icon: Landmark, show: isSACCO || isSaccoSavings },
        { id: 'fleet', label: isSACCO ? 'Vehicle Registry' : isEduTransport ? 'Bus Fleet' : 'Fleet Control', subLabel: 'Fleet Capacity & Live Status', icon: Truck, show: true },
        { id: 'vehicle_reg', label: 'Vehicle Registration', subLabel: 'Add & Onboard Vehicles', icon: Truck, show: true },
        { id: 'manifest', label: isSACCO ? 'Trip Registry' : isShuttle ? 'Route History' : isEduTransport ? 'Student Commute' : 'Cargo Manifest', subLabel: isSACCO ? 'Trips & Stage Dispatches' : 'Manifest & Route Logs', icon: isEduTransport ? MapPin : Package, show: true },
        { id: 'shuttle', label: 'Shuttle Control', subLabel: 'Corporate Staff Boarding', icon: DoorOpen, show: isShuttle },
        { id: 'trips', label: 'School Trips', subLabel: 'Academic Transit & Field Trips', icon: Calendar, show: isEduTransport },
        { id: 'analytics', label: isSACCO ? 'Dividend & Yield' : isShuttle ? 'Commute Data' : isEduTransport ? 'Commute Insights' : 'Route Science', subLabel: 'Performance & Revenue Data', icon: BarChart3, show: true },
        { id: 'alerts',  label: 'Disruption Alerts', subLabel: 'Delays & Route Issues', icon: Bell, show: isEduTransport },
        { id: 'billing', label: 'Transport Billing', subLabel: 'Fee Invoices & Commuter Fares', icon: Receipt, show: isEduTransport },
        { id: 'reports', label: 'Reports & Logs', subLabel: 'Exportable Audit Spreadsheets', icon: FileText, show: true },
        { id: 'epod', label: 'Proof Center', subLabel: 'Digital Delivery Signatures', icon: Signature, show: !isShuttle && !isSACCO && !isEduTransport }
    ].filter(t => t.show);

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 group/logistics">
            {/* Header & Quick Action HUD */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-[2.5rem] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20 text-white shrink-0">
                        {isSaccoSavings ? <PiggyBank className="w-7 h-7" /> : isSACCO ? <Landmark className="w-7 h-7" /> : isShuttle ? <DoorOpen className="w-7 h-7" /> : <Truck className="w-7 h-7" />}
                    </div>
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 rounded-full text-[9px] font-black uppercase tracking-widest mb-1.5">
                            <Shield className="w-3 h-3 text-indigo-500" />
                            <span>{isSaccoSavings ? 'Cooperative Thrift Architecture' : isSACCO ? 'Transport SACCO Management' : 'Fleet & Logistics Control'}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            {isSaccoSavings ? 'SACCO Savings & Transport' : isSACCO ? 'Transport SACCO' : isShuttle ? 'Shuttle Operations' : isEduTransport ? 'School Commute' : 'Fleet & Logistics'} <span className="text-indigo-600">{isSaccoSavings ? 'Treasury' : isSACCO ? 'Hub' : 'Control'}</span>
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 max-w-xl">
                            {isSaccoSavings
                                ? 'Cooperative thrift schemes, member savings accounts, vehicle sinking funds, and 3x loan guarantee collateral.'
                                : isSACCO 
                                ? 'Onboard vehicle owners, manage municipal licenses, track trip commissions, and oversee public online bookings.'
                                : isShuttle 
                                ? 'Corporate & staff mobility management. Track shuttle routes, seat reservations, and staff boarding.' 
                                : isEduTransport
                                ? 'Student pick-up and drop-off coordination, live bus tracking, and field trip administration.'
                                : 'Real-time fleet tracking, automated manifests, and digital proof-of-delivery for modern cargo operations.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {lastSyncedTime && (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="hidden sm:inline">Synced</span> {lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                    {isEduTransport && (
                        <button
                            type="button"
                            onClick={() => setIsOpeningBalancesModalOpen(true)}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-sm transition-all flex items-center gap-2"
                        >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Opening Balances</span>
                        </button>
                    )}
                    <button 
                        type="button"
                        onClick={async () => {
                            await fetchVehiclesList();
                            await syncWithCloud(true);
                        }}
                        disabled={isCloudSyncing}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-2 disabled:opacity-50"
                        title="Synchronize all logistics data, routes, and vehicle registrations with the online database"
                    >
                        <Cloud className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-pulse text-indigo-500' : 'text-emerald-500'}`} />
                        <span>{isCloudSyncing ? 'Syncing...' : 'Sync'}</span>
                    </button>
                    <button 
                        onClick={() => {
                            if (isSaccoSavings || isSACCO) {
                                setIsOnboardMemberModalOpen(true);
                            } else if (isEduTransport) {
                                setIsAddTripModalOpen(true);
                            } else {
                                setActiveTab('vehicle_reg');
                            }
                        }}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/30 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isSaccoSavings || isSACCO ? 'Onboard Member' : isEduTransport ? 'Schedule Trip' : 'Register Vehicle'}</span>
                    </button>
                </div>
            </div>

            {/* Layout: Vertical Menu Sidebar (Left) + Content Workspace (Right) */}
            <div className="flex flex-col lg:flex-row items-start gap-8 w-full text-left">
                {/* Vertical Navigation Menu Sidebar */}
                <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-6 self-start space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-[2.5rem] shadow-sm p-4 sm:p-5">
                        <div className="flex items-center justify-between px-3 py-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Fleet SACCO Menu
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                                {navTabs.length} Modules
                            </span>
                        </div>

                        {/* Vertical Navigation Items */}
                        <nav className="space-y-1.5" aria-label="Fleet SACCO Hub Navigation">
                            {navTabs.map((tab) => {
                                const isCurrent = activeTab === tab.id;
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group text-left cursor-pointer ${
                                            isCurrent
                                                ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-md shadow-indigo-600/25 font-black scale-[1.01]'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white font-bold'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`p-2 rounded-xl transition-all ${
                                                isCurrent 
                                                    ? 'bg-white/20 text-white' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30'
                                            }`}>
                                                <Icon className="w-4 h-4 shrink-0" />
                                            </div>
                                            <div className="min-w-0 truncate">
                                                <div className="text-xs uppercase tracking-wider truncate">
                                                    {tab.label}
                                                </div>
                                                {tab.subLabel && (
                                                    <div className={`text-[10px] font-medium truncate leading-tight ${isCurrent ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {tab.subLabel}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isCurrent && (
                                            <div className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0 ml-2" />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Sidebar Quick Summary Widget */}
                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 px-2 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                <span>Registered Vehicles</span>
                                <span className="font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                                    {dbVehicles.length}
                                </span>
                            </div>
                            {(isSaccoSavings || isSACCO) && (
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    <span>Active Accounts</span>
                                    <span className="font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg">
                                        {saccoAccounts.length}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main Content Workspace (Right Column) */}
                <main className="flex-1 min-w-0 w-full space-y-8">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
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
                                        users={localUsers}
                                        courses={loadedCourses}
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
                        {activeTab === 'sacco_savings' && renderSACCOSavings()}
                        {activeTab === 'sacco_remittance' && renderSACCORemittance()}
                        {activeTab === 'sacco_settings' && renderSACCOSettings()}
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
                                vehicles={dbVehicles}
                                routes={busRoutes}
                                users={users}
                                institutionId={currentInstitution?.id}
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
                                currentInstitution={currentInstitution}
                                users={users}
                                onSaveOpeningBalance={handleSaveOpeningBalance}
                                onImportOpeningBalances={handleImportOpeningBalances}
                                onDeleteOpeningBalance={handleDeleteOpeningBalance}
                            />
                        )}
                        {activeTab === 'reports' && renderReports()}
                    </div>
                </main>
            </div>

            {/* Modal: Transport Opening Balances (B/F Arrears & Advance Importer) */}
            {isOpeningBalancesModalOpen && (
                <TransportOpeningBalancesModal
                    isOpen={isOpeningBalancesModalOpen}
                    onClose={() => setIsOpeningBalancesModalOpen(false)}
                    currentInstitution={currentInstitution}
                    students={resolvedCommuterStudents}
                    routes={busRoutes.map(r => ({ id: r.id, name: r.name }))}
                    routeFeeSettings={routeFeeSetting}
                    existingInvoices={transportInvoices}
                    onSaveOpeningBalance={handleSaveOpeningBalance}
                    onImportOpeningBalances={handleImportOpeningBalances}
                    onDeleteOpeningBalance={handleDeleteOpeningBalance}
                />
            )}

            {/* Modal: Record SACCO Savings Deposit */}
            {isRecordDepositModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative animate-fade-in-up my-8">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <PiggyBank className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Record Savings Deposit</h3>
                                    <p className="text-slate-400 text-xs font-medium">Contribute to vehicle sinking fund or member savings</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsRecordDepositModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordSavingsDeposit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Member Account *
                                </label>
                                <select
                                    required
                                    value={depositAccountId}
                                    onChange={e => {
                                        setDepositAccountId(e.target.value);
                                        const acc = saccoAccounts.find(a => a.id === e.target.value);
                                        if (acc) setDepositCategory(acc.savingsCategory);
                                    }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="" disabled>Select member account...</option>
                                    {saccoAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.memberName} ({acc.vehiclePlate}) - {acc.memberNumber} [{acc.memberRole}]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Savings Scheme / Category *
                                    </label>
                                    <select
                                        value={depositCategory}
                                        onChange={e => setDepositCategory(e.target.value as TransportSaccoSavingsCategory)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Daily Sinking Fund">Daily Sinking Fund</option>
                                        <option value="Member Savings">Member Savings</option>
                                        <option value="Share Capital">Share Capital</option>
                                        <option value="Welfare & Emergency">Welfare & Emergency</option>
                                        <option value="Fleet Expansion">Fleet Expansion</option>
                                        <option value="Holiday Scheme">Holiday Scheme</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Deposit Amount (KES) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        step="1"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        placeholder="e.g. 500"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Payment Method *
                                    </label>
                                    <select
                                        value={depositMethod}
                                        onChange={e => setDepositMethod(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="mpesa">M-PESA Paybill / Till</option>
                                        <option value="daily_deduction">Daily Route Checkoff</option>
                                        <option value="bank">Bank Transfer / EFT</option>
                                        <option value="cash">Cash (Counter)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Reference / M-PESA Code
                                    </label>
                                    <input
                                        type="text"
                                        value={depositRef}
                                        onChange={e => setDepositRef(e.target.value)}
                                        placeholder="e.g. QHK88231LA"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Notes / Narration
                                </label>
                                <input
                                    type="text"
                                    value={depositNotes}
                                    onChange={e => setDepositNotes(e.target.value)}
                                    placeholder="e.g. Daily conductor check-off remittance for morning shift"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsRecordDepositModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Confirm Deposit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Onboard SACCO Member */}
            {isOnboardMemberModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-xl p-6 sm:p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative animate-fade-in-up my-8">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Onboard SACCO Member</h3>
                                    <p className="text-slate-400 text-xs font-medium">Register owner, driver, or conductor with thrift savings account</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOnboardMemberModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleOnboardSaccoMember} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newMemberName}
                                        onChange={e => setNewMemberName(e.target.value)}
                                        placeholder="e.g. Samson Kiprono"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={newMemberPhone}
                                        onChange={e => setNewMemberPhone(e.target.value)}
                                        placeholder="e.g. 0712345678"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Member Role *
                                    </label>
                                    <select
                                        value={newMemberRole}
                                        onChange={e => setNewMemberRole(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Owner">Vehicle Owner</option>
                                        <option value="Driver">PSV Driver</option>
                                        <option value="Conductor">Conductor</option>
                                        <option value="Staff">SACCO Staff</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Vehicle Plate *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newMemberPlate}
                                        onChange={e => setNewMemberPlate(e.target.value.toUpperCase())}
                                        placeholder="e.g. KDL 789B"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Vehicle Model
                                    </label>
                                    <input
                                        type="text"
                                        value={newMemberModel}
                                        onChange={e => setNewMemberModel(e.target.value)}
                                        placeholder="e.g. Isuzu FRR 33-Seater"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Primary Savings Category Scheme *
                                </label>
                                <select
                                    value={newMemberCategory}
                                    onChange={e => setNewMemberCategory(e.target.value as TransportSaccoSavingsCategory)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="Daily Sinking Fund">Daily Sinking Fund (Vehicle Maintenance & Tires)</option>
                                    <option value="Member Savings">Member Savings (Voluntary Dividend-Earning)</option>
                                    <option value="Share Capital">Share Capital (Permanent Membership Equity)</option>
                                    <option value="Welfare & Emergency">Welfare & Emergency (Medical & Legal Relief)</option>
                                    <option value="Fleet Expansion">Fleet Expansion (Chassis & New Bus Acquisition)</option>
                                    <option value="Holiday Scheme">Holiday Scheme (End-Year Festive Payout)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Remittance Tier
                                    </label>
                                    <select
                                        value={newMemberRemittanceTier}
                                        onChange={e => {
                                            const tierName = e.target.value;
                                            setNewMemberRemittanceTier(tierName);
                                            const foundTier = remittanceSettings.tiers.find(t => t.tierName.toLowerCase() === tierName.toLowerCase());
                                            if (foundTier) {
                                                setNewMemberDailyTarget(String(foundTier.dailyTarget));
                                            }
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {remittanceSettings.tiers.map(t => (
                                            <option key={t.id} value={t.tierName}>
                                                {t.tierName} (KES {t.dailyTarget.toLocaleString()}/day)
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Daily Target (KES)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newMemberDailyTarget}
                                        onChange={e => setNewMemberDailyTarget(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Initial Deposit (KES)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newMemberDeposit}
                                        onChange={e => setNewMemberDeposit(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Share Capital (KES)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newMemberShareCapital}
                                        onChange={e => setNewMemberShareCapital(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsOnboardMemberModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 active:scale-95"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Register Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Record Daily Remittance Check-Off */}
            {isRecordRemittanceModalOpen && activeRemittanceDriver && (() => {
                const tierName = activeRemittanceDriver.remittanceTier || 'Silver';
                const tierObj = remittanceSettings.tiers.find(t => t.tierName.toLowerCase() === tierName.toLowerCase()) || remittanceSettings.tiers[0];
                const baseTarget = tierObj ? tierObj.dailyTarget : (activeRemittanceDriver.dailyTarget || 1500);
                const targetDate = remittancePaymentDate || selectedRemittanceDate;
                const paymentDateTime = new Date(`${targetDate}T${remittancePaymentTime || '20:00'}:00`);
                const feeCalc = calculateRemittanceFee(targetDate, paymentDateTime, baseTarget, remittanceSettings);
                const paidVal = parseFloat(remittancePaidAmount) || 0;
                const outstandingBalance = Math.max(0, feeCalc.totalPayable - paidVal);

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-2xl p-6 sm:p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative animate-fade-in-up my-8">
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <Coins className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Record Daily Remittance</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                tierName === 'Gold' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                                tierName === 'Bronze' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                                                'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                            }`}>
                                                {tierName} Tier (KES {baseTarget.toLocaleString()}/day)
                                            </span>
                                        </div>
                                        <p className="text-slate-400 text-xs font-medium">
                                            Vehicle Check-Off & Automated Penalty Assessment
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsRecordRemittanceModalOpen(false);
                                        setActiveRemittanceDriver(null);
                                    }}
                                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Driver Profile Summary Card */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black text-slate-700 dark:text-slate-300 text-sm">
                                        {activeRemittanceDriver.memberName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white">{activeRemittanceDriver.memberName}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                            {activeRemittanceDriver.vehiclePlate} &bull; {activeRemittanceDriver.memberRole} &bull; {activeRemittanceDriver.phoneNumber}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-widest">Base Rate</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white font-mono">KES {baseTarget.toLocaleString()}</span>
                                </div>
                            </div>

                            <form onSubmit={handleSaveRemittanceRecord} className="space-y-5">
                                {/* Date & Timestamp Pickers */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Scheduled Date *
                                        </label>
                                        <div className="relative">
                                            <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="date"
                                                required
                                                value={remittancePaymentDate}
                                                onChange={e => setRemittancePaymentDate(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                            <span>Payment Submission Time *</span>
                                            <span className="text-[9px] text-indigo-500 font-mono">Cutoff: {remittanceSettings.cutoffTime}</span>
                                        </label>
                                        <div className="relative">
                                            <Clock3 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="time"
                                                required
                                                value={remittancePaymentTime}
                                                onChange={e => setRemittancePaymentTime(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Automated Penalty Calculation Breakdown */}
                                <div className={`p-4 rounded-2xl border transition-all ${
                                    feeCalc.isNextDayOverdue
                                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60'
                                        : feeCalc.isLate
                                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                                        : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                                }`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {feeCalc.status === 'on_time' ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                            ) : (
                                                <AlertTriangle className={`w-4 h-4 ${feeCalc.isNextDayOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} />
                                            )}
                                            <span className={`text-xs font-black uppercase tracking-wider ${
                                                feeCalc.status === 'on_time' ? 'text-emerald-700 dark:text-emerald-300' :
                                                feeCalc.isNextDayOverdue ? 'text-rose-700 dark:text-rose-300' :
                                                'text-amber-700 dark:text-amber-300'
                                            }`}>
                                                Automated Rule Evaluation: {feeCalc.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-slate-500">
                                            KES {feeCalc.totalPayable.toLocaleString()} Total
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mb-3">
                                        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Base Tier</span>
                                            <span className="font-black text-slate-800 dark:text-slate-200 font-mono">KES {baseTarget.toLocaleString()}</span>
                                        </div>
                                        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Late Penalty</span>
                                            <span className={`font-black font-mono ${feeCalc.latePenalty > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                                                +{feeCalc.latePenalty > 0 ? `KES ${feeCalc.latePenalty}` : 'KES 0'}
                                            </span>
                                        </div>
                                        <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                                            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Next-Day Delay</span>
                                            <span className={`font-black font-mono ${feeCalc.nextDayPenalty > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                                                +{feeCalc.nextDayPenalty > 0 ? `KES ${feeCalc.nextDayPenalty}` : 'KES 0'}
                                            </span>
                                        </div>
                                        <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-600/20">
                                            <span className="text-[10px] font-black uppercase text-indigo-200 block tracking-wider">Total Payable</span>
                                            <span className="font-black font-mono text-sm">KES {feeCalc.totalPayable.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                                        💡 {feeCalc.ruleMessage}
                                    </p>
                                </div>

                                {/* Payment Collection Fields */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                            <span>Amount Paid (KES) *</span>
                                            <button
                                                type="button"
                                                onClick={() => setRemittancePaidAmount(String(feeCalc.totalPayable))}
                                                className="text-[9px] text-indigo-500 font-bold hover:underline"
                                            >
                                                Fill Full (KES {feeCalc.totalPayable})
                                            </button>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 font-mono">KES</span>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="50"
                                                value={remittancePaidAmount}
                                                onChange={e => setRemittancePaidAmount(e.target.value)}
                                                className="w-full pl-14 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Payment Method *
                                        </label>
                                        <select
                                            value={remittancePaymentMethod}
                                            onChange={e => setRemittancePaymentMethod(e.target.value as any)}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="mpesa">M-PESA Till / Paybill (Instant)</option>
                                            <option value="cash">Cash at SACCO Cashier Desk</option>
                                            <option value="bank">Direct Bank Deposit / RTGS</option>
                                            <option value="daily_deduction">Thrift / Daily Sinking Fund Deduction</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Transaction / Ref Number
                                        </label>
                                        <input
                                            type="text"
                                            value={remittanceRefCode}
                                            onChange={e => setRemittanceRefCode(e.target.value.toUpperCase())}
                                            placeholder="e.g. QHJ8839LM or REM-KDL789B"
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                            Outstanding Deficit / Balance
                                        </label>
                                        <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 font-mono font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                            <span>Remaining Deficit:</span>
                                            <span className={outstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-emerald-600 dark:text-emerald-400 font-black'}>
                                                KES {outstandingBalance.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                        Cashier Remarks / Notes
                                    </label>
                                    <input
                                        type="text"
                                        value={remittanceNotes}
                                        onChange={e => setRemittanceNotes(e.target.value)}
                                        placeholder="e.g. Verified M-PESA confirmation at Stage 1 kiosk"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>

                                {/* Modal Actions */}
                                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsRecordRemittanceModalOpen(false);
                                            setActiveRemittanceDriver(null);
                                        }}
                                        className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Save & Check-Off
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Modal: Add / Edit Remittance Tier */}
            {isAddTierModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-lg p-6 sm:p-8 border border-slate-100 dark:border-slate-700 shadow-2xl relative animate-fade-in-up my-8">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Sliders className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {editingTierId ? 'Edit Remittance Tier' : 'Add Remittance Tier'}
                                    </h3>
                                    <p className="text-slate-400 text-xs font-medium">Configure daily collection target for this vehicle category</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsAddTierModalOpen(false);
                                    setEditingTierId(null);
                                }}
                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTier} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Tier Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newTierName}
                                    onChange={e => setNewTierName(e.target.value)}
                                    placeholder="e.g. Platinum, Super Shuttles"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Daily Target (KES) *
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 font-mono">KES</span>
                                    <input
                                        type="number"
                                        required
                                        min="100"
                                        step="50"
                                        value={newTierTarget}
                                        onChange={e => setNewTierTarget(e.target.value)}
                                        placeholder="e.g. 1800"
                                        className="w-full pl-14 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 font-mono"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">Standard baseline payable before cutoff times.</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Badge Color Theme
                                </label>
                                <select
                                    value={newTierColor}
                                    onChange={e => setNewTierColor(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="slate">Slate / Silver (Standard Matatus)</option>
                                    <option value="amber">Amber / Bronze (Mid-size Vans)</option>
                                    <option value="yellow">Yellow / Gold (Prime / High Capacity)</option>
                                    <option value="indigo">Indigo / Blue (Express Interstate)</option>
                                    <option value="purple">Purple (Luxury Executive)</option>
                                    <option value="emerald">Emerald / Green (Green Fleet / EV)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                                    Tier Description / Fleet Scope
                                </label>
                                <input
                                    type="text"
                                    value={newTierDesc}
                                    onChange={e => setNewTierDesc(e.target.value)}
                                    placeholder="e.g. 14-seater town service vans"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-bold text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddTierModalOpen(false);
                                        setEditingTierId(null);
                                    }}
                                    className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-600/30 active:scale-95"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {editingTierId ? 'Update Tier' : 'Save Tier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

interface Users {
    length: number;
    filter(arg0: (u: any) => boolean): any;
    slice(arg0: number, arg1: number): any[];
}

