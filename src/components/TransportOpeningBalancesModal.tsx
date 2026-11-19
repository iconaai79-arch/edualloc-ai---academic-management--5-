import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
    X,
    UploadCloud,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Trash2,
    Search,
    UserCheck,
    Banknote,
    Calendar,
    ArrowRight,
    RefreshCw,
    Edit3,
    Filter,
    Users,
    Bus,
    Receipt,
    Wallet,
    Check,
    Phone,
    ShieldCheck,
    FileText,
    Printer
} from 'lucide-react';
import type { Institution, User as UserType } from '../types';
import type { TransportFeeInvoice, RouteFeeSetting } from './TransportBillingManager';

interface TransportOpeningBalancesModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentInstitution: Institution;
    students: Array<{
        id: string;
        name: string;
        admissionNumber?: string;
        studentClass?: string;
        parentPhone?: string;
        assignedRouteId?: string;
    }>;
    routes: Array<{
        id: string;
        name: string;
        bus?: string;
    }>;
    routeFeeSettings?: RouteFeeSetting[];
    existingInvoices: TransportFeeInvoice[];
    onSaveOpeningBalance: (invoice: TransportFeeInvoice) => void;
    onImportOpeningBalances: (invoices: TransportFeeInvoice[]) => void;
    onDeleteOpeningBalance?: (invoiceId: string) => void;
    defaultPeriod?: string;
    vehicles?: string[];
}

interface ParsedUploadRow {
    id: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    routeId: string;
    routeName: string;
    parentPhone: string;
    amount: number;
    balanceType: 'arrears' | 'credit';
    period: string;
    notes: string;
    isMatched: boolean;
    originalRow: any;
}

