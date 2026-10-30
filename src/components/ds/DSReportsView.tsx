import React, { useState, useEffect, useMemo } from 'react';
import { 
    UsersIcon, 
    TruckIcon, 
    CalendarDaysIcon, 
    AcademicCapIcon, 
    PrinterIcon, 
    SparklesIcon, 
    SearchIcon, 
    XIcon, 
    DownloadIcon,
    ArrowUpTrayIcon,
    EyeIcon,
    BanknotesIcon,
    ChartBarIcon,
    ChartPieIcon,
    ExclamationTriangleIcon,
    TrendingUpIcon,
    PhoneIcon,
    CheckCircleIcon,
    FilterIcon,
    ClockIcon,
    CurrencyIcon, 
    DocumentTextIcon, 
    CreditCardIcon
} from '../icons';
import { generateDSStudentLogbookPDF, generateDSPDF } from '../../utils/dsPdfGenerator';
import { generateStudentStatement } from '../../utils/dsReportGenerator';
import { 
    exportStudentsToExcel, 
    exportInvoicesToExcel, 
    exportReceiptsToExcel, 
    exportCategoriesToExcel, 
    exportVoteheadsToExcel, 
    exportSystemUsersToExcel,
    exportAllDSToExcel,
    formatSystemUserRows,
    exportDebtBalancesToExcel,
    exportIncomeToExcel,
    formatDebtBalanceRows,
    formatIncomeRows
} from './dsExcelExport';
import { apiService } from '../../services/apiService';
import { useToast } from '../../services/ToastContext';
import { PdfViewer } from '../PdfViewer';

interface DSReportsViewProps {
    lessons: any[];
    instructors: any[];
    students: any[];
    vehicles: any[];
    rooms: any[];
    letterheadConfig?: any;
    currentInstitution?: any;
    invoices?: any[];
    payments?: any[];
    expenditures?: any[];
    categories?: any[];
    votes?: any[];
    users?: any[];
    branches?: any[];
    onOpenCompleteImport?: () => void;
}



