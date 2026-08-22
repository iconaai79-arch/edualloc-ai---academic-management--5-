/**
 * General Ledger & Double-Entry Accounting Engine
 * Standardized for Kenyan & International School / Institutional Accounting (CPA & Ministry Audit Ready)
 */

export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface ChartOfAccount {
    code: string;           // e.g. "10100"
    name: string;           // e.g. "Cash at Bank (Main Tuition Account)"
    category: AccountCategory;
    normalBalance: NormalBalance;
    description: string;
    parentCode?: string;
    isSystem: boolean;
}

export interface JournalLine {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
    studentId?: string;
    studentName?: string;
    voteHead?: string;
}

export interface JournalEntry {
    id: string;
    institutionId: string;
    entryNumber: string;
    date: string;
    reference: string;
    memo: string;
    sourceModule: 'INVOICING' | 'RECEIPT' | 'EXPENSE' | 'PAYROLL' | 'CAPITATION' | 'BURSARY' | 'TRANSFER' | 'MANUAL';
    lines: JournalLine[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
    createdAt: string;
}

export interface AccountLedgerItem {
    date: string;
    reference: string;
    memo: string;
    entryNumber: string;
    debit: number;
    credit: number;
    runningBalance: number;
}

export interface AccountSummary {
    account: ChartOfAccount;
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
    entriesCount: number;
}

export interface TrialBalanceReport {
    periodStart: string;
    periodEnd: string;
    accounts: AccountSummary[];
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean;
}

export interface IncomeStatementReport {
    periodStart: string;
    periodEnd: string;
    operatingRevenues: AccountSummary[];
    totalRevenue: number;
    operatingExpenses: AccountSummary[];
    totalExpenses: number;
    netSurplusOrDeficit: number;
}

export interface BalanceSheetReport {
    asOfDate: string;
    assets: {
        currentAssets: AccountSummary[];
        totalCurrentAssets: number;
        fixedAssets: AccountSummary[];
        totalFixedAssets: number;
        totalAssets: number;
    };
    liabilities: {
        currentLiabilities: AccountSummary[];
        totalCurrentLiabilities: number;
        longTermLiabilities: AccountSummary[];
        totalLongTermLiabilities: number;
        totalLiabilities: number;
    };
    equity: {
        reserves: AccountSummary[];
        retainedSurplus: number;
        totalEquity: number;
    };
    isBalanced: boolean; // Assets == Liabilities + Equity
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard Institutional Chart of Accounts (COA)
// ─────────────────────────────────────────────────────────────────────────────
export const STANDARD_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
    // ── ASSETS (10000 - 19999) Normal Balance: DEBIT ──────────────────────────
    { code: '10100', name: 'Cash in Hand (Petty Cash)', category: 'ASSET', normalBalance: 'DEBIT', description: 'Physical cash held by the school bursar for daily operations', isSystem: true },
    { code: '10200', name: 'Bank Accounts (General Operational)', category: 'ASSET', normalBalance: 'DEBIT', description: 'Primary commercial bank checking & operational accounts', isSystem: true },
    { code: '10210', name: 'Bank - Development & Project Fund', category: 'ASSET', normalBalance: 'DEBIT', description: 'Designated capital development and building fund bank account', isSystem: false },
    { code: '10300', name: 'M-Pesa Collections (Paybill / Till Float)', category: 'ASSET', normalBalance: 'DEBIT', description: 'Mobile money collection clearing float prior to bank sweep', isSystem: true },
    { code: '10400', name: 'Accounts Receivable (Student Fee Debtors)', category: 'ASSET', normalBalance: 'DEBIT', description: 'Total invoiced fee obligations currently outstanding from students/parents', isSystem: true },
    { code: '10500', name: 'Prepaid Expenses & Advances', category: 'ASSET', normalBalance: 'DEBIT', description: 'Staff salary advances and prepaid insurance/services', isSystem: false },
    { code: '10600', name: 'Inventory & Supplies (Food, Books, Uniforms)', category: 'ASSET', normalBalance: 'DEBIT', description: 'Stores inventory on hand for academic & boarding consumption', isSystem: false },
    { code: '15100', name: 'School Buildings & Infrastructure', category: 'ASSET', normalBalance: 'DEBIT', description: 'Permanent classroom, dorm, and administrative buildings', isSystem: false },
    { code: '15200', name: 'School Transport Vehicles & Buses', category: 'ASSET', normalBalance: 'DEBIT', description: 'Buses, vans, and administrative transportation assets', isSystem: false },
    { code: '15300', name: 'ICT & Lab Equipment', category: 'ASSET', normalBalance: 'DEBIT', description: 'Computers, servers, solar installations, science lab apparatus', isSystem: false },

