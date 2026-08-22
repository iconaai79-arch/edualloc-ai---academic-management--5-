import React, { useState, useRef, useMemo } from 'react';
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
import type { User, PayrollRecord, Institution } from '../../types';
import { apiService } from '../../services/apiService';

export interface ParsedHREmployeeRow {
    rawIndex?: number;
    no?: string | number;
    name: string;
    designation: string;
    role: string;
    bankAccount: string;
    basicSalary: number;
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

interface SmartHRPayrollImporterModalProps {
    isOpen: boolean;
    onClose: () => void;
    institution: Institution;
    existingStaff: User[];
    onImportCompleted: (importedStaffCount: number, importedPayrollCount: number) => void;
    onAddUser?: (data: any) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onProcessPayroll?: (records: PayrollRecord[]) => Promise<void>;
}

// Map textual designation from sheet to normalized role code
const mapDesignationToRole = (desig: string): string => {
    const d = (desig || '').toUpperCase().trim();
    if (d.includes('FARM')) return 'support_staff';
    if (d.includes('LAB') || d.includes('TECHNICIAN')) return 'lab_tech';
    if (d.includes('CHAPLAIN')) return 'staff';
    if (d.includes('DRIVER')) return 'driver';
    if (d.includes('TYPIST') || d.includes('SECRETARY') || d.includes('FRONT DESK')) return 'receptionist';
    if (d.includes('ACC') || d.includes('CLERK') || d.includes('ACCOUNTS')) return 'finance_officer';
    if (d.includes('BURSAR') || d.includes('FINANCE')) return 'finance_officer';
    if (d.includes('COOK') || d.includes('KITCHEN') || d.includes('CHEF')) return 'support_staff';
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

export const SmartHRPayrollImporterModal: React.FC<SmartHRPayrollImporterModalProps> = ({
    isOpen,
    onClose,
    institution,
    existingStaff,
    onImportCompleted,
    onAddUser,
    onEditUser,
    onProcessPayroll
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parsedRows, setParsedRows] = useState<ParsedHREmployeeRow[]>([]);
    const [importPeriod, setImportPeriod] = useState(() => {
        const d = new Date();
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    });
    const [importMode, setImportMode] = useState<'both' | 'roster_only' | 'payroll_only'>('both');
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'existing'>('all');
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, step: '' });

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
                
                // Identify column indexes with positional awareness
                // Notice the user's sheet layout:
                // NO | NAME | DESIG | BANK ACC | SALARY | HSE ALL | MED | HL (Allow) | NSSF (Gross) | TOTAL | NSSF (Ded) | SHIF | WELFARE | SACCO.R | HL (Ded) | TOTAL DED | NET PAY
                let idxNo = -1;
                let idxName = -1;
                let idxDesig = -1;
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

                // Fallback column positions if header text was vague
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

