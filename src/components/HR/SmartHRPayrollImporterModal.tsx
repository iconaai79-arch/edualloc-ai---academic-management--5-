import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import type { User, PayrollRecord, Institution } from '../../types';
import { apiService } from '../../services/apiService';

export interface ParsedHREmployeeRow {
    rawIndex?: number;
    no?: string | number;
    name: string;
    designation: string;
    role: string;
    pf?: string;
    bankAccount: string;
    basicSalary: number;
    currentSalary?: number;
    // Allowances
    houseAllowance: number;
    medicalAllowance: number;
    housingLevyAllowance: number;
    nssfAllowance: number;
    otherAllowances: number;
    totalGross: number;
    // Deductions
    nssfDeduction: number;
    shifDeduction: number;
    welfareDeduction: number;
    saccoDeduction: number;
    housingLevyDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
    // Net
    netPay: number;
    // Matching
    matchedStaffId?: string;
    isExisting: boolean;
    isValid: boolean;
    errors: string[];
}

export interface StaffSnapshot {
    staffId: string;
    staffName: string;
    isNewlyCreated: boolean;
    previousSalary?: number;
    previousMetadata?: any;
}

export interface HRImportBatch {
    id: string;
    institutionId: string;
    fileName: string;
    fileSize?: number;
    importedAt: string;
    period: string;
    importMode: 'both' | 'roster_only' | 'payroll_only';
    overwriteStrategy: 'overwrite' | 'skip_existing' | 'rollback_previous_then_import';
    totalRows: number;
    newStaffCount: number;
    updatedStaffCount: number;
    createdStaffIds: string[];
    staffSnapshots: StaffSnapshot[];
    payrollRecordIds: string[];
    totalSalary: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    status: 'applied' | 'rolled_back';
    rolledBackAt?: string;
    notes?: string;
}

export interface SmartHRPayrollImporterModalProps {
    isOpen: boolean;
    onClose: () => void;
    institution: Institution;
    existingStaff: User[];
    existingPayrollRecords?: PayrollRecord[];
    onImportCompleted: (importedStaffCount: number, importedPayrollCount: number) => void;
    onAddUser?: (data: any) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    onProcessPayroll?: (records: PayrollRecord[]) => Promise<void>;
    initialBatchToRedo?: HRImportBatch | null;
    initialTab?: 'import' | 'history';
}

// Map textual designation from sheet to normalized role code
const mapDesignationToRole = (desig: string): string => {
    const d = (desig || '').toUpperCase().trim();
    if (d.includes('DEPUTY HOI ACADEMIC') || d.includes('DEPUTY HOI-ACADEMIC')) return 'deputy_hoi_academics';
    if (d.includes('DEPUTY HOI BOARDING') || d.includes('DEPUTY HOI-BOARDING')) return 'deputy_hoi_boarding';
    if (d.includes('DEPUTY HOI ADMIN') || d.includes('DEPUTY HOI-ADMIN')) return 'deputy_hoi_administration';
    if (d.includes('CAO') || d.includes('CHIEF ADMINISTRATIVE OFFICER') || d.includes('CHIEF ACADEMIC OFFICER')) return 'cao';
    if (d.includes('OPERATIONS MANAGER') || d.includes('OPERATION MANAGER')) return 'operations_manager';
    if (d.includes('ACCOUNTS CLERK') || d.includes('ACCOUNT CLERK')) return 'accounts_clerk';
    if (d.includes('HOUSE KEEPING') || d.includes('HOUSEKEEPING')) return 'housekeeping_attendant';
    if (d.includes('BOARDING MISTRESS')) return 'boarding_mistress';
    if (d.includes('BOARDING MASTER')) return 'boarding_master';
    if (d.includes('HEAD COOK')) return 'head_cook';
    if (d.includes('COOK')) return 'cook';
    if (d.includes('FARM')) return 'support_staff';
    if (d.includes('LAB') || d.includes('TECHNICIAN')) return 'lab_tech';
    if (d.includes('CHAPLAIN')) return 'staff';
    if (d.includes('DRIVER')) return 'driver';
    if (d.includes('TYPIST') || d.includes('SECRETARY') || d.includes('FRONT DESK')) return 'receptionist';
    if (d.includes('ACC') || d.includes('CLERK') || d.includes('ACCOUNTS')) return 'finance_officer';
    if (d.includes('BURSAR') || d.includes('FINANCE')) return 'finance_officer';
    if (d.includes('KITCHEN') || d.includes('CHEF')) return 'support_staff';
    if (d.includes('SECURITY') || d.includes('GUARD') || d.includes('WATCHMAN')) return 'security';
    if (d.includes('CATRESS') || d.includes('CATERING') || d.includes('MESS')) return 'support_staff';
    if (d.includes('TEA') || d.includes('CLEAN') || d.includes('JANITOR') || d.includes('GROUNDS')) return 'support_staff';
    if (d.includes('TEACHER') || d.includes('TR') || d.includes('TUTOR')) return 'teacher';
    if (d.includes('LECTURER') || d.includes('PROF')) return 'lecturer';
    if (d.includes('NURSE')) return 'nurse';
    if (d.includes('DOCTOR') || d.includes('MD')) return 'doctor';
    if (d.includes('HR') || d.includes('HUMAN')) return 'hr_officer';
    return 'support_staff';
};

const getStaffSalary = (member: User): number => {
    let m = member.metadata || {};
    if (typeof m === 'string') {
        try { m = JSON.parse(m); } catch (e) { m = {}; }
    }
    return Number(m.basicSalary || m.basic_salary || (member as any).basicSalary || (member as any).basic_salary || (member as any).basic) || 0;
};

