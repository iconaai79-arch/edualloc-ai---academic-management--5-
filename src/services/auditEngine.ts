/**
 * auditEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Financial Audit Engine for EduAI
 *
 * Provides:
 *  • Reconciliation between invoices & receipts
 *  • Duplicate transaction detection
 *  • Invoice sequence gap detection
 *  • Policy rule checking (discount limits, late fees, large-cash approval)
 *  • Statistical anomaly scoring (z-score)
 *  • Trial balance computation
 *  • Variance analysis (budget vs actual)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Invoice, Receipt, Expense } from '../types';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type AuditSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditIssue {
    id: string;
    type: string;
    severity: AuditSeverity;
    message: string;
    recordId?: string;
    table?: string;
    amount?: number;
    metadata?: Record<string, any>;
    detectedAt: string;
}

export interface AuditReport {
    period: string;
    runAt: string;
    institutionId: string;
    issues: AuditIssue[];
    summary: AuditSummary;
}

export interface AuditSummary {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
    overallRisk: AuditSeverity;
    totalBilled: number;
    totalCollected: number;
    collectionRate: number;   // %
    outstandingDebt: number;
}

// ─── 1. Reconciliation ────────────────────────────────────────────────────────

/**
 * Reconcile invoices against receipts.
 * Flags: orphan receipts, overpayments, underpayments on overdue invoices.
 */
export function reconcileInvoicesAndReceipts(
    invoices: Invoice[],
    receipts: Receipt[]
): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const invoiceMap = new Map(invoices.map(i => [i.id, i]));

    // Group receipts by invoiceId
    const receiptsByInvoice = new Map<string, Receipt[]>();
    for (const r of receipts) {
        if (!r.invoiceId) {
            issues.push({
                id: `orphan-receipt-${r.id}`,
                type: 'ORPHAN_RECEIPT',
                severity: 'MEDIUM',
                message: `Receipt #${r.receiptNumber} (KES ${r.amountPaid.toLocaleString()}) has no linked invoice.`,
                recordId: r.id,
                table: 'receipts',
                amount: r.amountPaid,
                detectedAt: new Date().toISOString(),
            });
            continue;
        }
        if (!receiptsByInvoice.has(r.invoiceId)) receiptsByInvoice.set(r.invoiceId, []);
        receiptsByInvoice.get(r.invoiceId)!.push(r);
    }

    // Check each invoice
    for (const inv of invoices) {
        const linked = receiptsByInvoice.get(inv.id) || [];
        const totalPaid = linked.reduce((s, r) => s + r.amountPaid, 0);
        const balance = inv.totalAmount - totalPaid;
        const tolerance = 1; // 1 KES rounding tolerance

        // Overpayment
        if (totalPaid > inv.totalAmount + tolerance) {
            issues.push({
                id: `overpayment-${inv.id}`,
                type: 'OVERPAYMENT',
                severity: 'HIGH',
                message: `Invoice #${inv.invoiceNumber}: overpaid by KES ${(totalPaid - inv.totalAmount).toLocaleString()}. Billed KES ${inv.totalAmount.toLocaleString()}, received KES ${totalPaid.toLocaleString()}.`,
                recordId: inv.id,
                table: 'invoices',
                amount: totalPaid - inv.totalAmount,
                detectedAt: new Date().toISOString(),
            });
        }

        // Overdue with outstanding balance
        if (inv.status === 'overdue' && balance > tolerance) {
            issues.push({
                id: `overdue-balance-${inv.id}`,
                type: 'OVERDUE_BALANCE',
                severity: 'MEDIUM',
                message: `Invoice #${inv.invoiceNumber} is overdue with KES ${balance.toLocaleString()} outstanding.`,
                recordId: inv.id,
                table: 'invoices',
                amount: balance,
                metadata: { dueDate: inv.dueDate || inv.due_date },
                detectedAt: new Date().toISOString(),
            });
        }

        // Marked "paid" but receipts don't cover full amount
        if (inv.status === 'paid' && balance > tolerance) {
            issues.push({
                id: `false-paid-${inv.id}`,
                type: 'STATUS_MISMATCH',
                severity: 'CRITICAL',
                message: `Invoice #${inv.invoiceNumber} is marked PAID but KES ${balance.toLocaleString()} is unaccounted for.`,
                recordId: inv.id,
                table: 'invoices',
                amount: balance,
                detectedAt: new Date().toISOString(),
            });
        }
    }

    return issues;
}

