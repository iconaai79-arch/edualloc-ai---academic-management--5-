
import React, { useState, useMemo } from 'react';
import type { AllocationRequest, User, Subject, AbsenceRequest, TimetableEntry, TimeOffRequest, TimeOffRequestStatus, LecturerContract, Semester, Institution, LetterheadConfig, RequestStatus, Priority } from '../types';
import { isSchoolInstitution } from '../utils/roleUtils';

import { RequestManager } from './RequestManager';
import { AbsenceRequestManager } from './AbsenceRequestManager';
import { ContractModal } from './ContractModal';
import { generateContractPdf } from '../services/pdfService';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { ClockIcon } from './icons/ClockIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';


interface LecturerInteractionManagerProps {
    requests: AllocationRequest[];
    allocations: AllocationRequest[]; // Added allocations prop
    onUpdateRequestStatus?: (requestId: string, newStatus: RequestStatus) => Promise<void>;
    onBulkUpdateRequestStatus?: (newStatus: 'hod_approved' | 'approved', departmentId?: string) => Promise<void>;
    onOpenDirectAssign: () => void;
    getLecturerById: (id: string) => User | undefined;
    getSubjectById?: (id: string) => Subject | undefined;
    currentUser: User;
    subjects: Subject[];
    absenceRequests: AbsenceRequest[];
    onUpdateAbsenceRequest?: (requestId: string, newStatus: 'approved' | 'rejected') => void;
    timeOffRequests: TimeOffRequest[];
    onUpdateTimeOffRequestStatus?: (requestId: string, newStatus: TimeOffRequestStatus) => void;
    users: User[];
    generatedTimetable: TimetableEntry[];
    contracts: LecturerContract[];
    activeSemester?: Semester | null;
    currentInstitution?: Institution | null;
    letterheadConfig: LetterheadConfig;
    footerImageUrl: string | null;
    onUpdateRequest: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
}

