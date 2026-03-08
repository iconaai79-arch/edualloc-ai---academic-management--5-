import React, { useState, useEffect, useMemo } from 'react';
import { User, Institution } from '../types';
import {
    BarChart3Icon, DownloadIcon, CalendarDaysIcon, FilterIcon,
    FileTextIcon, UsersIcon, HomeIcon,
    ChartPieIcon, TrendingUpIcon, ShieldIcon, AlertTriangleIcon,
    DownloadIcon as ArrowDownTrayIcon, PaperAirplaneIcon as ShareIcon, PrinterIcon, ChevronRightIcon
} from './icons';
import { apiService } from '../services/apiService';
import { generateBoardingReportPdf } from '../services/pdfService';
import { exportBoardingToExcel, exportBoardingSummaryToExcel } from '../utils/boardingExportUtils';

interface BoardingReportsProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction: (action: string) => Promise<void>;
}

type ReportType = 'occupancy' | 'allocations' | 'checkins' | 'checkouts' | 'maintenance' | 'summary';

const BoardingReports: React.FC<BoardingReportsProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [selectedReport, setSelectedReport] = useState<ReportType>('summary');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [companySettings, setCompanySettings] = useState<any>(null);

    useEffect(() => {
        loadReportData();
        loadCompanySettings();
    }, [selectedReport, dateRange]);

    const loadCompanySettings = async () => {
        const settings = await apiService.fetchCompanySettings();
        setCompanySettings(settings);
    };

    const loadReportData = async () => {
        setLoading(true);
        try {
            await onLogAction(`Intelligence: Generated ${selectedReport} report`);

            if (selectedReport === 'summary') {
                const [houses, allocations, maintenance, checkins, checkouts] = await Promise.all([
                    apiService.fetchModuleRecords<any>('boarding_houses', currentInstitution.id),
                    apiService.fetchBedAllocations(currentInstitution.id),
                    apiService.fetchMaintenanceLogs(currentInstitution.id),
                    apiService.fetchBoardingCheckIns(currentInstitution.id),
                    apiService.fetchBoardingCheckOuts(currentInstitution.id)
                ]);

                // Calculate summary stats
                const totalHouses = houses?.length || 0;
                let totalRooms = 0;
                let totalBeds = 0;
                let occupiedBeds = 0;

                houses?.forEach((h: any) => {
                    totalRooms += h.totalRooms || 0;
                    totalBeds += h.capacity || 0;
                    occupiedBeds += h.occupiedBeds || 0;
                });

                const summary = {
                    totalHouses,
                    totalRooms,
                    totalBeds,
                    occupiedBeds,
                    availableBeds: totalBeds - occupiedBeds,
                    occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
                    activeAllocations: allocations?.filter((a: any) => a.status === 'Active').length || 0,
                    checkInsThisPeriod: checkins?.length || 0,
                    checkOutsThisPeriod: checkouts?.length || 0,
                    maintenanceIssues: maintenance?.filter((m: any) => m.status !== 'Resolved').length || 0,
                    healthScore: 95 // Hardcoded logic or calculated based on maintenance
                };

                setReportData({ summary, raw: { houses, allocations, maintenance, checkins, checkouts } });
            } else {
                let data: any[] = [];
                switch (selectedReport) {
                    case 'occupancy':
                        data = await apiService.fetchModuleRecords<any>('boarding_houses', currentInstitution.id);
                        break;
                    case 'allocations':
                        data = await apiService.fetchBedAllocations(currentInstitution.id);
                        break;
                    case 'checkins':
                        data = await apiService.fetchBoardingCheckIns(currentInstitution.id);
                        break;
                    case 'checkouts':
                        data = await apiService.fetchBoardingCheckOuts(currentInstitution.id);
                        break;
                    case 'maintenance':
                        data = await apiService.fetchMaintenanceLogs(currentInstitution.id);
                        break;
                }

                // Filter by date if applicable
                const filteredData = data.filter((item: any) => {
                    const dateStr = item.checkInDate || item.checkOutDate || item.reportedDate || item.allocationDate || item.created_at;
                    if (!dateStr) return true;
                    const itemDate = new Date(dateStr);
                    return itemDate >= new Date(dateRange.startDate) && itemDate <= new Date(dateRange.endDate);
                });

                setReportData({ list: filteredData });
            }
        } catch (error) {
            console.error('Data Synthesis Failure:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'PDF' | 'EXCEL') => {
        if (!reportData) return;

        const fileName = `Boarding_${selectedReport}_Report`;
        const title = `${selectedReport.toUpperCase()} INTELLIGENCE REPORT`;

        try {
            if (format === 'PDF') {
                const dataToExport = selectedReport === 'summary' ? reportData.raw.houses : reportData.list;
                const pdfUrl = await generateBoardingReportPdf(
                    dataToExport,
                    title,
                    selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1),
                    companySettings?.letterheadConfig,
                    companySettings?.footerImageUrl,
                    currentInstitution
                );
                window.open(pdfUrl, '_blank');
            } else {
                if (selectedReport === 'summary') {
                    exportBoardingSummaryToExcel({
                        houses: reportData.raw.houses,
                        rooms: [], // Add if needed
                        beds: [], // Add if needed
                        allocations: reportData.raw.allocations
                    });
                } else {
                    exportBoardingToExcel(reportData.list, fileName, selectedReport);
                }
            }
            await onLogAction(`Export: Synchronized ${selectedReport} to ${format}`);
        } catch (error) {
            alert('Export Failure: Unable to generate binary stream.');
        }
    };

    const renderSummaryReport = () => (
        <div className="space-y-10 animate-fade-in">
            {/* High-Level Pulse */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 group hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center">
                            <HomeIcon className="w-7 h-7 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Active</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Infrastructure</p>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{reportData?.summary.totalHouses} Houses</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{reportData?.summary.totalRooms} Validated Units</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 group hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center">
                            <TrendingUpIcon className="w-7 h-7 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">Optimal</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Occupancy Flux</p>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{reportData?.summary.occupancyRate}%</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">{reportData?.summary.occupiedBeds} Units Engaged</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 group hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
                            <ShieldIcon className="w-7 h-7 text-amber-600" />
                        </div>
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-widest">Secure</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Security Health</p>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{reportData?.summary.healthScore}pts</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Protocol Alignment</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700 group hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center">
                            <AlertTriangleIcon className="w-7 h-7 text-rose-600" />
                        </div>
                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-widest">Alert</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Facility Issues</p>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{reportData?.summary.maintenanceIssues} Tickets</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Awaiting Intervention</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h5 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Logistics Activity</h5>
                            <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black mt-1">Cross-Sector Operational Flux</p>
                        </div>
                        <TrendingUpIcon className="w-8 h-8 text-slate-200" />
                    </div>

                    <div className="space-y-6">
                        {[
                            { label: 'Check-In Frequency', value: reportData?.summary.checkInsThisPeriod, color: 'bg-emerald-500', max: 200 },
                            { label: 'Check-Out Velocity', value: reportData?.summary.checkOutsThisPeriod, color: 'bg-indigo-500', max: 50 },
                            { label: 'Active Allocations', value: reportData?.summary.activeAllocations, color: 'bg-amber-500', max: 500 }
                        ].map(item => (
                            <div key={item.label} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{item.value} Units</span>
                                </div>
                                <div className="h-3 bg-slate-50 dark:bg-slate-900 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${item.color} rounded-full transition-all duration-1000 ease-out shadow-lg`}
                                        style={{ width: `${(item.value / item.max) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-indigo-600 p-10 rounded-[3rem] text-white flex flex-col justify-between shadow-2xl shadow-indigo-200 dark:shadow-none overflow-hidden relative group">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-all"></div>
                    <div>
                        <ChartPieIcon className="w-12 h-12 mb-8 opacity-40" />
                        <h5 className="text-3xl font-black uppercase tracking-tight leading-tight">Sector Occupancy Density</h5>
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mt-4">Optimized capacity distribution across institutional clusters.</p>
                    </div>
                    <div className="pt-10">
                        <div className="flex items-end gap-3 mb-2">
                            <span className="text-5xl font-black">{reportData?.summary.availableBeds}</span>
                            <span className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Available Vectors</span>
                        </div>
                        <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all backdrop-blur-md">View Vacancy Map</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDataTable = (type: string, data: any[]) => {
        if (!data || data.length === 0) {
            return (
                <div className="bg-white dark:bg-slate-800 p-20 rounded-[4rem] text-center border-2 border-dashed border-slate-100 dark:border-slate-800 animate-fade-in">
                    <BarChart3Icon className="w-24 h-24 text-slate-100 dark:text-slate-900 mx-auto mb-10" />
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">No Data Detected</h4>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em] max-w-md mx-auto leading-relaxed">
                        No {type.toLowerCase()} records found for the selected time phase.
                    </p>
                </div>
            );
        }

        return (
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] overflow-hidden shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                                {Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object' && !['id', 'institutionId', 'created_at', 'updated_at'].includes(k)).map(key => (
                                    <th key={key} className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {data.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all">
                                    {Object.keys(row).filter(k => typeof row[k] !== 'object' && !['id', 'institutionId', 'created_at', 'updated_at'].includes(k)).map(key => (
                                        <td key={key} className="px-8 py-6 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">{String(row[key])}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-fade-in">
            {/* Intelligence Command Header */}
            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-50 dark:border-slate-700">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 bg-slate-900 dark:bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                            <BarChart3Icon className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Intelligence Hub</h3>
                            <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black mt-2">Strategic Boarding Analytics & Data Exports</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[2.5rem]">
                        <div className="flex items-center gap-4 px-6 border-r border-slate-200 dark:border-slate-700">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Start Phase</span>
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })}
                                    className="bg-transparent text-xs font-black text-slate-900 dark:text-white border-none p-0 outline-none uppercase"
                                />
                            </div>
                            < ChevronRightIcon className="w-4 h-4 text-slate-300" />
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">End Phase</span>
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })}
                                    className="bg-transparent text-xs font-black text-slate-900 dark:text-white border-none p-0 outline-none uppercase"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 p-2">
                            <button onClick={() => handleExport('PDF')} className="p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleExport('EXCEL')} className="p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                                <ShareIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => window.print()} className="p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                <PrinterIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pivot Controls */}
            <div className="flex overflow-x-auto pb-4 gap-4 no-scrollbar">
                {[
                    { id: 'summary', label: 'Summary Pulse', icon: TrendingUpIcon },
                    { id: 'occupancy', label: 'Occupancy Grid', icon: ChartPieIcon },
                    { id: 'allocations', label: 'Allocation Logs', icon: UsersIcon },
                    { id: 'checkins', label: 'Arrival Stream', icon: FileTextIcon },
                    { id: 'checkouts', label: 'Departure Stream', icon: FileTextIcon },
                    { id: 'maintenance', label: 'Facility Audit', icon: ShieldIcon }
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setSelectedReport(item.id as ReportType)}
                        className={`flex items-center gap-4 px-8 py-5 rounded-[2rem] whitespace-nowrap transition-all border ${selectedReport === item.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xl shadow-slate-200 dark:shadow-none'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-50 dark:border-slate-700 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                    >
                        <item.icon className={`w-5 h-5 ${selectedReport === item.id ? 'text-indigo-400' : ''}`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                    </button>
                ))}
            </div>

            {/* Interactive Data Stream */}
            <div className="min-h-[500px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 space-y-6">
                        <div className="w-20 h-20 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Sourcing Institutional Fragments...</p>
                    </div>
                ) : (
                    <>
                        {selectedReport === 'summary' && reportData?.summary && renderSummaryReport()}
                        {selectedReport !== 'summary' && renderDataTable(selectedReport, reportData?.list || [])}
                    </>
                )}
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default BoardingReports;