// ─── 2. Duplicate Detection ───────────────────────────────────────────────────

/**
 * Detect duplicate receipts: same studentId + amount + payment date.
 */
export function detectDuplicateReceipts(receipts: Receipt[]): AuditIssue[] {
    const issues: AuditIssue[] = [];
    const seen = new Map<string, Receipt>();

    for (const r of receipts) {
        const dateKey = r.paymentDate?.split('T')[0] ?? '';
        const key = `${r.studentId ?? 'NO_STUDENT'}|${r.amountPaid}|${dateKey}`;
        if (seen.has(key)) {
            const first = seen.get(key)!;
            issues.push({
                id: `dup-receipt-${r.id}`,
                type: 'DUPLICATE_RECEIPT',
                severity: 'HIGH',
                message: `Possible duplicate receipt: #${r.receiptNumber} and #${first.receiptNumber} — same amount (KES ${r.amountPaid.toLocaleString()}), same date, same student.`,
                recordId: r.id,
                table: 'receipts',
                amount: r.amountPaid,
                metadata: { duplicateOfId: first.id, receiptNumber: first.receiptNumber },
                detectedAt: new Date().toISOString(),
            });
        } else {
            seen.set(key, r);
        }
    }
    return issues;
}

// ─── 3. Invoice Sequence Gap Detection ───────────────────────────────────────

/**
 * Detect gaps in invoice number sequences, e.g. INV-001 → INV-003 (missing INV-002).
 */
export function detectInvoiceSequenceGaps(invoices: Invoice[]): AuditIssue[] {
    const issues: AuditIssue[] = [];

    // Extract numeric suffixes
    const nums = invoices
        .map(i => ({ inv: i, n: parseInt(i.invoiceNumber.replace(/\D/g, ''), 10) }))
        .filter(x => !isNaN(x.n))
        .sort((a, b) => a.n - b.n);

    for (let i = 1; i < nums.length; i++) {
        const gap = nums[i].n - nums[i - 1].n;
        if (gap > 1) {
            issues.push({
                id: `seq-gap-${nums[i - 1].n}-${nums[i].n}`,
                type: 'SEQUENCE_GAP',
                severity: 'MEDIUM',
                message: `Invoice sequence gap detected between #${nums[i - 1].inv.invoiceNumber} and #${nums[i].inv.invoiceNumber}. ${gap - 1} invoice number(s) are missing.`,
                detectedAt: new Date().toISOString(),
                metadata: { from: nums[i - 1].n, to: nums[i].n, missingCount: gap - 1 },
            });
        }
    }
    return issues;
}

// ─── 4. Expense Policy Checks ─────────────────────────────────────────────────

/**
 * Configurable policy thresholds per institution.
 */
export interface AuditPolicyConfig {
    largeCashThreshold: number;       // KES, default 100_000
    expenseApprovalThreshold: number; // KES, expenses above this need approval
}

export const DEFAULT_POLICY: AuditPolicyConfig = {
    largeCashThreshold: 100_000,
    expenseApprovalThreshold: 50_000,
};

