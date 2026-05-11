import React, { useMemo } from 'react';
import { DrivingSchoolContext } from '../../services/DrivingSchoolContext';
import { 
    ChartBarIcon, 
    UsersIcon, 
    CurrencyDollarIcon, 
    TruckIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    CalendarIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { 
    generateStudentStatement, 
    generateLessonReport, 
    generateAttendanceSummary 
} from '../../utils/dsReportGenerator';

interface DSAnalyticsViewProps {
    institution: any;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const MiniChart: React.FC<{ data: number[], color: string }> = ({ data, color }) => {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-1 h-8">
            {data.map((v, i) => (
                <div 
                    key={i} 
                    className="w-1 rounded-t-sm transition-all duration-500" 
                    style={{ height: `${(v / max) * 100}%`, backgroundColor: color }} 
                />
            ))}
        </div>
    );
};

export const DSAnalyticsView: React.FC<DSAnalyticsViewProps> = ({
    institution
}) => {
    const { 
        students = [], 
        invoices = [], 
        payments = [], 
        lessons = [], 
        vehicles = [], 
        instructors = [] 
    } = React.useContext(DrivingSchoolContext);
    // 1. Financial Stats
    const totalInvoiced = useMemo(() => invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0), [invoices]);
    const totalPaid = useMemo(() => payments.reduce((sum, pay) => sum + (pay.amount || 0), 0), [payments]);
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    // 2. Student Distribution by Category
    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        students.forEach(s => {
            const cat = s.category || 'Standard';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts).map(([label, value]) => ({ label, value }));
    }, [students]);

    // 3. Lesson Activity over last 7 days
    const dailyLessons = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last7Days.map(date => {
            const count = lessons.filter(l => l.date === date).length;
            return { date, count };
        });
    }, [lessons]);

    // 4. Vehicle Utilization
    const vehicleUsage = useMemo(() => {
        return vehicles.map(v => {
            const usageCount = lessons.filter(l => l.vehicleId === v.id).length;
            return { label: `${v.make} ${v.model} (${v.plateNumber})`, value: usageCount };
        }).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [vehicles, lessons]);

    // 5. Instructor Performance
    const instructorStats = useMemo(() => {
        return instructors.map(inst => {
            const count = lessons.filter(l => l.instructorId === inst.id).length;
            return { label: inst.name, value: count };
        }).sort((a, b) => b.value - a.value).slice(0, 5);
    }, [instructors, lessons]);

            {/* Report Hub */}
            <div className="bg-white dark:bg-slate-950 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -mr-32 -mt-32" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                            <ChartBarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Report Hub</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Generate strategic documents and operational schedules</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Student Statement Section */}
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                            <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Financial Statements</p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">Student Ledger</h4>
                            <div className="space-y-4">
                                <select 
                                    id="statement-student-select"
                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select Student</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.fullName}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => {
                                        const select = document.getElementById('statement-student-select') as HTMLSelectElement;
                                        const sid = select.value;
                                        if (!sid) return;
                                        const student = students.find(s => s.id === sid);
                                        if (student) {
                                            const sInvoices = invoices.filter(i => i.studentId === sid);
                                            const sPayments = payments.filter(p => p.studentId === sid);
                                            const doc = generateStudentStatement(student, sInvoices, sPayments, institution);
                                            doc.save(`${student.fullName.replace(/\s+/g, '_')}_Statement.pdf`);
                                        }
                                    }}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 uppercase text-[11px] tracking-widest"
                                >
                                    Generate Statement
                                </button>
                            </div>
                        </div>

                        {/* Lesson Schedule Section */}
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                            <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Operational Logistics</p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">Training Schedule</h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <input 
                                        id="schedule-start-date"
                                        type="date" 
                                        className="bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 shadow-sm"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                    />
                                    <input 
                                        id="schedule-end-date"
                                        type="date" 
                                        className="bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 shadow-sm"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <button 
                                    onClick={() => {
                                        const start = (document.getElementById('schedule-start-date') as HTMLInputElement).value;
                                        const end = (document.getElementById('schedule-end-date') as HTMLInputElement).value;
                                        const filtered = lessons.filter(l => l.date >= start && l.date <= end);
                                        const doc = generateLessonReport(
                                            filtered, 
                                            students, 
                                            vehicles, 
                                            instructors, 
                                            `Training Schedule (${start} to ${end})`, 
                                            institution
                                        );
                                        doc.save(`Training_Schedule_${start}_to_${end}.pdf`);
                                    }}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/20 uppercase text-[11px] tracking-widest"
                                >
                                    Generate Schedule
                                </button>
                            </div>
                        </div>

                        {/* Attendance Reports Section */}
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                            <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Compliance & Monitoring</p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">Attendance Summary</h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <input 
                                        id="attendance-start-date"
                                        type="date" 
                                        className="bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                        defaultValue={new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]}
                                    />
                                    <input 
                                        id="attendance-end-date"
                                        type="date" 
                                        className="bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                        defaultValue={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <button 
                                    onClick={() => {
                                        const start = (document.getElementById('attendance-start-date') as HTMLInputElement).value;
                                        const end = (document.getElementById('attendance-end-date') as HTMLInputElement).value;
                                        const filtered = lessons.filter(l => l.date >= start && l.date <= end);
                                        const doc = generateAttendanceSummary(
                                            filtered, 
                                            students, 
                                            `Attendance Summary (${start} to ${end})`, 
                                            institution
                                        );
                                        doc.save(`Attendance_Summary_${start}_to_${end}.pdf`);
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 uppercase text-[11px] tracking-widest"
                                >
                                    Generate Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
        </div>
    );
};
