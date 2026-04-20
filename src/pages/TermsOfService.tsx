import React from 'react';
import { GavelIcon, ScaleIcon, ClipboardCheckIcon, ShieldCheckIcon } from '../components/icons/LegalIcons'; // Assuming these or similar icons exist

const TermsOfService: React.FC = () => {
    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
            {/* Minimal Header */}
            <header className="border-b border-slate-100 dark:border-slate-800 py-10 px-6">
                <div className="max-w-4xl mx-auto flex items-center gap-5">
                    <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-slate-900 shadow-xl">
                        <ScaleIcon className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight uppercase">Terms of Service</h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Agreement of Use • v1.0</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-16 px-6 sm:px-10 leading-relaxed text-slate-600 dark:text-slate-400">
                <div className="prose prose-slate dark:prose-invert max-w-none space-y-12">
                    
                    <section>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3 mb-6">
                            <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                            1. Acceptance of Terms
                        </h2>
                        <p>
                            By accessing or using the Eduai Automation Hub platform ("the Service"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of an institution (e.g., a school, cooperative, or law firm), you represent that you have the authority to bind that entity to these terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3 mb-6">
                            <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                            2. Service Description
                        </h2>
                        <p>
                            Eduai provides a cloud-based automation platform including but not limited to academic management, institutional storage (Google Drive Integration), billing automation (M-Pesa), and operational simulators.
                        </p>
                    </section>

                    <section className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-4">3. External Integrations (Google Drive)</h2>
                        <p className="text-sm mb-4">
                            The Service offers integration with Google Drive for institutional storage. By enabling this integration:
                        </p>
                        <ul className="list-disc pl-5 space-y-3 text-sm">
                            <li>You authorize the Service to create, upload, and manage files within the specific folders created by the application on your Google Drive.</li>
                            <li>The institution is responsible for maintaining the security of its Google Workspace credentials.</li>
                            <li>Eduai is not liable for data loss or unauthorized access occurring within the Google Cloud environment beyond our direct control.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3 mb-6">
                            <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                            4. User Responsibilities
                        </h2>
                        <p>
                            Users are responsible for ensuring that all data uploaded to the system (student records, financial data, etc.) complies with local data protection laws. Institutions must not use the platform to store or transmit illegal, offensive, or infringing content.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3 mb-6">
                            <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                            5. Subscriptions & Payments
                        </h2>
                        <p>
                            Platform access is provided on a subscription basis. Failure to renew a subscription may result in limited access or suspension of services. We reserve the right to modify pricing with 30 days' advance notice to institutional administrators.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-3 mb-6">
                            <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                            6. Termination
                        </h2>
                        <p>
                            We reserve the right to suspend or terminate access to the Service for any violation of these terms or non-payment. Upon termination, users may request a data export within 14 days before records are scheduled for deletion.
                        </p>
                    </section>

                    <section className="pt-10 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-center font-bold text-slate-400">
                            Effective Date: April 20, 2026
                        </p>
                    </section>
                </div>
            </main>

            <footer className="bg-slate-50 dark:bg-slate-800/30 py-12 px-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Eduai Automation Hub • Legal Infrastructure
                </p>
            </footer>
        </div>
    );
};

// Simple Fallback Icons if not imported
const ScaleIcon = (props: any) => (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17m9-11l-9-4-9 4m18 0l-9 4-9-4m18 0l-9 8-9-8" />
    </svg>
);

export default TermsOfService;
