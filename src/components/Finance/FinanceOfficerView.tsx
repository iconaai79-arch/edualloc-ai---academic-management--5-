
import React from 'react';
import type { User, Institution, Invoice, Receipt, Expense, FinancialGoal, FeeStructure, AcademicYear, Semester, Requisition, VoteHead, Course, CompanyDetails, StudentEnrollment } from '../../types';
import { FinanceManager } from './FinanceManager';
import { Header } from '../Header';
import { apiService } from '../../services/apiService';

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
    companyDetails?: CompanyDetails;
    // HR & Payroll
    users?: User[];
    payrollRecords?: any[];
    leaveRequests?: any[];
    onProcessPayroll?: (records: any[]) => Promise<void>;
    onUpdateLeaveStatus?: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    activityLog?: any[];
    studentEnrollments?: StudentEnrollment[];
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
    onRefreshData,
    companyDetails,
    users,
    payrollRecords,
    leaveRequests,
    onProcessPayroll,
    onUpdateLeaveStatus,
    onEditUser,
    onDeleteUser,
    activityLog,
    studentEnrollments
}) => {
    const totalBilled = (invoices || []).reduce((sum, inv) => sum + (inv.totalAmount || (inv as any).total_amount || 0), 0);
    const totalCollected = (receipts || []).reduce((sum, rec) => sum + (rec.amountPaid || (rec as any).amount_paid || 0), 0);
    const efficiencyRate = totalBilled > 0 ? Math.min(100, Math.round((totalCollected / totalBilled) * 1000) / 10) : 100;

    React.useEffect(() => {
        if (currentInstitution?.id) {
            apiService.prefetchFinanceRecords(currentInstitution.id).catch(() => {});
        }
    }, [currentInstitution?.id]);

    return (
        <div className="space-y-10 w-full">
            {/* Hero / Welcome Section */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Live Fiscal Monitoring</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">Financial Intelligence Hub</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Welcome back, {currentUser.name}. Your institutional revenue streams are performing at <span className="text-emerald-600 dark:text-emerald-400 font-black">{efficiencyRate}% efficiency</span>.</p>
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
                companyDetails={companyDetails}
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
                onLogAction={onLogAction}
                users={users}
                payrollRecords={payrollRecords}
                leaveRequests={leaveRequests}
                onProcessPayroll={onProcessPayroll}
                onUpdateLeaveStatus={onUpdateLeaveStatus}
                onEditUser={onEditUser}
                onDeleteUser={onDeleteUser}
                activityLog={activityLog}
                studentEnrollments={studentEnrollments}
            />
        </div>
    );
};

