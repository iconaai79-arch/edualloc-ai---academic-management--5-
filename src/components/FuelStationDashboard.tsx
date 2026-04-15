import React, { useState } from 'react';
import { 
    Droplet, Fuel, Activity, TrendingUp, AlertTriangle, CheckCircle2, 
    RefreshCcw, ChevronRight, BarChart3, Clock, DollarSign,
    Box, Settings, ArrowRight, ShieldCheck, ShoppingCart, Tag, User, Search, PackageSearch, Plus, Minus, Trash2, CreditCard, Banknote,
    Waves, Wrench, Car, Play, CheckCircle, MapPin, ChevronDown
} from 'lucide-react';
import type { 
    FuelTank, FuelPump, FuelSale, Institution, StationShift, StationItem, 
    StationPosSale, CarwashService, CarServicingPackage, CarwashSale, CarServicingSale, FuelStation
} from '../types';

interface FuelStationDashboardProps {
    institution: Institution;
}

// Mock Data for Demo Purposes
const MOCK_STATIONS: FuelStation[] = [
    { id: 'st1', institutionId: 'TEST', name: 'Nairobi Central Station', location: 'Haile Selassie Ave', contactNumber: '+254711222333', isActive: true },
    { id: 'st2', institutionId: 'TEST', name: 'Westlands Hub', location: 'Waiyaki Way', contactNumber: '+254722333444', isActive: true },
    { id: 'st3', institutionId: 'TEST', name: 'Mombasa Road Expressway', location: 'Near Syokimau', contactNumber: '+254733444555', isActive: true },
];

const MOCK_TANKS: FuelTank[] = [
    { id: '1', institutionId: 'TEST', stationId: 'st1', name: 'Tank 1 - Premium', fuelType: 'Petrol' as any, capacityLiters: 10000, currentLevelLiters: 7500, lastTemperature: 24.2, lowLevelThreshold: 1500, sensorId: 'ATG-P-001', sensorVendor: 'Veeder-Root' },
    { id: '2', institutionId: 'TEST', stationId: 'st1', name: 'Tank 2 - Diesel', fuelType: 'Diesel' as any, capacityLiters: 15000, currentLevelLiters: 3200, lastTemperature: 23.8, lowLevelThreshold: 2000, sensorId: 'ATG-D-002', sensorVendor: 'Veeder-Root' },
    { id: '3', institutionId: 'TEST', stationId: 'st1', name: 'Tank 3 - V-Power', fuelType: 'V-Power' as any, capacityLiters: 5000, currentLevelLiters: 800, lastTemperature: 24.5, lowLevelThreshold: 1000, sensorId: 'ATG-V-003', sensorVendor: 'Veeder-Root' },
    { id: '4', institutionId: 'TEST', stationId: 'st2', name: 'Westlands Tank 1', fuelType: 'Petrol' as any, capacityLiters: 12000, currentLevelLiters: 10000, lastTemperature: 25.1, lowLevelThreshold: 1500, sensorId: 'ATG-W-004', sensorVendor: 'OCIO' },
];

const MOCK_PUMPS: FuelPump[] = [
    { id: 'p1', tankId: '1', stationId: 'st1', pumpNumber: 'Pump 1', nozzleCount: 2, currentTotalizerReading: 24500, status: 'active' },
    { id: 'p2', tankId: '2', stationId: 'st1', pumpNumber: 'Pump 2', nozzleCount: 2, currentTotalizerReading: 18200, status: 'active' },
    { id: 'p3', tankId: '3', stationId: 'st1', pumpNumber: 'Pump 3', nozzleCount: 1, currentTotalizerReading: 5000, status: 'maintenance' },
];

const MOCK_SALES: FuelSale[] = [
    { id: 's1', institutionId: 'TEST', stationId: 'st1', fuelType: 'Petrol', litersSold: 45.5, pricePerLiter: 195.5, totalAmount: 8895.25, paymentMethod: 'mpesa', paymentStatus: 'completed', createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: 's2', institutionId: 'TEST', stationId: 'st1', fuelType: 'Diesel', litersSold: 80.0, pricePerLiter: 180.0, totalAmount: 14400.00, paymentMethod: 'card', paymentStatus: 'completed', createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
    { id: 's3', institutionId: 'TEST', stationId: 'st1', fuelType: 'V-Power', litersSold: 20.0, pricePerLiter: 210.0, totalAmount: 4200.00, paymentMethod: 'cash', paymentStatus: 'completed', createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
];

const MOCK_SHIFTS: StationShift[] = [
    { id: 'sh1', institutionId: 'TEST', stationId: 'st1', attendantName: 'John Kamau', startTime: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), status: 'closed', expectedCash: 125000, actualCash: 124500, discrepancy: -500 },
    { id: 'sh2', institutionId: 'TEST', stationId: 'st1', attendantName: 'Alice Wambui', startTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), status: 'active', expectedCash: 45000, actualCash: 0, discrepancy: 0 },
];

const MOCK_ITEMS: StationItem[] = [
    { id: 'i1', institutionId: 'TEST', stationId: 'st1', name: 'Shell Helix Motor Oil 4L', category: 'lubricant', price: 2500, stockQuantity: 24, lowStockThreshold: 10, isActive: true },
    { id: 'i2', institutionId: 'TEST', stationId: 'st1', name: 'Brake Fluid DOT-4 500ml', category: 'car_care', price: 800, stockQuantity: 15, lowStockThreshold: 5, isActive: true },
    { id: 'i3', institutionId: 'TEST', stationId: 'st1', name: 'Coca Cola 500ml', category: 'drink', price: 100, stockQuantity: 4, lowStockThreshold: 12, isActive: true },
    { id: 'i4', institutionId: 'TEST', stationId: 'st1', name: 'Crisps (Salted) 100g', category: 'snack', price: 150, stockQuantity: 30, lowStockThreshold: 10, isActive: true },
    { id: 'i5', institutionId: 'TEST', stationId: 'st1', name: 'Air Freshener (Pine)', category: 'car_care', price: 450, stockQuantity: 8, lowStockThreshold: 5, isActive: true },
];

const MOCK_CARWASH_SERVICES: CarwashService[] = [
    { id: 'cw1', institutionId: 'TEST', stationId: 'st1', name: 'Body Wash', description: 'Exterior cleaning only', price: 300, estimatedDurationMinutes: 20 },
    { id: 'cw2', institutionId: 'TEST', stationId: 'st1', name: 'Full Wash', description: 'Interior and exterior cleaning', price: 600, estimatedDurationMinutes: 45 },
    { id: 'cw3', institutionId: 'TEST', stationId: 'st1', name: 'Engine Wash', description: 'Deep engine bay cleaning', price: 500, estimatedDurationMinutes: 30 },
    { id: 'cw4', institutionId: 'TEST', stationId: 'st1', name: 'Buffing & Waxing', description: 'Paint protection and shine', price: 1500, estimatedDurationMinutes: 90 },
];

const MOCK_SERVICING_PACKAGES: CarServicingPackage[] = [
    { 
        id: 'cs1', 
        institutionId: 'TEST', 
        stationId: 'st1', 
        name: 'Minor Service', 
        description: 'Oil change, filter replacement, general checkup', 
        price: 3500, 
        estimatedDurationMinutes: 120,
        inventoryItemsRequired: [{ itemId: 'i1', quantity: 1 }] // Uses 1 unit of oil
    },
    { id: 'cs2', institutionId: 'TEST', stationId: 'st1', name: 'Major Service', description: 'Full system check, spark plugs, fluids flush', price: 8500, estimatedDurationMinutes: 240 },
    { id: 'cs3', institutionId: 'TEST', stationId: 'st1', name: 'Tire Rotation & Alignment', description: 'Improve tire longevity and handling', price: 2000, estimatedDurationMinutes: 45 },
];

type TabType = 'overview' | 'tanks' | 'sales' | 'pos' | 'carwash' | 'servicing' | 'reconciliation' | 'fleet' | 'maintenance';

const MOCK_FLEET_ACCOUNTS: FleetAccount[] = [
    { id: 'fa1', institutionId: 'TEST', companyName: 'City Logistics Ltd', contactPerson: 'Jane Doe', creditLimit: 250000, currentBalance: 45200, isActive: true },
    { id: 'fa2', institutionId: 'TEST', companyName: 'Express Cabs', contactPerson: 'Bob Smith', creditLimit: 100000, currentBalance: 88000, isActive: true },
];

const MOCK_PRICE_HISTORY: PriceHistory[] = [
    { id: 'ph1', stationId: 'st1', fuelType: 'Petrol' as any, oldPrice: 192.3, newPrice: 195.5, changedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString() },
    { id: 'ph2', stationId: 'st1', fuelType: 'Diesel' as any, oldPrice: 178.5, newPrice: 180.0, changedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString() },
];

interface CartItem {
    item: StationItem;
    quantity: number;
}

