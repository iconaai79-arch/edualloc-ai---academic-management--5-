import React, { useState, useMemo } from 'react';
import type { User, PayrollRecord, Institution } from '../../types';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { CalculatorIcon } from '../icons/CalculatorIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { FingerPrintIcon } from '../icons/FingerPrintIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { XIcon } from '../icons/XIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { Cog8ToothIcon } from '../icons/Cog8ToothIcon';
import { 
    StatutoryTaxSettingsModal, 
    DEFAULT_STATUTORY_SETTINGS, 
    type StatutoryPayrollSettings 
} from './StatutoryTaxSettingsModal';
import { apiService } from '../../services/apiService';
import { 
    generateBulkStaffPayslipsPdf, 
    generateStaffPayslipPdf,
    generateBulkStaffP9Pdf,
    generateStaffP9Pdf,
    generateBulkStatutoryReportPdf,
    downloadStatutoryCsv,
    type StatutoryReportType
} from '../../services/pdfService';

interface PayrollEngineProps {
    staff: User[];
    payrollRecords: PayrollRecord[];
    institution: Institution;
    onProcessPayroll: (records: PayrollRecord[]) => Promise<void>;
    onOpenExcelImport?: () => void;
}

export interface KenyanPayrollBreakdown {
    grossSalary: number;
    baseGross: number;
    nssf: number;
    shif: number;
    housingLevy: number;
    taxableIncome: number;
    grossPaye: number;
    personalRelief: number;
    netPaye: number;
    biometricDeduction: number;
    netSalary: number;
}

// Generate rolling 24-month list ending at current month
const generateMonthOptions = (): string[] => {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const now = new Date();
    const result: string[] = [];
    for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        result.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
    }
    return result;
};

const MONTH_OPTIONS = generateMonthOptions();

// Deterministic helper to get mock biometric check-in data for staff
export const getStaffAttendance = (staffId: string) => {
    const expectedCheckIns = 40;
    const charSum = staffId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const missed = charSum % 6;
    const actualCheckIns = expectedCheckIns - missed;
    const attendanceRate = actualCheckIns / expectedCheckIns;
    return { expectedCheckIns, actualCheckIns, attendanceRate };
};

// Kenyan statutory tax calculation compliant with percentage vs fixed figures settings
export const calculateKenyanPayroll = (
    basicSalary: number,
    allowancesSum: number,
    attendanceRate: number,
    useBiometric: boolean,
    settings?: StatutoryPayrollSettings,
    staffMeta?: any
): KenyanPayrollBreakdown => {
    const baseGross = basicSalary + allowancesSum;
    let biometricDeduction = 0;
    if (useBiometric) biometricDeduction = baseGross * (1 - attendanceRate);
    const grossSalary = Math.max(0, baseGross - biometricDeduction);

    const cfg = settings || DEFAULT_STATUTORY_SETTINGS;

    // 1. Calculate NSSF (Pension)
    let nssf = 0;
    if (grossSalary > 0) {
        if (staffMeta?.nssfMode === 'fixed' && typeof staffMeta?.nssfAmount === 'number') {
            nssf = staffMeta.nssfAmount;
        } else if (cfg.nssf.mode === 'fixed') {
            nssf = cfg.nssf.fixedAmount || 0;
        } else if (cfg.nssf.mode === 'percentage') {
            nssf = grossSalary * ((cfg.nssf.percentageRate ?? 6.0) / 100);
        } else {
            // Standard Tier I & Tier II formula
            const tier1Base = Math.min(grossSalary, 9000);
            const tier2Base = Math.max(0, Math.min(grossSalary, 108000) - 9000);
            nssf = (tier1Base * 0.06) + (tier2Base * 0.06);
        }
    }

    // 2. Calculate SHIF (Social Health Insurance Fund)
    let shif = 0;
    if (grossSalary > 0) {
        if (staffMeta?.shifMode === 'fixed' && typeof staffMeta?.shifAmount === 'number') {
            shif = staffMeta.shifAmount;
        } else if (cfg.shif.mode === 'fixed') {
            shif = cfg.shif.fixedAmount || 0;
        } else {
            const rate = (cfg.shif.percentageRate ?? 2.75) / 100;
            const minFloor = cfg.shif.minimumAmount ?? 300;
            shif = Math.max(minFloor, grossSalary * rate);
        }
    }

    // 3. Calculate Affordable Housing Levy (AHL)
    let housingLevy = 0;
    if (grossSalary > 0) {
        if (staffMeta?.housingLevyMode === 'fixed' && typeof staffMeta?.housingLevyAmount === 'number') {
            housingLevy = staffMeta.housingLevyAmount;
        } else if (cfg.housingLevy.mode === 'fixed') {
            housingLevy = cfg.housingLevy.fixedAmount || 0;
        } else {
            const rate = (cfg.housingLevy.percentageRate ?? 1.5) / 100;
            housingLevy = grossSalary * rate;
        }
    }

    const allowableDeductions = nssf + shif + housingLevy;
    const taxableIncome = Math.max(0, grossSalary - allowableDeductions);

    let grossPaye = 0;
    if (cfg.paye.enabled && grossSalary > 0) {
        let remainingTaxable = taxableIncome;
        const band1 = Math.min(remainingTaxable, 24000); grossPaye += band1 * 0.10; remainingTaxable -= band1;
        if (remainingTaxable > 0) { const b = Math.min(remainingTaxable, 8333); grossPaye += b * 0.25; remainingTaxable -= b; }
        if (remainingTaxable > 0) { const b = Math.min(remainingTaxable, 467667); grossPaye += b * 0.30; remainingTaxable -= b; }
        if (remainingTaxable > 0) { const b = Math.min(remainingTaxable, 300000); grossPaye += b * 0.325; remainingTaxable -= b; }
        if (remainingTaxable > 0) grossPaye += remainingTaxable * 0.35;
    }

    const personalRelief = (cfg.paye.enabled && grossSalary > 0) ? (cfg.paye.personalRelief ?? 2400) : 0;
    const netPaye = Math.max(0, grossPaye - personalRelief);
    const netSalary = grossSalary - allowableDeductions - netPaye;

    return { grossSalary, baseGross, nssf, shif, housingLevy, taxableIncome, grossPaye, personalRelief, netPaye, biometricDeduction, netSalary };
};

