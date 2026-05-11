import React, { useMemo } from 'react';
import { useDrivingSchool } from '../../services/DrivingSchoolContext';
import { 
    DSInvoice, 
    DSPayment, 
    DSStudent, 
    DSLesson, 
    DSVehicle, 
    DSInstructor 
} from '../../types';
import { 
    BarChart3 as ChartBarIcon, 
    Users as UsersIcon, 
    CircleDollarSign as CurrencyDollarIcon, 
    Truck as TruckIcon,
    ArrowUp as ArrowUpIcon,
    ArrowDown as ArrowDownIcon,
    Calendar as CalendarIcon,
    BadgeCheck as CheckBadgeIcon,
    Eye as EyeIcon,
    X as XIcon
} from 'lucide-react';
import { 
    generateStudentStatement, 
    generateLessonReport, 
    generateAttendanceSummary,
    generateIncomeReport,
    generateBalanceReport
} from '../../utils/dsReportGenerator';

interface DSAnalyticsViewProps {
    institution: any;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const MiniChart: React.FC<{ data: number[], color: string }> = ({ data, color }) => {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-1 h-8">
            {data.map((v: number, i: number) => (
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
        students, 
        invoices, 
        payments, 
        lessons, 
        vehicles, 
        instructors 
    } = useDrivingSchool();
    
    const [previewPdf, setPreviewPdf] = React.useState<string | null>(null);

    // 1. Financial Stats
    const totalInvoiced = useMemo(() => invoices.reduce((sum: number, inv: DSInvoice) => sum + (inv.totalAmount || 0), 0), [invoices]);
    const totalPaid = useMemo(() => payments.reduce((sum: number, pay: DSPayment) => sum + (pay.amount || 0), 0), [payments]);
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    // 2. Student Distribution by Category
    const categoryData = useMemo(() => {
        const counts: Record<string, number> = {};
        students.forEach((s: DSStudent) => {
            const cat = s.licenseTypeInterested || 'Standard';
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
            const count = lessons.filter((l: DSLesson) => (l.lessonDate || (l as any).date) === date).length;
            return { date, count };
        });
    }, [lessons]);

    // 4. Vehicle Utilization
    const vehicleUsage = useMemo(() => {
        return vehicles.map((v: DSVehicle) => {
            const usageCount = lessons.filter((l: DSLesson) => l.vehicleId === v.id).length;
            return { label: `${v.make} ${v.model} (${v.plateNumber})`, value: usageCount };
        }).sort((a: any, b: any) => b.value - a.value).slice(0, 5);
    }, [vehicles, lessons]);

    // 5. Instructor Performance
    const instructorStats = useMemo(() => {
        return instructors.map((inst: DSInstructor) => {
            const count = lessons.filter((l: DSLesson) => l.instructorId === inst.id).length;
            return { label: inst.name, value: count };
        }).sort((a: any, b: any) => b.value - a.value).slice(0, 5);
    }, [instructors, lessons]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase flex items-center gap-4">
                        <ChartBarIcon className="w-10 h-10 text-indigo-600" />
                        Strategic <span className="text-indigo-600">Analytics</span>
                    </h2>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Institutional Intelligence & Performance Monitoring
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 md:p-4 rounded-2xl md:rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm w-full md:w-auto">
                    <div className="flex -space-x-3">
                        {instructors.slice(0, 4).map((inst: DSInstructor, i: number) => (
                            <div key={i} className="w-10 h-10 rounded-full border-4 border-white dark:border-slate-800 bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 overflow-hidden">
                                {inst.name[0]}
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Active Faculty</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{instructors.length} Specialized Instructors</p>
                    </div>
                </div>
            </div>

            {/* Top KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-3xl group-hover:rotate-12 transition-transform">
                            <UsersIcon className="w-6 h-6" />
                        </div>
                        <MiniChart data={[10, 15, 8, 22, 18, 25, 30]} color="#6366f1" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Enrollment</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{students.length}</h3>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                        <ArrowUpIcon className="w-3 h-3" /> 12% vs last month
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl group-hover:rotate-12 transition-transform">
                            <CurrencyDollarIcon className="w-6 h-6" />
                        </div>
                        <MiniChart data={[500, 800, 1200, 600, 2000, 1500, 1800]} color="#10b981" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Revenue</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">KES {totalPaid.toLocaleString()}</h3>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold">
                        <CheckBadgeIcon className="w-3 h-3" /> {collectionRate.toFixed(1)}% Collection Rate
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-3xl group-hover:rotate-12 transition-transform">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <MiniChart data={[5, 12, 15, 10, 8, 14, 20]} color="#f59e0b" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Practical Lessons</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{lessons.length}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conducted this term</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-3xl group-hover:rotate-12 transition-transform">
                            <TruckIcon className="w-6 h-6" />
                        </div>
                        <div className="h-8 flex items-end">
                            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500 w-[85%]" />
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fleet Readiness</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{Math.round((vehicles.filter(v => v.status === 'Operational').length / Math.max(vehicles.length, 1)) * 100)}%</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{vehicles.length} Operational Vehicles</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Visual Charts */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-900 p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Activity Heatmap</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily lesson density (Last 7 Days)</p>
                            </div>
                        </div>
                        <div className="h-64 flex items-end justify-between gap-4">
                            {dailyLessons.map((d, i) => {
                                const max = Math.max(...dailyLessons.map(x => x.count), 1);
                                const h = (d.count / max) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center group">
                                        <div 
                                            className="w-full rounded-2xl bg-indigo-600/10 group-hover:bg-indigo-600 transition-all duration-500 relative flex items-end justify-center"
                                            style={{ height: `${Math.max(h, 5)}%` }}
                                        >
                                            <span className="absolute -top-8 text-[10px] font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {d.count}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-4">
                                            {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Course Distribution</h4>
                            <div className="space-y-4">
                                {categoryData.map((cat: any, i: number) => (
                                    <div key={i}>
                                        <div className="flex justify-between items-center mb-1 text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-500">{cat.label}</span>
                                            <span className="text-slate-900 dark:text-white">{cat.value} Students</span>
                                        </div>
                                        <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-1000" 
                                                style={{ 
                                                    width: `${(cat.value / students.length) * 100}%`,
                                                    backgroundColor: COLORS[i % COLORS.length]
                                                }} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Instructor Efficiency</h4>
                            <div className="space-y-4">
                                {instructorStats.map((inst: any, i: number) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                                            #{i+1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                                                <span className="text-slate-900 dark:text-white truncate max-w-[100px]">{inst.label}</span>
                                                <span className="text-indigo-600">{inst.value} Lessons</span>
                                            </div>
                                            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${(inst.value / (Math.max(...instructorStats.map((x: any) => x.value), 1))) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Performance Rankings */}
                <div className="space-y-8">
                    <div className="p-6 md:p-8 bg-indigo-600 rounded-[2rem] md:rounded-[3.5rem] shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-black uppercase tracking-tight mb-8">Collection Performance</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Total Invoiced</p>
                                        <p className="text-2xl md:text-4xl font-black tracking-tight">KES {totalInvoiced.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2">Total Collected</p>
                                        <p className="text-2xl md:text-4xl font-black tracking-tight">KES {totalPaid.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center bg-white/10 rounded-[2.5rem] p-8 border border-white/10 backdrop-blur-md">
                                    <div className="relative w-24 h-24 md:w-32 md:h-32">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="50%" cy="50%" r="45%" className="fill-none stroke-white/10 stroke-[10]" />
                                            <circle cx="50%" cy="50%" r="45%" className="fill-none stroke-white stroke-[10] transition-all duration-1000" style={{ strokeDasharray: '283', strokeDashoffset: 283 - (283 * collectionRate) / 100 }} />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-xl md:text-3xl font-black">{Math.round(collectionRate)}%</span>
                                            <span className="text-[8px] font-black uppercase opacity-60">Target</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest mt-6 opacity-80">Collection Efficiency</p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <CurrencyDollarIcon className="w-48 h-48" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Fleet Utilization</h4>
                        <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2">
                            {vehicleUsage.map((v: any, i: number) => (
                                <div key={i} className="group/item">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">{v.label}</span>
                                        <span className="text-xs font-black">{v.value} SES</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-600 rounded-full group-hover/item:scale-x-105 transition-transform origin-left"
                                            style={{ width: `${(v.value / (Math.max(...vehicleUsage.map((x: any) => x.value), 1))) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Hub */}
            <div className="bg-white dark:bg-slate-950 p-6 md:p-10 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
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

                        <div className="bg-white dark:bg-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[4rem] border border-slate-100 dark:border-slate-700 shadow-sm col-span-1 md:col-span-12">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Student Statement Section */}
                                <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                            <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Financial Statements</p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">Student Ledger</h4>
                            <div className="space-y-4">
                                <select 
                                    id="statement-student-select"
                                    className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select Student</option>
                                    {students.map((s: DSStudent) => (
                                        <option key={s.id} value={s.id}>{s.fullName}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => {
                                        const select = document.getElementById('statement-student-select') as HTMLSelectElement;
                                        const sid = select.value;
                                        if (!sid) return;
                                        const student = students.find((s: DSStudent) => s.id === sid);
                                        if (student) {
                                            const sInvoices = invoices.filter((i: DSInvoice) => i.studentId === sid);
                                            const sPayments = payments.filter((p: DSPayment) => p.studentId === sid);
                                            const doc = generateStudentStatement(student, sInvoices, sPayments, institution);
                                            setPreviewPdf(doc.output('datauristring'));
                                        }
                                    }}
                                    className="w-full bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white font-black py-4 rounded-2xl transition-all border border-indigo-100 dark:border-indigo-900 uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"
                                >
                                    <EyeIcon className="w-4 h-4" /> Preview Statement
                                </button>
                                <button 
                                    onClick={() => {
                                        const select = document.getElementById('statement-student-select') as HTMLSelectElement;
                                        const sid = select.value;
                                        if (!sid) return;
                                        const student = students.find((s: DSStudent) => s.id === sid);
                                        if (student) {
                                            const sInvoices = invoices.filter((i: DSInvoice) => i.studentId === sid);
                                            const sPayments = payments.filter((p: DSPayment) => p.studentId === sid);
                                            const doc = generateStudentStatement(student, sInvoices, sPayments, institution);
                                            doc.save(`${student.fullName.replace(/\s+/g, '_')}_Statement.pdf`);
                                        }
                                    }}
                                    className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 uppercase text-[11px] tracking-widest"
                                >
                                    Download PDF
                                </button>
                            </div>
                        </div>

                        {/* Lesson Schedule Section */}
                        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                            <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Operational Logistics</p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">Training Schedule</h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                                        const filtered = lessons.filter((l: DSLesson) => (l.lessonDate || (l as any).date) >= start && (l.lessonDate || (l as any).date) <= end);
                                        const doc = generateLessonReport(
                                            filtered, 
                                            students, 
                                            vehicles, 
                                            instructors, 
                                            `Training Schedule (${start} to ${end})`, 
                                            institution
                                        );
                                        setPreviewPdf(doc.output('datauristring'));
                                    }}
                                    className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white font-black py-4 rounded-2xl transition-all border border-amber-100 dark:border-amber-900 uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"
                                >
                                    <EyeIcon className="w-4 h-4" /> Preview Schedule
                                </button>
                                <button 
                                    onClick={() => {
                                        const start = (document.getElementById('schedule-start-date') as HTMLInputElement).value;
                                        const end = (document.getElementById('schedule-end-date') as HTMLInputElement).value;
                                        const filtered = lessons.filter((l: DSLesson) => (l.lessonDate || (l as any).date) >= start && (l.lessonDate || (l as any).date) <= end);
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
                                    className="w-full bg-slate-900 dark:bg-amber-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/20 uppercase text-[11px] tracking-widest"
                                >
                                    Download PDF
                                </button>
                            </div>
                        </div>

                        {/* Attendance Reports Section */}
                        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
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
                                        const filtered = lessons.filter((l: DSLesson) => (l.lessonDate || (l as any).date) >= start && (l.lessonDate || (l as any).date) <= end);
                                        const doc = generateAttendanceSummary(
                                            filtered, 
                                            students, 
                                            `Attendance Summary (${start} to ${end})`, 
                                            institution
                                        );
                                        setPreviewPdf(doc.output('datauristring'));
                                    }}
                                    className="w-full bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white font-black py-4 rounded-2xl transition-all border border-emerald-100 dark:border-emerald-900 uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"
                                >
                                    <EyeIcon className="w-4 h-4" /> Preview Attendance
                                </button>
                                <button 
                                    onClick={() => {
                                        const start = (document.getElementById('attendance-start-date') as HTMLInputElement).value;
                                        const end = (document.getElementById('attendance-end-date') as HTMLInputElement).value;
                                        const filtered = lessons.filter((l: DSLesson) => (l.lessonDate || (l as any).date) >= start && (l.lessonDate || (l as any).date) <= end);
                                        const doc = generateAttendanceSummary(
                                            filtered, 
                                            students, 
                                            `Attendance Summary (${start} to ${end})`, 
                                            institution
                                        );
                                        doc.save(`Attendance_Summary_${start}_to_${end}.pdf`);
                                    }}
                                    className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 uppercase text-[11px] tracking-widest"
                                >
                                    Download PDF
                                </button>
                            </div>
                        </div>

                        {/* Financial Analytics Section */}
                        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                            <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Revenue & Collections</p>
                            <h4 className="text-lg font-black text-slate-900 dark:text-white">Financial Reports</h4>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input id="financial-start-date" type="date" className="bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm" defaultValue={new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]} />
                                    <input id="financial-end-date" type="date" className="bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-[10px] font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm" defaultValue={new Date().toISOString().split('T')[0]} />
                                </div>
                                <select id="financial-votehead-select" className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 shadow-sm">
                                    <option value="">All Vote Heads</option>
                                    <option value="Tuition">Tuition Fee</option>
                                    <option value="PDL">PDL / License</option>
                                    <option value="Assessment">Assessment / Exam</option>
                                </select>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => {
                                            const start = (document.getElementById('financial-start-date') as HTMLInputElement).value;
                                            const end = (document.getElementById('financial-end-date') as HTMLInputElement).value;
                                            const vote = (document.getElementById('financial-votehead-select') as HTMLSelectElement).value;
                                            const filtered = payments.filter((p: DSPayment) => p.paymentDate >= start && p.paymentDate <= end);
                                            const doc = generateIncomeReport(filtered, invoices, `Income Report (${start} to ${end})`, institution, vote || undefined);
                                            setPreviewPdf(doc.output('datauristring'));
                                        }}
                                        className="w-full bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white font-black py-4 rounded-2xl transition-all border border-indigo-100 dark:border-indigo-900 uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <EyeIcon className="w-4 h-4" /> Income Preview
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const start = (document.getElementById('financial-start-date') as HTMLInputElement).value;
                                            const end = (document.getElementById('financial-end-date') as HTMLInputElement).value;
                                            const doc = generateBalanceReport(students, invoices, payments, `Arrears Summary (${new Date().toLocaleDateString()})`, institution);
                                            setPreviewPdf(doc.output('datauristring'));
                                        }}
                                        className="w-full bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white font-black py-4 rounded-2xl transition-all border border-rose-100 dark:border-rose-900 uppercase text-[11px] tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <EyeIcon className="w-4 h-4" /> Debt Analysis
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            </div>
            </div>
            </div>
            </div>
            </div>
            </div>

            {/* PDF Preview Modal */}
            {previewPdf && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Document Preview</h3>
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">Driving School Reports Hub</p>
                            </div>
                            <button 
                                onClick={() => setPreviewPdf(null)}
                                className="p-3 bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-2xl border border-slate-100 dark:border-slate-700 transition-all active:scale-95"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-4">
                            <iframe 
                                src={previewPdf} 
                                className="w-full h-full rounded-2xl border-none shadow-inner"
                                title="Report Preview"
                            />
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setPreviewPdf(null)} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Close</button>
                            <a 
                                href={previewPdf} 
                                download="Report.pdf"
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <ArrowDownIcon className="w-4 h-4" /> Download PDF
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
