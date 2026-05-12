import React, { useState, useEffect, useMemo } from 'react';
import { 
    ArchiveBoxIcon, PlusIcon, SparklesIcon, SearchIcon, CheckCircleIcon, 
    ClipboardListIcon, CurrencyIcon, ExclamationTriangleIcon, BeakerIcon, 
    PencilIcon, DocumentTextIcon, ClockIcon, UserIcon, TrashIcon,
    ArrowPathIcon, ChartBarIcon, CreditCardIcon, EnvelopeIcon, PhoneIcon,
    ShieldCheckIcon, CheckBadgeIcon, UsersIcon, BanknotesIcon, BellIcon, SettingsIcon, PrinterIcon
} from '../icons';
import { apiService } from '../../services/apiService';
import { 
    generatePharmacyInventoryReportPdf,
    generatePharmacyExpiryReportPdf,
    generatePharmacyStaffPayslipPdf,
    generatePharmacyReceiptPdf,
    generatePharmacySalesReportPdf,
    generateDetailedPharmacySalesReportPdf
} from '../../services/pdfService';
import {
    HISPharmacyInventory, 
    HISPharmacyBatch, 
    HISPrescription,
    HISPrescriptionItem,
    HISPatient,
    PharmacySale,
    PharmacyLedger,
    PharmacyStaff,
    PharmacySaleItem,
    PharmacySettings,
    Institution,
    User
} from '../../types';
import { AddPharmacyInventoryModal } from './AddPharmacyInventoryModal';
import { SmartPharmacyInventoryImporterModal } from './SmartPharmacyInventoryImporterModal';
import { DispenseMedicationModal } from './DispenseMedicationModal';