// Robust helper to extract configured basic salary per staff member, supporting stringified metadata
export const getStaffBasicSalary = (s: any): number => {
    if (!s) return 0;
    let m = s.metadata || {};
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { m = {}; } }
    const val = Number(m.basicSalary ?? m.basic_salary ?? m.basic ?? s.basicSalary ?? s.basic_salary ?? s.basic);
    return (!isNaN(val) && val > 0) ? val : 0;
};

export const PayrollEngine: React.FC<PayrollEngineProps> = ({
    staff,
    payrollRecords,
    institution,
    onProcessPayroll,
    onOpenExcelImport
}) => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const d = new Date();
        return `${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`;
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [useBiometric, setUseBiometric] = useState(false);
    const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
    const [showDesignerModal, setShowDesignerModal] = useState(false);
    const [showStatutorySettingsModal, setShowStatutorySettingsModal] = useState(false);
    const [statutorySettings, setStatutorySettings] = useState<StatutoryPayrollSettings>(() => {
        try {
            const stored = localStorage.getItem(`eduai_statutory_payroll_settings_${institution.id}`);
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return DEFAULT_STATUTORY_SETTINGS;
    });

    const handleSaveStatutorySettings = async (newSettings: StatutoryPayrollSettings) => {
        setStatutorySettings(newSettings);
        try {
            localStorage.setItem(`eduai_statutory_payroll_settings_${institution.id}`, JSON.stringify(newSettings));
            await apiService.saveModuleRecord('institution_module_states', {
                id: `statutory_tax_settings_${institution.id}`,
                institutionId: institution.id,
                module: 'hr_statutory_settings',
                state: newSettings,
                updatedAt: new Date().toISOString()
            }).catch(() => {});
        } catch (e) {
            console.error('Error saving statutory settings:', e);
        }
    };

    // Per-employee salary overrides (keyed by staffId) — allows inline editing even if metadata not yet synced
    const [salaryOverrides, setSalaryOverrides] = useState<Record<string, number>>({});
    // Payslip edit/delete state
    const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
    const [editBasicSalary, setEditBasicSalary] = useState<number>(0);
    const [editNetSalary, setEditNetSalary] = useState<number>(0);
    const [editStatus, setEditStatus] = useState<string>('paid');
    const [localRecords, setLocalRecords] = useState<PayrollRecord[]>(payrollRecords);

    // Bulk & Single Payslip Preview State
    const [pdfPreviewModal, setPdfPreviewModal] = useState<{ url: string; title: string } | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const [designerConfig, setDesignerConfig] = useState(() => {
        try {
            const stored = localStorage.getItem('eduai_payslip_template_config');
            if (stored) return JSON.parse(stored);
        } catch (e) {}
        return { primaryColor: '#4f46e5', signerName: 'Authorized Signature', signerTitle: 'Head of Human Resources', footerMessage: `${institution.name} — Confidential Payslip` };
    });

    // Sync localRecords when parent payrollRecords prop changes
    useMemo(() => { setLocalRecords(payrollRecords); }, [payrollRecords]);

    const handleSaveTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            localStorage.setItem('eduai_payslip_template_config', JSON.stringify(designerConfig));
            alert('Payslip template saved!');
            setShowDesignerModal(false);
        } catch (error) { alert('Failed to save template.'); }
    };

    // Memoize staff calculations using configured OR overridden salary + assigned allowances & deductions
    const activeStaffCalculations = useMemo(() => {
        return staff.map(s => {
            const attendance = getStaffAttendance(s.id);
            const configured = getStaffBasicSalary(s);
            // Use explicit override if entered, else use configured salary from metadata
            const staffBasicSalary = (salaryOverrides[s.id] !== undefined && salaryOverrides[s.id] > 0)
                ? salaryOverrides[s.id]
                : configured;

            let m = s.metadata || {};
            if (typeof m === 'string') {
                try { m = JSON.parse(m); } catch (e) { m = {}; }
            }
            const assignedAllowances: Array<{ name: string; amount: number; type?: string }> = Array.isArray(m.assignedAllowances) ? m.assignedAllowances : [];
            const assignedDeductions: Array<{ name: string; amount: number; type?: string; referenceNumber?: string }> = Array.isArray(m.assignedDeductions) ? m.assignedDeductions : [];

            // If house allowance is not explicitly assigned in custom allowances, provide default 15%
            const hasCustomHouse = assignedAllowances.some(a => a.name.toLowerCase().includes('house'));
            const staffHouseAllowance = hasCustomHouse ? 0 : Math.round(staffBasicSalary * 0.15);

            const customAllowancesSum = assignedAllowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
            const totalAllowancesSum = staffHouseAllowance + customAllowancesSum;

            const payroll = calculateKenyanPayroll(staffBasicSalary, totalAllowancesSum, attendance.attendanceRate, useBiometric, statutorySettings, m);

            const customDeductionsSum = assignedDeductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
            const adjustedNetSalary = Math.max(0, payroll.netSalary - customDeductionsSum);

            return { 
                staffId: s.id, 
                name: s.name, 
                role: s.role, 
                basicSalary: staffBasicSalary, 
                houseAllowance: staffHouseAllowance, 
                assignedAllowances,
                assignedDeductions,
                customAllowancesSum,
                customDeductionsSum,
                adjustedNetSalary,
                attendance, 
                payroll, 
                configuredSalary: configured 
            };
        });
    }, [staff, useBiometric, salaryOverrides]);

    const stats = useMemo(() => {
        const currentMonthRecords = localRecords.filter(r => r.month === selectedMonth);
        const totalNet = currentMonthRecords.length > 0
            ? currentMonthRecords.reduce((acc, r) => acc + (r.netSalary || 0), 0)
            : activeStaffCalculations.reduce((acc, c) => acc + c.adjustedNetSalary, 0);
        const totalStatutoryDeductions = activeStaffCalculations.reduce((acc, c) => acc + c.payroll.nssf + c.payroll.shif + c.payroll.housingLevy + c.payroll.netPaye, 0);
        const totalCustomDeductions = activeStaffCalculations.reduce((acc, c) => acc + c.customDeductionsSum, 0);
        const totalDeductions = totalStatutoryDeductions + totalCustomDeductions;
        const totalBiometricPenalties = activeStaffCalculations.reduce((acc, c) => acc + c.payroll.biometricDeduction, 0);
        return { processedCount: currentMonthRecords.length, totalPayout: totalNet, pendingCount: staff.length - currentMonthRecords.length, totalDeductions, totalBiometricPenalties };
    }, [localRecords, selectedMonth, staff, activeStaffCalculations]);

    const handleRunPayroll = async () => {
        const missing = activeStaffCalculations.filter(c => c.basicSalary <= 0);
        if (missing.length > 0) {
            alert(`Please enter a basic salary for: ${missing.map(m => m.name).join(', ')}`);
            return;
        }
        setIsProcessing(true);
        try {
            const newRecords: PayrollRecord[] = activeStaffCalculations.map(c => {
                const allowances: Array<{ name: string; amount: number }> = [];
                if (c.houseAllowance > 0) allowances.push({ name: 'House Allowance (15%)', amount: c.houseAllowance });
                c.assignedAllowances.forEach(a => {
                    if (Number(a.amount) > 0) allowances.push({ name: a.name, amount: Number(a.amount) });
                });

                const deductions: Array<{ name: string; amount: number }> = [
                    { name: 'NSSF', amount: c.payroll.nssf },
                    { name: 'SHIF', amount: c.payroll.shif },
                    { name: 'Housing Levy', amount: c.payroll.housingLevy },
                    { name: 'PAYE', amount: c.payroll.netPaye }
                ];
                if (c.payroll.biometricDeduction > 0) deductions.push({ name: 'Biometric Attendance Penalty', amount: c.payroll.biometricDeduction });
                c.assignedDeductions.forEach(d => {
                    if (Number(d.amount) > 0) deductions.push({ name: d.name, amount: Number(d.amount) });
                });

                return {
                    id: `pay_${Date.now()}_${c.staffId}`,
                    institutionId: institution.id,
                    staffId: c.staffId,
                    staffName: c.name,
                    month: selectedMonth,
                    basicSalary: c.basicSalary,
                    allowances,
                    deductions,
                    netSalary: Math.round(c.adjustedNetSalary * 100) / 100,
                    status: 'paid',
                    recordedBy: 'System Engine (Kenyan Compliant)',
                    paymentDate: new Date().toISOString()
                };
            });
            await onProcessPayroll(newRecords);
            setLocalRecords(prev => [...prev.filter(r => !(r.month === selectedMonth && newRecords.find(n => n.staffId === r.staffId))), ...newRecords]);
            alert(`Payroll processed for ${staff.length} staff.`);
        } catch (error) {
            alert('Failed to process payroll records.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteRecord = (recordId: string) => {
        if (!confirm('Delete this payslip record?')) return;
        setLocalRecords(prev => prev.filter(r => r.id !== recordId));
    };

    const handleOpenEditRecord = (record: PayrollRecord) => {
        setEditingRecord(record);
        setEditBasicSalary(record.basicSalary || 0);
        setEditNetSalary(record.netSalary || 0);
        setEditStatus(record.status || 'paid');
    };

    const handleSaveEditRecord = () => {
        if (!editingRecord) return;
        const targetId = editingRecord.id;
        setLocalRecords(prev => prev.map(r => r.id === targetId
            ? ({ ...r, basicSalary: editBasicSalary, netSalary: editNetSalary, status: editStatus as 'pending' | 'paid' | 'approved' | 'draft' | 'processed' } as PayrollRecord)
            : r
        ));
        setEditingRecord(null);
    };

    const handleGenerateBulkPayslipsPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const currentMonthRecords = localRecords.filter(r => r.month === selectedMonth);
            let items: Array<{ staff: User; record: PayrollRecord }> = [];

            if (currentMonthRecords.length > 0) {
                for (const rec of currentMonthRecords) {
                    const member = staff.find(s => s.id === rec.staffId);
                    if (member) {
                        items.push({ staff: member, record: rec });
                    }
                }
            }

            if (items.length === 0) {
                items = activeStaffCalculations.map(c => {
                    const member = staff.find(s => s.id === c.staffId) || { id: c.staffId, name: c.name, role: c.role } as User;
                    const allowances = [{ name: 'House Allowance', amount: c.houseAllowance }];
                    if (Array.isArray(c.assignedAllowances)) {
                        c.assignedAllowances.forEach(a => {
                            if (Number(a.amount) > 0) allowances.push({ name: a.name || 'Allowance', amount: Number(a.amount) });
                        });
                    }

                    const deductions = [
                        { name: 'NSSF Pension', amount: Math.round(c.payroll.nssf) },
                        { name: 'SHIF Medical', amount: Math.round(c.payroll.shif) },
                        { name: 'Housing Levy (AHL)', amount: Math.round(c.payroll.housingLevy) },
                        { name: 'PAYE Tax', amount: Math.round(c.payroll.netPaye) }
                    ];
                    if (c.payroll.biometricDeduction > 0) {
                        deductions.push({ name: 'Biometric Absence Penalty', amount: Math.round(c.payroll.biometricDeduction) });
                    }
                    if (Array.isArray(c.assignedDeductions)) {
                        c.assignedDeductions.forEach(d => {
                            if (Number(d.amount) > 0) deductions.push({ name: d.name || 'Custom Deduction', amount: Number(d.amount) });
                        });
                    }

                    const syntheticRecord: PayrollRecord = {
                        id: `pay_${Date.now()}_${c.staffId}`,
                        institutionId: institution.id,
                        staffId: c.staffId,
                        staffName: c.name,
                        month: selectedMonth,
                        basicSalary: c.basicSalary,
                        allowances,
                        deductions,
                        netSalary: Math.round(c.payroll.netSalary * 100) / 100,
                        status: 'paid',
                        recordedBy: 'Kenyan Payroll Engine',
                        paymentDate: new Date().toISOString()
                    };
                    return { staff: member, record: syntheticRecord };
                });
            }

            if (items.length === 0) {
                alert('No staff members available to generate payslips.');
                return;
            }

            const dataUri = await generateBulkStaffPayslipsPdf(items, institution, designerConfig);
            setPdfPreviewModal({
                url: dataUri,
                title: `Bulk Payslips - ${selectedMonth} (${items.length} Staff)`
            });
        } catch (error: any) {
            console.error(error);
            alert('Failed to generate bulk payslips: ' + (error?.message || error));
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleGenerateSinglePayslipPdf = async (staffId: string) => {
        setIsGeneratingPdf(true);
        try {
            const member = staff.find(s => s.id === staffId);
            if (!member) return;

            let record = localRecords.find(r => r.staffId === staffId && r.month === selectedMonth);
            if (!record) {
                const calc = activeStaffCalculations.find(c => c.staffId === staffId);
                if (!calc) return;
                const allowances = [{ name: 'House Allowance', amount: calc.houseAllowance }];
                if (Array.isArray(calc.assignedAllowances)) {
                    calc.assignedAllowances.forEach(a => {
                        if (Number(a.amount) > 0) allowances.push({ name: a.name || 'Allowance', amount: Number(a.amount) });
                    });
                }

                const deductions = [
                    { name: 'NSSF Pension', amount: Math.round(calc.payroll.nssf) },
                    { name: 'SHIF Medical', amount: Math.round(calc.payroll.shif) },
                    { name: 'Housing Levy (AHL)', amount: Math.round(calc.payroll.housingLevy) },
                    { name: 'PAYE Tax', amount: Math.round(calc.payroll.netPaye) }
                ];
                if (calc.payroll.biometricDeduction > 0) {
                    deductions.push({ name: 'Biometric Absence Penalty', amount: Math.round(calc.payroll.biometricDeduction) });
                }
                if (Array.isArray(calc.assignedDeductions)) {
                    calc.assignedDeductions.forEach(d => {
                        if (Number(d.amount) > 0) deductions.push({ name: d.name || 'Custom Deduction', amount: Number(d.amount) });
                    });
                }

                record = {
                    id: `pay_${Date.now()}_${calc.staffId}`,
                    institutionId: institution.id,
                    staffId: calc.staffId,
                    staffName: calc.name,
                    month: selectedMonth,
                    basicSalary: calc.basicSalary,
                    allowances,
                    deductions,
                    netSalary: Math.round(calc.payroll.netSalary * 100) / 100,
                    status: 'paid',
                    recordedBy: 'Kenyan Payroll Engine',
                    paymentDate: new Date().toISOString()
                };
            }

            const dataUri = await generateStaffPayslipPdf(member, record, institution, designerConfig);
            setPdfPreviewModal({
                url: dataUri,
                title: `Payslip - ${member.name} (${selectedMonth})`
            });
        } catch (error: any) {
            console.error(error);
            alert('Failed to generate payslip: ' + (error?.message || error));
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const [statutoryScheduleType, setStatutoryScheduleType] = useState<StatutoryReportType>('consolidated');

    const handleGenerateEngineStatutoryPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const currentMonthRecords = localRecords.filter(r => r.month === selectedMonth);
            let recordsToUse: PayrollRecord[] = currentMonthRecords;

            if (recordsToUse.length === 0) {
                recordsToUse = activeStaffCalculations.map(c => {
                    const allowances = [{ name: 'House Allowance', amount: c.houseAllowance }];
                    const deductions = [
                        { name: 'NSSF', amount: Math.round(c.payroll.nssf) },
                        { name: 'SHIF', amount: Math.round(c.payroll.shif) },
                        { name: 'Housing Levy', amount: Math.round(c.payroll.housingLevy) },
                        { name: 'PAYE', amount: Math.round(c.payroll.netPaye) }
                    ];
                    return {
                        id: `stat_${Date.now()}_${c.staffId}`,
                        institutionId: institution.id,
                        staffId: c.staffId,
                        staffName: c.name,
                        month: selectedMonth,
                        basicSalary: c.basicSalary,
                        allowances,
                        deductions,
                        netSalary: Math.round(c.payroll.netSalary * 100) / 100,
                        status: 'paid',
                        recordedBy: 'Kenyan Payroll Engine',
                        paymentDate: new Date().toISOString()
                    } as PayrollRecord;
                });
            }

            if (recordsToUse.length === 0) {
                alert('No staff records available for statutory schedule.');
                return;
            }

            const dataUri = await generateBulkStatutoryReportPdf(
                selectedMonth,
                recordsToUse,
                staff,
                statutoryScheduleType,
                institution,
                designerConfig
            );
            const typeLabels: Record<StatutoryReportType, string> = {
                consolidated: 'Master Statutory Deductions',
                nssf: 'NSSF By-Product Return',
                shif: 'SHIF Medical Fund Remittance',
                housing_levy: 'Affordable Housing Levy (AHL)',
                paye: 'KRA PAYE Tax Return'
            };
            setPdfPreviewModal({
                url: dataUri,
                title: `${typeLabels[statutoryScheduleType]} - ${selectedMonth} (${recordsToUse.length} Staff)`
            });
        } catch (error: any) {
            console.error(error);
            alert('Failed to generate statutory report: ' + (error?.message || error));
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleDownloadEngineStatutoryCsv = () => {
        const currentMonthRecords = localRecords.filter(r => r.month === selectedMonth);
        let recordsToUse: PayrollRecord[] = currentMonthRecords;

        if (recordsToUse.length === 0) {
            recordsToUse = activeStaffCalculations.map(c => {
                const allowances = [{ name: 'House Allowance', amount: c.houseAllowance }];
                const deductions = [
                    { name: 'NSSF', amount: Math.round(c.payroll.nssf) },
                    { name: 'SHIF', amount: Math.round(c.payroll.shif) },
                    { name: 'Housing Levy', amount: Math.round(c.payroll.housingLevy) },
                    { name: 'PAYE', amount: Math.round(c.payroll.netPaye) }
                ];
                return {
                    id: `stat_${Date.now()}_${c.staffId}`,
                    institutionId: institution.id,
                    staffId: c.staffId,
                    staffName: c.name,
                    month: selectedMonth,
                    basicSalary: c.basicSalary,
                    allowances,
                    deductions,
                    netSalary: Math.round(c.payroll.netSalary * 100) / 100,
                    status: 'paid',
                    recordedBy: 'Kenyan Payroll Engine',
                    paymentDate: new Date().toISOString()
                } as PayrollRecord;
            });
        }

        downloadStatutoryCsv(
            selectedMonth,
            recordsToUse,
            staff,
            statutoryScheduleType,
            institution.name
        );
    };

    const handleGenerateEngineBulkP9 = async () => {
        setIsGeneratingPdf(true);
        try {
            const yearStr = selectedMonth.split(' ')[1] || new Date().getFullYear().toString();
            const items = staff.map(member => {
                let yearRecords = localRecords.filter(r => r.staffId === member.id && r.month.endsWith(yearStr));
                if (yearRecords.length === 0) {
                    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    const calc = activeStaffCalculations.find(c => c.staffId === member.id);
                    const basic = calc ? calc.basicSalary : getStaffBasicSalary(member);
                    const gross = basic > 0 ? basic : 50000;
                    const nssf = Math.min(gross, 9000) * 0.06 + Math.max(0, Math.min(gross, 108000) - 9000) * 0.06;
                    const shif = Math.max(300, gross * 0.0275);
                    const housingLevy = gross * 0.015;
                    const allowable = nssf + shif + housingLevy;
                    const taxable = Math.max(0, gross - allowable);
                    let grossPaye = 0, rem = taxable;
                    const b1 = Math.min(rem, 24000); grossPaye += b1 * 0.10; rem -= b1;
                    if (rem > 0) { const b = Math.min(rem, 8333); grossPaye += b * 0.25; rem -= b; }
                    if (rem > 0) { const b = Math.min(rem, 467667); grossPaye += b * 0.30; rem -= b; }
                    if (rem > 0) { const b = Math.min(rem, 300000); grossPaye += b * 0.325; rem -= b; }
                    if (rem > 0) grossPaye += rem * 0.35;
                    const paye = Math.max(0, grossPaye - (gross > 0 ? 2400 : 0));
                    const net = gross - allowable - paye;

                    yearRecords = months.map(mName => ({
                        id: `p9_${member.id}_${mName}_${yearStr}`,
                        institutionId: institution.id,
                        staffId: member.id,
                        staffName: member.name,
                        month: `${mName} ${yearStr}`,
                        basicSalary: basic,
                        allowances: [],
                        deductions: [
                            { name: 'NSSF', amount: Math.round(nssf) },
                            { name: 'SHIF', amount: Math.round(shif) },
                            { name: 'Housing Levy', amount: Math.round(housingLevy) },
                            { name: 'PAYE', amount: Math.round(paye) }
                        ],
                        netSalary: Math.round(net),
                        status: 'paid',
                        recordedBy: 'Kenyan Payroll Engine',
                        paymentDate: new Date().toISOString()
                    } as PayrollRecord));
                }
                return { staff: member, records: yearRecords };
            });

            if (items.length === 0) {
                alert('No staff members available for P9 generation.');
                return;
            }

            const dataUri = await generateBulkStaffP9Pdf(items, yearStr, institution, designerConfig);
            setPdfPreviewModal({
                url: dataUri,
                title: `Bulk P9 Tax Deduction Certificates - ${yearStr} (${items.length} Staff)`
            });
        } catch (error: any) {
            console.error(error);
            alert('Failed to generate bulk P9 certificates: ' + (error?.message || error));
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handleGenerateEngineSingleP9 = async (staffId: string) => {
        setIsGeneratingPdf(true);
        try {
            const member = staff.find(s => s.id === staffId);
            if (!member) return;

            const yearStr = selectedMonth.split(' ')[1] || new Date().getFullYear().toString();
            let yearRecords = localRecords.filter(r => r.staffId === staffId && r.month.endsWith(yearStr));
            if (yearRecords.length === 0) {
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const calc = activeStaffCalculations.find(c => c.staffId === member.id);
                const basic = calc ? calc.basicSalary : getStaffBasicSalary(member);
                const gross = basic > 0 ? basic : 50000;
                const nssf = Math.min(gross, 9000) * 0.06 + Math.max(0, Math.min(gross, 108000) - 9000) * 0.06;
                const shif = Math.max(300, gross * 0.0275);
                const housingLevy = gross * 0.015;
                const allowable = nssf + shif + housingLevy;
                const taxable = Math.max(0, gross - allowable);
                let grossPaye = 0, rem = taxable;
                const b1 = Math.min(rem, 24000); grossPaye += b1 * 0.10; rem -= b1;
                if (rem > 0) { const b = Math.min(rem, 8333); grossPaye += b * 0.25; rem -= b; }
                if (rem > 0) { const b = Math.min(rem, 467667); grossPaye += b * 0.30; rem -= b; }
                if (rem > 0) { const b = Math.min(rem, 300000); grossPaye += b * 0.325; rem -= b; }
                if (rem > 0) grossPaye += rem * 0.35;
                const paye = Math.max(0, grossPaye - (gross > 0 ? 2400 : 0));
                const net = gross - allowable - paye;

                yearRecords = months.map(mName => ({
                    id: `p9_${member.id}_${mName}_${yearStr}`,
                    institutionId: institution.id,
                    staffId: member.id,
                    staffName: member.name,
                    month: `${mName} ${yearStr}`,
                    basicSalary: basic,
                    allowances: [],
                    deductions: [
                        { name: 'NSSF', amount: Math.round(nssf) },
                        { name: 'SHIF', amount: Math.round(shif) },
                        { name: 'Housing Levy', amount: Math.round(housingLevy) },
                        { name: 'PAYE', amount: Math.round(paye) }
                    ],
                    netSalary: Math.round(net),
                    status: 'paid',
                    recordedBy: 'Kenyan Payroll Engine',
                    paymentDate: new Date().toISOString()
                } as PayrollRecord));
            }

            const dataUri = await generateStaffP9Pdf(member, yearRecords, yearStr, institution, designerConfig);
            setPdfPreviewModal({
                url: dataUri,
                title: `P9 Tax Certificate - ${member.name} (${yearStr})`
            });
        } catch (error: any) {
            console.error(error);
            alert('Failed to generate P9 certificate: ' + (error?.message || error));
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const toggleRow = (staffId: string) => setExpandedStaffId(expandedStaffId === staffId ? null : staffId);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Main Header Card */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl" />
                <div className="relative space-y-4">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Kenyan Payroll Engine</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1.5 mt-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Statutory Tax Compliant (NSSF/SHIF/Housing Levy/PAYE)
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Staff</p>
                            <p className="text-lg font-black text-slate-900">{staff.length}</p>
                        </div>
                        <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Payout</p>
                            <p className="text-lg font-black text-indigo-600">KES {Math.round(stats.totalPayout)?.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="relative flex flex-col items-stretch md:items-end gap-3 w-full md:w-auto">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-none cursor-pointer text-center"
                    >
                        {MONTH_OPTIONS.map(m => <option key={m}>{m}</option>)}
                    </select>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setShowStatutorySettingsModal(true)}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer border border-slate-700"
                            title="Configure NSSF, Housing Levy (AHL), SHIF, and PAYE calculation modes (% vs Fixed)"
                        >
                            <Cog8ToothIcon className="w-4 h-4 text-indigo-400" />
                            <span>Tax & Statutory</span>
                        </button>
                        {onOpenExcelImport && (
                            <button
                                onClick={onOpenExcelImport}
                                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-500/20 transition-all active:scale-95 cursor-pointer"
                                title="Import Excel / CSV Payroll Register"
                            >
                                <ArrowUpTrayIcon className="w-4 h-4" />
                                <span>Import Excel</span>
                            </button>
                        )}
                        <button
                            onClick={handleGenerateBulkPayslipsPdf}
                            disabled={isGeneratingPdf || staff.length === 0}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                            title="Generate All Payslips as a single multi-page PDF"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>Bulk Slips ({staff.length})</span>
                        </button>
                        <button
                            onClick={handleGenerateEngineBulkP9}
                            disabled={isGeneratingPdf || staff.length === 0}
                            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                            title="Generate Consolidated P9 Tax Certificates for All Staff"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>Bulk P9 ({staff.length})</span>
                        </button>
                        <button
                            onClick={handleRunPayroll}
                            disabled={isProcessing || staff.length === 0}
                            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <CalculatorIcon className="w-4 h-4" />
                            <span>Run Payroll</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Biometric Toggle */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-[2.5rem] text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-white/5 shadow-md">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-white/10">
                        <FingerPrintIcon className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-wider">Biometric Attendance Payroll Link</h4>
                        <p className="text-xs text-indigo-200 mt-1 max-w-lg">Pro-rate basic salaries automatically by linking biometric check-ins. Unpaid absences trigger statutory tax base adjustments.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${useBiometric ? 'text-indigo-400' : 'text-slate-400'}`}>{useBiometric ? 'Active' : 'Disabled'}</span>
                    <button onClick={() => setUseBiometric(!useBiometric)} className={`w-14 h-8 rounded-full transition-all duration-300 relative border ${useBiometric ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-800 border-slate-700'}`}>
                        <div className={`w-6 h-6 rounded-full bg-white absolute top-0.5 shadow transition-all duration-300 ${useBiometric ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Staff Ledger */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Staff Ledger ({selectedMonth})</h3>
                        <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-100">
                            {useBiometric ? 'Biometrics Integrated' : 'Standard Basic Mode'}
                        </span>
                    </div>
                    <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '560px' }}>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50/80 sticky top-0 z-10">
                                <tr>
                                    <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Employee</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Basic Salary (KES)</th>
                                    {useBiometric && <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Attendance</th>}
                                    <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Gross</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Net</th>
                                    <th className="px-4 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activeStaffCalculations.map((calc) => {
                                    const record = localRecords.find(r => r.staffId === calc.staffId && r.month === selectedMonth);
                                    const isExpanded = expandedStaffId === calc.staffId;
                                    const displaySalary = salaryOverrides[calc.staffId] !== undefined ? salaryOverrides[calc.staffId] : calc.configuredSalary;
                                    return (
                                        <React.Fragment key={calc.staffId}>
                                            <tr className="hover:bg-slate-50/30 transition-colors">
                                                <td className="px-5 py-4 cursor-pointer" onClick={() => toggleRow(calc.staffId)}>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm uppercase flex-shrink-0">{calc.name.charAt(0)}</div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">{calc.name}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{calc.role.replace(/_/g, ' ')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder={calc.configuredSalary > 0 ? String(calc.configuredSalary) : 'Enter salary…'}
                                                        value={displaySalary > 0 ? displaySalary : ''}
                                                        onChange={e => setSalaryOverrides(prev => ({ ...prev, [calc.staffId]: Number(e.target.value) || 0 }))}
                                                        className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                                                    />
                                                </td>
                                                {useBiometric && (
                                                    <td className="px-4 py-4 text-center">
                                                        <div className="inline-flex flex-col items-center">
                                                            <span className="text-xs font-black text-slate-800">{calc.attendance.actualCheckIns}/{calc.attendance.expectedCheckIns}</span>
                                                            <span className={`text-[9px] font-bold uppercase tracking-tight mt-0.5 px-1.5 py-0.5 rounded ${calc.attendance.attendanceRate === 1 ? 'bg-emerald-50 text-emerald-600' : calc.attendance.attendanceRate >= 0.95 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                {(calc.attendance.attendanceRate * 100).toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-4 py-4 text-right font-bold text-slate-600 text-sm">
                                                    {calc.basicSalary > 0 ? Math.round(calc.payroll.grossSalary).toLocaleString() : '—'}
                                                </td>
                                                <td className="px-4 py-4 text-right font-black text-slate-900 text-sm">
                                                    {record ? Math.round(record.netSalary || 0).toLocaleString() : calc.basicSalary > 0 ? Math.round(calc.payroll?.netSalary || 0).toLocaleString() : '—'}
                                                </td>
                                                <td className="px-3 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button 
                                                            onClick={() => handleGenerateSinglePayslipPdf(calc.staffId)} 
                                                            title="Generate Individual Payslip" 
                                                            className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all"
                                                        >
                                                            <DocumentTextIcon className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleGenerateEngineSingleP9(calc.staffId)} 
                                                            title="Generate P9 Tax Certificate" 
                                                            className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-all"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                        </button>
                                                        <button onClick={() => toggleRow(calc.staffId)} title="Details" className={`p-1.5 hover:bg-slate-100 rounded-lg transition-all ${isExpanded ? 'rotate-180 text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
                                                            <ChevronDownIcon className="w-4 h-4" />
                                                        </button>
                                                        {record && (<>
                                                            <button onClick={() => handleOpenEditRecord(record)} title="Edit Payslip" className="p-1.5 hover:bg-amber-50 text-amber-500 rounded-lg transition-all">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                            <button onClick={() => handleDeleteRecord(record.id)} title="Delete Payslip" className="p-1.5 hover:bg-rose-50 text-rose-400 rounded-lg transition-all">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </>)}
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50/50">
                                                    <td colSpan={useBiometric ? 6 : 5} className="px-8 py-6">
                                                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top duration-300">
                                                            <div className="space-y-3">
                                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">Salary & Allowances</h4>
                                                                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>Basic Salary</span><span>KES {calc.basicSalary > 0 ? calc.basicSalary.toLocaleString() : '—'}</span></div>
                                                                {calc.houseAllowance > 0 && (
                                                                    <div className="flex justify-between text-xs font-semibold text-slate-600"><span>House Allowance (15%)</span><span>KES {calc.houseAllowance.toLocaleString()}</span></div>
                                                                )}
                                                                {calc.assignedAllowances?.map((a, aIdx) => (
                                                                    <div key={aIdx} className="flex justify-between text-xs font-semibold text-indigo-600">
                                                                        <span>{a.name}</span>
                                                                        <span>+ KES {Number(a.amount).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                                {useBiometric && calc.payroll.biometricDeduction > 0 && (
                                                                    <div className="flex justify-between text-xs font-black text-rose-500"><span>Biometric Absence Adjustment</span><span>- KES {Math.round(calc.payroll.biometricDeduction).toLocaleString()}</span></div>
                                                                )}
                                                                <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-50 pt-2"><span>Adjusted Gross Income</span><span>KES {Math.round(calc.payroll.grossSalary).toLocaleString()}</span></div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">Contributions & Deductions</h4>
                                                                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>NSSF Pension (Tier I + II)</span><span>KES {Math.round(calc.payroll.nssf).toLocaleString()}</span></div>
                                                                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>SHIF Medical Fund (2.75%)</span><span>KES {Math.round(calc.payroll.shif).toLocaleString()}</span></div>
                                                                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>Affordable Housing Levy (1.5%)</span><span>KES {Math.round(calc.payroll.housingLevy).toLocaleString()}</span></div>
                                                                <div className="flex justify-between text-xs font-semibold text-slate-600 border-t border-slate-50 pt-2"><span>PAYE Tax (Progressive)</span><span>KES {Math.round(calc.payroll.grossPaye).toLocaleString()}</span></div>
                                                                <div className="flex justify-between text-xs font-semibold text-emerald-600"><span>Personal Relief</span><span>- KES {calc.payroll.personalRelief.toLocaleString()}</span></div>
                                                                <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-100 pt-2"><span>Net PAYE Tax Payable</span><span>KES {Math.round(calc.payroll.netPaye).toLocaleString()}</span></div>
                                                                {calc.assignedDeductions?.map((d, dIdx) => (
                                                                    <div key={dIdx} className="flex justify-between text-xs font-semibold text-rose-600">
                                                                        <span>{d.name}</span>
                                                                        <span>- KES {Number(d.amount).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="flex justify-between text-xs font-black text-emerald-600 border-t border-slate-200 pt-2"><span>Estimated Take-Home Pay</span><span>KES {Math.round(calc.adjustedNetSalary).toLocaleString()}</span></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Analytics Sidebar */}
                <div className="space-y-8 lg:sticky lg:top-4">
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full opacity-10 blur-2xl" />
                        <h3 className="text-xl font-black tracking-tight">Statutory Breakdown</h3>
                        <div className="space-y-5">
                            {[
                                { label: 'PAYE (Tax)', amount: activeStaffCalculations.reduce((sum, c) => sum + c.payroll.netPaye, 0), color: 'bg-indigo-500' },
                                { label: 'SHIF (Health)', amount: activeStaffCalculations.reduce((sum, c) => sum + c.payroll.shif, 0), color: 'bg-emerald-500' },
                                { label: 'NSSF (Pension)', amount: activeStaffCalculations.reduce((sum, c) => sum + c.payroll.nssf, 0), color: 'bg-amber-500' },
                                { label: 'Housing Levy (AHL)', amount: activeStaffCalculations.reduce((sum, c) => sum + c.payroll.housingLevy, 0), color: 'bg-rose-500' }
                            ].map((d, i) => {
                                const pct = Math.round((d.amount / (stats.totalDeductions || 1)) * 100) || 0;
                                return (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">{d.label}</span>
                                            <span>KES {Math.round(d.amount)?.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className={`${d.color} h-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                            {useBiometric && stats.totalBiometricPenalties > 0 && (
                                <div className="pt-2 border-t border-white/5">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-rose-400">
                                        <span>Biometric Penalties</span>
                                        <span>KES {Math.round(stats.totalBiometricPenalties).toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Quick Statutory Export Tools */}
                        <div className="pt-4 border-t border-white/10 space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Statutory Schedule Export</label>
                            <select
                                value={statutoryScheduleType}
                                onChange={e => setStatutoryScheduleType(e.target.value as StatutoryReportType)}
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="consolidated">📊 Master Statutory Return</option>
                                <option value="nssf">🛡️ NSSF Return (Tier I & II)</option>
                                <option value="shif">🏥 SHIF Medical Fund</option>
                                <option value="housing_levy">🏠 Housing Levy (AHL)</option>
                                <option value="paye">📑 KRA PAYE Return</option>
                            </select>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleGenerateEngineStatutoryPdf}
                                    disabled={isGeneratingPdf || staff.length === 0}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                >
                                    <DocumentTextIcon className="w-3.5 h-3.5" />
                                    <span>Schedule (PDF)</span>
                                </button>
                                <button
                                    onClick={handleDownloadEngineStatutoryCsv}
                                    disabled={staff.length === 0}
                                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-1"
                                    title="Export Portal CSV"
                                >
                                    <span>📥 CSV</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-indigo-600">
                            <DocumentTextIcon className="w-6 h-6" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Payslip Designer</h3>
                        </div>
                        <p className="text-xs font-medium text-slate-500">Customize institutional payslip templates with branding and statutory disclosures.</p>
                        <button onClick={() => setShowDesignerModal(true)} className="w-full py-4 bg-slate-50 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-100 hover:bg-slate-100 transition-all active:scale-95">
                            Configure Template
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Payslip Modal */}
            {editingRecord && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Edit Payslip</h3>
                                <p className="text-[10px] text-slate-500 mt-0.5">{editingRecord.staffName} — {editingRecord.month}</p>
                            </div>
                            <button onClick={() => setEditingRecord(null)} className="p-2 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all border border-slate-100">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Basic Salary (KES)</label>
                                <input type="number" value={editBasicSalary} onChange={e => setEditBasicSalary(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Net Salary (KES)</label>
                                <input type="number" value={editNetSalary} onChange={e => setEditNetSalary(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Status</label>
                                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400">
                                    <option value="paid">Paid</option>
                                    <option value="pending">Pending</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleSaveEditRecord} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">Save Changes</button>
                                <button onClick={() => setEditingRecord(null)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payslip Template Designer Modal */}
            {showDesignerModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Payslip Designer</h3>
                                <p className="text-[10px] font-semibold text-slate-400">Customize institutional payslip document layout</p>
                            </div>
                            <button onClick={() => setShowDesignerModal(false)} className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTemplate} className="p-8 space-y-6 overflow-y-auto">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Accent Color Theme</label>
                                <div className="flex gap-3">
                                    {[{ hex: '#4f46e5', name: 'Indigo' }, { hex: '#0284c7', name: 'Ocean' }, { hex: '#059669', name: 'Emerald' }, { hex: '#e11d48', name: 'Rose' }, { hex: '#374151', name: 'Charcoal' }].map(color => (
                                        <button type="button" key={color.hex} onClick={() => setDesignerConfig((prev: any) => ({ ...prev, primaryColor: color.hex }))} className={`w-10 h-10 rounded-full border-4 transition-all ${designerConfig.primaryColor === color.hex ? 'border-slate-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: color.hex }} title={color.name} />
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Signer Label</label>
                                    <input type="text" required value={designerConfig.signerName} onChange={e => setDesignerConfig((prev: any) => ({ ...prev, signerName: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Authorized Signature" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Signer Title</label>
                                    <input type="text" value={designerConfig.signerTitle || ''} onChange={e => setDesignerConfig((prev: any) => ({ ...prev, signerTitle: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Head of Human Resources" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Footer Message</label>
                                <input type="text" required value={designerConfig.footerMessage} onChange={e => setDesignerConfig((prev: any) => ({ ...prev, footerMessage: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Confidential Document" />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95">Save Template</button>
                                <button type="button" onClick={() => setShowDesignerModal(false)} className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-300">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payslip & Bulk Payslip PDF Preview Modal */}
            {pdfPreviewModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-150 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="px-8 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">{pdfPreviewModal.title}</h3>
                                <p className="text-[10px] font-semibold text-slate-400">Official Payslip Document • Kenyan Statutory Compliant</p>
                            </div>
                            <button 
                                onClick={() => setPdfPreviewModal(null)} 
                                className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-xl transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* PDF Frame */}
                        <div className="flex-1 p-6 bg-slate-100">
                            <iframe 
                                src={pdfPreviewModal.url} 
                                className="w-full h-[65vh] rounded-2xl border border-slate-200 shadow-inner bg-white" 
                                title="Payslip Preview"
                            />
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button 
                                onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = pdfPreviewModal.url;
                                    link.download = `${pdfPreviewModal.title.replace(/\s+/g, '_')}.pdf`;
                                    link.click();
                                }}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                            >
                                Download PDF
                            </button>
                            <button 
                                onClick={() => setPdfPreviewModal(null)} 
                                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-300"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Statutory & Tax Settings Modal */}
            <StatutoryTaxSettingsModal
                isOpen={showStatutorySettingsModal}
                onClose={() => setShowStatutorySettingsModal(false)}
                institution={institution}
                settings={statutorySettings}
                onSaveSettings={handleSaveStatutorySettings}
            />
        </div>
    );
};