                    // Match with existing staff by name or bank account
                    const nameNorm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const matched = existingStaff.find(s => {
                        const sNameNorm = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (sNameNorm === nameNorm) return true;
                        
                        let m = s.metadata || {};
                        if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { m = {}; } }
                        const sBank = String(m.bankAccountNumber || (s as any).bankAccountNumber || '');
                        if (bankAccount && sBank && sBank === bankAccount) return true;
                        return false;
                    });

                    const errors: string[] = [];
                    if (!name) errors.push('Name is missing');
                    if (basicSalary <= 0 && totalGross <= 0) errors.push('Salary is missing or zero');

                    results.push({
                        rawIndex: r,
                        no,
                        name,
                        designation,
                        role: mapDesignationToRole(designation),
                        bankAccount,
                        basicSalary: basicSalary > 0 ? basicSalary : totalGross,
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

    // Download Sample Template matching user's exact format
    const handleDownloadTemplate = () => {
        const sampleData = [
            {
                'NO': 1,
                'NAME': 'ELIZABETH KIPTOO',
                'DESIG': 'FARM',
                'BANK ACC': '1111175314',
                'SALARY': 13893,
                'HSE ALL': 1900,
                'MED': 575,
                'HL': 570,
                'NSSF': 2043,
                'TOTAL': 18981,
                'NSSF ': 1996,
                'SHIF': 459,
                'WELFARE': 200,
                'SACCO.R': 4666,
                'HL ': 540,
                'TOTAL DED': 7861,
                'NET PAY': 11120
            },
            {
                'NO': 2,
                'NAME': 'ANTHONY KIMUGE',
                'DESIG': 'LAB ASS',
                'BANK ACC': '1111476918',
                'SALARY': 17260,
                'HSE ALL': 1900,
                'MED': 575,
                'HL': 624,
                'NSSF': 2373,
                'TOTAL': 22732,
                'NSSF ': 2425,
                'SHIF': 555,
                'WELFARE': 200,
                'SACCO.R': 0,
                'HL ': 648,
                'TOTAL DED': 3828,
                'NET PAY': 18904
            },
            {
                'NO': 3,
                'NAME': 'LUKA KIPTARUS RONOH',
                'DESIG': 'CHAPLAIN',
                'BANK ACC': '1140092294',
                'SALARY': 19234,
                'HSE ALL': 2200,
                'MED': 900,
                'HL': 673,
                'NSSF': 3089,
                'TOTAL': 26096,
                'NSSF ': 2753,
                'SHIF': 627,
                'WELFARE': 200,
                'SACCO.R': 0,
                'HL ': 746,
                'TOTAL DED': 4326,
                'NET PAY': 21770
            },
            {
                'NO': 4,
                'NAME': 'PAUL KIPKEMOI KIMAIYO',
                'DESIG': 'DRIVER',
                'BANK ACC': '1126162647',
                'SALARY': 18221,
                'HSE ALL': 1900,
                'MED': 575,
                'HL': 645,
                'NSSF': 2849,
                'TOTAL': 24190,
                'NSSF ': 2547,
                'SHIF': 582,
                'WELFARE': 200,
                'SACCO.R': 3733,
                'HL ': 690,
                'TOTAL DED': 7752,
                'NET PAY': 16438
            },
            {
                'NO': 5,
                'NAME': 'DAVID KIBET',
                'DESIG': 'BURSAR',
                'BANK ACC': '1116294583',
                'SALARY': 38460,
                'HSE ALL': 3245,
                'MED': 950,
                'HL': 1026,
                'NSSF': 6973,
                'TOTAL': 50654,
                'NSSF ': 5368,
                'SHIF': 1203,
                'WELFARE': 200,
                'SACCO.R': 0,
                'HL ': 1455,
                'TOTAL DED': 8226,
                'NET PAY': 42428
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'HR_Payroll_Register');
        XLSX.writeFile(wb, `EduAI_HR_Payroll_Template_${institution.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    };

    // Filtered Preview Rows
    const filteredRows = useMemo(() => {
        return parsedRows.filter(r => {
            const q = searchFilter.toLowerCase().trim();
            const matchesSearch = !q || r.name.toLowerCase().includes(q) || r.designation.toLowerCase().includes(q) || r.bankAccount.includes(q);
            if (!matchesSearch) return false;

            if (statusFilter === 'new') return !r.isExisting;
            if (statusFilter === 'existing') return r.isExisting;
            return true;
        });
    }, [parsedRows, searchFilter, statusFilter]);

    // Computed Totals
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

    // Execute Import Process
    const handleCommitImport = async () => {
        if (parsedRows.length === 0) return;

        setIsImporting(true);
        setImportProgress({ current: 0, total: parsedRows.length, step: 'Starting HR & Payroll Import...' });

        try {
            let importedStaffCount = 0;
            let payrollRecordsToProcess: PayrollRecord[] = [];

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
                    const username = row.bankAccount ? `usr_${row.bankAccount}` : `usr_${cleanNameSlug}`;

                    const staffMetadata = {
                        basicSalary: row.basicSalary,
                        bankAccountNumber: row.bankAccount,
                        bankName: 'Equity Bank',
                        bankBranch: 'Main',
                        designation: row.designation,
                        employmentTerms: 'Permanent & Pensionable',
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
                        const newStaffPayload: Partial<User> = {
                            id: `usr_hr_${Date.now()}_${i}`,
                            name: row.name,
                            email,
                            phoneNumber: row.bankAccount || '',
                            role: row.role as any,
                            institutionId: institution.id,
                            metadata: staffMetadata
                        };

                        if (onAddUser) {
                            await onAddUser(newStaffPayload);
                        } else {
                            await apiService.saveModuleRecord('users', newStaffPayload);
                        }
                        staffId = newStaffPayload.id;
                        importedStaffCount++;
                    } else {
                        // Update Existing Staff
                        const existingObj = existingStaff.find(s => s.id === staffId);
                        let prevMeta = existingObj?.metadata || {};
                        if (typeof prevMeta === 'string') {
                            try { prevMeta = JSON.parse(prevMeta); } catch (e) { prevMeta = {}; }
                        }
                        const updatedMeta = { ...prevMeta, ...staffMetadata };

                        if (onEditUser) {
                            await onEditUser(staffId, { metadata: updatedMeta, basicSalary: row.basicSalary });
                        }
                        importedStaffCount++;
                    }
                }

                // 2. Generate Monthly Payroll Record
                if ((importMode === 'both' || importMode === 'payroll_only') && staffId) {
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
                        id: `pay_${staffId}_${importPeriod.replace(/\s+/g, '_')}`,
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
                }
            }

            // Save Payroll Records
            if (payrollRecordsToProcess.length > 0) {
                setImportProgress({
                    current: parsedRows.length,
                    total: parsedRows.length,
                    step: `Committing ${payrollRecordsToProcess.length} payroll records...`
                });

                if (onProcessPayroll) {
                    await onProcessPayroll(payrollRecordsToProcess);
                } else {
                    await apiService.saveModuleRecord('payroll_records', payrollRecordsToProcess);
                }
            }

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

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-850">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                                    Smart HR & Payroll Excel Importer
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-800">
                                    Kenya Standard Register
                                </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                Import staff registers, allowances (House, Med, Housing Levy) & deductions (NSSF, SHIF, Welfare, SACCO, Housing Levy)
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Download Excel Template</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Main Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">

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
                                                <th className="py-3 px-3 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                                            {filteredRows.map((r, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-400">{r.no || idx + 1}</td>
                                                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white uppercase truncate max-w-[180px]">{r.name}</td>
                                                    <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-500">{r.designation}</td>
                                                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 dark:text-slate-400">{r.bankAccount || '-'}</td>
                                                    <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-200">{r.basicSalary.toLocaleString()}</td>
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
                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                                                                Update
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                                                                New Staff
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs font-semibold text-slate-500">
                        {isImporting ? (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold animate-pulse">
                                {importProgress.step}
                            </span>
                        ) : parsedRows.length > 0 ? (
                            <span>Ready to import <strong className="text-slate-900 dark:text-white">{parsedRows.length} staff records</strong> into <strong className="text-indigo-600">{importPeriod}</strong></span>
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
                                    <span>Commit & Import ({parsedRows.length} Staff)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
