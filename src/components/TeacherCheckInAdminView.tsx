import React, { useState, useEffect, useMemo } from 'react';
import { User, Institution, TeacherCheckInWithDetails, LetterheadConfig } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { SearchIcon } from './icons/SearchIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { UsersIcon } from './icons/UsersIcon';
import { apiService } from '../services/apiService';
import * as XLSX from 'xlsx';
import { downloadTeacherAttendanceReportPdf } from '../services/pdfService';

interface TeacherCheckInAdminViewProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogAction?: (action: string) => Promise<void>;
    letterheadConfig?: LetterheadConfig;
    footerImageUrl?: string | null;
}

const TeacherCheckInAdminView: React.FC<TeacherCheckInAdminViewProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    letterheadConfig,
    footerImageUrl
}) => {
    // Tabs state: 'monitor' or 'reports'
    const [activeSubTab, setActiveSubTab] = useState<'monitor' | 'reports'>('monitor');

    // Monitor State (Today's check-ins)
    const [checkIns, setCheckIns] = useState<TeacherCheckInWithDetails[]>([]);
    const [loadingMonitor, setLoadingMonitor] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Reports & Analytics State
    const [history, setHistory] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTeacherId, setSelectedTeacherId] = useState('all');
    const [reportSearchTerm, setReportSearchTerm] = useState('');

    // Load list of teachers for report filter
    useEffect(() => {
        const loadTeachers = async () => {
            try {
                if (apiService.fetchModuleRecords) {
                    const data = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                        filter: { 
                            institution_id: currentInstitution.id,
                            role: 'teacher'
                        },
                        order: 'name'
                    });
                    setTeachers(data || []);
                }
            } catch (error) {
                console.error('Error loading teachers list:', error);
            }
        };
        loadTeachers();
    }, [currentInstitution.id]);

    // Load Monitor check-ins when tab/date changes
    useEffect(() => {
        if (activeSubTab === 'monitor') {
            loadCheckIns();
        }
    }, [currentInstitution.id, selectedDate, activeSubTab]);

    // Load Historical Reports when inputs change
    useEffect(() => {
        if (activeSubTab === 'reports') {
            loadHistory();
        }
    }, [currentInstitution.id, startDate, endDate, selectedTeacherId, activeSubTab]);

    const loadCheckIns = async () => {
        setLoadingMonitor(true);
        try {
            const data = await apiService.fetchModuleRecords<TeacherCheckInWithDetails>('v_today_teacher_checkins', undefined, undefined, {
                filter: { 
                    institution_id: currentInstitution.id,
                    check_in_date: selectedDate
                },
                order: 'teacher_name'
            });

            setCheckIns(data || []);
            if (onLogAction) {
                await onLogAction(`Viewed today's teacher check-ins for date ${selectedDate}`);
            }
        } catch (error) {
            console.error('Error loading check-ins:', error);
        } finally {
            setLoadingMonitor(false);
        }
    };

    const loadHistory = async () => {
        setLoadingReports(true);
        try {
            const data = await apiService.fetchTeacherCheckInsRange(
                currentInstitution.id,
                startDate,
                endDate,
                selectedTeacherId
            );
            setHistory(data || []);
            if (onLogAction) {
                await onLogAction(`Generated teacher attendance report from ${startDate} to ${endDate}`);
            }
        } catch (error) {
            console.error('Error loading check-in history:', error);
        } finally {
            setLoadingReports(false);
        }
    };

    // Filters logic
    const filteredCheckIns = useMemo(() => {
        return checkIns.filter(checkIn =>
            checkIn.teacherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            checkIn.teacherEmail?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [checkIns, searchTerm]);

    const filteredHistory = useMemo(() => {
        return history.filter(h =>
            h.teacherName?.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
            h.teacherEmail?.toLowerCase().includes(reportSearchTerm.toLowerCase())
        );
    }, [history, reportSearchTerm]);

    // Compute Today's Stats
    const statsToday = useMemo(() => {
        return {
            total: checkIns.length,
            morningComplete: checkIns.filter(c => c.morningCheckInTime).length,
            afternoonComplete: checkIns.filter(c => c.afternoonCheckInTime).length,
            morningOnTime: checkIns.filter(c => c.morningCheckInStatus === 'On Time').length,
            afternoonOnTime: checkIns.filter(c => c.afternoonCheckInStatus === 'On Time').length,
            morningLate: checkIns.filter(c => c.morningCheckInStatus === 'Late').length,
            afternoonLate: checkIns.filter(c => c.afternoonCheckInStatus === 'Late').length,
            morningAbsent: checkIns.filter(c => c.morningCheckInStatus === 'Absent').length,
            afternoonAbsent: checkIns.filter(c => c.afternoonCheckInStatus === 'Absent').length
        };
    }, [checkIns]);

    // Compute Historical Analytics Stats
    const statsHistory = useMemo(() => {
        const totalRecords = history.length;
        if (totalRecords === 0) {
            return {
                total: 0,
                onTimeTotal: 0,
                lateTotal: 0,
                absentTotal: 0,
                morningOnTime: 0,
                afternoonOnTime: 0,
                morningLate: 0,
                afternoonLate: 0,
                morningAbsent: 0,
                afternoonAbsent: 0,
                punctualityScore: 100
            };
        }

        let onTime = 0;
        let late = 0;
        let absent = 0;

        let morningOnTime = 0;
        let afternoonOnTime = 0;
        let morningLate = 0;
        let afternoonLate = 0;
        let morningAbsent = 0;
        let afternoonAbsent = 0;

        history.forEach(item => {
            // Morning count
            if (item.morningCheckInStatus === 'On Time') {
                onTime++;
                morningOnTime++;
            } else if (item.morningCheckInStatus === 'Late') {
                late++;
                morningLate++;
            } else if (item.morningCheckInStatus === 'Absent' || item.morningOverdue) {
                absent++;
                morningAbsent++;
            }

            // Afternoon count
            if (item.afternoonCheckInStatus === 'On Time') {
                onTime++;
                afternoonOnTime++;
            } else if (item.afternoonCheckInStatus === 'Late') {
                late++;
                afternoonLate++;
            } else if (item.afternoonCheckInStatus === 'Absent' || item.afternoonOverdue) {
                absent++;
                afternoonAbsent++;
            }
        });

        const totalCheckins = onTime + late;
        const punctualityScore = totalCheckins > 0 ? Math.round((onTime / totalCheckins) * 100) : 100;

        return {
            total: totalRecords,
            onTimeTotal: onTime,
            lateTotal: late,
            absentTotal: absent,
            morningOnTime,
            afternoonOnTime,
            morningLate,
            afternoonLate,
            morningAbsent,
            afternoonAbsent,
            punctualityScore
        };
    }, [history]);

    // Group punctuality trend for SVG Chart
    const chartTrendData = useMemo(() => {
        if (history.length === 0) return [];
        
        // Group by check_in_date
        const datesMap: { [date: string]: { onTime: number; total: number } } = {};
        history.forEach(item => {
            const date = item.checkInDate;
            if (!datesMap[date]) {
                datesMap[date] = { onTime: 0, total: 0 };
            }

            if (item.morningCheckInStatus === 'On Time') {
                datesMap[date].onTime++;
            }
            if (item.morningCheckInStatus && item.morningCheckInStatus !== 'Pending') {
                datesMap[date].total++;
            }

            if (item.afternoonCheckInStatus === 'On Time') {
                datesMap[date].onTime++;
            }
            if (item.afternoonCheckInStatus && item.afternoonCheckInStatus !== 'Pending') {
                datesMap[date].total++;
            }
        });

        // Convert to array and sort ascending chronologically
        const list = Object.keys(datesMap).map(date => {
            const val = datesMap[date];
            const rate = val.total > 0 ? Math.round((val.onTime / val.total) * 100) : 100;
            return {
                date,
                rate
            };
        });

        return list.sort((a, b) => a.date.localeCompare(b.date));
    }, [history]);

    // Excel Export implementation
    const exportToExcel = () => {
        if (history.length === 0) {
            alert('No records available to export.');
            return;
        }

        const formatted = history.map(item => ({
            Date: item.checkInDate,
            Teacher: item.teacherName || 'Unknown',
            Email: item.teacherEmail || '',
            'Morning Check-In Time': item.morningCheckInTime || 'N/A',
            'Morning Status': item.morningCheckInStatus || 'Pending',
            'Morning Location': item.morningLocation || '',
            'Morning Notes': item.morningNotes || '',
            'Afternoon Check-In Time': item.afternoonCheckInTime || 'N/A',
            'Afternoon Status': item.afternoonCheckInStatus || 'Pending',
            'Afternoon Location': item.afternoonLocation || '',
            'Afternoon Notes': item.afternoonNotes || ''
        }));

        const ws = XLSX.utils.json_to_sheet(formatted);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
        XLSX.writeFile(wb, `Teacher_Attendance_Report_${startDate}_to_${endDate}.xlsx`);
    };

    // PDF Export implementation
    const exportToPdf = async () => {
        if (history.length === 0) {
            alert('No records available to export.');
            return;
        }
        try {
            await downloadTeacherAttendanceReportPdf(
                history,
                `${startDate} to ${endDate}`,
                letterheadConfig,
                footerImageUrl || null
            );
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Make sure jsPDF is loaded.');
        }
    };

    // Helper to render GPS Location Map icon / Link
    const renderLocationCell = (locationText?: string) => {
        if (!locationText) return <span className="text-gray-400">N/A</span>;
        
        // Check if GPS coordinates are embedded e.g. "Location (GPS: -1.286389, 36.817223)"
        const gpsMatch = locationText.match(/\(GPS:\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\)/);
        if (gpsMatch) {
            const lat = gpsMatch[1];
            const lon = gpsMatch[2];
            const cleanLoc = locationText.replace(/\(GPS:.*\)/, '').trim();
            const mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            
            return (
                <div className="flex items-center gap-1.5">
                    <span className="text-xs truncate max-w-[120px]" title={locationText}>
                        {cleanLoc || `GPS: ${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`}
                    </span>
                    <a 
                        href={mapLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        title="Click to view coordinates on Google Maps"
                        className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </a>
                </div>
            );
        }

        return <span className="text-xs truncate max-w-[150px]" title={locationText}>{locationText}</span>;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'On Time': return 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-900';
            case 'Late': return 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-900';
            case 'Absent': return 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900';
            default: return 'bg-gray-100 dark:bg-slate-700/50 text-gray-800 dark:text-gray-400';
        }
    };

    // Calculate SVG paths for punctuality trend chart
    const svgChartContent = useMemo(() => {
        if (chartTrendData.length < 2) return null;
        
        const width = 600;
        const height = 150;
        const padding = 20;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        const points = chartTrendData.map((d, index) => {
            const x = padding + (index / (chartTrendData.length - 1)) * chartWidth;
            const y = padding + chartHeight - (d.rate / 100) * chartHeight;
            return { x, y, val: d };
        });

        // Area path: connects down to the bottom
        let areaPath = `M ${points[0].x} ${padding + chartHeight} `;
        points.forEach(p => {
            areaPath += `L ${p.x} ${p.y} `;
        });
        areaPath += `L ${points[points.length - 1].x} ${padding + chartHeight} Z`;

        // Line path
        let linePath = `M ${points[0].x} ${points[0].y} `;
        for (let i = 1; i < points.length; i++) {
            linePath += `L ${points[i].x} ${points[i].y} `;
        }

        return { points, linePath, areaPath, width, height, padding, chartWidth, chartHeight };
    }, [chartTrendData]);

    return (
        <div className="space-y-8 font-sans text-slate-800 dark:text-slate-100">
            {/* Header & Sub-Tabs Switch */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Teacher Check-In Registry</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Admin oversight portal for teacher self-checkin, geofencing rules, and reports.</p>
                </div>
                
                {/* Dual Sub-Tabs selectors */}
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setActiveSubTab('monitor')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeSubTab === 'monitor'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        Real-Time Monitor
                    </button>
                    <button
                        onClick={() => setActiveSubTab('reports')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeSubTab === 'reports'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                    >
                        Reports & Analysis
                    </button>
                </div>
            </div>

            {/* TAB 1: Real-Time Monitor */}
            {activeSubTab === 'monitor' && (
                <div className="space-y-6">
                    {/* Stats panel */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logged Teachers</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{statsToday.total}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block font-medium">Recorded on duty today</span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Morning Shifts</p>
                            <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                                {statsToday.morningComplete}/{statsToday.total}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                                {statsToday.morningOnTime} On-Time, {statsToday.morningLate} Late
                            </span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Afternoon Shifts</p>
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                                {statsToday.afternoonComplete}/{statsToday.total}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                                {statsToday.afternoonOnTime} On-Time, {statsToday.afternoonLate} Late
                            </span>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Absences / Overdues</p>
                            <p className="text-3xl font-black text-rose-600 mt-2">
                                {Math.max(statsToday.morningAbsent, statsToday.afternoonAbsent)}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block font-medium">Missed check-in limits</span>
                        </div>
                    </div>

                    {/* Today's search and date pickers */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search active teachers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="relative">
                            <CalendarDaysIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Table of today's check-ins */}
                    {loadingMonitor ? (
                        <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-3xl border border-slate-150 dark:border-slate-700 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="ml-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Synchronizing registry...</span>
                        </div>
                    ) : filteredCheckIns.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 p-16 text-center rounded-3xl border border-slate-150 dark:border-slate-700">
                            <UsersIcon className="w-12 h-12 text-slate-355 mx-auto mb-4" />
                            <h3 className="text-md font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">No Check-Ins Found</h3>
                            <p className="text-xs text-slate-400">No teacher activity has been recorded for {selectedDate}</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden animate-fade-in-up">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-450">Teacher Details</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-450">Morning Check-In</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-450">Afternoon Check-In</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-450">Day Summary</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                        {filteredCheckIns.map((checkIn) => (
                                            <tr key={checkIn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="font-bold text-slate-900 dark:text-white">{checkIn.teacherName}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">{checkIn.teacherEmail}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {checkIn.morningCheckInTime ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="font-bold">{checkIn.morningCheckInTime}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${getStatusColor(checkIn.morningCheckInStatus)}`}>
                                                                    {checkIn.morningCheckInStatus}
                                                                </span>
                                                                {renderLocationCell(checkIn.morningLocation)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <XCircleIcon className="w-3.5 h-3.5" />
                                                            <span className="font-semibold">{checkIn.morningOverdue ? 'Overdue (Absent)' : 'Pending'}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {checkIn.afternoonCheckInTime ? (
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="font-bold">{checkIn.afternoonCheckInTime}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${getStatusColor(checkIn.afternoonCheckInStatus)}`}>
                                                                    {checkIn.afternoonCheckInStatus}
                                                                </span>
                                                                {renderLocationCell(checkIn.afternoonLocation)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <XCircleIcon className="w-3.5 h-3.5" />
                                                            <span className="font-semibold">{checkIn.afternoonOverdue ? 'Overdue (Absent)' : 'Pending'}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {checkIn.morningCheckInTime && checkIn.afternoonCheckInTime ? (
                                                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-black uppercase tracking-wider text-[10px]">
                                                            <CheckCircleIcon className="w-4 h-4 shrink-0" />
                                                            <span>Shift Complete</span>
                                                        </div>
                                                    ) : checkIn.morningOverdue || checkIn.afternoonOverdue ? (
                                                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-black uppercase tracking-wider text-[10px]">
                                                            <XCircleIcon className="w-4 h-4 shrink-0" />
                                                            <span>Attendance Gap</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-amber-500 font-black uppercase tracking-wider text-[10px]">
                                                            <ClockIcon className="w-4 h-4 shrink-0" />
                                                            <span>In Progress</span>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Historical Reports & Analysis */}
            {activeSubTab === 'reports' && (
                <div className="space-y-6">
                    {/* Filters, Teachers list and Actions */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Teacher Filter</label>
                                <select
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Teachers</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end justify-between gap-2 pt-2 lg:pt-0">
                                <button
                                    onClick={exportToExcel}
                                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 text-center shrink-0"
                                >
                                    Excel Export
                                </button>
                                <button
                                    onClick={exportToPdf}
                                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 text-center shrink-0"
                                >
                                    PDF Report
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search report output..."
                                value={reportSearchTerm}
                                onChange={(e) => setReportSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Historical Analysis Dashboard */}
                    {loadingReports ? (
                        <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-3xl border border-slate-150 dark:border-slate-700 flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="ml-3 text-xs text-slate-500 font-bold uppercase tracking-widest">Aggregating historical metrics...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 p-16 text-center rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm">
                            <UsersIcon className="w-12 h-12 text-slate-350 mx-auto mb-4" />
                            <h3 className="text-md font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">No Range Records Found</h3>
                            <p className="text-xs text-slate-400">Try adjusting your date range or teacher filters</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Analysis Metrics Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Punctuality Score</p>
                                    <div className="flex items-baseline gap-2 mt-2">
                                        <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{statsHistory.punctualityScore}%</p>
                                        <span className="text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-455 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Index</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-wider">Total On-Time Check-Ins / Total Logs</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Days Evaluated</p>
                                    <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{statsHistory.total}</p>
                                    <span className="text-[10px] text-slate-400 mt-1 block font-medium">Distinct teacher logs compiled</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                    <p className="text-[10px] font-black text-slate-405 uppercase tracking-widest font-black text-orange-600">Total Late Shifts</p>
                                    <p className="text-3xl font-black text-orange-600 mt-2">{statsHistory.lateTotal}</p>
                                    <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                                        Morn: {statsHistory.morningLate} | Aft: {statsHistory.afternoonLate}
                                    </span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                                    <p className="text-[10px] font-black text-slate-405 uppercase tracking-widest font-black text-rose-600">Total Missed Shifts</p>
                                    <p className="text-3xl font-black text-rose-600 mt-2">{statsHistory.absentTotal}</p>
                                    <span className="text-[10px] text-slate-400 mt-1 block font-medium">
                                        Morn: {statsHistory.morningAbsent} | Aft: {statsHistory.afternoonAbsent}
                                    </span>
                                </div>
                            </div>

                            {/* Punctuality Trend Chart (SVG Line Chart) */}
                            {svgChartContent && (
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm space-y-4">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Punctuality Trend Analysis</h3>
                                        <p className="text-slate-400 text-[10px] font-medium">Daily average on-time performance rate (%) over the selected period</p>
                                    </div>
                                    <div className="relative">
                                        <svg viewBox={`0 0 ${svgChartContent.width} ${svgChartContent.height}`} className="w-full overflow-visible">
                                            <defs>
                                                <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15" />
                                                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                                                </linearGradient>
                                            </defs>
                                            
                                            {/* Horizontal lines */}
                                            <line x1={svgChartContent.padding} y1={svgChartContent.padding} x2={svgChartContent.width - svgChartContent.padding} y2={svgChartContent.padding} stroke="#f1f5f9" className="dark:stroke-slate-750" strokeWidth="1" />
                                            <line x1={svgChartContent.padding} y1={svgChartContent.padding + svgChartContent.chartHeight * 0.5} x2={svgChartContent.width - svgChartContent.padding} y2={svgChartContent.padding + svgChartContent.chartHeight * 0.5} stroke="#f1f5f9" className="dark:stroke-slate-750" strokeWidth="1" />
                                            <line x1={svgChartContent.padding} y1={svgChartContent.padding + svgChartContent.chartHeight} x2={svgChartContent.width - svgChartContent.padding} y2={svgChartContent.padding + svgChartContent.chartHeight} stroke="#e2e8f0" className="dark:stroke-slate-700" strokeWidth="1.5" />

                                            {/* Area Gradient */}
                                            <path d={svgChartContent.areaPath} fill="url(#gradient-area)" />

                                            {/* Trend line */}
                                            <path d={svgChartContent.linePath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                                            {/* Circles for points */}
                                            {svgChartContent.points.map((p, idx) => (
                                                <g key={idx} className="group cursor-pointer">
                                                    <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" />
                                                    <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
                                                    <title>{`${p.val.date}: ${p.val.rate}% Punctuality`}</title>
                                                </g>
                                            ))}

                                            {/* Labels for start/end dates */}
                                            <text x={svgChartContent.padding} y={svgChartContent.height - 2} fill="#94a3b8" fontSize="8" fontWeight="bold">{chartTrendData[0].date}</text>
                                            <text x={svgChartContent.width - svgChartContent.padding} y={svgChartContent.height - 2} textAnchor="end" fill="#94a3b8" fontSize="8" fontWeight="bold">{chartTrendData[chartTrendData.length - 1].date}</text>
                                        </svg>
                                    </div>
                                </div>
                            )}

                            {/* Detailed Log Table */}
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Historical Logs Registry</h3>
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black px-2 py-0.5 rounded-lg uppercase tracking-wide">
                                        {filteredHistory.length} Shifts
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-450">Date</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-450">Teacher</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-450">Morning Check-In</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-450">Afternoon Check-In</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                            {filteredHistory.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-500 whitespace-nowrap">{item.checkInDate}</td>
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <div className="font-bold text-slate-900 dark:text-white">{item.teacherName || 'Unknown'}</div>
                                                            <div className="text-[10px] text-slate-400 font-medium">{item.teacherEmail || ''}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.morningCheckInTime ? (
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span className="font-bold">{item.morningCheckInTime}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${getStatusColor(item.morningCheckInStatus)}`}>
                                                                        {item.morningCheckInStatus}
                                                                    </span>
                                                                    {renderLocationCell(item.morningLocation)}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-slate-455">
                                                                <XCircleIcon className="w-3.5 h-3.5" />
                                                                <span className="font-semibold">{item.morningOverdue ? 'Overdue (Absent)' : 'Pending'}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {item.afternoonCheckInTime ? (
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span className="font-bold">{item.afternoonCheckInTime}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${getStatusColor(item.afternoonCheckInStatus)}`}>
                                                                        {item.afternoonCheckInStatus}
                                                                    </span>
                                                                    {renderLocationCell(item.afternoonLocation)}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-slate-455">
                                                                <XCircleIcon className="w-3.5 h-3.5" />
                                                                <span className="font-semibold">{item.afternoonOverdue ? 'Overdue (Absent)' : 'Pending'}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherCheckInAdminView;
