import React, { useState } from 'react';
import { 
    XIcon, 
    DownloadIcon, 
    UsersIcon, 
    CreditCardIcon, 
    AcademicCapIcon, 
    DocumentTextIcon, 
    SparklesIcon,
    BanknotesIcon,
    ShieldCheckIcon
} from '../icons';
import { useToast } from '../../services/ToastContext';
import { 
    exportStudentsToExcel, 
    exportInvoicesToExcel, 
    exportReceiptsToExcel, 
    exportCategoriesToExcel, 
    exportVoteheadsToExcel, 
    exportSystemUsersToExcel, 
    exportAllDSToExcel 
} from './dsExcelExport';
import type { 
    DSStudent, 
    DSInvoice, 
    DSPayment, 
    DSLicenseCategory, 
    DSVote, 
    User, 
    DSInstructor, 
    Branch 
} from '../../types';

interface DSExcelExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: DSStudent[];
    invoices: DSInvoice[];
    payments: DSPayment[];
    categories?: DSLicenseCategory[];
    votes?: DSVote[];
    users?: User[];
    instructors?: DSInstructor[];
    branches?: Branch[];
    institutionName?: string;
}

export const DSExcelExportModal: React.FC<DSExcelExportModalProps> = ({
    isOpen,
    onClose,
    students,
    invoices,
    payments,
    categories = [],
    votes = [],
    users = [],
    instructors = [],
    branches = [],
    institutionName
}) => {
    const { success, error: toastError } = useToast();
    const [downloadingTarget, setDownloadingTarget] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleExport = async (target: string, fn: () => string) => {
        setDownloadingTarget(target);
        try {
            const filename = fn();
            success(`Generated & downloaded "${filename}"`);
        } catch (err: any) {
            console.error(`Export failed for ${target}:`, err);
            toastError(err?.message || `Failed to export ${target} to Excel.`);
        } finally {
            setDownloadingTarget(null);
        }
    };

    const categoriesCount = (categories && categories.length > 0) ? categories.length : 5;
    const votesCount = (votes && votes.length > 0) ? votes.length : 6;
    const systemUsersCount = (users?.length || 0) + (instructors?.length || 0);

    const exportOptions = [
        {
            id: 'students',
            title: 'Students Roster',
            description: 'Enrolled, graduated & dropped candidates with admission numbers, contacts, categories, progress & fee balances.',
            count: `${students.length} Students`,
            icon: UsersIcon,
            color: 'indigo',
            onExport: () => exportStudentsToExcel(students, invoices, payments, instructors, branches, institutionName)
        },
        {
            id: 'invoices',
            title: 'Billing Invoices',
            description: 'Student invoices with itemized fee structures, discounts, sponsorships, balances and payment statuses.',
            count: `${invoices.length} Invoices`,
            icon: DocumentTextIcon,
            color: 'blue',
            onExport: () => exportInvoicesToExcel(invoices, students, branches, institutionName)
        },
        {
            id: 'receipts',
            title: 'Receipts & Payments',
            description: 'Transaction receipts, payment channels (M-Pesa, Cash, Bank), dates, collection cashiers and references.',
            count: `${payments.length} Receipts`,
            icon: CreditCardIcon,
            color: 'emerald',
            onExport: () => exportReceiptsToExcel(payments, students, invoices, branches, institutionName)
        },
        {
            id: 'category',
            title: 'License Categories',
            description: 'NTSA driving classifications (A1, B, C1, C, E), standard base tuition pricing, status and curriculum programs.',
            count: `${categoriesCount} Categories`,
            icon: AcademicCapIcon,
            color: 'purple',
            onExport: () => exportCategoriesToExcel(categories, institutionName)
        },
        {
            id: 'voteheads',
            title: 'Fee Voteheads',
            description: 'Configured tuition fee heads, registration fees, NTSA test booking fees, default amounts and mandatory rules.',
            count: `${votesCount} Voteheads`,
            icon: BanknotesIcon,
            color: 'amber',
            onExport: () => exportVoteheadsToExcel(votes, institutionName)
        },
        {
            id: 'users',
            title: 'System Users & Staff',
            description: 'Institutional user accounts, administration roles, instructors, employee IDs, contacts and campus assignments.',
            count: `${systemUsersCount} Staff & Instructors`,
            icon: ShieldCheckIcon,
            color: 'cyan',
            onExport: () => exportSystemUsersToExcel(users, instructors, branches, institutionName)
        }
    ];

    return (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 max-w-4xl w-full shadow-2xl overflow-hidden my-8 animate-fade-in flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                            <DownloadIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Export Driving School to Excel
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                Select datasets to export formatted Microsoft Excel spreadsheets (.xlsx)
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                        title="Close Modal"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    
                    {/* Master All-in-One Export Banner */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 border border-indigo-500/30 text-white shadow-xl shadow-indigo-950/40">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="space-y-2 max-w-xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300">
                                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-300" />
                                    Master All-in-One Workbook
                                </div>
                                <h4 className="text-lg sm:text-xl font-black tracking-tight uppercase text-white">
                                    Export Full Driving School Database
                                </h4>
                                <p className="text-xs text-indigo-200/80 leading-relaxed">
                                    Download all 6 datasets bundled into a single organized Excel workbook with individual sheets for Students, Invoices, Receipts, Categories, Fee Voteheads, and System Users.
                                </p>
                            </div>
                            <button
                                onClick={() => handleExport('all', () => exportAllDSToExcel({
                                    students,
                                    invoices,
                                    payments,
                                    categories,
                                    votes,
                                    users,
                                    instructors,
                                    branches,
                                    institutionName
                                }))}
                                disabled={downloadingTarget !== null}
                                className="px-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 whitespace-nowrap disabled:opacity-50 self-stretch md:self-auto justify-center"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                {downloadingTarget === 'all' ? 'Generating Workbook...' : 'Export All Sheets (.xlsx)'}
                            </button>
                        </div>
                    </div>

                    {/* Section Header */}
                    <div className="flex items-center justify-between pt-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                            Individual Module Exports
                        </h4>
                        <span className="text-[10px] text-slate-400 font-bold">
                            Formatted with auto-sized columns & headers
                        </span>
                    </div>

                    {/* 6 Dataset Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {exportOptions.map((opt) => {
                            const IconComponent = opt.icon;
                            const isCurrentLoading = downloadingTarget === opt.id;

                            return (
                                <div 
                                    key={opt.id}
                                    className="p-5 bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800/80 hover:border-indigo-400/40 dark:hover:border-indigo-600/40 transition-all flex flex-col justify-between group"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700">
                                                <IconComponent className="w-5 h-5" />
                                            </div>
                                            <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                                {opt.count}
                                            </span>
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                {opt.title}
                                            </h5>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1 font-medium">
                                                {opt.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            .XLSX FORMAT
                                        </span>
                                        <button
                                            onClick={() => handleExport(opt.id, opt.onExport)}
                                            disabled={downloadingTarget !== null}
                                            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xs flex items-center gap-2 group-hover:border-indigo-500 disabled:opacity-50"
                                        >
                                            <DownloadIcon className="w-3.5 h-3.5" />
                                            {isCurrentLoading ? 'Exporting...' : 'Export to Excel'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold">
                        Institutional Scope: {institutionName || 'Driving School'}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
};
