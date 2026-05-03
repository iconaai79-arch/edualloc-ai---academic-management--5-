import React, { useMemo } from 'react';
import type { User, Subject, Department, AllocationRequest, TimetableEntry, Room, Course, Visitor } from '../types';

interface VisualReportsProps {
    lecturers: User[];
    subjects: Subject[];
    departments: Department[];
    requests: AllocationRequest[];
    allocations: AllocationRequest[];
    generatedTimetable: TimetableEntry[];
    courses: Course[];
    rooms: Room[];
    visitors: Visitor[];
    isAutoSales?: boolean;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const SimpleDonutChart: React.FC<{ data: { label: string; value: number; color?: string }[] }> = ({ data }) => {
    const safeData = Array.isArray(data) ? data : [];
    const total = safeData.reduce((acc, item) => acc + (item.value || 0), 0);
    let currentAngle = 0;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;

    if (total === 0) return <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>;

    return (
        <div className="flex flex-col items-center justify-center py-4">
            <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                    {safeData.map((item, index) => {
                        if (!item || item.value === 0) return null;
                        const strokeDasharray = `${(item.value / total) * circumference} ${circumference}`;
                        const strokeDashoffset = -((currentAngle / total) * circumference);
                        currentAngle += item.value;
                        const color = item.color || COLORS[index % COLORS.length];

                        return (
                            <circle
                                key={item.label}
                                cx="50"
                                cy="50"
                                r={radius}
                                fill="transparent"
                                stroke={color}
                                strokeWidth="15"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-500 hover:opacity-80"
                            />
                        );
                    })}
                    <circle cx="50" cy="50" r="30" className="fill-white dark:fill-slate-800" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{total}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-6">
                {safeData.map((item, index) => (
                    <div key={item.label} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}></span>
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{item.label}</span>
                        <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">({total > 0 ? Math.round((item.value / total) * 100) : 0}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SimpleBarChart: React.FC<{ data: { label: string; value: number }[]; color?: string }> = ({ data, color = '#6366f1' }) => {
    const safeData = Array.isArray(data) ? data : [];
    const maxValue = Math.max(...safeData.map(d => d.value || 0), 1);

    if (safeData.length === 0) return <div className="flex items-center justify-center h-64 text-slate-400">No data available</div>;

    return (
        <div className="h-64 flex items-end justify-between gap-2 pt-6 pb-2">
            {safeData.map((item, index) => {
                const heightPercentage = ((item.value || 0) / maxValue) * 100;
                return (
                    <div key={index} className="flex flex-col items-center flex-1 group relative">
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                            {item.label}: {item.value}
                        </div>
                        <div 
                            className="w-full rounded-t-md transition-all duration-500 hover:brightness-110" 
                            style={{ height: `${heightPercentage}%`, backgroundColor: color, minHeight: '4px' }} 
                        />
                        <p className="text-[10px] mt-2 text-slate-500 dark:text-slate-400 -rotate-45 origin-left translate-y-2 w-full overflow-hidden text-ellipsis whitespace-nowrap text-right px-1">
                            {item.label}
                        </p>
                    </div>
                );
            })}
        </div>
    );
};

export const VisualReports: React.FC<VisualReportsProps> = ({
    lecturers = [], 
    subjects = [], 
    departments = [], 
    requests = [], 
    allocations = [], 
    generatedTimetable = [], 
    courses = [], 
    rooms = [], 
    visitors = [],
    isAutoSales = false
}) => {
    const safeLecturers = Array.isArray(lecturers) ? lecturers : [];
    const safeSubjects = Array.isArray(subjects) ? subjects : [];
    const safeDepartments = Array.isArray(departments) ? departments : [];
    const safeRequests = Array.isArray(requests) ? requests : [];
    const safeAllocations = Array.isArray(allocations) ? allocations : [];
    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeVisitors = Array.isArray(visitors) ? visitors : [];

    const requestStatusData = useMemo(() => {
        const counts = { approved: 0, pending: 0, rejected: 0 };
        safeRequests.forEach(r => {
            if (!r) return;
            if (r.status === 'approved') counts.approved += 1;
            else if (r.status === 'disapproved') counts.rejected += 1;
            else counts.pending += 1;
        });
        return [
            { label: 'Approved', value: counts.approved, color: '#10b981' },
            { label: 'Pending', value: counts.pending, color: '#f59e0b' },
            { label: 'Rejected', value: counts.rejected, color: '#ef4444' },
        ];
    }, [safeRequests]);

    const allocationStatusData = useMemo(() => {
        const allocatedSubjectIds = new Set(safeAllocations.filter(a => a).map(a => a.subjectId));
        const allocated = safeSubjects.filter(s => s && allocatedSubjectIds.has(s.id)).length;
        const unallocated = Math.max(0, safeSubjects.length - allocated);
        return [
            { label: 'Allocated', value: allocated, color: '#6366f1' },
            { label: 'Unallocated', value: unallocated, color: '#94a3b8' },
        ];
    }, [safeSubjects, safeAllocations]);

    const deptWorkloadData = useMemo(() => {
        return safeDepartments.filter(d => d).map(dept => {
            const subjectCount = safeSubjects.filter(s => s && s.departmentId === dept.id).length;
            return { label: dept.name || 'Unknown', value: subjectCount };
        }).sort((a, b) => b.value - a.value);
    }, [safeDepartments, safeSubjects]);

    const topLecturersData = useMemo(() => {
        return safeLecturers
            .filter(l => l && l.role !== 'admin' && l.role !== 'super_admin' && l.role !== 'student')
            .map(lecturer => {
                const count = safeAllocations.filter(a => a && a.lecturerId === lecturer.id).length;
                return { label: lecturer.name?.split(' ').slice(0, 2).join(' ') || 'Unknown', value: count };
            })
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [safeLecturers, safeAllocations]);

    const courseDistributionData = useMemo(() => {
        return safeDepartments.filter(d => d).map(dept => {
             const courseCount = safeCourses.filter(c => c && c.departmentId === dept.id).length;
             return { label: dept.name || 'Unknown', value: courseCount };
        }).filter(d => d.value > 0);
    }, [safeCourses, safeDepartments]);

    const staffGenderData = useMemo(() => {
        const counts = { Male: 0, Female: 0, Other: 0 };
        safeLecturers
            .filter(l => l && l.role !== 'student' && l.role !== 'super_admin')
            .forEach(u => {
                if (!u) return;
                const gender = u.gender || 'Male';
                if (gender === 'Male') counts.Male += 1;
                else if (gender === 'Female') counts.Female += 1;
                else counts.Other += 1;
            });
        
        return [
            { label: 'Male', value: counts.Male, color: '#3b82f6' },
            { label: 'Female', value: counts.Female, color: '#ec4899' },
            { label: 'Other', value: counts.Other, color: '#a855f7' }
        ].filter(d => d.value > 0);
    }, [safeLecturers]);

    const studentGenderData = useMemo(() => {
        const counts = { Male: 0, Female: 0, Other: 0 };
        safeLecturers
            .filter(l => l && l.role === 'student')
            .forEach(u => {
                if (!u) return;
                const gender = u.gender || 'Male';
                if (gender === 'Male') counts.Male += 1;
                else if (gender === 'Female') counts.Female += 1;
                else counts.Other += 1;
            });
        
        return [
            { label: 'Male', value: counts.Male, color: '#3b82f6' },
            { label: 'Female', value: counts.Female, color: '#ec4899' },
            { label: 'Other', value: counts.Other, color: '#a855f7' }
        ].filter(d => d.value > 0);
    }, [safeLecturers]);

    const visitorPurposeData = useMemo(() => {
        const counts: Record<string, number> = {};
        safeVisitors.forEach(v => {
            if (!v) return;
            const p = v.purpose || 'Other';
            counts[p] = (counts[p] || 0) + 1;
        });
        return Object.entries(counts).map(([label, value]) => ({ label, value }));
    }, [safeVisitors]);

    const visitorTrafficData = useMemo(() => {
        const counts: Record<string, number> = {};
        safeVisitors.forEach(v => {
            if (!v) return;
            const d = v.visitDate || 'Unknown';
            counts[d] = (counts[d] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .slice(-7)
            .map(([label, value]) => {
                let labelText = 'Unknown';
                try {
                    if (label !== 'Unknown') {
                        labelText = new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric'});
                    }
                } catch (e) {}
                return { label: labelText, value };
            });
    }, [safeVisitors]);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Graphical Insights</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {!isAutoSales && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <h4 className="text-lg font-medium mb-4 text-slate-700 dark:text-slate-200">Request Status Overview</h4>
                        <SimpleDonutChart data={requestStatusData} />
                    </div>
                )}

                {!isAutoSales && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <h4 className="text-lg font-medium mb-4 text-slate-700 dark:text-slate-200">Subject Allocation Progress</h4>
                        <SimpleDonutChart data={allocationStatusData} />
                    </div>
                )}

                 <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="text-lg font-medium mb-4 text-slate-700 dark:text-slate-200">Staff Gender Distribution</h4>
                    <SimpleDonutChart data={staffGenderData} />
                </div>

                {!isAutoSales && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <h4 className="text-lg font-medium mb-4 text-slate-700 dark:text-slate-200">Student Gender Distribution</h4>
                        <SimpleDonutChart data={studentGenderData} />
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="text-lg font-medium mb-4 text-slate-700 dark:text-slate-200">Visitor Purpose</h4>
                    <SimpleDonutChart data={visitorPurposeData} />
                </div>

                 <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="text-lg font-medium mb-6 text-slate-700 dark:text-slate-200">Visitor Traffic (Last 7 Active Days)</h4>
                    <SimpleBarChart data={visitorTrafficData} color="#f43f5e" />
                </div>

                {!isAutoSales && (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <h4 className="text-lg font-medium mb-6 text-slate-700 dark:text-slate-200">Subjects per Department</h4>
                        <SimpleBarChart data={deptWorkloadData} color="#8b5cf6" />
                    </div>
                )}

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                    <h4 className="text-lg font-medium mb-6 text-slate-700 dark:text-slate-200">{isAutoSales ? 'Top Sales Agents' : 'Top Staff by Allocations'}</h4>
                    <SimpleBarChart data={topLecturersData} color="#0ea5e9" />
                </div>
                
                {!isAutoSales && (
                    <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                        <h4 className="text-lg font-medium mb-6 text-slate-700 dark:text-slate-200">Courses per Department</h4>
                        <SimpleBarChart data={courseDistributionData} color="#ec4899" />
                    </div>
                )}
            </div>
        </div>
    );
};
