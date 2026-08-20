import React, { useState, useEffect, useMemo } from 'react';
import { User, Institution, BoardingHouse, Receipt } from '../../types';
import { HomeIcon } from '../icons/HomeIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { FilterIcon as FunnelIcon } from '../icons/FilterIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { AlertTriangleIcon as ExclamationTriangleIcon } from '../icons/AlertTriangleIcon';
import { XIcon } from '../icons/XIcon';
import { DownloadIcon as ArrowDownTrayIcon } from '../icons/DownloadIcon';
import { apiService } from '../../services/apiService';
import { escapeHtml } from '../../utils/securityUtils';
import { resolveRealStudentAdmNo } from '../../utils/academicUtils';

interface BoardingHouseholdBalanceManagerProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction?: (action: string) => Promise<void>;
}

interface HouseholdStudentBalance {
    id: string;
    name: string;
    admissionNumber: string;
    className: string;
    gender: 'Boys' | 'Girls' | 'Other';
    houseName: string;
    roomNumber: string;
    bedNumber: string;
    parentName: string;
    parentPhone: string;
    totalInvoiced: number;
    totalPaid: number;
    balance: number;
    clearancePercentage: number;
    status: 'FULLY_PAID' | 'PARTIAL' | 'CRITICAL_ARREARS';
}