    // ── LIABILITIES (20000 - 29999) Normal Balance: CREDIT ────────────────────
    { code: '20100', name: 'Fee Prepayments (Unearned Revenue)', category: 'ASSET', normalBalance: 'CREDIT', description: 'Overpayments and advances paid by parents toward future terms', isSystem: true },
    { code: '20200', name: 'Accounts Payable (Trade Creditors & Suppliers)', category: 'LIABILITY', normalBalance: 'CREDIT', description: 'Approved supplier requisitions and unpaid invoices', isSystem: true },
    { code: '20310', name: 'PAYE Tax Withholding Payable (KRA)', category: 'LIABILITY', normalBalance: 'CREDIT', description: 'Pay-As-You-Earn employee income tax deducted awaiting KRA remittance', isSystem: true },
    { code: '20320', name: 'SHIF / NHIF Contributions Payable', category: 'LIABILITY', normalBalance: 'CREDIT', description: 'Social Health Insurance Fund statutory deductions payable', isSystem: true },
    { code: '20330', name: 'NSSF Pension Contributions Payable', category: 'LIABILITY', normalBalance: 'CREDIT', description: 'National Social Security Fund statutory deductions payable', isSystem: true },
    { code: '20340', name: 'Affordable Housing Levy Payable', category: 'LIABILITY', normalBalance: 'CREDIT', description: 'Statutory Housing Levy withholdings payable', isSystem: true },
    { code: '20400', name: 'Caution Money / Refundable Deposits', category: 'LIABILITY', normalBalance: 'CREDIT', description: 'Refundable boarding/laboratory caution money held for students', isSystem: false },

    // ── EQUITY / RESERVES (30000 - 39999) Normal Balance: CREDIT ──────────────
    { code: '30100', name: 'Institutional Accumulated Capital Fund', category: 'EQUITY', normalBalance: 'CREDIT', description: 'Original institutional founder capital and endowment funds', isSystem: true },
    { code: '30200', name: 'Retained Operating Surplus / (Deficit)', category: 'EQUITY', normalBalance: 'CREDIT', description: 'Cumulative net operating income rolled forward from prior fiscal years', isSystem: true },
    { code: '30300', name: 'Special Development & PTA Reserves', category: 'EQUITY', normalBalance: 'CREDIT', description: 'Targeted PTA development levies and infrastructure reserves', isSystem: false },

    // ── REVENUE (40000 - 49999) Normal Balance: CREDIT ────────────────────────
    { code: '40100', name: 'Tuition & Academic Fees Revenue', category: 'REVENUE', normalBalance: 'CREDIT', description: 'Core curriculum tuition and instructional billing', isSystem: true },
    { code: '40200', name: 'Boarding & Accommodation Revenue', category: 'REVENUE', normalBalance: 'CREDIT', description: 'Dormitory, catering, and boarding charges', isSystem: true },
    { code: '40300', name: 'School Transport & Bus Service Revenue', category: 'REVENUE', normalBalance: 'CREDIT', description: 'Student transport and zoning route fee collections', isSystem: true },
    { code: '40400', name: 'Activity, Sports & Assessment Revenue', category: 'REVENUE', normalBalance: 'CREDIT', description: 'Co-curricular, swimming, exam registration, and activity levies', isSystem: true },
    { code: '40500', name: 'Government Capitation Grants (FPE / FDSE)', category: 'REVENUE', normalBalance: 'CREDIT', description: 'Ministry of Education NEMIS capitation disbursements', isSystem: true },
    { code: '40600', name: 'NG-CDF & County Government Bursaries', category: 'REVENUE', normalBalance: 'CREDIT', description: 'Sponsor bursaries and constituency fund disbursements credited to students', isSystem: true },
    { code: '40700', name: 'Uniforms, Books & Merchandise Sales', category: 'REVENUE', normalBalance: 'CREDIT', description: 'Sales from bookshop and uniform stores', isSystem: false },
    { code: '40800', name: 'Sundry Income & Facilities Hire', category: 'REVENUE', normalBalance: 'CREDIT', description: 'Hall hire, bus hire, interest on deposits, application fees', isSystem: false },

