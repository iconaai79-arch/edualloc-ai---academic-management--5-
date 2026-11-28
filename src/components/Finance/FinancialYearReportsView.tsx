import React, { useMemo, useState } from 'react';

export interface ReportFinancialYearOption {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'Active' | 'Closed' | 'Draft' | 'Archived' | 'Default';
    isConfigured: boolean;
}

interface FinancialYearReportsViewProps {
    institution: any;
    isPrivateSchool: boolean;
    selectedFy: ReportFinancialYearOption | null;
    previousFy: ReportFinancialYearOption | null;
    allInvoices: any[];
    allReceipts: any[];
    allExpenses: any[];
    allPayroll: any[];
    allGokLogs: any[];
    allBursaries: any[];
    students: any[];
    letterheadUrl?: string;
    logoUrl?: string;
    loadLetterheadImageForPdf: (url: string) => Promise<{ dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' } | null>;
    onExportCsv: (filename: string, headers: string[], rows: any[][]) => void;
}

const parseAmt = (v: any): number => {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
};

const toIsoDate = (raw: any): string => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
};

const inDateRange = (rawDate: any, fy: ReportFinancialYearOption | null): boolean => {
    if (!fy) return true;
    const iso = toIsoDate(rawDate);
    if (!iso) return false;
    return iso >= fy.startDate && iso <= fy.endDate;
};

const fmtMoney = (v: number) => (v < 0 ? `(KSh ${Math.abs(Math.round(v)).toLocaleString()})` : `KSh ${Math.round(v).toLocaleString()}`);

