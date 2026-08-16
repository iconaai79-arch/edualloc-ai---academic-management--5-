import React, { useState, useMemo } from 'react';
import type { 
    Institution, 
    User, 
    WeighbridgeIntakeTicket, 
    GrainSupplier, 
    MillingSilo, 
    MillingBatchRun, 
    FlourPackagingShift, 
    AnimalFeedBatch, 
    GrainSaleOrder 
} from '../../types';

interface GrainMillerManagerProps {
    currentUser?: User;
    currentInstitution: Institution;
    onDataChange?: () => void;
}

export const GrainMillerManager: React.FC<GrainMillerManagerProps> = ({
    currentUser,
    currentInstitution,
    onDataChange
}) => {
    // ─── Sub-Tab Navigation ───────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<
        'overview' | 'weighbridge' | 'suppliers' | 'silos' | 'milling' | 'packaging' | 'animal_feeds' | 'sales' | 'costing'
    >('overview');

    // ─── Mock / Initial State Data ────────────────────────────────────────────
    const [weighbridgeTickets, setWeighbridgeTickets] = useState<WeighbridgeIntakeTicket[]>([
        {
            id: 'wb_1',
            ticketNumber: 'WB-2026-0101',
            institutionId: currentInstitution.id,
            supplierId: 'sup_1',
            supplierName: 'Eldoret Grain Growers Coop',
            supplierPhone: '+254 722 100200',
            supplierType: 'Cooperative',
            truckRegistration: 'KDA 482B',
            driverName: 'Peter Kipchoge',
            driverPhone: '+254 711 334455',
            grainType: 'White Maize',
            grade: 'Grade 1',
            grossWeightKg: 28450,
            tareWeightKg: 12150,
            bagCount: 180,
            bagTareKg: 0.15,
            moistureContentPct: 13.8,
            moistureShrinkageKg: 48.9,
            foreignMatterPct: 0.8,
            aflatoxinPpb: 4.2,
            netWeightKg: 16224.1,
            buyingPricePerKg: 48,
            totalAmountGross: 778756.8,
            offloadingFee: 3600,
            bagFee: 0,
            loanDeduction: 0,
            netPayableAmount: 775156.8,
            targetSiloId: 'silo_1',
            status: 'Approved',
            paymentStatus: 'Paid',
            paymentMethod: 'M-Pesa B2C',
            paymentReference: 'QK894JFLM2',
            operatorName: currentUser?.name || 'Weighbridge Officer',
            intakeDate: '2026-08-15',
            firstPassTime: '08:30 AM',
            secondPassTime: '09:15 AM',
            notes: 'High quality dry grain from Uasin Gishu'
        },
        {
            id: 'wb_2',
            ticketNumber: 'WB-2026-0102',
            institutionId: currentInstitution.id,
            supplierId: 'sup_2',
            supplierName: 'Kitale Harvest Agro Ltd',
            supplierPhone: '+254 733 998877',
            supplierType: 'Trader',
            truckRegistration: 'KCK 719M',
            driverName: 'Sammy Wekesa',
            driverPhone: '+254 720 112233',
            grainType: 'White Maize',
            grade: 'Grade 1',
            grossWeightKg: 34200,
            tareWeightKg: 14100,
            bagCount: 220,
            bagTareKg: 0.15,
            moistureContentPct: 14.5,
            moistureShrinkageKg: 201.0,
            foreignMatterPct: 1.2,
            aflatoxinPpb: 6.1,
            netWeightKg: 19866.0,
            buyingPricePerKg: 46,
            totalAmountGross: 913836.0,
            offloadingFee: 4400,
            bagFee: 0,
            loanDeduction: 50000,
            netPayableAmount: 859436.0,
            targetSiloId: 'silo_2',
            status: 'Approved',
            paymentStatus: 'Pending',
            operatorName: currentUser?.name || 'Weighbridge Officer',
            intakeDate: '2026-08-16',
            firstPassTime: '06:45 AM',
            secondPassTime: '07:30 AM',
            notes: 'Moisture high, moisture discount applied'
        }
    ]);

    const [suppliers, setSuppliers] = useState<GrainSupplier[]>([
        {
            id: 'sup_1',
            institutionId: currentInstitution.id,
            name: 'Eldoret Grain Growers Coop',
            phoneNumber: '+254 722 100200',
            idNumber: 'CPR/2018/9841',
            supplierType: 'Cooperative',
            location: 'Eldoret / Turbo',
            bankName: 'Co-operative Bank',
            bankAccount: '01129384910200',
            mpesaNumber: '254722100200',
            totalDeliveriesKg: 16224.1,
            totalAmountEarned: 775156.8,
            totalAmountPaid: 775156.8,
            outstandingBalance: 0,
            contractedAcres: 450,
            status: 'Active'
        },
        {
            id: 'sup_2',
            institutionId: currentInstitution.id,
            name: 'Kitale Harvest Agro Ltd',
            phoneNumber: '+254 733 998877',
            idNumber: 'PVT-948102',
            supplierType: 'Trader',
            location: 'Trans-Nzoia / Kitale',
            bankName: 'KCB Bank',
            bankAccount: '1284910294',
            mpesaNumber: '254733998877',
            totalDeliveriesKg: 19866.0,
            totalAmountEarned: 859436.0,
            totalAmountPaid: 0,
            outstandingBalance: 859436.0,
            advanceBalance: 50000,
            status: 'Active'
        },
        {
            id: 'sup_3',
            institutionId: currentInstitution.id,
            name: 'Moi University Seed & Grain Farm',
            phoneNumber: '+254 700 445566',
            idNumber: 'GOV-4819',
            supplierType: 'Farmer',
            location: 'Kesses, Uasin Gishu',
            bankName: 'Absa Bank',
            bankAccount: '0948192048',
            mpesaNumber: '254700445566',
            totalDeliveriesKg: 8500,
            totalAmountEarned: 408000,
            totalAmountPaid: 408000,
            outstandingBalance: 0,
            contractedAcres: 80,
            status: 'Active'
        }
    ]);

    const [silos, setSilos] = useState<MillingSilo[]>([
        {
            id: 'silo_1',
            institutionId: currentInstitution.id,
            code: 'SILO-01 (Main)',
            name: 'Tower Silo Alpha',
            type: 'Silo',
            capacityKg: 500000,
            currentStockKg: 342500,
            grainType: 'Grade 1 White Maize',
            avgMoisturePct: 13.2,
            lastFumigationDate: '2026-07-20',
            nextFumigationDue: '2026-09-20',
            temperatureCelsius: 22.4,
            status: 'Active'
        },
        {
            id: 'silo_2',
            institutionId: currentInstitution.id,
            code: 'SILO-02 (Secondary)',
            name: 'Tower Silo Beta',
            type: 'Silo',
            capacityKg: 500000,
            currentStockKg: 198660,
            grainType: 'Grade 2 White Maize',
            avgMoisturePct: 14.1,
            lastFumigationDate: '2026-08-01',
            nextFumigationDue: '2026-10-01',
            temperatureCelsius: 23.8,
            status: 'Active'
        },
        {
            id: 'silo_3',
            institutionId: currentInstitution.id,
            code: 'WH-01 (Bagged)',
            name: 'Flat Warehouse Holding',
            type: 'Flat Warehouse',
            capacityKg: 200000,
            currentStockKg: 45000,
            grainType: 'Yellow Maize / Feed Grade',
            avgMoisturePct: 13.5,
            lastFumigationDate: '2026-08-05',
            nextFumigationDue: '2026-10-05',
            temperatureCelsius: 21.0,
            status: 'Active'
        }
    ]);

    const [millingBatches, setMillingBatches] = useState<MillingBatchRun[]>([
        {
            id: 'batch_1',
            batchNumber: 'MLL-2026-041',
            institutionId: currentInstitution.id,
            sourceSiloId: 'silo_1',
            sourceSiloName: 'Tower Silo Alpha',
            operatorName: 'Josphat Cheruiyot (Chief Miller)',
            startTime: '2026-08-15 06:00',
            endTime: '2026-08-15 14:00',
            rawMaizeInputKg: 10000,
            grade1FlourKg: 6600,
            grade2FlourKg: 1400,
            maizeBranKg: 1350,
            maizeGermKg: 350,
            pollardKg: 120,
            millingLossKg: 180,
            grade1YieldPct: 66.0,
            grade2YieldPct: 14.0,
            byproductsYieldPct: 18.2,
            lossPct: 1.8,
            fortificationDosingGrams: 240,
            powerUnitsKwh: 340,
            laborCostKES: 4500,
            status: 'Completed',
            qualityApprovedBy: 'Ann Mwangi (KEBS QA)',
            notes: 'Optimal extraction achieved. Flour moisture at 12.8%.'
        }
    ]);

    const [packagingShifts, setPackagingShifts] = useState<FlourPackagingShift[]>([
        {
            id: 'pkg_1',
            shiftCode: 'PKG-2026-089',
            institutionId: currentInstitution.id,
            batchId: 'batch_1',
            date: '2026-08-15',
            leadWorkerName: 'Erick Ochieng',
            teamMembers: ['Erick Ochieng', 'David Mutua', 'Mary Njeri', 'Geoffrey Rono'],
            packageSize: '24x2kg Bale',
            flourType: 'Grade 1 Sifted',
            totalUnitsPacked: 137,
            totalWeightKg: 6576,
            ratePerUnitKES: 18,
            totalLaborCostKES: 2466,
            packagingBagsUsed: 3288,
            packagingBagsDamaged: 14,
            outerBalesUsed: 137,
            lotBatchCode: 'LOT-AUG26-041',
            expiryDate: '2027-02-15',
            status: 'Pushed_To_Payroll'
        }
    ]);

    const [feedBatches, setFeedBatches] = useState<AnimalFeedBatch[]>([
        {
            id: 'feed_1',
            batchCode: 'FEED-2026-029',
            institutionId: currentInstitution.id,
            feedType: 'Dairy Meal 16%',
            rawBranUsedKg: 2000,
            rawGermUsedKg: 500,
            pollardUsedKg: 300,
            additivesUsedKg: 200,
            totalFeedOutputKg: 3000,
            bagSizeKg: 50,
            bagsProduced: 60,
            costPerBagKES: 1450,
            sellingPricePerBagKES: 2150,
            producedDate: '2026-08-15',
            status: 'In_Stock'
        }
    ]);

    const [salesOrders, setSalesOrders] = useState<GrainSaleOrder[]>([
        {
            id: 'sale_1',
            orderNumber: 'INV-MILL-0841',
            institutionId: currentInstitution.id,
            customerName: 'Quickmart Supermarkets Eldoret',
            customerPhone: '+254 722 889900',
            customerType: 'Supermarket',
            itemCategory: 'Flour',
            productName: 'Premium Sifted Maize Flour (24x2kg Bale)',
            unitSize: '24x2kg Bale',
            quantity: 80,
            unitPrice: 2280,
            totalAmount: 182400,
            paymentMethod: 'Bank Transfer',
            paymentStatus: 'Paid',
            invoiceDate: '2026-08-15',
            deliveryLocation: 'Quickmart Central Depot, Uganda Rd',
            dispatchedBy: 'Driver James K.'
        },
        {
            id: 'sale_2',
            orderNumber: 'INV-MILL-0842',
            institutionId: currentInstitution.id,
            customerName: 'Sirikwa Dairy Farmers Cooperative',
            customerPhone: '+254 710 554433',
            customerType: 'Wholesaler',
            itemCategory: 'Animal Feeds',
            productName: 'High-Yield Dairy Meal 16% (50kg)',
            unitSize: '50kg Bag',
            quantity: 40,
            unitPrice: 2150,
            totalAmount: 86000,
            paymentMethod: 'M-Pesa',
            paymentStatus: 'Paid',
            invoiceDate: '2026-08-16',
            deliveryLocation: 'Sirikwa Milk Cooler Station',
            dispatchedBy: 'Driver Samuel K.'
        }
    ]);

    // ─── Modal States ─────────────────────────────────────────────────────────
    const [showWeighbridgeModal, setShowWeighbridgeModal] = useState(false);
    const [showTicketPrintModal, setShowTicketPrintModal] = useState<WeighbridgeIntakeTicket | null>(null);
    const [showMillingModal, setShowMillingModal] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);

    // ─── Weighbridge Form State ───────────────────────────────────────────────
    const [wbForm, setWbForm] = useState({
        supplierId: 'sup_1',
        supplierName: 'Eldoret Grain Growers Coop',
        truckRegistration: '',
        driverName: '',
        driverPhone: '',
        grainType: 'White Maize' as const,
        grade: 'Grade 1' as const,
        grossWeightKg: 0,
        tareWeightKg: 0,
        bagCount: 0,
        bagTareKg: 0.15,
        moistureContentPct: 13.5,
        foreignMatterPct: 0.5,
        aflatoxinPpb: 4.0,
        buyingPricePerKg: 48,
        offloadingFee: 20,
        loanDeduction: 0,
        targetSiloId: 'silo_1',
        notes: ''
    });

    // Auto-calculate Net Weight and Settlement in real-time
    const calculatedWb = useMemo(() => {
        const gross = Number(wbForm.grossWeightKg) || 0;
        const tare = Number(wbForm.tareWeightKg) || 0;
        const bags = Number(wbForm.bagCount) || 0;
        const bagTare = (Number(wbForm.bagTareKg) || 0) * bags;
        const baseNet = Math.max(0, gross - tare - bagTare);

        const moisture = Number(wbForm.moistureContentPct) || 13.5;
        let shrinkageKg = 0;
        if (moisture > 13.5) {
            shrinkageKg = (baseNet * (moisture - 13.5)) / 100;
        }

        const netWeight = Math.max(0, baseNet - shrinkageKg);
        const price = Number(wbForm.buyingPricePerKg) || 0;
        const totalGross = netWeight * price;
        const offloadingTotal = bags * (Number(wbForm.offloadingFee) || 0);
        const loan = Number(wbForm.loanDeduction) || 0;
        const netPayable = Math.max(0, totalGross - offloadingTotal - loan);

        return {
            baseNet: Math.round(baseNet * 10) / 10,
            shrinkageKg: Math.round(shrinkageKg * 10) / 10,
            netWeight: Math.round(netWeight * 10) / 10,
            totalGross: Math.round(totalGross * 100) / 100,
            offloadingTotal: Math.round(offloadingTotal * 100) / 100,
            netPayable: Math.round(netPayable * 100) / 100
        };
    }, [wbForm]);

    // Handle Weighbridge Ticket Submission
    const handleSaveWeighbridgeTicket = (e: React.FormEvent) => {
        e.preventDefault();
        if (!wbForm.truckRegistration || wbForm.grossWeightKg <= 0 || wbForm.tareWeightKg <= 0) {
            alert('Please enter a valid Truck Reg, Gross weight, and Tare weight.');
            return;
        }

        const supplier = suppliers.find(s => s.id === wbForm.supplierId);
        const newTicket: WeighbridgeIntakeTicket = {
            id: `wb_${Date.now()}`,
            ticketNumber: `WB-2026-${String(weighbridgeTickets.length + 101).padStart(4, '0')}`,
            institutionId: currentInstitution.id,
            supplierId: wbForm.supplierId,
            supplierName: supplier?.name || wbForm.supplierName,
            supplierPhone: supplier?.phoneNumber,
            supplierType: supplier?.supplierType || 'Farmer',
            truckRegistration: wbForm.truckRegistration.toUpperCase(),
            driverName: wbForm.driverName,
            driverPhone: wbForm.driverPhone,
            grainType: wbForm.grainType,
            grade: wbForm.grade,
            grossWeightKg: Number(wbForm.grossWeightKg),
            tareWeightKg: Number(wbForm.tareWeightKg),
            bagCount: Number(wbForm.bagCount),
            bagTareKg: Number(wbForm.bagTareKg),
            moistureContentPct: Number(wbForm.moistureContentPct),
            moistureShrinkageKg: calculatedWb.shrinkageKg,
            foreignMatterPct: Number(wbForm.foreignMatterPct),
            aflatoxinPpb: Number(wbForm.aflatoxinPpb),
            netWeightKg: calculatedWb.netWeight,
            buyingPricePerKg: Number(wbForm.buyingPricePerKg),
            totalAmountGross: calculatedWb.totalGross,
            offloadingFee: calculatedWb.offloadingTotal,
            bagFee: 0,
            loanDeduction: Number(wbForm.loanDeduction),
            netPayableAmount: calculatedWb.netPayable,
            targetSiloId: wbForm.targetSiloId,
            status: 'Approved',
            paymentStatus: 'Pending',
            operatorName: currentUser?.name || 'Weighbridge Officer',
            intakeDate: new Date().toISOString().split('T')[0],
            firstPassTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            secondPassTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            notes: wbForm.notes
        };

        setWeighbridgeTickets(prev => [newTicket, ...prev]);

        // Update Target Silo Stock
        if (wbForm.targetSiloId) {
            setSilos(prev => prev.map(s => s.id === wbForm.targetSiloId ? {
                ...s,
                currentStockKg: s.currentStockKg + calculatedWb.netWeight
            } : s));
        }

        // Update Supplier Ledger
        if (supplier) {
            setSuppliers(prev => prev.map(s => s.id === supplier.id ? {
                ...s,
                totalDeliveriesKg: s.totalDeliveriesKg + calculatedWb.netWeight,
                totalAmountEarned: s.totalAmountEarned + calculatedWb.netPayable,
                outstandingBalance: s.outstandingBalance + calculatedWb.netPayable
            } : s));
        }

        setShowWeighbridgeModal(false);
        setShowTicketPrintModal(newTicket);
    };

    // ─── Batch Milling Form State ─────────────────────────────────────────────
    const [millingForm, setMillingForm] = useState({
        sourceSiloId: 'silo_1',
        rawMaizeInputKg: 10000,
        grade1FlourKg: 6500,
        grade2FlourKg: 1500,
        maizeBranKg: 1400,
        maizeGermKg: 380,
        pollardKg: 100,
        fortificationDosingGrams: 240,
        powerUnitsKwh: 320,
        laborCostKES: 4500,
        notes: ''
    });

    const calculatedMilling = useMemo(() => {
        const input = Number(millingForm.rawMaizeInputKg) || 1;
        const g1 = Number(millingForm.grade1FlourKg) || 0;
        const g2 = Number(millingForm.grade2FlourKg) || 0;
        const bran = Number(millingForm.maizeBranKg) || 0;
        const germ = Number(millingForm.maizeGermKg) || 0;
        const pollard = Number(millingForm.pollardKg) || 0;

        const totalOutput = g1 + g2 + bran + germ + pollard;
        const loss = Math.max(0, input - totalOutput);

        return {
            totalOutput,
            lossKg: Math.round(loss * 10) / 10,
            g1Pct: Math.round((g1 / input) * 1000) / 10,
            g2Pct: Math.round((g2 / input) * 1000) / 10,
            byproductPct: Math.round(((bran + germ + pollard) / input) * 1000) / 10,
            lossPct: Math.round((loss / input) * 1000) / 10
        };
    }, [millingForm]);

    const handleSaveMillingBatch = (e: React.FormEvent) => {
        e.preventDefault();
        const silo = silos.find(s => s.id === millingForm.sourceSiloId);
        if (silo && silo.currentStockKg < millingForm.rawMaizeInputKg) {
            alert(`Insufficient maize in ${silo.name}. Available: ${silo.currentStockKg.toLocaleString()} KG.`);
            return;
        }

        const newBatch: MillingBatchRun = {
            id: `batch_${Date.now()}`,
            batchNumber: `MLL-2026-${String(millingBatches.length + 42).padStart(3, '0')}`,
            institutionId: currentInstitution.id,
            sourceSiloId: millingForm.sourceSiloId,
            sourceSiloName: silo?.name || 'Silo',
            operatorName: currentUser?.name || 'Chief Miller',
            startTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
            rawMaizeInputKg: Number(millingForm.rawMaizeInputKg),
            grade1FlourKg: Number(millingForm.grade1FlourKg),
            grade2FlourKg: Number(millingForm.grade2FlourKg),
            maizeBranKg: Number(millingForm.maizeBranKg),
            maizeGermKg: Number(millingForm.maizeGermKg),
            pollardKg: Number(millingForm.pollardKg),
            millingLossKg: calculatedMilling.lossKg,
            grade1YieldPct: calculatedMilling.g1Pct,
            grade2YieldPct: calculatedMilling.g2Pct,
            byproductsYieldPct: calculatedMilling.byproductPct,
            lossPct: calculatedMilling.lossPct,
            fortificationDosingGrams: Number(millingForm.fortificationDosingGrams),
            powerUnitsKwh: Number(millingForm.powerUnitsKwh),
            laborCostKES: Number(millingForm.laborCostKES),
            status: 'Completed',
            qualityApprovedBy: currentUser?.name || 'QA Officer',
            notes: millingForm.notes
        };

        setMillingBatches(prev => [newBatch, ...prev]);

        // Deduct raw maize from silo
        setSilos(prev => prev.map(s => s.id === millingForm.sourceSiloId ? {
            ...s,
            currentStockKg: Math.max(0, s.currentStockKg - millingForm.rawMaizeInputKg)
        } : s));

        setShowMillingModal(false);
        alert(`✓ Milling Batch #${newBatch.batchNumber} logged successfully! Flour Yield: ${calculatedMilling.g1Pct}% Grade 1.`);
    };

    // ─── Executive Summary Aggregates ─────────────────────────────────────────
    const totals = useMemo(() => {
        const totalMaizeStockKg = silos.reduce((acc, s) => acc + s.currentStockKg, 0);
        const totalIntakeKg = weighbridgeTickets.reduce((acc, t) => acc + t.netWeightKg, 0);
        const totalPayableOutstanding = suppliers.reduce((acc, s) => acc + s.outstandingBalance, 0);
        const totalFlourProducedKg = millingBatches.reduce((acc, b) => acc + b.grade1FlourKg + b.grade2FlourKg, 0);
        const totalFeedsProducedKg = feedBatches.reduce((acc, f) => acc + f.totalFeedOutputKg, 0);
        const totalFlourSalesKES = salesOrders.filter(s => s.itemCategory === 'Flour').reduce((acc, s) => acc + s.totalAmount, 0);
        const totalFeedsSalesKES = salesOrders.filter(s => s.itemCategory === 'Animal Feeds').reduce((acc, s) => acc + s.totalAmount, 0);

        return {
            totalMaizeStockKg,
            totalMaizeStockMT: Math.round((totalMaizeStockKg / 1000) * 10) / 10,
            totalIntakeKg,
            totalIntakeMT: Math.round((totalIntakeKg / 1000) * 10) / 10,
            totalPayableOutstanding,
            totalFlourProducedKg,
            totalFlourProducedMT: Math.round((totalFlourProducedKg / 1000) * 10) / 10,
            totalFeedsProducedKg,
            totalFeedsProducedMT: Math.round((totalFeedsProducedKg / 1000) * 10) / 10,
            totalSalesKES: totalFlourSalesKES + totalFeedsSalesKES
        };
    }, [silos, weighbridgeTickets, suppliers, millingBatches, feedBatches, salesOrders]);

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-20">
            {/* ════════════════════════════════════════════════════════════════
                TOP HERO & BANNER
            ════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-700 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-2 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-amber-200 border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Grain Milling & Agro-Processing Command
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                        {currentInstitution.name}
                    </h1>
                    <p className="text-xs md:text-sm font-medium text-amber-100/90 max-w-2xl">
                        Weighbridge Dual-Pass Intake · Silo Aeration · Roller Milling Yield · Piece-Rate Packaging Labor · Animal Feeds Value-Addition
                    </p>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <button
                        onClick={() => setShowWeighbridgeModal(true)}
                        className="px-5 py-3 bg-white text-amber-900 hover:bg-amber-50 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    >
                        ⚖️ Weigh Truck
                    </button>
                    <button
                        onClick={() => setShowMillingModal(true)}
                        className="px-5 py-3 bg-black/30 hover:bg-black/40 text-white font-black text-xs uppercase tracking-widest rounded-2xl border border-white/20 backdrop-blur-md transition-all active:scale-95 flex items-center gap-2"
                    >
                        ⚙️ Log Milling Run
                    </button>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                KEY METRICS BAR
            ════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Raw Maize in Silos</p>
                    <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{totals.totalMaizeStockMT} <span className="text-xs">MT</span></p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{totals.totalMaizeStockKg.toLocaleString()} KG total</p>
                </div>
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Grain Intake (Net)</p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totals.totalIntakeMT} <span className="text-xs">MT</span></p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{weighbridgeTickets.length} Trucks weighed</p>
                </div>
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sifted Flour Output</p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totals.totalFlourProducedMT} <span className="text-xs">MT</span></p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">~80% Total Flour Yield</p>
                </div>
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Animal Feeds Output</p>
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{totals.totalFeedsProducedMT} <span className="text-xs">MT</span></p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Bran & Germ Value-Add</p>
                </div>
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Supplier Payables</p>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">KES {Math.round(totals.totalPayableOutstanding / 1000)}k</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Pending settlements</p>
                </div>
                <div className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gross Sales Revenue</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">KES {Math.round(totals.totalSalesKES / 1000)}k</p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Flour & Feeds</p>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                NAVIGATION TABS
            ════════════════════════════════════════════════════════════════ */}
            <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl overflow-x-auto custom-scrollbar">
                {[
                    { id: 'overview', label: '📊 Plant Dashboard' },
                    { id: 'weighbridge', label: '⚖️ Weighbridge & Intake' },
                    { id: 'suppliers', label: '🚜 Grain Suppliers & Payouts' },
                    { id: 'silos', label: '🏢 Silos & Storage' },
                    { id: 'milling', label: '⚙️ Milling & Extraction Yield' },
                    { id: 'packaging', label: '📦 Packaging & Labor' },
                    { id: 'animal_feeds', label: '🐄 Animal Feeds Formulation' },
                    { id: 'sales', label: '🚚 Sales & Distribution' },
                    { id: 'costing', label: '📈 Unit Costing (COGM)' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-md scale-100'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                TAB 1: OVERVIEW & FLOW
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Process Architecture Flow */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Integrated Grain-To-Flour & Feeds Pipeline
                                </h3>
                                <p className="text-xs text-slate-400">Automated end-to-end operational flow from farm delivery to supermarket shelf</p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full font-black text-[10px] uppercase">
                                Active Automation
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 space-y-2">
                                <span className="text-2xl">⚖️</span>
                                <h4 className="text-xs font-black uppercase text-amber-900 dark:text-amber-300">1. Dual-Pass Intake</h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Empty truck tare-out, loaded gross-in, moisture test conditioning & shrinkage deduction.
                                </p>
                            </div>
                            <div className="p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 space-y-2">
                                <span className="text-2xl">🏢</span>
                                <h4 className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-300">2. Silo Aeration</h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Pre-cleaning, destoning, and bulk holding with real-time temperature & fumigation tracking.
                                </p>
                            </div>
                            <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-2">
                                <span className="text-2xl">⚙️</span>
                                <h4 className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-300">3. Roller Milling & Fortification</h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Degerming, break rolls, sifting into Grade 1 Premium & Grade 2 with KEBS vitamin premix dosing.
                                </p>
                            </div>
                            <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-2">
                                <span className="text-2xl">🐄</span>
                                <h4 className="text-xs font-black uppercase text-blue-900 dark:text-blue-300">4. Packaging & Animal Feeds</h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Human piece-rate labor packing bales (24x2kg) & byproduct bran/germ mixing into commercial dairy & poultry feed.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Silos Visual Status & Recent Tickets */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Silo Capacity Gauges */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                Live Silo Stock & Aeration Levels
                            </h3>
                            <div className="space-y-4">
                                {silos.map(s => {
                                    const pct = Math.round((s.currentStockKg / s.capacityKg) * 100);
                                    return (
                                        <div key={s.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 dark:text-white">{s.name} ({s.code})</p>
                                                    <p className="text-[10px] text-slate-400">{s.grainType} · Moisture {s.avgMoisturePct}% · Temp {s.temperatureCelsius}°C</p>
                                                </div>
                                                <span className="text-xs font-black text-amber-600">{pct}% Full</span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${pct > 85 ? 'bg-rose-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                                                <span>Holding: {(s.currentStockKg / 1000).toFixed(1)} MT</span>
                                                <span>Capacity: {(s.capacityKg / 1000).toFixed(0)} MT</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Weighbridge Intake Records */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                    Recent Grain Intake (Weighbridge)
                                </h3>
                                <button 
                                    onClick={() => setActiveTab('weighbridge')}
                                    className="text-xs font-black text-amber-600 hover:underline"
                                >
                                    View All
                                </button>
                            </div>
                            <div className="space-y-3">
                                {weighbridgeTickets.slice(0, 4).map(t => (
                                    <div key={t.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-xs font-black text-slate-900 dark:text-white">{t.ticketNumber}</span>
                                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-md text-[9px] font-black uppercase">
                                                    {t.truckRegistration}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 font-medium">{t.supplierName} · {t.grainType} ({t.grade})</p>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <p className="text-xs font-black text-slate-900 dark:text-white">{t.netWeightKg.toLocaleString()} KG</p>
                                            <p className="text-[10px] text-emerald-600 font-bold">KES {t.netPayableAmount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 2: WEIGHBRIDGE & INTAKE CONSOLE
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'weighbridge' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Dual-Pass Weighbridge Console & Scale Tickets
                            </h2>
                            <p className="text-xs text-slate-400">
                                Tare (Empty) &rarr; Gross (Loaded) scale subtraction with moisture shrinkage & offloading fee calculator
                            </p>
                        </div>
                        <button
                            onClick={() => setShowWeighbridgeModal(true)}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-600/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            + Weigh New Truck Intake
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="p-4">Ticket #</th>
                                        <th className="p-4">Truck Reg</th>
                                        <th className="p-4">Supplier / Farmer</th>
                                        <th className="p-4">Gross In</th>
                                        <th className="p-4">Tare Out</th>
                                        <th className="p-4">Moisture %</th>
                                        <th className="p-4">Net Maize (KG)</th>
                                        <th className="p-4">Rate (KES)</th>
                                        <th className="p-4">Net Payable</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {weighbridgeTickets.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="p-4 font-mono font-black text-slate-900 dark:text-white">{t.ticketNumber}</td>
                                            <td className="p-4 font-bold text-amber-600">{t.truckRegistration}</td>
                                            <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                                                {t.supplierName}
                                                <span className="block text-[9px] text-slate-400">{t.driverName} ({t.driverPhone})</span>
                                            </td>
                                            <td className="p-4 font-mono text-slate-600">{t.grossWeightKg.toLocaleString()} kg</td>
                                            <td className="p-4 font-mono text-slate-400">{t.tareWeightKg.toLocaleString()} kg</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black ${t.moistureContentPct > 13.5 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {t.moistureContentPct}%
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono font-black text-indigo-600 dark:text-indigo-400">
                                                {t.netWeightKg.toLocaleString()} kg
                                            </td>
                                            <td className="p-4 font-mono text-slate-600">KES {t.buyingPricePerKg}</td>
                                            <td className="p-4 font-mono font-black text-emerald-600">
                                                KES {t.netPayableAmount.toLocaleString()}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                    t.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {t.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button
                                                    onClick={() => setShowTicketPrintModal(t)}
                                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all"
                                                >
                                                    🖨️ Ticket / GRN
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 3: GRAIN SUPPLIERS & SETTLEMENTS
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'suppliers' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Grain Farmers & Trader Settlement Accounts
                            </h2>
                            <p className="text-xs text-slate-400">Cumulative deliveries, advance deductions, and instant M-Pesa B2C payouts</p>
                        </div>
                        <button
                            onClick={() => setShowSupplierModal(true)}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                        >
                            + Register Supplier
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {suppliers.map(sup => (
                            <div key={sup.id} className="p-6 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase">
                                            {sup.supplierType}
                                        </span>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white mt-2">{sup.name}</h3>
                                        <p className="text-[11px] text-slate-400 font-medium">{sup.location} · {sup.phoneNumber}</p>
                                    </div>
                                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Total Deliveries:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{(sup.totalDeliveriesKg / 1000).toFixed(1)} MT</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Gross Earnings:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">KES {sup.totalAmountEarned.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-black">
                                        <span className="text-rose-600">Outstanding Payable:</span>
                                        <span className="font-mono text-rose-600">KES {sup.outstandingBalance.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            if (sup.outstandingBalance <= 0) {
                                                alert(`${sup.name} has zero outstanding balance.`);
                                                return;
                                            }
                                            if (confirm(`Disburse KES ${sup.outstandingBalance.toLocaleString()} via M-Pesa B2C to ${sup.name} (${sup.mpesaNumber})?`)) {
                                                setSuppliers(prev => prev.map(s => s.id === sup.id ? {
                                                    ...s,
                                                    totalAmountPaid: s.totalAmountPaid + s.outstandingBalance,
                                                    outstandingBalance: 0
                                                } : s));
                                                alert(`✓ M-Pesa B2C Payout of KES ${sup.outstandingBalance.toLocaleString()} processed successfully!`);
                                            }
                                        }}
                                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm"
                                    >
                                        💳 M-Pesa Payout
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 4: SILOS & STORAGE BINS
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'silos' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Grain Silos, Flat Warehouses & Fumigation Logs
                            </h2>
                            <p className="text-xs text-slate-400">Inventory levels, temperature monitoring, and conditioning schedule</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {silos.map(s => (
                            <div key={s.id} className="p-6 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-5">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-mono text-[10px] font-bold text-amber-600 uppercase">{s.code}</span>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">{s.name}</h3>
                                        <p className="text-xs text-slate-400 font-medium">{s.grainType}</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[9px] font-black uppercase">
                                        {s.status}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-black text-slate-700 dark:text-slate-300">
                                        <span>Current Stock: {(s.currentStockKg / 1000).toFixed(1)} MT</span>
                                        <span>{Math.round((s.currentStockKg / s.capacityKg) * 100)}%</span>
                                    </div>
                                    <div className="w-full h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                                        <div 
                                            className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500"
                                            style={{ width: `${(s.currentStockKg / s.capacityKg) * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-2xl">
                                    <div>
                                        <span className="text-slate-400 block uppercase tracking-wider">Avg Moisture</span>
                                        <span className="text-slate-800 dark:text-slate-200">{s.avgMoisturePct}%</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block uppercase tracking-wider">Core Temp</span>
                                        <span className="text-slate-800 dark:text-slate-200">{s.temperatureCelsius}°C</span>
                                    </div>
                                    <div className="col-span-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                                        <span className="text-slate-400 block uppercase tracking-wider">Next Fumigation Due</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">{s.nextFumigationDue || 'Not Scheduled'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 5: MILLING PRODUCTION & EXTRACTION YIELD
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'milling' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Batch Milling Production Runs & Mass-Balance Extraction
                            </h2>
                            <p className="text-xs text-slate-400">Yield tracking: Grade 1 Sifted, Grade 2, Animal Bran Byproducts, and Milling Loss</p>
                        </div>
                        <button
                            onClick={() => setShowMillingModal(true)}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                        >
                            + Start New Milling Batch
                        </button>
                    </div>

                    <div className="space-y-4">
                        {millingBatches.map(b => (
                            <div key={b.id} className="p-6 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
                                    <div>
                                        <span className="font-mono text-xs font-black text-emerald-600 uppercase">{b.batchNumber}</span>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                                            Crush Run: {b.rawMaizeInputKg.toLocaleString()} KG from {b.sourceSiloName}
                                        </h3>
                                        <p className="text-xs text-slate-400">Operated by {b.operatorName} · {b.startTime}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black uppercase">
                                            Yield: {b.grade1YieldPct}% Grade 1
                                        </span>
                                        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-black uppercase">
                                            Loss: {b.lossPct}%
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                                        <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase">Grade 1 Flour</p>
                                        <p className="text-xl font-black text-emerald-600 mt-1">{b.grade1FlourKg.toLocaleString()} <span className="text-xs">KG</span></p>
                                        <p className="text-[10px] text-slate-400 font-bold">{b.grade1YieldPct}%</p>
                                    </div>
                                    <div className="p-4 bg-teal-50/50 dark:bg-teal-950/30 rounded-2xl border border-teal-100 dark:border-teal-900/30">
                                        <p className="text-[10px] font-black text-teal-800 dark:text-teal-300 uppercase">Grade 2 Flour</p>
                                        <p className="text-xl font-black text-teal-600 mt-1">{b.grade2FlourKg.toLocaleString()} <span className="text-xs">KG</span></p>
                                        <p className="text-[10px] text-slate-400 font-bold">{b.grade2YieldPct}%</p>
                                    </div>
                                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                        <p className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase">Maize Bran (Feeds)</p>
                                        <p className="text-xl font-black text-amber-600 mt-1">{b.maizeBranKg.toLocaleString()} <span className="text-xs">KG</span></p>
                                        <p className="text-[10px] text-slate-400 font-bold">To Feeds Mixer</p>
                                    </div>
                                    <div className="p-4 bg-yellow-50/50 dark:bg-yellow-950/30 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
                                        <p className="text-[10px] font-black text-yellow-800 dark:text-yellow-300 uppercase">Maize Germ & Pollard</p>
                                        <p className="text-xl font-black text-yellow-600 mt-1">{(b.maizeGermKg + b.pollardKg).toLocaleString()} <span className="text-xs">KG</span></p>
                                        <p className="text-[10px] text-slate-400 font-bold">High-Protein Feed</p>
                                    </div>
                                    <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                        <p className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase">Milling & Dust Loss</p>
                                        <p className="text-xl font-black text-rose-600 mt-1">{b.millingLossKg.toLocaleString()} <span className="text-xs">KG</span></p>
                                        <p className="text-[10px] text-slate-400 font-bold">{b.lossPct}%</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 6: PACKAGING & PIECE-RATE LABOR
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'packaging' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Flour Packaging Shifts & Human Piece-Rate Wage Tracker
                            </h2>
                            <p className="text-xs text-slate-400">Tracking 24x2kg bales, 10kg bags, packaging bag inventory, and direct labor pay</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {packagingShifts.map(p => (
                            <div key={p.id} className="p-6 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-mono text-xs font-black text-indigo-600">{p.shiftCode}</span>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">{p.flourType} ({p.packageSize})</h3>
                                        <p className="text-xs text-slate-400">Packed on {p.date} · Lot #{p.lotBatchCode}</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-[9px] font-black uppercase">
                                        {p.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl text-center">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Bales Packed</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{p.totalUnitsPacked}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Weight</p>
                                        <p className="text-xl font-black text-indigo-600 mt-0.5">{(p.totalWeightKg / 1000).toFixed(1)} MT</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Piece-Rate Pay</p>
                                        <p className="text-xl font-black text-emerald-600 mt-0.5">KES {p.totalLaborCostKES}</p>
                                    </div>
                                </div>

                                <div className="text-xs space-y-1">
                                    <p className="font-bold text-slate-700 dark:text-slate-300">Packaging Team:</p>
                                    <p className="text-slate-400">{p.teamMembers.join(' · ')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 7: ANIMAL FEEDS FORMULATION (WASTE PROCESSING)
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'animal_feeds' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Animal Feeds Formulation & By-Product Value Addition
                            </h2>
                            <p className="text-xs text-slate-400">Converting maize bran, germ & pollard into Dairy Meal, Pig Grower & Poultry Feeds</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {feedBatches.map(f => (
                            <div key={f.id} className="p-6 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="font-mono text-xs font-black text-blue-600">{f.batchCode}</span>
                                        <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">{f.feedType}</h3>
                                        <p className="text-xs text-slate-400">Produced {f.producedDate}</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-[9px] font-black uppercase">
                                        {f.status}
                                    </span>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-2 text-xs">
                                    <div className="flex justify-between text-slate-500">
                                        <span>Maize Bran / Germ / Pollard:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{(f.rawBranUsedKg + f.rawGermUsedKg + f.pollardUsedKg).toLocaleString()} kg</span>
                                    </div>
                                    <div className="flex justify-between text-slate-500">
                                        <span>Mineral & Premix Additives:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{f.additivesUsedKg} kg</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-black">
                                        <span>Bags Packed ({f.bagSizeKg}kg):</span>
                                        <span className="font-mono text-indigo-600">{f.bagsProduced} Bags</span>
                                    </div>
                                    <div className="flex justify-between font-black">
                                        <span className="text-emerald-600">Selling Price / Bag:</span>
                                        <span className="font-mono text-emerald-600">KES {f.sellingPricePerBagKES}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 8: SALES & DISTRIBUTION
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'sales' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Flour & Feeds Sales Invoicing & Van Distribution
                            </h2>
                            <p className="text-xs text-slate-400">Supermarket distributors, wholesalers, walk-in retailers, and route van dispatch</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <tr>
                                        <th className="p-4">Invoice #</th>
                                        <th className="p-4">Customer</th>
                                        <th className="p-4">Product</th>
                                        <th className="p-4">Quantity</th>
                                        <th className="p-4">Unit Price</th>
                                        <th className="p-4">Total Amount</th>
                                        <th className="p-4">Payment</th>
                                        <th className="p-4">Delivery</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {salesOrders.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-mono font-black text-slate-900 dark:text-white">{s.orderNumber}</td>
                                            <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                                                {s.customerName}
                                                <span className="block text-[9px] text-slate-400">{s.customerType}</span>
                                            </td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{s.productName}</td>
                                            <td className="p-4 font-mono font-black text-indigo-600">{s.quantity} {s.unitSize}</td>
                                            <td className="p-4 font-mono text-slate-500">KES {s.unitPrice}</td>
                                            <td className="p-4 font-mono font-black text-emerald-600">KES {s.totalAmount.toLocaleString()}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase">
                                                    {s.paymentMethod} · {s.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[10px] text-slate-400">{s.deliveryLocation}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TAB 9: COGM & UNIT COSTING
            ════════════════════════════════════════════════════════════════ */}
            {activeTab === 'costing' && (
                <div className="space-y-6">
                    <div className="p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-150 dark:border-slate-700 shadow-sm space-y-6">
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Cost of Goods Manufactured (COGM) & Unit Economics
                            </h2>
                            <p className="text-xs text-slate-400">Real-time unit cost breakdown per 2kg packet and per 24x2kg bale</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-amber-50/60 dark:bg-amber-950/30 rounded-3xl border border-amber-200 dark:border-amber-900/40 space-y-4">
                                <h4 className="text-xs font-black uppercase text-amber-900 dark:text-amber-300">Raw Maize Grain Cost</h4>
                                <p className="text-3xl font-black text-amber-600">KES 48.00 <span className="text-xs text-slate-400 font-medium">/ kg</span></p>
                                <p className="text-xs text-slate-500">With 66% extraction, raw maize cost per 1kg flour = KES 72.70</p>
                            </div>
                            <div className="p-6 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-3xl border border-indigo-200 dark:border-indigo-900/40 space-y-4">
                                <h4 className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-300">Total Unit Cost (2kg Packet)</h4>
                                <p className="text-3xl font-black text-indigo-600">KES 158.50</p>
                                <p className="text-xs text-slate-500">Grain KES 145.40 + Bag KES 5.50 + Power/Premix KES 4.60 + Labor KES 3.00</p>
                            </div>
                            <div className="p-6 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-3xl border border-emerald-200 dark:border-emerald-900/40 space-y-4">
                                <h4 className="text-xs font-black uppercase text-emerald-900 dark:text-emerald-300">Wholesale Margin (24x2kg Bale)</h4>
                                <p className="text-3xl font-black text-emerald-600">KES 376.00 <span className="text-xs text-emerald-700 font-medium">(16.5%)</span></p>
                                <p className="text-xs text-slate-500">Selling Price KES 2,280 - COGM KES 1,904 = Gross Profit KES 376</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: NEW WEIGHBRIDGE INTAKE
            ════════════════════════════════════════════════════════════════ */}
            {showWeighbridgeModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-gradient-to-r from-amber-600 to-yellow-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-wider">Dual-Pass Weighbridge Scale Intake</h3>
                                <p className="text-[10px] font-medium opacity-90">Calculate Net grain weight & generate Goods Received Note</p>
                            </div>
                            <button 
                                onClick={() => setShowWeighbridgeModal(false)}
                                className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveWeighbridgeTicket} className="p-8 space-y-5 overflow-y-auto max-h-[78vh] custom-scrollbar">
                            {/* Supplier & Vehicle */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Supplier / Farmer *</label>
                                    <select
                                        value={wbForm.supplierId}
                                        onChange={e => {
                                            const s = suppliers.find(sup => sup.id === e.target.value);
                                            setWbForm(prev => ({ ...prev, supplierId: e.target.value, supplierName: s?.name || '' }));
                                        }}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                                    >
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.supplierType})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Truck Registration No *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. KDA 482B"
                                        value={wbForm.truckRegistration}
                                        onChange={e => setWbForm(prev => ({ ...prev, truckRegistration: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Driver Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Peter Kipchoge"
                                        value={wbForm.driverName}
                                        onChange={e => setWbForm(prev => ({ ...prev, driverName: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Driver Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="+254 711 000000"
                                        value={wbForm.driverPhone}
                                        onChange={e => setWbForm(prev => ({ ...prev, driverPhone: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                                    />
                                </div>
                            </div>

                            {/* Dual Pass Scales */}
                            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/30 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                    ⚖️ Digital Weighbridge Scale Readings
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">2nd Pass: Gross (Loaded) KG *</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="e.g. 28450"
                                            value={wbForm.grossWeightKg || ''}
                                            onChange={e => setWbForm(prev => ({ ...prev, grossWeightKg: parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-black text-amber-600 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">1st Pass: Tare (Empty) KG *</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="e.g. 12150"
                                            value={wbForm.tareWeightKg || ''}
                                            onChange={e => setWbForm(prev => ({ ...prev, tareWeightKg: parseFloat(e.target.value) || 0 }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 dark:text-slate-300 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">Bag Count (Gunny Bags)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 180"
                                            value={wbForm.bagCount || ''}
                                            onChange={e => setWbForm(prev => ({ ...prev, bagCount: parseInt(e.target.value) || 0 }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Moisture & Quality */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Moisture % (Std: 13.5%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={wbForm.moistureContentPct || ''}
                                        onChange={e => setWbForm(prev => ({ ...prev, moistureContentPct: parseFloat(e.target.value) || 13.5 }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Buying Rate (KES / KG)</label>
                                    <input
                                        type="number"
                                        value={wbForm.buyingPricePerKg || ''}
                                        onChange={e => setWbForm(prev => ({ ...prev, buyingPricePerKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-emerald-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Target Storage Silo</label>
                                    <select
                                        value={wbForm.targetSiloId}
                                        onChange={e => setWbForm(prev => ({ ...prev, targetSiloId: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                                    >
                                        {silos.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Real-time Calculation Summary Box */}
                            <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Base Net Weight (Gross - Tare):</span>
                                    <span className="font-mono font-bold text-white">{calculatedWb.baseNet.toLocaleString()} KG</span>
                                </div>
                                {calculatedWb.shrinkageKg > 0 && (
                                    <div className="flex justify-between text-xs text-amber-400">
                                        <span>Moisture Shrinkage Deduction ({wbForm.moistureContentPct}%):</span>
                                        <span className="font-mono font-bold">- {calculatedWb.shrinkageKg.toLocaleString()} KG</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm font-black border-t border-slate-800 pt-2 text-indigo-400">
                                    <span>Final Payable Net Maize Weight:</span>
                                    <span className="font-mono text-base">{calculatedWb.netWeight.toLocaleString()} KG</span>
                                </div>
                                <div className="flex justify-between text-base font-black border-t border-slate-800 pt-2 text-emerald-400">
                                    <span>Net Amount Payable to Supplier:</span>
                                    <span className="font-mono text-lg">KES {calculatedWb.netPayable.toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
                            >
                                Confirm Weighbridge Ticket & Print GRN
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: PRINTABLE WEIGHBRIDGE TICKET / GRN
            ════════════════════════════════════════════════════════════════ */}
            {showTicketPrintModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col max-h-[92vh]">
                        <div className="p-8 space-y-6 overflow-y-auto">
                            <div className="text-center border-b pb-4 space-y-1">
                                <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white">{currentInstitution.name}</h2>
                                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">OFFICIAL WEIGHBRIDGE SCALE TICKET & GRN</p>
                                <p className="text-[10px] text-slate-400">{currentInstitution.address || 'Industrial Area, Milling Zone'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div><span className="text-slate-400">Ticket No:</span> <strong className="font-mono">{showTicketPrintModal.ticketNumber}</strong></div>
                                <div><span className="text-slate-400">Date:</span> <strong>{showTicketPrintModal.intakeDate}</strong></div>
                                <div><span className="text-slate-400">Truck Reg:</span> <strong className="text-amber-600">{showTicketPrintModal.truckRegistration}</strong></div>
                                <div><span className="text-slate-400">Driver:</span> <strong>{showTicketPrintModal.driverName}</strong></div>
                                <div className="col-span-2"><span className="text-slate-400">Supplier:</span> <strong>{showTicketPrintModal.supplierName}</strong></div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-2 text-xs font-mono">
                                <div className="flex justify-between"><span>2nd Pass (Gross):</span> <strong>{showTicketPrintModal.grossWeightKg.toLocaleString()} KG</strong></div>
                                <div className="flex justify-between"><span>1st Pass (Tare):</span> <strong>{showTicketPrintModal.tareWeightKg.toLocaleString()} KG</strong></div>
                                <div className="flex justify-between"><span>Moisture Content:</span> <strong>{showTicketPrintModal.moistureContentPct}%</strong></div>
                                {showTicketPrintModal.moistureShrinkageKg > 0 && (
                                    <div className="flex justify-between text-amber-600"><span>Moisture Deduction:</span> <strong>- {showTicketPrintModal.moistureShrinkageKg.toLocaleString()} KG</strong></div>
                                )}
                                <div className="flex justify-between border-t pt-2 text-base font-black text-indigo-600">
                                    <span>NET GRAIN:</span> <strong>{showTicketPrintModal.netWeightKg.toLocaleString()} KG</strong>
                                </div>
                                <div className="flex justify-between text-base font-black text-emerald-600">
                                    <span>PAYABLE AMOUNT:</span> <strong>KES {showTicketPrintModal.netPayableAmount.toLocaleString()}</strong>
                                </div>
                            </div>

                            <div className="border-t pt-4 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-400">
                                <div className="border-t pt-2">Weighbridge Clerk Sign</div>
                                <div className="border-t pt-2">Driver / Supplier Sign</div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => window.print()}
                                    className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-wider"
                                >
                                    Print Ticket
                                </button>
                                <button
                                    onClick={() => setShowTicketPrintModal(null)}
                                    className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                MODAL: LOG MILLING PRODUCTION RUN
            ════════════════════════════════════════════════════════════════ */}
            {showMillingModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-150 dark:border-slate-800 flex flex-col max-h-[92vh]">
                        <div className="px-8 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black uppercase tracking-wider">Log Milling Crush Run & Yield</h3>
                                <p className="text-[10px] font-medium opacity-90">Calculate extraction mass-balance & by-product distribution</p>
                            </div>
                            <button 
                                onClick={() => setShowMillingModal(false)}
                                className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveMillingBatch} className="p-8 space-y-5 overflow-y-auto max-h-[78vh] custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Source Silo</label>
                                    <select
                                        value={millingForm.sourceSiloId}
                                        onChange={e => setMillingForm(prev => ({ ...prev, sourceSiloId: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                                    >
                                        {silos.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} (Avail: {(s.currentStockKg / 1000).toFixed(1)} MT)</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Raw Maize Input (KG) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={millingForm.rawMaizeInputKg}
                                        onChange={e => setMillingForm(prev => ({ ...prev, rawMaizeInputKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-black text-amber-600 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Outputs */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Grade 1 Flour (KG)</label>
                                    <input
                                        type="number"
                                        value={millingForm.grade1FlourKg}
                                        onChange={e => setMillingForm(prev => ({ ...prev, grade1FlourKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-emerald-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Grade 2 Flour (KG)</label>
                                    <input
                                        type="number"
                                        value={millingForm.grade2FlourKg}
                                        onChange={e => setMillingForm(prev => ({ ...prev, grade2FlourKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-teal-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Maize Bran (KG)</label>
                                    <input
                                        type="number"
                                        value={millingForm.maizeBranKg}
                                        onChange={e => setMillingForm(prev => ({ ...prev, maizeBranKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-amber-600 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Maize Germ (KG)</label>
                                    <input
                                        type="number"
                                        value={millingForm.maizeGermKg}
                                        onChange={e => setMillingForm(prev => ({ ...prev, maizeGermKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Pollard (KG)</label>
                                    <input
                                        type="number"
                                        value={millingForm.pollardKg}
                                        onChange={e => setMillingForm(prev => ({ ...prev, pollardKg: parseFloat(e.target.value) || 0 }))}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span>Grade 1 Sifted Yield:</span>
                                    <span className="font-mono font-black text-emerald-400">{calculatedMilling.g1Pct}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Animal Feed Byproducts:</span>
                                    <span className="font-mono font-black text-amber-400">{calculatedMilling.byproductPct}%</span>
                                </div>
                                <div className="flex justify-between border-t border-slate-800 pt-1">
                                    <span>Milling & Moisture Loss:</span>
                                    <span className="font-mono font-black text-rose-400">{calculatedMilling.lossKg} KG ({calculatedMilling.lossPct}%)</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95"
                            >
                                Complete & Post Milling Batch
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default GrainMillerManager;
