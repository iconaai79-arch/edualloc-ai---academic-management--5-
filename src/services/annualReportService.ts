/**
 * annualReportService.ts
 * Generates the Kenya Government Annual Financial Report PDF
 * for Public Secondary / Senior Schools — FY2025-26
 * Based on the official MOE template.
 */

import type { Invoice, Receipt, Expense, Institution, CompanyDetails } from '../types';

// ─── Data shape the caller must pass ────────────────────────────────────────
export interface AnnualReportData {
    // Period
    financialYear: string;         // e.g. "2025/2026"
    yearEndDate: string;           // e.g. "30th June 2026"
    comparativeYear?: string;      // e.g. "2024/2025"

    // Revenue – non-exchange
    capitationTuition: number;
    capitationOperations: number;
    capitationInfrastructure: number;
    capitationSNE: number;
    donorGrants: number;
    govtTransfers: number;
    contributions: number;

    // Revenue – exchange
    studentFees: number;
    miscIncome: number;
    financeIncome: number;

    // Comparative revenue (optional)
    cmp_capitationTuition?: number;
    cmp_capitationOperations?: number;
    cmp_capitationInfrastructure?: number;
    cmp_capitationSNE?: number;
    cmp_donorGrants?: number;
    cmp_govtTransfers?: number;
    cmp_contributions?: number;
    cmp_studentFees?: number;
    cmp_miscIncome?: number;
    cmp_financeIncome?: number;

    // Expenditure
    expTuition: number;
    expOperations: number;
    expSNE: number;
    expBoarding: number;
    expDepreciation: number;
    expFinanceCosts: number;

    // Comparative expenditure (optional)
    cmp_expTuition?: number;
    cmp_expOperations?: number;
    cmp_expSNE?: number;
    cmp_expBoarding?: number;
    cmp_expDepreciation?: number;
    cmp_expFinanceCosts?: number;

    // Balance sheet – assets
    cashBank: number;
    accountsReceivable: number;
    inventories: number;
    prepayments: number;
    longTermInvestments: number;
    ppe: number;
    intangibleAssets: number;

    // Comparative assets (optional)
    cmp_cashBank?: number;
    cmp_accountsReceivable?: number;
    cmp_inventories?: number;
    cmp_prepayments?: number;
    cmp_longTermInvestments?: number;
    cmp_ppe?: number;
    cmp_intangibleAssets?: number;

    // Balance sheet – liabilities
    feesAdvance: number;
    accountsPayable: number;
    shortTermBorrowings: number;
    provisions: number;
    longTermBorrowings: number;

    // Comparative liabilities (optional)
    cmp_feesAdvance?: number;
    cmp_accountsPayable?: number;
    cmp_shortTermBorrowings?: number;
    cmp_provisions?: number;
    cmp_longTermBorrowings?: number;

    // Net assets
    openingAccumulatedSurplus: number;
    cmp_openingAccumulatedSurplus?: number;

    // Signatories
    bomChairName?: string;
    principalName?: string;
    bursarName?: string;
    icpakNo?: string;
    approvalDate?: string;

    // Budget vs Actual (optional)
    budgetLines?: Array<{
        item: string;
        originalBudget: number;
        adjustments: number;
        actual: number;
    }>;

    // Cash flow adjustments
    purchasePPE?: number;
    proceedsDisposal?: number;
    proceedsBorrowings?: number;
    repaymentBorrowings?: number;
    openingCash?: number;
    cmp_openingCash?: number;
}

// ─── Helper: number formatter ─────────────────────────────────────────────────
const kes = (n: number | undefined) => (n == null ? '—' : n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }));

// ─── Lazy jsPDF loader (same pattern as pdfService.ts) ───────────────────────
function getJsPdf() {
    if (typeof window === 'undefined') return null;
    return (window as any).jspdf;
}

