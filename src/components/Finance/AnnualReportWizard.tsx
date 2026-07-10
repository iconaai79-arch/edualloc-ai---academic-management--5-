/**
 * AnnualReportWizard.tsx
 * UI component for the Kenyan Government Annual Financial Report.
 * Wired into the Finance Module's Fiscal Audit tab.
 */
import React, { useState, useMemo } from 'react';
import type { Invoice, Receipt, Expense, Institution, CompanyDetails } from '../../types';
import { generateAnnualReportPdf, buildReportDataFromLive, type AnnualReportData } from '../../services/annualReportService';

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────
const IcoFile = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
);
const IcoDl = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);
const IcoEye = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);
const IcoSpark = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M12 2L9.09 9.09 2 12l7.09 2.91L12 22l2.91-7.09L22 12l-7.09-2.91z" />
    </svg>
);

// ─── Input field helper ───────────────────────────────────────────────────────
const Field = ({
    label, name, value, onChange, type = 'number', hint = ''
}: {
    label: string; name: string; value: any; onChange: (k: string, v: any) => void; type?: string; hint?: string;
}) => (
    <div className="space-y-1">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
        <input
            type={type}
            value={value ?? ''}
            onChange={e => onChange(name, type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
        {hint && <p className="text-[9px] text-slate-400">{hint}</p>}
    </div>
);

// ─── Section card ─────────────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 space-y-4">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border-b border-slate-100 dark:border-slate-700 pb-3">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">{children}</div>
    </div>
);

// ─── Props ────────────────────────────────────────────────────────────────────
interface AnnualReportWizardProps {
    invoices: Invoice[];
    receipts: Receipt[];
    expenses: Expense[];
    institution: Institution;
    companyDetails?: CompanyDetails;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const AnnualReportWizard: React.FC<AnnualReportWizardProps> = ({
    invoices, receipts, expenses, institution, companyDetails
}) => {
    // Detect current FY automatically (July-June year)
    const autoFY = (() => {
        const now = new Date();
        const yr = now.getFullYear();
        const month = now.getMonth(); // 0-indexed, July = 6
        return month >= 6 ? `${yr}/${yr + 1}` : `${yr - 1}/${yr}`;
    })();

    // Build pre-filled defaults from live data
    const liveDefaults = useMemo(
        () => buildReportDataFromLive(invoices, receipts, expenses, autoFY),
        [invoices, receipts, expenses, autoFY]
    );

    const [formData, setFormData] = useState<Partial<AnnualReportData>>({
        ...liveDefaults,
        financialYear: autoFY,
        yearEndDate: `30th June ${autoFY.split('/')[1] || ''}`,
        comparativeYear: `${parseInt(autoFY.split('/')[0]) - 1}/${autoFY.split('/')[0]}`,
        // zero non-auto fields
        capitationTuition: 0,
        capitationOperations: 0,
        capitationInfrastructure: 0,
        capitationSNE: 0,
        donorGrants: 0,
        govtTransfers: 0,
        contributions: 0,
        openingAccumulatedSurplus: 0,
        openingCash: 0,
        bomChairName: '',
        principalName: institution?.name || '',
        bursarName: '',
        icpakNo: '',
        approvalDate: '',
        ...liveDefaults,
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [pdfUri, setPdfUri] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const set = (k: string, v: any) => setFormData(prev => ({ ...prev, [k]: v }));

    const handleAutoFill = () => {
        const defaults = buildReportDataFromLive(invoices, receipts, expenses, formData.financialYear || autoFY);
        setFormData(prev => ({ ...prev, ...defaults }));
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setPdfUri(null);
        try {
            const data = formData as AnnualReportData;
            const logoUrl = (institution as any)?.logoUrl || companyDetails?.logoUrl || null;
            const uri = await generateAnnualReportPdf(data, institution, companyDetails, logoUrl);
            setPdfUri(uri);
        } catch (e: any) {
            setError(e.message || 'Failed to generate report');
            console.error('[AnnualReportWizard]', e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = () => {
        if (!pdfUri) return;
        const a = document.createElement('a');
        a.href = pdfUri;
        a.download = `Annual_Financial_Report_FY${(formData.financialYear || autoFY).replace('/', '-')}_${institution?.name?.replace(/\s+/g, '_') || 'School'}.pdf`;
        a.click();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                        Annual Financial Report
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Kenyan Public Secondary School · MOE Official Template · IPSAS Accrual Basis
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={handleAutoFill}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-700 transition-all"
                    >
                        <IcoSpark /> Auto-fill from Live Data
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        {isGenerating
                            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
                            : <><IcoFile /> Generate PDF Report</>
                        }
                    </button>
                </div>
            </div>

            {/* Info banner */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-3xl p-5">
                <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    📋 This generates the full <strong>Annual Report and Financial Statements</strong> in compliance with the Kenyan Ministry of Education template for FY2025-26.
                    It includes: Statement of Financial Performance, Financial Position, Changes in Net Assets, Cash Flows, Budget vs. Actual, and Selected Notes.
                </p>
                <p className="text-[10px] text-indigo-500 mt-1.5">
                    Prepared under IPSAS Accrual Basis · PFM Act 2012 · Basic Education Act 2013
                </p>
            </div>

            {/* Form */}
            <div className="space-y-6">
                {/* Period */}
                <Section title="📅 Reporting Period">
                    <Field label="Financial Year (e.g. 2025/2026)" name="financialYear" type="text" value={formData.financialYear} onChange={set} />
                    <Field label="Year End Date (e.g. 30th June 2026)" name="yearEndDate" type="text" value={formData.yearEndDate} onChange={set} />
                    <Field label="Comparative Year (e.g. 2024/2025)" name="comparativeYear" type="text" value={formData.comparativeYear} onChange={set} />
                </Section>

                {/* Revenue */}
                <Section title="📈 Revenue — Non-Exchange Transactions (Kshs)">
                    <Field label="Capitation Grants — Tuition" name="capitationTuition" value={formData.capitationTuition} onChange={set} />
                    <Field label="Capitation Grants — Operations" name="capitationOperations" value={formData.capitationOperations} onChange={set} />
                    <Field label="Revenue for Infrastructure" name="capitationInfrastructure" value={formData.capitationInfrastructure} onChange={set} />
                    <Field label="Capitation — Special Needs (SNE)" name="capitationSNE" value={formData.capitationSNE} onChange={set} />
                    <Field label="Grants from Donors & Partners" name="donorGrants" value={formData.donorGrants} onChange={set} />
                    <Field label="Transfers from Govt Entities" name="govtTransfers" value={formData.govtTransfers} onChange={set} />
                    <Field label="Contributions & Donations" name="contributions" value={formData.contributions} onChange={set} />
                </Section>

                <Section title="💰 Revenue — Exchange Transactions (Kshs)">
                    <Field label="Students' Fees Received" name="studentFees" value={formData.studentFees} onChange={set} hint="Auto-filled from receipts" />
                    <Field label="Miscellaneous Income" name="miscIncome" value={formData.miscIncome} onChange={set} />
                    <Field label="Finance / Interest Income" name="financeIncome" value={formData.financeIncome} onChange={set} />
                </Section>

                <Section title="📉 Expenditure (Kshs)">
                    <Field label="Expenditure for Tuition" name="expTuition" value={formData.expTuition} onChange={set} />
                    <Field label="Expenditure for Operations" name="expOperations" value={formData.expOperations} onChange={set} />
                    <Field label="Expenditure for Special Needs" name="expSNE" value={formData.expSNE} onChange={set} />
                    <Field label="Expenditure for Boarding / Lunch" name="expBoarding" value={formData.expBoarding} onChange={set} />
                    <Field label="Depreciation & Amortisation" name="expDepreciation" value={formData.expDepreciation} onChange={set} />
                    <Field label="Finance Costs" name="expFinanceCosts" value={formData.expFinanceCosts} onChange={set} />
                </Section>

                <Section title="🏦 Balance Sheet — Assets (Kshs)">
                    <Field label="Cash & Bank Balances" name="cashBank" value={formData.cashBank} onChange={set} />
                    <Field label="Accounts Receivable (Fee Arrears)" name="accountsReceivable" value={formData.accountsReceivable} onChange={set} hint="Auto-filled: invoiced minus collected" />
                    <Field label="Inventories" name="inventories" value={formData.inventories} onChange={set} />
                    <Field label="Prepayments" name="prepayments" value={formData.prepayments} onChange={set} />
                    <Field label="Long-Term Investments" name="longTermInvestments" value={formData.longTermInvestments} onChange={set} />
                    <Field label="Property, Plant & Equipment (NBV)" name="ppe" value={formData.ppe} onChange={set} />
                    <Field label="Intangible Assets" name="intangibleAssets" value={formData.intangibleAssets} onChange={set} />
                </Section>

                <Section title="💳 Balance Sheet — Liabilities (Kshs)">
                    <Field label="Fees / Income Received in Advance" name="feesAdvance" value={formData.feesAdvance} onChange={set} />
                    <Field label="Accounts Payable" name="accountsPayable" value={formData.accountsPayable} onChange={set} />
                    <Field label="Short-Term Borrowings" name="shortTermBorrowings" value={formData.shortTermBorrowings} onChange={set} />
                    <Field label="Provisions" name="provisions" value={formData.provisions} onChange={set} />
                    <Field label="Long-Term Borrowings" name="longTermBorrowings" value={formData.longTermBorrowings} onChange={set} />
                </Section>

                <Section title="📊 Opening Balances & Cash Flow (Kshs)">
                    <Field label="Opening Accumulated Surplus B/F" name="openingAccumulatedSurplus" value={formData.openingAccumulatedSurplus} onChange={set} />
                    <Field label="Opening Cash Balance (1 July)" name="openingCash" value={formData.openingCash} onChange={set} />
                    <Field label="PPE Purchased During Year" name="purchasePPE" value={formData.purchasePPE} onChange={set} />
                    <Field label="Proceeds from PPE Disposals" name="proceedsDisposal" value={formData.proceedsDisposal} onChange={set} />
                    <Field label="Proceeds from Borrowings" name="proceedsBorrowings" value={formData.proceedsBorrowings} onChange={set} />
                    <Field label="Repayment of Borrowings" name="repaymentBorrowings" value={formData.repaymentBorrowings} onChange={set} />
                </Section>

                <Section title="✍️ Signatories">
                    <Field label="BOM Chair Name" name="bomChairName" type="text" value={formData.bomChairName} onChange={set} />
                    <Field label="Principal / Secretary BOM" name="principalName" type="text" value={formData.principalName} onChange={set} />
                    <Field label="Bursar / Finance Officer" name="bursarName" type="text" value={formData.bursarName} onChange={set} />
                    <Field label="ICPAK Membership No" name="icpakNo" type="text" value={formData.icpakNo} onChange={set} />
                    <Field label="Approval Date" name="approvalDate" type="date" value={formData.approvalDate} onChange={set} />
                </Section>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-2xl text-rose-700 dark:text-rose-300 text-xs font-bold">
                    ⚠️ {error}
                </div>
            )}

            {/* PDF Ready */}
            {pdfUri && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">✅ Annual Financial Report Generated!</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                            6-page report covering Statements of Financial Performance, Position, Changes in Net Assets, Cash Flows, Budget vs Actual, and Notes.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { const w = window.open(); w?.document.write(`<iframe src="${pdfUri}" width="100%" height="100%"></iframe>`); }}
                            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 transition-all"
                        >
                            <IcoEye /> Preview
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all"
                        >
                            <IcoDl /> Download PDF
                        </button>
                    </div>
                </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Total Revenue',
                        value: (
                            (formData.capitationTuition || 0) + (formData.capitationOperations || 0) +
                            (formData.capitationInfrastructure || 0) + (formData.capitationSNE || 0) +
                            (formData.donorGrants || 0) + (formData.govtTransfers || 0) +
                            (formData.contributions || 0) + (formData.studentFees || 0) +
                            (formData.miscIncome || 0) + (formData.financeIncome || 0)
                        ),
                        color: 'indigo',
                    },
                    {
                        label: 'Total Expenditure',
                        value: (
                            (formData.expTuition || 0) + (formData.expOperations || 0) +
                            (formData.expSNE || 0) + (formData.expBoarding || 0) +
                            (formData.expDepreciation || 0) + (formData.expFinanceCosts || 0)
                        ),
                        color: 'rose',
                    },
                    {
                        label: 'Total Assets',
                        value: (
                            (formData.cashBank || 0) + (formData.accountsReceivable || 0) +
                            (formData.inventories || 0) + (formData.prepayments || 0) +
                            (formData.longTermInvestments || 0) + (formData.ppe || 0) +
                            (formData.intangibleAssets || 0)
                        ),
                        color: 'emerald',
                    },
                    {
                        label: 'Total Liabilities',
                        value: (
                            (formData.feesAdvance || 0) + (formData.accountsPayable || 0) +
                            (formData.shortTermBorrowings || 0) + (formData.provisions || 0) +
                            (formData.longTermBorrowings || 0)
                        ),
                        color: 'amber',
                    },
                ].map(card => {
                    const surplus = (
                        (formData.capitationTuition || 0) + (formData.capitationOperations || 0) +
                        (formData.capitationInfrastructure || 0) + (formData.capitationSNE || 0) +
                        (formData.donorGrants || 0) + (formData.govtTransfers || 0) +
                        (formData.contributions || 0) + (formData.studentFees || 0) +
                        (formData.miscIncome || 0) + (formData.financeIncome || 0)
                    ) - (
                        (formData.expTuition || 0) + (formData.expOperations || 0) +
                        (formData.expSNE || 0) + (formData.expBoarding || 0) +
                        (formData.expDepreciation || 0) + (formData.expFinanceCosts || 0)
                    );
                    return (
                        <div key={card.label} className={`p-5 rounded-3xl border bg-${card.color}-50 dark:bg-${card.color}-900/20 border-${card.color}-100 dark:border-${card.color}-800`}>
                            <p className={`text-[9px] font-black uppercase tracking-widest text-${card.color}-400 mb-1`}>{card.label}</p>
                            <p className={`text-xl font-black text-${card.color}-700 dark:text-${card.color}-300`}>
                                KES {card.value.toLocaleString()}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Net Surplus / Deficit */}
            {(() => {
                const totalRev = (
                    (formData.capitationTuition || 0) + (formData.capitationOperations || 0) +
                    (formData.capitationInfrastructure || 0) + (formData.capitationSNE || 0) +
                    (formData.donorGrants || 0) + (formData.govtTransfers || 0) +
                    (formData.contributions || 0) + (formData.studentFees || 0) +
                    (formData.miscIncome || 0) + (formData.financeIncome || 0)
                );
                const totalExp = (
                    (formData.expTuition || 0) + (formData.expOperations || 0) +
                    (formData.expSNE || 0) + (formData.expBoarding || 0) +
                    (formData.expDepreciation || 0) + (formData.expFinanceCosts || 0)
                );
                const net = totalRev - totalExp;
                return (
                    <div className={`p-6 rounded-3xl border flex items-center justify-between ${net >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700'}`}>
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {net >= 0 ? '📈 Net Surplus for the Year' : '📉 Net Deficit for the Year'}
                            </p>
                            <p className={`text-3xl font-black mt-1 ${net >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                KES {Math.abs(net).toLocaleString()}
                            </p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                            FY {formData.financialYear}
                        </p>
                    </div>
                );
            })()}
        </div>
    );
};
