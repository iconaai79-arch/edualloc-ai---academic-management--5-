import React from 'react';
import { ShieldCheckIcon, LockClosedIcon, DocumentTextIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-12 px-6">
                <div className="max-w-4xl mx-auto flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                        <ShieldCheckIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Privacy Policy</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Last Updated: April 20, 2026</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto py-16 px-6 leading-relaxed">
                <div className="space-y-16">
                    
                    {/* Introduction */}
                    <section>
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-6">
                            <DocumentTextIcon className="w-7 h-7" />
                            1. Introduction
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Eduai Automation Hub ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Academic Management Platform and our Google Drive Integration services.
                        </p>
                    </section>

                    {/* Information Collection */}
                    <section>
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-6">
                            <UserGroupIcon className="w-7 h-7" />
                            2. Information We Collect
                        </h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-lg mb-3">Academic Data</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    We collect student, lecturer, and administrative data provided by your institution to facilitate academic record management, timetabling, and communication.
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-lg mb-3">Integration Data</h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    When using Google Drive integration, we only access specific folders and files authorized by your Super Admin to store institutional academic materials.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Google Drive Specifics */}
                    <section className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                        <h2 className="text-2xl font-bold flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-6">
                            <LockClosedIcon className="w-7 h-7" />
                            3. Google Drive Integration & Data Usage
                        </h2>
                        <p className="mb-4">Our application's use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-indigo-600 hover:underline font-bold" target="_blank" rel="noreferrer">Google API Service User Data Policy</a>.</p>
                        <ul className="list-disc pl-6 space-y-4 text-slate-600 dark:text-slate-400">
                            <li><strong>Scope of Access:</strong> We only request "drive.file" access, which limits our platform to files created by the platform or authorized by the user.</li>
                            <li><strong>Purpose:</strong> To provide automated backup and storage for student photos, exam results, and institutional documents.</li>
                            <li><strong>Data Retention:</strong> Files stored on Google Drive are maintained until deleted by your institution's administrator.</li>
                            <li><strong>Privacy:</strong> We do not sell or share your Google Drive data with third parties.</li>
                        </ul>
                    </section>

                    {/* Security */}
                    <section>
                        <h2 className="text-2xl font-bold mb-6">4. Data Security</h2>
                        <p className="text-slate-600 dark:text-slate-400">
                            We implement industry-standard security measures, including SSL encryption and OAuth 2.0 authentication, to protect your data from unauthorized access, alteration, or disclosure.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="pt-12 border-t border-slate-200 dark:border-slate-800 text-center">
                        <h2 className="text-xl font-bold mb-4">Questions or Concerns?</h2>
                        <p className="text-slate-500">Contact our data protection officer at:</p>
                        <p className="text-indigo-600 font-bold text-lg">support@eduai.co.ke</p>
                    </section>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-slate-100 dark:bg-slate-800/50 py-8 px-6 text-center text-sm text-slate-500">
                &copy; 2026 Eduai Automation Hub. All rights reserved.
            </footer>
        </div>
    );
};

export default PrivacyPolicy;