export const SmartHRPayrollImporterModal: React.FC<SmartHRPayrollImporterModalProps> = ({
    isOpen,
    onClose,
    institution,
    existingStaff,
    existingPayrollRecords = [],
    onImportCompleted,
    onAddUser,
    onEditUser,
    onDeleteUser,
    onProcessPayroll,
    initialBatchToRedo = null,
    initialTab = 'import'
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [activeModalTab, setActiveModalTab] = useState<'import' | 'history'>('import');
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedHREmployeeRow[]>([]);
    const [importPeriod, setImportPeriod] = useState(() => {
        const d = new Date();
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    });
    const [importMode, setImportMode] = useState<'both' | 'roster_only' | 'payroll_only'>('both');
    const [overwriteStrategy, setOverwriteStrategy] = useState<'overwrite' | 'rollback_previous_then_import' | 'skip_existing'>('overwrite');
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'existing'>('all');
    const [isImporting, setIsImporting] = useState(false);
    const [isRollingBack, setIsRollingBack] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, step: '' });

    // Batches state loaded from localStorage
    const [batches, setBatches] = useState<HRImportBatch[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_hr_import_batches_${institution.id}`);
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    });

    // Save Batches utility
    const persistBatches = (updatedBatches: HRImportBatch[]) => {
        try {
            localStorage.setItem(`eduai_hr_import_batches_${institution.id}`, JSON.stringify(updatedBatches));
            apiService.saveModuleRecord('institution_module_states', {
                id: `hr_import_batches_${institution.id}`,
                institutionId: institution.id,
                institution_id: institution.id,
                moduleId: 'hr_import_batches',
                moduleName: 'HR Excel Import Batches',
                state: updatedBatches,
                data: updatedBatches,
                updatedAt: new Date().toISOString()
            }).catch(() => {});
        } catch (e) {
            console.error('Failed to persist batches:', e);
        }
    };

    // Reload batches whenever modal opens or institution changes
    useEffect(() => {
        if (isOpen) {
            try {
                const raw = localStorage.getItem(`eduai_hr_import_batches_${institution.id}`);
                if (raw) setBatches(JSON.parse(raw));
            } catch (e) {}
        }
    }, [isOpen, institution.id]);

    // Handle initial tab & initial redo batch
    useEffect(() => {
        if (isOpen) {
            if (initialTab) setActiveModalTab(initialTab);
            if (initialBatchToRedo) {
                setImportPeriod(initialBatchToRedo.period);
                setOverwriteStrategy('overwrite');
                setActiveModalTab('import');
            }
        }
    }, [isOpen, initialTab, initialBatchToRedo]);

    // Check if an active batch exists for the selected importPeriod
    const existingActiveBatchForPeriod = useMemo(() => {
        return batches.find(b => 
            b.period.trim().toLowerCase() === importPeriod.trim().toLowerCase() && 
            b.status === 'applied'
        );
    }, [batches, importPeriod]);

    // Helper: Parse numeric cell value cleanly
    const parseNumber = (val: any): number => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return isNaN(val) ? 0 : val;
        const str = String(val).replace(/[^0-9.-]/g, '').trim();
        const parsed = parseFloat(str);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Helper: Clean string
    const cleanStr = (val: any): string => {
        if (val === null || val === undefined) return '';
        return String(val).trim();
    };

    // Parse Excel or CSV file
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setIsParsing(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert sheet to array of row arrays
                const rawSheetData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                if (!rawSheetData || rawSheetData.length < 2) {
                    alert('The uploaded sheet is empty or lacks header rows.');
                    setIsParsing(false);
                    return;
                }

                // Locate header row (search for "NAME" or "SALARY" or "BANK")
                let headerRowIdx = 0;
                for (let r = 0; r < Math.min(rawSheetData.length, 10); r++) {
                    const rowText = rawSheetData[r].map(c => String(c).toUpperCase()).join(' ');
                    if (rowText.includes('NAME') && (rowText.includes('SALARY') || rowText.includes('BANK') || rowText.includes('NET') || rowText.includes('DESIG'))) {
                        headerRowIdx = r;
                        break;
                    }
                }

                const headerRow = rawSheetData[headerRowIdx].map(c => String(c).toUpperCase().trim());
                
                let idxNo = -1;
                let idxName = -1;
                let idxDesig = -1;
                let idxPf = -1;
                let idxBank = -1;
                let idxSalary = -1;
                let idxHseAll = -1;
                let idxMed = -1;
                let idxHlAllow = -1;
                let idxNssfAllow = -1;
                let idxTotalGross = -1;
                let idxNssfDed = -1;
                let idxShif = -1;
                let idxWelfare = -1;
                let idxSacco = -1;
                let idxHlDed = -1;
                let idxTotalDed = -1;
                let idxNetPay = -1;

                // Pass 1: Find TOTAL / GROSS split marker if present
                for (let c = 0; c < headerRow.length; c++) {
                    const h = headerRow[c];
                    if (h === 'TOTAL' || h === 'GROSS' || h === 'TOTAL GROSS' || h === 'GROSS SALARY' || h === 'TOTAL EARNINGS') {
                        idxTotalGross = c;
                        break;
                    }
                }

                // Pass 2: Assign indexes with positional awareness
                for (let c = 0; c < headerRow.length; c++) {
                    const h = headerRow[c];
                    const beforeTotal = idxTotalGross === -1 || c < idxTotalGross;

                    if ((h === 'NO' || h === 'NO.' || h === '#' || h === 'S/N' || h === 'SN') && idxNo === -1) {
                        idxNo = c;
                    } else if ((h === 'NAME' || h === 'STAFF NAME' || h === 'EMPLOYEE NAME' || h === 'FULL NAME') && idxName === -1) {
                        idxName = c;
                    } else if ((h === 'DESIG' || h === 'DESIGNATION' || h === 'ROLE' || h === 'JOB TITLE' || h === 'POSITION') && idxDesig === -1) {
                        idxDesig = c;
                    } else if ((h === 'PF' || h === 'PF NO' || h === 'PF NO.' || h === 'PF NUMBER' || h === 'PERSONAL FILE' || h === 'PERSONAL FILE NO' || h === 'FILE NO') && idxPf === -1) {
                        idxPf = c;
                    } else if ((h === 'BANK ACC' || h === 'BANK ACCOUNT' || h === 'ACCOUNT NO' || h === 'ACC NO' || h === 'BANK NO' || h.includes('ACC')) && idxBank === -1) {
                        idxBank = c;
                    } else if ((h === 'SALARY' || h === 'BASIC SALARY' || h === 'BASIC' || h === 'BASIC PAY') && idxSalary === -1) {
                        idxSalary = c;
                    } else if ((h === 'HSE ALL' || h === 'HOUSE' || h === 'HOUSE ALLOWANCE' || h === 'HSE') && idxHseAll === -1) {
                        idxHseAll = c;
                    } else if ((h === 'MED' || h === 'MEDICAL' || h === 'MED ALL' || h === 'MEDICAL ALLOWANCE') && idxMed === -1) {
                        idxMed = c;
                    } else if (h === 'HL' || h === 'HARDSHIP' || h === 'HOUSING LEVY' || h.includes('HARDSHIP')) {
                        if (beforeTotal && idxHlAllow === -1) {
                            idxHlAllow = c;
                        } else if (!beforeTotal && idxHlDed === -1) {
                            idxHlDed = c;
                        } else if (idxHlDed === -1) {
                            idxHlDed = c;
                        }
                    } else if (h === 'NSSF' || h === 'N.S.S.F' || h.includes('NSSF')) {
                        if (beforeTotal && idxNssfAllow === -1) {
                            idxNssfAllow = c;
                        } else if (!beforeTotal && idxNssfDed === -1) {
                            idxNssfDed = c;
                        } else if (idxNssfDed === -1) {
                            idxNssfDed = c;
                        }
                    } else if (h === 'SHIF' || h === 'NHIF' || h === 'S.H.I.F' || h.includes('SHIF') || h.includes('NHIF')) {
                        idxShif = c;
                    } else if (h === 'WELFARE' || h === 'STAFF WELFARE' || h === 'BENEVOLENT' || h.includes('WELFARE')) {
                        idxWelfare = c;
                    } else if (h === 'SACCO.R' || h === 'SACCO' || h === 'SACCO LOAN' || h.includes('SACCO')) {
                        idxSacco = c;
                    } else if (h === 'TOTAL DED' || h === 'TOTAL DEDUCTIONS' || h === 'DEDUCTIONS' || h.includes('TOTAL DED')) {
                        idxTotalDed = c;
                    } else if (h === 'NET PAY' || h === 'NET SALARY' || h === 'NET' || h.includes('NET')) {
                        idxNetPay = c;
                    }
                }

                // Fallback column positions
                if (idxName === -1 && headerRow.length > 1) idxName = 1;
                if (idxDesig === -1 && headerRow.length > 2) idxDesig = 2;
                if (idxBank === -1 && headerRow.length > 3) idxBank = 3;
                if (idxSalary === -1 && headerRow.length > 4) idxSalary = 4;

                const results: ParsedHREmployeeRow[] = [];

                for (let r = headerRowIdx + 1; r < rawSheetData.length; r++) {
                    const row = rawSheetData[r];
                    if (!row || row.length === 0) continue;

                    const name = cleanStr(idxName !== -1 ? row[idxName] : '');
                    if (!name || name.toUpperCase() === 'TOTAL' || name.toUpperCase() === 'TOTALS' || name.toUpperCase().includes('PAGE')) {
                        continue;
                    }

                    const no = idxNo !== -1 ? row[idxNo] : (r - headerRowIdx);
                    const designation = cleanStr(idxDesig !== -1 ? row[idxDesig] : 'Staff');
                    const pf = cleanStr(idxPf !== -1 ? row[idxPf] : '');
                    const bankAccount = cleanStr(idxBank !== -1 ? row[idxBank] : '');
                    const basicSalary = parseNumber(idxSalary !== -1 ? row[idxSalary] : 0);

                    // Allowances
                    const houseAllowance = parseNumber(idxHseAll !== -1 ? row[idxHseAll] : 0);
                    const medicalAllowance = parseNumber(idxMed !== -1 ? row[idxMed] : 0);
                    const housingLevyAllowance = parseNumber(idxHlAllow !== -1 ? row[idxHlAllow] : 0);
                    const nssfAllowance = parseNumber(idxNssfAllow !== -1 ? row[idxNssfAllow] : 0);
                    const otherAllowances = houseAllowance + medicalAllowance + housingLevyAllowance + nssfAllowance;

                    let totalGross = parseNumber(idxTotalGross !== -1 ? row[idxTotalGross] : 0);
                    if (totalGross === 0) {
                        totalGross = basicSalary + otherAllowances;
                    }

                    // Deductions
                    const nssfDeduction = parseNumber(idxNssfDed !== -1 ? row[idxNssfDed] : 0);
                    const shifDeduction = parseNumber(idxShif !== -1 ? row[idxShif] : 0);
                    const welfareDeduction = parseNumber(idxWelfare !== -1 ? row[idxWelfare] : 0);
                    const saccoDeduction = parseNumber(idxSacco !== -1 ? row[idxSacco] : 0);
                    const housingLevyDeduction = parseNumber(idxHlDed !== -1 ? row[idxHlDed] : 0);
                    
                    let totalDeductions = parseNumber(idxTotalDed !== -1 ? row[idxTotalDed] : 0);
                    if (totalDeductions === 0) {
                        totalDeductions = nssfDeduction + shifDeduction + welfareDeduction + saccoDeduction + housingLevyDeduction;
                    }

                    let netPay = parseNumber(idxNetPay !== -1 ? row[idxNetPay] : 0);
                    if (netPay === 0) {
                        netPay = totalGross - totalDeductions;
                    }

                    // Match with existing staff by PF, name, or bank account
                    const nameNorm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const matched = existingStaff.find(s => {
                        let m = s.metadata || {};
                        if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { m = {}; } }

                        const sPf = String(s.pf || (s as any).pfNumber || (s as any).pfNo || m.pf || m.pfNumber || m.pfNo || '').trim().toUpperCase();
                        if (pf && sPf && sPf === pf.toUpperCase()) return true;

                        const sNameNorm = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (sNameNorm === nameNorm) return true;
                        
                        const sBank = String(m.bankAccountNumber || (s as any).bankAccountNumber || '');
                        if (bankAccount && sBank && sBank === bankAccount) return true;
                        return false;
                    });

                    const currentSalary = matched ? getStaffSalary(matched) : 0;

                    const errors: string[] = [];
                    if (!name) errors.push('Name is missing');
                    if (basicSalary <= 0 && totalGross <= 0) errors.push('Salary is missing or zero');

                    results.push({
                        rawIndex: r,
                        no,
                        name,
                        designation,
                        role: mapDesignationToRole(designation),
                        pf,
                        bankAccount,
                        basicSalary: basicSalary > 0 ? basicSalary : totalGross,
                        currentSalary,
                        houseAllowance,
                        medicalAllowance,
                        housingLevyAllowance,
                        nssfAllowance,
                        otherAllowances,
                        totalGross,
                        nssfDeduction,
                        shifDeduction,
                        welfareDeduction,
                        saccoDeduction,
                        housingLevyDeduction,
                        otherDeductions: 0,
                        totalDeductions,
                        netPay,
                        matchedStaffId: matched?.id,
                        isExisting: Boolean(matched),
                        isValid: errors.length === 0,
                        errors
                    });
                }

                setParsedRows(results);
                setIsParsing(false);
            } catch (err: any) {
                console.error(err);
                alert('Failed to parse Excel file: ' + (err?.message || err));
                setIsParsing(false);
            }
        };

        reader.readAsArrayBuffer(uploadedFile);
    };

    // Download Sample Template
    const handleDownloadTemplate = () => {
        const sampleData = [
            {
                'NO': 1,
                'NAME': 'ELIZABETH KIPTOO',
                'DESIG': 'FARM MANAGER',
                'BANK ACC': '1410182470743',
                'SALARY': 31693,
                'HSE ALL': 0,
                'MED': 0,
                'TOTAL': 31693,
                'NSSF': 1080,
                'SHIF': 872,
                'WELFARE': 500,
                'SACCO.R': 4000,
                'HL': 475,
                'TOTAL DED': 6927,
                'NET PAY': 24766
            },
            {
                'NO': 2,
                'NAME': 'JOHN MAINA',
                'DESIG': 'TEACHER',
                'BANK ACC': '0112938475610',
                'SALARY': 45000,
                'HSE ALL': 6000,
                'MED': 3000,
                'TOTAL': 54000,
                'NSSF': 1080,
                'SHIF': 1485,
                'WELFARE': 1000,
                'SACCO.R': 5000,
                'HL': 810,
                'TOTAL DED': 9375,
                'NET PAY': 44625
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Staff Payroll');
        XLSX.writeFile(wb, `HR_Payroll_Import_Template_${institution.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Standard'}.xlsx`);
    };

    // Rollback batch silently (helper for re-import overwrite)
    const handleRollbackBatchSilently = async (batchId: string) => {
        const batch = batches.find(b => b.id === batchId);
        if (!batch) return;

        try {
            // Revert created staff
            if (batch.createdStaffIds && batch.createdStaffIds.length > 0) {
                for (const staffId of batch.createdStaffIds) {
                    try {
                        if (onDeleteUser) await onDeleteUser(staffId);
                        else await apiService.deleteModuleRecord('users', staffId);
                    } catch (_) {}
                }
            }
            // Restore updated staff
            if (batch.staffSnapshots && batch.staffSnapshots.length > 0) {
                for (const snap of batch.staffSnapshots) {
                    if (snap.isNewlyCreated) continue;
                    try {
                        if (onEditUser) {
                            await onEditUser(snap.staffId, { metadata: snap.previousMetadata, basicSalary: snap.previousSalary });
                        } else {
                            await apiService.updateModuleRecord('users', snap.staffId, { metadata: snap.previousMetadata, basicSalary: snap.previousSalary });
                        }
                    } catch (_) {}
                }
            }
            // Delete payroll records
            if (batch.payrollRecordIds && batch.payrollRecordIds.length > 0) {
                try {
                    await apiService.deleteModuleRecord('payroll_records', batch.payrollRecordIds);
                } catch (_) {}
            }

            const updatedBatches = batches.map(b => b.id === batchId ? {
                ...b,
                status: 'rolled_back' as const,
                rolledBackAt: new Date().toISOString()
            } : b);
            setBatches(updatedBatches);
            persistBatches(updatedBatches);
        } catch (e) {
            console.warn('[Silent Rollback] Error:', e);
        }
    };

    // Rollback batch with user confirmation
    const handleRollbackBatch = async (batchId: string) => {
        const batch = batches.find(b => b.id === batchId);
        if (!batch) return;

        const confirmText = `Are you sure you want to rollback import batch "${batch.fileName}" for ${batch.period}?\n\n` +
            `• Delete ${batch.createdStaffIds?.length || 0} newly created staff accounts\n` +
            `• Restore ${(batch.staffSnapshots || []).filter(s => !s.isNewlyCreated).length} existing staff profiles to their previous salary/allowance state\n` +
            `• Delete ${batch.payrollRecordIds?.length || 0} generated payroll records for this period\n\n` +
            `Do you wish to proceed?`;

        if (!confirm(confirmText)) return;

        setIsRollingBack(true);
        try {
            // 1. Delete newly created staff
            if (batch.createdStaffIds && batch.createdStaffIds.length > 0) {
                for (const staffId of batch.createdStaffIds) {
                    try {
                        if (onDeleteUser) await onDeleteUser(staffId);
                        else await apiService.deleteModuleRecord('users', staffId);
                    } catch (err) {
                        console.warn(`[Rollback] Failed to delete user ${staffId}:`, err);
                    }
                }
            }

            // 2. Restore modified staff
            if (batch.staffSnapshots && batch.staffSnapshots.length > 0) {
                for (const snap of batch.staffSnapshots) {
                    if (snap.isNewlyCreated) continue;
                    try {
                        if (onEditUser) {
                            await onEditUser(snap.staffId, { metadata: snap.previousMetadata, basicSalary: snap.previousSalary });
                        } else {
                            await apiService.updateModuleRecord('users', snap.staffId, { metadata: snap.previousMetadata, basicSalary: snap.previousSalary });
                        }
                    } catch (err) {
                        console.warn(`[Rollback] Failed to restore staff ${snap.staffId}:`, err);
                    }
                }
            }

            // 3. Delete payroll records
            if (batch.payrollRecordIds && batch.payrollRecordIds.length > 0) {
                try {
                    await apiService.deleteModuleRecord('payroll_records', batch.payrollRecordIds);
                } catch (err) {
                    console.warn(`[Rollback] Failed to delete payroll records:`, err);
                }
            }

            // 4. Update batch record
            const updatedBatches = batches.map(b => b.id === batchId ? {
                ...b,
                status: 'rolled_back' as const,
                rolledBackAt: new Date().toISOString()
            } : b);

            setBatches(updatedBatches);
            persistBatches(updatedBatches);

            alert(`✓ Batch "${batch.fileName}" (${batch.period}) was rolled back successfully.`);
            onImportCompleted(batch.createdStaffIds?.length || 0, batch.payrollRecordIds?.length || 0);
        } catch (err: any) {
            console.error(err);
            alert('Rollback failed: ' + (err?.message || err));
        } finally {
            setIsRollingBack(false);
        }
    };

    // Filter preview rows
    const filteredRows = useMemo(() => {
        return parsedRows.filter(r => {
            const matchesSearch = !searchFilter.trim() || 
                r.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                r.designation.toLowerCase().includes(searchFilter.toLowerCase()) ||
                r.bankAccount.includes(searchFilter);
            
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'new' && !r.isExisting) ||
                (statusFilter === 'existing' && r.isExisting);

            return matchesSearch && matchesStatus;
        });
    }, [parsedRows, searchFilter, statusFilter]);

    // Financial Totals
    const totals = useMemo(() => {
        let totalSalary = 0;
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;
        let newCount = 0;
        let existingCount = 0;

        parsedRows.forEach(r => {
            totalSalary += r.basicSalary;
            totalGross += r.totalGross;
            totalDeductions += r.totalDeductions;
            totalNet += r.netPay;
            if (r.isExisting) existingCount++;
            else newCount++;
        });

        return { totalSalary, totalGross, totalDeductions, totalNet, newCount, existingCount, totalCount: parsedRows.length };
    }, [parsedRows]);

    // Execute Import & Redo Process
    const handleCommitImport = async () => {
        if (parsedRows.length === 0) return;

        // If strategy is rollback_previous_then_import and an active batch for this period exists, roll it back first!
        if (overwriteStrategy === 'rollback_previous_then_import' && existingActiveBatchForPeriod) {
            setImportProgress({
                current: 0,
                total: parsedRows.length,
                step: `Rolling back previous batch (${existingActiveBatchForPeriod.fileName})...`
            });
            await handleRollbackBatchSilently(existingActiveBatchForPeriod.id);
        }

        setIsImporting(true);
        setImportProgress({ current: 0, total: parsedRows.length, step: 'Starting HR & Payroll Import...' });

        try {
            let importedStaffCount = 0;
            let payrollRecordsToProcess: PayrollRecord[] = [];
            const createdStaffIds: string[] = [];
            const staffSnapshots: StaffSnapshot[] = [];
            const payrollRecordIds: string[] = [];

            // Process each row
            for (let i = 0; i < parsedRows.length; i++) {
                const row = parsedRows[i];
                setImportProgress({
                    current: i + 1,
                    total: parsedRows.length,
                    step: `Processing [${row.name}] (${i + 1}/${parsedRows.length})...`
                });

                let staffId = row.matchedStaffId;

                // 1. Sync or Onboard Staff Member
                if (importMode === 'both' || importMode === 'roster_only') {
                    const cleanNameSlug = row.name.toLowerCase().replace(/[^a-z0-9]/g, '.');
                    const email = `${cleanNameSlug}@${(institution.name || 'school').toLowerCase().replace(/[^a-z0-9]/g, '')}.edu`;

                    const staffMetadata = {
                        basicSalary: row.basicSalary,
                        bankAccountNumber: row.bankAccount,
                        bankName: 'Equity Bank',
                        bankBranch: 'Main',
                        designation: row.designation,
                        employmentTerms: 'Permanent & Pensionable',
                        pf: row.pf || '',
                        pfNumber: row.pf || '',
                        onboardedVia: 'Excel Payroll Importer',
                        assignedAllowances: [
                            ...(row.houseAllowance > 0 ? [{ name: 'House Allowance', amount: row.houseAllowance, type: 'fixed' }] : []),
                            ...(row.medicalAllowance > 0 ? [{ name: 'Medical Allowance', amount: row.medicalAllowance, type: 'fixed' }] : []),
                            ...(row.housingLevyAllowance > 0 ? [{ name: 'Housing Levy Allowance (HL)', amount: row.housingLevyAllowance, type: 'fixed' }] : [])
                        ],
                        assignedDeductions: [
                            ...(row.welfareDeduction > 0 ? [{ name: 'Staff Welfare', amount: row.welfareDeduction, type: 'fixed' }] : []),
                            ...(row.saccoDeduction > 0 ? [{ name: 'SACCO Shares / Loan', amount: row.saccoDeduction, type: 'fixed' }] : [])
                        ]
                    };

                    if (!row.isExisting || !staffId) {
                        // Create New Staff
                        const newId = `usr_hr_${Date.now()}_${i}`;
                        const newStaffPayload: Partial<User> = {
                            id: newId,
                            name: row.name,
                            email,
                            phoneNumber: row.bankAccount || '',
                            role: row.role as any,
                            pf: row.pf || undefined,
                            pfNumber: row.pf || undefined,
                            institutionId: institution.id,
                            metadata: staffMetadata
                        };

                        if (onAddUser) {
                            await onAddUser(newStaffPayload);
                        } else {
                            await apiService.saveModuleRecord('users', newStaffPayload);
                        }
                        staffId = newId;
                        createdStaffIds.push(newId);
                        staffSnapshots.push({
                            staffId: newId,
                            staffName: row.name,
                            isNewlyCreated: true
                        });
                        importedStaffCount++;
                    } else {
                        // Existing Staff
                        const existingObj = existingStaff.find(s => s.id === staffId);
                        let prevMeta = existingObj?.metadata || {};
                        if (typeof prevMeta === 'string') {
                            try { prevMeta = JSON.parse(prevMeta); } catch (e) { prevMeta = {}; }
                        }

                        // Capture snapshot before modifying
                        staffSnapshots.push({
                            staffId,
                            staffName: existingObj?.name || row.name,
                            isNewlyCreated: false,
                            previousSalary: Number(prevMeta.basicSalary || (existingObj as any)?.basicSalary || 0),
                            previousMetadata: prevMeta
                        });

                        if (overwriteStrategy !== 'skip_existing') {
                            const updatedMeta = { ...prevMeta, ...staffMetadata };
                            if (onEditUser) {
                                await onEditUser(staffId, { 
                                    metadata: updatedMeta, 
                                    basicSalary: row.basicSalary,
                                    ...(row.pf ? { pf: row.pf, pfNumber: row.pf } : {})
                                });
                            }
                            importedStaffCount++;
                        }
                    }
                }

                // 2. Generate Monthly Payroll Record
                if ((importMode === 'both' || importMode === 'payroll_only') && staffId) {
                    const recordId = `pay_${staffId}_${importPeriod.replace(/\s+/g, '_')}`;

                    if (overwriteStrategy === 'skip_existing') {
                        const alreadyExists = (existingPayrollRecords || []).some(
                            p => p.id === recordId || (p.staffId === staffId && p.month === importPeriod)
                        );
                        if (alreadyExists) continue;
                    }

                    const allowancesList = [
                        ...(row.houseAllowance > 0 ? [{ name: 'House Allowance', amount: row.houseAllowance }] : []),
                        ...(row.medicalAllowance > 0 ? [{ name: 'Medical Allowance', amount: row.medicalAllowance }] : []),
                        ...(row.housingLevyAllowance > 0 ? [{ name: 'Housing Levy Allowance (HL)', amount: row.housingLevyAllowance }] : []),
                        ...(row.nssfAllowance > 0 ? [{ name: 'NSSF Gross Allowance', amount: row.nssfAllowance }] : [])
                    ];

                    const deductionsList = [
                        ...(row.nssfDeduction > 0 ? [{ name: 'NSSF', amount: row.nssfDeduction }] : []),
                        ...(row.shifDeduction > 0 ? [{ name: 'SHIF', amount: row.shifDeduction }] : []),
                        ...(row.welfareDeduction > 0 ? [{ name: 'Staff Welfare', amount: row.welfareDeduction }] : []),
                        ...(row.saccoDeduction > 0 ? [{ name: 'SACCO.R', amount: row.saccoDeduction }] : []),
                        ...(row.housingLevyDeduction > 0 ? [{ name: 'Housing Levy (AHL)', amount: row.housingLevyDeduction }] : [])
                    ];

                    const record: PayrollRecord = {
                        id: recordId,
                        institutionId: institution.id,
                        staffId,
                        staffName: row.name,
                        month: importPeriod,
                        basicSalary: row.basicSalary,
                        allowances: allowancesList,
                        deductions: deductionsList,
                        netSalary: row.netPay,
                        status: 'paid',
                        recordedBy: 'Excel Smart Importer',
                        paymentDate: new Date().toISOString()
                    };

                    payrollRecordsToProcess.push(record);
                    payrollRecordIds.push(recordId);
                }
            }

            // Save Payroll Records
            if (payrollRecordsToProcess.length > 0) {
                setImportProgress({
                    current: parsedRows.length,
                    total: parsedRows.length,
                    step: `Committing ${payrollRecordsToProcess.length} payroll records...`
                });

                await apiService.saveModuleRecords('payroll_records', payrollRecordsToProcess).catch(() => {});

                if (onProcessPayroll) {
                    await onProcessPayroll(payrollRecordsToProcess);
                } else {
                    await apiService.saveModuleRecord('payroll_records', payrollRecordsToProcess);
                }
            }

            // Record Batch Audit Trail
            const newBatch: HRImportBatch = {
                id: `batch_hr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                institutionId: institution.id,
                fileName: file?.name || 'excel_import.xlsx',
                fileSize: file?.size,
                importedAt: new Date().toISOString(),
                period: importPeriod,
                importMode,
                overwriteStrategy,
                totalRows: parsedRows.length,
                newStaffCount: createdStaffIds.length,
                updatedStaffCount: staffSnapshots.filter(s => !s.isNewlyCreated).length,
                createdStaffIds,
                staffSnapshots,
                payrollRecordIds,
                totalSalary: totals.totalSalary,
                totalGross: totals.totalGross,
                totalDeductions: totals.totalDeductions,
                totalNet: totals.totalNet,
                status: 'applied',
                notes: overwriteStrategy === 'overwrite' ? `Redo/Overwrite import for ${importPeriod}` : `Import for ${importPeriod}`
            };

            const updatedBatches = [newBatch, ...batches];
            setBatches(updatedBatches);
            persistBatches(updatedBatches);

            onImportCompleted(importedStaffCount, payrollRecordsToProcess.length);
            onClose();
        } catch (err: any) {
            console.error(err);
            alert('Import encountered an error: ' + (err?.message || err));
        } finally {
            setIsImporting(false);
        }
    };

    if (!isOpen) return null;

    const activeBatchesCount = batches.filter(b => b.status === 'applied').length;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Header with Navigation Tabs */}
                <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50/60 via-white to-purple-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                                <SparklesIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                        Smart HR & Payroll Excel Importer
                                    </h3>
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
                                        Kenya Standard & Redo Engine
                                    </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Import, redo updates, and rollback staff registers, allowances (House, Med, HL) & statutory deductions
                                </p>
                            </div>
                        </div>
                        
                        {/* Right Action Buttons */}
                        <div className="flex items-center gap-3 self-end md:self-auto">
                            <button
                                type="button"
                                onClick={handleDownloadTemplate}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>Template</span>
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* View Switching Navigation Pills */}
                    <div className="flex items-center gap-2 mt-5 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                        <button
                            type="button"
                            onClick={() => setActiveModalTab('import')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                activeModalTab === 'import'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            <span>Upload & Redo Import</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveModalTab('history')}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                                activeModalTab === 'history'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <ClockIcon className="w-4 h-4" />
                            <span>Import History & Rollback</span>
                            {activeBatchesCount > 0 && (
                                <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                                    activeModalTab === 'history' ? 'bg-white text-indigo-700' : 'bg-indigo-600 text-white'
                                }`}>
                                    {activeBatchesCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Main Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">

                    {activeModalTab === 'import' ? (
                        <>
                            {/* Alert if Re-doing / Existing batch detected */}
                            {existingActiveBatchForPeriod && (
                                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                                    <div className="flex items-center gap-3">
                                        <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                                Existing Import Batch Detected for {importPeriod}
                                            </p>
                                            <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-0.5">
                                                File: <span className="font-bold">{existingActiveBatchForPeriod.fileName}</span> with {existingActiveBatchForPeriod.totalRows} personnel was imported on {new Date(existingActiveBatchForPeriod.importedAt).toLocaleDateString()}. Re-importing will allow you to redo and overwrite this period.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleRollbackBatch(existingActiveBatchForPeriod.id)}
                                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-sm"
                                    >
                                        Rollback Batch First
                                    </button>
                                </div>
                            )}

                            {/* Step 1: Upload & Period Configuration */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                {/* Drag & Drop Zone */}
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="md:col-span-2 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-500 rounded-3xl p-6 bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/40 transition-all flex flex-col items-center justify-center text-center cursor-pointer group min-h-[140px]"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                        <ArrowUpTrayIcon className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                                        {file ? file.name : 'Click to Upload or Drag & Drop Excel / CSV Sheet'}
                                    </p>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">
                                        {file ? `${(file.size / 1024).toFixed(1)} KB — Click to change file` : 'Supports columns: NO, NAME, DESIG, BANK ACC, SALARY, HSE ALL, MED, NSSF, SHIF, WELFARE, SACCO, HL, NET PAY'}
                                    </p>
                                </div>

                                {/* Import Settings Card */}
                                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-5 border border-slate-200 dark:border-slate-700/60 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                            Target Payroll Period
                                        </label>
                                        <input
                                            type="text"
                                            value={importPeriod}
                                            onChange={e => setImportPeriod(e.target.value)}
                                            placeholder="e.g. August 2026"
                                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                            Import Scope
                                        </label>
                                        <select
                                            value={importMode}
                                            onChange={e => setImportMode(e.target.value as any)}
                                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="both">Onboard Staff + Record Payroll</option>
                                            <option value="roster_only">Staff Roster & Bank Details Only</option>
                                            <option value="payroll_only">Payroll Month Entries Only</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                            Redo & Overwrite Strategy
                                        </label>
                                        <select
                                            value={overwriteStrategy}
                                            onChange={e => setOverwriteStrategy(e.target.value as any)}
                                            className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="overwrite">Overwrite & Redo (Update Salary/Entries)</option>
                                            <option value="rollback_previous_then_import">Rollback Previous Batch & Fresh Redo</option>
                                            <option value="skip_existing">Skip Existing (New Staff Only)</option>
                                        </select>
                                    </div>
                                </div>

                            </div>

                            {/* Step 2: Data Summary Cards */}
                            {parsedRows.length > 0 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                        
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Staff</span>
                                            <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">{totals.totalCount}</span>
                                            <span className="text-[10px] font-bold text-indigo-600 mt-0.5 block">{totals.newCount} New / {totals.existingCount} Existing</span>
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Basic</span>
                                            <span className="text-lg font-black text-slate-900 dark:text-white mt-1 block">KES {totals.totalSalary.toLocaleString()}</span>
                                        </div>

                                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-900/60">
                                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Total Gross</span>
                                            <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-1 block">KES {totals.totalGross.toLocaleString()}</span>
                                        </div>

                                        <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/60">
                                            <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest block">Total Deductions</span>
                                            <span className="text-lg font-black text-rose-700 dark:text-rose-300 mt-1 block">KES {totals.totalDeductions.toLocaleString()}</span>
                                        </div>

                                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 col-span-2">
                                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">Net Disbursement</span>
                                            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5 block">KES {totals.totalNet.toLocaleString()}</span>
                                        </div>

                                    </div>

                                    {/* Table Filters */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                        <div className="relative flex-1 max-w-xs">
                                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Filter by name, designation, account..."
                                                value={searchFilter}
                                                onChange={e => setSearchFilter(e.target.value)}
                                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('all')}
                                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                All ({parsedRows.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('new')}
                                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === 'new' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                New Staff ({totals.newCount})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setStatusFilter('existing')}
                                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${statusFilter === 'existing' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
                                            >
                                                Existing Staff ({totals.existingCount})
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview Table */}
                                    <div className="border border-slate-200 dark:border-slate-700/80 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                                        <div className="overflow-x-auto max-h-[38vh]">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-wider text-[9px] border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="py-3 px-3 text-center">#</th>
                                                        <th className="py-3 px-3">Employee Name</th>
                                                        <th className="py-3 px-3">PF No</th>
                                                        <th className="py-3 px-3">Designation</th>
                                                        <th className="py-3 px-3">Bank Account</th>
                                                        <th className="py-3 px-3 text-right">Basic Salary</th>
                                                        <th className="py-3 px-3 text-right">House All.</th>
                                                        <th className="py-3 px-3 text-right">Med All.</th>
                                                        <th className="py-3 px-3 text-right">HL (Gross)</th>
                                                        <th className="py-3 px-3 text-right bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">Total Gross</th>
                                                        <th className="py-3 px-3 text-right">NSSF</th>
                                                        <th className="py-3 px-3 text-right">SHIF</th>
                                                        <th className="py-3 px-3 text-right">Welfare</th>
                                                        <th className="py-3 px-3 text-right">SACCO</th>
                                                        <th className="py-3 px-3 text-right">Housing Levy</th>
                                                        <th className="py-3 px-3 text-right bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300">Total Ded.</th>
                                                        <th className="py-3 px-3 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">Net Pay</th>
                                                        <th className="py-3 px-3 text-center">Redo / Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                                                    {filteredRows.map((r, idx) => {
                                                        const isSalaryChanged = r.isExisting && r.currentSalary !== undefined && r.currentSalary > 0 && r.currentSalary !== r.basicSalary;

                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                                <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-400">{r.no || idx + 1}</td>
                                                                <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white uppercase truncate max-w-[180px]">{r.name}</td>
                                                                <td className="py-2.5 px-3 font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400">{r.pf || '-'}</td>
                                                                <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-500">{r.designation}</td>
                                                                <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 dark:text-slate-400">{r.bankAccount || '-'}</td>
                                                                <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">
                                                                    <div>{r.basicSalary.toLocaleString()}</div>
                                                                    {isSalaryChanged && (
                                                                        <div className="text-[9px] text-amber-600 dark:text-amber-400 font-normal">
                                                                            was {r.currentSalary?.toLocaleString()}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{r.houseAllowance > 0 ? r.houseAllowance.toLocaleString() : '-'}</td>
                                                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{r.medicalAllowance > 0 ? r.medicalAllowance.toLocaleString() : '-'}</td>
                                                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{r.housingLevyAllowance > 0 ? r.housingLevyAllowance.toLocaleString() : '-'}</td>
                                                                <td className="py-2.5 px-3 text-right font-black bg-indigo-50/30 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-300">{r.totalGross.toLocaleString()}</td>
                                                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{r.nssfDeduction > 0 ? r.nssfDeduction.toLocaleString() : '-'}</td>
                                                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{r.shifDeduction > 0 ? r.shifDeduction.toLocaleString() : '-'}</td>
                                                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{r.welfareDeduction > 0 ? r.welfareDeduction.toLocaleString() : '-'}</td>
                                                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{r.saccoDeduction > 0 ? r.saccoDeduction.toLocaleString() : '-'}</td>
                                                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">{r.housingLevyDeduction > 0 ? r.housingLevyDeduction.toLocaleString() : '-'}</td>
                                                                <td className="py-2.5 px-3 text-right font-bold bg-rose-50/30 dark:bg-rose-950/10 text-rose-700 dark:text-rose-300">{r.totalDeductions.toLocaleString()}</td>
                                                                <td className="py-2.5 px-3 text-right font-black bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">{r.netPay.toLocaleString()}</td>
                                                                <td className="py-2.5 px-3 text-center">
                                                                    {r.isExisting ? (
                                                                        isSalaryChanged ? (
                                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                                                                                Redo/Update
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                                                                                Sync
                                                                            </span>
                                                                        )
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                                            New Staff
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* History & Rollback Tab Content */
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Batches Recorded</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">{batches.length}</span>
                                </div>
                                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/60">
                                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">Active / Applied Batches</span>
                                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">{activeBatchesCount}</span>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Rolled Back Batches</span>
                                    <span className="text-2xl font-black text-slate-500 mt-1 block">{batches.filter(b => b.status === 'rolled_back').length}</span>
                                </div>
                            </div>

                            {batches.length === 0 ? (
                                <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8">
                                    <ClockIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">No Import Batches Recorded Yet</h4>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                                        Imported Excel sheets will automatically record an audit batch here, allowing you to rollback or redo any import in 1 click.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {batches.map((batch) => {
                                        const isApplied = batch.status === 'applied';

                                        return (
                                            <div
                                                key={batch.id}
                                                className={`p-5 rounded-3xl border transition-all ${
                                                    isApplied
                                                        ? 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
                                                        : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 opacity-80'
                                                }`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-start gap-3.5">
                                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                                            isApplied 
                                                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400' 
                                                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                                                        }`}>
                                                            <DocumentTextIcon className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                                    {batch.fileName}
                                                                </h4>
                                                                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                                                                    {batch.period}
                                                                </span>
                                                                {isApplied ? (
                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                                        <CheckCircleIcon className="w-3 h-3" />
                                                                        <span>Active / Applied</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                                                                        <XCircleIcon className="w-3 h-3" />
                                                                        <span>Rolled Back</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[11px] text-slate-400 mt-1">
                                                                Imported on {new Date(batch.importedAt).toLocaleDateString()} at {new Date(batch.importedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                {batch.rolledBackAt && ` • Undone on ${new Date(batch.rolledBackAt).toLocaleDateString()}`}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Batch Actions */}
                                                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                        {isApplied ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setImportPeriod(batch.period);
                                                                        setOverwriteStrategy('overwrite');
                                                                        setActiveModalTab('import');
                                                                    }}
                                                                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                                                                >
                                                                    <ArrowPathIcon className="w-3.5 h-3.5" />
                                                                    <span>Redo This Import</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isRollingBack}
                                                                    onClick={() => handleRollbackBatch(batch.id)}
                                                                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border border-rose-200 dark:border-rose-900/60 cursor-pointer disabled:opacity-50"
                                                                >
                                                                    <TrashIcon className="w-3.5 h-3.5" />
                                                                    <span>Rollback (Undo)</span>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setImportPeriod(batch.period);
                                                                    setOverwriteStrategy('overwrite');
                                                                    setActiveModalTab('import');
                                                                }}
                                                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                                                            >
                                                                <ArrowPathIcon className="w-3.5 h-3.5" />
                                                                <span>Re-import Fresh</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Batch Summary Row */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Total Rows</span>
                                                        <span className="font-black text-slate-800 dark:text-slate-200">{batch.totalRows}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">New Onboarded</span>
                                                        <span className="font-black text-emerald-600">{batch.newStaffCount}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Existing Synced</span>
                                                        <span className="font-black text-indigo-600">{batch.updatedStaffCount}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Net Disbursement</span>
                                                        <span className="font-black text-slate-900 dark:text-white">KES {batch.totalNet?.toLocaleString() || 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer Actions (Only for Import Tab) */}
                {activeModalTab === 'import' && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-4">
                        <div className="text-xs font-semibold text-slate-500">
                            {isImporting ? (
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                                    {importProgress.step}
                                </span>
                            ) : parsedRows.length > 0 ? (
                                <span>
                                    Ready to {existingActiveBatchForPeriod ? 'Redo & Overwrite' : 'Import'}{' '}
                                    <strong className="text-slate-900 dark:text-white">{parsedRows.length} staff records</strong> into{' '}
                                    <strong className="text-indigo-600">{importPeriod}</strong>
                                </span>
                            ) : (
                                <span>Please select an Excel sheet (.xlsx, .xls, .csv) to begin.</span>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isImporting}
                                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            
                            <button
                                type="button"
                                onClick={handleCommitImport}
                                disabled={parsedRows.length === 0 || isImporting}
                                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                            >
                                {isImporting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Importing ({importProgress.current}/{importProgress.total})...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleIcon className="w-4 h-4" />
                                        <span>
                                            {existingActiveBatchForPeriod ? 'Commit & Redo / Overwrite' : 'Commit & Import'} ({parsedRows.length} Staff)
                                        </span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
