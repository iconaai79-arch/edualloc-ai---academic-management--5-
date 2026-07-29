
import React from 'react';
import type { User, Institution, Book, LibraryTransaction, LibraryFine, CompanyDetails, Course, Department, AcademicYear, Semester } from '../../types';
import { LibraryMasterView } from '../LibraryMasterView';
import { Header } from '../Header';

interface LibraryWarRoomProps {
    currentUser: User;
    currentInstitution: Institution;
    companyDetails: CompanyDetails;
    users: User[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    courses: Course[];
    departments: Department[];
    onLogAction: (action: string) => Promise<void>;
}

export const LibraryWarRoom: React.FC<LibraryWarRoomProps> = (props) => {
    return (
        <div className="space-y-10 w-full">
            {/* Hero / Welcome Section */}
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Asset Security Active</span>
                    </div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Library Command Center</h1>
                    <p className="text-slate-500 font-medium">Welcome back, {props.currentUser.name}. Registry synchronization complete.</p>
                </div>
            </div>

            {/* Centralized Library Hub */}
            <LibraryMasterView {...props} />
        </div>
    );
};