export function checkExpensePolicies(
    expenses: Expense[],
    policy: AuditPolicyConfig = DEFAULT_POLICY
): AuditIssue[] {
    const issues: AuditIssue[] = [];

    for (const exp of expenses) {
        // Large cash payment without approval
        if (
            exp.paymentMethod?.toLowerCase().includes('cash') &&
            exp.amount > policy.largeCashThreshold &&
            exp.status !== 'approved'
        ) {
            issues.push({
                id: `large-cash-${exp.id}`,
                type: 'LARGE_CASH_UNAPPROVED',
                severity: 'CRITICAL',
                message: `Cash expense of KES ${exp.amount.toLocaleString()} (${exp.description}) exceeds KES ${policy.largeCashThreshold.toLocaleString()} limit and is not approved.`,
                recordId: exp.id,
                table: 'expenses',
                amount: exp.amount,
                detectedAt: new Date().toISOString(),
            });
        }

        // High-value expense pending
        if (exp.amount > policy.expenseApprovalThreshold && exp.status === 'pending') {
            issues.push({
                id: `pending-approval-${exp.id}`,
                type: 'HIGH_VALUE_PENDING',
                severity: 'HIGH',
                message: `Expense of KES ${exp.amount.toLocaleString()} (${exp.description}) is pending approval.`,
                recordId: exp.id,
                table: 'expenses',
                amount: exp.amount,
                detectedAt: new Date().toISOString(),
            });
        }
    }
    return issues;
}

// ─── 5. Statistical Anomaly Scoring ──────────────────────────────────────────

export interface ScoredReceipt extends Receipt {
    zScore: number;
    isAnomaly: boolean;
}

/**
 * Flag receipts whose amount is a statistical outlier (|z-score| > 2.5).
 */
export function scoreReceiptAnomalies(receipts: Receipt[]): ScoredReceipt[] {
    if (receipts.length < 3) return receipts.map(r => ({ ...r, zScore: 0, isAnomaly: false }));

    const amounts = receipts.map(r => r.amountPaid);
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    return receipts.map(r => {
        const zScore = stdDev > 0 ? Math.abs((r.amountPaid - mean) / stdDev) : 0;
        return { ...r, zScore: parseFloat(zScore.toFixed(2)), isAnomaly: zScore > 2.5 };
    });
}

/**
 * Convert anomalous receipts into AuditIssues.
 */
export function anomaliesToIssues(scored: ScoredReceipt[]): AuditIssue[] {
    return scored
        .filter(r => r.isAnomaly)
        .map(r => ({
            id: `anomaly-${r.id}`,
            type: 'STATISTICAL_ANOMALY',
            severity: r.zScore > 4 ? 'CRITICAL' as AuditSeverity : 'HIGH' as AuditSeverity,
            message: `Receipt #${r.receiptNumber} (KES ${r.amountPaid.toLocaleString()}) is a statistical outlier — z-score ${r.zScore}. This is unusually ${r.amountPaid > 0 ? 'large' : 'small'} compared to other receipts.`,
            recordId: r.id,
            table: 'receipts',
            amount: r.amountPaid,
            metadata: { zScore: r.zScore },
            detectedAt: new Date().toISOString(),
        }));
}

// ─── 6. Trial Balance ─────────────────────────────────────────────────────────

export interface TrialBalanceLine {
    category: string;
    debit: number;
    credit: number;
    net: number;
}

export interface TrialBalance {
    lines: TrialBalanceLine[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
    imbalance: number;
}

/**
 * Compute a simple trial balance from invoices, receipts, and expenses.
 */
export function computeTrialBalance(
    invoices: Invoice[],
    receipts: Receipt[],
    expenses: Expense[]
): TrialBalance {
    const totalBilled    = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalCollected = receipts.reduce((s, r) => s + r.amountPaid, 0);
    const totalExpenses  = expenses.filter(e => e.status === 'paid' || e.status === 'approved').reduce((s, e) => s + e.amount, 0);
    const totalPending   = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);