const TimeOffRequestManager: React.FC<{
    requests: TimeOffRequest[];
    onUpdateRequest?: (requestId: string, newStatus: TimeOffRequestStatus) => void;
    currentUser: User;
    users: User[];
    subjects: Subject[];
}> = ({ requests, onUpdateRequest, currentUser, users, subjects }) => {

    const pendingRequests = useMemo(() => {
        let visibleRequests = requests.filter(r => r.status === 'pending');
        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            const lecturersInDept = new Set(users.filter(u => u.departmentId === currentUser.departmentId).map(u => u.id));
            visibleRequests = visibleRequests.filter(req => lecturersInDept.has(req.lecturerId));
        }
        return visibleRequests.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [requests, currentUser, users]);

    return (
         <section>
            <h3 className="text-xl font-semibold mb-4">Pending Time Off Requests ({pendingRequests.length})</h3>
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                {pendingRequests.length > 0 ? (
                    <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                        {pendingRequests.map(req => {
                            const user = users.find(u => u.id === req.lecturerId);
                            return (
                                <li key={req.id} className="p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1">
                                            <p className="text-base font-bold text-slate-800 dark:text-slate-100">{req.category} Leave</p>
                                            <p className="text-sm font-medium text-[var(--color-primary)]">Requested by: {user?.name}</p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold">
                                                {req.startDate} to {req.endDate}
                                                <span className="ml-2 font-normal">({req.isFullDay ? "Full Day(s)" : `${req.startTime} - ${req.endTime}`})</span>
                                            </p>
                                            {req.reason && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">"{req.reason}"</p>}
                                            {req.supportingDocumentUrl && <a href={req.supportingDocumentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-sm font-medium text-blue-600 hover:underline">View Supporting Document</a>}
                                        </div>
                                         <div className="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0 flex space-x-2">
                                            <button onClick={() => onUpdateRequest?.(req.id, 'approved')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"><CheckIcon className="w-5 h-5 mr-1.5"/> Approve</button>
                                            <button onClick={() => onUpdateRequest?.(req.id, 'rejected')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"><XIcon className="w-5 h-5 mr-1.5"/> Reject</button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="p-6 text-center text-slate-500 dark:text-slate-400">There are no pending time off requests.</p>
                )}
            </div>
        </section>
    );
};

const ContractStatusManager: React.FC<{
    contracts: LecturerContract[];
    users: User[];
    currentInstitution?: Institution | null;
    letterheadConfig: LetterheadConfig;
    footerImageUrl: string | null;
    activeSemester?: Semester | null;
}> = ({ contracts, users, currentInstitution, letterheadConfig, footerImageUrl, activeSemester }) => {
    
    const [previewingContract, setPreviewingContract] = useState<LecturerContract | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const isSchool = isSchoolInstitution(currentInstitution);
    const semesterLabel = isSchool ? 'Term' : 'Semester';

    const semesterContracts = useMemo(() => {
        if (!activeSemester) return [];
        return contracts.filter(c => c.semesterId === activeSemester.id);
    }, [contracts, activeSemester]);

    const handleDownload = async (contract: LecturerContract) => {
        const lecturer = users.find(u => u.id === contract.lecturerId);
        if (!lecturer || !currentInstitution) return;
        setIsGeneratingPdf(true);
        try {
            const pdfDataUri = await generateContractPdf(contract, lecturer, currentInstitution, letterheadConfig, footerImageUrl, contract.signatureUrl || null);
            const link = document.createElement('a');
            link.href = pdfDataUri;
            link.download = `Contract_${lecturer.name.replace(/\s/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) { console.error("PDF Download Error:", e); alert("An error occurred while generating the PDF."); }
        finally { setIsGeneratingPdf(false); }
    };

    const handlePrint = async (contract: LecturerContract) => {
        const lecturer = users.find(u => u.id === contract.lecturerId);
        if (!lecturer || !currentInstitution) return;
        setIsGeneratingPdf(true);
        try {
            const pdfDataUri = await generateContractPdf(contract, lecturer, currentInstitution, letterheadConfig, footerImageUrl, contract.signatureUrl || null);
            const pdfWindow = window.open("");
            pdfWindow?.document.write(`<html><head><title>Print Contract</title></head><body style="margin: 0; padding: 0;"><iframe width='100%' height='100%' style="border: none;" src='${pdfDataUri}'></iframe></body></html>`);
            pdfWindow?.document.close();
            pdfWindow?.focus();
        } catch (e) {
            console.error("PDF Print Error:", e);
            alert("An error occurred while preparing the document for printing.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const StatusBadge: React.FC<{ status: LecturerContract['status'] }> = ({ status }) => {
        const styles: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
            accepted: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
            rejected: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
        };
        const style = styles[status] || styles.pending;
        return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${style}`}>{status}</span>;
    };

    return (
        <section>
            <h3 className="text-xl font-semibold mb-4">Contract Status for {activeSemester?.name || `Current ${semesterLabel}`} ({semesterContracts.length})</h3>
             <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Lecturer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Workload</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Action Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {semesterContracts.map(contract => {
                            const lecturer = users.find(u => u.id === contract.lecturerId);
                            return (
                                <tr key={contract.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{lecturer?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{contract.workloadSummary.totalPeriods} periods / {contract.workloadSummary.totalHours} hrs</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={contract.status} /></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{contract.acceptanceTimestamp ? new Date(contract.acceptanceTimestamp).toLocaleString() : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                                        <button onClick={() => setPreviewingContract(contract)} className="text-sky-600 hover:text-sky-800">Preview</button>
                                        <button onClick={() => handleDownload(contract)} disabled={isGeneratingPdf} className="text-green-600 hover:text-green-800 disabled:opacity-50">Download</button>
                                        <button onClick={() => handlePrint(contract)} disabled={isGeneratingPdf} className="text-blue-600 hover:text-blue-800 disabled:opacity-50">Print</button>
                                    </td>
                                </tr>
                            )
                        })}
                         {semesterContracts.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-slate-500">No contracts generated for this {semesterLabel.toLowerCase()}.</td></tr>
                         )}
                    </tbody>
                </table>
            </div>
             {previewingContract && currentInstitution && (
                <ContractModal
                    contract={previewingContract}
                    user={users.find(u => u.id === previewingContract.lecturerId)!}
                    institution={currentInstitution}
                    letterheadConfig={letterheadConfig}
                    footerImageUrl={footerImageUrl}
                    onClose={() => setPreviewingContract(null)}
                    onAccept={() => {}} // Not used in preview
                    onReject={() => {}} // Not used in preview
                    isPreview={true}
                />
            )}
        </section>
    );
};


export const LecturerInteractionManager: React.FC<LecturerInteractionManagerProps> = (props) => {
    const [subTab, setSubTab] = useState('allocations');
    const { 
        requests, onUpdateRequestStatus, onBulkUpdateRequestStatus, onOpenDirectAssign, onUpdateRequest,
        getLecturerById, getSubjectById, currentUser, subjects,
        absenceRequests, onUpdateAbsenceRequest, 
        timeOffRequests, onUpdateTimeOffRequestStatus,
        users, generatedTimetable, contracts, activeSemester,
        currentInstitution, letterheadConfig, footerImageUrl, allocations
    } = props;

    const isSchool = isSchoolInstitution(currentInstitution);

    const subTabs = [
        { key: 'allocations', label: 'Allocation Requests' },
        { key: 'absences', label: 'Absence Requests' },
        { key: 'time_off', label: 'Time Off Requests' },
        { key: 'contracts', label: 'Contracts' },
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold">{isSchool ? 'Teacher Interactions' : 'Lecturer Interactions'}</h3>
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Lecturer Interaction Tabs">
                    {subTabs.map(tabInfo => (
                         <button
                            key={tabInfo.key}
                            onClick={() => setSubTab(tabInfo.key)}
                            className={`${subTab === tabInfo.key ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            {tabInfo.label}
                        </button>
                    ))}
                </nav>
            </div>

            {subTab === 'allocations' && (
                <RequestManager 
                    requests={requests}
                    allocations={allocations}
                    onUpdateRequestStatus={onUpdateRequestStatus || (async () => {})}
                    onBulkUpdateRequestStatus={onBulkUpdateRequestStatus || (async () => {})}
                    getLecturerById={getLecturerById || (id => undefined)}
                    getSubjectById={getSubjectById || (id => undefined)}
                    currentUser={currentUser}
                    subjects={subjects}
                    onOpenDirectAssign={onOpenDirectAssign}
                    onUpdateRequest={onUpdateRequest}
                    currentInstitution={currentInstitution}
                />
            )}
            {subTab === 'absences' && (
                <AbsenceRequestManager
                    requests={absenceRequests}
                    onUpdateRequest={onUpdateAbsenceRequest || (() => {})}
                    currentUser={currentUser}
                    users={users}
                    subjects={subjects}
                    generatedTimetable={generatedTimetable}
                />
            )}
             {subTab === 'time_off' && (
                <TimeOffRequestManager
                    requests={timeOffRequests}
                    onUpdateRequest={onUpdateTimeOffRequestStatus}
                    currentUser={currentUser}
                    users={users}
                    subjects={subjects}
                />
            )}
            {subTab === 'contracts' && (
                <ContractStatusManager
                    contracts={contracts}
                    users={users}
                    activeSemester={activeSemester}
                    currentInstitution={currentInstitution}
                    letterheadConfig={letterheadConfig}
                    footerImageUrl={footerImageUrl}
                />
            )}
        </div>
    );
};