export const DSReportsView: React.FC<DSReportsViewProps> = ({
    lessons,
    instructors,
    students,
    vehicles,
    rooms,
    letterheadConfig,
    currentInstitution,
    invoices = [],
    payments = [],
    expenditures = [],
    categories = [],
    votes = [],
    users = [],
    branches = [],
    onOpenCompleteImport
}) => {

    const { success, error: toastError, warning: toastWarning } = useToast();



    // Top-level report mode: 'timetables' | 'logbooks'

    // Top-level report mode: 'income' | 'debt_balances' | 'statements' | 'expenditure_summary' | 'timetables' | 'logbooks' | 'excel_exports'
    const [reportMode, setReportMode] = useState<'income' | 'debt_balances' | 'timetables' | 'logbooks' | 'statements' | 'expenditure_summary' | 'excel_exports'>('income');

    // --- INCOME & COLLECTIONS STATE ---
    const [incomeDateFrom, setIncomeDateFrom] = useState('');
    const [incomeDateTo, setIncomeDateTo] = useState('');
    const [incomeBranch, setIncomeBranch] = useState('all');
    const [incomeMethod, setIncomeMethod] = useState('all');
    const [incomeSearch, setIncomeSearch] = useState('');
    const [incomePage, setIncomePage] = useState(1);
    const INCOME_PAGE_SIZE = 15;

    // --- DEBT BALANCES & ARREARS STATE ---
    const [debtSearch, setDebtSearch] = useState('');
    const [debtBranch, setDebtBranch] = useState('all');
    const [debtCategory, setDebtCategory] = useState('all');
    const [debtSeverityFilter, setDebtSeverityFilter] = useState<'with_debt' | 'severe' | 'moderate' | 'minor' | 'cleared' | 'all'>('with_debt');
    const [debtSortBy, setDebtSortBy] = useState<'balance_desc' | 'balance_asc' | 'name' | 'adm'>('balance_desc');
    const [debtPage, setDebtPage] = useState(1);
    const DEBT_PAGE_SIZE = 15;

    // --- FINANCIAL METRICS COMPUTATION ---
    const validPayments = useMemo(() => {
        return (payments || []).filter(p => 
            p.status !== 'Pending Deletion' && 
            p.status !== 'Cancelled' && 
            p.status !== 'Rejected'
        );
    }, [payments]);

    const filteredIncomePayments = useMemo(() => {
        return validPayments.filter(p => {
            const pDate = p.paymentDate || (p.createdAt ? p.createdAt.split('T')[0] : '');
            if (incomeDateFrom && pDate && pDate < incomeDateFrom) return false;
            if (incomeDateTo && pDate && pDate > incomeDateTo) return false;

            if (incomeBranch !== 'all' && (p.branchId || p.branch_id) !== incomeBranch) return false;

            if (incomeMethod !== 'all') {
                const meth = (p.paymentMethod || '').toLowerCase();
                if (incomeMethod === 'm-pesa' && !meth.includes('pesa')) return false;
                if (incomeMethod === 'cash' && !meth.includes('cash')) return false;
                if (incomeMethod === 'bank' && !meth.includes('bank') && !meth.includes('transfer')) return false;
                if (incomeMethod === 'cheque' && !meth.includes('cheque')) return false;
            }

            if (incomeSearch) {
                const q = incomeSearch.toLowerCase();
                const student = (students || []).find(s => s.id === p.studentId);
                const matchesSearch = 
                    (p.receiptNumber || '').toLowerCase().includes(q) ||
                    (p.studentName || student?.fullName || '').toLowerCase().includes(q) ||
                    (student?.admissionNumber || p.admissionNumber || '').toLowerCase().includes(q) ||
                    (p.transactionReference || '').toLowerCase().includes(q);
                if (!matchesSearch) return false;
            }

            return true;
        }).sort((a, b) => {
            const da = new Date(a.paymentDate || a.createdAt || 0).getTime();
            const db = new Date(b.paymentDate || b.createdAt || 0).getTime();
            return db - da;
        });
    }, [validPayments, incomeDateFrom, incomeDateTo, incomeBranch, incomeMethod, incomeSearch, students]);

    const incomeMetrics = useMemo(() => {
        const totalCollected = filteredIncomePayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

        const matchingInvoices = (invoices || []).filter(inv => {
            const iDate = inv.invoiceDate || (inv.createdAt ? inv.createdAt.split('T')[0] : '');
            if (incomeDateFrom && iDate && iDate < incomeDateFrom) return false;
            if (incomeDateTo && iDate && iDate > incomeDateTo) return false;
            if (incomeBranch !== 'all' && (inv.branchId || inv.branch_id) !== incomeBranch) return false;
            return true;
        });

        const totalInvoiced = matchingInvoices.reduce((acc, inv) => {
            const net = Number(inv.totalAmount || 0) - Number(inv.discountAmount || inv.discount_amount || 0) - Number(inv.sponsorAmount || inv.sponsor_amount || 0);
            return acc + Math.max(0, net);
        }, 0);

        const matchingExpenses = (expenditures || []).filter(e => {
            const eDate = e.expenseDate || (e.createdAt ? e.createdAt.split('T')[0] : '');
            if (incomeDateFrom && eDate && eDate < incomeDateFrom) return false;
            if (incomeDateTo && eDate && eDate > incomeDateTo) return false;
            if (incomeBranch !== 'all' && (e.branchId || e.branch_id) !== incomeBranch) return false;
            return true;
        });
        const totalExpenditure = matchingExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

        const netOperatingIncome = totalCollected - totalExpenditure;
        const collectionRate = totalInvoiced > 0 ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100)) : 100;

        const methodCounts: Record<string, { count: number; amount: number }> = {
            'M-Pesa': { count: 0, amount: 0 },
            'Cash': { count: 0, amount: 0 },
            'Bank': { count: 0, amount: 0 },
            'Other': { count: 0, amount: 0 }
        };
        filteredIncomePayments.forEach(p => {
            const m = (p.paymentMethod || '').toLowerCase();
            const amt = Number(p.amount || 0);
            if (m.includes('pesa')) {
                methodCounts['M-Pesa'].count++;
                methodCounts['M-Pesa'].amount += amt;
            } else if (m.includes('cash')) {
                methodCounts['Cash'].count++;
                methodCounts['Cash'].amount += amt;
            } else if (m.includes('bank') || m.includes('transfer') || m.includes('cheque')) {
                methodCounts['Bank'].count++;
                methodCounts['Bank'].amount += amt;
            } else {
                methodCounts['Other'].count++;
                methodCounts['Other'].amount += amt;
            }
        });

        return {
            totalCollected,
            totalInvoiced,
            totalExpenditure,
            netOperatingIncome,
            collectionRate,
            transactionCount: filteredIncomePayments.length,
            methodCounts
        };
    }, [filteredIncomePayments, invoices, expenditures, incomeDateFrom, incomeDateTo, incomeBranch]);

    // --- DEBT / ARREARS COMPUTATION ---
    const studentDebtList = useMemo(() => {
        return (students || []).map(s => {
            const studentId = s.id;
            const adm = s.admissionNumber || s.admission_number || '';
            const name = (s.fullName || s.full_name || '').trim().toLowerCase();

            const studentInvoices = (invoices || []).filter(inv => 
                inv.studentId === studentId || 
                (adm && (inv.admissionNumber || '').trim().toLowerCase() === adm.toLowerCase()) ||
                (name && (inv.studentName || '').trim().toLowerCase() === name)
            );

            const totalInvoiced = studentInvoices.reduce((acc, inv) => acc + Number(inv.totalAmount || 0), 0);
            const totalDiscount = studentInvoices.reduce((acc, inv) => acc + Number(inv.discountAmount || inv.discount_amount || 0), 0);
            const totalSponsor = studentInvoices.reduce((acc, inv) => acc + Number(inv.sponsorAmount || inv.sponsor_amount || 0), 0);
            const netInvoiced = Math.max(0, totalInvoiced - totalDiscount - totalSponsor);

            const studentPayments = (payments || []).filter(p => 
                (p.studentId === studentId ||
                (adm && (p.admissionNumber || '').trim().toLowerCase() === adm.toLowerCase()) ||
                (name && (p.studentName || '').trim().toLowerCase() === name) ||
                studentInvoices.some(inv => inv.id === p.invoiceId)) &&
                p.status !== 'Pending Deletion' && p.status !== 'Cancelled' && p.status !== 'Rejected'
            );

            const totalPaid = studentPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
            const balance = Math.max(0, netInvoiced - totalPaid);

            const sortedPayments = [...studentPayments].sort((a, b) => {
                const da = new Date(a.paymentDate || a.createdAt || 0).getTime();
                const db = new Date(b.paymentDate || b.createdAt || 0).getTime();
                return db - da;
            });
            const lastPaymentDate = sortedPayments[0]?.paymentDate || sortedPayments[0]?.createdAt?.split('T')[0] || null;

            let severity: 'severe' | 'moderate' | 'minor' | 'cleared' = 'cleared';
            if (balance > 15000) severity = 'severe';
            else if (balance >= 5000) severity = 'moderate';
            else if (balance > 0) severity = 'minor';

            const branch = (branches || []).find(b => b.id === (s.branchId || s.branch_id));
            const completionRate = netInvoiced > 0 ? Math.min(100, Math.round((totalPaid / netInvoiced) * 100)) : (totalPaid > 0 ? 100 : 0);

            return {
                student: s,
                id: s.id,
                fullName: s.fullName || s.full_name || 'Unnamed Student',
                admissionNumber: s.admissionNumber || s.admission_number || '',
                phone: s.phone || s.phoneNumber || s.phone_number || '',
                category: s.licenseTypeInterested || s.licenseCategory || 'Standard',
                branchName: branch?.name || 'Main Campus',
                branchId: s.branchId || s.branch_id,
                netInvoiced,
                totalPaid,
                balance,
                completionRate,
                lastPaymentDate,
                severity,
                status: s.status || 'Enrolled',
                enrollmentDate: s.enrollmentDate ? s.enrollmentDate.split('T')[0] : ''
            };
        });
    }, [students, invoices, payments, branches]);

    const filteredDebtList = useMemo(() => {
        return studentDebtList.filter(item => {
            if (debtSearch) {
                const q = debtSearch.toLowerCase();
                const matches = 
                    item.fullName.toLowerCase().includes(q) ||
                    item.admissionNumber.toLowerCase().includes(q) ||
                    item.phone.toLowerCase().includes(q);
                if (!matches) return false;
            }

            if (debtBranch !== 'all' && item.branchId !== debtBranch) return false;
            if (debtCategory !== 'all' && item.category !== debtCategory) return false;

            if (debtSeverityFilter === 'with_debt' && item.balance <= 0) return false;
            if (debtSeverityFilter === 'severe' && item.severity !== 'severe') return false;
            if (debtSeverityFilter === 'moderate' && item.severity !== 'moderate') return false;
            if (debtSeverityFilter === 'minor' && item.severity !== 'minor') return false;
            if (debtSeverityFilter === 'cleared' && item.balance > 0) return false;

            return true;
        }).sort((a, b) => {
            if (debtSortBy === 'balance_desc') return b.balance - a.balance;
            if (debtSortBy === 'balance_asc') return a.balance - b.balance;
            if (debtSortBy === 'name') return a.fullName.localeCompare(b.fullName);
            if (debtSortBy === 'adm') return a.admissionNumber.localeCompare(b.admissionNumber);
            return 0;
        });
    }, [studentDebtList, debtSearch, debtBranch, debtCategory, debtSeverityFilter, debtSortBy]);

    const debtMetrics = useMemo(() => {
        const totalDebt = studentDebtList.reduce((acc, it) => acc + it.balance, 0);
        const debtorsCount = studentDebtList.filter(it => it.balance > 0).length;
        const clearedCount = studentDebtList.filter(it => it.netInvoiced > 0 && it.balance <= 0).length;
        const severeCount = studentDebtList.filter(it => it.severity === 'severe').length;
        const severeDebtTotal = studentDebtList.filter(it => it.severity === 'severe').reduce((acc, it) => acc + it.balance, 0);
        const totalInvoicedAll = studentDebtList.reduce((acc, it) => acc + it.netInvoiced, 0);
        const totalPaidAll = studentDebtList.reduce((acc, it) => acc + it.totalPaid, 0);

        return {
            totalDebt,
            debtorsCount,
            clearedCount,
            severeCount,
            severeDebtTotal,
            totalInvoicedAll,
            totalPaidAll,
            avgDebtPerDebtor: debtorsCount > 0 ? Math.round(totalDebt / debtorsCount) : 0,
            debtPercentOfInvoiced: totalInvoicedAll > 0 ? Math.round((totalDebt / totalInvoicedAll) * 100) : 0
        };
    }, [studentDebtList]);

    const generateStatementForStudent = async (studentId: string) => {
        setSelectedStatementStudentId(studentId);
        setReportMode('statements');
        const student = (students || []).find((s: any) => s.id === studentId);
        if (!student) return;
        setIsGeneratingStatement(true);
        try {
            const sInvoices = (invoices || []).filter((i: any) => i.studentId === studentId);
            const sPayments = (payments || []).filter((p: any) => p.studentId === studentId);
            const doc = await generateStudentStatement(student, sInvoices, sPayments, currentInstitution);
            const dataUrl = doc.output('datauristring');
            setStatementPreviewUrl(dataUrl);
            success(`Loaded financial statement for ${student.fullName}`);
        } catch (err) {
            console.error(err);
            toastError("Failed to generate statement preview");
        } finally {
            setIsGeneratingStatement(false);
        }
    };

    const handleSendBalanceReminderSms = async (item: typeof studentDebtList[0]) => {
        if (!item.phone) {
            toastError("Student has no contact phone number on record.");
            return;
        }
        const instName = currentInstitution?.name || 'Driving School';
        const msg = `Dear ${item.fullName}, reminder from ${instName}: you have an outstanding fee balance of KES ${item.balance.toLocaleString()}. Kindly clear to keep your driving lessons on schedule. Thank you.`;
        if (!window.confirm(`Send Fee Reminder SMS to ${item.fullName} (${item.phone})?\n\n"${msg}"`)) {
            return;
        }
        const currentBal = currentInstitution?.smsBalance ?? currentInstitution?.sms_balance ?? 0;
        if (currentBal < 1) {
            await apiService.saveToSmsOutbox([{
                id: `ob_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                institutionId: currentInstitution?.id,
                institution_id: currentInstitution?.id,
                recipient: item.phone,
                recipientName: item.fullName,
                message: msg,
                units: 1,
                status: 'pending',
                reason: `Insufficient SMS balance (${currentBal} available, 1 required)`,
                source: `Fee Reminder: ${item.fullName}`,
                createdAt: new Date().toISOString()
            }]);
            toastWarning(`Insufficient SMS units. Fee reminder for ${item.fullName} has been moved to Outbox.`);
            return;
        }

        try {
            await apiService.sendSms(item.phone, msg, undefined, 1, currentInstitution?.id);
            success(`Fee balance reminder SMS sent to ${item.fullName}!`);
        } catch (err: any) {
            console.error("SMS send error:", err);
            window.open(`sms:${item.phone}?body=${encodeURIComponent(msg)}`);
            success(`Opened device SMS for ${item.fullName}`);
        }
    };
    const [expRepDateFrom, setExpRepDateFrom] = useState('');
    const [expRepDateTo, setExpRepDateTo] = useState('');
    const [expRepCategory, setExpRepCategory] = useState('all');

    // State for Financial Statements
    const [selectedStatementStudentId, setSelectedStatementStudentId] = useState<string>('');
    const [statementPreviewUrl, setStatementPreviewUrl] = useState<string | null>(null);
    const [isGeneratingStatement, setIsGeneratingStatement] = useState<boolean>(false);

    // Generate Financial Statement Handler
    const handleGenerateStatement = async (preview: boolean) => {
        if (!selectedStatementStudentId) {
            toastError("Please select a student first.");
            return;
        }
        const student = (students || []).find((s: any) => s.id === selectedStatementStudentId);
        if (!student) {
            toastError("Selected student not found.");
            return;
        }

        setIsGeneratingStatement(true);
        try {
            const sInvoices = (invoices || []).filter((i: any) => i.studentId === selectedStatementStudentId);
            const sPayments = (payments || []).filter((p: any) => p.studentId === selectedStatementStudentId);
            
            const doc = await generateStudentStatement(student, sInvoices, sPayments, currentInstitution);
            if (preview) {
                const dataUrl = doc.output('datauristring');
                setStatementPreviewUrl(dataUrl);
                success("Financial statement preview updated!");
            } else {
                doc.save(`${student.fullName.replace(/\s+/g, '_')}_Statement.pdf`);
                success("Financial statement PDF downloaded successfully!");
            }
        } catch (err) {
            console.error(err);
            toastError("Failed to generate financial statement PDF.");
        } finally {
            setIsGeneratingStatement(false);
        }
    };



    // State for Instructor Timetables

    const [mode, setMode] = useState<'single' | 'bulk'>('single');

    const [selectedInstructorId, setSelectedInstructorId] = useState<string>('');

    const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

    const [endDate, setEndDate] = useState<string>(() => {

        const d = new Date();

        d.setDate(d.getDate() + 7);

        return d.toISOString().split('T')[0];

    });

    const [generatedReport, setGeneratedReport] = useState<any | null>(null);



    // State for Student NTSA Logbooks

    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    const [studentSearch, setStudentSearch] = useState<string>('');

    const [logbookPreviewUrl, setLogbookPreviewUrl] = useState<string | null>(null);

    const [isGeneratingLogbook, setIsGeneratingLogbook] = useState<boolean>(false);



    useEffect(() => {

        if (mode === 'single' && !selectedInstructorId && (instructors || []).length > 0) {

            setSelectedInstructorId(instructors[0].id);

        }

    }, [mode, instructors, selectedInstructorId]);



    // Generate Timetable Handler

    const handleGenerateTimetable = () => {

        const targetInstructors = mode === 'bulk' 

            ? (instructors || []) 

            : (instructors || []).filter(i => i.id === selectedInstructorId);



        const validLessons = (lessons || []).filter(l => {

            if (l.lessonDate < startDate || l.lessonDate > endDate) return false;

            return true;

        });



        const reportData = targetInstructors.map(inst => {

            const instLessons = (validLessons || []).filter(l => l.instructorId === inst.id);

            instLessons.sort((a, b) => {

                if (a.lessonDate !== b.lessonDate) return a.lessonDate.localeCompare(b.lessonDate);

                return (a.startTime || '').localeCompare(b.startTime || '');

            });



            const totalSessions = instLessons.length;

            const practicalSessions = (instLessons || []).filter(l => !l.lessonType || l.lessonType === 'Practical').length;

            const theorySessions = (instLessons || []).filter(l => l.lessonType === 'Theory').length;



            return {

                instructor: inst,

                lessons: instLessons,

                stats: {

                    totalSessions,

                    practicalSessions,

                    theorySessions

                }

            };

        });



        setGeneratedReport({

            mode,

            startDate,

            endDate,

            generatedAt: new Date().toISOString(),

            data: reportData

        });

    };



    // Generate NTSA Logbook Handler

    const handleGenerateLogbook = async (preview: boolean) => {

        if (!selectedStudentId) {

            toastError("Please select a student first.");

            return;

        }



        const student = (students || []).find(s => s.id === selectedStudentId);

        if (!student) {

            toastError("Selected student not found.");

            return;

        }



        setIsGeneratingLogbook(true);

        try {

            const doc = await generateDSStudentLogbookPDF(

                student, 

                lessons || [], 

                instructors || [], 

                currentInstitution, 

                letterheadConfig

            );



            if (preview) {

                const dataUrl = doc.output('datauristring');

                setLogbookPreviewUrl(dataUrl);

                success("NTSA Logbook preview updated!");

            } else {

                doc.save(`Logbook_${student.admissionNumber || student.fullName.replace(/\s+/g, '_')}.pdf`);

                success("NTSA Logbook PDF downloaded successfully!");

            }

        } catch (err) {

            console.error(err);

            toastError("Failed to generate NTSA Training Logbook PDF.");

        } finally {

            setIsGeneratingLogbook(false);

        }

    };



    // Filter students list based on search query

    const filteredStudents = useMemo(() => {

        return (students || []).filter(s => 

            (s.fullName || '').toLowerCase().includes(studentSearch.toLowerCase()) || 

            (s.admissionNumber || '').toLowerCase().includes(studentSearch.toLowerCase())

        );

    }, [students, studentSearch]);



    return (

        <div className="space-y-8 animate-fade-in print:space-y-0">

            {/* Top-Level Mode Selector Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl max-w-full overflow-x-auto scrollbar-hide w-fit print:hidden gap-1">
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('income');
                        setLogbookPreviewUrl(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        reportMode === 'income' 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <BanknotesIcon className="w-3.5 h-3.5" />
                    Income & Collections
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('debt_balances');
                        setLogbookPreviewUrl(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        reportMode === 'debt_balances' 
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <CreditCardIcon className="w-3.5 h-3.5" />
                    Debt Balances & Arrears
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('statements');
                        setGeneratedReport(null);
                        setLogbookPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        reportMode === 'statements' 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <DocumentTextIcon className="w-3.5 h-3.5" />
                    Financial Statements
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('expenditure_summary');
                        setGeneratedReport(null);
                        setLogbookPreviewUrl(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        reportMode === 'expenditure_summary' 
                            ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <CurrencyIcon className="w-3.5 h-3.5" />
                    Expenditure Reports
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('timetables');
                        setLogbookPreviewUrl(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        reportMode === 'timetables' 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                    Instructor Timetables
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('logbooks');
                        setGeneratedReport(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        reportMode === 'logbooks' 
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm scale-105' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <AcademicCapIcon className="w-3.5 h-3.5" />
                    Student NTSA Logbooks
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setReportMode('excel_exports');
                        setGeneratedReport(null);
                        setLogbookPreviewUrl(null);
                        setStatementPreviewUrl(null);
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${reportMode === 'excel_exports' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                >
                    <DownloadIcon className="w-3.5 h-3.5" />
                    Excel Data Exports
                </button>
            </div>



            
            {/* Mode 0A: Income & Collections Report */}
            {reportMode === 'income' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Header & Quick Action Buttons */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                                    Financial Audit & Revenue
                                </span>
                                <span className="text-xs text-slate-400 font-bold">
                                    {incomeMetrics.transactionCount} Collections Logged
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Income & Collections Report
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                Comprehensive ledger of tuition fees received, payment gateway channels, cashier receipts, and operational surplus.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        const fname = exportIncomeToExcel(filteredIncomePayments, students, invoices, branches, currentInstitution?.name);
                                        success(`Downloaded: ${fname}`);
                                    } catch (err: any) {
                                        toastError(err?.message || "Failed to export income spreadsheet");
                                    }
                                }}
                                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Export Income Excel
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                <PrinterIcon className="w-4 h-4" />
                                Print Ledger
                            </button>
                        </div>
                    </div>

                    {/* Filter Ribbon */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-1">Period Presets:</span>
                                {[
                                    { label: 'All Time', from: '', to: '' },
                                    { label: 'Today', from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] },
                                    { 
                                        label: 'This Month', 
                                        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                                        to: new Date().toISOString().split('T')[0]
                                    },
                                    { 
                                        label: 'This Year', 
                                        from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                                        to: new Date().toISOString().split('T')[0]
                                    }
                                ].map(p => {
                                    const isActive = incomeDateFrom === p.from && incomeDateTo === p.to;
                                    return (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onClick={() => {
                                                setIncomeDateFrom(p.from);
                                                setIncomeDateTo(p.to);
                                                setIncomePage(1);
                                            }}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                                isActive 
                                                    ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {(incomeDateFrom || incomeDateTo || incomeBranch !== 'all' || incomeMethod !== 'all' || incomeSearch) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIncomeDateFrom('');
                                        setIncomeDateTo('');
                                        setIncomeBranch('all');
                                        setIncomeMethod('all');
                                        setIncomeSearch('');
                                        setIncomePage(1);
                                    }}
                                    className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest hover:underline flex items-center gap-1"
                                >
                                    <XIcon className="w-3.5 h-3.5" />
                                    Reset All Filters
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date From</label>
                                <input
                                    type="date"
                                    value={incomeDateFrom}
                                    onChange={e => { setIncomeDateFrom(e.target.value); setIncomePage(1); }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Date To</label>
                                <input
                                    type="date"
                                    value={incomeDateTo}
                                    onChange={e => { setIncomeDateTo(e.target.value); setIncomePage(1); }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Payment Method</label>
                                <select
                                    value={incomeMethod}
                                    onChange={e => { setIncomeMethod(e.target.value); setIncomePage(1); }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="all">All Payment Methods</option>
                                    <option value="m-pesa">M-Pesa Mobile Money</option>
                                    <option value="cash">Cash Handover</option>
                                    <option value="bank">Bank Wire / Deposit</option>
                                    <option value="cheque">Bank Cheque</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Branch / Campus</label>
                                <select
                                    value={incomeBranch}
                                    onChange={e => { setIncomeBranch(e.target.value); setIncomePage(1); }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="all">All Branches & Campuses</option>
                                    {(branches || []).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="relative pt-2">
                            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
                            <input
                                type="text"
                                value={incomeSearch}
                                onChange={e => { setIncomeSearch(e.target.value); setIncomePage(1); }}
                                placeholder="Search receipt #, student name, admission number, transaction reference code..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Executive Income Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Income Collected</span>
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <BanknotesIcon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                KES {incomeMetrics.totalCollected.toLocaleString()}
                            </div>
                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                <CheckCircleIcon className="w-3.5 h-3.5" />
                                {incomeMetrics.transactionCount} transactions posted
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Invoiced (Period)</span>
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <DocumentTextIcon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                KES {incomeMetrics.totalInvoiced.toLocaleString()}
                            </div>
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                    <span>Collection Rate</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">{incomeMetrics.collectionRate}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${Math.min(100, incomeMetrics.collectionRate)}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operating Expenses</span>
                                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                    <CurrencyIcon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                KES {incomeMetrics.totalExpenditure.toLocaleString()}
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 mt-1">
                                Fuel, maintenance, rent & operations
                            </p>
                        </div>

                        <div className={`p-6 rounded-[2.5rem] border shadow-sm relative overflow-hidden group ${
                            incomeMetrics.netOperatingIncome >= 0 
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-emerald-400/30' 
                                : 'bg-gradient-to-br from-rose-600 to-red-800 text-white border-rose-400/30'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Net Operating Surplus</span>
                                <div className="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center">
                                    <TrendingUpIcon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black tracking-tight">
                                KES {incomeMetrics.netOperatingIncome.toLocaleString()}
                            </div>
                            <p className="text-[11px] font-bold text-white/90 mt-1">
                                {incomeMetrics.netOperatingIncome >= 0 ? 'Operating Profit Surplus' : 'Operating Deficit'}
                            </p>
                        </div>
                    </div>

                    {/* Payment Channel Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { name: 'M-Pesa Mobile', key: 'M-Pesa', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
                            { name: 'Cash Handover', key: 'Cash', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
                            { name: 'Bank Transfer', key: 'Bank', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
                            { name: 'Cheque / Other', key: 'Other', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' }
                        ].map(ch => {
                            const data = incomeMetrics.methodCounts[ch.key] || { count: 0, amount: 0 };
                            const pct = incomeMetrics.totalCollected > 0 ? Math.round((data.amount / incomeMetrics.totalCollected) * 100) : 0;
                            return (
                                <div key={ch.key} className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{ch.name}</span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${ch.bg} ${ch.color}`}>{pct}%</span>
                                    </div>
                                    <div className="text-lg font-black text-slate-900 dark:text-white">
                                        KES {data.amount.toLocaleString()}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold">{data.count} receipts</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Income Ledger Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Receipts & Payment Ledger</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Showing {filteredIncomePayments.length} transactions based on selected criteria</p>
                            </div>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                Subtotal: KES {filteredIncomePayments.reduce((acc, p) => acc + Number(p.amount || 0), 0).toLocaleString()}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <th className="py-4 px-6">Receipt #</th>
                                        <th className="py-4 px-6">Date</th>
                                        <th className="py-4 px-6">Student / Admission</th>
                                        <th className="py-4 px-6">Method</th>
                                        <th className="py-4 px-6">Reference Code</th>
                                        <th className="py-4 px-6">Campus</th>
                                        <th className="py-4 px-6">Received By</th>
                                        <th className="py-4 px-6 text-right">Amount (KES)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                                    {filteredIncomePayments.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400">
                                                No income transactions match the current filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredIncomePayments
                                            .slice((incomePage - 1) * INCOME_PAGE_SIZE, incomePage * INCOME_PAGE_SIZE)
                                            .map((p, idx) => {
                                                const student = (students || []).find(s => s.id === p.studentId);
                                                const branch = (branches || []).find(b => b.id === (p.branchId || p.branch_id));
                                                const meth = (p.paymentMethod || 'M-Pesa').toLowerCase();
                                                
                                                let badgeStyle = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                                                if (meth.includes('pesa')) badgeStyle = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
                                                else if (meth.includes('cash')) badgeStyle = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
                                                else if (meth.includes('bank')) badgeStyle = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800';

                                                return (
                                                    <tr key={p.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-4 px-6 font-mono font-bold text-slate-900 dark:text-white">
                                                            {p.receiptNumber || 'REC-N/A'}
                                                        </td>
                                                        <td className="py-4 px-6 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                            {p.paymentDate || (p.createdAt ? p.createdAt.split('T')[0] : '')}
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="font-bold text-slate-900 dark:text-white">
                                                                {p.studentName || student?.fullName || 'Anonymous / Walk-in'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                {student?.admissionNumber || p.admissionNumber || 'ADM-N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${badgeStyle}`}>
                                                                {p.paymentMethod || 'M-Pesa'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                                                            {p.transactionReference || p.reference || 'N/A'}
                                                        </td>
                                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-[11px]">
                                                            {branch?.name || 'Main Campus'}
                                                        </td>
                                                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-[11px]">
                                                            {p.receivedBy || 'Accounts Officer'}
                                                        </td>
                                                        <td className="py-4 px-6 text-right font-black text-slate-900 dark:text-white text-sm">
                                                            KES {Number(p.amount || 0).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {filteredIncomePayments.length > INCOME_PAGE_SIZE && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>
                                    Page {incomePage} of {Math.ceil(filteredIncomePayments.length / INCOME_PAGE_SIZE)}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={incomePage <= 1}
                                        onClick={() => setIncomePage(prev => Math.max(1, prev - 1))}
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        disabled={incomePage * INCOME_PAGE_SIZE >= filteredIncomePayments.length}
                                        onClick={() => setIncomePage(prev => prev + 1)}
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mode 0B: Debt Balances & Fee Arrears Report */}
            {reportMode === 'debt_balances' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Header & Quick Action Buttons */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-full text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">
                                    Fee Recovery & Arrears
                                </span>
                                <span className="text-xs text-slate-400 font-bold">
                                    {debtMetrics.debtorsCount} Students with Balances
                                </span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Student Debt Balances & Fee Arrears
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">
                                Monitor uncollected course fees, student aging balances, collection progress, and generate official statements.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => {
                                    try {
                                        const fname = exportDebtBalancesToExcel(
                                            filteredDebtList.map(d => d.student), 
                                            invoices, 
                                            payments, 
                                            branches, 
                                            currentInstitution?.name
                                        );
                                        success(`Downloaded: ${fname}`);
                                    } catch (err: any) {
                                        toastError(err?.message || "Failed to export debt balances spreadsheet");
                                    }
                                }}
                                className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Export Debtors Excel
                            </button>
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                <PrinterIcon className="w-4 h-4" />
                                Print Collection Sheet
                            </button>
                        </div>
                    </div>

                    {/* Executive Debt Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Outstanding Debt</span>
                                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                    <CreditCardIcon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                                KES {debtMetrics.totalDebt.toLocaleString()}
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 mt-1">
                                {debtMetrics.debtPercentOfInvoiced}% of total invoiced revenue
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Students In Debt</span>
                                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <UsersIcon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {debtMetrics.debtorsCount} Students
                            </div>
                            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                                Avg. KES {debtMetrics.avgDebtPerDebtor.toLocaleString()} per debtor
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fully Cleared Students</span>
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <CheckCircleIcon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {debtMetrics.clearedCount} Students
                            </div>
                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                Zero balance / Course paid in full
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-red-600/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Severe Arrears (&gt; 15k)</span>
                                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">
                                KES {debtMetrics.severeDebtTotal.toLocaleString()}
                            </div>
                            <p className="text-[11px] font-bold text-red-600 dark:text-red-400 mt-1">
                                High risk across {debtMetrics.severeCount} learners
                            </p>
                        </div>
                    </div>

                    {/* Filter Ribbon */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Debt Severity</label>
                                <select
                                    value={debtSeverityFilter}
                                    onChange={e => { setDebtSeverityFilter(e.target.value as any); setDebtPage(1); }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="with_debt">All with Balances (Debt &gt; 0)</option>
                                    <option value="severe">Severe Debt (&gt; KES 15,000)</option>
                                    <option value="moderate">Moderate Debt (KES 5k - 15k)</option>
                                    <option value="minor">Minor Balance (&lt; KES 5,000)</option>
                                    <option value="cleared">Fully Cleared (Zero Balance)</option>
                                    <option value="all">All Students (Regardless of Balance)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Branch / Campus</label>
                                <select
                                    value={debtBranch}
                                    onChange={e => { setDebtBranch(e.target.value); setDebtPage(1); }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="all">All Campuses</option>
                                    {(branches || []).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">License Category</label>
                                <select
                                    value={debtCategory}
                                    onChange={e => { setDebtCategory(e.target.value); setDebtPage(1); }}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="all">All License Categories</option>
                                    {(categories || []).map((cat: any) => (
                                        <option key={cat.code || cat.name} value={cat.code || cat.name}>
                                            {cat.name} ({cat.code || 'DL'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Sort Ordering</label>
                                <select
                                    value={debtSortBy}
                                    onChange={e => setDebtSortBy(e.target.value as any)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white"
                                >
                                    <option value="balance_desc">Highest Balance First</option>
                                    <option value="balance_asc">Lowest Balance First</option>
                                    <option value="name">Student Name (A-Z)</option>
                                    <option value="adm">Admission Number</option>
                                </select>
                            </div>
                        </div>

                        <div className="relative pt-2">
                            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
                            <input
                                type="text"
                                value={debtSearch}
                                onChange={e => { setDebtSearch(e.target.value); setDebtPage(1); }}
                                placeholder="Search by student full name, admission number, or phone number..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-rose-500"
                            />
                        </div>
                    </div>

                    {/* Debt Balances Ledger Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Debtors & Fee Aging</h4>
                                <p className="text-[11px] text-slate-400 font-medium">Showing {filteredDebtList.length} students matching criteria</p>
                            </div>
                            <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                                Total Debt: KES {filteredDebtList.reduce((acc, it) => acc + it.balance, 0).toLocaleString()}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        <th className="py-4 px-6">Student</th>
                                        <th className="py-4 px-6">Contact</th>
                                        <th className="py-4 px-6">Course & Campus</th>
                                        <th className="py-4 px-6 text-right">Course Fee</th>
                                        <th className="py-4 px-6 text-right">Total Paid</th>
                                        <th className="py-4 px-6 text-right">Debt Balance</th>
                                        <th className="py-4 px-6">Progress</th>
                                        <th className="py-4 px-6 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium">
                                    {filteredDebtList.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400">
                                                No students found matching current debt filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDebtList
                                            .slice((debtPage - 1) * DEBT_PAGE_SIZE, debtPage * DEBT_PAGE_SIZE)
                                            .map((item, idx) => {
                                                const initials = (item.fullName || 'ST')
                                                    .split(' ')
                                                    .map((n: string) => n[0])
                                                    .slice(0, 2)
                                                    .join('')
                                                    .toUpperCase();

                                                let sevBadge = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
                                                if (item.severity === 'severe') sevBadge = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
                                                else if (item.severity === 'moderate') sevBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
                                                else if (item.severity === 'minor') sevBadge = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
                                                else if (item.severity === 'cleared') sevBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';

                                                return (
                                                    <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 font-black text-[11px] text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                                                                    {initials}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                                        {item.fullName}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 font-mono">
                                                                        {item.admissionNumber || 'ADM-N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            {item.phone ? (
                                                                <a 
                                                                    href={`tel:${item.phone}`}
                                                                    className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-mono text-[11px] flex items-center gap-1"
                                                                >
                                                                    <PhoneIcon className="w-3 h-3 text-slate-400" />
                                                                    {item.phone}
                                                                </a>
                                                            ) : (
                                                                <span className="text-slate-400 italic text-[11px]">No contact</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                                                                {item.category}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400">
                                                                {item.branchName}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-right font-medium text-slate-700 dark:text-slate-300 text-xs">
                                                            KES {item.netInvoiced.toLocaleString()}
                                                        </td>
                                                        <td className="py-4 px-6 text-right font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                                                            KES {item.totalPaid.toLocaleString()}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <span className={`inline-block px-3 py-1 rounded-xl font-black text-xs ${
                                                                item.balance > 0 
                                                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900' 
                                                                    : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                                                            }`}>
                                                                KES {item.balance.toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6 min-w-[120px]">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center justify-between text-[10px] font-bold">
                                                                    <span className="text-slate-400">{item.completionRate}%</span>
                                                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${sevBadge}`}>
                                                                        {item.severity}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full transition-all ${item.completionRate >= 100 ? 'bg-emerald-500' : item.completionRate >= 50 ? 'bg-indigo-500' : 'bg-rose-500'}`} 
                                                                        style={{ width: `${item.completionRate}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => generateStatementForStudent(item.id)}
                                                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all"
                                                                    title="Generate and preview student statement"
                                                                >
                                                                    Statement
                                                                </button>
                                                                {item.balance > 0 && item.phone && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSendBalanceReminderSms(item)}
                                                                        className="p-1.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 rounded-xl transition-all"
                                                                        title="Send SMS balance reminder"
                                                                    >
                                                                        <PhoneIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {filteredDebtList.length > DEBT_PAGE_SIZE && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500">
                                <span>
                                    Page {debtPage} of {Math.ceil(filteredDebtList.length / DEBT_PAGE_SIZE)}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={debtPage <= 1}
                                        onClick={() => setDebtPage(prev => Math.max(1, prev - 1))}
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        disabled={debtPage * DEBT_PAGE_SIZE >= filteredDebtList.length}
                                        onClick={() => setDebtPage(prev => prev + 1)}
                                        className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

{/* Mode 1: Instructor Timetables */}

            {reportMode === 'timetables' && (

                <>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm print:hidden">

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">

                            <div>

                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Instructor Timetables</h3>

                                <p className="text-xs font-medium text-slate-400 mt-1">Generate dynamic timetables for individual instructors or bulk-export schedules across the entire staff.</p>

                            </div>

                            <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700 w-fit">

                                <button

                                    type="button"

                                    onClick={() => setMode('single')}

                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${

                                        mode === 'single' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'

                                    }`}

                                >

                                    Single Instructor

                                </button>

                                <button

                                    type="button"

                                    onClick={() => setMode('bulk')}

                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${

                                        mode === 'bulk' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'

                                    }`}

                                >

                                    Bulk Generation

                                </button>

                            </div>

                        </div>



                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">

                            {mode === 'single' ? (

                                <div className="space-y-2">

                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Instructor</label>

                                    <select

                                        value={selectedInstructorId}

                                        onChange={e => setSelectedInstructorId(e.target.value)}

                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"

                                    >

                                        {(instructors || []).map(i => (

                                            <option key={i.id} value={i.id}>{i.name} ({i.instructorType || 'Practical'})</option>

                                        ))}

                                    </select>

                                </div>

                            ) : (

                                <div className="space-y-2">

                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Scope</label>

                                    <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-indigo-600 flex items-center gap-2">

                                        <UsersIcon className="w-4 h-4" />

                                        <span>All {(instructors || []).length} Registered Instructors</span>

                                    </div>

                                </div>

                            )}



                            <div className="space-y-2">

                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>

                                <input

                                    type="date"

                                    value={startDate}

                                    onChange={e => setStartDate(e.target.value)}

                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"

                                />

                            </div>



                            <div className="space-y-2">

                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>

                                <input

                                    type="date"

                                    value={endDate}

                                    onChange={e => setEndDate(e.target.value)}

                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-900 dark:text-slate-100"

                                />

                            </div>

                        </div>



                        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">

                            {generatedReport && (

                                <button

                                    type="button"

                                    onClick={() => window.print()}

                                    className="px-6 py-3.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"

                                >

                                    <PrinterIcon className="w-4 h-4" />

                                    Print Schedules

                                </button>

                            )}

                            <button

                                type="button"

                                onClick={handleGenerateTimetable}

                                className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"

                            >

                                <SparklesIcon className="w-4 h-4" />

                                Generate Timetable

                            </button>

                        </div>

                    </div>



                    {/* Generated Timetable Output Container */}

                    {generatedReport && (

                        <div className="space-y-12 print:space-y-8">

                            {/* Printable Branded Header */}

                            <div className="hidden print:block border-b border-slate-200 pb-6 mb-6">

                                {letterheadConfig?.headerImageUrl && (

                                    <div className="w-full max-h-32 flex items-center justify-center overflow-hidden mb-4">

                                        <img src={letterheadConfig.headerImageUrl} alt="Letterhead" className="object-contain max-h-32" />

                                    </div>

                                )}

                                <div className="text-center">

                                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">{currentInstitution?.name || 'Driving School'}</h2>

                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">

                                        Instructor Timetable Report ({mode === 'bulk' ? 'Bulk Export' : 'Individual'})

                                    </p>

                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">

                                        Period: {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}

                                    </p>

                                </div>

                            </div>



                            {generatedReport.data.map((reportItem: any) => (

                                <div key={reportItem.instructor.id} className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm print:border-none print:shadow-none print:p-0 print:mb-12 print:break-inside-avoid print:bg-transparent">

                                    {/* Instructor Card Section */}

                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 print:bg-transparent print:border-b print:rounded-none print:p-0 print:pb-4">

                                        <div className="flex items-center gap-4">

                                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg print:hidden">

                                                {reportItem.instructor.name.charAt(0)}

                                            </div>

                                            <div>

                                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight print:text-black">{reportItem.instructor.name}</h4>

                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-0.5 print:text-slate-600">

                                                    {reportItem.instructor.instructorType || 'Driving Instructor'} • {reportItem.instructor.specialization || 'General'}

                                                </p>

                                            </div>

                                        </div>

                                        <div className="flex flex-wrap gap-4">

                                            <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center print:border-none print:p-0">

                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block print:inline print:mr-1">Total Sessions:</span>

                                                <span className="text-xs font-black text-slate-900 dark:text-white print:inline print:text-black">{reportItem.stats.totalSessions}</span>

                                            </div>

                                            <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center print:border-none print:p-0">

                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block print:inline print:mr-1">Practical:</span>

                                                <span className="text-xs font-black text-emerald-600 print:inline">{reportItem.stats.practicalSessions}</span>

                                            </div>

                                            <div className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center print:border-none print:p-0">

                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block print:inline print:mr-1">Theory:</span>

                                                <span className="text-xs font-black text-indigo-600 print:inline">{reportItem.stats.theorySessions}</span>

                                            </div>

                                        </div>

                                    </div>



                                    {/* Timeline/Table of Sessions */}

                                    {reportItem.lessons.length === 0 ? (

                                        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl print:hidden">

                                            <p className="text-xs text-slate-400 italic">No scheduled lessons for this instructor in the selected period.</p>

                                        </div>

                                    ) : (

                                        <div className="overflow-x-auto print:overflow-visible">

                                            <table className="w-full text-left border-collapse print:text-black">

                                                <thead>

                                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-widest print:border-slate-400">

                                                        <th className="py-3 px-4 print:px-2">Date</th>

                                                        <th className="py-3 px-4 print:px-2">Time Slot</th>

                                                        <th className="py-3 px-4 print:px-2">Student</th>

                                                        <th className="py-3 px-4 print:px-2">Type</th>

                                                        <th className="py-3 px-4 print:px-2">Resource/Asset</th>

                                                        <th className="py-3 px-4 print:px-2 text-right">Status</th>

                                                    </tr>

                                                </thead>

                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 text-xs font-bold print:divide-slate-200">

                                                    {reportItem.lessons.map((lesson: any) => {

                                                        const student = (students || []).find(s => s.id === lesson.studentId);

                                                        const vehicle = (vehicles || []).find(v => v.id === lesson.vehicleId);

                                                        const isTheory = lesson.lessonType === 'Theory';

                                                        

                                                        return (

                                                            <tr key={lesson.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors print:hover:bg-transparent print:break-inside-avoid">

                                                                <td className="py-3 px-4 print:px-2 whitespace-nowrap text-slate-900 dark:text-white print:text-black print:py-2">

                                                                    {new Date(lesson.lessonDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 whitespace-nowrap text-indigo-600 dark:text-indigo-400 font-black print:text-black print:py-2">

                                                                    {lesson.startTime} — {lesson.endTime}

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 text-slate-700 dark:text-slate-300 print:text-black print:py-2">

                                                                    {student?.fullName || lesson.studentName || 'Unknown Student'}

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 whitespace-nowrap print:py-2">

                                                                    <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider print:p-0 print:bg-transparent print:text-black ${

                                                                        isTheory ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'

                                                                    }`}>

                                                                        {lesson.lessonType || 'Practical'}

                                                                    </span>

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 text-slate-500 dark:text-slate-400 text-[11px] print:text-slate-700 print:py-2">

                                                                    {isTheory ? (

                                                                        <span className="flex items-center gap-1.5 print:gap-0">

                                                                            <AcademicCapIcon className="w-3.5 h-3.5 text-indigo-500 inline print:hidden" />

                                                                            {lesson.roomName || 'Classroom A'}

                                                                        </span>

                                                                    ) : (

                                                                        <span className="flex items-center gap-1.5 print:gap-0">

                                                                            <TruckIcon className="w-3.5 h-3.5 text-emerald-500 inline print:hidden" />

                                                                            {vehicle ? `${vehicle.make} (${vehicle.plateNumber})` : 'Assigned Fleet'}

                                                                        </span>

                                                                    )}

                                                                </td>

                                                                <td className="py-3 px-4 print:px-2 whitespace-nowrap text-right print:py-2">

                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest print:p-0 print:bg-transparent print:text-black ${

                                                                        lesson.status === 'Completed' ? 'text-green-600 bg-green-50 dark:bg-green-900/20' :

                                                                        lesson.status === 'Cancelled' ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'

                                                                    }`}>

                                                                        {lesson.status || 'Scheduled'}

                                                                    </span>

                                                                </td>

                                                            </tr>

                                                        );

                                                    })}

                                                </tbody>

                                            </table>

                                        </div>

                                    )}

                                </div>

                            ))}

                        </div>

                    )}

                </>

            )}



            {/* Mode 2: Student NTSA Logbooks */}

            {reportMode === 'logbooks' && (

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    {/* Controls Column */}

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">

                        <div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">NTSA Training Logbooks</h3>

                            <p className="text-xs font-medium text-slate-400 mt-1">Compile comprehensive practical session records and theoretical attendance logs for NTSA inspector checkoff audits.</p>

                        </div>



                        <div className="space-y-4">

                            <div className="space-y-2">

                                <div className="flex items-center justify-between ml-1">

                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Candidate</label>

                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">

                                        <SearchIcon className="w-3.5 h-3.5" />

                                        <input

                                            type="text"

                                            value={studentSearch}

                                            onChange={e => setStudentSearch(e.target.value)}

                                            placeholder="Search name..."

                                            className="bg-transparent border-none focus:ring-0 p-0 text-[10px] w-24 text-right placeholder-slate-300 dark:placeholder-slate-600"

                                        />

                                    </div>

                                </div>

                                <select

                                    value={selectedStudentId}

                                    onChange={e => {

                                        setSelectedStudentId(e.target.value);

                                        setLogbookPreviewUrl(null);

                                    }}

                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-slate-100"

                                >

                                    <option value="">-- Select Student --</option>

                                    {filteredStudents.map(s => (

                                        <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber || 'ADM-N/A'})</option>

                                    ))}

                                </select>

                            </div>

                        </div>



                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">

                            <button

                                type="button"

                                disabled={isGeneratingLogbook || !selectedStudentId}

                                onClick={() => handleGenerateLogbook(true)}

                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"

                            >

                                <EyeIcon className="w-4 h-4" />

                                {isGeneratingLogbook ? 'Generating...' : 'Generate & Preview Logbook'}

                            </button>

                            <button

                                type="button"

                                disabled={isGeneratingLogbook || !selectedStudentId}

                                onClick={() => handleGenerateLogbook(false)}

                                className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"

                            >

                                <DownloadIcon className="w-4 h-4" />

                                Download Logbook PDF

                            </button>

                        </div>

                    </div>



                    {/* PDF Preview Frame Column */}

                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[75vh] flex flex-col">

                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">On-Screen PDF Viewer</h4>

                        {logbookPreviewUrl ? (

                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative">

                                <PdfViewer

                                    src={logbookPreviewUrl}

                                    className="w-full h-full border-none"

                                    title="Logbook PDF Preview"

                                />

                            </div>

                        ) : (

                            <div className="flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">

                                <CalendarDaysIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />

                                <h5 className="font-bold text-sm text-slate-900 dark:text-white">No active preview loaded</h5>

                                <p className="text-xs text-slate-400 mt-1 max-w-sm">Select a student and click "Generate & Preview Logbook" to compile details dynamically into the official KES/NTSA training format.</p>

                            </div>

                        )}

                    </div>

                </div>

            )}

            {/* Mode 3: Financial Statements */}
            {reportMode === 'statements' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Controls Column */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Financial Statements</h3>
                            <p className="text-xs font-medium text-slate-400 mt-1">Generate and preview the student financial ledger statement.</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Student</label>
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                        <SearchIcon className="w-3.5 h-3.5" />
                                        <input
                                            type="text"
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            placeholder="Search name..."
                                            className="bg-transparent border-none focus:ring-0 p-0 text-[10px] w-24 text-right placeholder-slate-300 dark:placeholder-slate-600"
                                        />
                                    </div>
                                </div>
                                <select
                                    value={selectedStatementStudentId}
                                    onChange={e => {
                                        setSelectedStatementStudentId(e.target.value);
                                        setStatementPreviewUrl(null);
                                    }}
                                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-slate-100"
                                >
                                    <option value="">-- Select Student --</option>
                                    {filteredStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullName} ({s.admissionNumber || 'ADM-N/A'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                            <button
                                type="button"
                                disabled={isGeneratingStatement || !selectedStatementStudentId}
                                onClick={() => handleGenerateStatement(true)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <EyeIcon className="w-4 h-4" />
                                {isGeneratingStatement ? 'Generating...' : 'Generate & Preview Statement'}
                            </button>
                            <button
                                type="button"
                                disabled={isGeneratingStatement || !selectedStatementStudentId}
                                onClick={() => handleGenerateStatement(false)}
                                className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Download Statement PDF
                            </button>
                        </div>
                    </div>

                    {/* PDF Preview Frame Column */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-[75vh] flex flex-col">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">On-Screen PDF Viewer</h4>
                        {statementPreviewUrl ? (
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative">
                                <PdfViewer
                                    src={statementPreviewUrl}
                                    className="w-full h-full border-none"
                                    title="Financial Statement PDF Preview"
                                />
                            </div>
                        ) : (
                            <div className="flex-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-8 bg-slate-50/50">
                                <CurrencyIcon className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                                <h5 className="font-bold text-sm text-slate-900 dark:text-white">No active preview loaded</h5>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">Select a student and click "Generate &amp; Preview Statement" to compile details dynamically into the official financial ledger format.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {reportMode === 'expenditure_summary' && (() => {
                const EXP_CATEGORIES = ['Fuel','Maintenance','Salaries','Rent','Utilities','Marketing','Equipment','Insurance','Other'];
                const CAT_COLORS: Record<string,string> = { Fuel:'bg-orange-100 text-orange-700', Maintenance:'bg-blue-100 text-blue-700', Salaries:'bg-violet-100 text-violet-700', Rent:'bg-amber-100 text-amber-700', Utilities:'bg-cyan-100 text-cyan-700', Marketing:'bg-pink-100 text-pink-700', Equipment:'bg-teal-100 text-teal-700', Insurance:'bg-indigo-100 text-indigo-700', Other:'bg-slate-100 text-slate-600' };
                const filtered = (expenditures || []).filter(e => {
                    const d = e.expenseDate ? new Date(e.expenseDate).getTime() : NaN;
                    const matchCat = expRepCategory === 'all' || e.category === expRepCategory;
                    const matchFrom = !expRepDateFrom || d >= new Date(expRepDateFrom).getTime();
                    const matchTo = !expRepDateTo || d <= new Date(expRepDateTo + 'T23:59:59').getTime();
                    return matchCat && matchFrom && matchTo;
                }).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
                const totalAmt = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
                const byCat: Record<string, {count: number, total: number}> = {};
                filtered.forEach(e => {
                    if (!byCat[e.category]) byCat[e.category] = { count: 0, total: 0 };
                    byCat[e.category].count++;
                    byCat[e.category].total += Number(e.amount) || 0;
                });
                const byVehicle: Record<string, {reg: string, total: number}> = {};
                filtered.forEach(e => {
                    if (e.vehicleId) {
                        const veh = (vehicles||[]).find((v: any) => v.id === e.vehicleId);
                        if (!byVehicle[e.vehicleId]) byVehicle[e.vehicleId] = { reg: veh?.registrationNumber || e.vehicleId, total: 0 };
                        byVehicle[e.vehicleId].total += Number(e.amount) || 0;
                    }
                });
                const handleExport = () => {
                    const header = ['Date','Description','Category','Amount (KES)','Method','Paid To','Vehicle','Recorded By'];
                    const rows = filtered.map(e => { const v = (vehicles||[]).find((veh: any) => veh.id === e.vehicleId); return [e.expenseDate, e.description, e.category, e.amount, e.paymentMethod, e.paidTo||'', v?.registrationNumber||'', e.recordedBy||'']; });
                    const csv = [header,...rows].map(r => r.map(c => `"${String(c??'').replace(/"/g,'""')}"`).join(',')).join('\n');
                    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href=url; a.download=`expenditure_report_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
                };
                return (
                    <div className="space-y-6 animate-fade-in">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">Expenditure Report</span>
                                    <h3 className="text-2xl font-black tracking-tight mt-3">Operating Cost Summary</h3>
                                    <p className="text-xs text-rose-100 mt-1">Breakdown of all school expenditures by category and vehicle</p>
                                </div>
                                <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                                    <DownloadIcon className="w-4 h-4" /> Export CSV
                                </button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-6 flex flex-wrap items-center gap-3">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Category</label>
                                <select value={expRepCategory} onChange={e => setExpRepCategory(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-1 focus:ring-rose-500 text-slate-700 dark:text-slate-200 appearance-none">
                                    <option value="all">All Categories</option>
                                    {EXP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">From Date</label>
                                <input type="date" value={expRepDateFrom} onChange={e => setExpRepDateFrom(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-1 focus:ring-rose-500 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">To Date</label>
                                <input type="date" value={expRepDateTo} onChange={e => setExpRepDateTo(e.target.value)} className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:ring-1 focus:ring-rose-500 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div className="ml-auto text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Period Spend</p>
                                <p className="text-2xl font-black text-rose-600">KES {totalAmt.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Summary Cards by Category */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Object.entries(byCat).sort((a,b) => b[1].total - a[1].total).map(([cat, data]) => (
                                <div key={cat} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 ${CAT_COLORS[cat] || CAT_COLORS['Other']}`}>{cat}</span>
                                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">KES {data.total.toLocaleString()}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-1">{data.count} transactions • {((data.total/Math.max(totalAmt,1))*100).toFixed(1)}% of total</p>
                                    {/* Mini progress bar */}
                                    <div className="mt-3 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500 rounded-full transition-all" style={{width:`${((data.total/Math.max(totalAmt,1))*100).toFixed(1)}%`}}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Vehicle Cost Breakdown */}
                        {Object.keys(byVehicle).length > 0 && (
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-6">Vehicle-Linked Cost Breakdown</h4>
                                <div className="space-y-3">
                                    {Object.entries(byVehicle).sort((a,b) => b[1].total - a[1].total).map(([vid, data]) => (
                                        <div key={vid} className="flex items-center gap-4">
                                            <div className="w-24 shrink-0">
                                                <span className="inline-block px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-wider">{data.reg}</span>
                                            </div>
                                            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-rose-500 rounded-full" style={{width:`${((data.total/Math.max(totalAmt,1))*100)}%`}}></div>
                                            </div>
                                            <p className="font-black text-sm text-rose-600 dark:text-rose-400 w-32 text-right">KES {data.total.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detailed Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-slate-50 dark:border-slate-800">
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Transaction Detail ({filtered.length} records)</h4>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-50 dark:border-slate-800">
                                            {['Date','Description','Category','Amount','Method','Paid To','Vehicle'].map(h => (
                                                <th key={h} className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                                        {filtered.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-12 text-center">
                                                <CurrencyIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No expenditures match the selected filters</p>
                                            </td></tr>
                                        ) : filtered.map(exp => {
                                            const veh = (vehicles||[]).find((v: any) => v.id === exp.vehicleId);
                                            return (
                                                <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{exp.expenseDate ? new Date(exp.expenseDate).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white max-w-[200px] truncate">{exp.description}</td>
                                                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${CAT_COLORS[exp.category]||CAT_COLORS['Other']}`}>{exp.category}</span></td>
                                                    <td className="px-6 py-4 font-black text-sm text-rose-600 dark:text-rose-400">KES {(exp.amount??0).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{exp.paymentMethod}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500 max-w-[120px] truncate">{exp.paidTo||'—'}</td>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-500">{veh?.registrationNumber||'—'}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {filtered.length > 0 && (
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
                                                <td colSpan={3} className="px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Grand Total</td>
                                                <td className="px-6 py-4 font-black text-base text-rose-600 dark:text-rose-400">KES {totalAmt.toLocaleString()}</td>
                                                <td colSpan={3}></td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Mode 5: Excel Data Exports */}
            {reportMode === 'excel_exports' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Master All-in-One Workbook Card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-8 sm:p-10 border border-indigo-500/30 text-white shadow-xl shadow-indigo-950/40">
                        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="space-y-3 max-w-xl">
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300">
                                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-300" />
                                    Complete Institutional Backup
                                </span>
                                <h3 className="text-2xl font-black tracking-tight uppercase text-white">
                                    Master All-in-One Excel Workbook
                                </h3>
                                <p className="text-xs text-indigo-200/80 leading-relaxed">
                                    Download all 6 driving school operational records (Students, Invoices, Receipts, Categories, Fee Voteheads, and System Users) bundled in a single multi-sheet workbook (.xlsx).
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                {onOpenCompleteImport && (
                                    <button
                                        type="button"
                                        onClick={onOpenCompleteImport}
                                        className="px-6 py-5 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-widest rounded-2xl border border-white/20 backdrop-blur-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 whitespace-nowrap justify-center shadow-lg"
                                        title="Import complete Driving School data from Excel workbook"
                                    >
                                        <ArrowUpTrayIcon className="w-5 h-5 text-indigo-300" />
                                        Import Complete Excel
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        try {
                                            const fname = exportAllDSToExcel({
                                                students,
                                                invoices,
                                                payments,
                                                categories,
                                                votes,
                                                users,
                                                instructors,
                                                branches,
                                                institutionName: currentInstitution?.name,
                                                institutionId: currentInstitution?.id
                                            });
                                            success(`Master workbook downloaded: ${fname}`);
                                        } catch (err: any) {
                                            toastError(err?.message || "Failed to export master workbook");
                                        }
                                    }}
                                    className="px-8 py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 whitespace-nowrap self-stretch md:self-auto justify-center"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    Export Master Workbook (.xlsx)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section Header */}
                    <div className="flex items-center justify-between pt-2">
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                Individual Module Spreadsheets
                            </h4>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                Formatted Microsoft Excel spreadsheets with auto-fitted column widths and typed numerical summaries.
                            </p>
                        </div>
                    </div>

                    {/* 6 Dataset Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                title: 'Students Roster',
                                desc: 'Enrolled & graduated students with admission numbers, contacts, license categories, practical progress & fee balances.',
                                count: `${(students || []).length} Students`,
                                icon: UsersIcon,
                                fn: () => exportStudentsToExcel(students, invoices, payments, instructors, branches, currentInstitution?.name)
                            },
                            {
                                title: 'Invoices Ledger',
                                desc: 'All billing invoices with breakdowns, discounts, sponsorships, paid sums & net outstanding balances.',
                                count: `${(invoices || []).length} Invoices`,
                                icon: DocumentTextIcon,
                                fn: () => exportInvoicesToExcel(invoices, students, branches, currentInstitution?.name)
                            },
                            {
                                title: 'Receipts & Payments',
                                desc: 'Payment transactions, M-Pesa / Cash / Bank channels, audit stamps, receipts & collecting officers.',
                                count: `${(payments || []).length} Receipts`,
                                icon: CreditCardIcon,
                                fn: () => exportReceiptsToExcel(payments, students, invoices, branches, currentInstitution?.name)
                            },
                            {
                                title: 'License Categories',
                                desc: 'Supported NTSA driving classifications (A1, B, C1, C, E), base tuition fee pricing & full curriculum lesson outlines.',
                                count: `${(categories?.length || 5)} Categories`,
                                icon: AcademicCapIcon,
                                fn: () => exportCategoriesToExcel(categories, currentInstitution?.name)
                            },
                            {
                                title: 'Fee Voteheads',
                                desc: 'Configured tuition fee heads, registration fees, NTSA test booking fees, default amounts & mandatory assessment rules.',
                                count: `${(votes?.length || 6)} Voteheads`,
                                icon: CurrencyIcon,
                                fn: () => exportVoteheadsToExcel(votes, currentInstitution?.name)
                            },
                            {
                                title: 'System Users & Staff',
                                desc: 'Institutional user accounts, administration roles, driving trainers, employee IDs, contacts & campus assignments.',
                                count: `${formatSystemUserRows(users, instructors, branches, currentInstitution?.id).length} Staff & Trainers`,
                                icon: UsersIcon,
                                fn: () => exportSystemUsersToExcel(users, instructors, branches, currentInstitution?.name, currentInstitution?.id)
                            },
                            {
                                title: 'Income & Collections',
                                desc: 'Payment receipts, M-Pesa codes, bank transfers, cash collections, collector staff & revenue breakdown.',
                                count: `${(payments || []).length} Payments`,
                                icon: BanknotesIcon,
                                fn: () => exportIncomeToExcel(payments, students, invoices, branches, currentInstitution?.name)
                            },
                            {
                                title: 'Debt Balances & Arrears',
                                desc: 'Students with outstanding balances, overdue fee aging, contacts, total course cost, amount paid & net debt.',
                                count: `${formatDebtBalanceRows(students, invoices, payments, branches).filter((r: any) => Number(r['Outstanding Debt Balance (KES)'] || 0) > 0).length} Debtors`,
                                icon: CreditCardIcon,
                                fn: () => exportDebtBalancesToExcel(students, invoices, payments, branches, currentInstitution?.name)
                            }
                        ].map((card, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between group hover:border-indigo-400/50 transition-all">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-xs">
                                            <card.icon className="w-6 h-6" />
                                        </div>
                                        <span className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                            {card.count}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                            {card.title}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                                            {card.desc}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Excel .xlsx</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            try {
                                                const fname = card.fn();
                                                success(`Downloaded: ${fname}`);
                                            } catch (err: any) {
                                                toastError(err?.message || "Export failed");
                                            }
                                        }}
                                        className="px-5 py-3 bg-slate-900 hover:bg-emerald-600 dark:bg-slate-800 dark:hover:bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm"
                                    >
                                        <DownloadIcon className="w-3.5 h-3.5" />
                                        Export
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

    );

};