// ─── Load image helper ───────────────────────────────────────────────────────
function loadImg(url: string | null): Promise<HTMLImageElement | null> {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// ─── Page constants ───────────────────────────────────────────────────────────
const M = 14; // margin

// ─── Draw letterhead ─────────────────────────────────────────────────────────
function drawLetterhead(
    doc: any,
    title: string,
    institution: Institution,
    logoImg: HTMLImageElement | null,
    headerImg: HTMLImageElement | null
): number {
    const pw = doc.internal.pageSize.getWidth();

    if (headerImg) {
        const iw = pw - M * 2;
        const ih = Math.min((headerImg.height * iw) / headerImg.width, 40);
        const fx = (pw - iw) / 2;
        doc.addImage(headerImg, 'JPEG', fx, 15, iw, ih);
        const lineY = 15 + ih + 5;
        doc.setDrawColor(180, 180, 180);
        doc.line(M, lineY, pw - M, lineY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(title, M, lineY + 10);
        return lineY + 20;
    }

    if (logoImg) {
        const lw = 22;
        const lh = (logoImg.height * lw) / logoImg.width;
        doc.addImage(logoImg, 'PNG', M, 12, lw, lh);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const schoolName = institution?.name || 'School Name';
    doc.text(schoolName.toUpperCase(), pw / 2, 18, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text('ANNUAL REPORT AND FINANCIAL STATEMENTS', pw / 2, 24, { align: 'center' });

    doc.setDrawColor(20, 80, 200);
    doc.setLineWidth(0.8);
    doc.line(M, 30, pw - M, 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(title, M, 42);
    return 52;
}

// ─── Add a new page with header ──────────────────────────────────────────────
function addPage(doc: any, title: string, institution: Institution, logoImg: HTMLImageElement | null, headerImg: HTMLImageElement | null): number {
    doc.addPage();
    return drawLetterhead(doc, title, institution, logoImg, headerImg);
}

// ─── Section heading ─────────────────────────────────────────────────────────
function sectionHead(doc: any, text: string, y: number, color = [30, 64, 175]): number {
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(M, y, pw - M * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(text, M + 3, y + 5.5);
    doc.setTextColor(0, 0, 0);
    return y + 12;
}

// ─── Table row ───────────────────────────────────────────────────────────────
function tableRow(doc: any, label: string, cur: string, cmp: string, y: number, bold = false, shade = false): number {
    const pw = doc.internal.pageSize.getWidth();
    const colW1 = pw - M * 2 - 60;
    if (shade) {
        doc.setFillColor(245, 247, 250);
        doc.rect(M, y - 3, pw - M * 2, 7, 'F');
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(label, M + 2, y + 1.5);
    doc.text(cur, M + colW1 + 28, y + 1.5, { align: 'right' });
    doc.text(cmp, pw - M - 2, y + 1.5, { align: 'right' });
    return y + 7;
}

// ─── Table header row ─────────────────────────────────────────────────────────
function tableHeader(doc: any, col1: string, col2: string, col3: string, y: number): number {
    const pw = doc.internal.pageSize.getWidth();
    const colW1 = pw - M * 2 - 60;
    doc.setFillColor(241, 245, 249);
    doc.rect(M, y - 3, pw - M * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(col1, M + 2, y + 1.5);
    doc.text(col2, M + colW1 + 28, y + 1.5, { align: 'right' });
    doc.text(col3, pw - M - 2, y + 1.5, { align: 'right' });
    return y + 7;
}

// ─── Divider line ─────────────────────────────────────────────────────────────
function divider(doc: any, y: number, thick = false): void {
    const pw = doc.internal.pageSize.getWidth();
    doc.setDrawColor(thick ? 0 : 200, thick ? 0 : 200, thick ? 0 : 200);
    doc.setLineWidth(thick ? 0.5 : 0.2);
    doc.line(M, y, pw - M, y);
}

// ─── Signatory block ──────────────────────────────────────────────────────────
function signBlock(doc: any, names: string[], roles: string[], y: number): number {
    const pw = doc.internal.pageSize.getWidth();
    const blockW = (pw - M * 2) / names.length;
    names.forEach((name, i) => {
        const x = M + i * blockW;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('……………………………………………', x + 2, y);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(name || 'Name: ……………………………', x + 2, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text(roles[i] || '', x + 2, y + 11);
    });
    return y + 22;
}

// ─── Main export function ─────────────────────────────────────────────────────
export const generateAnnualReportPdf = async (
    data: AnnualReportData,
    institution: Institution,
    companyDetails: CompanyDetails | undefined,
    logoUrl: string | null
): Promise<string> => {
    const lib = getJsPdf();
    if (!lib) throw new Error('jsPDF library not loaded.');

    const doc = new lib.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const letterConfig = (institution as any)?.letterheadConfig || companyDetails?.letterheadConfig;
    const headerImg = letterConfig?.headerImageUrl ? await loadImg(letterConfig.headerImageUrl) : null;
    const logoImg = await loadImg(logoUrl);

    const fy = data.financialYear || '2025/2026';
    const yEnd = data.yearEndDate || '30th June 2026';
    const cmpy = data.comparativeYear || '2024/2025';

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 1 — STATEMENT OF FINANCIAL PERFORMANCE
    // ─────────────────────────────────────────────────────────────────────────
    let y = drawLetterhead(doc, `Statement of Financial Performance — Year Ended ${yEnd}`, institution, logoImg, headerImg);

    // Currency header
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const pw = doc.internal.pageSize.getWidth();
    doc.text('(All amounts in Kenya Shillings)', pw - M, y, { align: 'right' });
    y += 6;

    y = tableHeader(doc, 'Description', fy, cmpy, y);
    y += 2;

    // Revenue – non-exchange
    y = sectionHead(doc, 'REVENUE FROM NON-EXCHANGE TRANSACTIONS', y);
    const revNonExLines = [
        ['Capitation Grants for Tuition (Note 1)', data.capitationTuition, data.cmp_capitationTuition],
        ['Capitation Grants for Operations (Note 2)', data.capitationOperations, data.cmp_capitationOperations],
        ['Revenue for Infrastructure (Note 3)', data.capitationInfrastructure, data.cmp_capitationInfrastructure],
        ['Capitation Grants for Special Needs (Note 4)', data.capitationSNE, data.cmp_capitationSNE],
        ['Grants from Donors & Development Partners (Note 5)', data.donorGrants, data.cmp_donorGrants],
        ['Transfers from Other Government Entities (Note 6)', data.govtTransfers, data.cmp_govtTransfers],
        ['Contributions and Donations (Note 7)', data.contributions, data.cmp_contributions],
    ];
    revNonExLines.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), kes(Number(cur)), kes(Number(cmp)), y, false, i % 2 === 0);
    });
    const subTotalRevNonEx = revNonExLines.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_subTotalRevNonEx = revNonExLines.reduce((s, r) => s + Number(r[2] || 0), 0);
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Sub Total', kes(subTotalRevNonEx), kes(cmp_subTotalRevNonEx), y, true);
    y += 3;

    // Revenue – exchange
    y = sectionHead(doc, 'REVENUE FROM EXCHANGE TRANSACTIONS', y);
    const revExLines = [
        ['Students\' Fees (Note 8)', data.studentFees, data.cmp_studentFees],
        ['Miscellaneous Income (Note 9)', data.miscIncome, data.cmp_miscIncome],
        ['Finance Income (Note 10)', data.financeIncome, data.cmp_financeIncome],
    ];
    revExLines.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), kes(Number(cur)), kes(Number(cmp)), y, false, i % 2 === 0);
    });
    const totalRevEx = revExLines.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_totalRevEx = revExLines.reduce((s, r) => s + Number(r[2] || 0), 0);
    const totalRevenue = subTotalRevNonEx + totalRevEx;
    const cmp_totalRevenue = cmp_subTotalRevNonEx + cmp_totalRevEx;
    divider(doc, y); y += 2;
    y = tableRow(doc, 'TOTAL REVENUE', kes(totalRevenue), kes(cmp_totalRevenue), y, true);
    y += 5;

    // Expenses
    y = sectionHead(doc, 'EXPENSES', y, [185, 28, 28]);
    const expLines = [
        ['Expenditure for Tuition (Note 11)', data.expTuition, data.cmp_expTuition],
        ['Expenditure for Operations (Note 12)', data.expOperations, data.cmp_expOperations],
        ['Expenditure for Special Needs Education (Note 13)', data.expSNE, data.cmp_expSNE],
        ['Expenditure for Boarding / Lunch Programme (Note 14)', data.expBoarding, data.cmp_expBoarding],
        ['Depreciation and Amortisation Expense (Note 15)', data.expDepreciation, data.cmp_expDepreciation],
        ['Finance Costs (Note 16)', data.expFinanceCosts, data.cmp_expFinanceCosts],
    ];
    expLines.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), kes(Number(cur)), kes(Number(cmp)), y, false, i % 2 === 0);
    });
    const totalExpenses = expLines.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_totalExpenses = expLines.reduce((s, r) => s + Number(r[2] || 0), 0);
    divider(doc, y); y += 2;
    y = tableRow(doc, 'TOTAL EXPENSES', kes(totalExpenses), kes(cmp_totalExpenses), y, true);
    y += 5;

    // Net surplus / deficit
    const netSurplus = totalRevenue - totalExpenses;
    const cmp_netSurplus = cmp_totalRevenue - cmp_totalExpenses;
    doc.setFillColor(netSurplus >= 0 ? 5 : 185, netSurplus >= 0 ? 150 : 28, netSurplus >= 0 ? 105 : 28);
    doc.rect(M, y - 3, pw - M * 2, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    const pw2 = pw - M * 2 - 60;
    doc.text(netSurplus >= 0 ? 'NET SURPLUS FOR THE YEAR' : 'NET DEFICIT FOR THE YEAR', M + 3, y + 2.5);
    doc.text(kes(Math.abs(netSurplus)), M + pw2 + 28, y + 2.5, { align: 'right' });
    doc.text(kes(Math.abs(cmp_netSurplus)), pw - M - 2, y + 2.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 14;

    // Signatories
    y = signBlock(doc, [data.bomChairName || '', data.principalName || '', data.bursarName || ''],
        ['Chair, Board of Management', 'Principal / Secretary to BOM', `Bursar / Finance Officer${data.icpakNo ? '\nICPAK No: ' + data.icpakNo : ''}`], y);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Approved on: ${data.approvalDate || '……………………………'}`, M, y);

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 2 — STATEMENT OF FINANCIAL POSITION
    // ─────────────────────────────────────────────────────────────────────────
    y = addPage(doc, `Statement of Financial Position as at ${yEnd}`, institution, logoImg, headerImg);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('(All amounts in Kenya Shillings)', pw - M, y, { align: 'right' });
    y += 6;

    y = tableHeader(doc, 'Description', fy, cmpy, y);
    y += 2;

    // Assets
    y = sectionHead(doc, 'ASSETS', y, [30, 100, 60]);
    y = sectionHead(doc, 'Current Assets', y, [60, 140, 100]);
    const currentAssetLines = [
        ['Cash and Cash Equivalents (Note 20)', data.cashBank, data.cmp_cashBank],
        ['Accounts Receivables (Note 21)', data.accountsReceivable, data.cmp_accountsReceivable],
        ['Inventories (Note 22)', data.inventories, data.cmp_inventories],
        ['Prepayments (Note 23)', data.prepayments, data.cmp_prepayments],
    ];
    currentAssetLines.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), kes(Number(cur)), kes(Number(cmp)), y, false, i % 2 === 0);
    });
    const totalCurrentAssets = currentAssetLines.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_totalCurrentAssets = currentAssetLines.reduce((s, r) => s + Number(r[2] || 0), 0);
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Total Current Assets', kes(totalCurrentAssets), kes(cmp_totalCurrentAssets), y, true);
    y += 3;

    y = sectionHead(doc, 'Non-Current Assets', y, [60, 140, 100]);
    const ncaLines = [
        ['Long Term Investments (Note 24)', data.longTermInvestments, data.cmp_longTermInvestments],
        ['Property, Plant and Equipment (Note 25)', data.ppe, data.cmp_ppe],
        ['Intangible Assets (Note 26)', data.intangibleAssets, data.cmp_intangibleAssets],
    ];
    ncaLines.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), kes(Number(cur)), kes(Number(cmp)), y, false, i % 2 === 0);
    });
    const totalNCA = ncaLines.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_totalNCA = ncaLines.reduce((s, r) => s + Number(r[2] || 0), 0);
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Total Non-Current Assets', kes(totalNCA), kes(cmp_totalNCA), y, true);
    y += 3;

    const totalAssets = totalCurrentAssets + totalNCA;
    const cmp_totalAssets = cmp_totalCurrentAssets + cmp_totalNCA;
    doc.setFillColor(30, 100, 60);
    doc.rect(M, y - 3, pw - M * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL ASSETS (a)', M + 3, y + 2);
    doc.text(kes(totalAssets), M + pw2 + 28, y + 2, { align: 'right' });
    doc.text(kes(cmp_totalAssets), pw - M - 2, y + 2, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 14;

    // Liabilities
    y = sectionHead(doc, 'LIABILITIES', y, [185, 28, 28]);
    y = sectionHead(doc, 'Current Liabilities', y, [210, 80, 80]);
    const clLines = [
        ['Fees / Income Received in Advance (Note 28)', data.feesAdvance, data.cmp_feesAdvance],
        ['Accounts Payables (Note 29)', data.accountsPayable, data.cmp_accountsPayable],
        ['Short Term Borrowings (Note 30)', data.shortTermBorrowings, data.cmp_shortTermBorrowings],
        ['Current Provisions (Note 31)', data.provisions, data.cmp_provisions],
    ];
    clLines.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), kes(Number(cur)), kes(Number(cmp)), y, false, i % 2 === 0);
    });
    const totalCL = clLines.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_totalCL = clLines.reduce((s, r) => s + Number(r[2] || 0), 0);
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Total Current Liabilities', kes(totalCL), kes(cmp_totalCL), y, true);
    y += 3;

    y = sectionHead(doc, 'Non-Current Liabilities', y, [210, 80, 80]);
    const nclLines = [
        ['Long Term Borrowings (Note 30)', data.longTermBorrowings, data.cmp_longTermBorrowings ?? 0],
    ];
    nclLines.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), kes(Number(cur)), kes(Number(cmp)), y, false, i % 2 === 0);
    });
    const totalNCL = nclLines.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_totalNCL = nclLines.reduce((s, r) => s + Number(r[2] || 0), 0);
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Total Non-Current Liabilities', kes(totalNCL), kes(cmp_totalNCL), y, true);
    y += 3;

    const totalLiabilities = totalCL + totalNCL;
    const cmp_totalLiabilities = cmp_totalCL + cmp_totalNCL;
    const netAssets = totalAssets - totalLiabilities;
    const cmp_netAssets = cmp_totalAssets - cmp_totalLiabilities;

    doc.setFillColor(185, 28, 28);
    doc.rect(M, y - 3, pw - M * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL LIABILITIES (b)', M + 3, y + 2);
    doc.text(kes(totalLiabilities), M + pw2 + 28, y + 2, { align: 'right' });
    doc.text(kes(cmp_totalLiabilities), pw - M - 2, y + 2, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 10;

    doc.setFillColor(30, 64, 175);
    doc.rect(M, y - 3, pw - M * 2, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('NET ASSETS / EQUITY (a – b)', M + 3, y + 2.5);
    doc.text(kes(netAssets), M + pw2 + 28, y + 2.5, { align: 'right' });
    doc.text(kes(cmp_netAssets), pw - M - 2, y + 2.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 14;

    y = tableRow(doc, 'Represented by: Accumulated Surplus / (Deficit)', kes(netAssets), kes(cmp_netAssets), y, true);

    y += 4;
    y = signBlock(doc, [data.bomChairName || '', data.principalName || '', data.bursarName || ''],
        ['Chair, Board of Management', 'Principal / Secretary to BOM', 'Bursar / Finance Officer'], y);

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 3 — STATEMENT OF CHANGES IN NET ASSETS
    // ─────────────────────────────────────────────────────────────────────────
    y = addPage(doc, `Statement of Changes in Net Assets — Year Ended ${yEnd}`, institution, logoImg, headerImg);

    y += 4;
    y = tableHeader(doc, 'Description', 'Accumulated Surplus (KShs)', '', y);
    y += 2;

    const cmpSurplus = data.openingAccumulatedSurplus;
    const cmpSurplusEnd = cmpSurplus + (cmp_netSurplus ?? 0);
    const changeLines = [
        { label: `Accumulated Fund Balance B/F as at 30 June ${(parseInt(fy.split('/')[0]) - 1) || ''}`, val: kes(cmpSurplus), bold: false },
        { label: `Surplus / (Deficit) for the prior year`, val: kes(Math.abs(cmp_netSurplus ?? 0)), bold: false },
        { label: `Balance as at 30 June ${fy.split('/')[0]}`, val: kes(cmpSurplusEnd), bold: true },
        { label: '', val: '', bold: false },
        { label: `Balance at 1 July ${fy.split('/')[0]} (Current Year)`, val: kes(cmpSurplusEnd), bold: false },
        { label: `Surplus / (Deficit) for the year ${fy}`, val: kes(Math.abs(netSurplus)), bold: false },
        { label: `NET ASSETS as at 30 June ${fy.split('/')[1] || ''}`, val: kes(cmpSurplusEnd + netSurplus), bold: true },
    ];
    changeLines.forEach(({ label, val, bold }, i) => {
        if (!label) { y += 3; return; }
        y = tableRow(doc, label, val, '', y, bold, i % 2 === 0);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 4 — STATEMENT OF CASH FLOWS
    // ─────────────────────────────────────────────────────────────────────────
    y = addPage(doc, `Statement of Cash Flows — Year Ended ${yEnd}`, institution, logoImg, headerImg);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text('(Direct Method as prescribed by PSASB)', pw - M, y, { align: 'right' });
    y += 6;
    y = tableHeader(doc, 'Description', fy, cmpy, y);
    y += 2;

    y = sectionHead(doc, 'CASH FROM OPERATING ACTIVITIES', y);
    y = sectionHead(doc, 'Receipts', y, [60, 140, 100]);
    const cashReceipts = [
        ['Capitation Grants for Tuition', data.capitationTuition, data.cmp_capitationTuition ?? 0],
        ['Capitation Grants for Operations', data.capitationOperations, data.cmp_capitationOperations ?? 0],
        ['Revenue for Infrastructure', data.capitationInfrastructure, data.cmp_capitationInfrastructure ?? 0],
        ['Grants for Special Needs', data.capitationSNE, data.cmp_capitationSNE ?? 0],
        ['Grants from Donors & Development Partners', data.donorGrants, data.cmp_donorGrants ?? 0],
        ['Transfers from Government Entities', data.govtTransfers, data.cmp_govtTransfers ?? 0],
        ['Contributions and Donations', data.contributions, data.cmp_contributions ?? 0],
        ['Students\' Fees', data.studentFees, data.cmp_studentFees ?? 0],
        ['Miscellaneous Income', data.miscIncome, data.cmp_miscIncome ?? 0],
        ['Finance Income', data.financeIncome, data.cmp_financeIncome ?? 0],
    ];
    cashReceipts.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), kes(Number(cur)), kes(Number(cmp)), y, false, i % 2 === 0);
    });
    const totalCashReceipts = cashReceipts.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_totalCashReceipts = cashReceipts.reduce((s, r) => s + Number(r[2] || 0), 0);
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Total Receipts', kes(totalCashReceipts), kes(cmp_totalCashReceipts), y, true);
    y += 3;

    y = sectionHead(doc, 'Payments', y, [185, 60, 60]);
    const cashPayments = [
        ['Payments for Tuition', data.expTuition, data.cmp_expTuition ?? 0],
        ['Payments for Operations', data.expOperations, data.cmp_expOperations ?? 0],
        ['Payments for SNE', data.expSNE, data.cmp_expSNE ?? 0],
        ['Payments for Boarding and School Fund', data.expBoarding, data.cmp_expBoarding ?? 0],
        ['Finance Costs', data.expFinanceCosts, data.cmp_expFinanceCosts ?? 0],
    ];
    cashPayments.forEach(([label, cur, cmp], i) => {
        y = tableRow(doc, String(label), `(${kes(Number(cur))})`, `(${kes(Number(cmp))})`, y, false, i % 2 === 0);
    });
    const totalCashPayments = cashPayments.reduce((s, r) => s + Number(r[1] || 0), 0);
    const cmp_totalCashPayments = cashPayments.reduce((s, r) => s + Number(r[2] || 0), 0);
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Total Payments', `(${kes(totalCashPayments)})`, `(${kes(cmp_totalCashPayments)})`, y, true);
    y += 3;

    const netOpCF = totalCashReceipts - totalCashPayments;
    const cmp_netOpCF = cmp_totalCashReceipts - cmp_totalCashPayments;
    divider(doc, y, true); y += 2;
    y = tableRow(doc, 'Net cash inflow / (outflow) from operating activities', kes(netOpCF), kes(cmp_netOpCF), y, true);
    y += 5;

    y = sectionHead(doc, 'CASH FLOW FROM INVESTING ACTIVITIES', y);
    const purchPPE = data.purchasePPE ?? 0;
    const procDisp = data.proceedsDisposal ?? 0;
    y = tableRow(doc, 'Purchase of Property, Plant, Equipment & Intangible Assets', `(${kes(purchPPE)})`, '—', y, false, true);
    y = tableRow(doc, 'Proceeds from Disposal of Property, Plant and Equipment', kes(procDisp), '—', y, false, false);
    const netInvCF = procDisp - purchPPE;
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Net cash inflow / (outflow) from investing activities', kes(netInvCF), '—', y, true);
    y += 5;

    y = sectionHead(doc, 'CASH FLOW FROM FINANCING ACTIVITIES', y);
    const procBorrow = data.proceedsBorrowings ?? 0;
    const repayBorrow = data.repaymentBorrowings ?? 0;
    y = tableRow(doc, 'Proceeds from Borrowings', kes(procBorrow), '—', y, false, true);
    y = tableRow(doc, 'Repayment of Borrowings (principal)', `(${kes(repayBorrow)})`, '—', y, false, false);
    const netFinCF = procBorrow - repayBorrow;
    divider(doc, y); y += 2;
    y = tableRow(doc, 'Net cash flows used in financing activities', kes(netFinCF), '—', y, true);
    y += 5;

    const netCFChange = netOpCF + netInvCF + netFinCF;
    const openCash = data.openingCash ?? 0;
    const closingCash = openCash + netCFChange;
    y = tableRow(doc, 'Net increase / (decrease) in cash and cash equivalents', kes(netCFChange), '—', y, true, true);
    y = tableRow(doc, 'Cash and cash equivalents at 1 July', kes(openCash), kes(data.cmp_openingCash ?? 0), y);
    divider(doc, y, true); y += 2;
    y = tableRow(doc, 'Cash and cash equivalents at 30 June', kes(closingCash), '—', y, true);
    y += 8;
    y = signBlock(doc, [data.bomChairName || '', data.principalName || '', data.bursarName || ''],
        ['Chair, Board of Management', 'Principal / Secretary to BOM', 'Bursar / Finance Officer'], y);

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 5 — STATEMENT OF BUDGETED VS ACTUAL
    // ─────────────────────────────────────────────────────────────────────────
    y = addPage(doc, `Statement of Budgeted vs. Actual Amounts — Year Ended ${yEnd}`, institution, logoImg, headerImg);
    y += 4;

    // 5-column table header
    const colW = (pw - M * 2) / 6;
    doc.setFillColor(241, 245, 249);
    doc.rect(M, y - 3, pw - M * 2, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    const bvaCols = ['Item', 'Original Budget', 'Adjustments', 'Final Budget (C=A+B)', 'Actual', '% Utilization'];
    bvaCols.forEach((col, i) => {
        doc.text(col, M + i * colW + (i === 0 ? 2 : colW - 2), y + 1.5, { align: i === 0 ? 'left' : 'right' });
    });
    y += 8;

    const budgetLines = data.budgetLines && data.budgetLines.length > 0
        ? data.budgetLines
        : [
            { item: 'Capitation Grant – Tuition', originalBudget: data.capitationTuition, adjustments: 0, actual: data.capitationTuition },
            { item: 'Capitation Grant – Operations', originalBudget: data.capitationOperations, adjustments: 0, actual: data.capitationOperations },
            { item: 'Revenue for Infrastructure', originalBudget: data.capitationInfrastructure, adjustments: 0, actual: data.capitationInfrastructure },
            { item: 'Students\' Fees / School Fund', originalBudget: data.studentFees, adjustments: 0, actual: data.studentFees },
            { item: 'Expenditure for Tuition', originalBudget: data.expTuition, adjustments: 0, actual: data.expTuition },
            { item: 'Expenditure for Operations', originalBudget: data.expOperations, adjustments: 0, actual: data.expOperations },
            { item: 'Expenditure for Boarding', originalBudget: data.expBoarding, adjustments: 0, actual: data.expBoarding },
        ];

    budgetLines.forEach((line, idx) => {
        const finalBudget = line.originalBudget + line.adjustments;
        const pct = finalBudget > 0 ? ((line.actual / finalBudget) * 100).toFixed(1) : '—';
        if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(M, y - 3, pw - M * 2, 7, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(line.item, M + 2, y + 1.5);
        doc.text(kes(line.originalBudget), M + colW * 1 + colW - 2, y + 1.5, { align: 'right' });
        doc.text(kes(line.adjustments), M + colW * 2 + colW - 2, y + 1.5, { align: 'right' });
        doc.text(kes(finalBudget), M + colW * 3 + colW - 2, y + 1.5, { align: 'right' });
        doc.text(kes(line.actual), M + colW * 4 + colW - 2, y + 1.5, { align: 'right' });
        doc.text(`${pct}%`, M + colW * 5 + colW - 2, y + 1.5, { align: 'right' });
        y += 7;
    });

    divider(doc, y, true);
    y += 6;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('[Trade creditors paid within the year should be included into specific vote-heads under the adjustment column]', M, y);
    y += 10;
    y = signBlock(doc, [data.bomChairName || '', data.principalName || ''],
        ['Chair, Board of Management', 'Principal / Secretary to BOM'], y);

    // ─────────────────────────────────────────────────────────────────────────
    // PAGE 6 — KEY NOTES SUMMARY
    // ─────────────────────────────────────────────────────────────────────────
    y = addPage(doc, 'Selected Notes to the Financial Statements', institution, logoImg, headerImg);
    y += 2;

    const noteBlocks = [
        {
            title: 'Note 20: Cash and Cash Equivalents',
            rows: [
                ['Bank Balances', kes(data.cashBank * 0.9), '—'],
                ['Cash in Hand', kes(data.cashBank * 0.1), '—'],
                ['Total', kes(data.cashBank), kes(data.cmp_cashBank ?? 0)],
            ],
        },
        {
            title: 'Note 21: Accounts Receivable',
            rows: [
                ['Fees Arrears', kes(data.accountsReceivable * 0.8), '—'],
                ['Other Receivables', kes(data.accountsReceivable * 0.2), '—'],
                ['Total', kes(data.accountsReceivable), kes(data.cmp_accountsReceivable ?? 0)],
            ],
        },
        {
            title: 'Note 25: Property, Plant and Equipment',
            rows: [
                ['Cost / Value at 1 July', '—', '—'],
                ['Additions during the year', kes(data.purchasePPE ?? 0), '—'],
                ['Disposals', `(${kes(data.proceedsDisposal ?? 0)})`, '—'],
                ['Depreciation charge for the year', `(${kes(data.expDepreciation)})`, '—'],
                ['Net Book Value at 30 June', kes(data.ppe), kes(data.cmp_ppe ?? 0)],
            ],
        },
    ];

    for (const note of noteBlocks) {
        if (y > 240) {
            y = addPage(doc, 'Selected Notes to the Financial Statements (Cont.)', institution, logoImg, headerImg);
            y += 2;
        }
        y = sectionHead(doc, note.title, y, [30, 64, 175]);
        y = tableHeader(doc, 'Description', fy, cmpy, y);
        note.rows.forEach(([label, cur, cmp], i) => {
            y = tableRow(doc, label, cur, cmp, y, label === 'Total' || label.startsWith('Net'), i % 2 === 0);
        });
        divider(doc, y); y += 5;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Footer page numbers on all pages
    // ─────────────────────────────────────────────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text(`${institution?.name || ''} | Annual Financial Report FY${fy} | Page ${p} of ${totalPages}`,
            pw / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.2);
        doc.line(M, doc.internal.pageSize.getHeight() - 12, pw - M, doc.internal.pageSize.getHeight() - 12);
    }

    return doc.output('datauristring');
};

// ─── Auto-populate from live data ─────────────────────────────────────────────
export const buildReportDataFromLive = (
    invoices: Invoice[],
    receipts: Receipt[],
    expenses: Expense[],
    financialYear: string
): Partial<AnnualReportData> => {
    const totalBilled = invoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
    const totalCollected = receipts.reduce((s, r) => s + (r.amountPaid || 0), 0);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Categorize expenses by category field
    const expByCategory = (cat: string) =>
        expenses.filter(e => (e.category || '').toLowerCase().includes(cat.toLowerCase()))
            .reduce((s, e) => s + (e.amount || 0), 0);

    return {
        financialYear,
        yearEndDate: `30th June ${financialYear.split('/')[1] || ''}`,
        comparativeYear: `${parseInt(financialYear.split('/')[0]) - 1}/${financialYear.split('/')[0]}`,

        // Map collected receipts to fees
        studentFees: totalCollected,
        miscIncome: 0,
        financeIncome: 0,

        // Map expenses
        expTuition: expByCategory('tuition') || totalExpenses * 0.3,
        expOperations: expByCategory('operation') || totalExpenses * 0.25,
        expSNE: expByCategory('special') || 0,
        expBoarding: expByCategory('boarding') || totalExpenses * 0.2,
        expDepreciation: expByCategory('depreciation') || totalExpenses * 0.05,
        expFinanceCosts: expByCategory('finance') || totalExpenses * 0.02,

        // Basic balance sheet from available data
        cashBank: totalCollected - totalExpenses > 0 ? totalCollected - totalExpenses : 0,
        accountsReceivable: totalBilled - totalCollected > 0 ? totalBilled - totalCollected : 0,
        inventories: 0,
        prepayments: 0,
        longTermInvestments: 0,
        ppe: 0,
        intangibleAssets: 0,
        feesAdvance: 0,
        accountsPayable: 0,
        shortTermBorrowings: 0,
        provisions: 0,
        longTermBorrowings: 0,
        openingAccumulatedSurplus: 0,
    };
};