export const FinancialYearReportsView: React.FC<FinancialYearReportsViewProps> = ({
    institution,
    isPrivateSchool,
    selectedFy,
    previousFy,
    allInvoices,
    allReceipts,
    allExpenses,
    allPayroll,
    allGokLogs,
    allBursaries,
    students,
    letterheadUrl = '',
    logoUrl = '',
    loadLetterheadImageForPdf,
    onExportCsv,
}) => {
    const [fySubTab, setFySubTab] = useState<'income_exp' | 'student_ledger' | 'billing' | 'cashflow' | 'exp_payroll' | 'channels'>('income_exp');
    const [showComparative, setShowComparative] = useState<boolean>(true);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [studentLedgerSearch, setStudentLedgerSearch] = useState('');
    const [studentLedgerClass, setStudentLedgerClass] = useState('All');
    const [studentLedgerStatus, setStudentLedgerStatus] = useState<'all' | 'arrears' | 'prepayment' | 'cleared'>('all');

    const fyLabel = selectedFy ? selectedFy.name : 'All Financial Years (Cumulative)';
    const fyRangeLabel = selectedFy ? `${selectedFy.startDate} to ${selectedFy.endDate}` : 'All Recorded Dates';
    const prevFyLabel = previousFy ? previousFy.name : 'Prior FY';

    // Compute aggregated snapshot for any FY period
    const computePeriodSnapshot = (fy: ReportFinancialYearOption | null) => {
        const invoices = allInvoices.filter(i => inDateRange(i.issueDate || i.date || i.createdAt || i.created_at, fy));
        const receipts = allReceipts.filter(r => inDateRange(r.paymentDate || r.date || r.createdAt || r.created_at, fy));
        const expenses = allExpenses.filter(e => inDateRange(e.date || e.expenseDate || e.createdAt || e.created_at, fy));
        const payroll = allPayroll.filter(p => inDateRange(p.paymentDate || p.date || p.createdAt || p.created_at, fy));
        const gokLogs = isPrivateSchool ? [] : allGokLogs.filter(g => inDateRange(g.disbursementDate || g.disbursement_date || g.date || g.createdAt || g.created_at, fy));
        const bursaries = isPrivateSchool ? [] : allBursaries.filter(b => inDateRange(b.date || b.disbursementDate || b.createdAt || b.created_at, fy));

        const totalInvoiced = invoices.reduce((s, i) => s + parseAmt(i.totalAmount ?? i.total_amount ?? i.amount), 0);
        const totalFeeCollected = receipts.reduce((s, r) => s + parseAmt(r.amountPaid ?? r.amount_paid ?? r.amount), 0);
        const totalGok = gokLogs.reduce((s, g) => s + parseAmt(g.totalAmount ?? g.total_amount ?? g.amount), 0);
        const gokSimba = gokLogs.reduce((s, g) => s + parseAmt(g.simbaAmount ?? g.simba_amount ?? (parseAmt(g.totalAmount ?? g.amount) * 0.5)), 0);
        const gokGpa = gokLogs.reduce((s, g) => s + parseAmt(g.gpaAmount ?? g.gpa_amount ?? (parseAmt(g.totalAmount ?? g.amount) * 0.5)), 0);
        const totalBursaries = bursaries.reduce((s, b) => s + parseAmt(b.amount), 0);

        const totalOperatingExpenses = expenses.reduce((s, e) => s + parseAmt(e.amount ?? e.total_amount), 0);
        const totalPayrollGross = payroll.reduce((s, p) => s + parseAmt(p.grossPay ?? p.gross), 0);
        const totalPayrollPaye = payroll.reduce((s, p) => s + parseAmt(p.paye ?? p.tax), 0);
        const totalPayrollNssf = payroll.reduce((s, p) => s + parseAmt(p.nssf), 0);
        const totalPayrollNhif = payroll.reduce((s, p) => s + parseAmt(p.nhif ?? p.shif), 0);
        const totalPayrollNet = payroll.reduce((s, p) => s + parseAmt(p.netPay ?? p.net), 0);

        const totalRevenue = totalFeeCollected + totalGok + totalBursaries;
        const totalExpenditure = totalOperatingExpenses + totalPayrollGross;
        const netSurplus = totalRevenue - totalExpenditure;

        // Vote head collections breakdown
        const voteHeadMap: Record<string, number> = {};
        receipts.forEach(r => {
            const amt = parseAmt(r.amountPaid ?? r.amount_paid ?? r.amount);
            const allocs = r.voteHeadAllocations || r.vote_head_allocations || r.allocations;
            if (allocs && typeof allocs === 'object' && Object.keys(allocs).length > 0) {
                Object.entries(allocs).forEach(([vh, v]) => {
                    voteHeadMap[vh] = (voteHeadMap[vh] || 0) + parseAmt(v);
                });
            } else {
                const label = r.voteHead || r.category || 'General Fees';
                voteHeadMap[label] = (voteHeadMap[label] || 0) + amt;
            }
        });

        // Expense category breakdown
        const expenseCatMap: Record<string, { count: number; amount: number }> = {};
        let investingOutflow = 0;
        let financingOutflow = 0;
        let operatingOutflow = 0;
        expenses.forEach(e => {
            const amt = parseAmt(e.amount ?? e.total_amount);
            const cat = String(e.category || 'General Operating').trim();
            if (!expenseCatMap[cat]) expenseCatMap[cat] = { count: 0, amount: 0 };
            expenseCatMap[cat].count += 1;
            expenseCatMap[cat].amount += amt;
            const lc = cat.toLowerCase();
            if (/asset|capital|equipment|building|infrastructure|vehicle|construction|land|furniture/.test(lc)) {
                investingOutflow += amt;
            } else if (/loan|financing|bank\s*repayment|mortgage|debt/.test(lc)) {
                financingOutflow += amt;
            } else {
                operatingOutflow += amt;
            }
        });
        operatingOutflow += totalPayrollNet;

        // Payment channels breakdown
        const channelMap: Record<string, { count: number; amount: number }> = {};
        receipts.forEach(r => {
            const rawMethod = String(r.paymentMethod || r.payment_method || r.method || 'Cash').trim();
            const norm = /mpesa|m-pesa/i.test(rawMethod)
                ? 'M-Pesa'
                : /bank|rtgs|eft|pesalink|deposit|transfer/i.test(rawMethod)
                ? 'Bank Transfer'
                : /cheque|check/i.test(rawMethod)
                ? 'Cheque'
                : /cash/i.test(rawMethod)
                ? 'Cash'
                : rawMethod || 'Other';
            if (!channelMap[norm]) channelMap[norm] = { count: 0, amount: 0 };
            channelMap[norm].count += 1;
            channelMap[norm].amount += parseAmt(r.amountPaid ?? r.amount_paid ?? r.amount);
        });

        // Class-level Billing & Collection
        const fyStartYear = fy?.startDate ? fy.startDate.slice(0, 4) : String(new Date().getFullYear());
        const studentById = new Map<string, any>();
        students.forEach(s => { if (s?.id) studentById.set(String(s.id), s); });

        const classMap: Record<string, { students: Set<string>; openingBf: number; invoiced: number; collected: number }> = {};
        const getCls = (s: any) => String(s?.className || s?.grade || s?.class || s?.course || s?.metadata?.className || 'Unassigned').trim() || 'Unassigned';

        students.forEach(s => {
            const cls = getCls(s);
            if (!classMap[cls]) classMap[cls] = { students: new Set(), openingBf: 0, invoiced: 0, collected: 0 };
            classMap[cls].students.add(String(s.id));
            const byYr = s.metadata?.openingBalancesByYear || s.metadata?.opening_balances_by_year;
            const ob = (byYr && byYr[fyStartYear] !== undefined)
                ? parseAmt(byYr[fyStartYear])
                : (fyStartYear === String(new Date().getFullYear()) ? parseAmt(s.metadata?.openingBalance ?? s.metadata?.opening_balance ?? 0) : 0);
            classMap[cls].openingBf += ob;
        });

        invoices.forEach(inv => {
            const st = studentById.get(String(inv.studentId || inv.student_id || ''));
            const cls = String(inv.className || inv.grade || (st ? getCls(st) : 'Unassigned')).trim() || 'Unassigned';
            if (!classMap[cls]) classMap[cls] = { students: new Set(), openingBf: 0, invoiced: 0, collected: 0 };
            classMap[cls].invoiced += parseAmt(inv.totalAmount ?? inv.total_amount ?? inv.amount);
        });

        receipts.forEach(rcpt => {
            const st = studentById.get(String(rcpt.studentId || rcpt.student_id || ''));
            const cls = String(rcpt.className || rcpt.grade || (st ? getCls(st) : 'Unassigned')).trim() || 'Unassigned';
            if (!classMap[cls]) classMap[cls] = { students: new Set(), openingBf: 0, invoiced: 0, collected: 0 };
            classMap[cls].collected += parseAmt(rcpt.amountPaid ?? rcpt.amount_paid ?? rcpt.amount);
        });

        const classRows = Object.entries(classMap)
            .map(([cls, d]) => {
                const totalDue = d.openingBf + d.invoiced;
                const closingBal = totalDue - d.collected;
                const rate = totalDue > 0 ? Math.round((d.collected / totalDue) * 100) : 0;
                return { className: cls, studentCount: d.students.size, openingBf: d.openingBf, invoiced: d.invoiced, collected: d.collected, closingBal, rate };
            })
            .sort((a, b) => a.className.localeCompare(b.className));

        const totalOpeningBf = classRows.reduce((s, r) => s + r.openingBf, 0);
        const netOperating = totalRevenue - operatingOutflow;
        const netInvesting = -investingOutflow;
        const netFinancing = -financingOutflow;
        const netCashChange = netOperating + netInvesting + netFinancing;

        return {
            invoicesCount: invoices.length,
            receiptsCount: receipts.length,
            expensesCount: expenses.length,
            payrollCount: payroll.length,
            totalOpeningBf,
            totalInvoiced,
            totalFeeCollected,
            totalGok,
            gokSimba,
            gokGpa,
            totalBursaries,
            totalRevenue,
            totalOperatingExpenses,
            totalPayrollGross,
            totalPayrollPaye,
            totalPayrollNssf,
            totalPayrollNhif,
            totalPayrollNet,
            totalExpenditure,
            netSurplus,
            voteHeadMap,
            expenseCatMap,
            channelMap,
            classRows,
            operatingOutflow,
            investingOutflow,
            financingOutflow,
            netOperating,
            netInvesting,
            netFinancing,
            netCashChange,
        };
    };

    const current = useMemo(
        () => computePeriodSnapshot(selectedFy),
        [selectedFy, allInvoices, allReceipts, allExpenses, allPayroll, allGokLogs, allBursaries, students, isPrivateSchool]
    );

    const prior = useMemo(
        () => (previousFy ? computePeriodSnapshot(previousFy) : null),
        [previousFy, allInvoices, allReceipts, allExpenses, allPayroll, allGokLogs, allBursaries, students, isPrivateSchool]
    );

    // Per-student Financial Year Ledger: Opening B/F, FY Invoiced, Chronological Installments (1..6 + More), End-of-Year Arrears / Prepayment
    const studentFyLedgerRows = useMemo(() => {
        const fyInvoices = allInvoices.filter(i => inDateRange(i.issueDate || i.date || i.createdAt || i.created_at, selectedFy));
        const fyReceipts = allReceipts.filter(r => inDateRange(r.paymentDate || r.date || r.createdAt || r.created_at, selectedFy));
        const fyStartYear = selectedFy?.startDate ? selectedFy.startDate.slice(0, 4) : String(new Date().getFullYear());

        const getAdm = (s: any) => String(s?.admissionNumber || s?.admission_number || s?.metadata?.admissionNumber || s?.metadata?.admission_number || s?.admNo || s?.registrationNumber || '').trim();
        const getCls = (s: any) => String(s?.className || s?.grade || s?.class || s?.course || s?.metadata?.className || 'Unassigned').trim() || 'Unassigned';

        const invByStudentId = new Map<string, number>();
        const invByAdm = new Map<string, number>();
        fyInvoices.forEach(inv => {
            const amt = parseAmt(inv.totalAmount ?? inv.total_amount ?? inv.amount);
            const sid = String(inv.studentId || inv.student_id || inv.userId || '').trim();
            const adm = String(inv.admissionNumber || inv.admission_number || inv.admNo || '').trim().toLowerCase();
            if (sid) invByStudentId.set(sid, (invByStudentId.get(sid) || 0) + amt);
            else if (adm) invByAdm.set(adm, (invByAdm.get(adm) || 0) + amt);
        });

        const rcptByStudentId = new Map<string, Array<{ date: string; amount: number }>>();
        const rcptByAdm = new Map<string, Array<{ date: string; amount: number }>>();
        fyReceipts.forEach(r => {
            const amt = parseAmt(r.amountPaid ?? r.amount_paid ?? r.amount);
            if (amt <= 0) return;
            const dt = toIsoDate(r.paymentDate || r.date || r.createdAt || r.created_at) || '9999-12-31';
            const sid = String(r.studentId || r.student_id || r.userId || '').trim();
            const adm = String(r.admissionNumber || r.admission_number || r.admNo || '').trim().toLowerCase();
            if (sid) {
                if (!rcptByStudentId.has(sid)) rcptByStudentId.set(sid, []);
                rcptByStudentId.get(sid)!.push({ date: dt, amount: amt });
            } else if (adm) {
                if (!rcptByAdm.has(adm)) rcptByAdm.set(adm, []);
                rcptByAdm.get(adm)!.push({ date: dt, amount: amt });
            }
        });

        return students.map(s => {
            const sid = String(s.id || '').trim();
            const adm = getAdm(s);
            const admKey = adm.toLowerCase();
            const cls = getCls(s);

            const byYr = s.metadata?.openingBalancesByYear || s.metadata?.opening_balances_by_year;
            const openingBf = (byYr && byYr[fyStartYear] !== undefined)
                ? parseAmt(byYr[fyStartYear])
                : (fyStartYear === String(new Date().getFullYear()) ? parseAmt(s.metadata?.openingBalance ?? s.metadata?.opening_balance ?? 0) : 0);

            const invoiced = (invByStudentId.get(sid) || 0) + (admKey && !invByStudentId.has(sid) ? (invByAdm.get(admKey) || 0) : 0);
            const totalExpected = openingBf + invoiced;

            const studentRcpts = [
                ...(rcptByStudentId.get(sid) || []),
                ...((admKey && !rcptByStudentId.has(sid)) ? (rcptByAdm.get(admKey) || []) : [])
            ].sort((a, b) => a.date.localeCompare(b.date));

            const installments: number[] = [0, 0, 0, 0, 0, 0];
            let extraInstallments = 0;
            studentRcpts.forEach((p, idx) => {
                if (idx < 6) installments[idx] = p.amount;
                else extraInstallments += p.amount;
            });

            const totalPaid = studentRcpts.reduce((sum, p) => sum + p.amount, 0);
            const netBalance = totalExpected - totalPaid;
            const arrears = netBalance > 0 ? netBalance : 0;
            const prepayment = netBalance < 0 ? Math.abs(netBalance) : 0;

            return {
                id: sid,
                adm: adm || '—',
                name: s.name || s.fullName || 'Unnamed Student',
                className: cls,
                openingBf,
                invoiced,
                totalExpected,
                installments,
                extraInstallments,
                installmentCount: studentRcpts.length,
                totalPaid,
                arrears,
                prepayment,
                netBalance,
            };
        }).sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));
    }, [students, allInvoices, allReceipts, selectedFy]);

    const studentLedgerClasses = useMemo(() => {
        const set = new Set<string>();
        studentFyLedgerRows.forEach(r => set.add(r.className));
        return Array.from(set).sort();
    }, [studentFyLedgerRows]);

    const filteredStudentLedger = useMemo(() => {
        const q = studentLedgerSearch.trim().toLowerCase();
        return studentFyLedgerRows.filter(r => {
            if (studentLedgerClass !== 'All' && r.className !== studentLedgerClass) return false;
            if (studentLedgerStatus === 'arrears' && r.arrears <= 0) return false;
            if (studentLedgerStatus === 'prepayment' && r.prepayment <= 0) return false;
            if (studentLedgerStatus === 'cleared' && (r.arrears > 0 || r.prepayment > 0)) return false;
            if (q && !r.name.toLowerCase().includes(q) && !r.adm.toLowerCase().includes(q) && !r.className.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [studentFyLedgerRows, studentLedgerSearch, studentLedgerClass, studentLedgerStatus]);

    const studentLedgerTotals = useMemo(() => {
        const instSums = [0, 0, 0, 0, 0, 0];
        let extraSum = 0;
        let openingBf = 0;
        let invoiced = 0;
        let totalExpected = 0;
        let totalPaid = 0;
        let arrears = 0;
        let prepayment = 0;
        filteredStudentLedger.forEach(r => {
            openingBf += r.openingBf;
            invoiced += r.invoiced;
            totalExpected += r.totalExpected;
            r.installments.forEach((v, idx) => { instSums[idx] += v; });
            extraSum += r.extraInstallments;
            totalPaid += r.totalPaid;
            arrears += r.arrears;
            prepayment += r.prepayment;
        });
        const hasExtra = extraSum > 0;
        const netClosing = arrears - prepayment;
        const pctCollected = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
        return { openingBf, invoiced, totalExpected, instSums, extraSum, hasExtra, totalPaid, arrears, prepayment, netClosing, pctCollected };
    }, [filteredStudentLedger]);

    const handleDownloadStudentLedgerPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const { jsPDF } = await import('jspdf');
            const autoTableModule = await import('jspdf-autotable');
            const autoTable = (autoTableModule as any).default || autoTableModule;

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            let headerY = 14;

            const lhImg = await loadLetterheadImageForPdf(letterheadUrl);
            if (lhImg) {
                const maxW = pageWidth - 28;
                const maxH = 22;
                const ratio = Math.min(maxW / lhImg.width, maxH / lhImg.height);
                const drawW = lhImg.width * ratio;
                const drawH = lhImg.height * ratio;
                doc.addImage(lhImg.dataUrl, lhImg.format, (pageWidth - drawW) / 2, 7, drawW, drawH);
                headerY = 7 + drawH + 5;
            } else {
                const lgImg = await loadLetterheadImageForPdf(logoUrl);
                let nameX = 14;
                if (lgImg) {
                    doc.addImage(lgImg.dataUrl, lgImg.format, 14, 8, 11, 11);
                    nameX = 28;
                }
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(institution?.name || 'ACADEMIC INSTITUTION', nameX, 14);
                headerY = 20;
            }

            doc.setFontSize(10.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(79, 70, 229);
            doc.text(`STUDENT FINANCIAL YEAR LEDGER — ${fyLabel.toUpperCase()}`, 14, headerY);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`Period: ${fyRangeLabel}  |  Class: ${studentLedgerClass}  |  Students: ${filteredStudentLedger.length}  |  Generated: ${new Date().toLocaleDateString('en-KE')}`, 14, headerY + 5);

            const hasExtra = studentLedgerTotals.hasExtra;
            const instColCount = hasExtra ? 7 : 6;
            const head: any[] = [
                [
                    { content: '#', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
                    { content: 'Adm.No', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'Student Name', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'Class', rowSpan: 2, styles: { valign: 'middle' } },
                    { content: 'Opening B/F', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
                    { content: 'FY Invoiced', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
                    { content: 'Total Expected', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
                    { content: 'Installments Paid During Financial Year', colSpan: instColCount, styles: { halign: 'center' } },
                    { content: 'Total Paid', rowSpan: 2, styles: { valign: 'middle', halign: 'right' } },
                    { content: 'End-of-Year Balance', colSpan: 2, styles: { halign: 'center' } },
                ],
                [
                    { content: '1st', styles: { halign: 'right' } },
                    { content: '2nd', styles: { halign: 'right' } },
                    { content: '3rd', styles: { halign: 'right' } },
                    { content: '4th', styles: { halign: 'right' } },
                    { content: '5th', styles: { halign: 'right' } },
                    { content: '6th', styles: { halign: 'right' } },
                    ...(hasExtra ? [{ content: '6th+', styles: { halign: 'right' } }] : []),
                    { content: 'Arrears (Dr)', styles: { halign: 'right' } },
                    { content: 'Prepay (Cr)', styles: { halign: 'right' } },
                ],
            ];

            const body: any[] = filteredStudentLedger.map((r, idx) => [
                idx + 1,
                r.adm,
                r.name,
                r.className,
                r.openingBf !== 0 ? Math.round(r.openingBf).toLocaleString() : '0',
                Math.round(r.invoiced).toLocaleString(),
                Math.round(r.totalExpected).toLocaleString(),
                ...r.installments.map(v => (v > 0 ? Math.round(v).toLocaleString() : '—')),
                ...(hasExtra ? [r.extraInstallments > 0 ? Math.round(r.extraInstallments).toLocaleString() : '—'] : []),
                Math.round(r.totalPaid).toLocaleString(),
                r.arrears > 0 ? Math.round(r.arrears).toLocaleString() : '—',
                r.prepayment > 0 ? Math.round(r.prepayment).toLocaleString() : '—',
            ]);

            body.push([
                '',
                'TOTALS',
                `${filteredStudentLedger.length} Students`,
                '',
                Math.round(studentLedgerTotals.openingBf).toLocaleString(),
                Math.round(studentLedgerTotals.invoiced).toLocaleString(),
                Math.round(studentLedgerTotals.totalExpected).toLocaleString(),
                ...studentLedgerTotals.instSums.map(v => (v > 0 ? Math.round(v).toLocaleString() : '—')),
                ...(hasExtra ? [Math.round(studentLedgerTotals.extraSum).toLocaleString()] : []),
                Math.round(studentLedgerTotals.totalPaid).toLocaleString(),
                Math.round(studentLedgerTotals.arrears).toLocaleString(),
                Math.round(studentLedgerTotals.prepayment).toLocaleString(),
            ]);

            const totalPaidIdx = 7 + instColCount;
            const colStyles: Record<number, any> = {
                0: { halign: 'center', cellWidth: 7 },
                1: { halign: 'left' },
                2: { halign: 'left', fontStyle: 'bold' },
                3: { halign: 'left' },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right', fontStyle: 'bold' },
                [totalPaidIdx]: { halign: 'right', fontStyle: 'bold', textColor: [4, 120, 87] },
                [totalPaidIdx + 1]: { halign: 'right', fontStyle: 'bold', textColor: [190, 18, 60] },
                [totalPaidIdx + 2]: { halign: 'right', fontStyle: 'bold', textColor: [67, 56, 202] },
            };
            for (let c = 7; c < totalPaidIdx; c++) colStyles[c] = { halign: 'right' };

            autoTable(doc, {
                head,
                body,
                startY: headerY + 9,
                theme: 'grid',
                styles: { fontSize: 6.5, cellPadding: 1.4 },
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
                columnStyles: colStyles,
                didParseCell: (data: any) => {
                    if (data.section === 'body' && data.row.index === body.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [241, 245, 249];
                    }
                },
                didDrawPage: (data: any) => {
                    const pH = doc.internal.pageSize.getHeight();
                    const pW = doc.internal.pageSize.getWidth();
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(148, 163, 184);
                    doc.setDrawColor(226, 232, 240);
                    doc.line(14, pH - 10, pW - 14, pH - 10);
                    doc.text(`${institution?.name || 'EduAI'} • Student Financial Year Ledger (${fyLabel})`, 14, pH - 5);
                    doc.text(`Page ${data.pageNumber}`, pW - 14, pH - 5, { align: 'right' });
                },
            });

            // Summary Totals Box below table
            let curY = ((doc as any).lastAutoTable?.finalY || 140) + 6;
            const pH = doc.internal.pageSize.getHeight();
            if (curY > pH - 36) {
                doc.addPage();
                curY = 18;
            }
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(14, curY, pageWidth - 28, 22, 2, 2, 'F');
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text('OPENING B/F', 20, curY + 7);
            doc.text('FY INVOICED', 68, curY + 7);
            doc.text('TOTAL PAID', 118, curY + 7);
            doc.text('END-OF-YEAR ARREARS', 170, curY + 7);
            doc.text('END-OF-YEAR PREPAYMENTS', 225, curY + 7);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(fmtMoney(studentLedgerTotals.openingBf), 20, curY + 15);
            doc.text(fmtMoney(studentLedgerTotals.invoiced), 68, curY + 15);
            doc.setTextColor(52, 211, 153);
            doc.text(`${fmtMoney(studentLedgerTotals.totalPaid)} (${studentLedgerTotals.pctCollected}%)`, 118, curY + 15);
            doc.setTextColor(251, 113, 133);
            doc.text(fmtMoney(studentLedgerTotals.arrears), 170, curY + 15);
            doc.setTextColor(165, 180, 252);
            doc.text(fmtMoney(studentLedgerTotals.prepayment), 225, curY + 15);

            doc.save(`Student_FY_Ledger_${fyLabel.replace(/[^a-z0-9]+/gi, '_')}_${studentLedgerClass.replace(/\s+/g, '_')}.pdf`);
        } catch (err: any) {
            console.error('Student FY Ledger PDF error:', err);
            alert('Failed to generate Student FY Ledger PDF: ' + (err?.message || err));
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const calcVarPct = (curr: number, prev: number) => {
        if (!prev) return curr === 0 ? '0%' : '—';
        const pct = ((curr - prev) / Math.abs(prev)) * 100;
        return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
    };

    const handleDownloadFyPackPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const { jsPDF } = await import('jspdf');
            const autoTableModule = await import('jspdf-autotable');
            const autoTable = (autoTableModule as any).default || autoTableModule;

            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            let headerY = 16;

            const lhImg = await loadLetterheadImageForPdf(letterheadUrl);
            if (lhImg) {
                const maxW = pageWidth - 28;
                const maxH = 24;
                const ratio = Math.min(maxW / lhImg.width, maxH / lhImg.height);
                const drawW = lhImg.width * ratio;
                const drawH = lhImg.height * ratio;
                doc.addImage(lhImg.dataUrl, lhImg.format, (pageWidth - drawW) / 2, 8, drawW, drawH);
                headerY = 8 + drawH + 6;
            } else {
                const lgImg = await loadLetterheadImageForPdf(logoUrl);
                let nameX = 14;
                if (lgImg) {
                    doc.addImage(lgImg.dataUrl, lgImg.format, 14, 9, 12, 12);
                    nameX = 29;
                }
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.text(institution?.name || 'ACADEMIC INSTITUTION', nameX, 16);
                headerY = 23;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(79, 70, 229);
            doc.text(`FINANCIAL YEAR REPORT — ${fyLabel.toUpperCase()}`, 14, headerY);

            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`Period: ${fyRangeLabel}  |  School Model: ${isPrivateSchool ? 'Private School' : 'Public School'}  |  Generated: ${new Date().toLocaleDateString('en-KE')}`, 14, headerY + 5);

            const drawFooter = (data: any) => {
                const pH = doc.internal.pageSize.getHeight();
                const pW = doc.internal.pageSize.getWidth();
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.setDrawColor(226, 232, 240);
                doc.line(14, pH - 10, pW - 14, pH - 10);
                doc.text(`${institution?.name || 'EduAI'} • Financial Year Report (${fyLabel})`, 14, pH - 5);
                doc.text(`Page ${data.pageNumber}`, pW - 14, pH - 5, { align: 'right' });
            };

            // Section 1: Income & Expenditure
            const useComp = Boolean(showComparative && prior);
            const incHead = useComp
                ? [['1. Statement of Financial Performance', fyLabel, prevFyLabel, 'Variance']]
                : [['1. Statement of Financial Performance', fyLabel]];

            const makeRow = (label: string, cVal: number, pVal: number, bold = false) => {
                const base = useComp
                    ? [label, fmtMoney(cVal), fmtMoney(pVal), calcVarPct(cVal, pVal)]
                    : [label, fmtMoney(cVal)];
                return bold ? base.map((cell, idx) => ({ content: cell, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: idx > 0 ? 'right' : 'left' } })) : base;
            };

            const incBody: any[] = [
                makeRow('Fee Collections (Receipts)', current.totalFeeCollected, prior?.totalFeeCollected || 0),
                ...(!isPrivateSchool ? [
                    makeRow('GoK Capitation Grants (SIMBA + GPA)', current.totalGok, prior?.totalGok || 0),
                    makeRow('NG-CDF & External Bursaries', current.totalBursaries, prior?.totalBursaries || 0),
                ] : []),
                makeRow('TOTAL REVENUE / INFLOWS', current.totalRevenue, prior?.totalRevenue || 0, true),
                makeRow('Operating & Administrative Expenses', current.totalOperatingExpenses, prior?.totalOperatingExpenses || 0),
                makeRow('Staff Payroll (Gross Salaries & Statutory)', current.totalPayrollGross, prior?.totalPayrollGross || 0),
                makeRow('TOTAL EXPENDITURE', current.totalExpenditure, prior?.totalExpenditure || 0, true),
                (useComp
                    ? [
                        { content: 'NET SURPLUS / (DEFICIT)', styles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' } },
                        { content: fmtMoney(current.netSurplus), styles: { fillColor: [15, 23, 42], textColor: [52, 211, 153], fontStyle: 'bold', halign: 'right' } },
                        { content: fmtMoney(prior?.netSurplus || 0), styles: { fillColor: [15, 23, 42], textColor: [203, 213, 225], fontStyle: 'bold', halign: 'right' } },
                        { content: calcVarPct(current.netSurplus, prior?.netSurplus || 0), styles: { fillColor: [15, 23, 42], textColor: [165, 180, 252], fontStyle: 'bold', halign: 'right' } },
                    ]
                    : [
                        { content: 'NET SURPLUS / (DEFICIT)', styles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' } },
                        { content: fmtMoney(current.netSurplus), styles: { fillColor: [15, 23, 42], textColor: [52, 211, 153], fontStyle: 'bold', halign: 'right' } },
                    ])
            ];

            autoTable(doc, {
                head: incHead,
                body: incBody,
                startY: headerY + 10,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2.4 },
                headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
                columnStyles: useComp
                    ? { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
                    : { 1: { halign: 'right' } },
                didDrawPage: drawFooter,
            });

            // Section 2: Cash Flow Summary
            let nextY = ((doc as any).lastAutoTable?.finalY || 120) + 8;
            autoTable(doc, {
                head: [['2. Cash Flow Summary', 'Amount (KSh)']],
                body: [
                    ['Cash Inflows (Fees' + (!isPrivateSchool ? ', GoK Capitation & Bursaries' : '') + ')', fmtMoney(current.totalRevenue)],
                    ['Cash Outflows: Operating Expenses & Net Payroll', fmtMoney(-current.operatingOutflow)],
                    [{ content: 'Net Cash from Operating Activities', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }, { content: fmtMoney(current.netOperating), styles: { fontStyle: 'bold', fillColor: [248, 250, 252], halign: 'right' } }],
                    ['Investing Activities (Capital / Equipment Purchases)', fmtMoney(current.netInvesting)],
                    ['Financing Activities (Loans / Debt Servicing)', fmtMoney(current.netFinancing)],
                    [{ content: 'NET CASH MOVEMENT FOR FINANCIAL YEAR', styles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' } }, { content: fmtMoney(current.netCashChange), styles: { fillColor: [15, 23, 42], textColor: [52, 211, 153], fontStyle: 'bold', halign: 'right' } }],
                ],
                startY: nextY,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2.4 },
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right', cellWidth: 48 } },
                didDrawPage: drawFooter,
            });

            // Section 3: Class Billing & Collection Performance
            nextY = ((doc as any).lastAutoTable?.finalY || 180) + 8;
            if (current.classRows.length > 0) {
                autoTable(doc, {
                    head: [['3. Class / Grade', 'Students', 'Opening B/F', 'FY Invoiced', 'FY Collected', 'Closing Bal', '%']],
                    body: [
                        ...current.classRows.map(r => [
                            r.className,
                            r.studentCount,
                            Math.round(r.openingBf).toLocaleString(),
                            Math.round(r.invoiced).toLocaleString(),
                            Math.round(r.collected).toLocaleString(),
                            Math.round(r.closingBal).toLocaleString(),
                            `${r.rate}%`,
                        ]),
                        [
                            'TOTALS',
                            students.length,
                            Math.round(current.totalOpeningBf).toLocaleString(),
                            Math.round(current.totalInvoiced).toLocaleString(),
                            Math.round(current.totalFeeCollected).toLocaleString(),
                            Math.round(current.totalOpeningBf + current.totalInvoiced - current.totalFeeCollected).toLocaleString(),
                            `${(current.totalOpeningBf + current.totalInvoiced) > 0 ? Math.round((current.totalFeeCollected / (current.totalOpeningBf + current.totalInvoiced)) * 100) : 0}%`,
                        ],
                    ],
                    startY: nextY,
                    theme: 'grid',
                    styles: { fontSize: 7.5, cellPadding: 2 },
                    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
                    columnStyles: {
                        1: { halign: 'center' },
                        2: { halign: 'right' },
                        3: { halign: 'right' },
                        4: { halign: 'right', textColor: [4, 120, 87] },
                        5: { halign: 'right', textColor: [190, 18, 60] },
                        6: { halign: 'center' },
                    },
                    didParseCell: (data: any) => {
                        if (data.section === 'body' && data.row.index === current.classRows.length) {
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.styles.fillColor = [241, 245, 249];
                        }
                    },
                    didDrawPage: drawFooter,
                });
            }

            // Sign-off Block
            nextY = ((doc as any).lastAutoTable?.finalY || 220) + 14;
            const pH = doc.internal.pageSize.getHeight();
            if (nextY > pH - 35) {
                doc.addPage();
                nextY = 24;
            }
            const signatories = isPrivateSchool
                ? ['Prepared By: Chief Accountant / Bursar', 'Approved By: Managing Director']
                : ['Prepared By: School Bursar', 'Verified By: Principal / Head', 'Approved By: BOM Chair'];
            const colW = (pageWidth - 28) / signatories.length;
            doc.setDrawColor(148, 163, 184);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(51, 65, 85);
            signatories.forEach((sig, i) => {
                const x = 14 + i * colW;
                doc.line(x, nextY + 10, x + colW - 10, nextY + 10);
                doc.text(sig, x, nextY + 15);
                doc.setFont('helvetica', 'normal');
                doc.text('Sign & Date: ___________________', x, nextY + 20);
                doc.setFont('helvetica', 'bold');
            });

            doc.save(`Financial_Year_Report_${fyLabel.replace(/[^a-z0-9]+/gi, '_')}.pdf`);
        } catch (err: any) {
            console.error('FY PDF export error:', err);
            alert('Failed to generate Financial Year PDF: ' + (err?.message || err));
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleExportActiveCsv = () => {
        if (fySubTab === 'student_ledger') {
            const hasExtra = studentLedgerTotals.hasExtra;
            const headers = [
                '#', 'Adm.No', 'Student Name', 'Class', 'Opening B/F', 'FY Invoiced', 'Total Expected',
                '1st Inst.', '2nd Inst.', '3rd Inst.', '4th Inst.', '5th Inst.', '6th Inst.',
                ...(hasExtra ? ['6th+ Inst.'] : []),
                'Total Paid', 'Arrears (End of FY)', 'Prepayment (End of FY)'
            ];
            const rows: any[][] = filteredStudentLedger.map((r, i) => [
                i + 1, r.adm, r.name, r.className, Math.round(r.openingBf), Math.round(r.invoiced), Math.round(r.totalExpected),
                ...r.installments.map(v => Math.round(v)),
                ...(hasExtra ? [Math.round(r.extraInstallments)] : []),
                Math.round(r.totalPaid), Math.round(r.arrears), Math.round(r.prepayment)
            ]);
            rows.push([
                '', 'TOTALS', `${filteredStudentLedger.length} Students`, '',
                Math.round(studentLedgerTotals.openingBf), Math.round(studentLedgerTotals.invoiced), Math.round(studentLedgerTotals.totalExpected),
                ...studentLedgerTotals.instSums.map(v => Math.round(v)),
                ...(hasExtra ? [Math.round(studentLedgerTotals.extraSum)] : []),
                Math.round(studentLedgerTotals.totalPaid), Math.round(studentLedgerTotals.arrears), Math.round(studentLedgerTotals.prepayment)
            ]);
            onExportCsv(`student_fy_ledger_${fyLabel.replace(/[^a-z0-9]+/gi, '_')}`, headers, rows);
        } else if (fySubTab === 'billing') {
            onExportCsv(
                `fy_billing_${fyLabel.replace(/[^a-z0-9]+/gi, '_')}`,
                ['Class / Grade', 'Students', 'Opening B/F', 'FY Invoiced', 'FY Collected', 'Closing Balance', 'Collection %'],
                current.classRows.map(r => [r.className, r.studentCount, Math.round(r.openingBf), Math.round(r.invoiced), Math.round(r.collected), Math.round(r.closingBal), `${r.rate}%`])
            );
        } else if (fySubTab === 'exp_payroll') {
            onExportCsv(
                `fy_expenditure_${fyLabel.replace(/[^a-z0-9]+/gi, '_')}`,
                ['Expense Category', 'Transactions', 'Total Amount (KSh)'],
                Object.entries(current.expenseCatMap).map(([cat, d]) => [cat, d.count, Math.round(d.amount)])
            );
        } else if (fySubTab === 'channels') {
            onExportCsv(
                `fy_channels_${fyLabel.replace(/[^a-z0-9]+/gi, '_')}`,
                ['Payment Channel', 'Receipts Count', 'Total Collected (KSh)'],
                Object.entries(current.channelMap).map(([ch, d]) => [ch, d.count, Math.round(d.amount)])
            );
        } else {
            onExportCsv(
                `fy_income_expenditure_${fyLabel.replace(/[^a-z0-9]+/gi, '_')}`,
                ['Line Item', fyLabel, ...(prior ? [prevFyLabel] : [])],
                [
                    ['Fee Collections', Math.round(current.totalFeeCollected), ...(prior ? [Math.round(prior.totalFeeCollected)] : [])],
                    ...(!isPrivateSchool ? [
                        ['GoK Capitation Grants', Math.round(current.totalGok), ...(prior ? [Math.round(prior.totalGok)] : [])],
                        ['NG-CDF Bursaries', Math.round(current.totalBursaries), ...(prior ? [Math.round(prior.totalBursaries)] : [])],
                    ] : []),
                    ['Total Revenue', Math.round(current.totalRevenue), ...(prior ? [Math.round(prior.totalRevenue)] : [])],
                    ['Operating Expenses', Math.round(current.totalOperatingExpenses), ...(prior ? [Math.round(prior.totalOperatingExpenses)] : [])],
                    ['Staff Payroll (Gross)', Math.round(current.totalPayrollGross), ...(prior ? [Math.round(prior.totalPayrollGross)] : [])],
                    ['Total Expenditure', Math.round(current.totalExpenditure), ...(prior ? [Math.round(prior.totalExpenditure)] : [])],
                    ['Net Surplus / (Deficit)', Math.round(current.netSurplus), ...(prior ? [Math.round(prior.netSurplus)] : [])],
                ]
            );
        }
    };

    const subTabs = [
        { id: 'income_exp', label: 'Income & Expenditure' },
        { id: 'student_ledger', label: 'Student FY Ledger (Invoiced, Installments & Balances)' },
        { id: 'billing', label: 'Billing & Collection' },
        { id: 'cashflow', label: 'Cash Flow Statement' },
        { id: 'exp_payroll', label: 'Expenses & Payroll' },
        { id: 'channels', label: 'Payment Channels & Funds' },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Actions */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-black uppercase tracking-widest">
                                {isPrivateSchool ? 'Private School FY Pack' : 'Public School FY Pack (MoE / IPSAS)'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-300">{fyRangeLabel}</span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight mt-2">{fyLabel}</h3>
                        <p className="text-xs text-slate-300 mt-0.5">{institution?.name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 print:hidden">
                        {previousFy && (
                            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 text-[10px] font-black uppercase tracking-wider cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showComparative}
                                    onChange={(e) => setShowComparative(e.target.checked)}
                                    className="rounded text-indigo-500"
                                />
                                Compare vs {previousFy.name}
                            </label>
                        )}
                        <button
                            type="button"
                            onClick={handleExportActiveCsv}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all"
                        >
                            📊 Export CSV
                        </button>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all"
                        >
                            🖨️ Print
                        </button>
                        <button
                            type="button"
                            disabled={isDownloadingPdf}
                            onClick={fySubTab === 'student_ledger' ? handleDownloadStudentLedgerPdf : handleDownloadFyPackPdf}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all disabled:opacity-50"
                        >
                            {isDownloadingPdf ? 'Generating...' : (fySubTab === 'student_ledger' ? '📥 Download Student Ledger PDF' : '📥 Download FY PDF')}
                        </button>
                    </div>
                </div>

                {/* Top KPI Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    <div className="bg-white/10 rounded-2xl p-4">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total FY Revenue</p>
                        <p className="text-lg font-black text-emerald-400 mt-1">{fmtMoney(current.totalRevenue)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{current.receiptsCount.toLocaleString()} receipts</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total FY Expenditure</p>
                        <p className="text-lg font-black text-amber-300 mt-1">{fmtMoney(current.totalExpenditure)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{current.expensesCount} expenses • {current.payrollCount} payroll</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Net Surplus / (Deficit)</p>
                        <p className={`text-lg font-black mt-1 ${current.netSurplus >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>{fmtMoney(current.netSurplus)}</p>
                        {showComparative && prior && (
                            <p className="text-[10px] text-indigo-300 mt-0.5">vs {fmtMoney(prior.netSurplus)} ({calcVarPct(current.netSurplus, prior.netSurplus)})</p>
                        )}
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">FY Fee Collection Rate</p>
                        <p className="text-lg font-black text-indigo-300 mt-1">
                            {(current.totalOpeningBf + current.totalInvoiced) > 0
                                ? `${Math.round((current.totalFeeCollected / (current.totalOpeningBf + current.totalInvoiced)) * 100)}%`
                                : '0%'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Billed: {fmtMoney(current.totalInvoiced)}</p>
                    </div>
                </div>
            </div>

            {/* Sub-tab Pills */}
            <div className="flex flex-wrap gap-2 print:hidden">
                {subTabs.map(t => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setFySubTab(t.id)}
                        className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                            fySubTab === t.id
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* 1. Income & Expenditure Statement */}
            {fySubTab === 'income_exp' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                    <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Statement of Financial Performance (Income &amp; Expenditure)</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{fyLabel} ({fyRangeLabel})</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-900 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    <th className="py-3 px-3">Account / Line Item</th>
                                    <th className="py-3 px-3 text-right">{fyLabel}</th>
                                    {showComparative && prior && <th className="py-3 px-3 text-right">{prevFyLabel}</th>}
                                    {showComparative && prior && <th className="py-3 px-3 text-right">Variance</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                <tr className="bg-slate-50 dark:bg-slate-800/40 font-black text-[10px] uppercase tracking-wider text-slate-500">
                                    <td colSpan={showComparative && prior ? 4 : 2} className="py-2 px-3">Revenue / Inflows</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Fee Collections (Student Receipts)</td>
                                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{fmtMoney(current.totalFeeCollected)}</td>
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right text-slate-500">{fmtMoney(prior.totalFeeCollected)}</td>}
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{calcVarPct(current.totalFeeCollected, prior.totalFeeCollected)}</td>}
                                </tr>
                                {!isPrivateSchool && (
                                    <>
                                        <tr>
                                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">GoK Capitation Grants (SIMBA + GPA)</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{fmtMoney(current.totalGok)}</td>
                                            {showComparative && prior && <td className="py-2.5 px-3 text-right text-slate-500">{fmtMoney(prior.totalGok)}</td>}
                                            {showComparative && prior && <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{calcVarPct(current.totalGok, prior.totalGok)}</td>}
                                        </tr>
                                        <tr>
                                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">NG-CDF &amp; External Bursaries</td>
                                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{fmtMoney(current.totalBursaries)}</td>
                                            {showComparative && prior && <td className="py-2.5 px-3 text-right text-slate-500">{fmtMoney(prior.totalBursaries)}</td>}
                                            {showComparative && prior && <td className="py-2.5 px-3 text-right font-bold text-indigo-600">{calcVarPct(current.totalBursaries, prior.totalBursaries)}</td>}
                                        </tr>
                                    </>
                                )}
                                <tr className="bg-emerald-50/60 dark:bg-emerald-950/20 font-black">
                                    <td className="py-2.5 px-3 text-slate-900 dark:text-white uppercase">Total Revenue</td>
                                    <td className="py-2.5 px-3 text-right text-emerald-700">{fmtMoney(current.totalRevenue)}</td>
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right text-slate-600">{fmtMoney(prior.totalRevenue)}</td>}
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right text-indigo-700">{calcVarPct(current.totalRevenue, prior.totalRevenue)}</td>}
                                </tr>

                                <tr className="bg-slate-50 dark:bg-slate-800/40 font-black text-[10px] uppercase tracking-wider text-slate-500">
                                    <td colSpan={showComparative && prior ? 4 : 2} className="py-2 px-3">Expenditure / Outflows</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Operating &amp; Administrative Expenses</td>
                                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">{fmtMoney(current.totalOperatingExpenses)}</td>
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right text-slate-500">{fmtMoney(prior.totalOperatingExpenses)}</td>}
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right font-bold text-slate-600">{calcVarPct(current.totalOperatingExpenses, prior.totalOperatingExpenses)}</td>}
                                </tr>
                                <tr>
                                    <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">Staff Payroll (Gross Salaries &amp; Statutory)</td>
                                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">{fmtMoney(current.totalPayrollGross)}</td>
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right text-slate-500">{fmtMoney(prior.totalPayrollGross)}</td>}
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right font-bold text-slate-600">{calcVarPct(current.totalPayrollGross, prior.totalPayrollGross)}</td>}
                                </tr>
                                <tr className="bg-rose-50/60 dark:bg-rose-950/20 font-black">
                                    <td className="py-2.5 px-3 text-slate-900 dark:text-white uppercase">Total Expenditure</td>
                                    <td className="py-2.5 px-3 text-right text-rose-700">{fmtMoney(current.totalExpenditure)}</td>
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right text-slate-600">{fmtMoney(prior.totalExpenditure)}</td>}
                                    {showComparative && prior && <td className="py-2.5 px-3 text-right text-slate-600">{calcVarPct(current.totalExpenditure, prior.totalExpenditure)}</td>}
                                </tr>

                                <tr className="bg-slate-900 text-white font-black text-sm">
                                    <td className="py-3.5 px-3 uppercase tracking-wider">Net Surplus / (Deficit)</td>
                                    <td className={`py-3.5 px-3 text-right ${current.netSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtMoney(current.netSurplus)}</td>
                                    {showComparative && prior && <td className="py-3.5 px-3 text-right text-slate-300">{fmtMoney(prior.netSurplus)}</td>}
                                    {showComparative && prior && <td className="py-3.5 px-3 text-right text-indigo-300">{calcVarPct(current.netSurplus, prior.netSurplus)}</td>}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Votehead Collection Breakdown */}
                    {Object.keys(current.voteHeadMap).length > 0 && (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Fee Collections by Vote Head ({fyLabel})</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {Object.entries(current.voteHeadMap).sort((a, b) => b[1] - a[1]).map(([vh, amt]) => (
                                    <div key={vh} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black uppercase text-slate-400 truncate">{vh}</p>
                                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mt-1">{fmtMoney(amt)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 2. Student FY Ledger (Invoiced at Start of FY, Installments, End-of-Year Arrears / Prepayment & Summary Totals) */}
            {fySubTab === 'student_ledger' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Student Financial Year Ledger — {fyLabel}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Opening B/F, FY Invoiced Amount, Chronological Installments Paid &amp; End-of-Year Arrears / Prepayment ({filteredStudentLedger.length} students)
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 print:hidden">
                            <input
                                type="text"
                                value={studentLedgerSearch}
                                onChange={(e) => setStudentLedgerSearch(e.target.value)}
                                placeholder="Search student or Adm.No..."
                                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <select
                                value={studentLedgerClass}
                                onChange={(e) => setStudentLedgerClass(e.target.value)}
                                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                            >
                                <option value="All">All Classes</option>
                                {studentLedgerClasses.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                            <select
                                value={studentLedgerStatus}
                                onChange={(e) => setStudentLedgerStatus(e.target.value as any)}
                                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                            >
                                <option value="all">All Balances</option>
                                <option value="arrears">Arrears Only</option>
                                <option value="prepayment">Prepayments Only</option>
                                <option value="cleared">Cleared (Zero Bal)</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                                    <th rowSpan={2} className="py-2 px-2 border border-slate-700 text-center">#</th>
                                    <th rowSpan={2} className="py-2 px-2 border border-slate-700">Adm.No</th>
                                    <th rowSpan={2} className="py-2 px-2.5 border border-slate-700">Student Name</th>
                                    <th rowSpan={2} className="py-2 px-2 border border-slate-700">Class</th>
                                    <th rowSpan={2} className="py-2 px-2 border border-slate-700 text-right">Opening B/F</th>
                                    <th rowSpan={2} className="py-2 px-2 border border-slate-700 text-right">FY Invoiced</th>
                                    <th rowSpan={2} className="py-2 px-2 border border-slate-700 text-right">Total Expected</th>
                                    <th colSpan={studentLedgerTotals.hasExtra ? 7 : 6} className="py-1.5 px-2 border border-slate-700 text-center bg-indigo-950">
                                        Installments Paid During Financial Year
                                    </th>
                                    <th rowSpan={2} className="py-2 px-2 border border-slate-700 text-right bg-emerald-950">Total Paid</th>
                                    <th colSpan={2} className="py-1.5 px-2 border border-slate-700 text-center bg-slate-800">
                                        End-of-Year Balance
                                    </th>
                                </tr>
                                <tr className="bg-slate-800 text-slate-200 text-[8.5px] font-bold uppercase">
                                    <th className="py-1.5 px-2 border border-slate-700 text-right">1st</th>
                                    <th className="py-1.5 px-2 border border-slate-700 text-right">2nd</th>
                                    <th className="py-1.5 px-2 border border-slate-700 text-right">3rd</th>
                                    <th className="py-1.5 px-2 border border-slate-700 text-right">4th</th>
                                    <th className="py-1.5 px-2 border border-slate-700 text-right">5th</th>
                                    <th className="py-1.5 px-2 border border-slate-700 text-right">6th</th>
                                    {studentLedgerTotals.hasExtra && (
                                        <th className="py-1.5 px-2 border border-slate-700 text-right">6th+</th>
                                    )}
                                    <th className="py-1.5 px-2 border border-slate-700 text-right text-rose-300">Arrears (Dr)</th>
                                    <th className="py-1.5 px-2 border border-slate-700 text-right text-indigo-300">Prepayment (Cr)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredStudentLedger.length === 0 ? (
                                    <tr>
                                        <td colSpan={studentLedgerTotals.hasExtra ? 17 : 16} className="py-10 text-center text-slate-400 font-semibold">
                                            No students match the selected Financial Year / filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudentLedger.map((r, idx) => (
                                        <tr key={r.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-center text-slate-400 font-bold">{idx + 1}</td>
                                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">{r.adm}</td>
                                            <td className="py-2 px-2.5 border-r border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white whitespace-nowrap">{r.name}</td>
                                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 whitespace-nowrap">{r.className}</td>
                                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-right whitespace-nowrap">
                                                {r.openingBf !== 0 ? Math.round(r.openingBf).toLocaleString() : '0'}
                                            </td>
                                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-right font-semibold whitespace-nowrap">
                                                {Math.round(r.invoiced).toLocaleString()}
                                            </td>
                                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-right font-black text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                {Math.round(r.totalExpected).toLocaleString()}
                                            </td>
                                            {r.installments.map((val, cIdx) => (
                                                <td key={cIdx} className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                    {val > 0 ? Math.round(val).toLocaleString() : '—'}
                                                </td>
                                            ))}
                                            {studentLedgerTotals.hasExtra && (
                                                <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-right whitespace-nowrap text-slate-700 dark:text-slate-300">
                                                    {r.extraInstallments > 0 ? Math.round(r.extraInstallments).toLocaleString() : '—'}
                                                </td>
                                            )}
                                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                                {Math.round(r.totalPaid).toLocaleString()}
                                            </td>
                                            <td className="py-2 px-2 border-r border-slate-100 dark:border-slate-800 text-right font-black text-rose-700 dark:text-rose-400 whitespace-nowrap">
                                                {r.arrears > 0 ? Math.round(r.arrears).toLocaleString() : '—'}
                                            </td>
                                            <td className="py-2 px-2 text-right font-black text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                                                {r.prepayment > 0 ? Math.round(r.prepayment).toLocaleString() : '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {/* Table Summary Totals Row */}
                                {filteredStudentLedger.length > 0 && (
                                    <tr className="bg-slate-100 dark:bg-slate-800 font-black border-t-2 border-slate-900 dark:border-slate-600 text-xs">
                                        <td colSpan={4} className="py-3 px-2.5 uppercase text-slate-900 dark:text-white">
                                            SUMMARY TOTALS ({filteredStudentLedger.length} Students)
                                        </td>
                                        <td className="py-3 px-2 text-right whitespace-nowrap">{Math.round(studentLedgerTotals.openingBf).toLocaleString()}</td>
                                        <td className="py-3 px-2 text-right whitespace-nowrap">{Math.round(studentLedgerTotals.invoiced).toLocaleString()}</td>
                                        <td className="py-3 px-2 text-right whitespace-nowrap">{Math.round(studentLedgerTotals.totalExpected).toLocaleString()}</td>
                                        {studentLedgerTotals.instSums.map((sum, i) => (
                                            <td key={i} className="py-3 px-2 text-right whitespace-nowrap">
                                                {sum > 0 ? Math.round(sum).toLocaleString() : '—'}
                                            </td>
                                        ))}
                                        {studentLedgerTotals.hasExtra && (
                                            <td className="py-3 px-2 text-right whitespace-nowrap">{Math.round(studentLedgerTotals.extraSum).toLocaleString()}</td>
                                        )}
                                        <td className="py-3 px-2 text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                            {Math.round(studentLedgerTotals.totalPaid).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-2 text-right text-rose-700 dark:text-rose-400 whitespace-nowrap">
                                            {Math.round(studentLedgerTotals.arrears).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-2 text-right text-indigo-700 dark:text-indigo-400 whitespace-nowrap">
                                            {Math.round(studentLedgerTotals.prepayment).toLocaleString()}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Well-Formatted Summary Totals Cards Below Table */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-2xl bg-slate-900 text-white">
                        <div className="p-3 rounded-xl bg-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Opening Balance B/F</p>
                            <p className="text-base font-black font-mono mt-1">{fmtMoney(studentLedgerTotals.openingBf)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">FY Invoiced Amount</p>
                            <p className="text-base font-black font-mono text-sky-300 mt-1">{fmtMoney(studentLedgerTotals.invoiced)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white/5">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Installments Paid</p>
                            <p className="text-base font-black font-mono text-emerald-400 mt-1">{fmtMoney(studentLedgerTotals.totalPaid)}</p>
                            <p className="text-[9px] text-emerald-300 font-bold">{studentLedgerTotals.pctCollected}% of Expected</p>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30">
                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-300">End-of-Year Arrears</p>
                            <p className="text-base font-black font-mono text-rose-400 mt-1">{fmtMoney(studentLedgerTotals.arrears)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300">End-of-Year Prepayments</p>
                            <p className="text-base font-black font-mono text-indigo-300 mt-1">{fmtMoney(studentLedgerTotals.prepayment)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. FY Fee Billing & Collection by Class */}
            {fySubTab === 'billing' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4">
                    <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">FY Fee Billing &amp; Collection Performance by Class</h4>
                        <p className="text-xs text-slate-500 mt-0.5">Opening balances brought forward + FY invoiced vs. FY collected ({fyLabel})</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b-2 border-slate-900 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    <th className="py-3 px-3">Class / Grade</th>
                                    <th className="py-3 px-3 text-center">Students</th>
                                    <th className="py-3 px-3 text-right">Opening B/F</th>
                                    <th className="py-3 px-3 text-right">FY Invoiced</th>
                                    <th className="py-3 px-3 text-right">FY Collected</th>
                                    <th className="py-3 px-3 text-right">Closing Balance</th>
                                    <th className="py-3 px-3 text-center">% Paid</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {current.classRows.map(r => (
                                    <tr key={r.className} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{r.className}</td>
                                        <td className="py-2.5 px-3 text-center text-slate-500">{r.studentCount}</td>
                                        <td className="py-2.5 px-3 text-right">{fmtMoney(r.openingBf)}</td>
                                        <td className="py-2.5 px-3 text-right font-semibold">{fmtMoney(r.invoiced)}</td>
                                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{fmtMoney(r.collected)}</td>
                                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">{fmtMoney(r.closingBal)}</td>
                                        <td className="py-2.5 px-3 text-center font-black">{r.rate}%</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-100 dark:bg-slate-800 font-black border-t-2 border-slate-900">
                                    <td className="py-3 px-3 uppercase">TOTALS</td>
                                    <td className="py-3 px-3 text-center">{students.length}</td>
                                    <td className="py-3 px-3 text-right">{fmtMoney(current.totalOpeningBf)}</td>
                                    <td className="py-3 px-3 text-right">{fmtMoney(current.totalInvoiced)}</td>
                                    <td className="py-3 px-3 text-right text-emerald-700">{fmtMoney(current.totalFeeCollected)}</td>
                                    <td className="py-3 px-3 text-right text-rose-700">{fmtMoney(current.totalOpeningBf + current.totalInvoiced - current.totalFeeCollected)}</td>
                                    <td className="py-3 px-3 text-center">
                                        {(current.totalOpeningBf + current.totalInvoiced) > 0
                                            ? `${Math.round((current.totalFeeCollected / (current.totalOpeningBf + current.totalInvoiced)) * 100)}%`
                                            : '0%'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 3. FY Cash Flow Statement */}
            {fySubTab === 'cashflow' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-5 text-xs">
                    <div>
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Statement of Cash Flows — {fyLabel}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{fyRangeLabel}</p>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1.5">1. Cash Flows from Operating Activities</div>
                        <div className="flex justify-between"><span>Cash Inflow: Fee Collections {!isPrivateSchool ? '& Grants/Bursaries' : ''}</span><span className="font-bold text-emerald-700">{fmtMoney(current.totalRevenue)}</span></div>
                        <div className="flex justify-between"><span>Cash Outflow: Operating Expenses &amp; Net Payroll</span><span className="font-bold text-rose-700">{fmtMoney(-current.operatingOutflow)}</span></div>
                        <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1.5 font-black"><span>Net Cash from Operating Activities</span><span>{fmtMoney(current.netOperating)}</span></div>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1.5">2. Cash Flows from Investing Activities</div>
                        <div className="flex justify-between"><span>Capital / Asset &amp; Equipment Purchases</span><span className="font-bold text-rose-700">{fmtMoney(current.netInvesting)}</span></div>
                        <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1.5 font-black"><span>Net Cash from Investing Activities</span><span>{fmtMoney(current.netInvesting)}</span></div>
                    </div>
                    <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1.5">3. Cash Flows from Financing Activities</div>
                        <div className="flex justify-between"><span>Loans, Bank Financing &amp; Capital Outflows</span><span className="font-bold text-rose-700">{fmtMoney(current.netFinancing)}</span></div>
                        <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1.5 font-black"><span>Net Cash from Financing Activities</span><span>{fmtMoney(current.netFinancing)}</span></div>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center font-black text-sm">
                        <span className="uppercase tracking-wider">Net Increase / (Decrease) in Cash ({fyLabel})</span>
                        <span className="font-mono text-emerald-400">{fmtMoney(current.netCashChange)}</span>
                    </div>
                </div>
            )}

            {/* 4. FY Expenses & Payroll Summary */}
            {fySubTab === 'exp_payroll' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Expenditure by Category ({fyLabel})</h4>
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                    <th className="py-2">Category</th>
                                    <th className="py-2 text-center">Entries</th>
                                    <th className="py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {Object.entries(current.expenseCatMap).sort((a, b) => b[1].amount - a[1].amount).map(([cat, d]) => (
                                    <tr key={cat}>
                                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{cat}</td>
                                        <td className="py-2.5 text-center text-slate-500">{d.count}</td>
                                        <td className="py-2.5 text-right font-black text-amber-700">{fmtMoney(d.amount)}</td>
                                    </tr>
                                ))}
                                {Object.keys(current.expenseCatMap).length === 0 && (
                                    <tr><td colSpan={3} className="py-6 text-center text-slate-400">No expenses recorded in this Financial Year.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Annual Payroll Statutory Summary ({fyLabel})</h4>
                        <div className="space-y-3 text-xs">
                            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"><span className="font-bold text-slate-600 dark:text-slate-300">Total Gross Pay</span><span className="font-black text-slate-900 dark:text-white">{fmtMoney(current.totalPayrollGross)}</span></div>
                            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"><span className="font-bold text-slate-600 dark:text-slate-300">Total PAYE (KRA)</span><span className="font-black text-rose-600">{fmtMoney(current.totalPayrollPaye)}</span></div>
                            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"><span className="font-bold text-slate-600 dark:text-slate-300">Total NSSF Contributions</span><span className="font-black text-amber-700">{fmtMoney(current.totalPayrollNssf)}</span></div>
                            <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"><span className="font-bold text-slate-600 dark:text-slate-300">Total SHIF / NHIF Contributions</span><span className="font-black text-amber-700">{fmtMoney(current.totalPayrollNhif)}</span></div>
                            <div className="flex justify-between p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"><span className="font-black text-emerald-900 dark:text-emerald-300 uppercase">Total Net Salaries Disbursed</span><span className="font-black text-emerald-700 dark:text-emerald-400">{fmtMoney(current.totalPayrollNet)}</span></div>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Payment Channels & Funds */}
            {fySubTab === 'channels' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Collections by Payment Channel ({fyLabel})</h4>
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                    <th className="py-2">Channel</th>
                                    <th className="py-2 text-center">Receipts</th>
                                    <th className="py-2 text-right">Amount Collected</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {Object.entries(current.channelMap).sort((a, b) => b[1].amount - a[1].amount).map(([ch, d]) => (
                                    <tr key={ch}>
                                        <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{ch}</td>
                                        <td className="py-2.5 text-center text-slate-500">{d.count}</td>
                                        <td className="py-2.5 text-right font-black text-emerald-700">{fmtMoney(d.amount)}</td>
                                    </tr>
                                ))}
                                {Object.keys(current.channelMap).length === 0 && (
                                    <tr><td colSpan={3} className="py-6 text-center text-slate-400">No receipts recorded in this Financial Year.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isPrivateSchool && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-4">
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Public School GoK &amp; Bursary Funds ({fyLabel})</h4>
                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"><span className="font-bold text-slate-600 dark:text-slate-300">SIMBA Account (Tuition)</span><span className="font-black text-indigo-700">{fmtMoney(current.gokSimba)}</span></div>
                                <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"><span className="font-bold text-slate-600 dark:text-slate-300">GPA Account (Operations)</span><span className="font-black text-indigo-700">{fmtMoney(current.gokGpa)}</span></div>
                                <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40"><span className="font-bold text-slate-600 dark:text-slate-300">NG-CDF &amp; External Bursaries</span><span className="font-black text-emerald-700">{fmtMoney(current.totalBursaries)}</span></div>
                                <div className="flex justify-between p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900"><span className="font-black text-indigo-900 dark:text-indigo-300 uppercase">Total Government / Bursary Funding</span><span className="font-black text-indigo-700 dark:text-indigo-400">{fmtMoney(current.totalGok + current.totalBursaries)}</span></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