    // ── EXPENSES (50000 - 59999) Normal Balance: DEBIT ────────────────────────
    { code: '50100', name: 'Teaching Staff Salaries & Allowances', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Gross basic salary and teacher instructional allowances', isSystem: true },
    { code: '50150', name: 'Support & Administrative Staff Wages', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Kitchen, security, grounds, and administrative employee wages', isSystem: true },
    { code: '50200', name: 'Boarding Food & Kitchen Supplies', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Bulk dry foods, fresh produce, cooking gas, and dining procurement', isSystem: true },
    { code: '50300', name: 'Instructional Materials & Exam Printing', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Textbooks, lab reagents, examination papers, stationery', isSystem: true },
    { code: '50400', name: 'Transport Fuel, Oil & Bus Maintenance', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Diesel, routine mechanical service, NTSA compliance, vehicle insurance', isSystem: true },
    { code: '50500', name: 'Electricity, Water & Utilities', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Kenya Power, water utility, internet connectivity, waste management', isSystem: true },
    { code: '50600', name: 'Building Repairs & Campus Maintenance', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Plumbing, painting, carpentry, compound upkeep', isSystem: true },
    { code: '50700', name: 'Bank Charges, M-Pesa Tariffs & SMS Gateway', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Bank ledger fees, M-Pesa B2C/C2B transaction charges, SMS credits', isSystem: true },
    { code: '50800', name: 'Staff Welfare, Medical & Insurance', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'Institutional insurance, staff tea, team building, emergency medicals', isSystem: false },
    { code: '50900', name: 'Audit, Legal & Regulatory Compliance', category: 'EXPENSE', normalBalance: 'DEBIT', description: 'External audit fees, Ministry licensing, professional fees', isSystem: false }
];

export class GeneralLedgerService {

    /**
     * Synthesizes a comprehensive balanced General Ledger from all operational data
     */
    public static buildLedgerFromOperations(params: {
        institutionId: string;
        invoices: any[];
        receipts: any[];
        expenses: any[];
        payroll: any[];
        transfers?: any[];
        capitations?: any[];
        bursaries?: any[];
        customAccounts?: ChartOfAccount[];
    }): {
        accounts: ChartOfAccount[];
        journalEntries: JournalEntry[];
        trialBalance: TrialBalanceReport;
        incomeStatement: IncomeStatementReport;
        balanceSheet: BalanceSheetReport;
    } {
        const {
            institutionId,
            invoices = [],
            receipts = [],
            expenses = [],
            payroll = [],
            transfers = [],
            capitations = [],
            bursaries = [],
            customAccounts = []
        } = params;

        const accounts = this.mergeAccounts(customAccounts);
        const journalEntries: JournalEntry[] = [];

        // ── 1. Invoices -> Debit: Accounts Receivable (10400) | Credit: Fee Revenues (40100-40400) ──
        invoices.forEach((inv: any, idx: number) => {
            const total = Number(inv.amount || inv.totalAmount || inv.subtotal || 0);
            if (total <= 0) return;

            const date = inv.date || inv.issueDate || inv.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
            const studentName = inv.studentName || inv.recipientName || 'Student';
            const studentId = inv.studentId || '';

            const lines: JournalLine[] = [
                {
                    accountCode: '10400',
                    accountName: 'Accounts Receivable (Student Fee Debtors)',
                    debit: total,
                    credit: 0,
                    description: `Fee Invoice ${inv.invoiceNumber || '#' + (idx + 1)} - ${studentName}`,
                    studentId,
                    studentName
                }
            ];

            if (Array.isArray(inv.items) && inv.items.length > 0) {
                inv.items.forEach((item: any) => {
                    const itemAmt = Number(item.amount || item.total || 0);
                    if (itemAmt <= 0) return;
                    const itemTitle = (item.title || item.name || item.voteHead || '').toLowerCase();
                    let targetCode = '40100'; // Default Tuition

                    if (itemTitle.includes('board') || itemTitle.includes('dorm') || itemTitle.includes('cater') || itemTitle.includes('food')) {
                        targetCode = '40200';
                    } else if (itemTitle.includes('transport') || itemTitle.includes('bus') || itemTitle.includes('van') || itemTitle.includes('route')) {
                        targetCode = '40300';
                    } else if (itemTitle.includes('activity') || itemTitle.includes('sport') || itemTitle.includes('exam') || itemTitle.includes('swimming')) {
                        targetCode = '40400';
                    } else if (itemTitle.includes('uniform') || itemTitle.includes('book')) {
                        targetCode = '40700';
                    }

                    const acc = accounts.find(a => a.code === targetCode) || accounts[16];
                    lines.push({
                        accountCode: targetCode,
                        accountName: acc.name,
                        debit: 0,
                        credit: itemAmt,
                        description: `${item.title || 'Tuition'} Billing`,
                        voteHead: item.title || 'Tuition'
                    });
                });
            } else {
                lines.push({
                    accountCode: '40100',
                    accountName: 'Tuition & Academic Fees Revenue',
                    debit: 0,
                    credit: total,
                    description: `Tuition & Academic Billing`
                });
            }

            journalEntries.push(this.createJournalEntry({
                id: `je_inv_${inv.id || idx}`,
                institutionId,
                entryNumber: `JE-INV-${inv.invoiceNumber || String(idx + 1).padStart(4, '0')}`,
                date,
                reference: inv.invoiceNumber || `INV-${idx + 1}`,
                memo: `Invoiced Fees for ${studentName}`,
                sourceModule: 'INVOICING',
                lines
            }));
        });

        // ── 2. Receipts -> Debit: Cash/Bank/M-Pesa (10100/10200/10300) | Credit: Accounts Receivable (10400) ──
        receipts.forEach((rec: any, idx: number) => {
            const amount = Number(rec.amountPaid || rec.amount || 0);
            if (amount <= 0) return;

            const date = rec.paymentDate || rec.date || rec.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
            const studentName = rec.studentName || 'Student';
            const studentId = rec.studentId || '';
            const method = String(rec.paymentMethod || rec.excelPaymentMode || '').toLowerCase();

            let cashAccountCode = '10300'; // Default M-Pesa
            if (method.includes('bank') || method.includes('transfer') || method.includes('cheque') || method.includes('eft')) {
                cashAccountCode = '10200';
            } else if (method.includes('cash')) {
                cashAccountCode = '10100';
            }

            const cashAcc = accounts.find(a => a.code === cashAccountCode) || accounts[1];

            const lines: JournalLine[] = [
                {
                    accountCode: cashAccountCode,
                    accountName: cashAcc.name,
                    debit: amount,
                    credit: 0,
                    description: `Payment via ${rec.paymentMethod || 'M-Pesa'} (Ref: ${rec.relatedTransactionId || rec.receiptNumber || 'Direct'})`,
                    studentId,
                    studentName
                },
                {
                    accountCode: '10400',
                    accountName: 'Accounts Receivable (Student Fee Debtors)',
                    debit: 0,
                    credit: amount,
                    description: `Receipt ${rec.receiptNumber || '#' + (idx + 1)} settlement - ${studentName}`,
                    studentId,
                    studentName
                }
            ];

            journalEntries.push(this.createJournalEntry({
                id: `je_rec_${rec.id || idx}`,
                institutionId,
                entryNumber: `JE-REC-${rec.receiptNumber || String(idx + 1).padStart(4, '0')}`,
                date,
                reference: rec.receiptNumber || rec.relatedTransactionId || `REC-${idx + 1}`,
                memo: `Fee Collection from ${studentName}`,
                sourceModule: 'RECEIPT',
                lines
            }));
        });

        // ── 3. Expenses -> Debit: Specific Expense (50100-50900) | Credit: Bank/Cash (10200/10100) ──
        expenses.forEach((exp: any, idx: number) => {
            const amount = Number(exp.amount || 0);
            if (amount <= 0) return;

            const date = exp.date || exp.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
            const title = (exp.title || exp.category || exp.voteHead || '').toLowerCase();

            let expenseCode = '50600';
            if (title.includes('food') || title.includes('kitchen') || title.includes('diet') || title.includes('meat') || title.includes('cater')) {
                expenseCode = '50200';
            } else if (title.includes('fuel') || title.includes('bus') || title.includes('transport') || title.includes('diesel')) {
                expenseCode = '50400';
            } else if (title.includes('book') || title.includes('exam') || title.includes('lab') || title.includes('stationery') || title.includes('paper')) {
                expenseCode = '50300';
            } else if (title.includes('power') || title.includes('electric') || title.includes('water') || title.includes('wifi') || title.includes('utility')) {
                expenseCode = '50500';
            } else if (title.includes('salary') || title.includes('wage') || title.includes('casual')) {
                expenseCode = '50150';
            } else if (title.includes('bank') || title.includes('charge') || title.includes('tariff') || title.includes('sms')) {
                expenseCode = '50700';
            }

            const expAcc = accounts.find(a => a.code === expenseCode) || accounts[23];
            const paymentMode = String(exp.paymentMethod || exp.paymentMode || '').toLowerCase();
            const creditCode = paymentMode.includes('cash') ? '10100' : '10200';
            const creditAcc = accounts.find(a => a.code === creditCode) || accounts[1];

            const lines: JournalLine[] = [
                {
                    accountCode: expenseCode,
                    accountName: expAcc.name,
                    debit: amount,
                    credit: 0,
                    description: exp.description || exp.title || 'Procurement Expense',
                    voteHead: exp.category || exp.voteHead
                },
                {
                    accountCode: creditCode,
                    accountName: creditAcc.name,
                    debit: 0,
                    credit: amount,
                    description: `Payment via ${exp.paymentMethod || 'Bank'} for ${exp.title || 'Procurement'}`
                }
            ];

            journalEntries.push(this.createJournalEntry({
                id: `je_exp_${exp.id || idx}`,
                institutionId,
                entryNumber: `JE-EXP-${exp.voucherNumber || String(idx + 1).padStart(4, '0')}`,
                date,
                reference: exp.voucherNumber || exp.ref || `EXP-${idx + 1}`,
                memo: exp.title || 'Operational Expense Voucher',
                sourceModule: 'EXPENSE',
                lines
            }));
        });

        // ── 4. Payroll -> Debit: Staff Salaries (50100) | Credit: Net Pay Bank (10200) + Statutory Liabilities (20310-20340) ──
        payroll.forEach((pay: any, idx: number) => {
            const gross = Number(pay.grossSalary || pay.totalEarnings || pay.basicSalary || 0);
            if (gross <= 0) return;

            const net = Number(pay.netSalary || pay.netPay || gross);
            const paye = Number(pay.paye || pay.tax || 0);
            const shif = Number(pay.shif || pay.nhif || 0);
            const nssf = Number(pay.nssf || 0);
            const housing = Number(pay.housingLevy || 0);
            const date = pay.payDate || pay.monthYear || new Date().toISOString().split('T')[0];
            const employeeName = pay.staffName || pay.employeeName || 'Staff Member';

            const lines: JournalLine[] = [
                {
                    accountCode: '50100',
                    accountName: 'Teaching Staff Salaries & Allowances',
                    debit: gross,
                    credit: 0,
                    description: `Gross Salary for ${employeeName}`
                },
                {
                    accountCode: '10200',
                    accountName: 'Bank Accounts (General Operational)',
                    debit: 0,
                    credit: net,
                    description: `Net Salary Remittance to ${employeeName}`
                }
            ];

            if (paye > 0) lines.push({ accountCode: '20310', accountName: 'PAYE Tax Withholding Payable (KRA)', debit: 0, credit: paye, description: `PAYE Withholding` });
            if (shif > 0) lines.push({ accountCode: '20320', accountName: 'SHIF / NHIF Contributions Payable', debit: 0, credit: shif, description: `SHIF Deductions` });
            if (nssf > 0) lines.push({ accountCode: '20330', accountName: 'NSSF Pension Contributions Payable', debit: 0, credit: nssf, description: `NSSF Deductions` });
            if (housing > 0) lines.push({ accountCode: '20340', accountName: 'Affordable Housing Levy Payable', debit: 0, credit: housing, description: `Housing Levy Deductions` });

            const currentCredits = lines.reduce((s, l) => s + l.credit, 0);
            if (currentCredits < gross) {
                lines[1].credit += (gross - currentCredits);
            }

            journalEntries.push(this.createJournalEntry({
                id: `je_pay_${pay.id || idx}`,
                institutionId,
                entryNumber: `JE-PAY-${String(idx + 1).padStart(4, '0')}`,
                date,
                reference: `PAYROLL-${date.slice(0, 7)}`,
                memo: `Staff Payroll Remittance - ${employeeName}`,
                sourceModule: 'PAYROLL',
                lines
            }));
        });

        // ── 5. Capitation & Bursaries ──
        capitations.forEach((cap: any, idx: number) => {
            const amount = Number(cap.amount || cap.disbursedAmount || 0);
            if (amount <= 0) return;
            const date = cap.date || cap.disbursedDate || new Date().toISOString().split('T')[0];

            const lines: JournalLine[] = [
                { accountCode: '10200', accountName: 'Bank Accounts (General Operational)', debit: amount, credit: 0, description: `Ministry Capitation Inflow` },
                { accountCode: '40500', accountName: 'Government Capitation Grants (FPE / FDSE)', debit: 0, credit: amount, description: `Capitation Grant Disbursement` }
            ];

            journalEntries.push(this.createJournalEntry({
                id: `je_cap_${cap.id || idx}`,
                institutionId,
                entryNumber: `JE-CAP-${String(idx + 1).padStart(4, '0')}`,
                date,
                reference: cap.nemIsRef || cap.reference || `CAP-${idx + 1}`,
                memo: `Ministry of Education Capitation Inflow (${cap.term || 'General'})`,
                sourceModule: 'CAPITATION',
                lines
            }));
        });

        bursaries.forEach((bur: any, idx: number) => {
            const amount = Number(bur.amount || 0);
            if (amount <= 0) return;
            const date = bur.date || bur.awardedDate || new Date().toISOString().split('T')[0];
            const sponsor = bur.sponsorName || bur.sponsor || 'CDF Bursary';
            const studentName = bur.studentName || 'Beneficiary Student';

            const lines: JournalLine[] = [
                { accountCode: '10200', accountName: 'Bank Accounts (General Operational)', debit: amount, credit: 0, description: `${sponsor} Cheque Receipt` },
                { accountCode: '10400', accountName: 'Accounts Receivable (Student Fee Debtors)', debit: 0, credit: amount, description: `Bursary Credit applied to ${studentName}`, studentId: bur.studentId, studentName }
            ];

            journalEntries.push(this.createJournalEntry({
                id: `je_bur_${bur.id || idx}`,
                institutionId,
                entryNumber: `JE-BUR-${String(idx + 1).padStart(4, '0')}`,
                date,
                reference: bur.chequeNumber || bur.reference || `BUR-${idx + 1}`,
                memo: `${sponsor} Bursary allocation for ${studentName}`,
                sourceModule: 'BURSARY',
                lines
            }));
        });

        // ── 6. Compute Trial Balance ──
        const accountSummaries = this.calculateAccountSummaries(accounts, journalEntries);
        const totalDebits = accountSummaries.reduce((sum, a) => sum + a.totalDebit, 0);
        const totalCredits = accountSummaries.reduce((sum, a) => sum + a.totalCredit, 0);

        const trialBalance: TrialBalanceReport = {
            periodStart: '2026-01-01',
            periodEnd: new Date().toISOString().split('T')[0],
            accounts: accountSummaries.filter(a => a.entriesCount > 0 || a.account.isSystem),
            totalDebits,
            totalCredits,
            isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
        };

        // ── 7. Compute Income Statement ──
        const operatingRevenues = accountSummaries.filter(a => a.account.category === 'REVENUE' && a.totalCredit > 0);
        const totalRevenue = operatingRevenues.reduce((sum, a) => sum + (a.totalCredit - a.totalDebit), 0);

        const operatingExpenses = accountSummaries.filter(a => a.account.category === 'EXPENSE' && a.totalDebit > 0);
        const totalExpenses = operatingExpenses.reduce((sum, a) => sum + (a.totalDebit - a.totalCredit), 0);
        const netSurplusOrDeficit = totalRevenue - totalExpenses;

        const incomeStatement: IncomeStatementReport = {
            periodStart: '2026-01-01',
            periodEnd: new Date().toISOString().split('T')[0],
            operatingRevenues,
            totalRevenue,
            operatingExpenses,
            totalExpenses,
            netSurplusOrDeficit
        };

        // ── 8. Compute Balance Sheet ──
        const currentAssets = accountSummaries.filter(a => a.account.category === 'ASSET' && parseInt(a.account.code) < 15000 && (a.netBalance !== 0 || a.account.isSystem));
        const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.netBalance, 0);

        const fixedAssets = accountSummaries.filter(a => a.account.category === 'ASSET' && parseInt(a.account.code) >= 15000 && a.netBalance !== 0);
        const totalFixedAssets = fixedAssets.reduce((sum, a) => sum + a.netBalance, 0);
        const totalAssets = totalCurrentAssets + totalFixedAssets;

        const currentLiabilities = accountSummaries.filter(a => a.account.category === 'LIABILITY' && (a.netBalance !== 0 || a.account.isSystem));
        const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + a.netBalance, 0);

        const reserves = accountSummaries.filter(a => a.account.category === 'EQUITY' && a.account.code !== '30200');
        const totalReserves = reserves.reduce((sum, a) => sum + a.netBalance, 0);
        const totalEquity = totalReserves + netSurplusOrDeficit;

        const balanceSheet: BalanceSheetReport = {
            asOfDate: new Date().toISOString().split('T')[0],
            assets: {
                currentAssets,
                totalCurrentAssets,
                fixedAssets,
                totalFixedAssets,
                totalAssets
            },
            liabilities: {
                currentLiabilities,
                totalCurrentLiabilities,
                longTermLiabilities: [],
                totalLongTermLiabilities: 0,
                totalLiabilities: totalCurrentLiabilities
            },
            equity: {
                reserves,
                retainedSurplus: netSurplusOrDeficit,
                totalEquity
            },
            isBalanced: Math.abs(totalAssets - (totalCurrentLiabilities + totalEquity)) < 1.00
        };

        return {
            accounts,
            journalEntries,
            trialBalance,
            incomeStatement,
            balanceSheet
        };
    }

    private static createJournalEntry(params: {
        id: string;
        institutionId: string;
        entryNumber: string;
        date: string;
        reference: string;
        memo: string;
        sourceModule: JournalEntry['sourceModule'];
        lines: JournalLine[];
    }): JournalEntry {
        const totalDebit = params.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
        const totalCredit = params.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        return {
            ...params,
            totalDebit,
            totalCredit,
            isBalanced,
            createdAt: new Date().toISOString()
        };
    }

    private static mergeAccounts(custom: ChartOfAccount[]): ChartOfAccount[] {
        const map = new Map<string, ChartOfAccount>();
        STANDARD_CHART_OF_ACCOUNTS.forEach(acc => map.set(acc.code, acc));
        custom.forEach(acc => map.set(acc.code, acc));
        return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    }

    private static calculateAccountSummaries(accounts: ChartOfAccount[], entries: JournalEntry[]): AccountSummary[] {
        const ledgerMap = new Map<string, { totalDebit: number; totalCredit: number; count: number }>();

        accounts.forEach(acc => {
            ledgerMap.set(acc.code, { totalDebit: 0, totalCredit: 0, count: 0 });
        });

        entries.forEach(entry => {
            entry.lines.forEach(line => {
                const current = ledgerMap.get(line.accountCode) || { totalDebit: 0, totalCredit: 0, count: 0 };
                current.totalDebit += Number(line.debit) || 0;
                current.totalCredit += Number(line.credit) || 0;
                current.count += 1;
                ledgerMap.set(line.accountCode, current);
            });
        });

        return accounts.map(account => {
            const data = ledgerMap.get(account.code) || { totalDebit: 0, totalCredit: 0, count: 0 };
            let netBalance = 0;
            if (account.normalBalance === 'DEBIT') {
                netBalance = data.totalDebit - data.totalCredit;
            } else {
                netBalance = data.totalCredit - data.totalDebit;
            }

            return {
                account,
                totalDebit: data.totalDebit,
                totalCredit: data.totalCredit,
                netBalance,
                entriesCount: data.count
            };
        });
    }

    public static getAccountLedger(accountCode: string, entries: JournalEntry[]): AccountLedgerItem[] {
        const items: AccountLedgerItem[] = [];
        let runningBalance = 0;

        const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        sorted.forEach(entry => {
            const matchingLines = entry.lines.filter(l => l.accountCode === accountCode);
            matchingLines.forEach(line => {
                const debit = Number(line.debit) || 0;
                const credit = Number(line.credit) || 0;

                const isDebitAccount = accountCode.startsWith('1') || accountCode.startsWith('5');
                if (isDebitAccount) {
                    runningBalance += (debit - credit);
                } else {
                    runningBalance += (credit - debit);
                }

                items.push({
                    date: entry.date,
                    reference: entry.reference,
                    memo: line.description || entry.memo,
                    entryNumber: entry.entryNumber,
                    debit,
                    credit,
                    runningBalance
                });
            });
        });

        return items;
    }
}