interface HouseholdSummary {
    houseName: string;
    gender: 'Boys' | 'Girls' | 'Mixed';
    patronName: string;
    totalStudents: number;
    totalInvoiced: number;
    totalPaid: number;
    totalBalance: number;
    clearanceRate: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Default Boarding Houses for Kenyan & International Boarding Schools
const DEFAULT_HOUSES = [
    { name: 'Kilimanjaro House', gender: 'Boys', patron: 'Mr. David Omondi' },
    { name: 'Tsavo House', gender: 'Boys', patron: 'Mr. Joseph Kiptoo' },
    { name: 'Mara House', gender: 'Girls', patron: 'Mrs. Grace Wanjiku' },
    { name: 'Elgon House', gender: 'Girls', patron: 'Ms. Sarah Chebet' },
    { name: 'Simba House', gender: 'Boys', patron: 'Mr. Peter Otieno' },
    { name: 'Chania House', gender: 'Girls', patron: 'Mrs. Mary Njeri' }
];

export const BoardingHouseholdBalanceManager: React.FC<BoardingHouseholdBalanceManagerProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<User[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [houses, setHouses] = useState<BoardingHouse[]>([]);
    
    // Filters
    const [selectedHouseFilter, setSelectedHouseFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'FULLY_PAID' | 'PARTIAL' | 'CRITICAL_ARREARS'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // SMS Reminders Modal State
    const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
    const [smsTargetHouse, setSmsTargetHouse] = useState<string>('all');
    const [smsTemplate, setSmsTemplate] = useState(
        "Dear Parent, this is an official reminder from {SCHOOL_NAME}. Your child {STUDENT_NAME} of {HOUSE_NAME} has an outstanding fee balance of KSh {BALANCE}. Kindly clear via Paybill 247247 A/C {ADM_NO}."
    );
    const [smsSuccessMessage, setSmsSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchBoardingData();
    }, [currentInstitution.id]);

    const fetchBoardingData = async () => {
        setLoading(true);
        try {
            const [fetchedUsers, fetchedReceipts, fetchedHouses] = await Promise.all([
                apiService.fetchUsers(currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<Receipt>('receipts', currentInstitution.id).catch(() => []),
                apiService.fetchModuleRecords<BoardingHouse>('boarding_houses', currentInstitution.id).catch(() => [])
            ]);
            setStudents(fetchedUsers || []);
            setReceipts(fetchedReceipts || []);
            setHouses(fetchedHouses || []);
        } catch (err) {
            console.error('Failed to load boarding data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate household student balances
    const studentBalances: HouseholdStudentBalance[] = useMemo(() => {
        const boarders = students.filter(s => {
            const st = s as any;
            return st.role === 'student' && (st.accommodationType === 'Boarding' || st.boardingStatus === 'boarder' || st.boardingHouse || st.houseName);
        });

        // If no boarders tagged explicitly, map all students evenly to demo houses for presentation
        const activeList = boarders.length > 0 ? boarders : students.filter(s => (s as any).role === 'student');

        return activeList.map((st, idx) => {
            const s = st as any;
            const studentId = s.id;
            
            // Resolve student house name
            let houseName = s.boardingHouse || s.houseName || s.house || DEFAULT_HOUSES[idx % DEFAULT_HOUSES.length].name;
            
            // Total receipts paid by student
            const studentReceipts = receipts.filter(r => r.studentId === studentId);
            const totalPaid = studentReceipts.reduce((sum, r) => sum + (r.amountPaid || (r as any).amount || 0), 0);

            // Invoice estimation (Default Boarding Fee ~ KSh 45,000 per term)
            const baseBoardingFee = s.boardingFee || 45000;
            const tuitionFee = s.tuitionFee || 35000;
            const totalInvoiced = baseBoardingFee + tuitionFee;
            const balance = Math.max(0, totalInvoiced - totalPaid);
            const clearancePercentage = totalInvoiced > 0 ? Math.min(100, Math.round((totalPaid / totalInvoiced) * 100)) : 100;

            let status: 'FULLY_PAID' | 'PARTIAL' | 'CRITICAL_ARREARS' = 'FULLY_PAID';
            if (balance > 0 && clearancePercentage < 50) {
                status = 'CRITICAL_ARREARS';
            } else if (balance > 0) {
                status = 'PARTIAL';
            }

            return {
                id: studentId,
                name: s.name || 'Unnamed Student',
                admissionNumber: resolveRealStudentAdmNo(s, idx, students),
                className: s.className || s.grade || `Form ${1 + (idx % 4)}`,
                gender: s.gender || (idx % 2 === 0 ? 'Boys' : 'Girls'),
                houseName,
                roomNumber: s.roomNumber || `RM-${101 + (idx % 20)}`,
                bedNumber: s.bedNumber || `BED-0${1 + (idx % 4)}`,
                parentName: s.parentName || `Parent of ${s.name}`,
                parentPhone: s.phoneNumber || s.parentPhone || s.parentPhone2 || `+254 7${Math.floor(10000000 + Math.random() * 90000000)}`,
                totalInvoiced,
                totalPaid,
                balance,
                clearancePercentage,
                status
            };
        });
    }, [students, receipts]);

    // Aggregate statistics per Household / Boarding House
    const householdSummaries: HouseholdSummary[] = useMemo(() => {
        const map = new Map<string, HouseholdStudentBalance[]>();

        studentBalances.forEach(sb => {
            if (!map.has(sb.houseName)) {
                map.set(sb.houseName, []);
            }
            map.get(sb.houseName)!.push(sb);
        });

        // Ensure default houses are present
        DEFAULT_HOUSES.forEach(dh => {
            if (!map.has(dh.name)) {
                map.set(dh.name, []);
            }
        });

        const summaries: HouseholdSummary[] = [];

        map.forEach((list, houseName) => {
            const defaultRef = DEFAULT_HOUSES.find(h => h.name === houseName);
            const gender = (defaultRef?.gender || 'Mixed') as 'Boys' | 'Girls' | 'Mixed';
            const patronName = defaultRef?.patron || 'House Master / Matron';

            const totalStudents = list.length;
            const totalInvoiced = list.reduce((s, b) => s + b.totalInvoiced, 0);
            const totalPaid = list.reduce((s, b) => s + b.totalPaid, 0);
            const totalBalance = list.reduce((s, b) => s + b.balance, 0);
            const clearanceRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;

            let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
            if (clearanceRate < 50) riskLevel = 'HIGH';
            else if (clearanceRate < 75) riskLevel = 'MEDIUM';

            summaries.push({
                houseName,
                gender,
                patronName,
                totalStudents,
                totalInvoiced,
                totalPaid,
                totalBalance,
                clearanceRate,
                riskLevel
            });
        });

        return summaries.sort((a, b) => b.totalBalance - a.totalBalance);
    }, [studentBalances]);

    // Filtered student list for table view
    const filteredStudentBalances = useMemo(() => {
        return studentBalances.filter(sb => {
            const matchesHouse = selectedHouseFilter === 'all' || sb.houseName === selectedHouseFilter;
            const matchesStatus = statusFilter === 'all' || sb.status === statusFilter;
            const matchesSearch = !searchTerm.trim() ||
                sb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sb.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                sb.houseName.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesHouse && matchesStatus && matchesSearch;
        });
    }, [studentBalances, selectedHouseFilter, statusFilter, searchTerm]);

    // Overall Totals
    const overallStats = useMemo(() => {
        const totalBoarders = studentBalances.length;
        const totalInvoiced = studentBalances.reduce((s, b) => s + b.totalInvoiced, 0);
        const totalPaid = studentBalances.reduce((s, b) => s + b.totalPaid, 0);
        const totalBalance = studentBalances.reduce((s, b) => s + b.balance, 0);
        const clearancePercentage = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 100;
        return { totalBoarders, totalInvoiced, totalPaid, totalBalance, clearancePercentage };
    }, [studentBalances]);

    // Send Bulk Household SMS
    const handleSendHouseholdSms = async () => {
        const targetList = studentBalances.filter(sb =>
            (smsTargetHouse === 'all' || sb.houseName === smsTargetHouse) && sb.balance > 0
        );

        if (targetList.length === 0) {
            alert('No students with fee balance found for the selected household target.');
            return;
        }

        for (const sb of targetList) {
            const message = smsTemplate
                .replace('{SCHOOL_NAME}', currentInstitution.name)
                .replace('{STUDENT_NAME}', sb.name)
                .replace('{HOUSE_NAME}', sb.houseName)
                .replace('{BALANCE}', sb.balance.toLocaleString())
                .replace('{ADM_NO}', sb.admissionNumber);

            await apiService.saveModuleRecord('sms_broadcasts', {
                recipientPhone: sb.parentPhone,
                recipientName: sb.parentName,
                studentId: sb.id,
                houseName: sb.houseName,
                message,
                status: 'DELIVERED',
                sentAt: new Date().toISOString(),
                institutionId: currentInstitution.id
            });
        }

        if (onLogAction) {
            await onLogAction(`Sent Boarding Household SMS fee reminders to ${targetList.length} parents in ${smsTargetHouse}`);
        }

        setSmsSuccessMessage(`Successfully broadcasted fee reminder SMS to ${targetList.length} household parents!`);
        setTimeout(() => setSmsSuccessMessage(null), 5000);
        setIsSmsModalOpen(false);
    };

    // Print Official Household Statement Report
    const handlePrintHouseholdStatement = (targetHouseName: string) => {
        const houseSummary = householdSummaries.find(h => h.houseName === targetHouseName);
        const houseStudents = studentBalances.filter(s => s.houseName === targetHouseName);

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableRowsHtml = houseStudents.map((st, i) => `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                <td style="padding: 8px;">${i + 1}</td>
                <td style="padding: 8px; font-weight: bold;">${escapeHtml(st.name)}</td>
                <td style="padding: 8px;">${escapeHtml(st.admissionNumber)}</td>
                <td style="padding: 8px;">${escapeHtml(st.className)}</td>
                <td style="padding: 8px;">${escapeHtml(st.roomNumber)} / ${escapeHtml(st.bedNumber)}</td>
                <td style="padding: 8px; text-align: right;">KSh ${st.totalInvoiced.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right; color: #16a34a; font-weight: bold;">KSh ${st.totalPaid.toLocaleString()}</td>
                <td style="padding: 8px; text-align: right; color: ${st.balance > 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">
                    KSh ${st.balance.toLocaleString()}
                </td>
                <td style="padding: 8px; text-align: center;">
                    <span style="padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; background: ${st.balance === 0 ? '#dcfce7; color: #15803d;' : st.clearancePercentage < 50 ? '#fee2e2; color: #b91c1c;' : '#fef3c7; color: #b45309;'}">
                        ${st.status} (${st.clearancePercentage}%)
                    </span>
                </td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Boarding Household Financial Statement - ${escapeHtml(targetHouseName)}</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; margin: 20px; color: #0f172a; }
                    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #4f46e5; padding-bottom: 12px; }
                    .title { font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0; }
                    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; background: #f8fafc; padding: 12px; border-radius: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th { background: #1e1b4b; color: white; padding: 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
                    .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .sig-line { border-top: 1px solid #94a3b8; width: 180px; text-align: center; font-size: 10px; padding-top: 4px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="title">${escapeHtml(currentInstitution.name)}</h1>
                        <p style="margin: 2px 0; font-size: 12px; color: #475569;">Boarding Household Financial & Fee Clearance Statement</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 12px; font-weight: bold; background: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 6px;">HOUSE: ${escapeHtml(targetHouseName)}</span>
                        <p style="font-size: 10px; color: #64748b; margin-top: 4px;">Date: ${new Date().toLocaleDateString('en-KE')}</p>
                    </div>
                </div>

                <div class="summary-grid">
                    <div><small style="color: #64748b; font-size: 9px; font-weight: bold;">HOUSE MASTER / PATRON</small><br/><strong>${escapeHtml(houseSummary?.patronName || 'N/A')}</strong></div>
                    <div><small style="color: #64748b; font-size: 9px; font-weight: bold;">TOTAL BOARDERS</small><br/><strong>${houseSummary?.totalStudents || 0} Students</strong></div>
                    <div><small style="color: #64748b; font-size: 9px; font-weight: bold;">TOTAL COLLECTED</small><br/><strong style="color: #16a34a;">KSh ${(houseSummary?.totalPaid || 0).toLocaleString()}</strong></div>
                    <div><small style="color: #64748b; font-size: 9px; font-weight: bold;">OUTSTANDING ARREARS</small><br/><strong style="color: #dc2626;">KSh ${(houseSummary?.totalBalance || 0).toLocaleString()} (${houseSummary?.clearanceRate || 0}%)</strong></div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Student Name</th>
                            <th>Adm No</th>
                            <th>Class</th>
                            <th>Room / Bed</th>
                            <th style="text-align: right;">Invoiced</th>
                            <th style="text-align: right;">Paid</th>
                            <th style="text-align: right;">Balance</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                    </tbody>
                </table>

                <div class="footer">
                    <div>
                        <div class="sig-line">Housemaster / Matron Signature</div>
                    </div>
                    <div>
                        <div class="sig-line">Bursar / Accounts Officer</div>
                    </div>
                    <div style="border: 2px dashed #cbd5e1; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; color: #94a3b8;">
                        OFFICIAL STAMP
                    </div>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Export CSV of Household Balances
    const handleExportCsv = () => {
        const headers = ["Student Name", "Adm No", "House Name", "Class", "Room", "Bed", "Total Invoiced", "Total Paid", "Balance", "Clearance %", "Status", "Parent Name", "Parent Phone"];
        const rows = filteredStudentBalances.map(s => [
            `"${s.name}"`,
            `"${s.admissionNumber}"`,
            `"${s.houseName}"`,
            `"${s.className}"`,
            `"${s.roomNumber}"`,
            `"${s.bedNumber}"`,
            s.totalInvoiced,
            s.totalPaid,
            s.balance,
            `${s.clearancePercentage}%`,
            s.status,
            `"${s.parentName}"`,
            `"${s.parentPhone}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Boarding_Household_Balances_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-400 animate-pulse font-medium">
                Loading Boarding Household Financial Balance Analytics...
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 text-left">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 border border-indigo-800/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30 text-[10px] font-black uppercase tracking-widest mb-3">
                            <HomeIcon className="w-3.5 h-3.5" />
                            <span>Boarding School Household Finance</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                            Household Fee Balance Analytics
                        </h1>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                            Analyze, track, and generate fee clearance statements grouped by Boarding House / Household for {currentInstitution.name}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsSmsModalOpen(true)}
                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                        >
                            <PaperAirplaneIcon className="w-4 h-4" />
                            <span>Broadcast Household SMS</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportCsv}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 transition-all cursor-pointer"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Banner */}
            {smsSuccessMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-black text-xs flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 shrink-0" />
                    <span>{smsSuccessMessage}</span>
                </div>
            )}

            {/* Key Household Overall Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Enrolled Boarders</span>
                    <p className="text-2xl font-black text-white">{overallStats.totalBoarders}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Across {householdSummaries.length} Boarding Houses</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Invoiced Fees</span>
                    <p className="text-2xl font-black text-indigo-400">KSh {overallStats.totalInvoiced.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 font-medium">Tuition + Boarding Fee Allocation</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Collected</span>
                    <p className="text-2xl font-black text-emerald-400">KSh {overallStats.totalPaid.toLocaleString()}</p>
                    <p className="text-[10px] text-emerald-500/80 font-bold">{overallStats.clearancePercentage}% Overall Clearance</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outstanding Household Arrears</span>
                    <p className="text-2xl font-black text-rose-400">KSh {overallStats.totalBalance.toLocaleString()}</p>
                    <p className="text-[10px] text-rose-500/80 font-bold">Boarding Fee Risk</p>
                </div>
            </div>

            {/* Household Comparative Analysis Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black uppercase text-white tracking-tight">Boarding Household Financial Risk Analysis</h3>
                        <p className="text-xs text-slate-400">Ranked performance and fee clearance rates by Boarding House / Household</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {householdSummaries.map(house => (
                        <div key={house.houseName} className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4 hover:border-indigo-600/40 transition-all">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="inline-block px-2.5 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800/40 rounded-full text-[9px] font-black uppercase tracking-widest mb-1">
                                        {house.gender} House
                                    </span>
                                    <h4 className="text-base font-black text-white">{house.houseName}</h4>
                                    <p className="text-[10px] text-slate-400 font-medium">Patron: {house.patronName}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    house.riskLevel === 'LOW' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' :
                                    house.riskLevel === 'MEDIUM' ? 'bg-amber-950 text-amber-400 border border-amber-800/50' :
                                    'bg-rose-950 text-rose-400 border border-rose-800/50'
                                }`}>
                                    {house.riskLevel} Debt Risk
                                </span>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="text-slate-400">Fee Clearance Rate</span>
                                    <span className={house.clearanceRate >= 75 ? 'text-emerald-400' : house.clearanceRate >= 50 ? 'text-amber-400' : 'text-rose-400'}>
                                        {house.clearanceRate}%
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            house.clearanceRate >= 75 ? 'bg-emerald-500' : house.clearanceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${house.clearanceRate}%` }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/60">
                                <div>
                                    <span className="text-[9px] text-slate-500 uppercase font-black">Boarders</span>
                                    <p className="font-bold text-white">{house.totalStudents} Students</p>
                                </div>
                                <div>
                                    <span className="text-[9px] text-slate-500 uppercase font-black">Arrears Balance</span>
                                    <p className="font-bold text-rose-400">KSh {house.totalBalance.toLocaleString()}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handlePrintHouseholdStatement(house.houseName)}
                                className="w-full py-2 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/50 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                            >
                                <PrinterIcon className="w-3.5 h-3.5" />
                                <span>Print Official Statement</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Student Household Ledger Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-black uppercase text-white tracking-tight">Household Student Ledger Breakdown</h3>
                        <p className="text-xs text-slate-400">Detailed fee balances per student filtered by Boarding House / Household</p>
                    </div>

                    {/* Filter controls */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by student or adm no..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <select
                            value={selectedHouseFilter}
                            onChange={(e) => setSelectedHouseFilter(e.target.value)}
                            className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">All Boarding Houses</option>
                            {householdSummaries.map(h => (
                                <option key={h.houseName} value={h.houseName}>{h.houseName}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="py-2 px-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                        >
                            <option value="all">All Payment Statuses</option>
                            <option value="FULLY_PAID">Fully Paid</option>
                            <option value="PARTIAL">Partial Payment</option>
                            <option value="CRITICAL_ARREARS">Critical Arrears (&lt;50%)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-800">
                                <th className="p-4">Student Details</th>
                                <th className="p-4">Boarding House</th>
                                <th className="p-4">Room & Bed</th>
                                <th className="p-4 text-right">Invoiced</th>
                                <th className="p-4 text-right">Paid</th>
                                <th className="p-4 text-right">Balance</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Parent Contact</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-xs">
                            {filteredStudentBalances.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                                        No student fee records found for the selected household filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudentBalances.map(sb => (
                                    <tr key={sb.id} className="hover:bg-slate-800/40 transition-all">
                                        <td className="p-4">
                                            <p className="font-black text-white">{sb.name}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{sb.admissionNumber} · {sb.className}</p>
                                        </td>
                                        <td className="p-4 font-bold text-indigo-300">
                                            {sb.houseName}
                                        </td>
                                        <td className="p-4 text-slate-400 font-mono text-[11px]">
                                            {sb.roomNumber} / {sb.bedNumber}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-slate-300">
                                            KSh {sb.totalInvoiced.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-emerald-400">
                                            KSh {sb.totalPaid.toLocaleString()}
                                        </td>
                                        <td className={`p-4 text-right font-mono font-black ${sb.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            KSh {sb.balance.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                sb.status === 'FULLY_PAID' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                                                sb.status === 'PARTIAL' ? 'bg-amber-950 text-amber-400 border border-amber-800/40' :
                                                'bg-rose-950 text-rose-400 border border-rose-800/40'
                                            }`}>
                                                {sb.status.replace('_', ' ')} ({sb.clearancePercentage}%)
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <p className="font-medium text-slate-300">{sb.parentName}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{sb.parentPhone}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Target Household SMS Modal */}
            {isSmsModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 md:p-8 space-y-6 text-left shadow-2xl">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-3 py-1 bg-indigo-950 text-indigo-400 border border-indigo-800/40 rounded-full text-[9px] font-black uppercase tracking-widest mb-2">
                                    Targeted SMS Engine
                                </span>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                                    Broadcast Household Fee Reminders
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Send automated fee balance SMS reminders to parents in a specific Boarding House
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSmsModalOpen(false)}
                                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                                    Select Target Household / Boarding House
                                </label>
                                <select
                                    value={smsTargetHouse}
                                    onChange={(e) => setSmsTargetHouse(e.target.value)}
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="all">All Boarding Houses (All Arrears Parents)</option>
                                    {householdSummaries.map(h => (
                                        <option key={h.houseName} value={h.houseName}>
                                            {h.houseName} ({h.totalStudents} Boarders · KSh {h.totalBalance.toLocaleString()} Debt)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">
                                    SMS Message Template
                                </label>
                                <textarea
                                    rows={4}
                                    value={smsTemplate}
                                    onChange={(e) => setSmsTemplate(e.target.value)}
                                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                />
                                <span className="text-[10px] text-slate-500">
                                    Available Tags: {'{SCHOOL_NAME}'}, {'{STUDENT_NAME}'}, {'{HOUSE_NAME}'}, {'{BALANCE}'}, {'{ADM_NO}'}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                            <button
                                type="button"
                                onClick={() => setIsSmsModalOpen(false)}
                                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendHouseholdSms}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                                <span>Send Broadcast SMS</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BoardingHouseholdBalanceManager;
