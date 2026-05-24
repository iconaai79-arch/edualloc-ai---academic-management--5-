
import React from 'react';
import type { User, Institution, Invoice, Receipt, Expense, FinancialGoal, FeeStructure, AcademicYear, Semester, Requisition, VoteHead, Course } from '../../types';
import { FinanceManager } from './FinanceManager';
import { Header } from '../Header';

interface FinanceOfficerViewProps {
    currentUser: User;
    currentInstitution: Institution;
    invoices: Invoice[];
    receipts: Receipt[];
    expenses?: Expense[];
    goals?: FinancialGoal[];
    feeStructures?: FeeStructure[];
    students?: User[];
    academicYears?: AcademicYear[];
    semesters?: Semester[];
    onGenerateInvoices?: (invoices: any[]) => Promise<void>;
    onAddExpense?: (expense: any) => Promise<void>;
    receiptLimit: number;
    setReceiptLimit: React.Dispatch<React.SetStateAction<number>>;
    transactionLimit: number;
    setTransactionLimit: React.Dispatch<React.SetStateAction<number>>;
    transactions?: any[];
    onAddTransaction?: (data: any, items: any[]) => Promise<any>;
    onGenerateReceipt?: (transaction: any) => void;
    onLogAction?: (action: string) => void;
    requisitions?: Requisition[];
    onUpdateRequisition?: (id: string, data: any) => Promise<void>;
    voteHeads?: VoteHead[];
    courses?: Course[];
    onRefreshData?: () => Promise<void>;
}

export const FinanceOfficerView: React.FC<FinanceOfficerViewProps> = ({
    currentUser,
    currentInstitution,
    invoices,
    receipts,
    expenses,
    goals,
    feeStructures,
    students,
    academicYears,
    semesters,
    onGenerateInvoices,
    onAddExpense,
    receiptLimit,
    setReceiptLimit,
    transactionLimit,
    setTransactionLimit,
    transactions,
    onAddTransaction,
    onGenerateReceipt,
    onLogAction,
    requisitions,
    onUpdateRequisition,
    voteHeads,
    courses,
    onRefreshData
}) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Header 
                currentUser={currentUser} 
                institutionName={currentInstitution.name} 
                onLogout={() => window.location.reload()}
            />
            
            <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-10">
                {/* Hero / Welcome Section */}
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Live Fiscal Monitoring</span>
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Financial Intelligence Hub</h1>
                        <p className="text-slate-500 font-medium">Welcome back, {currentUser.name}. Your institutional revenue streams are performing at <span className="text-emerald-600 font-black">94.2% efficiency</span>.</p>
                    </div>
                </div>

                {/* Centralized Finance Hub */}
                <FinanceManager 
                    invoices={invoices || []}
                    receipts={receipts || []}
                    expenses={expenses || []}
                    goals={goals || []}
                    feeStructures={feeStructures || []}
                    students={students || []}
                    academicYears={academicYears || []}
                    semesters={semesters || []}
                    institution={currentInstitution}
                    onGenerateInvoices={onGenerateInvoices || (async () => {})}
                    onAddExpense={onAddExpense || (async () => {})}
                    receiptLimit={receiptLimit}
                    setReceiptLimit={setReceiptLimit}
                    transactionLimit={transactionLimit}
                    setTransactionLimit={setTransactionLimit}
                    transactions={transactions}
                    requisitions={requisitions}
                    onUpdateRequisition={onUpdateRequisition}
                    currentUser={currentUser}
                    voteHeads={voteHeads}
                    courses={courses}
                    onRefreshData={onRefreshData}
                />
            </main>
        </div>
    );
};