    const lines: TrialBalanceLine[] = [
        { category: 'Fees Billed (Receivables)',    debit: totalBilled,    credit: 0,              net: totalBilled },
        { category: 'Fees Collected (Cash/M-Pesa)', debit: 0,              credit: totalCollected,  net: -totalCollected },
        { category: 'Approved Expenses',            debit: totalExpenses,  credit: 0,               net: totalExpenses },
        { category: 'Pending Expenses',             debit: totalPending,   credit: 0,               net: totalPending },
    ];

    const totalDebit  = lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
    const imbalance   = Math.abs(totalDebit - totalCredit);

    return { lines, totalDebit, totalCredit, isBalanced: imbalance < 1, imbalance };
}

// ─── 7. Variance Analysis ─────────────────────────────────────────────────────

export interface BudgetLine {
    category: string;
    budgetedAmount: number;
}

export interface VarianceLine extends BudgetLine {
    actual: number;
    variance: number;
    variancePct: number;
    flag: 'OK' | 'WATCH' | 'REVIEW' | 'CRITICAL';
}

/**
 * Compare budget lines against actual expenses.
 */
export function computeVariance(budget: BudgetLine[], expenses: Expense[]): VarianceLine[] {
    return budget.map(line => {
        const actual = expenses
            .filter(e => e.category?.toLowerCase() === line.category?.toLowerCase())
            .reduce((s, e) => s + e.amount, 0);

        const variance    = actual - line.budgetedAmount;
        const variancePct = line.budgetedAmount > 0
            ? parseFloat(((variance / line.budgetedAmount) * 100).toFixed(1))
            : 0;

        let flag: VarianceLine['flag'] = 'OK';
        if (Math.abs(variancePct) > 30) flag = 'CRITICAL';
        else if (Math.abs(variancePct) > 20) flag = 'REVIEW';
        else if (Math.abs(variancePct) > 10) flag = 'WATCH';

        return { ...line, actual, variance, variancePct, flag };
    });
}

// ─── 8. Full Audit Run ────────────────────────────────────────────────────────

export interface FullAuditInput {
    invoices: Invoice[];
    receipts: Receipt[];
    expenses: Expense[];
    institutionId: string;
    period?: string;
    policy?: AuditPolicyConfig;
}

/**
 * Run all audit checks and return a consolidated AuditReport.
 */
export function runFullAudit(input: FullAuditInput): AuditReport {
    const { invoices, receipts, expenses, institutionId, policy } = input;
    const period = input.period ?? new Date().toISOString().slice(0, 7); // YYYY-MM

    const issues: AuditIssue[] = [
        ...reconcileInvoicesAndReceipts(invoices, receipts),
        ...detectDuplicateReceipts(receipts),
        ...detectInvoiceSequenceGaps(invoices),
        ...checkExpensePolicies(expenses, policy),
        ...anomaliesToIssues(scoreReceiptAnomalies(receipts)),
    ];

    // Deduplicate by id
    const unique = Array.from(new Map(issues.map(i => [i.id, i])).values());

    const totalBilled    = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalCollected = receipts.reduce((s, r) => s + r.amountPaid, 0);

    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const iss of unique) {
        const k = iss.severity.toLowerCase() as keyof typeof counts;
        if (k in counts) counts[k]++;
    }

    const overallRisk: AuditSeverity =
        counts.critical > 0 ? 'CRITICAL' :
        counts.high     > 0 ? 'HIGH'     :
        counts.medium   > 0 ? 'MEDIUM'   :
        counts.low      > 0 ? 'LOW'      : 'INFO';

    return {
        period,
        runAt: new Date().toISOString(),
        institutionId,
        issues: unique.sort((a, b) => {
            const order: Record<AuditSeverity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
            return order[a.severity] - order[b.severity];
        }),
        summary: {
            totalIssues: unique.length,
            ...counts,
            overallRisk,
            totalBilled,
            totalCollected,
            collectionRate: totalBilled > 0 ? parseFloat(((totalCollected / totalBilled) * 100).toFixed(1)) : 0,
            outstandingDebt: totalBilled - totalCollected,
        },
    };
}