export const TransportOpeningBalancesModal: React.FC<TransportOpeningBalancesModalProps> = ({
    isOpen,
    onClose,
    currentInstitution,
    students,
    routes,
    routeFeeSettings = [],
    existingInvoices,
    onSaveOpeningBalance,
    onImportOpeningBalances,
    onDeleteOpeningBalance,
    defaultPeriod = 'Opening Balance (B/F)'
}) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'manual' | 'existing'>('upload');
    const [isProcessingFile, setIsProcessingFile] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRoute, setFilterRoute] = useState<string>('ALL');
    const [filterVehicle, setFilterVehicle] = useState<string>('ALL');
    const [filterBalanceType, setFilterBalanceType] = useState<'ALL' | 'arrears' | 'credit'>('ALL');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Available vehicles discovered from routes and invoices
    const availableVehicles = useMemo(() => {
        const set = new Set<string>();
        routes.forEach((r: any) => {
            if (r.bus && typeof r.bus === 'string' && r.bus.trim()) {
                set.add(r.bus.trim());
            }
        });
        existingInvoices.forEach(i => {
            const v = (i as any).vehicle || (i as any).busPlate || (i as any).bus;
            if (v && typeof v === 'string' && v.trim() && v.toLowerCase() !== 'unassigned vehicle') {
                set.add(v.trim());
            }
        });
        return Array.from(set).sort();
    }, [routes, existingInvoices]);

    const getInvoiceVehicle = (inv: TransportFeeInvoice) => {
        const direct = (inv as any).vehicle || (inv as any).busPlate || (inv as any).bus;
        if (direct && typeof direct === 'string' && direct.trim()) return direct.trim();
        const matched = routes.find(r => 
            (r.id && r.id === inv.routeId) || 
            (r.name && inv.routeName && r.name.toLowerCase() === inv.routeName.toLowerCase())
        );
        if (matched?.bus && matched.bus.trim()) return matched.bus.trim();
        return 'Unassigned Vehicle';
    };

    // Upload & parsed rows state
    const [parsedRows, setParsedRows] = useState<ParsedUploadRow[]>([]);
    const [uploadFileName, setUploadFileName] = useState<string>('');

    // Single manual entry form state
    const [manualStudentId, setManualStudentId] = useState<string>('');
    const [manualAmount, setManualAmount] = useState<string>('');
    const [manualRouteId, setManualRouteId] = useState<string>('');
    const [manualBalanceType, setManualBalanceType] = useState<'arrears' | 'credit'>('arrears');
    const [manualPeriod, setManualPeriod] = useState<string>(defaultPeriod);
    const [manualAsOfDate, setManualAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [manualNotes, setManualNotes] = useState<string>('');
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

    // Filter existing opening balance invoices
    const openingBalanceInvoices = useMemo(() => {
        return existingInvoices.filter(i => 
            i.isOpeningBalance === true || 
            (i.period && (
                i.period.toLowerCase().includes('opening') ||
                i.period.toLowerCase().includes('b/f') ||
                i.period.toLowerCase().includes('brought forward')
            )) ||
            (i.notes && i.notes.toLowerCase().includes('opening balance'))
        );
    }, [existingInvoices]);

    // Total Opening Balance Sum & Categorized Balance Stats
    const balanceStats = useMemo(() => {
        let arrears = 0;
        let credits = 0;
        openingBalanceInvoices.forEach(i => {
            const isCredit = i.balanceType === 'credit' || 
                             Boolean(i.prepaymentAmount && i.prepaymentAmount > 0) || 
                             (i.notes && (i.notes.toLowerCase().includes('prepayment') || i.notes.toLowerCase().includes('advance credit'))) || 
                             (i.status === 'paid' && !i.paidDate);
            const amt = Math.abs(i.finalAmount || i.amount || 0);
            if (isCredit) {
                credits += amt;
            } else {
                arrears += amt;
            }
        });
        return {
            arrears,
            credits,
            net: arrears - credits,
            totalSum: arrears + credits
        };
    }, [openingBalanceInvoices]);

    const totalOpeningBalancesSum = balanceStats.arrears;

    // Handle student selection change in manual entry
    const handleStudentSelect = (stId: string) => {
        setManualStudentId(stId);
        const selectedStudent = students.find(s => s.id === stId);
        if (selectedStudent) {
            if (selectedStudent.assignedRouteId && routes.some(r => r.id === selectedStudent.assignedRouteId)) {
                setManualRouteId(selectedStudent.assignedRouteId);
            } else if (routes.length > 0 && !manualRouteId) {
                setManualRouteId(routes[0].id);
            }

            // Check if student already has an opening balance invoice
            const existing = openingBalanceInvoices.find(i => i.studentId === stId);
            if (existing && !editingInvoiceId) {
                setManualAmount(String(existing.finalAmount || existing.amount || ''));
                if (existing.routeId) setManualRouteId(existing.routeId);
                if (existing.period) setManualPeriod(existing.period);
                if (existing.notes) setManualNotes(existing.notes);
                const isCredit = existing.balanceType === 'credit' || 
                                 Boolean(existing.prepaymentAmount && existing.prepaymentAmount > 0) || 
                                 (existing.notes && (existing.notes.toLowerCase().includes('prepayment') || existing.notes.toLowerCase().includes('advance credit'))) ||
                                 (existing.status === 'paid' && !existing.paidDate);
                setManualBalanceType(isCredit ? 'credit' : 'arrears');
            }
        }
    };

    // 1. Download Pre-populated Excel Template
    const handleDownloadTemplate = () => {
        try {
            const templateRows = students.map((st, idx) => {
                const assignedRoute = routes.find(r => r.id === st.assignedRouteId);
                const existing = openingBalanceInvoices.find(i => i.studentId === st.id);
                const isCredit = existing?.balanceType === 'credit' || 
                                 Boolean(existing?.prepaymentAmount && existing.prepaymentAmount > 0) || 
                                 Boolean(existing?.notes && (existing.notes.toLowerCase().includes('prepayment') || existing.notes.toLowerCase().includes('advance credit'))) ||
                                 (existing?.status === 'paid' && !existing?.paidDate);
                const balTypeStr = existing ? (isCredit ? 'Prepayment (Credit)' : 'Arrears') : 'Arrears';
                return {
                    'Admission / ID No.': st.admissionNumber || `ADM-${String(idx + 1).padStart(4, '0')}`,
                    'Full Name': st.name,
                    'Class / Stream': st.studentClass || 'General',
                    'Assigned Route': assignedRoute ? assignedRoute.name : (routes[0]?.name || 'Main Route'),
                    'Parent / Phone': st.parentPhone || '',
                    'Opening Balance (KES)': existing ? (existing.finalAmount || existing.amount || 0) : 0,
                    'Balance Type (Arrears or Prepayment)': balTypeStr,
                    'Period / As-Of': existing?.period || defaultPeriod,
                    'Remarks': existing?.notes || (isCredit ? 'Transport prepayment / advance credit brought forward' : 'Transport arrears brought forward')
                };
            });

            const ws = XLSX.utils.json_to_sheet(templateRows);
            ws['!cols'] = [
                { wch: 20 }, // Admission
                { wch: 28 }, // Name
                { wch: 18 }, // Class
                { wch: 32 }, // Route
                { wch: 20 }, // Phone
                { wch: 22 }, // Balance
                { wch: 24 }, // Balance Type
                { wch: 24 }, // Period
                { wch: 35 }  // Remarks
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Opening_Balances');

            const safeInstName = (currentInstitution.name || 'Logistics').replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${safeInstName}_Transport_Opening_Balances_Template.xlsx`;
            XLSX.writeFile(wb, fileName);
        } catch (err: any) {
            console.error('Failed to download opening balance template:', err);
            alert('Failed to generate template: ' + (err.message || err));
        }
    };

    // 2. Handle File Upload & Parse
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadFileName(file.name);
        setIsProcessingFile(true);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const firstSheetName = wb.SheetNames[0];
                const ws = wb.Sheets[firstSheetName];
                const rawData: any[] = XLSX.utils.sheet_to_json(ws);

                if (rawData.length === 0) {
                    alert('The uploaded file contains no data rows.');
                    setIsProcessingFile(false);
                    return;
                }

                // Match rows against students / commuters
                const rows: ParsedUploadRow[] = rawData.map((row, idx) => {
                    const rowAdm = String(
                        row['Admission / ID No.'] || 
                        row['Admission Number'] || 
                        row['Admission No'] || 
                        row['AdmissionNo'] || 
                        row['Adm No'] || 
                        row['ID'] || 
                        row['Student ID'] || 
                        row['Client ID'] || 
                        ''
                    ).trim().toLowerCase();

                    const rowName = String(
                        row['Full Name'] || 
                        row['Student Name'] || 
                        row['Name'] || 
                        row['Passenger Name'] || 
                        row['Client Name'] || 
                        ''
                    ).trim().toLowerCase();

                    const rowPhone = String(
                        row['Parent / Phone'] || 
                        row['Phone'] || 
                        row['Phone Number'] || 
                        row['Parent Phone'] || 
                        row['Contact'] || 
                        ''
                    ).trim().replace(/[^0-9]/g, '');

                    const rawAmount = Number(
                        row['Opening Balance (KES)'] || 
                        row['Opening Balance'] || 
                        row['Balance'] || 
                        row['Amount'] || 
                        row['Arrears'] || 
                        0
                    );

                    const rowRouteName = String(row['Assigned Route'] || row['Route'] || row['Route Name'] || '').trim().toLowerCase();
                    const periodRef = String(row['Period / As-Of'] || row['Period'] || row['As-Of'] || defaultPeriod).trim();
                    const notes = String(row['Remarks'] || row['Notes'] || row['Description'] || 'Transport opening balance brought forward').trim();

                    // Match student
                    let matchedStudent = students.find(s => {
                        const sAdm = String(s.admissionNumber || '').trim().toLowerCase();
                        return rowAdm && sAdm && (sAdm === rowAdm || sAdm.includes(rowAdm) || rowAdm.includes(sAdm));
                    });

                    if (!matchedStudent && rowPhone) {
                        matchedStudent = students.find(s => {
                            const sPhone = String(s.parentPhone || '').replace(/[^0-9]/g, '');
                            return sPhone && (sPhone === rowPhone || sPhone.endsWith(rowPhone.slice(-9)) || rowPhone.endsWith(sPhone.slice(-9)));
                        });
                    }

                    if (!matchedStudent && rowName) {
                        matchedStudent = students.find(s => {
                            const sName = s.name.toLowerCase();
                            return sName === rowName || sName.includes(rowName) || rowName.includes(sName);
                        });
                    }

                    // Match route
                    let matchedRoute = routes.find(r => {
                        const rName = r.name.toLowerCase();
                        return rowRouteName && (rName === rowRouteName || rName.includes(rowRouteName) || rowRouteName.includes(rName));
                    });
                    if (!matchedRoute && matchedStudent?.assignedRouteId) {
                        matchedRoute = routes.find(r => r.id === matchedStudent?.assignedRouteId);
                    }
                    if (!matchedRoute && routes.length > 0) {
                        matchedRoute = routes[0];
                    }

                    const rawType = String(
                        row['Balance Type (Arrears or Prepayment)'] || 
                        row['Balance Type'] || 
                        row['Type'] || 
                        row['Category'] || 
                        ''
                    ).trim().toLowerCase();

                    const isCredit = rawAmount < 0 || 
                                     rawType.includes('credit') || 
                                     rawType.includes('prepay') || 
                                     rawType.includes('advance') || 
                                     rawType.includes('paid');

                    const balanceType: 'arrears' | 'credit' = isCredit ? 'credit' : 'arrears';

                    return {
                        id: `parsed_${Date.now()}_${idx}`,
                        studentId: matchedStudent?.id || `st_import_${Date.now()}_${idx}`,
                        studentName: matchedStudent?.name || String(row['Full Name'] || row['Name'] || 'Unmatched Commuter'),
                        admissionNumber: matchedStudent?.admissionNumber || String(row['Admission / ID No.'] || row['Admission Number'] || `ADM-${idx + 1}`),
                        routeId: matchedRoute?.id || 'route_general',
                        routeName: matchedRoute?.name || 'General Route',
                        parentPhone: matchedStudent?.parentPhone || rowPhone || '',
                        amount: Math.abs(rawAmount),
                        balanceType,
                        period: periodRef,
                        notes,
                        isMatched: Boolean(matchedStudent),
                        originalRow: row
                    };
                });

                setParsedRows(rows);
            } catch (err: any) {
                console.error('Error parsing spreadsheet:', err);
                alert('Failed to parse spreadsheet: ' + (err.message || 'Invalid format'));
            } finally {
                setIsProcessingFile(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };

        reader.onerror = () => {
            alert('Failed to read file.');
            setIsProcessingFile(false);
        };

        reader.readAsBinaryString(file);
    };

    // Apply batch parsed rows
    const handleApplyImport = () => {
        if (parsedRows.length === 0) return;

        setIsSaving(true);
        try {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            const importedInvoices: TransportFeeInvoice[] = parsedRows
                .filter(r => r.amount > 0)
                .map((row, idx) => {
                    const invId = `tinv_opb_${Date.now()}_${idx}`;
                    const isCredit = row.balanceType === 'credit';
                    const defaultNotes = isCredit 
                        ? 'Transport prepayment / advance credit brought forward' 
                        : 'Transport arrears brought forward';

                    return {
                        id: invId,
                        studentId: row.studentId,
                        studentName: row.studentName,
                        admissionNumber: row.admissionNumber,
                        routeId: row.routeId,
                        routeName: row.routeName,
                        preference: 'round_trip',
                        billingCycle: 'term',
                        period: row.period || defaultPeriod,
                        baseAmount: row.amount,
                        discountAmount: 0,
                        finalAmount: row.amount,
                        status: isCredit ? 'paid' : 'pending',
                        issuedDate: new Date().toISOString(),
                        dueDate: dueDate.toISOString(),
                        parentPhone: row.parentPhone,
                        notes: row.notes || defaultNotes,
                        isOpeningBalance: true,
                        balanceType: row.balanceType,
                        amount: row.amount,
                        paidAmount: isCredit ? row.amount : 0,
                        balance: isCredit ? 0 : row.amount,
                        prepaymentAmount: isCredit ? row.amount : undefined
                    };
                });

            onImportOpeningBalances(importedInvoices);
            alert(`Successfully imported ${importedInvoices.length} opening balances!`);
            setParsedRows([]);
            setUploadFileName('');
            setActiveTab('existing');
        } catch (err: any) {
            console.error('Failed to apply import:', err);
            alert('Failed to import balances: ' + (err.message || err));
        } finally {
            setIsSaving(false);
        }
    };

    // Save or update single balance
    const handleSaveSingleBalance = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = Number(manualAmount);
        if (!manualStudentId) {
            alert('Please select a student / commuter.');
            return;
        }
        if (isNaN(amt) || amt < 0) {
            alert('Please enter a valid balance amount.');
            return;
        }

        const selectedStudent = students.find(s => s.id === manualStudentId);
        const selectedRoute = routes.find(r => r.id === manualRouteId) || routes[0];

        setIsSaving(true);
        try {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            const existingInv = editingInvoiceId 
                ? existingInvoices.find(i => i.id === editingInvoiceId) 
                : openingBalanceInvoices.find(i => i.studentId === manualStudentId);

            const isCredit = manualBalanceType === 'credit';
            const defaultNotes = isCredit 
                ? 'Transport prepayment / advance credit brought forward' 
                : 'Transport arrears brought forward';

            const invoiceToSave: TransportFeeInvoice = {
                id: existingInv ? existingInv.id : `tinv_opb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                studentId: manualStudentId,
                studentName: selectedStudent?.name || existingInv?.studentName || 'Commuter',
                admissionNumber: selectedStudent?.admissionNumber || existingInv?.admissionNumber || '',
                routeId: selectedRoute?.id || existingInv?.routeId || 'route_general',
                routeName: selectedRoute?.name || existingInv?.routeName || 'General Route',
                preference: existingInv?.preference || 'round_trip',
                billingCycle: existingInv?.billingCycle || 'term',
                period: manualPeriod || defaultPeriod,
                baseAmount: amt,
                discountAmount: 0,
                finalAmount: amt,
                status: isCredit ? 'paid' : (amt === 0 ? 'paid' : 'pending'),
                issuedDate: manualAsOfDate ? new Date(manualAsOfDate).toISOString() : (existingInv?.issuedDate || new Date().toISOString()),
                dueDate: existingInv?.dueDate || dueDate.toISOString(),
                parentPhone: selectedStudent?.parentPhone || existingInv?.parentPhone || '',
                notes: manualNotes || defaultNotes,
                isOpeningBalance: true,
                balanceType: manualBalanceType,
                amount: amt,
                paidAmount: isCredit ? amt : (existingInv?.paidAmount || 0),
                balance: isCredit ? 0 : amt,
                prepaymentAmount: isCredit ? amt : undefined
            };

            onSaveOpeningBalance(invoiceToSave);
            alert(editingInvoiceId 
                ? 'Opening balance updated successfully!' 
                : (isCredit ? 'Prepayment credit saved successfully!' : 'Opening arrears saved successfully!'));

            // Reset manual form
            setEditingInvoiceId(null);
            setManualStudentId('');
            setManualAmount('');
            setManualNotes('');
            setActiveTab('existing');
        } catch (err: any) {
            console.error('Failed to save manual balance:', err);
            alert('Error saving opening balance: ' + (err.message || err));
        } finally {
            setIsSaving(false);
        }
    };

    // Edit an existing balance
    const handleStartEdit = (inv: TransportFeeInvoice) => {
        setEditingInvoiceId(inv.id);
        setManualStudentId(inv.studentId);
        setManualAmount(String(inv.finalAmount || inv.amount || 0));
        setManualRouteId(inv.routeId || '');
        setManualPeriod(inv.period || defaultPeriod);
        setManualNotes(inv.notes || '');
        const isCredit = inv.balanceType === 'credit' || 
                         Boolean(inv.prepaymentAmount && inv.prepaymentAmount > 0) || 
                         Boolean(inv.notes && (inv.notes.toLowerCase().includes('prepayment') || inv.notes.toLowerCase().includes('advance credit'))) ||
                         (inv.status === 'paid' && !inv.paidDate);
        setManualBalanceType(isCredit ? 'credit' : 'arrears');
        if (inv.issuedDate) {
            setManualAsOfDate(inv.issuedDate.split('T')[0]);
        }
        setActiveTab('manual');
    };

    // Filtered existing opening balances with Route, Vehicle, Type, and Text Search
    const filteredExisting = useMemo(() => {
        return openingBalanceInvoices.filter(i => {
            const isCredit = i.balanceType === 'credit' || 
                             Boolean(i.prepaymentAmount && i.prepaymentAmount > 0) || 
                             (i.notes && (i.notes.toLowerCase().includes('prepayment') || i.notes.toLowerCase().includes('advance credit'))) || 
                             (i.status === 'paid' && !i.paidDate);
            const matchesType = filterBalanceType === 'ALL' || (filterBalanceType === 'credit' ? isCredit : !isCredit);
            const matchesRoute = filterRoute === 'ALL' || i.routeId === filterRoute || i.routeName === filterRoute;
            const veh = getInvoiceVehicle(i);
            const matchesVehicle = filterVehicle === 'ALL' || veh.toLowerCase().trim() === filterVehicle.toLowerCase().trim();
            const q = searchTerm.toLowerCase().trim();
            const matchesSearch = !q ||
                (i.studentName || '').toLowerCase().includes(q) ||
                (i.admissionNumber || '').toLowerCase().includes(q) ||
                (i.routeName || '').toLowerCase().includes(q) ||
                (i.period || '').toLowerCase().includes(q) ||
                veh.toLowerCase().includes(q);
            return matchesType && matchesRoute && matchesVehicle && matchesSearch;
        });
    }, [openingBalanceInvoices, searchTerm, filterBalanceType, filterRoute, filterVehicle, routes]);

    // Financial stats for current filtered opening balance view
    const filteredStats = useMemo(() => {
        let arrears = 0;
        let credits = 0;
        filteredExisting.forEach(i => {
            const isCredit = i.balanceType === 'credit' || 
                             Boolean(i.prepaymentAmount && i.prepaymentAmount > 0) || 
                             (i.notes && (i.notes.toLowerCase().includes('prepayment') || i.notes.toLowerCase().includes('advance credit'))) || 
                             (i.status === 'paid' && !i.paidDate);
            const amt = Math.abs(i.finalAmount || i.amount || 0);
            if (isCredit) credits += amt;
            else arrears += amt;
        });
        return { arrears, credits, net: arrears - credits };
    }, [filteredExisting]);

    // Download Opening Balances PDF
    const handleDownloadOpeningBalancesPdf = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTableModule = await import('jspdf-autotable');
            const autoTable = (autoTableModule as any).default || autoTableModule;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text((currentInstitution?.name || 'INSTITUTION').toUpperCase(), 14, 16);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('OFFICIAL TRANSPORT OPENING BALANCES (B/F) REGISTER', 14, 22);

            const scope = `Vehicle: ${filterVehicle !== 'ALL' ? filterVehicle : 'All Vehicles'} | Route: ${filterRoute !== 'ALL' ? (routes.find(r => r.id === filterRoute)?.name || filterRoute) : 'All Routes'} | Type: ${filterBalanceType} | Generated: ${new Date().toLocaleDateString('en-KE')}`;
            doc.setFontSize(8);
            doc.text(scope, 14, 27);

            const rows = filteredExisting.map((inv, idx) => {
                const isCredit = inv.balanceType === 'credit' || 
                                 Boolean(inv.prepaymentAmount && inv.prepaymentAmount > 0) || 
                                 (inv.notes && (inv.notes.toLowerCase().includes('prepayment') || inv.notes.toLowerCase().includes('advance credit'))) || 
                                 (inv.status === 'paid' && !inv.paidDate);
                const amt = Math.abs(inv.finalAmount || inv.amount || 0);
                const veh = getInvoiceVehicle(inv);
                return [
                    idx + 1,
                    inv.studentName || '—',
                    inv.admissionNumber || '—',
                    inv.routeName || 'General Route',
                    veh,
                    isCredit ? 'Credit (Advance)' : 'Arrears (Debt)',
                    amt.toLocaleString(),
                    inv.period || 'Opening B/F'
                ];
            });

            autoTable(doc, {
                head: [['#', 'Commuter / Student', 'Adm No', 'Route', 'Vehicle', 'Nature', 'Amount (KES)', 'Period']],
                body: rows,
                startY: 32,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 8 },
                styles: { cellPadding: 2 }
            });

            const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 220;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`Total Arrears (Debt B/F): KES ${filteredStats.arrears.toLocaleString()}   Total Prepayments (Credit B/F): KES ${filteredStats.credits.toLocaleString()}   Net Ledger: KES ${filteredStats.net.toLocaleString()}`, 14, finalY);

            // Per-Vehicle Subtotals if more than 1 vehicle
            const vMap: Record<string, { vehicle: string; arrears: number; credits: number; count: number }> = {};
            filteredExisting.forEach(inv => {
                const v = getInvoiceVehicle(inv);
                if (!vMap[v]) vMap[v] = { vehicle: v, arrears: 0, credits: 0, count: 0 };
                const isCredit = inv.balanceType === 'credit' || 
                                 Boolean(inv.prepaymentAmount && inv.prepaymentAmount > 0) || 
                                 (inv.notes && (inv.notes.toLowerCase().includes('prepayment') || inv.notes.toLowerCase().includes('advance credit'))) || 
                                 (inv.status === 'paid' && !inv.paidDate);
                const amt = Math.abs(inv.finalAmount || inv.amount || 0);
                if (isCredit) vMap[v].credits += amt;
                else vMap[v].arrears += amt;
                vMap[v].count += 1;
            });
            const vRows = Object.values(vMap).sort((a, b) => b.arrears - a.arrears);
            if (vRows.length > 1) {
                const vFinalY = finalY + 10;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('PER-VEHICLE OPENING BALANCES BREAKDOWN', 14, vFinalY);
                autoTable(doc, {
                    head: [['Vehicle', 'Students', 'Total Arrears (KES)', 'Total Credits (KES)', 'Net Debt (KES)']],
                    body: vRows.map(vr => [
                        vr.vehicle,
                        String(vr.count),
                        vr.arrears.toLocaleString(),
                        vr.credits.toLocaleString(),
                        (vr.arrears - vr.credits).toLocaleString()
                    ]),
                    startY: vFinalY + 4,
                    theme: 'grid',
                    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
                    bodyStyles: { fontSize: 8 },
                    styles: { cellPadding: 2 }
                });
            }

            doc.save(`Transport_Opening_Balances_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err: any) {
            console.error(err);
            alert('Failed to generate PDF: ' + (err.message || err));
        }
    };

    if (!isOpen) return null;

    const modalContent = (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh] animate-scale-in">
                {/* Header */}
                <div className="p-6 lg:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                                    Logistics & Transit
                                </span>
                                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Financial Ledger</span>
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tight text-white mt-0.5">
                                Commuter & Student Opening Balances (B/F)
                            </h3>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-Header KPI Strip */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 px-6 lg:px-8 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-6 flex-wrap">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total B/F Records</p>
                            <p className="text-lg font-black text-slate-900 dark:text-white">{openingBalanceInvoices.length} Commuters</p>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Arrears (Debt B/F)</p>
                            <p className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
                                +KES {balanceStats.arrears.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Prepayments (Credit B/F)</p>
                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                -KES {balanceStats.credits.toLocaleString()}
                            </p>
                        </div>
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />
                        <div className="hidden md:block">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net Ledger Balance</p>
                            <p className={`text-lg font-black font-mono ${balanceStats.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-emerald-600'}`}>
                                KES {balanceStats.net.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Nav Tabs */}
                    <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1.5 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab('upload')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                activeTab === 'upload'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Bulk Excel Upload</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('manual')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                activeTab === 'manual'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{editingInvoiceId ? 'Edit Balance' : 'Single Entry / Update'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('existing')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                activeTab === 'existing'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Existing Balances ({openingBalanceInvoices.length})</span>
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
                    {/* TAB 1: BULK EXCEL UPLOAD */}
                    {activeTab === 'upload' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Step 1: Download Template Card */}
                            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            Step 1: Download Pre-Filled Excel Template
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        Downloads an Excel workbook pre-filled with all {students.length} commuters & admission numbers. Simply fill in the opening balance amounts and upload below.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="px-6 py-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm shrink-0 transition-all cursor-pointer active:scale-95"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Template</span>
                                </button>
                            </div>

                            {/* Step 2: Upload File Area */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Step 2: Upload Completed Spreadsheet (.xlsx, .xls, .csv)
                                </h4>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-10 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/30 group"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <UploadCloud className="w-8 h-8" />
                                    </div>
                                    <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {uploadFileName ? uploadFileName : 'Drop your opening balance Excel here'}
                                    </h5>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">
                                        or click to browse your computer
                                    </p>
                                </div>
                            </div>

                            {/* Step 3: Parsed Rows Preview */}
                            {parsedRows.length > 0 && (
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                Spreadsheet Pre-Flight Check ({parsedRows.length} rows detected)
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                {parsedRows.filter(r => r.isMatched).length} matched to existing commuters • Total Sum: KES {parsedRows.reduce((a, b) => a + b.amount, 0).toLocaleString()}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleApplyImport}
                                            disabled={isSaving}
                                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 shrink-0"
                                        >
                                            <Check className="w-4 h-4" />
                                            <span>Apply & Import {parsedRows.filter(r => r.amount > 0).length} Balances</span>
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto max-h-64 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-100 dark:border-slate-800">
                                                <tr>
                                                    <th className="p-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Status</th>
                                                    <th className="p-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Admission / ID</th>
                                                    <th className="p-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Commuter Name</th>
                                                    <th className="p-3 text-[9px] font-black uppercase tracking-wider text-slate-400">Route</th>
                                                    <th className="p-3 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">Opening Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {parsedRows.map((r, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                        <td className="p-3">
                                                            {r.isMatched ? (
                                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-500">
                                                                    <AlertTriangle className="w-3.5 h-3.5" /> New / Unmatched
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">{r.admissionNumber}</td>
                                                        <td className="p-3 font-bold text-slate-900 dark:text-white uppercase">{r.studentName}</td>
                                                        <td className="p-3 text-slate-600 dark:text-slate-400">{r.routeName}</td>
                                                        <td className="p-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                                            KES {r.amount.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 2: MANUAL ENTRY OR EDIT */}
                    {activeTab === 'manual' && (
                        <form onSubmit={handleSaveSingleBalance} className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                    <Edit3 className="w-4 h-4 text-indigo-600" />
                                    <span>{editingInvoiceId ? 'Update Commuter Opening Balance' : 'Record Single Commuter Opening Balance'}</span>
                                </h4>
                                <p className="text-xs text-slate-400">
                                    Assign an initial transport balance brought forward. This directly updates the commuter's transport fee statement.
                                </p>

                                {/* Student / Commuter Selector */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Select Commuter / Student *
                                    </label>
                                    <select
                                        required
                                        value={manualStudentId}
                                        onChange={e => handleStudentSelect(e.target.value)}
                                        className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                                    >
                                        <option value="">-- Choose commuter or student ({students.length}) --</option>
                                        {students.map(st => (
                                            <option key={st.id} value={st.id}>
                                                {st.name} {st.admissionNumber ? `(${st.admissionNumber})` : ''} {st.studentClass ? `• ${st.studentClass}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Balance Nature: Arrears vs Prepayment */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Balance Nature *
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setManualBalanceType('arrears');
                                                if (!manualNotes || manualNotes.includes('prepayment') || manualNotes.includes('advance')) {
                                                    setManualNotes('Transport arrears brought forward');
                                                }
                                            }}
                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                                                manualBalanceType === 'arrears'
                                                    ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-rose-200 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                                                manualBalanceType === 'arrears' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                                🔴
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wide">Arrears (Debt)</p>
                                                <p className="text-[10px] opacity-75">Parent owes bus fee</p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setManualBalanceType('credit');
                                                if (!manualNotes || manualNotes.includes('arrears')) {
                                                    setManualNotes('Transport prepayment / advance credit brought forward');
                                                }
                                            }}
                                            className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                                                manualBalanceType === 'credit'
                                                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 shadow-sm'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 text-slate-600 dark:text-slate-400'
                                            }`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                                                manualBalanceType === 'credit' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                            }`}>
                                                🟢
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-wide">Prepayment (Credit)</p>
                                                <p className="text-[10px] opacity-75">Advance payment / credit</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Amount & Balance Type */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                            {manualBalanceType === 'credit' ? 'Prepayment / Credit Amount (KES) *' : 'Opening Arrears Amount (KES) *'}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KES</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                required
                                                value={manualAmount}
                                                onChange={e => setManualAmount(e.target.value)}
                                                placeholder="e.g. 4500"
                                                className="w-full pl-14 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                            Assigned Route
                                        </label>
                                        <select
                                            value={manualRouteId}
                                            onChange={e => setManualRouteId(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                                        >
                                            <option value="">General Transport / Unassigned</option>
                                            {routes.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Period Reference & As of Date */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                            Period / Ledger Term
                                        </label>
                                        <input
                                            type="text"
                                            value={manualPeriod}
                                            onChange={e => setManualPeriod(e.target.value)}
                                            placeholder="e.g. Opening Balance (B/F) or 2026 Term 1"
                                            className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                            As-Of Date
                                        </label>
                                        <input
                                            type="date"
                                            value={manualAsOfDate}
                                            onChange={e => setManualAsOfDate(e.target.value)}
                                            className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                </div>

                                {/* Remarks / Notes */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                                        Notes / Audit Remarks
                                    </label>
                                    <input
                                        type="text"
                                        value={manualNotes}
                                        onChange={e => setManualNotes(e.target.value)}
                                        placeholder="e.g. Arrears brought forward from previous academic year"
                                        className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3">
                                {editingInvoiceId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingInvoiceId(null);
                                            setManualStudentId('');
                                            setManualAmount('');
                                            setManualNotes('');
                                        }}
                                        className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-bold cursor-pointer"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
                                >
                                    {isSaving ? 'Saving...' : (editingInvoiceId ? 'Update Opening Balance' : 'Save Opening Balance')}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* TAB 3: EXISTING BALANCES LIST */}
                    {activeTab === 'existing' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Filter and Actions Bar */}
                            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                    {/* Text Search */}
                                    <div className="relative min-w-[200px] flex-1">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Search student, adm, route, vehicle..."
                                            className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    {/* Route Filter Dropdown */}
                                    <select
                                        value={filterRoute}
                                        onChange={e => setFilterRoute(e.target.value)}
                                        className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                                    >
                                        <option value="ALL">All Routes ({routes.length})</option>
                                        {routes.map(r => (
                                            <option key={r.id} value={r.id}>🚌 {r.name}</option>
                                        ))}
                                    </select>

                                    {/* Vehicle / Bus Filter Dropdown */}
                                    <select
                                        value={filterVehicle}
                                        onChange={e => setFilterVehicle(e.target.value)}
                                        className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                                    >
                                        <option value="ALL">All Fleet Vehicles ({availableVehicles.length})</option>
                                        {availableVehicles.map(v => (
                                            <option key={v} value={v}>🚐 {v}</option>
                                        ))}
                                    </select>

                                    {/* Balance Nature Filter */}
                                    <select
                                        value={filterBalanceType}
                                        onChange={e => setFilterBalanceType(e.target.value as any)}
                                        className="px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                                    >
                                        <option value="ALL">All Balance Types</option>
                                        <option value="arrears">🔴 Arrears Only (Debt)</option>
                                        <option value="credit">🟢 Credits Only (Prepayments)</option>
                                    </select>

                                    {(searchTerm || filterRoute !== 'ALL' || filterVehicle !== 'ALL' || filterBalanceType !== 'ALL') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilterRoute('ALL');
                                                setFilterVehicle('ALL');
                                                setFilterBalanceType('ALL');
                                            }}
                                            className="px-3 py-2 text-[10px] text-rose-500 hover:underline font-black uppercase cursor-pointer"
                                        >
                                            Reset
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleDownloadOpeningBalancesPdf}
                                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                                        title="Download filtered opening balances PDF report"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>PDF Report</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingInvoiceId(null);
                                            setManualStudentId('');
                                            setManualAmount('');
                                            setActiveTab('manual');
                                        }}
                                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-md shrink-0"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Another</span>
                                    </button>
                                </div>
                            </div>

                            {/* Scoped Summary Banner */}
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-700">
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                                    Showing {filteredExisting.length} of {openingBalanceInvoices.length} commuter balances
                                </div>
                                <div className="flex items-center gap-4 text-xs font-mono">
                                    <div>
                                        <span className="text-slate-400 mr-1 text-[9px] uppercase font-bold">Arrears:</span>
                                        <span className="font-bold text-rose-600 dark:text-rose-400">KES {filteredStats.arrears.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 mr-1 text-[9px] uppercase font-bold">Credits:</span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">KES {filteredStats.credits.toLocaleString()}</span>
                                    </div>
                                    <div className="px-2 py-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-700">
                                        <span className="text-slate-500 mr-1 text-[9px] uppercase font-bold">Net:</span>
                                        <span className="font-black text-indigo-600 dark:text-indigo-400">KES {filteredStats.net.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {filteredExisting.length === 0 ? (
                                <div className="p-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                    <Wallet className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                        No Opening Balances Match Filter
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                        Try adjusting your search query, route filter, vehicle filter, or balance nature.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                                            <tr>
                                                <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Commuter / Student</th>
                                                <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Route & Vehicle</th>
                                                <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400">Period Reference</th>
                                                <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">Balance B/F</th>
                                                <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400 text-center">Status</th>
                                                <th className="p-4 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredExisting.map(inv => {
                                                const veh = getInvoiceVehicle(inv);
                                                return (
                                                <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="p-4">
                                                        <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{inv.studentName}</p>
                                                        <p className="text-[10px] font-mono text-slate-400">{inv.admissionNumber || 'No Adm No.'}</p>
                                                    </td>
                                                    <td className="p-4">
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{inv.routeName || 'General Route'}</p>
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md mt-0.5 border border-indigo-100 dark:border-indigo-800/40">
                                                            🚐 {veh}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-500 font-medium">
                                                        {inv.period}
                                                    </td>
                                                    <td className="p-4 text-right font-mono font-black text-sm">
                                                        {inv.balanceType === 'credit' || Boolean(inv.prepaymentAmount && inv.prepaymentAmount > 0) || Boolean(inv.notes && inv.notes.toLowerCase().includes('prepayment')) || (inv.status === 'paid' && !inv.paidDate) ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                                -KES {(inv.finalAmount || inv.amount || 0).toLocaleString()} <span className="text-[10px] uppercase font-black tracking-wider">(Credit)</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-rose-600 dark:text-rose-400 font-bold">
                                                                +KES {(inv.finalAmount || inv.amount || 0).toLocaleString()} <span className="text-[10px] uppercase font-black tracking-wider">(Arrears)</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {inv.balanceType === 'credit' || Boolean(inv.prepaymentAmount && inv.prepaymentAmount > 0) || Boolean(inv.notes && inv.notes.toLowerCase().includes('prepayment')) || (inv.status === 'paid' && !inv.paidDate) ? (
                                                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                                Prepayment (Credit)
                                                            </span>
                                                        ) : (
                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                                inv.status === 'paid' 
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                                            }`}>
                                                                {inv.status === 'paid' ? 'Settled Arrears' : 'Arrears Due'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartEdit(inv)}
                                                                className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 rounded-xl transition-colors cursor-pointer"
                                                                title="Edit opening balance"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            {onDeleteOpeningBalance && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (window.confirm(`Remove opening balance for ${inv.studentName}?`)) {
                                                                            onDeleteOpeningBalance(inv.id);
                                                                        }
                                                                    }}
                                                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-xl transition-colors cursor-pointer"
                                                                    title="Delete opening balance"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 px-6 lg:px-8 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Changes sync automatically to institutional cloud ledger and student invoices</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