export const ModernPharmacyManager: React.FC<{ 
    institutionId: string; 
    currentInstitution?: Institution | null;
    currentUser: User;
}> = ({ institutionId, currentInstitution, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'prescriptions' | 'hr' | 'accounting' | 'automation' | 'reports' | 'sales' | 'config'>('dashboard');
    const [reportsSubTab, setReportsSubTab] = useState<'general' | 'sales'>('general');
    const [salesFilter, setSalesFilter] = useState<'day' | 'week' | 'month' | 'period'>('day');
    const [salesStartDate, setSalesStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [salesEndDate, setSalesEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Core Data
    const [inventory, setInventory] = useState<HISPharmacyInventory[]>([]);
    const [batches, setBatches] = useState<HISPharmacyBatch[]>([]);
    const [prescriptions, setPrescriptions] = useState<HISPrescription[]>([]);
    const [sales, setSales] = useState<PharmacySale[]>([]);
    const [ledger, setLedger] = useState<PharmacyLedger[]>([]);
    const [staff, setStaff] = useState<PharmacyStaff[]>([]);
    const [patients, setPatients] = useState<HISPatient[]>([]);
    const [saleItems, setSaleItems] = useState<PharmacySaleItem[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [posCart, setPosCart] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<HISPatient | null>(null);
    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<PharmacyStaff | null>(null);
    const [isAddLedgerOpen, setIsAddLedgerOpen] = useState(false);
    const [editingLedger, setEditingLedger] = useState<PharmacyLedger | null>(null);
    const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
    const [editingInventory, setEditingInventory] = useState<HISPharmacyInventory | null>(null);
    const [isImportInventoryOpen, setIsImportInventoryOpen] = useState(false);
    const [selectedInventoryForBatch, setSelectedInventoryForBatch] = useState<HISPharmacyInventory | null>(null);
    const [selectedPrescriptionForDispense, setSelectedPrescriptionForDispense] = useState<HISPrescription | null>(null);
    const [selectedPrescriptionForAudit, setSelectedPrescriptionForAudit] = useState<HISPrescription | null>(null);
    const [isAddPrescriptionOpen, setIsAddPrescriptionOpen] = useState(false);
    const [isRegisterPatientOpen, setIsRegisterPatientOpen] = useState(false);
    const [settings, setSettings] = useState<PharmacySettings | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [inv, batchRecords, prescs, saleRecords, saleItemRecords, ledgerRecords, staffRecords, patientRecords, alertRecords, settingsRecords] = await Promise.all([
                apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_batches', institutionId),
                apiService.fetchModuleRecords('his_prescriptions', institutionId, undefined, { order: 'created_at.desc' }),
                apiService.fetchModuleRecords('his_pharmacy_sales', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_sale_items', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_ledger', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_staff', institutionId),
                apiService.fetchModuleRecords('his_patients', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_adherence_alerts', institutionId),
                apiService.fetchModuleRecords('his_pharmacy_settings', institutionId)
            ]);

            setInventory(inv || []);
            setBatches(batchRecords || []);
            setPrescriptions(prescs || []);
            setSales(saleRecords || []);
            setSaleItems(saleItemRecords || []);
            setLedger(ledgerRecords || []);
            setStaff(staffRecords || []);
            setPatients(patientRecords || []);
            setAlerts(alertRecords || []);
            
            if (settingsRecords && settingsRecords.length > 0) {
                setSettings(settingsRecords[0]);
            } else {
                setSettings({
                    id: `set_${Date.now()}`,
                    institutionId,
                    pharmacyName: 'Modern Pharmacy Nexus',
                    lowStockThreshold: 10,
                    enableSmsReminders: true,
                    autoPrintReceipt: true,
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("Modern Pharmacy Load Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const theme = useMemo(() => {
        const t = settings?.theme || 'indigo';
        const config = {
            indigo: { accent: 'indigo-400', bg: 'indigo-500', shadow: 'shadow-indigo-500/20', glass: 'from-indigo-500/5', border: 'border-indigo-500/30', text: 'text-indigo-400' },
            emerald: { accent: 'emerald-400', bg: 'emerald-500', shadow: 'shadow-emerald-500/20', glass: 'from-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400' },
            rose: { accent: 'rose-400', bg: 'rose-500', shadow: 'shadow-rose-500/20', glass: 'from-rose-500/5', border: 'border-rose-500/30', text: 'text-rose-400' },
            amber: { accent: 'amber-400', bg: 'amber-500', shadow: 'shadow-amber-500/20', glass: 'from-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400' },
            cyan: { accent: 'cyan-400', bg: 'cyan-500', shadow: 'shadow-cyan-500/20', glass: 'from-cyan-500/5', border: 'border-cyan-500/30', text: 'text-cyan-400' },
            violet: { accent: 'violet-400', bg: 'violet-500', shadow: 'shadow-violet-500/20', glass: 'from-violet-500/5', border: 'border-violet-500/30', text: 'text-violet-400' },
            fuchsia: { accent: 'fuchsia-400', bg: 'fuchsia-500', shadow: 'shadow-fuchsia-500/20', glass: 'from-fuchsia-500/5', border: 'border-fuchsia-500/30', text: 'text-fuchsia-400' },
            sky: { accent: 'sky-400', bg: 'sky-500', shadow: 'shadow-sky-500/20', glass: 'from-sky-500/5', border: 'border-sky-500/30', text: 'text-sky-400' },
            lime: { accent: 'lime-400', bg: 'lime-500', shadow: 'shadow-lime-500/20', glass: 'from-lime-500/5', border: 'border-lime-500/30', text: 'text-lime-400' }
        };
        return config[t as keyof typeof config] || config.indigo;
    }, [settings?.theme]);

    const canAccessTab = (tab: typeof activeTab) => {
        const role = currentUser.role;
        const pharmRole = staff.find(s => s.fullName === currentUser.name)?.role || role; // Fallback to system role

        // Admin/Owner has full access
        if (role === 'retail_agent' || role === 'admin' || role === 'his_admin') return true;

        switch (pharmRole) {
            case 'Pharmacist':
                return ['dashboard', 'pos', 'inventory', 'prescriptions', 'automation', 'reports'].includes(tab);
            case 'Technician':
                return ['inventory', 'prescriptions'].includes(tab);
            case 'Cashier':
                return ['pos'].includes(tab);
            case 'Store Manager':
                return ['dashboard', 'inventory', 'reports'].includes(tab);
            default:
                // If they are a generic staff member but not in the pharmacy_staff table specifically, 
                // give them minimal access if they have the retail_agent role (handled above).
                return false;
        }
    };

    const accessibleTabs = useMemo(() => {
        const allTabs = ['dashboard', 'pos', 'inventory', 'prescriptions', 'hr', 'accounting', 'automation', 'reports', 'sales', 'config'] as const;
        return allTabs.filter(tab => canAccessTab(tab as any));
    }, [currentUser.role, staff]);

    useEffect(() => {
        if (!canAccessTab(activeTab) && accessibleTabs.length > 0) {
            setActiveTab(accessibleTabs[0]);
        }
    }, [accessibleTabs]);

    useEffect(() => { loadData(); }, [institutionId]);

    // Derived Metrics
    const [selectedReportUrl, setSelectedReportUrl] = useState<string | null>(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const handleGenerateInventoryReport = async () => {
        setIsGeneratingReport(true);
        try {
            const dataUri = await generatePharmacyInventoryReportPdf(inventory, currentInstitution!, undefined, null);
            setSelectedReportUrl(dataUri);
        } catch (e) {
            alert("Inventory report generation failed");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleGenerateExpiryReport = async () => {
        setIsGeneratingReport(true);
        try {
            const dataUri = await generatePharmacyExpiryReportPdf(batches, inventory, currentInstitution!, undefined, null);
            setSelectedReportUrl(dataUri);
        } catch (e) {
            alert("Expiry report generation failed");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleGenerateStaffPayslip = async (s: PharmacyStaff) => {
        const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        setIsGeneratingReport(true);
        try {
            const dataUri = await generatePharmacyStaffPayslipPdf(s, month, currentInstitution!, undefined, null);
            setSelectedReportUrl(dataUri);
        } catch (e) {
            alert("Payslip generation failed");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleGenerateDetailedSalesReport = async () => {
        if (!currentInstitution || !settings) return;
        setIsGeneratingReport(true);
        try {
            const filteredSales = sales.filter(s => {
                const d = new Date(s.createdAt);
                const start = new Date(salesStartDate);
                const end = new Date(salesEndDate);
                end.setHours(23, 59, 59, 999);
                return d >= start && d <= end;
            });
            
            const filteredSaleItems = saleItems.filter(si => 
                filteredSales.some(fs => fs.id === si.saleId)
            );

            const reportUrl = await generateDetailedPharmacySalesReportPdf(
                filteredSales,
                filteredSaleItems,
                inventory,
                salesStartDate,
                salesEndDate,
                currentInstitution,
                settings,
                settings.footerImageUrl || null
            );
            setSelectedReportUrl(reportUrl);
        } catch (e) {
            console.error(e);
            alert("Failed to generate detailed sales report.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleGenerateSalesReport = async () => {
        setIsGeneratingReport(true);
        try {
            // Fetch detailed sale items for analysis
            const saleItems = await apiService.fetchModuleRecords('his_pharmacy_sale_items', institutionId);
            const dataUri = await generatePharmacySalesReportPdf(
                sales, 
                saleItems || [], 
                inventory, 
                currentInstitution!, 
                undefined, 
                null
            );
            setSelectedReportUrl(dataUri);
        } catch (e) {
            console.error(e);
            alert("Sales report generation failed");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const metrics = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todaySales = sales.filter(s => s.createdAt.startsWith(today));
        const totalRevenue = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        const totalExpenses = ledger.filter(l => l.type === 'Expense').reduce((sum, l) => sum + Number(l.amount), 0);
        const lowStock = inventory.filter(i => i.stockQuantity <= (settings?.lowStockThreshold || 10)).length;
        const expiredBatches = batches.filter(b => new Date(b.expiryDate) < new Date()).length;

        return {
            todayRevenue: todaySales.reduce((sum, s) => sum + Number(s.totalAmount), 0),
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            lowStock,
            expiredBatches
        };
    }, [sales, ledger, inventory, batches, settings]);

    const addToCart = (item: HISPharmacyInventory) => {
        const existing = posCart.find(c => c.id === item.id);
        if (existing) {
            setPosCart(posCart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setPosCart([...posCart, { ...item, quantity: 1, batchId: '' }]);
        }
    };

    const handleCheckout = async () => {
        if (posCart.length === 0) return;
        setIsProcessingSale(true);
        try {
            const saleId = `sale_${Date.now()}`;
            const total = posCart.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
            
            // 1. Create Sale Record
            await apiService.saveModuleRecord('his_pharmacy_sales', {
                id: saleId,
                institutionId,
                patientId: selectedPatient?.id,
                customerName: selectedPatient?.fullName || 'Walk-in Customer',
                totalAmount: total,
                paymentMethod: 'Cash',
                paymentStatus: 'Paid',
                recordedBy: currentUser.id
            });

            // 2. Create Sale Items and Update Stock
            for (const item of posCart) {
                await apiService.saveModuleRecord('his_pharmacy_sale_items', {
                    id: `item_${Date.now()}_${item.id}`,
                    institutionId,
                    saleId: saleId,
                    medicationId: item.id,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.unitPrice * item.quantity,
                    recordedBy: currentUser.id
                });

                await apiService.updateModuleRecord('his_pharmacy_inventory', item.id, {
                    stockQuantity: item.stockQuantity - item.quantity
                });
            }

            // 3. Record in Ledger
            await apiService.saveModuleRecord('his_pharmacy_ledger', {
                id: `ldg_${Date.now()}`,
                institutionId,
                type: 'Income',
                category: 'Sales',
                amount: total,
                referenceId: saleId,
                description: `POS Sale: ${saleId}`,
                recordedBy: currentUser.id
            });

            // 4. Send SMS Reminder (Mock)
            if (selectedPatient?.contact && settings?.enableSmsReminders) {
                await apiService.saveModuleRecord('sms_outbox', {
                    id: `sms_${Date.now()}`,
                    institutionId,
                    recipient: selectedPatient.contact,
                    message: `Dear ${selectedPatient.fullName}, thank you for your purchase. Please take your medication as prescribed. Reminders have been set.`,
                    status: 'pending'
                });
            }

            alert("Checkout Successful! Stock updated and Ledger entry created.");
            
            // 5. Generate and Show Receipt Preview (ONLY if autoPrintReceipt is enabled)
            if (settings?.autoPrintReceipt) {
                const receiptData = await generatePharmacyReceiptPdf(
                    { id: saleId, createdAt: new Date().toISOString(), totalAmount: total, paymentMethod: 'Cash', paymentStatus: 'Paid' } as any,
                    posCart.map(item => ({ medicationId: item.id, quantity: item.quantity, totalPrice: item.unitPrice * item.quantity }) as any),
                    inventory,
                    settings,
                    currentInstitution as any,
                    undefined,
                    null
                );
                setSelectedReportUrl(receiptData);
            }

            setPosCart([]);
            loadData();
        } catch (e) {
            alert("Sale processing failed.");
        } finally {
            setIsProcessingSale(false);
        }
    };

    const handleAddStaff = async (staffData: any) => {
        try {
            if (editingStaff) {
                await apiService.saveModuleRecord('his_pharmacy_staff', {
                    ...staffData,
                    id: editingStaff.id,
                    updatedAt: new Date().toISOString()
                });
                alert("Staff profile updated!");
            } else {
                await apiService.saveModuleRecord('his_pharmacy_staff', {
                    ...staffData,
                    id: `stf_${Date.now()}`,
                    institutionId,
                    status: 'active',
                    hireDate: new Date().toISOString(),
                    recordedBy: currentUser.id
                });
                alert("Staff recruited successfully!");
            }
            setIsAddStaffOpen(false);
            setEditingStaff(null);
            loadData();
        } catch (e) {
            alert("Staff operation failed.");
        }
    };

    const handleAddLedger = async (ledgerData: any) => {
        try {
            if (editingLedger) {
                await apiService.saveModuleRecord('his_pharmacy_ledger', {
                    ...ledgerData,
                    id: editingLedger.id
                });
                alert("Ledger entry updated.");
            } else {
                await apiService.saveModuleRecord('his_pharmacy_ledger', {
                    ...ledgerData,
                    id: `ldg_${Date.now()}`,
                    institutionId,
                    createdAt: new Date().toISOString(),
                    recordedBy: currentUser.id
                });
                alert("Entry recorded in ledger.");
            }
            setIsAddLedgerOpen(false);
            setEditingLedger(null);
            loadData();
        } catch (e) {
            alert("Ledger operation failed.");
        }
    };

    const handleAddInventory = async (itemData: any) => {
        try {
            if (editingInventory) {
                await apiService.updateModuleRecord('his_pharmacy_inventory', editingInventory.id, {
                    ...itemData,
                    updatedAt: new Date().toISOString()
                });
                alert("Inventory item updated!");
            } else {
                await apiService.saveModuleRecord('his_pharmacy_inventory', {
                    ...itemData,
                    id: `inv_${Date.now()}`,
                    institutionId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    recordedBy: currentUser.id
                });
                alert("Inventory item added!");
            }
            setIsAddInventoryOpen(false);
            setEditingInventory(null);
            loadData();
        } catch (e) {
            alert("Inventory operation failed.");
        }
    };

    const handleAddBatch = async (batchData: any) => {
        try {
            await apiService.saveModuleRecord('his_pharmacy_batches', {
                ...batchData,
                id: `bth_${Date.now()}`,
                institutionId,
                createdAt: new Date().toISOString(),
                recordedBy: currentUser.id
            });
            alert("Batch committed to storage!");
            setSelectedInventoryForBatch(null);
            loadData();
        } catch (e) {
            alert("Batch commit failed.");
        }
    };

    const handleImportInventory = async (items: any[]) => {
        try {
            const itemsWithMeta = items.map(item => ({
                ...item,
                id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                institutionId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                recordedBy: currentUser.id
            }));
            await apiService.saveModuleRecords('his_pharmacy_inventory', itemsWithMeta);
            alert(`Bulk import of ${items.length} items completed!`);
            setIsImportInventoryOpen(false);
            loadData();
        } catch (e) {
            alert("Bulk import failed.");
        }
    };

    const handleDispenseMedication = async (prescriptionId: string, dispenseData: any) => {
        try {
            const saleId = `sale_rx_${Date.now()}`;
            const total = dispenseData.dispensedItems.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);

            // 1. Create Sale Record
            await apiService.saveModuleRecord('his_pharmacy_sales', {
                id: saleId,
                institutionId,
                patientId: dispenseData.patientId,
                totalAmount: total,
                paymentMethod: 'Cash',
                paymentStatus: 'Paid',
                recordedBy: currentUser.id
            });

            // 2. Dispense items, update stock and create sale items
            for (const item of dispenseData.dispensedItems) {
                await apiService.saveModuleRecord('his_pharmacy_sale_items', {
                    id: `item_${Date.now()}_${item.medicationId}`,
                    institutionId,
                    saleId: saleId,
                    medicationId: item.medicationId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.unitPrice * item.quantity,
                    recordedBy: currentUser.id
                });

                // Get current stock
                const invItem = inventory.find(i => i.id === item.medicationId);
                if (invItem) {
                    await apiService.updateModuleRecord('his_pharmacy_inventory', item.medicationId, {
                        stockQuantity: invItem.stockQuantity - item.quantity,
                        updatedAt: new Date().toISOString(),
                        recordedBy: currentUser.id
                    });
                }
            }

            // 3. Update Prescription status and clinical notes
            await apiService.updateModuleRecord('his_prescriptions', prescriptionId, {
                status: 'dispensed',
                clinicalNotes: dispenseData.clinicalNotes,
                medicationImage: dispenseData.medicationImage,
                attachedFiles: dispenseData.attachedFiles,
                recordedBy: currentUser.id
            });

            // 4. Record in Ledger
            await apiService.saveModuleRecord('his_pharmacy_ledger', {
                id: `ldg_${Date.now()}`,
                institutionId,
                type: 'Income',
                category: 'Clinical Sales',
                amount: total,
                referenceId: saleId,
                description: `Prescription Dispensed: ${prescriptionId}`,
                recordedBy: currentUser.id
            });

            alert("Medication dispensed successfully!");
            setSelectedPrescriptionForDispense(null);
            loadData();
        } catch (error) {
            console.error("Dispensing failed:", error);
            alert("Failed to finalize dispensing.");
        }
    };

    const handleSyncReminders = async () => {
        setIsLoading(true);
        try {
            // Find all pending prescriptions
            const pending = prescriptions.filter(p => p.status === 'pending');
            const newAlerts: any[] = [];
            
            for (const p of pending) {
                const items = (p as any).items || [];
                const patient = patients.find(pat => pat.id === p.patientId);
                
                for (const item of items) {
                    // 1. Medication Reminders (if enabled)
                    if (settings?.medicationRemindersEnabled) {
                        newAlerts.push({
                            id: `alt_med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            institutionId,
                            patientId: p.patientId,
                            drugName: item.drugName,
                            reminderTime: '08:00:00',
                            alertType: 'medication',
                            frequency: item.frequency || 'Daily',
                            messageTemplate: `Hi ${patient?.fullName}, it's time for your ${item.drugName} dosage. Stay healthy!`,
                            status: 'active',
                            createdAt: new Date().toISOString()
                        });
                    }

                    // 2. Stop Reminders (if course has duration)
                    if (settings?.stopRemindersEnabled && item.duration) {
                        const days = parseInt(item.duration) || 5;
                        const stopDate = new Date();
                        stopDate.setDate(stopDate.getDate() + days);
                        
                        newAlerts.push({
                            id: `alt_stop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            institutionId,
                            patientId: p.patientId,
                            drugName: item.drugName,
                            alertType: 'stop_medication',
                            stopDate: stopDate.toISOString().split('T')[0],
                            reminderTime: '10:00:00',
                            frequency: 'Once',
                            messageTemplate: `Hi ${patient?.fullName}, today marks the end of your ${item.drugName} course. Please stop taking it now.`,
                            status: 'active',
                            createdAt: new Date().toISOString()
                        });
                    }
                }

                // 3. Checkup Reminders (Fallback if clinical notes imply it)
                if (settings?.checkupRemindersEnabled && p.clinicalNotes?.toLowerCase().includes('return')) {
                    const checkupDate = new Date();
                    checkupDate.setDate(checkupDate.getDate() + 14); // Default 2 weeks
                    
                    newAlerts.push({
                        id: `alt_chk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        institutionId,
                        patientId: p.patientId,
                        alertType: 'checkup',
                        checkupDate: checkupDate.toISOString().split('T')[0],
                        reminderTime: '09:00:00',
                        frequency: 'Once',
                        messageTemplate: `Hi ${patient?.fullName}, this is a reminder for your follow-up checkup scheduled for ${checkupDate.toLocaleDateString()}.`,
                        status: 'active',
                        createdAt: new Date().toISOString()
                    });
                }
            }

            if (newAlerts.length > 0) {
                await apiService.saveModuleRecords('his_pharmacy_adherence_alerts', newAlerts);
                alert(`Successfully synthesized ${newAlerts.length} Bio-Adherence nodes into the GSM network.`);
                loadData();
            } else {
                alert("No new prescription patterns detected for synthesis.");
            }
        } catch (e) {
            alert("Auto-sync failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setIsLoading(true);
        try {
            await apiService.saveModuleRecord('his_pharmacy_settings', {
                ...settings,
                updatedAt: new Date().toISOString(),
                recordedBy: currentUser.id
            });
            alert("Pharmacy configuration updated successfully!");
            loadData();
        } catch (e) {
            alert("Update failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#07070a] text-slate-200 p-8 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* Header / Nav */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div className="relative">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-[80px]"></div>
                    <h1 className="text-5xl font-black uppercase tracking-tighter italic leading-none">
                        Neo <span className={`text-transparent bg-clip-text bg-gradient-to-r from-${theme.accent} via-emerald-400 to-cyan-400`}>Pharmaceutics</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">
                            {settings?.pharmacyName || 'Advanced Bio-Logistic Terminal'} v4.0
                        </p>
                    </div>
                </div>

                <div className="flex bg-white/5 backdrop-blur-3xl p-1.5 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-x-auto custom-scrollbar-horizontal pb-2 max-w-full">
                    {accessibleTabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3.5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest transition-all duration-500 flex items-center gap-3 ${
                                activeTab === tab ? `bg-${theme.bg} text-white shadow-xl ${theme.shadow} ring-4 ring-${theme.bg}/20` : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab === 'dashboard' && <ChartBarIcon className="w-4 h-4" />}
                            {tab === 'pos' && <CreditCardIcon className="w-4 h-4" />}
                            {tab === 'inventory' && <ArchiveBoxIcon className="w-4 h-4" />}
                            {tab === 'prescriptions' && <DocumentTextIcon className="w-4 h-4" />}
                            {tab === 'hr' && <UsersIcon className="w-4 h-4" />}
                            {tab === 'accounting' && <BanknotesIcon className="w-4 h-4" />}
                            {tab === 'automation' && <SparklesIcon className="w-4 h-4" />}
                            {tab === 'reports' && <ClipboardListIcon className="w-4 h-4" />}
                            {tab === 'sales' && <BanknotesIcon className="w-4 h-4" />}
                            {tab === 'config' && <SettingsIcon className="w-4 h-4" />}
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* DASHBOARD VIEW */}
            {activeTab === 'dashboard' && (
                <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className={`glass-morphism-dark p-10 rounded-[3.5rem] border border-white/5 group hover:${theme.border} transition-all duration-700`}>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Daily Yield</p>
                            <div className="flex items-end gap-4">
                                <h3 className="text-4xl font-black italic tracking-tighter">KES {metrics.todayRevenue.toLocaleString()}</h3>
                                <span className={`${theme.text} text-[10px] font-black mb-2 px-1`}>+14% ↗</span>
                            </div>
                        </div>
                        <div className="glass-morphism-dark p-10 rounded-[3.5rem] border border-white/5">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Financial Health</p>
                            <h3 className={`text-4xl font-black italic tracking-tighter ${metrics.netProfit >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                                KES {metrics.netProfit.toLocaleString()}
                            </h3>
                        </div>
                        <div className="glass-morphism-dark p-10 rounded-[3.5rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-rose-500/20 transition-all"></div>
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Critical Stock</p>
                            <h3 className="text-4xl font-black italic tracking-tighter text-rose-400">{metrics.lowStock} <span className="text-xs text-slate-600">DRUGS</span></h3>
                        </div>
                        <div className="glass-morphism-dark p-10 rounded-[3.5rem] border border-white/5">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Bio-Hazard / Expiry</p>
                            <h3 className="text-4xl font-black italic tracking-tighter text-amber-400">{metrics.expiredBatches} <span className="text-xs text-slate-600">BATCHES</span></h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="glass-morphism-dark rounded-[4rem] border border-indigo-500/10 p-12 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-10 opacity-10">
                                 <SparklesIcon className="w-24 h-24 text-indigo-400" />
                             </div>
                             <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-8">Bio-Logistic <span className="text-indigo-400">Forecasting</span></h3>
                             <div className="space-y-6">
                                 {inventory.slice(0, 3).map((item, idx) => (
                                     <div key={item.id || idx} className="p-6 bg-indigo-500/5 rounded-[2.5rem] border border-indigo-500/10 flex justify-between items-center group hover:bg-indigo-500/10 transition-all">
                                         <div>
                                             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{item.category}</p>
                                             <h4 className="text-sm font-black uppercase text-white italic">{item.name}</h4>
                                         </div>
                                         <div className="text-right">
                                             <p className="text-[9px] font-black text-slate-500 uppercase">Stock-out ETA</p>
                                             <p className="text-lg font-black text-rose-400 italic">~12 Days</p>
                                         </div>
                                     </div>
                                 ))}
                                 <button className="w-full py-4 border border-indigo-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all">
                                     Generate AI Procurement Nodes
                                 </button>
                             </div>
                        </div>

                        <div className="glass-morphism-dark rounded-[4rem] border border-emerald-500/10 p-12 relative overflow-hidden">
                             <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-8">Interaction <span className="text-emerald-400">Sentinel</span></h3>
                             <div className="p-10 bg-emerald-500/5 rounded-[3rem] border border-emerald-500/10 text-center flex flex-col items-center justify-center min-h-[300px]">
                                 <ShieldCheckIcon className="w-20 h-20 text-emerald-500/20 mb-6" />
                                 <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Real-time prescription <br/>audit core active</p>
                                 <div className="flex gap-2 mt-8">
                                     <span className="px-3 py-1 bg-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase rounded-full border border-emerald-500/30">LORENZ-V2 AUDIT</span>
                                     <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase rounded-full border border-emerald-500/30">ALLERGY CHECK</span>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {/* Summary Lists/Charts Placeholder */}
                        <div className="md:col-span-2 glass-morphism-dark rounded-[4rem] border border-white/5 p-12 overflow-hidden relative">
                             <div className="flex justify-between items-center mb-12">
                                 <h3 className="text-2xl font-black uppercase tracking-tighter italic">Revenue <span className="text-indigo-400">Matrix</span></h3>
                                 <div className="flex gap-2">
                                     <button className="px-5 py-2 rounded-full bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500">Weekly</button>
                                     <button className="px-5 py-2 rounded-full bg-indigo-500 text-[9px] font-black uppercase tracking-widest text-white">Monthly</button>
                                 </div>
                             </div>
                             
                             <div className="h-64 flex items-end gap-4 px-4 overflow-x-auto no-scrollbar">
                                 {[40, 60, 45, 90, 120, 80, 150, 110, 180, 140, 200, 170].map((v, i) => (
                                     <div key={i} className={`flex-1 min-w-[20px] bg-gradient-to-t from-${theme.bg} to-emerald-400 rounded-t-2xl relative group transition-all hover:scale-x-125`} style={{ height: `${v}%` }}>
                                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl px-3 py-1 rounded-lg text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity">
                                             KES {v*1000}
                                         </div>
                                     </div>
                                 ))}
                             </div>
                             <div className="flex justify-between mt-8 px-4 text-[9px] font-black text-slate-600 tracking-widest uppercase">
                                 <span>JAN</span><span>FEB</span><span>MAR</span><span>APR</span><span>MAY</span><span>JUN</span>
                                 <span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span><span>NOV</span><span>DEC</span>
                             </div>
                        </div>

                        <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 space-y-10">
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Recent <span className="text-emerald-400">Orders</span></h3>
                            <div className="space-y-6">
                                {sales.slice(0, 5).map(s => (
                                    <div key={s.id} className="flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all">
                                                <CreditCardIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase italic text-white">{s.customerName}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{new Date(s.createdAt).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black text-white italic">KES {Number(s.totalAmount).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full py-5 rounded-[2rem] bg-white/5 text-[9px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all text-slate-400">View All Transaction Nodes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* POS TERMINAL */}
            {activeTab === 'pos' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 animate-fade-in">
                    <div className="md:col-span-2 glass-morphism-dark rounded-[4rem] border border-white/5 flex flex-col h-[75vh] overflow-hidden">
                        <div className="p-10 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex gap-6 items-center">
                                <div className="flex-1 flex items-center gap-4 bg-black/40 px-8 py-4 rounded-3xl border border-white/10 focus-within:border-indigo-500/50 transition-all">
                                    <SearchIcon className="w-5 h-5 text-slate-500" />
                                    <input 
                                        type="text" 
                                        placeholder="SEARCH MOLECULAR REGISTRY OR NAME..." 
                                        className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-full text-white placeholder:text-slate-700"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select className="bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 outline-none focus:border-indigo-500/50">
                                    <option>Generic</option>
                                    <option>Branded</option>
                                    <option>Controlled</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 no-scrollbar">
                            {inventory.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => addToCart(item)}
                                    className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] text-left hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all">
                                            <BeakerIcon className="w-6 h-6" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic">{item.stockQuantity} Left</p>
                                            {item.isNarcotic && <span className="text-[7px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded border border-rose-500/30 uppercase mt-1 block">Controlled</span>}
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-black uppercase italic tracking-tighter text-white mb-2 line-clamp-1">{item.name}</h4>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-6">{item.category}</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-lg font-black italic text-indigo-400">KES {item.unitPrice.toLocaleString()}</p>
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                            <PlusIcon className="w-4 h-4" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="glass-morphism-dark rounded-[4rem] border border-white/5 flex flex-col h-[75vh] overflow-hidden bg-gradient-to-b from-indigo-500/5 to-transparent">
                        <div className="p-10 border-b border-white/5">
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic">Terminal <span className="text-emerald-400">Basket</span></h3>
                             {/* Patient Link */}
                             <div className="mt-8 relative group">
                                 <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 group-hover:border-indigo-500/30 transition-all">
                                     <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                         <UserIcon className="w-5 h-5" />
                                     </div>
                                     <div className="flex-1">
                                         <select 
                                            className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-full text-white appearance-none"
                                            onChange={(e) => {
                                                const p = patients.find(pat => pat.id === e.target.value);
                                                setSelectedPatient(p || null);
                                            }}
                                         >
                                             <option value="">Walk-in Intelligence</option>
                                             {patients.map(p => (
                                                 <option key={p.id} value={p.id}>{p.fullName}</option>
                                             ))}
                                         </select>
                                         <button 
                                            onClick={() => setIsRegisterPatientOpen(true)}
                                            className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shadow-lg shadow-indigo-500/20"
                                            title="Register New Patient Node"
                                          >
                                              <PlusIcon className="w-4 h-4" />
                                          </button>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-6 no-scrollbar">
                            {posCart.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center group animate-scale-in">
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => setPosCart(posCart.filter((_, i) => i !== idx))}
                                            className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                        <div>
                                            <p className="text-xs font-black uppercase italic text-white line-clamp-1">{item.name}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">KES {item.unitPrice} x {item.quantity}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex bg-black/40 rounded-xl border border-white/10 gap-2 p-1">
                                            <button onClick={() => {
                                                const nc = [...posCart];
                                                nc[idx].quantity = Math.max(1, nc[idx].quantity - 1);
                                                setPosCart(nc);
                                            }} className="w-6 h-6 flex items-center justify-center hover:text-white transition-colors">-</button>
                                            <span className="text-[10px] font-black w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => {
                                                const nc = [...posCart];
                                                nc[idx].quantity += 1;
                                                setPosCart(nc);
                                            }} className="w-6 h-6 flex items-center justify-center hover:text-white transition-colors">+</button>
                                        </div>
                                        <p className="text-xs font-black text-indigo-400 w-20 text-right italic">KES {(item.unitPrice * item.quantity).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                            {posCart.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                                    <ArchiveBoxIcon className="w-20 h-20 mb-6" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Basket empty. Awaiting molecular selection.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-10 bg-black/40 border-t border-white/5 space-y-8">
                             <div className="space-y-3">
                                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                     <span>Sub-Analysis</span>
                                     <span className="text-white">KES {posCart.reduce((s, i) => s + (i.unitPrice * i.quantity), 0).toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                     <span>Taxation Node (0%)</span>
                                     <span className="text-white">KES 0.00</span>
                                 </div>
                                 <div className="h-px bg-white/5 w-full"></div>
                                 <div className="flex justify-between items-center text-2xl font-black italic tracking-tighter">
                                     <span className="text-slate-400 uppercase text-[11px] not-italic tracking-[0.3em]">Total Yield</span>
                                     <span className="text-indigo-400">KES {posCart.reduce((s, i) => s + (i.unitPrice * i.quantity), 0).toLocaleString()}</span>
                                 </div>
                             </div>

                             <button 
                                onClick={handleCheckout}
                                disabled={isProcessingSale || posCart.length === 0}
                                className="w-full py-6 rounded-[2.5rem] bg-indigo-500 text-white text-xs font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30"
                             >
                                 {isProcessingSale ? (
                                     <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                 ) : (
                                     <><CheckCircleIcon className="w-5 h-5" /> Commit Transaction</>
                                 )}
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INVENTORY TRACKING */}
            {activeTab === 'inventory' && (
                <div className="glass-morphism-dark rounded-[4rem] border border-white/5 overflow-hidden animate-fade-in">
                    <div className="p-12 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter italic">Molecular <span className="text-indigo-400">Inventory</span></h3>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">{inventory.length} Active Records Linked to Distribution Hub</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-4 bg-black/40 px-8 py-4 rounded-2xl border border-white/10 w-80">
                                <SearchIcon className="w-4 h-4 text-slate-600" />
                                <input 
                                    type="text" 
                                    placeholder="FILTER INVENTORY..." 
                                    className="bg-transparent border-none outline-none text-[9px] font-black uppercase tracking-widest w-full text-white" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button onClick={() => setIsImportInventoryOpen(true)} className="bg-emerald-500 text-slate-950 px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-emerald-500/20">
                                <SparklesIcon className="w-4 h-4" /> Import Excel
                            </button>
                            <button onClick={() => setIsAddInventoryOpen(true)} className="bg-indigo-500 text-white px-8 py-4 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20">
                                <PlusIcon className="w-4 h-4" /> Add Item Manually
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/[0.03]">
                                <tr>
                                    <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Asset Formulation</th>
                                    <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Category</th>
                                    <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Quantum (Units)</th>
                                    <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Unit Value</th>
                                    <th className="px-12 py-8 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 text-right">Status Code</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {inventory.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-12 py-10">
                                            <div className="flex items-center gap-6">
                                                <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all">
                                                    <BeakerIcon className="w-7 h-7" />
                                                </div>
                                                <div>
                                                    <p className="text-base font-black uppercase tracking-tighter italic text-white">{item.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">SKU: {item.sku || `PHA-${item.id.slice(0, 8).toUpperCase()}`}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-10">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-1.5 bg-white/5 rounded-full border border-white/5">{item.category}</span>
                                        </td>
                                        <td className="px-8 py-10 font-bold text-white">
                                            <span className={item.stockQuantity <= item.reorderLevel ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}>{item.stockQuantity}</span>
                                            <span className="text-[9px] text-slate-600 ml-2 uppercase">Units</span>
                                        </td>
                                        <td className="px-8 py-10 font-black italic text-indigo-400">KES {item.unitPrice.toLocaleString()}</td>
                                        <td className="px-12 py-10 text-right">
                                            <div className="flex items-center justify-end gap-4">
                                                <button 
                                                    onClick={() => setSelectedInventoryForBatch(item)}
                                                    className="p-2 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all group/btn"
                                                    title="Add Batch"
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => { setEditingInventory(item); setIsAddInventoryOpen(true); }}
                                                    className="p-2 rounded-xl border border-white/5 bg-white/5 text-slate-500 hover:text-indigo-400 hover:border-indigo-400/30 transition-all"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                                                    item.stockQuantity <= item.reorderLevel 
                                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.stockQuantity <= item.reorderLevel ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse`}></div>
                                                    {item.stockQuantity <= item.reorderLevel ? 'Critical Level' : 'Stable Ops'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* DIGITAL HR */}
            {activeTab === 'hr' && (
                 <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                             <div className="flex items-center gap-6 mb-10">
                                 <div className="w-16 h-16 rounded-[2rem] bg-indigo-500 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/20">
                                     <UsersIcon className="w-8 h-8" />
                                 </div>
                                 <div>
                                     <h3 className="text-2xl font-black uppercase tracking-tighter italic">Human <span className="text-indigo-400">Resources</span></h3>
                                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{staff.length} Deployed Operators</p>
                                 </div>
                             </div>
                             
                             <div className="space-y-6">
                                 <div className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Core Payroll Commitment</p>
                                     <h4 className="text-3xl font-black italic tracking-tighter">KES {staff.reduce((s, st) => s + (st.salary || 0), 0).toLocaleString()}</h4>
                                 </div>
                                 <button onClick={() => setIsAddStaffOpen(true)} className="w-full py-5 rounded-[2rem] bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-emerald-500/20">Recruit New Operator</button>
                             </div>
                        </div>

                        <div className="md:col-span-2 glass-morphism-dark rounded-[4rem] border border-white/5 overflow-hidden">
                             <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                 <h3 className="text-xl font-black uppercase tracking-tighter italic text-indigo-400">Operator <span className="text-white">Registry</span></h3>
                             </div>
                             <div className="divide-y divide-white/5">
                                 {staff.map(s => (
                                     <div key={s.id} className="p-10 flex justify-between items-center hover:bg-white/[0.01] transition-all">
                                         <div className="flex items-center gap-6">
                                             <div className="w-16 h-16 rounded-[2rem] bg-slate-100/5 border border-white/5 flex items-center justify-center text-slate-500 group overflow-hidden relative shadow-inner">
                                                 <UserIcon className="w-8 h-8" />
                                                 {/* Status Indicator */}
                                                 <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#07070a]"></div>
                                             </div>
                                             <div>
                                                 <h4 className="text-lg font-black uppercase italic tracking-tighter text-white">{s.fullName || 'Authorized User'}</h4>
                                                 <div className="flex gap-4 mt-1.5">
                                                     <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2"><ShieldCheckIcon className="w-3.5 h-3.5" />{s.role}</span>
                                                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><ClockIcon className="w-3.5 h-3.5" />{s.shiftPreference || 'Standard'}</span>
                                                 </div>
                                             </div>
                                         </div>
                                         <div className="text-right flex flex-col items-end gap-3">
                                             <p className="text-sm font-black italic tracking-tighter text-white">KES {s.salary.toLocaleString()}</p>
                                             <div className="flex gap-2">
                                                 <button 
                                                    onClick={() => { setEditingStaff(s); setIsAddStaffOpen(true); }}
                                                    className="p-2 rounded-full border border-white/5 bg-white/5 text-slate-500 hover:text-indigo-400 hover:border-indigo-400/30 transition-all"
                                                 >
                                                     <PencilIcon className="w-4 h-4" />
                                                 </button>
                                                 <button className="px-4 py-1.5 rounded-full border border-white/10 text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 hover:border-indigo-400/30 transition-all">Config Access</button>
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                                 {staff.length === 0 && (
                                     <div className="p-20 text-center opacity-20 italic font-black uppercase tracking-widest text-[10px]">No staff deployments recorded in local matrix.</div>
                                 )}
                             </div>
                        </div>
                    </div>
                 </div>
            )}

            {/* LEDGER / ACCOUNTING */}
            {activeTab === 'accounting' && (
                 <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                             <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-10 text-indigo-400">Financial <span className="text-white">Terminal</span></h3>
                             <div className="space-y-8">
                                 <div>
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Total Liquidity Flow</p>
                                     <h4 className="text-4xl font-black italic tracking-tighter text-white">KES {metrics.totalRevenue.toLocaleString()}</h4>
                                 </div>
                                 <div className="h-px bg-white/5 w-full"></div>
                                 <div>
                                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Total Absorption (Exp)</p>
                                     <h4 className="text-4xl font-black italic tracking-tighter text-rose-400">KES {metrics.totalExpenses.toLocaleString()}</h4>
                                 </div>
                                 <div className="h-px bg-white/5 w-full"></div>
                                 <button onClick={() => setIsAddLedgerOpen(true)} className="w-full py-6 rounded-[2rem] bg-indigo-500 text-white text-[11px] font-black uppercase tracking-[0.4em] shadow-22xl shadow-indigo-500/20 hover:scale-105 transition-all">Record New Entry</button>
                             </div>
                        </div>

                        <div className="md:col-span-2 glass-morphism-dark rounded-[4rem] border border-white/5 overflow-hidden">
                             <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                                 <h3 className="text-xl font-black uppercase tracking-tighter italic">Ledger <span className="text-emerald-400">Stream</span></h3>
                             </div>
                             <div className="overflow-x-auto overflow-y-auto max-h-[60vh] no-scrollbar">
                                 <table className="w-full text-left">
                                     <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-xl">
                                         <tr>
                                             <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Node ID</th>
                                             <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Category</th>
                                             <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Flow</th>
                                             <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Impact</th>
                                             <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Timestamp</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-white/5">
                                         {ledger.map(l => (
                                             <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                                                 <td className="px-10 py-6 text-[10px] font-bold text-slate-500 flex items-center gap-4">
                                                     <button 
                                                       onClick={() => { setEditingLedger(l); setIsAddLedgerOpen(true); }}
                                                       className="p-1.5 opacity-0 group-hover:opacity-100 rounded bg-white/5 text-slate-500 hover:text-indigo-400 transition-all"
                                                     >
                                                         <PencilIcon className="w-3 h-3" />
                                                     </button>
                                                     #{l.id.slice(0, 8)}
                                                 </td>
                                                 <td className="px-6 py-6 font-black text-white uppercase text-[10px] tracking-widest">{l.category}</td>
                                                 <td className="px-6 py-6">
                                                     <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                         l.type === 'Income' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                     }`}>
                                                         {l.type === 'Income' ? 'Credit Node' : 'Debit Node'}
                                                     </span>
                                                 </td>
                                                 <td className={`px-6 py-6 font-black italic text-lg ${l.type === 'Income' ? 'text-indigo-400' : 'text-rose-400'}`}>
                                                     {l.type === 'Income' ? '+' : '-'} {Number(l.amount).toLocaleString()}
                                                 </td>
                                                 <td className="px-10 py-6 text-right text-[10px] font-bold text-slate-600 italic">{new Date(l.createdAt).toLocaleString()}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                        </div>
                    </div>
                 </div>
            )}

            {/* PRESCRIPTIONS VAULT */}
            {activeTab === 'prescriptions' && (
                <div className="glass-morphism-dark rounded-[4rem] border border-white/5 overflow-hidden animate-fade-in relative">
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px]"></div>
                    <div className="p-12 border-b border-white/5 bg-white/[0.02] flex justify-between items-center relative z-10">
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter italic">Prescription <span className="text-indigo-400">Vault</span></h3>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">{prescriptions.length} Digital Archival Nodes Active</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-4 bg-black/40 px-8 py-4 rounded-2xl border border-white/10 w-80">
                                <SearchIcon className="w-4 h-4 text-slate-600" />
                                <input type="text" placeholder="QUERY VAULT..." className="bg-transparent border-none outline-none text-[9px] font-black uppercase tracking-widest w-full text-white" />
                            </div>
                            <button 
                                onClick={() => setIsAddPrescriptionOpen(true)}
                                className="px-8 py-4 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20"
                            >
                                Register Paper RX
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 p-12 no-scrollbar overflow-y-auto max-h-[65vh]">
                        {prescriptions.map(p => (
                            <div key={p.id} className="p-10 bg-white/[0.02] border border-white/5 rounded-[3.5rem] hover:bg-white/[0.03] transition-all group hover:scale-[1.02] hover:border-indigo-500/30">
                                <div className="flex justify-between items-start mb-10">
                                    <div className="w-16 h-16 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all">
                                        <DocumentTextIcon className="w-8 h-8" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">{new Date(p.createdAt).toLocaleDateString()}</p>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full mt-2 inline-block border ${
                                            p.status === 'dispensed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </div>
                                </div>
                                
                                <h4 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">{patients.find(pat => pat.id === p.patientId)?.fullName || 'Patient Node'}</h4>
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-10 italic underline underline-offset-4 decoration-indigo-500/30">Dr. {p.doctorName}</p>
                                
                                <div className="flex flex-col gap-3 mb-10">
                                    {(p as any).items?.slice(0, 3).map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3 text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest">{item.drugName}</p>
                                        </div>
                                    ))}
                                    {(p as any).items?.length > 3 && <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">+{ (p as any).items?.length - 3} More Components</p>}
                                    {p.clinicalNotes && (
                                        <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1 italic">Clinical Memo Attached</p>
                                            <p className="text-[10px] text-slate-400 italic line-clamp-2">"{p.clinicalNotes}"</p>
                                        </div>
                                    )}
                                    {p.medicationImage && (
                                        <div className="mt-2 flex items-center gap-2 text-emerald-400">
                                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                                            <span className="text-[8px] font-black uppercase tracking-widest">Dispatch Proof Linked</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setSelectedPrescriptionForAudit(p)}
                                        className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                    >
                                        Full Audit
                                    </button>
                                    <button 
                                        onClick={() => setSelectedPrescriptionForDispense(p)}
                                        className="flex-1 py-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-30"
                                        disabled={p.status === 'dispensed'}
                                    >
                                        {p.status === 'dispensed' ? 'Already Commited' : 'Dispense Matrix'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AUTOMATION HUB */}
            {activeTab === 'automation' && (
                <div className="space-y-10 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-10 text-indigo-400">Scheduled <span className="text-white">Adherence Nodes</span></h3>
                            <div className="space-y-6">
                                {alerts.map(a => (
                                    <div key={a.id} className="p-8 bg-black/40 rounded-[2.5rem] border border-white/5 flex justify-between items-center group">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-all">
                                                <BellIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black uppercase italic text-white">{patients.find(p => p.id === a.patientId)?.fullName || 'Patient Node'}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">TIME: {a.reminderTime} • FREQ: {a.frequency}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">{a.status}</span>
                                        </div>
                                    </div>
                                ))}
                                {alerts.length === 0 && (
                                    <div className="p-20 text-center opacity-20 italic font-black uppercase tracking-widest text-[10px]">No active adherence triggers found.</div>
                                )}
                            </div>
                        </div>
                        
                        <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 flex flex-col items-center justify-center text-center space-y-8">
                             <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                 <SparklesIcon className="w-12 h-12" />
                             </div>
                             <div>
                                 <h3 className="text-2xl font-black uppercase tracking-tighter italic">AI Reminder <span className="text-indigo-400">Synthesis</span></h3>
                                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2 max-w-xs mx-auto">Automatically analyze prescriptions and generate SMS medication schedules in real-time.</p>
                             </div>
                         <button onClick={handleSyncReminders} className="px-12 py-5 rounded-[2rem] bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-500/20 hover:scale-105 transition-all">Initialize Auto-Sync</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'reports' && (
                <>
                    <div className="flex bg-white/5 p-2 rounded-[2rem] w-fit mb-12">
                        <button 
                            onClick={() => setReportsSubTab('general')}
                            className={`px-10 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${reportsSubTab === 'general' ? `bg-${theme.bg} text-white shadow-xl shadow-${theme.bg}/20` : 'text-slate-500 hover:text-white'}`}
                        >
                            General Analysis
                        </button>
                        <button 
                            onClick={() => setReportsSubTab('sales')}
                            className={`px-10 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${reportsSubTab === 'sales' ? `bg-${theme.bg} text-white shadow-xl shadow-${theme.bg}/20` : 'text-slate-500 hover:text-white'}`}
                        >
                            Detailed Sales
                        </button>
                    </div>

                    {reportsSubTab === 'general' ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            {/* Clinical Inventory Valuation */}
                            <div className={`glass-morphism-dark p-12 rounded-[4rem] border border-white/5 group hover:${theme.border} transition-all text-center space-y-8`}>
                                 <div className={`w-24 h-24 rounded-[2.5rem] bg-${theme.bg}/10 flex items-center justify-center text-${theme.accent} mx-auto`}>
                                     <ArchiveBoxIcon className="w-12 h-12" />
                                 </div>
                                 <div>
                                     <h3 className="text-2xl font-black uppercase tracking-tighter italic">Clinical <span className="text-indigo-400">Valuation</span></h3>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Generate PDF of total stock assets</p>
                                 </div>
                                 <button 
                                    onClick={handleGenerateInventoryReport}
                                    className={`w-full py-5 rounded-[2rem] bg-${theme.bg} text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:scale-105 transition-all`}
                                 >
                                    Generate Preview
                                 </button>
                            </div>

                            {/* Expiry Risk Audit */}
                            <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 group hover:border-rose-500/30 transition-all text-center space-y-8">
                                 <div className="w-24 h-24 rounded-[2.5rem] bg-rose-500/10 flex items-center justify-center text-rose-400 mx-auto">
                                     <ExclamationTriangleIcon className="w-12 h-12" />
                                 </div>
                                 <div>
                                     <h3 className="text-2xl font-black uppercase tracking-tighter italic">Expiry <span className="text-rose-400">Audit</span></h3>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Identify and list high-risk batches</p>
                                 </div>
                                 <button 
                                    onClick={handleGenerateExpiryReport}
                                    className="w-full py-5 rounded-[2rem] bg-rose-500 text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:scale-105 transition-all"
                                 >
                                    Start Audit PDF
                                 </button>
                            </div>

                            {/* Sales Logic Analysis */}
                            <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 group hover:border-indigo-500/30 transition-all text-center space-y-8">
                                 <div className="w-24 h-24 rounded-[2.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto">
                                     <BanknotesIcon className="w-12 h-12" />
                                 </div>
                                 <div>
                                     <h3 className="text-2xl font-black uppercase tracking-tighter italic">Sales <span className="text-emerald-400">Analysis</span></h3>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Revenue trends & top medications breakdown</p>
                                 </div>
                                 <button 
                                    onClick={handleGenerateSalesReport}
                                    disabled={isGeneratingReport}
                                    className="w-full py-5 rounded-[2rem] bg-gradient-to-r from-indigo-500 to-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                                 >
                                    {isGeneratingReport ? 'Processing...' : 'Generate Analysis'}
                                 </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            <div className="glass-morphism-dark p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                                <div className="flex items-center gap-4 bg-black/40 p-2 rounded-[1.5rem] border border-white/5">
                                    {(['day', 'week', 'month', 'period'] as const).map(f => (
                                        <button 
                                            key={f}
                                            onClick={() => {
                                                setSalesFilter(f);
                                                const now = new Date();
                                                const start = new Date();
                                                if (f === 'day') start.setHours(0,0,0,0);
                                                if (f === 'week') start.setDate(now.getDate() - 7);
                                                if (f === 'month') start.setMonth(now.getMonth() - 1);
                                                
                                                if (f !== 'period') {
                                                    setSalesStartDate(start.toISOString().split('T')[0]);
                                                    setSalesEndDate(now.toISOString().split('T')[0]);
                                                }
                                            }}
                                            className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${salesFilter === f ? `bg-${theme.bg} text-white shadow-lg` : 'text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>

                                {salesFilter === 'period' && (
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="date" 
                                            value={salesStartDate}
                                            onChange={e => setSalesStartDate(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                                        />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">To</span>
                                        <input 
                                            type="date" 
                                            value={salesEndDate}
                                            onChange={e => setSalesEndDate(e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                )}

                                <button 
                                    onClick={handleGenerateDetailedSalesReport}
                                    disabled={isGeneratingReport}
                                    className={`flex items-center gap-3 px-10 py-4 rounded-[1.5rem] bg-${theme.bg} text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-${theme.bg}/20 hover:scale-105 transition-all disabled:opacity-50`}
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                    {isGeneratingReport ? 'Processing...' : 'Export Sales PDF'}
                                </button>
                            </div>

                            <div className="glass-morphism-dark rounded-[3.5rem] border border-white/5 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/5">
                                            <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Item Code</th>
                                            <th className="px-6 py-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Medication Name</th>
                                            <th className="px-6 py-8 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Qty Sold</th>
                                            <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Total Revenue (KES)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(() => {
                                            const filteredSales = sales.filter(s => {
                                                const d = new Date(s.createdAt);
                                                const start = new Date(salesStartDate);
                                                const end = new Date(salesEndDate);
                                                end.setHours(23, 59, 59, 999);
                                                return d >= start && d <= end;
                                            });
                                            
                                            const filteredSaleItems = saleItems.filter(si => 
                                                filteredSales.some(fs => fs.id === si.saleId)
                                            );

                                            const aggregated = new Map<string, { sku: string, name: string, qty: number, total: number }>();
                                            filteredSaleItems.forEach(item => {
                                                const inv = inventory.find(i => i.id === item.medicationId);
                                                const key = item.medicationId;
                                                const existing = aggregated.get(key) || { sku: inv?.sku || 'N/A', name: inv?.name || 'Unknown', qty: 0, total: 0 };
                                                existing.qty += Number(item.quantity);
                                                existing.total += Number(item.totalPrice);
                                                aggregated.set(key, existing);
                                            });

                                            return Array.from(aggregated.values())
                                                .sort((a, b) => b.total - a.total)
                                                .map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                        <td className="px-10 py-6 text-[10px] font-black text-slate-500">{item.sku}</td>
                                                        <td className="px-6 py-6 font-black text-white uppercase text-[11px] tracking-tight">{item.name}</td>
                                                        <td className="px-6 py-6 text-center">
                                                            <span className="px-4 py-1.5 rounded-full bg-white/5 text-[10px] font-black text-white">{item.qty} Units</span>
                                                        </td>
                                                        <td className={`px-10 py-6 text-right font-black italic text-base text-${theme.accent}`}>
                                                            {item.total.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* PDF Preview Frame */}
                    {selectedReportUrl && (
                        <div className="w-full h-[800px] rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl animate-fade-in relative">
                            <button 
                                onClick={() => setSelectedReportUrl(null)}
                                className="absolute top-6 right-6 p-4 rounded-full bg-rose-500/80 text-white backdrop-blur-xl hover:bg-rose-500 transition-all z-10"
                            >
                                <TrashIcon className="w-6 h-6" />
                            </button>
                            <iframe 
                                src={selectedReportUrl} 
                                className="w-full h-full"
                                title="Pharmacy Report Preview"
                            />
                        </div>
                    )}
                </>
            )}

            {/* SALES ANALYTICS VIEW */}
            {activeTab === 'sales' && (
                <div className="space-y-12 animate-fade-in">
                    <div className="glass-morphism-dark p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-[1.5rem] border border-white/5 overflow-x-auto custom-scrollbar-horizontal pb-2">
                            {(['day', 'week', 'month', 'period'] as const).map(f => (
                                <button 
                                    key={f}
                                    onClick={() => {
                                        setSalesFilter(f);
                                        const now = new Date();
                                        const start = new Date();
                                        if (f === 'day') start.setHours(0,0,0,0);
                                        if (f === 'week') start.setDate(now.getDate() - 7);
                                        if (f === 'month') start.setMonth(now.getMonth() - 1);
                                        
                                        if (f !== 'period') {
                                            setSalesStartDate(start.toISOString().split('T')[0]);
                                            setSalesEndDate(now.toISOString().split('T')[0]);
                                        }
                                    }}
                                    className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${salesFilter === f ? `bg-${theme.bg} text-white shadow-lg` : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        {salesFilter === 'period' && (
                            <div className="flex items-center gap-4">
                                <input 
                                    type="date" 
                                    value={salesStartDate}
                                    onChange={e => setSalesStartDate(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                                />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">To</span>
                                <input 
                                    type="date" 
                                    value={salesEndDate}
                                    onChange={e => setSalesEndDate(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-white outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                        )}

                        <button 
                            onClick={handleGenerateDetailedSalesReport}
                            disabled={isGeneratingReport}
                            className={`flex items-center gap-3 px-10 py-4 rounded-[1.5rem] bg-${theme.bg} text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-${theme.bg}/20 hover:scale-105 transition-all disabled:opacity-50`}
                        >
                            <PrinterIcon className="w-4 h-4" />
                            {isGeneratingReport ? 'Processing...' : 'Export Sales PDF'}
                        </button>
                    </div>

                    <div className="glass-morphism-dark rounded-[3.5rem] border border-white/5 overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar-horizontal">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-white/5">
                                        <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Item Code</th>
                                        <th className="px-6 py-8 text-[10px] font-black uppercase tracking-widest text-slate-500">Medication Name</th>
                                        <th className="px-6 py-8 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Qty Sold</th>
                                        <th className="px-10 py-8 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Total Revenue (KES)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {(() => {
                                        const filteredSales = sales.filter(s => {
                                            const d = new Date(s.createdAt);
                                            const start = new Date(salesStartDate);
                                            const end = new Date(salesEndDate);
                                            end.setHours(23, 59, 59, 999);
                                            return d >= start && d <= end;
                                        });
                                        
                                        const filteredSaleItems = saleItems.filter(si => 
                                            filteredSales.some(fs => fs.id === si.saleId)
                                        );

                                        const aggregated = new Map<string, { sku: string, name: string, qty: number, total: number }>();
                                        filteredSaleItems.forEach(item => {
                                            const inv = inventory.find(i => i.id === item.medicationId);
                                            const key = item.medicationId;
                                            const existing = aggregated.get(key) || { sku: inv?.sku || 'N/A', name: inv?.name || 'Unknown', qty: 0, total: 0 };
                                            existing.qty += Number(item.quantity);
                                            existing.total += Number(item.totalPrice);
                                            aggregated.set(key, existing);
                                        });

                                        return Array.from(aggregated.values())
                                            .sort((a, b) => b.total - a.total)
                                            .map((item, idx) => (
                                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-10 py-6 text-[10px] font-black text-slate-500">{item.sku}</td>
                                                    <td className="px-6 py-6 font-black text-white uppercase text-[11px] tracking-tight">{item.name}</td>
                                                    <td className="px-6 py-6 text-center">
                                                        <span className="px-4 py-1.5 rounded-full bg-white/5 text-[10px] font-black text-white">{item.qty} Units</span>
                                                    </td>
                                                    <td className={`px-10 py-6 text-right font-black italic text-base text-${theme.accent}`}>
                                                        {item.total.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* PDF Preview Frame */}
                    {selectedReportUrl && (
                        <div className="w-full h-[800px] rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl animate-fade-in relative">
                            <button 
                                onClick={() => setSelectedReportUrl(null)}
                                className="absolute top-6 right-6 p-4 rounded-full bg-rose-500/80 text-white backdrop-blur-xl hover:bg-rose-500 transition-all z-10"
                            >
                                <TrashIcon className="w-6 h-6" />
                            </button>
                            <iframe 
                                src={selectedReportUrl} 
                                className="w-full h-full"
                                title="Pharmacy Sales Report Preview"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* CONFIGURATION CENTER */}
            {activeTab === 'config' && settings && (
                <div className="p-12 animate-fade-in space-y-12 no-scrollbar overflow-y-auto max-h-[75vh]">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-12">
                            <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-10 text-indigo-400">Branding <span className="text-white">& Identity Vault</span></h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-4">Dispensing Point Name</label>
                                        <input 
                                            type="text" 
                                            value={settings.pharmacyName} 
                                            onChange={e => setSettings({...settings, pharmacyName: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-3xl p-4 text-white text-sm outline-none focus:border-indigo-500/50 transition-all font-black uppercase tracking-widest italic" 
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-4">Nexus Logo URL</label>
                                        <input 
                                            type="text" 
                                            value={settings.pharmacyLogo || ''} 
                                            onChange={e => setSettings({...settings, pharmacyLogo: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-3xl p-4 text-white text-sm outline-none focus:border-indigo-500/50 transition-all font-mono" 
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-4">License / PPB ID</label>
                                        <input 
                                            type="text" 
                                            value={settings.pharmacyLicense || ''} 
                                            onChange={e => setSettings({...settings, pharmacyLicense: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-3xl p-4 text-white text-sm outline-none focus:border-indigo-500/50 transition-all uppercase font-bold" 
                                        />
                                    </div>
                                    <div className="space-y-4 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-4">Receipt Header Text</label>
                                        <textarea 
                                            value={settings.receiptHeader || ''} 
                                            onChange={e => setSettings({...settings, receiptHeader: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-white text-xs outline-none focus:border-indigo-500/50 transition-all h-20" 
                                            placeholder="Molecular Nexus Hospital/Clinic | P.O. BOX 123..."
                                        ></textarea>
                                    </div>
                                    <div className="space-y-4 md:col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-4">Receipt Nexus Footer</label>
                                        <textarea 
                                            value={settings.receiptFooter || ''} 
                                            onChange={e => setSettings({...settings, receiptFooter: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-[2rem] p-6 text-white text-xs outline-none focus:border-indigo-500/50 transition-all h-20" 
                                            placeholder="Thank you for trusting our Molecular Nexus..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5">
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-10 text-emerald-400">Connectivity <span className="text-white">& Outreach</span></h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-4 flex items-center gap-2"><EnvelopeIcon className="w-3 h-3 text-emerald-500" /> Dispatch Email</label>
                                        <input 
                                            type="email" 
                                            value={settings.pharmacyEmail || ''} 
                                            onChange={e => setSettings({...settings, pharmacyEmail: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-3xl p-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-4 flex items-center gap-2"><PhoneIcon className="w-3 h-3 text-emerald-500" /> Hot Matrix Phone</label>
                                        <input 
                                            type="text" 
                                            value={settings.pharmacyPhone || ''} 
                                            onChange={e => setSettings({...settings, pharmacyPhone: e.target.value})}
                                            className="w-full bg-black/40 border border-white/5 rounded-3xl p-4 text-white text-sm outline-none focus:border-emerald-500/50 transition-all" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 bg-gradient-to-b from-indigo-500/5 to-transparent">
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-10 text-indigo-400">Theme <span className="text-white">Experience</span></h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                                    {(['indigo', 'emerald', 'rose', 'amber', 'cyan', 'violet', 'fuchsia', 'sky', 'lime'] as const).map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => setSettings(prev => prev ? {...prev, theme: t} : null)}
                                            className={`group relative h-24 rounded-[2rem] border-2 transition-all duration-500 flex flex-col items-center justify-center gap-3 ${settings.theme === t ? `border-${t === 'indigo' ? 'indigo-500' : t === 'emerald' ? 'emerald-500' : t === 'rose' ? 'rose-500' : t === 'amber' ? 'amber-500' : t === 'cyan' ? 'cyan-500' : t === 'violet' ? 'violet-500' : t === 'fuchsia' ? 'fuchsia-500' : t === 'sky' ? 'sky-500' : 'lime-500'} bg-white/5 shadow-2xl scale-105` : 'border-white/5 opacity-40 hover:opacity-100 hover:bg-white/5'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full bg-${t === 'indigo' ? 'indigo-500' : t === 'emerald' ? 'emerald-500' : t === 'rose' ? 'rose-500' : t === 'amber' ? 'amber-500' : t === 'cyan' ? 'cyan-500' : t === 'violet' ? 'violet-500' : t === 'fuchsia' ? 'fuchsia-500' : t === 'sky' ? 'sky-500' : 'lime-500'} shadow-lg group-hover:scale-125 transition-transform duration-500`}></div>
                                            <span className="text-[8px] font-black uppercase tracking-widest">{t}</span>
                                            {settings.theme === t && (
                                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0f]">
                                                    <CheckCircleIcon className="w-3 h-3 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                             <div className="mt-10 p-6 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-4">
                                    <SparklesIcon className="w-6 h-6 text-indigo-400" />
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Adaptive Bio-Interface: The selected theme will propagate across all visual nodes and PDF artifacts.</p>
                                </div>
                            </div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-6 text-center italic">Global accent nodes will be recalibrated upon selection.</p>
                        </div>

                        <div className="space-y-12">
                            <div className="glass-morphism-dark p-12 rounded-[4rem] border border-white/5 bg-gradient-to-b from-amber-500/5 to-transparent">
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-10 text-amber-500">Operation <span className="text-white">Logic</span></h3>
                                <div className="space-y-10">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-4">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Low Stock Alert Level</label>
                                            <span className="text-xl font-black italic text-amber-400">{settings.lowStockThreshold} Units</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="100" 
                                            value={settings.lowStockThreshold} 
                                            onChange={e => setSettings({...settings, lowStockThreshold: parseInt(e.target.value)})}
                                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer range-indigo" 
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5 group hover:border-indigo-500/30 transition-all">
                                        <div>
                                            <p className="text-xs font-black uppercase italic text-white text-left">Medication Alert Nodes</p>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 text-left">GSM Triggers for dosages</p>
                                        </div>
                                        <button 
                                            onClick={() => setSettings({...settings, medicationRemindersEnabled: !settings.medicationRemindersEnabled})}
                                            className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.medicationRemindersEnabled ? 'bg-indigo-500 justify-end' : 'bg-slate-800 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-white shadow-lg"></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5 group hover:border-rose-500/30 transition-all">
                                        <div>
                                            <p className="text-xs font-black uppercase italic text-white text-left">Course Completion Signals</p>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 text-left">Alert patient to STOP medication</p>
                                        </div>
                                        <button 
                                            onClick={() => setSettings({...settings, stopRemindersEnabled: !settings.stopRemindersEnabled})}
                                            className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.stopRemindersEnabled ? 'bg-rose-500 justify-end' : 'bg-slate-800 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-white shadow-lg"></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5 group hover:border-teal-500/30 transition-all">
                                        <div>
                                            <p className="text-xs font-black uppercase italic text-white text-left">Post-Clinical Checkup Prompts</p>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 text-left">Automated return appointment triggers</p>
                                        </div>
                                        <button 
                                            onClick={() => setSettings({...settings, checkupRemindersEnabled: !settings.checkupRemindersEnabled})}
                                            className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.checkupRemindersEnabled ? 'bg-teal-500 justify-end' : 'bg-slate-800 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-white shadow-lg"></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5 group hover:border-emerald-500/30 transition-all">
                                        <div>
                                            <p className="text-xs font-black uppercase italic text-white text-left">Global GSM Outreach</p>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 text-left">Master switch for all SMS broadcasts</p>
                                        </div>
                                        <button 
                                            onClick={() => setSettings({...settings, enableSmsReminders: !settings.enableSmsReminders})}
                                            className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.enableSmsReminders ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-white shadow-lg"></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-8 bg-black/40 rounded-[2.5rem] border border-white/5 group hover:border-emerald-500/30 transition-all">
                                        <div>
                                            <p className="text-xs font-black uppercase italic text-white">EPOS Auto-Print</p>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">Generate receipt after sale</p>
                                        </div>
                                        <button 
                                            onClick={() => setSettings({...settings, autoPrintReceipt: !settings.autoPrintReceipt})}
                                            className={`w-12 h-6 rounded-full p-1 transition-all flex items-center ${settings.autoPrintReceipt ? 'bg-emerald-500 justify-end' : 'bg-slate-800 justify-start'}`}
                                        >
                                            <div className="w-4 h-4 rounded-full bg-white shadow-lg"></div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSaveSettings}
                                className={`w-full py-8 rounded-[2rem] bg-${theme.bg} text-white font-black uppercase tracking-[0.5em] italic shadow-2xl ${theme.shadow} hover:scale-[1.02] active:scale-95 transition-all text-xs`}
                            >
                                Commit Nexus Config
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modals for HR & Accounting */}
            {isAddStaffOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl animate-fade-in">
                    <div className="bg-[#101016] border border-white/10 rounded-[3rem] p-12 max-w-xl w-full space-y-8 shadow-2xl">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">{editingStaff ? 'Update Operator' : 'Operator Recruitment'} <span className="text-indigo-400">Hub</span></h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Full Identity Name</label>
                                <input 
                                    id="staff_name" 
                                    defaultValue={editingStaff?.fullName || ''}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" 
                                    placeholder="NAME CODE" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Operational Role</label>
                                <select 
                                    id="staff_role" 
                                    defaultValue={editingStaff?.role || 'Pharmacist'}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50"
                                >
                                    <option value="Pharmacist">Pharmacist</option>
                                    <option value="Technician">Technician</option>
                                    <option value="Cashier">Cashier</option>
                                    <option value="Store Manager">Store Manager</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Monthly Yield (KES)</label>
                                <input 
                                    id="staff_salary" 
                                    type="number" 
                                    defaultValue={editingStaff?.salary || 0}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" 
                                    placeholder="SALARY" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Shift Matrix</label>
                                <select 
                                    id="staff_shift" 
                                    defaultValue={editingStaff?.shiftPreference || 'Day Shift'}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50"
                                >
                                    <option value="Day Shift">Day Shift</option>
                                    <option value="Night Shift">Night Shift</option>
                                    <option value="Hybrid">Hybrid</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Specialization</label>
                                <input 
                                    id="staff_specialization" 
                                    defaultValue={editingStaff?.specialization || ''}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" 
                                    placeholder="e.g. Oncology" 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">License # / Registration</label>
                                <input 
                                    id="staff_license" 
                                    defaultValue={editingStaff?.licenseNumber || ''}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" 
                                    placeholder="PSB-XXXXX" 
                                />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setIsAddStaffOpen(false); setEditingStaff(null); }} className="flex-1 py-5 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">Abort</button>
                            <button onClick={() => {
                                const name = (document.getElementById('staff_name') as HTMLInputElement).value;
                                const role = (document.getElementById('staff_role') as HTMLSelectElement).value;
                                const salary = Number((document.getElementById('staff_salary') as HTMLInputElement).value);
                                const shift = (document.getElementById('staff_shift') as HTMLSelectElement).value;
                                const spec = (document.getElementById('staff_specialization') as HTMLInputElement).value;
                                const license = (document.getElementById('staff_license') as HTMLInputElement).value;
                                handleAddStaff({ fullName: name, role, salary, shiftPreference: shift, specialization: spec, licenseNumber: license });
                            }} className="flex-1 py-5 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest">{editingStaff ? 'Update Deployment' : 'Commit Deployment'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isAddLedgerOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl animate-fade-in">
                    <div className="bg-[#101016] border border-white/10 rounded-[3rem] p-12 max-w-xl w-full space-y-8 shadow-2xl">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">{editingLedger ? 'Update Ledger' : 'Record Ledger'} <span className="text-emerald-400">Node</span></h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Transaction Flow</label>
                                <select id="ldg_type" defaultValue={editingLedger?.type || 'Income'} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50">
                                    <option value="Income">Income Flow</option>
                                    <option value="Expense">Expense Flow</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Operational Category</label>
                                <input id="ldg_cat" defaultValue={editingLedger?.category || ''} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" placeholder="SALARY, UTILITIES, DRUG PURCHASE" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Monetary Impact (KES)</label>
                                <input id="ldg_amount" type="number" defaultValue={editingLedger?.amount || 0} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" placeholder="AMOUNT" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Memo / Description</label>
                                <textarea id="ldg_desc" defaultValue={editingLedger?.description || ''} className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50 h-24" placeholder="TRANSACTION MEMO"></textarea>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => { setIsAddLedgerOpen(false); setEditingLedger(null); }} className="flex-1 py-5 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">Abort</button>
                            <button onClick={() => {
                                const type = (document.getElementById('ldg_type') as HTMLSelectElement).value;
                                const category = (document.getElementById('ldg_cat') as HTMLInputElement).value;
                                const amount = Number((document.getElementById('ldg_amount') as HTMLInputElement).value);
                                const description = (document.getElementById('ldg_desc') as HTMLTextAreaElement).value;
                                handleAddLedger({ type, category, amount, description });
                            }} className="flex-1 py-5 rounded-2xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest">{editingLedger ? 'Update Record' : 'Finalize Record'}</button>
                        </div>
                    </div>
                </div>
            )}

            {isAddInventoryOpen && (
                <AddPharmacyInventoryModal 
                    institutionId={institutionId}
                    item={editingInventory || undefined}
                    onClose={() => { setIsAddInventoryOpen(false); setEditingInventory(null); }}
                    onAdd={handleAddInventory}
                />
            )}

            {isRegisterPatientOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-fade-in">
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-[4rem] p-16 max-w-2xl w-full space-y-10 shadow-2xl relative">
                        <button onClick={() => setIsRegisterPatientOpen(false)} className="absolute top-10 right-10 p-3 rounded-full bg-white/5 text-slate-500 hover:text-white"><TrashIcon className="w-6 h-6" /></button>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Register <span className="text-emerald-400">Patient Node</span></h3>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-3 col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Full Legal Identity</label>
                                <input id="reg_name" className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-white text-sm outline-none focus:border-emerald-500/50" placeholder="IDENTITY NAME" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Contact Link</label>
                                <input id="reg_phone" className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-white text-sm outline-none focus:border-emerald-500/50" placeholder="+254..." />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Biological Age</label>
                                <input id="reg_age" type="number" className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-white text-sm outline-none focus:border-emerald-500/50" placeholder="YEARS" />
                            </div>
                        </div>
                        <button onClick={async () => {
                            const name = (document.getElementById('reg_name') as HTMLInputElement).value;
                            const phone = (document.getElementById('reg_phone') as HTMLInputElement).value;
                            const age = (document.getElementById('reg_age') as HTMLInputElement).value;
                            try {
                                await apiService.saveModuleRecord('his_patients', {
                                    id: `pat_${Date.now()}`,
                                    institutionId,
                                    fullName: name,
                                    contact: phone,
                                    age: Number(age) || 0,
                                    status: 'active',
                                    recordedBy: currentUser.id
                                });
                                alert("Patient registered in molecular hub!");
                                setIsRegisterPatientOpen(false);
                                loadData();
                            } catch (e) { alert("Registration failed."); }
                        }} className="w-full py-8 rounded-[2.5rem] bg-emerald-500 text-slate-950 font-black uppercase tracking-[0.5em] shadow-2xl shadow-emerald-500/20">Commit Entry</button>
                    </div>
                </div>
            )}

            {isAddPrescriptionOpen && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-fade-in">
                    <div className="bg-[#0a0a0f] border border-white/10 rounded-[4rem] p-16 max-w-3xl w-full space-y-10 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setIsAddPrescriptionOpen(false)} className="absolute top-10 right-10 p-3 rounded-full bg-white/5 text-slate-500 hover:text-white"><TrashIcon className="w-6 h-6" /></button>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Manual <span className="text-indigo-400">RX Archival</span></h3>
                        <div className="space-y-8">
                             <div className="grid grid-cols-2 gap-8">
                                 <div className="space-y-3">
                                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Target Patient</label>
                                     <select id="rx_patient" className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-white text-sm outline-none focus:border-indigo-500/50">
                                         {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                                     </select>
                                 </div>
                                 <div className="space-y-3">
                                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Authorized Doctor</label>
                                     <input id="rx_doctor" className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-white text-sm outline-none focus:border-indigo-500/50" placeholder="DR. NAME" />
                                 </div>
                             </div>
                             <div className="space-y-3">
                                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Molecular Components (Items)</label>
                                 <div className="p-8 bg-black border border-white/5 rounded-[2.5rem] space-y-6">
                                     <div className="grid grid-cols-2 gap-4">
                                         <select id="rx_drug" className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-xs">
                                             {inventory.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                                         </select>
                                         <input id="rx_qty" type="number" placeholder="QTY" className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-xs" />
                                     </div>
                                 </div>
                             </div>
                             <div className="space-y-3">
                                 <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">Clinical Memo</label>
                                 <textarea id="rx_notes" className="w-full bg-black/60 border border-white/5 rounded-3xl p-6 text-white text-xs outline-none focus:border-indigo-500/50 h-24" placeholder="DOSAGE, FREQUENCY, DURATION..."></textarea>
                             </div>
                        </div>
                        <button onClick={async () => {
                            const patId = (document.getElementById('rx_patient') as HTMLSelectElement).value;
                            const doctor = (document.getElementById('rx_doctor') as HTMLInputElement).value;
                            const drug = (document.getElementById('rx_drug') as HTMLSelectElement).value;
                            const qty = (document.getElementById('rx_qty') as HTMLInputElement).value;
                            const notes = (document.getElementById('rx_notes') as HTMLTextAreaElement).value;
                            try {
                                await apiService.saveModuleRecord('his_prescriptions', {
                                    id: `rx_${Date.now()}`,
                                    institutionId,
                                    patientId: patId,
                                    doctorName: doctor,
                                    items: [{ drugName: drug, quantity: Number(qty) || 1, frequency: 'Once Daily' }],
                                    clinicalNotes: notes,
                                    status: 'pending',
                                    recordedBy: currentUser.id
                                });
                                alert("Prescription archived and active!");
                                setIsAddPrescriptionOpen(false);
                                loadData();
                            } catch (e) { alert("RX Archival failed."); }
                        }} className="w-full py-8 rounded-[2.5rem] bg-indigo-500 text-white font-black uppercase tracking-[0.5em] shadow-2xl shadow-indigo-500/20">Archive Prescription</button>
                    </div>
                </div>
            )}

            {selectedInventoryForBatch && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl animate-fade-in">
                    <div className="bg-[#101016] border border-white/10 rounded-[3rem] p-12 max-w-xl w-full space-y-8 shadow-2xl">
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Add Batch: <span className="text-emerald-400">{selectedInventoryForBatch.name}</span></h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Batch Number</label>
                                <input id="batch_no" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" placeholder="BTH-001" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Expiry Date</label>
                                <input id="batch_expiry" type="date" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Quantity Recv</label>
                                <input id="batch_qty" type="number" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" placeholder="100" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cost Price</label>
                                <input id="batch_cost" type="number" className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50" placeholder="KES" />
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setSelectedInventoryForBatch(null)} className="flex-1 py-5 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">Abort</button>
                            <button onClick={() => {
                                const bNo = (document.getElementById('batch_no') as HTMLInputElement).value;
                                const expiry = (document.getElementById('batch_expiry') as HTMLInputElement).value;
                                const qty = Number((document.getElementById('batch_qty') as HTMLInputElement).value);
                                const cost = Number((document.getElementById('batch_cost') as HTMLInputElement).value);
                                handleAddBatch({ 
                                    medicationId: selectedInventoryForBatch.id, 
                                    batchNumber: bNo, 
                                    expiryDate: expiry, 
                                    quantity: qty, 
                                    costPrice: cost 
                                });
                            }} className="flex-1 py-5 rounded-2xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest">Commence Stocking</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedPrescriptionForAudit && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-3xl animate-fade-in">
                    <div className="bg-[#101016] border border-white/10 rounded-[3rem] p-12 max-w-4xl w-full space-y-8 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar">
                         <div className="flex justify-between items-start">
                             <div>
                                 <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Full Dispensing <span className="text-indigo-400">Audit</span></h3>
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 px-1">Prescription Node: #{selectedPrescriptionForAudit.id.slice(0, 12)}</p>
                             </div>
                             <button onClick={() => setSelectedPrescriptionForAudit(null)} className="p-4 rounded-full bg-white/5 text-slate-500 hover:text-white transition-all">
                                 <TrashIcon className="w-6 h-6" />
                             </button>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                             <div className="space-y-8">
                                 <div className="glass-morphism-dark p-8 rounded-[2rem] border border-white/5">
                                     <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4 block">Patient Information</label>
                                     <p className="text-xl font-black uppercase italic text-white">{patients.find(p => p.id === selectedPrescriptionForAudit.patientId)?.fullName || 'N/A'}</p>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Medical Record Linked</p>
                                 </div>
                                 <div className="glass-morphism-dark p-8 rounded-[2rem] border border-white/5">
                                     <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4 block">Prescribing Authority</label>
                                     <p className="text-xl font-black uppercase italic text-white">Dr. {selectedPrescriptionForAudit.doctorName || 'Unknown Entity'}</p>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Digital Signature Verified</p>
                                 </div>
                             </div>

                             <div className="glass-morphism-dark p-8 rounded-[2rem] border border-white/10 space-y-6">
                                 <label className="text-[10px] font-black uppercase text-emerald-400 tracking-widest block">Medication Components</label>
                                 {(selectedPrescriptionForAudit as any).items?.map((item: any, idx: number) => (
                                     <div key={idx} className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5">
                                         <div>
                                             <p className="text-xs font-black uppercase italic text-white">{item.drugName}</p>
                                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.frequency || 'N/A'} Node</p>
                                         </div>
                                         <p className="text-sm font-black italic text-indigo-400">×{item.quantity}</p>
                                     </div>
                                 ))}
                             </div>
                         </div>

                         {selectedPrescriptionForAudit.clinicalNotes && (
                             <div className="glass-morphism-dark p-8 rounded-[2rem] border border-white/5 bg-indigo-500/5">
                                 <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4 block italic underline decoration-indigo-500/30 underline-offset-8">Pharmacist Clinical Memo</label>
                                 <p className="text-xs text-slate-400 italic leading-relaxed">"{selectedPrescriptionForAudit.clinicalNotes}"</p>
                             </div>
                         )}

                         {selectedPrescriptionForAudit.medicationImage && (
                             <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-black/60 aspect-video relative group">
                                 <img loading="lazy" src={selectedPrescriptionForAudit.medicationImage} alt="Dispensing Proof" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
                                 <div className="absolute inset-0 flex items-center justify-center">
                                     <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white opacity-40 group-hover:opacity-0 transition-all">Visual Proof Node</p>
                                 </div>
                             </div>
                         )}

                         <button onClick={() => setSelectedPrescriptionForAudit(null)} className="w-full py-6 rounded-3xl bg-indigo-500 text-white font-black uppercase tracking-widest shadow-2xl shadow-indigo-500/20">Close Audit Stream</button>
                    </div>
                </div>
            )}

            {isImportInventoryOpen && (
                <SmartPharmacyInventoryImporterModal 
                    institutionId={institutionId}
                    onClose={() => setIsImportInventoryOpen(false)}
                    onImport={handleImportInventory}
                />
            )}

            {selectedPrescriptionForDispense && (
                <DispenseMedicationModal 
                    prescription={selectedPrescriptionForDispense}
                    inventory={inventory}
                    batches={batches}
                    onClose={() => setSelectedPrescriptionForDispense(null)}
                    onDispense={handleDispenseMedication}
                />
            )}
        </div>
    );
};

