
import React from 'react';

interface DepartmentWorkloadSummaryProps {
    departmentWorkload: {
        departmentName: string;
        totalPeriods: number;
        totalHours: number;
        subjectCount: number;
    }[];
}

export const DepartmentWorkloadSummary: React.FC<DepartmentWorkloadSummaryProps> = ({ departmentWorkload }) => {
    return (
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto p-6">
            <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Workload Summary by Department</h3>
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Total Subjects</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Total Periods / Week</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Total Hours / Week</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {departmentWorkload.map((dept, index) => (
                        <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{dept.departmentName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{dept.subjectCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{dept.totalPeriods}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{(Number(dept.totalHours) || 0).toFixed(1)}</td>
                        </tr>
                    ))}
                    {departmentWorkload.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-sm text-slate-500 dark:text-slate-400">No data available for department workload summary.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