export const FuelStationDashboard: React.FC<FuelStationDashboardProps> = ({ institution }) => {
    const [stations] = useState<FuelStation[]>(MOCK_STATIONS);
    const [selectedStationId, setSelectedStationId] = useState<string>(MOCK_STATIONS[0].id);
    
    const [tanks, setTanks] = useState<FuelTank[]>(MOCK_TANKS);
    const filteredTanks = tanks.filter(t => t.stationId === selectedStationId);
    const filteredPumps = MOCK_PUMPS.filter(p => p.stationId === selectedStationId);
    const filteredSales = MOCK_SALES.filter(s => s.stationId === selectedStationId);
    const filteredShifts = MOCK_SHIFTS.filter(s => s.stationId === selectedStationId);
    const [items, setItems] = useState<StationItem[]>(MOCK_ITEMS);
    const filteredItems = items.filter(i => i.stationId === selectedStationId);
    const filteredCarwashServices = MOCK_CARWASH_SERVICES.filter(s => s.stationId === selectedStationId);
    const filteredServicingPackages = MOCK_SERVICING_PACKAGES.filter(p => p.stationId === selectedStationId);
    
    // Sensor & Commission States
    const [isSyncing, setIsSyncing] = useState(false);
    const [performanceMetrics] = useState({
        avgTransactionTime: '4m 12s',
        accuracyRate: 99.8,
        activeAttendants: 4
    });

    const [assets, setAssets] = useState<StationAsset[]>([
        { id: 'a1', stationId: 'st1', name: 'Wayne Pump #1', assetType: 'Fuel Pump', serialNumber: 'WP-990-22', status: 'operational', healthScore: 92, lastCalibration: '2026-01-15', nextCalibrationDue: '2026-07-15' },
        { id: 'a2', stationId: 'st1', name: 'Atlas Copco GA-11', assetType: 'Compressor', serialNumber: 'AC-112-X', status: 'maintenance', healthScore: 45, lastCalibration: '2025-11-20', nextCalibrationDue: '2026-05-20' },
        { id: 'a3', stationId: 'st1', name: 'Cummins 150kVA', assetType: 'Generator', serialNumber: 'CUM-55-P', status: 'operational', healthScore: 88 }
    ]);

    const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([
        { id: 'm1', assetId: 'a2', issueDescription: 'Abnormal noise in main bearing', technicianName: 'Eng. Peterson', maintenanceCost: 12500, status: 'in_progress', scheduledDate: new Date().toISOString() }
    ]);

    const [financialReports, setFinancialReports] = useState<FinancialReport[]>([
        { id: 'rep1', stationId: 's1', institutionId: 'inst1', reportType: 'daily', totalSales: 245600, totalTax: 39296, totalCommission: 4912, netProfit: 201392, periodStart: new Date().toISOString(), periodEnd: new Date().toISOString() }
    ]);

    const [attendantCommissions, setAttendantCommissions] = useState<Record<string, number>>({
        'sh1': 1250,
        'sh2': 450
    });

    const syncSensors = async () => {
        setIsSyncing(true);
        await new Promise(r => setTimeout(r, 2000));
        setTanks(prev => prev.map(t => ({
            ...t,
            lastTemperature: +(t.lastTemperature! + (Math.random() - 0.5)).toFixed(1),
            currentLevelLiters: +(t.currentLevelLiters + (Math.random() * 20 - 10)).toFixed(0)
        })));
        setIsSyncing(false);
        alert('Sensor Integration: Successfully pulled live ATG data from Veeder-Root/OCIO terminals.');
    };

    const [fleetAccounts, setFleetAccounts] = useState<FleetAccount[]>(MOCK_FLEET_ACCOUNTS);
    const [priceHistory, setPriceHistory] = useState<PriceHistory[]>(MOCK_PRICE_HISTORY);

    const updateFuelPrice = (fuelType: string, newPrice: number) => {
        const oldPrice = 195.5; // Demo logic
        const historyEntry: PriceHistory = {
            id: `ph_${Date.now()}`,
            stationId: selectedStationId,
            fuelType: fuelType as any,
            oldPrice,
            newPrice,
            changedAt: new Date().toISOString()
        };
        setPriceHistory([historyEntry, ...priceHistory]);
        alert(`Pricing Strategy Updated: ${fuelType} is now KES ${newPrice}. Fleet accounts notified.`);
    };

    const [isFleetVerifying, setIsFleetVerifying] = useState(false);

    const validateGeofence = (cardId: string): boolean => {
        // Mock GPS Validation
        const card = fleetCards.find(c => c.id === cardId);
        if (!card?.geofenceEnabled) return true;
        
        // Simulating a "Good" GPS hit for demo
        const isMatch = Math.random() > 0.1; 
        if (!isMatch) {
            sendSMS('0712345678', `ALERT: Geofence violation for Card ${card.cardNumber}. Vehicle attempted fueling outside authorized zone.`, 'fleet_alert');
        }
        return isMatch;
    };

    const verifyFleetCard = async (cardNumber: string) => {
        setIsFleetVerifying(true);
        await new Promise(r => setTimeout(r, 1500));
        setIsFleetVerifying(false);
        const card = fleetCards.find(c => c.cardNumber === cardNumber);
        const account = fleetAccounts.find(a => a.id === card?.fleetAccountId);
        
        if (card && account) {
            const isGeofenceOk = validateGeofence(card.id!);
            if (!isGeofenceOk) {
                alert(`DENIED: Geofence violation. Vehicle is outside authorized zone.`);
                return;
            }
            alert(`Card Verified: ${account.companyName}\nVehicle: ${card.vehiclePlate}\nCredit Limit: KES ${account.creditLimit.toLocaleString()}\nCurrent Balance: KES ${account.creditBalance.toLocaleString()}`);
        } else {
            alert('Error: Card not recognized by network.');
        }
    };
    const [isAttendantMode, setIsAttendantMode] = useState(false);
    const [isGeneratingETR, setIsGeneratingETR] = useState(false);

    const generateETRReceipt = async (saleId: string) => {
        setIsGeneratingETR(true);
        await new Promise(r => setTimeout(r, 1200));
        setIsGeneratingETR(false);
        const etrNumber = `KRA-RECP-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        alert(`KRA ETR Integrated: Receipt Generated Successfully!\nCU Number: ${etrNumber}\nVAT (16%): Calculated & Filed.`);
        return etrNumber;
    };

    const [smsLogs, setSmsLogs] = useState<SMSLog[]>([]);
    const [inventoryPredictions, setInventoryPredictions] = useState<ReorderPrediction[]>([
        { id: 'p1', tankId: 't1', predictedDepletionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), recommendedOrderDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1).toISOString(), recommendedQuantity: 8000, confidenceScore: 0.94 }
    ]);

    const sendSMS = (phone: string, message: string, type: 'loyalty' | 'fleet_alert' | 'inventory_alert') => {
        const newLog: SMSLog = {
            id: `sms_${Date.now()}`,
            institutionId: 'TEST',
            recipientPhone: phone,
            messageBody: message,
            msgType: type,
            status: 'sent',
            createdAt: new Date().toISOString()
        };
        setSmsLogs([newLog, ...smsLogs]);
        console.log(`SMS Sent to ${phone}: ${message}`);
    };
    const [paymentMethod, setPaymentMethod] = useState<'cash'|'mpesa'|'card'>('cash');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [posSearchQuery, setPosSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [subTab, setSubTab] = useState<'inventory' | 'loyalty'>('inventory');

    const MOCK_REWARDS = [
        { id: 'r1', name: 'Free Carwash (Full)', points: 1000, type: 'carwash' },
        { id: 'r2', name: 'Free Coffee & Snacks', points: 300, type: 'pos' },
        { id: 'r3', name: '5% Fuel Discount', points: 5000, type: 'fuel' },
    ];

    const redeemPoints = (plate: string, rewardId: string) => {
        const reward = MOCK_REWARDS.find(r => r.id === rewardId);
        if (!reward) return;

        const current = customerPoints[plate] || 0;
        if (current < reward.points) {
            alert(`Insufficient points! ${plate} has ${current} pts but needs ${reward.points} pts.`);
            return;
        }

        setCustomerPoints(prev => ({
            ...prev,
            [plate]: current - reward.points
        }));
        alert(`Redemption Successful!\n${reward.name} awarded to ${plate}.\nNew Balance: ${current - reward.points} pts`);
    };

    const lowStockItems = filteredItems.filter(i => i.stockQuantity <= i.lowStockThreshold);

    const [activeCarwashSales, setActiveCarwashSales] = useState<Partial<CarwashSale>[]>([
        { id: 'cw_s1', stationId: 'st1', vehiclePlate: 'KDJ 123A', serviceId: 'cw2', status: 'in_progress', totalAmount: 600 },
        { id: 'cw_s2', stationId: 'st1', vehiclePlate: 'KCC 999Z', serviceId: 'cw1', status: 'pending', totalAmount: 300 },
    ]);

    const [activeServicingSales, setActiveServicingSales] = useState<Partial<CarServicingSale>[]>([
        { 
            id: 'cs_s1', 
            stationId: 'st1', 
            vehiclePlate: 'KAA 001B', 
            vehicleModel: 'Toyota Hilux', 
            packageId: 'cs2', 
            status: 'in_progress', 
            totalAmount: 8500,
            odometerReading: 124500,
            serviceIntervalKm: 5000,
            nextServiceOdometer: 129500
        },
        { 
            id: 'cs_s2', 
            stationId: 'st1', 
            vehiclePlate: 'KBZ 555C', 
            vehicleModel: 'Subaru Impreza', 
            packageId: 'cs1', 
            status: 'pending', 
            totalAmount: 3500,
            odometerReading: 88200,
            serviceIntervalKm: 5000,
            nextServiceOdometer: 93200
        },
    ]);

    const [serviceHistory] = useState<Partial<CarServicingSale>[]>([
        { id: 'h1', vehiclePlate: 'KAA 001B', packageId: 'cs1', odometerReading: 119500, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 3).toISOString(), notes: 'Engine oil changed to Shell Helix v-Power' },
        { id: 'h2', vehiclePlate: 'KAA 001B', packageId: 'cs3', odometerReading: 115000, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6).toISOString(), notes: 'Tire rotation and alignment' },
        { id: 'h3', vehiclePlate: 'KBZ 555C', packageId: 'cs1', odometerReading: 83200, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), notes: 'Standard oil change' },
    ]);

    const [historySearchQuery, setHistorySearchQuery] = useState('');

    const [customerPoints, setCustomerPoints] = useState<Record<string, number>>({
        'KAA 001B': 1200,
        'KBZ 555C': 450
    });

    const [leakAlerts, setLeakAlerts] = useState<LeakAlert[]>([
        { id: 'leak1', tankId: 't1', stationId: 's1', varianceLiters: 12.5, severity: 'medium', status: 'open', detectedAt: new Date().toISOString() }
    ]);
    const [staffAchievements, setStaffAchievements] = useState<StaffAchievement[]>([
        { id: 'ac1', userId: 'u1', achievementType: 'Speed Demon', pointsAwarded: 50, badgeName: 'Fast Filler', createdAt: new Date().toISOString() }
    ]);

    const runLeakAudit = (tankId: string) => {
        // Mock IoT Audit: Compare Tank Drop vs Sum of Sales
        const variance = Math.random() * 5;
        if (variance > 3) {
            const newLeak: LeakAlert = {
                id: `leak_${Date.now()}`,
                tankId,
                stationId: selectedStationId,
                varianceLiters: parseFloat(variance.toFixed(2)),
                severity: variance > 8 ? 'critical' : 'medium',
                status: 'open',
                detectedAt: new Date().toISOString()
            };
            setLeakAlerts([newLeak, ...leakAlerts]);
            sendSMS('0712345678', `CRITICAL: IoT sensors detected a ${variance.toFixed(1)}L variance in Tank ${tankId}. Possible underground leak.`, 'inventory_alert');
        } else {
            alert('IoT Audit Complete: No significant leakage detected.');
        }
    };

    const updateOdometer = (saleId: string, reading: number) => {
        setActiveServicingSales(prev => prev.map(s => {
            if (s.id === saleId) {
                const interval = s.serviceIntervalKm || 5000;
                return { 
                    ...s, 
                    odometerReading: reading, 
                    nextServiceOdometer: reading + interval 
                };
            }
            return s;
        }));
    };

    const completeService = (saleId: string) => {
        const sale = activeServicingSales.find(s => s.id === saleId);
        if (!sale) return;

        const pkg = filteredServicingPackages.find(p => p.id === sale.packageId);
        
        // 1. Deduct Inventory
        if (pkg?.inventoryItemsRequired) {
            setItems(prev => prev.map(item => {
                const required = pkg.inventoryItemsRequired?.find(r => r.itemId === item.id);
                if (required) {
                    return { ...item, stockQuantity: item.stockQuantity - required.quantity };
                }
                return item;
            }));
        }

        // 2. Award Points (e.g. 1 point for every 10 KES)
        const pointsEarned = Math.floor(sale.totalAmount! / 10);
        if (sale.vehiclePlate) {
            setCustomerPoints(prev => ({
                ...prev,
                [sale.vehiclePlate!]: (prev[sale.vehiclePlate!] || 0) + pointsEarned
            }));
        }

        // 3. Mark as completed
        setActiveServicingSales(prev => prev.filter(s => s.id !== saleId));
        alert(`Service Completed!\nInventory Deducted.\n${pointsEarned} Loyalty Points awarded to ${sale.vehiclePlate}`);
    };

    const [showTransferModal, setShowTransferModal] = useState(false);
    
    const executeFuelTransfer = (sourceTankId: string, destTankId: string, amount: number) => {
        const sourceTank = tanks.find(t => t.id === sourceTankId);
        const destTank = tanks.find(t => t.id === destTankId);

        if (!sourceTank || !destTank) return;
        if (sourceTank.currentLevelLiters < amount) {
            alert(`Transfer Failed! Source tank ${sourceTank.name} only has ${sourceTank.currentLevelLiters}L.`);
            return;
        }
        if (sourceTank.fuelType !== destTank.fuelType) {
            alert(`Transfer Failed! Fuel type mismatch (${sourceTank.fuelType} vs ${destTank.fuelType}).`);
            return;
        }

        setTanks(prev => prev.map(t => {
            if (t.id === sourceTankId) return { ...t, currentLevelLiters: t.currentLevelLiters - amount };
            if (t.id === destTankId) return { ...t, currentLevelLiters: t.currentLevelLiters + amount };
            return t;
        }));

        alert(`Fuel Transfer Successful!\n${amount}L of ${sourceTank.fuelType} moved from ${stations.find(s => s.id === sourceTank.stationId)?.name} to ${stations.find(s => s.id === destTank.stationId)?.name}.`);
        setShowTransferModal(false);
    };

    const [dipHistory, setDipHistory] = useState<any[]>([
        { id: 'd1', tankId: 't1', systemLevel: 12500, manualLevel: 12495, variance: -5, createdAt: new Date().toISOString() }
    ]);

    const executeManualDip = (tankId: string, manualReading: number) => {
        const tank = tanks.find(t => t.id === tankId);
        if (!tank) return;

        const variance = manualReading - tank.currentLevelLiters;
        
        const newDip = {
            id: `dip_${Date.now()}`,
            tankId,
            systemLevel: tank.currentLevelLiters,
            manualLevel: manualReading,
            variance,
            createdAt: new Date().toISOString()
        };

        setDipHistory([newDip, ...dipHistory]);
        
        // Optionally update the system reading to match the physical reality
        setTanks(prev => prev.map(t => t.id === tankId ? { ...t, currentLevelLiters: manualReading } : t));

        if (Math.abs(variance) > 50) {
            alert(`⚠️ WARNING: Significant Variance Detected!\nVariance: ${variance}L\nPotential leak or evaporation issue flagged.`);
        } else {
            alert(`Manual Dip Logged.\nVariance: ${variance}L recorded.`);
        }
    };

    const getFuelColor = (type: string) => {
        switch(type) {
            case 'Petrol': return 'bg-emerald-500';
            case 'Diesel': return 'bg-blue-600';
            case 'V-Power': return 'bg-rose-500';
            case 'Kerosene': return 'bg-amber-500';
            default: return 'bg-slate-500';
        }
    };

    const getFuelColorText = (type: string) => {
        switch(type) {
            case 'Petrol': return 'text-emerald-500';
            case 'Diesel': return 'text-blue-600';
            case 'V-Power': return 'text-rose-500';
            case 'Kerosene': return 'text-amber-500';
            default: return 'text-slate-500';
        }
    };

    // --- POS Logic ---
    const addToCart = (product: StationItem) => {
        setCart(prev => {
            const existing = prev.find(p => p.item.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stockQuantity) return prev;
                return prev.map(p => p.item.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, { item: product, quantity: 1 }];
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => prev.map(p => {
             if (p.item.id === itemId) {
                 const newQty = p.quantity + delta;
                 return newQty > 0 && newQty <= p.item.stockQuantity ? { ...p, quantity: newQty } : p;
             }
             return p;
        }));
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(p => p.item.id !== itemId));
    };

    const cartTotal = cart.reduce((sum, p) => sum + (p.item.price * p.quantity), 0);

    const handleCheckout = () => {
        if (cart.length === 0) return;
        setIsCheckingOut(true);
        setTimeout(() => {
            setItems(prevItems => prevItems.map(inventoryItem => {
                const cartMatch = cart.find(c => c.item.id === inventoryItem.id);
                if (cartMatch) {
                    return { ...inventoryItem, stockQuantity: inventoryItem.stockQuantity - cartMatch.quantity };
                }
                return inventoryItem;
            }));
            setCart([]);
            setIsCheckingOut(false);
            
            // Trigger Loyalty SMS
            sendSMS('0712345678', `Thank you for fueling at ${currentStation.name}! KES ${cartTotal.toLocaleString()} spent. You earned 24 points. Current balance: 450 pts.`, 'loyalty');
            
            alert(`Sale Completed at ${currentStation.name}!\nTotal: KES ${cartTotal.toLocaleString()}\nMethod: ${paymentMethod.toUpperCase()}`);
        }, 800);
    };

    const renderTankLevel = (tank: FuelTank) => {
        const percentage = Math.round((tank.currentLevelLiters / tank.capacityLiters) * 100);
        const isLow = tank.currentLevelLiters <= tank.lowLevelThreshold;
        
        return (
            <div key={tank.id} className="relative p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Droplet className={`w-24 h-24 ${getFuelColorText(tank.fuelType)} transform rotate-12 translate-x-4`} />
                </div>
                
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-lg">{tank.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-opacity-10 dark:bg-opacity-20 ${getFuelColorText(tank.fuelType)} ${getFuelColor(tank.fuelType).replace('bg-', 'bg-').split('-')[0]}-50`}>
                                {tank.fuelType}
                            </span>
                            {tank.lastTemperature && (
                                <span className="flex items-center text-[10px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                    <Activity className="w-2.5 h-2.5 mr-1" />
                                    {tank.lastTemperature}°C
                                </span>
                            )}
                        </div>
                    </div>
                    {isLow && (
                        <span className="flex items-center text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full animate-pulse uppercase tracking-widest">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                            Low
                        </span>
                    )}
                </div>

                <div className="flex items-end space-x-2 mb-2">
                    <span className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                        {tank.currentLevelLiters.toLocaleString()}
                    </span>
                    <span className="text-slate-500 font-medium mb-1">/ {tank.capacityLiters.toLocaleString()} L</span>
                </div>

                <div className="mt-4 relative h-4 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${getFuelColor(tank.fuelType)} ${isLow ? 'animate-pulse' : ''}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                
                <div className="flex justify-between mt-3 mb-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Level</span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{percentage}% Capacity</span>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-50 dark:border-slate-700/50 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sensor: {tank.sensorId}</span>
                    </div>
                    <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">{tank.sensorVendor}</span>
                </div>
            </div>
        );
    };

    const [showDipModal, setShowDipModal] = useState<string | null>(null);

    return (
        <div className="w-full h-full flex flex-col pt-6 pb-20 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-30">
                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
                    <div className="absolute top-20 -left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                            <Fuel className="w-6 h-6 text-indigo-300" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight flex items-center">
                                Station Command
                            </h1>
                            <p className="text-indigo-200/80 font-medium mt-1 ml-1 flex items-center">
                                {institution.name} <ChevronRight className="w-4 h-4 mx-1 opacity-50" /> Live
                            </p>
                        </div>
                    </div>

                    {/* Station Selector */}
                    <div className="relative group">
                        <select 
                            value={selectedStationId}
                            onChange={(e) => setSelectedStationId(e.target.value)}
                            className="appearance-none bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 pr-12 font-bold text-white outline-none transition-all cursor-pointer min-w-[240px]"
                        >
                            {stations.map(st => (
                                <option key={st.id} value={st.id} className="text-slate-900">{st.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none group-hover:text-white transition-colors" />
                        <div className="flex items-center mt-2 ml-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                            <span className="text-xs font-semibold text-indigo-200/70">{currentStation.location}</span>
                        </div>
                    </div>
                </div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 mt-4 md:mt-0">
                    <button 
                         onClick={() => setIsAttendantMode(!isAttendantMode)}
                         className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all scale-100 hover:scale-105 active:scale-95 flex items-center gap-3 ${isAttendantMode ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'bg-white/10 text-indigo-200 border border-white/10 backdrop-blur-md'}`}
                    >
                        {isAttendantMode ? <Smartphone className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        {isAttendantMode ? 'Attendant Mode ACTIVE' : 'Admin: Management'}
                    </button>

                    <div className="h-10 w-px bg-white/10 hidden md:block" />

                    <div className="flex flex-col items-end">
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fiscal Status</div>
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-sm font-black text-white">KRA ETR ONLINE</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-Navigation (Hidden in Attendant Mode) */}
            {!isAttendantMode && (
                <div className="flex p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm w-fit overflow-x-auto max-w-full hide-scrollbar">
                    {[
                        { id: 'overview', icon: Activity, label: 'Overview' },
                        { id: 'tanks', icon: Box, label: 'Tank Levels' },
                        { id: 'pos', icon: ShoppingCart, label: 'POS & Store' },
                        { id: 'carwash', icon: Waves, label: 'Carwash' },
                        { id: 'servicing', icon: Wrench, label: 'Servicing' },
                        { id: 'finance', icon: TrendingUp, label: 'Finance' },
                        { id: 'maintenance', icon: Wrench, label: 'Assets/Maintenance' },
                        { id: 'reconciliation', icon: Clock, label: 'Shift Recon' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center whitespace-nowrap px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 ${
                                activeTab === tab.id
                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                        >
                            <tab.icon className="w-4 h-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ATTENDANT MOBILE DASHBOARD (CONDITIONAL) */}
            {isAttendantMode && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500 max-w-lg mx-auto w-full">
                    {/* Active Pump Control */}
                    <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl">
                         <div className="flex justify-between items-center mb-6">
                              <h3 className="font-black text-lg flex items-center gap-2">
                                  <Fuel className="w-5 h-5 text-indigo-400" />
                                  Active Pump: PUMP-01
                              </h3>
                              <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-1 rounded truncate">READY</span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3 mb-6">
                             {['Petrol', 'Diesel'].map(type => (
                                 <button key={type} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center hover:bg-white/10 transition-colors">
                                     <span className="text-[10px] font-black uppercase text-indigo-300 mb-1">{type}</span>
                                     <span className="text-sm font-black">KES 195.50</span>
                                 </button>
                             ))}
                         </div>

                         <div className="space-y-4">
                             <div>
                                 <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">Plate Number</label>
                                 <input type="text" placeholder="KAA 001B" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                             </div>
                             <button className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                                 Authorize Transaction
                             </button>
                         </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                             <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
                             <p className="text-[10px] font-black text-slate-400 uppercase">My Shift Sales</p>
                             <p className="text-lg font-black text-slate-800 dark:text-white">KES 42,500</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                             <Activity className="w-5 h-5 text-indigo-500 mb-2" />
                             <p className="text-[10px] font-black text-slate-400 uppercase">Commission</p>
                             <p className="text-lg font-black text-slate-800 dark:text-white">KES 840.00</p>
                        </div>
                    </div>

                    {/* Recent Mobile Logs */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50">
                         <h4 className="font-black text-sm mb-4">Recent Logged Sales</h4>
                         <div className="space-y-3">
                             {[1, 2, 3].map(i => (
                                 <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                                              <CheckCircle className="w-4 h-4 text-indigo-500" />
                                          </div>
                                          <div>
                                              <p className="text-xs font-black">KAA 88{i}L</p>
                                              <p className="text-[9px] text-slate-500 font-bold uppercase">12.5L Petrol • MPESA</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                           <p className="text-xs font-black">KES 2,443</p>
                                           <p className="text-[8px] text-emerald-500 font-black">ETR SENT</p>
                                      </div>
                                 </div>
                             ))}
                         </div>
                    </div>
                </div>
            )}

            {/* MANAGEMENT TABS (Hidden in Attendant Mode) */}
            {!isAttendantMode && activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { title: 'Today\'s Sales', value: 'KES 245,600', sub: '+12% vs yesterday', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                            { title: 'POS Revenue', value: 'KES 18,400', sub: 'Shop items & Car Care', icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                            { title: 'Carwash Queue', value: '5 Vehicles', sub: '3 in progress', icon: Waves, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                            { title: 'Service Bay', value: '2 Active', sub: '1 minor, 1 major', icon: Wrench, color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${stat.bg}`}>
                                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                </div>
                                <h4 className="text-slate-500 dark:text-slate-400 font-semibold text-sm">{stat.title}</h4>
                                <div className="text-2xl font-black text-slate-800 dark:text-white mt-1 mb-1">{stat.value}</div>
                                <div className="text-xs font-medium text-slate-500">{stat.sub}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="col-span-1 lg:col-span-2 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
                                    <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
                                    Live Tank Monitoring ({currentStation.name})
                                </h2>
                                <button 
                                    onClick={syncSensors}
                                    disabled={isSyncing}
                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs flex items-center hover:bg-indigo-100 transition-all border border-indigo-100 dark:border-indigo-500/20"
                                >
                                    {isSyncing ? <RefreshCcw className="w-3 h-3 mr-2 animate-spin" /> : <RefreshCcw className="w-3 h-3 mr-2" />}
                                    Sync Sensors
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredTanks.length > 0 ? (
                                    filteredTanks.map(renderTankLevel)
                                ) : (
                                    <div className="col-span-full p-12 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center text-slate-400">
                                        <Box className="w-10 h-10 mb-2 opacity-20" />
                                        <p className="font-bold">No tanks registered for this station</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-span-1 space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
                                    <Clock className="w-5 h-5 mr-2 text-indigo-500" />
                                    Recent Activity
                                </h2>
                            </div>
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-4 h-full">
                                <div className="space-y-4">
                                    {filteredSales.map((sale) => (
                                        <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-2xl transition-colors">
                                            <div className="flex items-center">
                                                <div className={`w-2 h-2 rounded-full mr-3 ${getFuelColor(sale.fuelType)}`} />
                                                <div>
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white">
                                                        {sale.litersSold}L {sale.fuelType}
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-500">
                                                        {new Date(sale.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {sale.paymentMethod.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-sm text-slate-800 dark:text-white">
                                                    KES {sale.totalAmount.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredSales.length === 0 && <p className="text-center text-slate-400 py-10 font-bold text-sm">No recent transactions</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DYNAMIC PRICING SECTION */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-5">
                            <TrendingUp className="w-32 h-32 text-indigo-500" />
                        </div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Pricing Strategy</h2>
                                <p className="text-slate-500 font-bold text-sm">Automated market-trend adjustments and corporate rates.</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black flex items-center border border-emerald-100/50">
                                    <ShieldCheck className="w-3 h-3 mr-2" /> Live Market Sync
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                            {['Petrol', 'Diesel', 'V-Power'].map(type => (
                                <div key={type} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700/30">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{type}</span>
                                        <div className="flex items-center text-emerald-500 font-black text-[10px]">
                                            <TrendingUp className="w-3 h-3 mr-1" /> +2.5%
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2 mb-4">
                                        <span className="text-3xl font-black text-slate-800 dark:text-white">195.50</span>
                                        <span className="text-slate-400 font-bold text-xs mb-1">KES/L</span>
                                    </div>
                                    <button 
                                        onClick={() => updateFuelPrice(type, 198.0)}
                                        className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
                                    >
                                        Update Strategy
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FUEL TANKS TAB */}
            {activeTab === 'tanks' && (
                <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                            <Box className="w-6 h-6 mr-3 text-indigo-500" />
                            Storage & Levels
                        </h2>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowTransferModal(true)}
                                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all flex items-center gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" /> Inter-Station Transfer
                            </button>
                            <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all">
                                + Log Delivery
                            </button>
                        </div>
                    </div>

                    {/* Transfer Modal/Overlay */}
                    {showTransferModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">Inter-Station Fuel Transfer</h3>
                                    <p className="text-slate-500 font-bold text-sm">Transfer fuel between physical locations or tanks.</p>
                                </div>
                                
                                <form className="p-8 space-y-6" onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    executeFuelTransfer(
                                        formData.get('sourceTank') as string,
                                        formData.get('destTank') as string,
                                        Number(formData.get('amount'))
                                    );
                                }}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Source Tank</label>
                                            <select name="sourceTank" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none">
                                                {tanks.map(t => (
                                                    <option key={t.id} value={t.id}>{stations.find(s => s.id === t.stationId)?.name} - {t.name} ({t.currentLevelLiters}L)</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Destination Tank</label>
                                            <select name="destTank" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold outline-none">
                                                {tanks.map(t => (
                                                    <option key={t.id} value={t.id}>{stations.find(s => s.id === t.stationId)?.name} - {t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Transfer Amount (Liters)</label>
                                        <input 
                                            name="amount"
                                            type="number" 
                                            required 
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-2xl outline-none focus:ring-4 focus:ring-indigo-500/10"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button 
                                            type="button"
                                            onClick={() => setShowTransferModal(false)}
                                            className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 shadow-xl shadow-indigo-500/20"
                                        >
                                            Execute Transfer
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Manual Dip Modal */}
                    {showDipModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-8">
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Log Manual Dip</h3>
                                <p className="text-slate-500 font-bold text-sm mb-6">
                                    Tank: {tanks.find(t => t.id === showDipModal)?.name}
                                </p>
                                
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    executeManualDip(showDipModal, Number(formData.get('reading')));
                                    setShowDipModal(null);
                                }}>
                                    <div className="relative mb-6">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">L</div>
                                        <input 
                                            name="reading"
                                            type="number"
                                            required
                                            className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-2xl outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setShowDipModal(null)}
                                            className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold"
                                        >
                                            Save Reading
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {tanks.filter(t => t.stationId === selectedStationId).map(tank => (
                            <div key={tank.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-3 rounded-2xl ${getFuelColor(tank.fuelType).split(' ')[0]} text-white`}>
                                            <Waves className="w-5 h-5 font-black" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">{tank.fuelType}</div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tank.name}</div>
                                        </div>
                                    </div>
                                    {renderFuelLevelIndicator(tank)}
                                    <div className="grid grid-cols-2 gap-2 mt-6">
                                        <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-2xl flex flex-col justify-center">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">Stock</span>
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                                                {tank.currentLevelLiters.toLocaleString()} L
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => setShowDipModal(tank.id)}
                                            className="p-3 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-600 rounded-2xl flex flex-col items-center justify-center transition-all group/btn"
                                        >
                                            <ArrowDownToLine className="w-4 h-4 mb-1 group-hover/btn:translate-y-0.5 transition-transform" />
                                            <span className="text-[9px] font-black uppercase tracking-tighter">Manual Dip</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Variance Timeline */}

                    {/* PREDICTIVE INVENTORY INTELLIGENCE */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-10">
                            <BrainCircuit className="w-32 h-32" />
                        </div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black flex items-center gap-3">
                                    <ShieldCheck className="w-6 h-6 text-indigo-400" />
                                    Replenishment AI
                                </h3>
                                <p className="text-slate-400 font-bold text-sm">Predictive logistics based on historical consumption & supply lead times.</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-xl text-xs font-black border border-indigo-500/30">
                                    Status: ANALYZING SENSORS
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            {inventoryPredictions.map(pred => (
                                <div key={pred.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                                                <History className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="text-lg font-black text-indigo-100 italic">
                                                    {tanks.find(t => t.id === pred.tankId)?.name} (Petrol)
                                                </div>
                                                <div className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Prediction Confidence: {(pred.confidenceScore * 100).toFixed(0)}%</div>
                                            </div>
                                        </div>
                                        <span className="bg-red-500/20 text-red-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Critical Order Window</span>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Depletion</p>
                                            <p className="text-sm font-black text-white">{new Date(pred.predictedDepletionDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                        <div className="text-center border-x border-white/5">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Recommended Order</p>
                                            <p className="text-sm font-black text-indigo-400">{new Date(pred.recommendedOrderDate).toLocaleDateString([], { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Order Vol</p>
                                            <p className="text-sm font-black text-white">{pred.recommendedQuantity.toLocaleString()} L</p>
                                        </div>
                                    </div>

                                    <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                                        <Truck className="w-4 h-4" /> Generate Purchase Order
                                    </button>
                                </div>
                            ))}
                            
                            {/* SMS Logs / Notifications Sidebar */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h4 className="font-black text-sm mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                                    Communication Pipeline
                                </h4>
                                <div className="space-y-3">
                                    {smsLogs.slice(0, 3).map(log => (
                                        <div key={log.id} className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                 <div className={`w-1.5 h-1.5 rounded-full ${log.msgType === 'inventory_alert' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                 <div>
                                                     <p className="text-[10px] font-black">{log.recipientPhone}</p>
                                                     <p className="text-[9px] text-slate-500 font-bold uppercase truncate max-w-[150px]">{log.messageBody}</p>
                                                 </div>
                                            </div>
                                            <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase">SENT</span>
                                        </div>
                                    ))}
                                    {smsLogs.length === 0 && <p className="text-[10px] font-bold text-slate-600 italic">No recent messages sent.</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HSE & IOT LEAK MONITOR */}
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border-2 border-slate-100 dark:border-slate-700 shadow-xl relative overflow-hidden">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                    <ShieldAlert className="w-5 h-5 text-red-500" />
                                    Environmental & HSE Compliance
                                </h3>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-tight">IoT Leak Detection (Sensor vs Sales Auto-Reconciliation)</p>
                            </div>
                            <button 
                                onClick={() => runLeakAudit('t1')}
                                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" /> Run IoT Audit
                            </button>
                        </div>

                        <div className="space-y-4">
                            {leakAlerts.map(alert => (
                                <div key={alert.id} className={`p-5 rounded-3xl border flex items-center justify-between ${alert.severity === 'critical' ? 'bg-red-50 border-red-100 text-red-900' : 'bg-amber-50 border-amber-100 text-amber-900'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${alert.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                                            <AlertTriangle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-black text-lg">Potential {alert.severity.toUpperCase()} Variance</div>
                                            <div className="text-xs font-bold opacity-70">
                                                Tank: {tanks.find(t => t.id === alert.tankId)?.name} • Detected: {new Date(alert.detectedAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black">-{alert.varianceLiters} L</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Variance vs Sensors</div>
                                    </div>
                                </div>
                            ))}
                            {leakAlerts.length === 0 && (
                                <div className="text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-slate-500 font-bold">Environmental Integrity: SECURE</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* POS STORE TAB */}
            {activeTab === 'pos' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px]">
                    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                        <button 
                            onClick={() => setSubTab('inventory')}
                            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${subTab === 'inventory' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500'}`}
                        >
                            Inventory
                        </button>
                        <button 
                            onClick={() => setSubTab('loyalty')}
                            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${subTab === 'loyalty' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500'}`}
                        >
                            Loyalty Hub
                        </button>
                    </div>

                    {subTab === 'inventory' ? (
                        <div className="flex flex-col lg:row-row lg:flex-row gap-6">
                            <div className="flex-1 space-y-6">
                                {lowStockItems.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center text-red-700 dark:text-red-400">
                                            <AlertTriangle className="w-5 h-5 mr-3 animate-bounce" />
                                            <div>
                                                <p className="font-black text-sm uppercase italic">Low Stock Alert!</p>
                                                <p className="text-xs font-bold opacity-80">{lowStockItems.length} items are below critical thresholds.</p>
                                            </div>
                                        </div>
                                        <button className="text-[10px] font-black underline uppercase tracking-widest">Reorder Now</button>
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                                        <ShoppingCart className="w-6 h-6 mr-3 text-indigo-500" />
                                        Quick Sale Terminal
                                    </h2>
                                    <div className="relative w-full sm:w-72">
                                        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text"
                                            placeholder="Search inventory..."
                                            value={posSearchQuery}
                                            onChange={(e) => setPosSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-slate-200 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredItems.filter(i => i.name.toLowerCase().includes(posSearchQuery.toLowerCase())).map(item => (
                                        <div key={item.id} onClick={() => addToCart(item)} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group select-none relative overflow-hidden">
                                            {item.stockQuantity <= item.lowStockThreshold && (
                                                <div className="absolute top-0 right-0 py-1 px-3 bg-red-600 text-white text-[8px] font-black uppercase tracking-tighter">Critical</div>
                                            )}
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="p-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-slate-500 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors">
                                                        {item.category === 'lubricant' ? <Droplet className="w-5 h-5" /> : 
                                                         item.category === 'car_care' ? <PackageSearch className="w-5 h-5" /> :
                                                         <Tag className="w-5 h-5" />}
                                                    </div>
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${item.stockQuantity <= item.lowStockThreshold ? 'bg-red-50 text-red-600 dark:bg-red-500/10' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'}`}>
                                                        {item.stockQuantity} In Stock
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight mb-1">{item.name}</h3>
                                                <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">{item.category.replace('_', ' ')}</p>
                                            </div>
                                            <div className="mt-5 flex items-center justify-between">
                                                <span className="text-xl font-black text-slate-800 dark:text-white">
                                                    KES {item.price.toLocaleString()}
                                                </span>
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full lg:w-96 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl overflow-hidden flex flex-col shrink-0 flex-grow-0">
                                <div className="p-5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/80">
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
                                        Current Order
                                        {cart.length > 0 && (
                                            <span className="ml-2 bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full">{cart.reduce((s, c) => s + c.quantity, 0)}</span>
                                        )}
                                    </h3>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {cart.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                            <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="font-bold text-sm">Cart is empty</p>
                                        </div>
                                    ) : (
                                        cart.map(cartItem => (
                                            <div key={cartItem.item.id} className="flex gap-3 items-center bg-slate-50 dark:bg-slate-700/20 p-3 rounded-2xl">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{cartItem.item.name}</p>
                                                    <p className="text-indigo-600 dark:text-indigo-400 font-black text-sm mt-0.5">KES {cartItem.item.price.toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden shrink-0">
                                                    <button onClick={() => updateQuantity(cartItem.item.id, -1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300">
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="w-8 text-center text-sm font-bold border-x border-slate-200 dark:border-slate-600">{cartItem.quantity}</span>
                                                    <button onClick={() => updateQuantity(cartItem.item.id, 1)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300" disabled={cartItem.quantity >= cartItem.item.stockQuantity}>
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <button onClick={() => removeFromCart(cartItem.item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg shrink-0 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-semibold text-slate-500">Total Amount</span>
                                        <span className="text-3xl font-black text-slate-800 dark:text-white">
                                            <span className="text-lg mr-1 text-slate-400">KES</span>
                                            {cartTotal.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="mb-4">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Payment Method</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['cash', 'mpesa', 'card'].map(id => (
                                                <button key={id} onClick={() => setPaymentMethod(id as any)} className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${paymentMethod === id ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'border-transparent bg-white shadow-sm text-slate-500 hover:bg-slate-100 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                    {id === 'cash' ? <Banknote className="w-5 h-5" /> : id === 'card' ? <CreditCard className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                                                    <span className="text-[10px] font-bold uppercase">{id}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={handleCheckout} disabled={cart.length === 0 || isCheckingOut} className="w-full relative flex items-center justify-center py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg transition-all">
                                        {isCheckingOut ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <>Pay KES {cartTotal.toLocaleString()} <ArrowRight className="w-5 h-5 ml-2" /></>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700/50 shadow-sm h-fit">
                                <h3 className="text-xl font-black mb-6">Redemption Search</h3>
                                <div className="relative mb-6">
                                    <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder="Enter Vehicle Plate..."
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black focus:ring-2 focus:ring-amber-500 outline-none"
                                        onChange={(e) => setHistorySearchQuery(e.target.value.toUpperCase())}
                                        value={historySearchQuery}
                                    />
                                </div>

                                {historySearchQuery && (
                                    <div className="p-6 bg-amber-50 dark:bg-amber-500/10 rounded-3xl border border-amber-200 dark:border-amber-500/20 text-center">
                                        <div className="text-[10px] font-black uppercase text-amber-600 mb-1 tracking-widest">Available Points</div>
                                        <div className="text-4xl font-black text-amber-700 dark:text-amber-500">{customerPoints[historySearchQuery] || 0}</div>
                                        <div className="text-xs font-bold text-amber-600/70 mt-1">for vehicle {historySearchQuery}</div>
                                    </div>
                                )}
                            </div>

                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {MOCK_REWARDS.map(reward => (
                                    <div key={reward.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col justify-between hover:border-amber-500 transition-all group">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-2xl text-slate-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                                    {reward.type === 'carwash' ? <Waves className="w-6 h-6" /> : reward.type === 'pos' ? <ShoppingCart className="w-6 h-6" /> : <Droplet className="w-6 h-6" />}
                                                </div>
                                                <div className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-black px-3 py-1 rounded-full text-xs">
                                                    {reward.points} PTS
                                                </div>
                                            </div>
                                            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-1">{reward.name}</h4>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{reward.type} Reward</p>
                                        </div>
                                        <button 
                                            disabled={!historySearchQuery || (customerPoints[historySearchQuery] || 0) < reward.points}
                                            onClick={() => redeemPoints(historySearchQuery, reward.id)}
                                            className="mt-6 w-full py-3 bg-slate-900 hover:bg-amber-600 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-slate-900/10"
                                        >
                                            Redeem Now
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CARWASH TAB */}
            {activeTab === 'carwash' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                                <Waves className="w-6 h-6 mr-3 text-blue-500" />
                                Carwash Services
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredCarwashServices.map(service => (
                                <div key={service.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <Car className="w-6 h-6" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-slate-800 dark:text-white">KES {service.price.toLocaleString()}</div>
                                            <div className="text-xs font-bold text-slate-500 flex items-center justify-end mt-1">
                                                <Clock className="w-3 h-3 mr-1" /> {service.estimatedDurationMinutes} mins
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{service.name}</h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{service.description}</p>
                                    <button className="w-full py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center hover:bg-blue-600 transition-colors">
                                        <Plus className="w-4 h-4 mr-2" /> Book Service
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="px-2">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
                                <Activity className="w-5 h-5 mr-2 text-blue-500" />
                                Active Queue
                            </h2>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
                            <div className="p-4 space-y-4">
                                {activeCarwashSales.filter(s => s.stationId === selectedStationId).map(sale => (
                                    <div key={sale.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-2xl">
                                        <div className="flex items-center">
                                            <div className={`p-2 rounded-xl mr-3 ${sale.status === 'in_progress' ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                                {sale.status === 'in_progress' ? <Play className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <div className="font-black text-slate-800 dark:text-white">{sale.vehiclePlate}</div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase">
                                                    {filteredCarwashServices.find(s => s.id === sale.serviceId)?.name}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${sale.status === 'in_progress' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {sale.status?.replace('_', ' ')}
                                            </div>
                                            <button className="text-blue-600 text-[10px] font-black mt-1 hover:underline">Complete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SERVICING TAB */}
            {activeTab === 'servicing' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                                <Wrench className="w-6 h-6 mr-3 text-indigo-500" />
                                Car Servicing & Maintenance
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredServicingPackages.map(pkg => (
                                <div key={pkg.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                            <Wrench className="w-6 h-6" />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-slate-800 dark:text-white">KES {pkg.price.toLocaleString()}</div>
                                            <div className="text-xs font-bold text-slate-500 flex items-center justify-end mt-1">
                                                <Clock className="w-3 h-3 mr-1" /> {pkg.estimatedDurationMinutes} mins
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{pkg.name}</h3>
                                    <p className="text-sm text-slate-500 mb-4">{pkg.description}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button className="py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors">Quick Book</button>
                                        <button className="py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Details</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* History Search Section */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
                            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-1 flex items-center">
                                    <Search className="w-6 h-6 mr-3 text-indigo-400" />
                                    Vehicle History Search
                                </h3>
                                <p className="text-slate-400 text-sm font-medium mb-6">Retrieve past service records, oil types, and odometer trends</p>
                                
                                <div className="flex gap-3 mb-8">
                                    <div className="relative flex-1">
                                        <Car className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Enter Plate Number (e.g. KAA 001B)"
                                            value={historySearchQuery}
                                            onChange={(e) => setHistorySearchQuery(e.target.value.toUpperCase())}
                                            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-lg placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>

                                {historySearchQuery && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {serviceHistory.filter(h => h.vehiclePlate?.includes(historySearchQuery)).length > 0 ? (
                                            serviceHistory.filter(h => h.vehiclePlate?.includes(historySearchQuery)).map((h, i) => (
                                                <div key={h.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center">
                                                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mr-4">
                                                                <Clock className="w-5 h-5 text-indigo-400" />
                                                            </div>
                                                            <div>
                                                                <div className="font-black text-indigo-100">
                                                                    {filteredServicingPackages.find(p => p.id === h.packageId)?.name}
                                                                </div>
                                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                                                                    {new Date(h.createdAt!).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-xl font-black text-white">{h.odometerReading?.toLocaleString()} KM</div>
                                                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Entry Mileage</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-slate-400 font-medium pl-14 italic">
                                                        "{h.notes}"
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                                                <PackageSearch className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                                                <p className="text-slate-500 font-bold">No history found for this vehicle</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="px-2">
                            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center">
                                <CheckCircle className="w-5 h-5 mr-2 text-indigo-500" />
                                Job Cards & Reminders
                            </h2>
                        </div>
                        
                        {/* Reminders Alert */}
                        <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 rotate-12">
                                <Clock className="w-16 h-16" />
                            </div>
                            <div className="relative z-10">
                                <h4 className="font-black text-sm uppercase tracking-widest mb-1">Service Alerts</h4>
                                <p className="text-indigo-100 text-xs font-medium mb-4">3 Vehicles are approaching their service limit</p>
                                <div className="space-y-2">
                                    {[
                                        { plate: 'KBB 101X', due: '145,000 KM', status: 'Due in 200km' },
                                        { plate: 'KDA 777Z', due: '90,000 KM', status: 'Due in 50km' }
                                    ].map((alert, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                                            <div>
                                                <div className="text-sm font-black">{alert.plate}</div>
                                                <div className="text-[10px] opacity-70 font-bold uppercase">Next Service: {alert.due}</div>
                                            </div>
                                            <div className="text-[10px] font-black bg-white text-indigo-600 px-2 py-0.5 rounded-full uppercase italic">
                                                {alert.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {activeServicingSales.filter(s => s.stationId === selectedStationId).map(sale => (
                                <div key={sale.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                                    <div className={`absolute left-0 top-0 w-1.5 h-full ${sale.status === 'in_progress' ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                                    <div className="flex flex-col">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                                    {sale.vehiclePlate}
                                                    {sale.vehiclePlate && customerPoints[sale.vehiclePlate] > 0 && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Activity className="w-3 h-3" /> {customerPoints[sale.vehiclePlate]} pts
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-bold text-slate-500">{sale.vehicleModel}</div>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${sale.status === 'in_progress' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {sale.status?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Package</div>
                                                <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                                                    {filteredServicingPackages.find(p => p.id === sale.packageId)?.name}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/10">
                                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 text-center">Next Service Due</div>
                                                <div className="text-sm font-black text-indigo-600 dark:text-indigo-400 text-center">
                                                    {sale.nextServiceOdometer?.toLocaleString()} KM
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Current Odometer (KM)</label>
                                            <div className="relative">
                                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="number" 
                                                    value={sale.odometerReading || ''}
                                                    onChange={(e) => updateOdometer(sale.id!, parseInt(e.target.value) || 0)}
                                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    placeholder="Enter reading..."
                                                />
                                            </div>
                                        </div>

                                        {sale.status === 'in_progress' ? (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div className="w-1/2 h-full bg-indigo-500 animate-pulse" />
                                                </div>
                                                <span className="text-[10px] font-black text-indigo-600">50%</span>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => completeService(sale.id!)}
                                                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all"
                                            >
                                                Complete & Deduct Stock
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FLEET & CORPORATE TAB */}
            {activeTab === 'fleet' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                            <ShieldCheck className="w-6 h-6 mr-3 text-indigo-500" />
                            Fleet & Corporate Accounts
                        </h2>
                        <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all">
                            + New Merchant/Account
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-4">
                            {fleetAccounts.map(account => (
                                <div key={account.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>
                                    <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{account.companyName}</h3>
                                                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase rounded-full">Active</span>
                                            </div>
                                            <div className="flex gap-4 text-xs font-bold text-slate-500 mb-6">
                                                <span>CP: {account.contactPerson}</span>
                                                <span>ID: {account.id}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Credit Limit</div>
                                                    <div className="text-lg font-black text-slate-800 dark:text-white">KES {account.creditLimit.toLocaleString()}</div>
                                                </div>
                                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/30">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Consumption Rate (7d)</div>
                                                    <div className="text-lg font-black text-indigo-500">KES {account.currentBalance.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="md:w-48 flex flex-col gap-2 justify-center">
                                            <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">
                                                Issue New Card
                                            </button>
                                            <button className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
                                                Statement
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-6">
                            {/* Card Verification Terminal */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-10">
                                    <CreditCard className="w-32 h-32" />
                                </div>
                                <h3 className="text-xl font-black mb-1 flex items-center">
                                    <CreditCard className="w-5 h-5 mr-3 text-indigo-400" />
                                    Fleet Terminal
                                </h3>
                                <p className="text-indigo-200/60 text-xs font-bold mb-8 italic">Swipe or Enter Card Number for Verification</p>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2 block">Card Number</label>
                                        <input 
                                            type="text" 
                                            placeholder="XXXX-XXXX-XXXX"
                                            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 font-black text-xl tracking-widest outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => verifyFleetCard('1234')}
                                        disabled={isFleetVerifying}
                                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${isFleetVerifying ? 'bg-slate-700 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'}`}
                                    >
                                        {isFleetVerifying ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        {isFleetVerifying ? 'Verifying...' : 'Authorize Transaction'}
                                    </button>
                                </div>

                                <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                    <div className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-500 uppercase tracking-widest">Merchant Status</span>
                                        <span className="text-emerald-500 flex items-center"><CheckCircle className="w-3 h-3 mr-1" /> ONLINE</span>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <div className="text-[10px] text-slate-500 font-black uppercase mb-1">Network Latency</div>
                                        <div className="font-black text-indigo-200">12ms (Express Routing)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FINANCE TAB */}
            {activeTab === 'finance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                            <TrendingUp className="w-6 h-6 mr-3 text-indigo-500" />
                            Financial Performance
                        </h2>
                        <div className="flex gap-2">
                            <button className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Export P&L
                            </button>
                            <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all">
                                Generate Daily Report
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-6">
                            {/* P&L Overview Card */}
                            {financialReports.map(report => (
                                <div key={report.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 transform rotate-12 scale-150">
                                        <TrendingUp className="w-32 h-32 text-indigo-500" />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-8">
                                            <div>
                                                <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Live P&L Summary</span>
                                                <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-2">KES {report.netProfit.toLocaleString()}</h3>
                                                <p className="text-slate-500 font-bold text-xs uppercase tracking-tight">Net Estimated Profit for {new Date(report.periodStart).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-emerald-500 flex items-center justify-end gap-1">
                                                    <TrendingUp className="w-3 h-3" /> +8.4%
                                                </div>
                                                <div className="text-xs font-bold text-slate-400">vs Previous Period</div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6">
                                            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700/30">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Sales</div>
                                                <div className="text-lg font-black text-slate-800 dark:text-white">KES {report.totalSales.toLocaleString()}</div>
                                            </div>
                                            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700/30">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax Liability (VAT)</div>
                                                <div className="text-lg font-black text-red-500">KES {report.totalTax.toLocaleString()}</div>
                                            </div>
                                            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700/30">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Staff Commissions</div>
                                                <div className="text-lg font-black text-amber-500">KES {report.totalCommission.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* GPS Integrity Monitor */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-125">
                                    <MapPin className="w-32 h-32" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <h3 className="text-xl font-black flex items-center gap-3">
                                                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                                Fleet Geofence Integrity
                                            </h3>
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-tight mt-1">Real-time GPS matching for authorized pump transactions.</p>
                                        </div>
                                        <span className="bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase">14 Nodes Active</span>
                                    </div>

                                    <div className="space-y-4">
                                        {fleetCards.filter(c => c.geofenceEnabled).map(card => (
                                            <div key={card.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group/line hover:bg-white/10 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                                        <Car className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-sm">{card.vehiclePlate}</div>
                                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Card: {card.cardNumber}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <div className="text-xs font-black text-emerald-500 flex items-center justify-end gap-1">
                                                            <CheckCircle className="w-3 h-3" /> MATCHED
                                                        </div>
                                                        <div className="text-[9px] font-black text-slate-500 uppercase">Within 14m Radius</div>
                                                    </div>
                                                    <div className="w-px h-8 bg-white/10" />
                                                    <div className="text-right">
                                                        <div className="text-[10px] font-black uppercase text-indigo-300">Last Ping</div>
                                                        <div className="text-xs font-bold text-white">2m ago</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Tools Sidebar */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 shadow-sm">
                                <h4 className="font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-indigo-500" />
                                    Revenue Streams
                                </h4>
                                <div className="space-y-6">
                                    {[
                                        { label: 'Fuel Retail', value: 78, color: 'bg-indigo-500' },
                                        { label: 'Fleet / Corporate', value: 15, color: 'bg-emerald-500' },
                                        { label: 'LPG / Kerosene', value: 4, color: 'bg-amber-500' },
                                        { label: 'Shop & POS', value: 3, color: 'bg-blue-500' }
                                    ].map(stream => (
                                        <div key={stream.label}>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-black uppercase text-slate-500">{stream.label}</span>
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{stream.value}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${stream.color} rounded-full`} 
                                                    style={{ width: `${stream.value}%` }} 
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Compliance Status */}
                            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-600/20">
                                <div className="flex items-center gap-3 mb-6">
                                    <ShieldCheck className="w-6 h-6" />
                                    <h4 className="font-black text-lg">Tax Compliance</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                                        <p className="text-[10px] font-black uppercase text-indigo-200 mb-1">Next KRA Filing</p>
                                        <p className="font-black">20th May, 2026</p>
                                    </div>
                                    <p className="text-xs font-bold text-indigo-100/70 italic">Calculated VAT liabilities are automatically matched against generated ETR fiscal signals.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAINTENANCE & ASSETS TAB */}
            {activeTab === 'maintenance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center px-2">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                            <Settings className="w-6 h-6 mr-3 text-indigo-500" />
                            Asset Intelligence & Maintenance
                        </h2>
                        <div className="flex gap-2">
                            <button className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                                <PlusCircle className="w-4 h-4" /> Register New Asset
                            </button>
                            <button className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-500 transition-all flex items-center gap-2">
                                <Wrench className="w-4 h-4" /> Log Emergency Repair
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-6">
                            {/* Assets Inventory Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {assets.map(asset => (
                                    <div key={asset.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`p-3 rounded-2xl ${asset.status === 'operational' ? 'bg-emerald-500' : asset.status === 'maintenance' ? 'bg-amber-500' : 'bg-red-500'} text-white`}>
                                                    <Wrench className="w-5 h-5 font-black" />
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">{asset.name}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.assetType}</div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Health Status</div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className={`h-full ${asset.healthScore > 80 ? 'bg-emerald-500' : asset.healthScore > 50 ? 'bg-amber-500' : 'bg-red-500'} rounded-full`} style={{ width: `${asset.healthScore}%` }} />
                                                        </div>
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{asset.healthScore}%</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${asset.status === 'operational' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {asset.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-700/50 grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Last Calibration</div>
                                                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400">{asset.lastCalibration || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Serial ID</div>
                                                    <div className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">{asset.serialNumber}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Active Maintenance Tickets */}
                            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-10">
                                    <ClipboardList className="w-32 h-32" />
                                </div>
                                <h3 className="text-xl font-black mb-8 flex items-center gap-3 relative z-10">
                                    <Clock className="w-5 h-5 text-amber-400" />
                                    Active Service Tickets
                                </h3>
                                
                                <div className="space-y-4 relative z-10">
                                    {maintenanceLogs.map(log => (
                                        <div key={log.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="text-lg font-black italic">{assets.find(a => a.id === log.assetId)?.name}</h4>
                                                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase rounded-lg">In Progress</span>
                                                </div>
                                                <p className="text-sm text-slate-400 font-medium mb-4">"{log.issueDescription}"</p>
                                                <div className="flex gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5 text-indigo-400" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">TECH: {log.technicianName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">SCHED: {new Date(log.scheduledDate!).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="md:w-40 flex flex-col justify-center text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Est. Cost</div>
                                                <div className="text-lg font-black text-white">KES {log.maintenanceCost.toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {maintenanceLogs.length === 0 && <p className="text-center py-10 text-slate-500 italic">No active maintenance tickets</p>}
                                </div>
                            </div>
                        </div>

                        {/* Regulatory & Safety Sidebar */}
                        <div className="space-y-6">
                            {/* Calibration Monitor */}
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 shadow-sm relative overflow-hidden">
                                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-red-500/5 rounded-full group-hover:scale-125 transition-transform" />
                                <h4 className="font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-red-500" />
                                    Legal Calibration
                                </h4>
                                <div className="space-y-4">
                                    {assets.filter(a => a.nextCalibrationDue).map(asset => (
                                        <div key={asset.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div>
                                                <div className="text-xs font-black text-slate-800 dark:text-white">{asset.name}</div>
                                                <div className="text-[9px] font-bold text-slate-500 uppercase">Due: {asset.nextCalibrationDue}</div>
                                            </div>
                                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">
                                    Request Legal Stamps
                                </button>
                            </div>

                            {/* Utility Runtime */}
                            <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-600/20">
                                <h4 className="font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Power & Air Runtime
                                </h4>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                                            <span>Generator Load</span>
                                            <span>65%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-white w-[65%]" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                                            <span>Compressor PSI</span>
                                            <span>115 / 150</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-400 w-[78%]" />
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-6 text-[10px] font-bold text-indigo-100/70 italic leading-relaxed">Utility efficiencies are cross-referenced with shop consumption logs to identify energy wastage.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SHIFT RECONCILIATION TAB */}
            {activeTab === 'reconciliation' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between flex-wrap items-center gap-4">
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center">
                            <ShieldCheck className="w-6 h-6 mr-3 text-indigo-500" />
                            Shift Reconciliation
                        </h2>
                        <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-colors">
                            Open New Shift
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {filteredShifts.map(shift => (
                            <div key={shift.id} className={`p-6 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 ${shift.status === 'active' ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-500/20' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50'}`}>
                                <div className="flex items-center w-full md:w-auto">
                                    <div className={`p-4 rounded-2xl mr-4 ${shift.status === 'active' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                        <User className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-xl font-black text-slate-800 dark:text-white">{shift.attendantName}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${shift.status === 'active' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                                                {shift.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-500">Started: {new Date(shift.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                    </div>
                                </div>
                                <div className="flex-1 flex justify-around w-full border-y md:border-y-0 md:border-x border-slate-200 dark:border-slate-700 py-4 md:py-0 px-4 text-center">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Expected</p>
                                        <p className="text-xl font-black text-slate-700 dark:text-slate-300">KES {shift.expectedCash.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Actual</p>
                                        <p className="text-xl font-black text-slate-700 dark:text-slate-300">{shift.status === 'active' ? '—' : `KES ${shift.actualCash.toLocaleString()}`}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Discrepancy</p>
                                        <p className={`text-xl font-black ${shift.discrepancy < 0 ? 'text-red-500' : shift.status === 'active' ? 'text-slate-400' : 'text-emerald-500'}`}>{shift.status === 'active' ? '—' : `KES ${shift.discrepancy.toLocaleString()}`}</p>
                                    </div>
                                </div>
                                <div className="w-full md:w-auto text-right">
                                    {shift.status === 'active' ? (
                                        <button className="w-full md:w-auto px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 rounded-xl font-bold transition-colors">Close & Reconcile</button>
                                    ) : (
                                        <button className="w-full md:w-auto px-6 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors">View Report</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* EMPLOYEE GROWTH & GAMIFICATION */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group mt-8">
                        <div className="absolute top-0 right-0 p-8 transform rotate-12 opacity-10">
                            <Trophy className="w-32 h-32" />
                        </div>
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black flex items-center gap-3">
                                    <Star className="w-6 h-6 text-amber-400" />
                                    Elite Staff Leaderboard
                                </h3>
                                <p className="text-slate-400 font-bold text-sm">Performance gamification based on transaction speed & reconciliation accuracy.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                                <h4 className="font-black text-sm mb-6 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-indigo-400" />
                                    Top Performers (Points)
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { name: 'John Doe', points: 1250, badge: 'Efficiency Master', color: 'bg-emerald-500' },
                                        { name: 'Sarah W.', points: 980, badge: 'Perfect Recon', color: 'bg-indigo-500' },
                                        { name: 'Mike K.', points: 850, badge: 'Speed Demon', color: 'bg-amber-500' }
                                    ].map((staff, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 group/row hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500 border border-white/10">{idx + 1}</div>
                                                <div>
                                                    <div className="font-black text-white">{staff.name}</div>
                                                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{staff.badge}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black">{staff.points.toLocaleString()}</div>
                                                <div className="text-[9px] font-black text-slate-500 uppercase">XP Earned</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
                                <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/20">
                                    <Trophy className="w-10 h-10 text-white" />
                                </div>
                                <h4 className="text-xl font-black mb-1">Monthly Reward Goal</h4>
                                <p className="text-slate-400 text-xs font-bold mb-6 italic">Next bonus payout at 5,000 Group XP</p>
                                
                                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                                    <div className="w-3/4 h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                                </div>
                                <div className="flex justify-between w-full text-[10px] font-black uppercase text-slate-500">
                                    <span>3,250 XP</span>
                                    <span>5,000 XP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

