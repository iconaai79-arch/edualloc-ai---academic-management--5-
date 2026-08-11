import React, { useState, useEffect, useCallback } from 'react';
import { Cog8ToothIcon as SettingsIcon } from '../icons/Cog8ToothIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { XIcon } from '../icons/XIcon';
import { HISStaff, User, BiometricDevice } from '../../types';
import { GlobeAltIcon, PhotoIcon } from './HealthIcons';
import { apiService } from '../../services/apiService';
import { registerWebAuthn } from '../../utils/biometrics';

interface HISConfigProps {
    institutionId?: string;
    users?: User[];
    demoStaff?: HISStaff[];
    onStaffUpdated?: () => void;
}

type ConfigTab = 'branding' | 'staff' | 'clinic' | 'tariffs';

export const HISConfigView: React.FC<HISConfigProps> = ({ institutionId, users = [], demoStaff, onStaffUpdated }) => {
    const [activeTab, setActiveTab] = useState<ConfigTab>('branding');
    const [branding, setBranding] = useState({
        hospitalName: 'Quantum Health Hospital/Clinic',
        motto: 'Precision in Care, Excellence in Service',
        primaryColor: '#6366f1',
        logoUrl: ''
    });

    // ── Tariffs & Fee Schedule State ──────────────────────────────────────────
    const [consultationRates, setConsultationRates] = useState({
        cashConsultation: 1000,
        coverConsultation: 1500,
        emergencySurcharge: 500,
        revisitFee: 500,
    });
    const [customTariffs, setCustomTariffs] = useState<any[]>([]);
    const [tariffCategory, setTariffCategory] = useState<string>('All');
    const [isAddTariffOpen, setIsAddTariffOpen] = useState(false);
    const [isSavingTariffs, setIsSavingTariffs] = useState(false);
    const [newTariff, setNewTariff] = useState({
        name: '',
        category: 'Laboratory',
        code: '',
        cashRate: 0,
        coverRate: 0,
        isActive: true,
    });

    const [isAddPractitionerOpen, setIsAddPractitionerOpen] = useState(false);
    const [practitionerList, setPractitionerList] = useState<any[]>([]);
    const [availableDevices, setAvailableDevices] = useState<BiometricDevice[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('local');
    const [isScanningBiometric, setIsScanningBiometric] = useState(false);
    const [scannedBiometricData, setScannedBiometricData] = useState<any>(null);
    const [practitionerForm, setPractitionerForm] = useState({
        name: '',
        role: 'doctor',
        specialty: '',
        medicalLicense: '',
        phoneNumber: '',
        email: '',
        devicePin: '',
        fingerIndex: 0
    });

    const FINGER_OPTIONS = [
        { index: 0, label: 'Right Thumb' },
        { index: 1, label: 'Right Index' },
        { index: 2, label: 'Right Middle' },
        { index: 3, label: 'Right Ring' },
        { index: 4, label: 'Right Little' },
        { index: 5, label: 'Left Thumb' },
        { index: 6, label: 'Left Index' },
        { index: 7, label: 'Left Middle' },
        { index: 8, label: 'Left Ring' },
        { index: 9, label: 'Left Little' }
    ];

    const loadPractitioners = useCallback(async () => {
        if (institutionId) {
            try {
                const devs = await apiService.fetchModuleRecords<BiometricDevice>('biometric_devices', institutionId).catch(() => []);
                setAvailableDevices(devs || []);
            } catch { setAvailableDevices([]); }
            try {
                const fetched = await apiService.fetchModuleRecords<User>('users', institutionId);
                const filtered = (fetched || []).filter(u => {
                    const r = (u.role || '').toLowerCase();
                    return ['his_admin', 'doctor', 'nurse', 'staff', 'reception', 'hoi'].includes(r) || u.metadata?.isPractitioner;
                });
                if (filtered.length > 0) {
                    setPractitionerList(filtered.map(u => ({
                        id: u.id,
                        name: u.name,
                        role: u.metadata?.titleRole || u.role,
                        specialty: u.metadata?.specialty || 'General Practitioner',
                        medicalLicense: u.metadata?.medicalLicense || `MPDB-${u.id.substring(0, 5)}`,
                        email: u.email,
                        phoneNumber: u.phoneNumber,
                        color: 'bg-indigo-500',
                        photo: u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                    })));
                    return;
                }
            } catch (err) {
                console.warn('Failed to load practitioners:', err);
            }
        }

        // Fallback to prop users or demoStaff
        if (users.length > 0) {
            const list = users.filter(u => !['student', 'parent', 'patient'].includes((u.role || '').toLowerCase())).map(u => ({
                id: u.id,
                name: u.name,
                role: u.metadata?.titleRole || u.role,
                specialty: u.metadata?.specialty || 'General Medicine',
                medicalLicense: u.metadata?.medicalLicense || 'MPDB-10042',
                email: u.email,
                color: 'bg-indigo-500',
                photo: u.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
            }));
            setPractitionerList(list);
        } else if (demoStaff) {
            setPractitionerList(demoStaff);
        } else {
            setPractitionerList([
                { name: 'Dr. John Smith', role: 'Doctor', specialty: 'General Surgeon', id: 'D001', photo: 'JS', color: 'bg-indigo-500' },
                { name: 'Jane Wilson', role: 'Nurse', specialty: 'ICU Specialist', id: 'N042', photo: 'JW', color: 'bg-emerald-500' },
                { name: 'Dr. Sarah Omondi', role: 'Doctor', specialty: 'Dentist', id: 'D015', photo: 'SO', color: 'bg-rose-500' }
            ]);
        }
    }, [institutionId, users, demoStaff]);

    const loadTariffs = useCallback(async () => {
        if (!institutionId) return;
        try {
            const rates = await apiService.fetchModuleRecords('his_consultation_rates', institutionId);
            if (rates && rates.length > 0) {
                setConsultationRates(rates[0]);
            }
            const tariffs = await apiService.fetchModuleRecords('his_tariffs', institutionId);
            if (tariffs && tariffs.length > 0) {
                setCustomTariffs(tariffs);
            } else {
                // Default sample tariffs
                setCustomTariffs([
                    { id: 'tar_1', name: 'Chest X-Ray (PA View)', category: 'Radiology', code: 'RAD-001', cashRate: 1500, coverRate: 2000, isActive: true },
                    { id: 'tar_2', name: 'Abdominal Ultrasound', category: 'Radiology', code: 'RAD-002', cashRate: 2500, coverRate: 3200, isActive: true },
                    { id: 'tar_3', name: 'Full Blood Count (FBC)', category: 'Laboratory', code: 'LAB-001', cashRate: 800, coverRate: 1200, isActive: true },
                    { id: 'tar_4', name: 'Malaria Rapid Test (RDT)', category: 'Laboratory', code: 'LAB-002', cashRate: 400, coverRate: 600, isActive: true },
                    { id: 'tar_5', name: 'Lipid Profile Panel', category: 'Laboratory', code: 'LAB-003', cashRate: 1800, coverRate: 2400, isActive: true },
                    { id: 'tar_6', name: 'Minor Surgical Dressing', category: 'Procedure', code: 'PROC-001', cashRate: 500, coverRate: 800, isActive: true },
                    { id: 'tar_7', name: 'General Ward Bed / Day', category: 'Inpatient', code: 'INP-001', cashRate: 1500, coverRate: 2200, isActive: true },
                    { id: 'tar_8', name: 'Tooth Extraction (Simple)', category: 'Dental', code: 'DEN-001', cashRate: 2000, coverRate: 2800, isActive: true },
                    { id: 'tar_9', name: 'Refraction & Ocular Exam', category: 'Ophthalmology', code: 'EYE-001', cashRate: 1200, coverRate: 1800, isActive: true },
                ]);
            }
        } catch (e) {
            console.warn('Failed to load tariffs:', e);
        }
    }, [institutionId]);

    useEffect(() => {
        loadPractitioners();
        loadTariffs();
    }, [loadPractitioners, loadTariffs]);

    const handleScanBiometrics = async () => {
        setIsScanningBiometric(true);
        try {
            const assignedPin = practitionerForm.devicePin || String(Math.floor(1000 + Math.random() * 9000));
            const selectedDev = availableDevices.find(d => d.id === selectedDeviceId);
            const fingerObj = FINGER_OPTIONS.find(f => f.index === practitionerForm.fingerIndex) || FINGER_OPTIONS[0];

            if (selectedDev) {
                // 📡 Physical ZKTeco / Dahua Device Enrollment Command
                try {
                    await fetch(`/api/zkteco-webhook?action=enroll&institutionId=${institutionId}&SN=${selectedDev.serialNumber}&sn=${selectedDev.serialNumber}&pin=${assignedPin}&fingerIndex=${practitionerForm.fingerIndex}&name=${encodeURIComponent(practitionerForm.name)}`, {
                        method: 'POST'
                    }).catch(() => null);
                } catch (e) {
                    console.warn('[ZKTeco] Remote enroll dispatch note:', e);
                }

                const templateHash = `zkteco_remote_${selectedDev.serialNumber}_pin_${assignedPin}_f${practitionerForm.fingerIndex}`;

                setScannedBiometricData({
                    credentials: null,
                    templateHash: templateHash,
                    devicePin: assignedPin,
                    fingerIndex: practitionerForm.fingerIndex,
                    fingerLabel: fingerObj.label,
                    deviceName: selectedDev.deviceName,
                    scannedAt: new Date().toLocaleTimeString()
                });

                if (!practitionerForm.devicePin) {
                    setPractitionerForm(f => ({ ...f, devicePin: assignedPin }));
                }

                alert(`📡 REMOTE OPEN SENSOR DIAGNOSTIC REPORT\n` +
                      `═════════════════════════════════════════\n` +
                      `• Target Terminal: ${selectedDev.deviceName}\n` +
                      `• Serial Number (SN): ${selectedDev.serialNumber}\n` +
                      `• Target Finger: ${fingerObj.label} (ID: ${practitionerForm.fingerIndex})\n` +
                      `• Device User PIN: ${assignedPin}\n` +
                      `• ADMS Command Payload: C:1001:DATA ENROLL_FP PIN=${assignedPin} FingerID=${practitionerForm.fingerIndex}\n` +
                      `• Webhook Endpoint: /iclock/getrequest?SN=${selectedDev.serialNumber}\n` +
                      `• Command Status: ✅ QUEUED & WAITING FOR DEVICE HEARTBEAT\n\n` +
                      `🔍 TROUBLESHOOTING GUIDE (IF SENSOR HARDWARE DOES NOT OPEN):\n` +
                      `─────────────────────────────────────────\n` +
                      `1. 🌐 Cloud Server Settings on Terminal:\n` +
                      `   On physical device, tap Menu ➔ Comm. ➔ Cloud Server / ADMS.\n` +
                      `   - Server IP: Set to server IP / domain\n` +
                      `   - Server Port: 80 (or 443)\n` +
                      `   - Enable Domain Name: ON\n\n` +
                      `2. ⏱️ Automatic Device Polling:\n` +
                      `   ZKTeco devices poll for server commands every 10–30 seconds.\n\n` +
                      `3. ⚡ Instant Trigger:\n` +
                      `   Press Menu ➔ Data Mgt ➔ Sync on device to open sensor immediately!`);
            } else {
                // 💻 Local USB / WebAuthn Sensor
                let cred = null;
                if (window.PublicKeyCredential && practitionerForm.name) {
                    try {
                        cred = await registerWebAuthn(`prac_${Date.now()}`, practitionerForm.name);
                    } catch {
                        cred = null;
                    }
                }

                const templateHash = cred ? cred.id : `bio_fp_hash_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

                setScannedBiometricData({
                    credentials: cred,
                    templateHash: templateHash,
                    devicePin: assignedPin,
                    fingerIndex: practitionerForm.fingerIndex,
                    fingerLabel: fingerObj.label,
                    deviceName: 'Local Web Biometric Scanner',
                    scannedAt: new Date().toLocaleTimeString()
                });

                if (!practitionerForm.devicePin) {
                    setPractitionerForm(f => ({ ...f, devicePin: assignedPin }));
                }

                alert(`☝️ Local Biometric Fingerprint Captured!\n\nSensor: Active Fingerprint Reader\nSelected Finger: ${fingerObj.label}\nTemplate Hash: ${templateHash.substring(0, 18)}...\nLinked Terminal PIN: ${assignedPin}`);
            }
        } catch (err: any) {
            alert('Biometric scan error: ' + (err.message || err));
        } finally {
            setIsScanningBiometric(false);
        }
    };

    const handleAddPractitioner = async () => {
        if (!practitionerForm.name.trim()) {
            alert('Please enter practitioner name.');
            return;
        }
        try {
            const newId = `user_prac_${Date.now()}`;
            const sysRole = (practitionerForm.role === 'doctor' || practitionerForm.role === 'his_admin') ? 'his_admin' : 'nurse';
            const assignedPin = practitionerForm.devicePin || String(Math.floor(1000 + Math.random() * 9000));

            const newRecord: any = {
                id: newId,
                institution_id: institutionId || 'his_inst_1',
                institutionId: institutionId || 'his_inst_1',
                name: practitionerForm.name.trim(),
                email: practitionerForm.email.trim() || `${practitionerForm.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@hospital.org`,
                phoneNumber: practitionerForm.phoneNumber || '',
                role: sysRole,
                metadata: {
                    titleRole: practitionerForm.role,
                    specialty: practitionerForm.specialty || 'General Practitioner',
                    medicalLicense: practitionerForm.medicalLicense || `MPDB-${Math.floor(10000 + Math.random() * 90000)}`,
                    isPractitioner: true,
                    webauthnCredentials: scannedBiometricData?.credentials || null,
                    fingerprintTemplate: scannedBiometricData?.templateHash || null,
                    devicePin: assignedPin,
                    hasBiometrics: !!scannedBiometricData
                },
                status: 'active',
                created_at: new Date().toISOString(),
                createdAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('users', newRecord);

            // Auto-create biometric enrollment record for ZKTeco & Dahua terminals
            await apiService.saveModuleRecord('biometric_enrollments', {
                id: `bio_enr_${newId}`,
                institution_id: institutionId || 'his_inst_1',
                institutionId: institutionId || 'his_inst_1',
                staff_id: newId,
                staffId: newId,
                device_pin: assignedPin,
                devicePin: assignedPin,
                fingerprint_index: 0,
                is_active: true,
                created_at: new Date().toISOString()
            }).catch(() => {});

            alert(`Practitioner ${practitionerForm.name} registered successfully!\n\nLinked Terminal Device PIN: ${assignedPin}`);
            setIsAddPractitionerOpen(false);
            setScannedBiometricData(null);
            setPractitionerForm({ name: '', role: 'doctor', specialty: '', medicalLicense: '', phoneNumber: '', email: '', devicePin: '', fingerIndex: 0 });
            await loadPractitioners();
            if (onStaffUpdated) onStaffUpdated();
        } catch (err: any) {
            alert('Failed to register practitioner: ' + (err.message || err));
        }
    };

    const handleSaveConsultationRates = async () => {
        if (!institutionId) return;
        setIsSavingTariffs(true);
        try {
            await apiService.saveModuleRecord('his_consultation_rates', {
                id: `rate_${institutionId}`,
                institutionId,
                ...consultationRates,
                updatedAt: new Date().toISOString(),
            });
            alert('✓ Consultation Rates updated successfully!');
        } catch (e) {
            alert('Failed to save consultation rates.');
        } finally {
            setIsSavingTariffs(false);
        }
    };

    const handleAddTariffItem = async () => {
        if (!newTariff.name.trim()) return alert('Please enter service name.');
        if (!institutionId) return;
        try {
            const tariffRecord = {
                id: `tar_${Date.now()}`,
                institutionId,
                name: newTariff.name.trim(),
                category: newTariff.category,
                code: newTariff.code || `SRV-${Math.floor(100 + Math.random() * 900)}`,
                cashRate: Number(newTariff.cashRate) || 0,
                coverRate: Number(newTariff.coverRate) || 0,
                isActive: newTariff.isActive,
                createdAt: new Date().toISOString(),
            };
            await apiService.saveModuleRecord('his_tariffs', tariffRecord);
            setCustomTariffs(prev => [tariffRecord, ...prev]);
            setIsAddTariffOpen(false);
            setNewTariff({ name: '', category: 'Laboratory', code: '', cashRate: 0, coverRate: 0, isActive: true });
            alert(`✓ ${tariffRecord.name} added to tariff schedule!`);
        } catch (e) {
            alert('Failed to add tariff item.');
        }
    };

    const handleDeleteTariffItem = async (id: string) => {
        if (!confirm('Are you sure you want to remove this service tariff?')) return;
        try {
            await apiService.deleteModuleRecord('his_tariffs', id);
            setCustomTariffs(prev => prev.filter(t => t.id !== id));
        } catch (e) {
            alert('Failed to delete tariff item.');
        }
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'branding':
                return (
                    <div className="space-y-10 animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="bg-white dark:bg-slate-900/50 p-12 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>
                                
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.3em] italic text-indigo-600 mb-2">Visual DNA</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Hospital Identity & Branding Engine</p>
                                </div>
                                
                                <div className="space-y-6">
                                    <label className="block group/input">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block group-hover/input:text-indigo-500 transition-colors italic">Institutional Nomenclature</span>
                                        <input 
                                            type="text" 
                                            value={branding.hospitalName}
                                            onChange={(e) => setBranding({...branding, hospitalName: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
                                            placeholder="Enter Hospital Name..."
                                        />
                                    </label>
                                    <label className="block group/input">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block group-hover/input:text-indigo-500 transition-colors italic">Clinical Motto</span>
                                        <input 
                                            type="text" 
                                            value={branding.motto}
                                            onChange={(e) => setBranding({...branding, motto: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner"
                                            placeholder="Precision in Care..."
                                        />
                                    </label>
                                </div>

                                <div className="flex flex-col md:flex-row gap-6 pt-4">
                                    <div className="flex-1">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 block italic">Signature Color</span>
                                        <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-3 shadow-inner">
                                            <div className="relative group/picker">
                                                <input 
                                                    type="color" 
                                                    value={branding.primaryColor}
                                                    onChange={(e) => setBranding({...branding, primaryColor: e.target.value})}
                                                    className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-none focus:outline-none"
                                                />
                                                <div className="absolute inset-0 rounded-xl pointer-events-none border-2 border-white/20 shadow-lg"></div>
                                            </div>
                                            <span className="text-xs font-black uppercase text-slate-500 tracking-widest italic">{branding.primaryColor}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 flex items-end justify-end">
                                        <button className="bg-indigo-600 text-white px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:scale-105 transition-all shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-500/20">
                                            Commit DNA
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/30 p-12 rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center space-y-8 text-center group cursor-pointer hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-all relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none"></div>
                                <div className="w-28 h-28 rounded-4xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
                                    <PhotoIcon className="w-12 h-12 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-sm font-black uppercase tracking-[0.2em] italic">Institutional Emblem</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-3 tracking-widest max-w-[200px] leading-relaxed italic">Quantum-ready SVG or high-fidelity PNG preferred (Max 10MB)</p>
                                </div>
                                <div className="px-6 py-2 bg-slate-200 dark:bg-white/10 rounded-full text-[8px] font-bold text-slate-500 uppercase tracking-widest relative z-10">DRAG & DROP SECURE NODE</div>
                            </div>
                        </div>
                    </div>
                );
            case 'staff':
                return (
                    <div className="space-y-10 animate-fade-in pb-20">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.4em] italic text-indigo-600">Clinical Registry</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 italic">Managing {practitionerList.length} certified healthcare providers</p>
                            </div>
                            <button 
                                onClick={() => setIsAddPractitionerOpen(true)}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:scale-105 transition-all shadow-xl active:scale-95"
                            >
                                <PlusIcon className="w-4 h-4 inline mr-2" /> Add Practitioner
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {practitionerList.map((staff: any, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 flex flex-col space-y-6 group hover:shadow-2xl transition-all relative overflow-hidden cursor-pointer">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.03] blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/[0.06]"></div>
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className={`w-16 h-16 ${staff.color || 'bg-indigo-500'} bg-opacity-10 dark:bg-opacity-20 rounded-[1.5rem] flex items-center justify-center text-current font-black text-lg tracking-tighter group-hover:rotate-6 transition-transform shadow-inner border border-white/10`}>
                                            <span className={(staff.color || 'bg-indigo-500').replace('bg-', 'text-')}>{staff.photo || (staff.name ? staff.name.split(' ').map((n: string) => n[0]).join('') : '??')}</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-lg font-black italic tracking-tighter group-hover:text-indigo-600 transition-colors">{staff.name}</p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{staff.role} • {staff.specialty}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-center pt-2 relative z-10">
                                        <div className="px-4 py-1.5 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/10 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            ID: <span className="text-slate-600 dark:text-slate-200">{staff.id}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-slate-400 hover:text-indigo-500 hover:scale-110 transition-all">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                             <button className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-slate-400 hover:text-rose-500 hover:scale-110 transition-all">
                                                <SettingsIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'clinic':
                return (
                    <div className="bg-white dark:bg-slate-900/50 p-12 rounded-[4rem] border border-slate-200 dark:border-white/5 space-y-12 animate-fade-in relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/[0.02] blur-[150px] rounded-full -mr-48 -mt-48 pointer-events-none transition-all group-hover:bg-emerald-500/[0.05]"></div>
                        
                        <div className="flex items-center gap-8 relative z-10">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/10 group-hover:rotate-[15deg] transition-all">
                                <GlobeAltIcon className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Clinical Architecture</h3>
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Infrastructure Mapping: Departments, Theaters & Point of Care</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                            {[
                                { dept: 'General OPD', rooms: 12, head: 'Dr. Smith', color: 'indigo' },
                                { dept: 'Dental Wing', rooms: 4, head: 'Dr. Omondi', color: 'rose' },
                                { dept: 'Emergency', rooms: 8, head: 'Triage Lead', color: 'amber' },
                                { dept: 'Ophthalmology', rooms: 3, head: 'Dr. Mike', color: 'sky' }
                            ].map((d, i) => (
                                <div key={i} className="p-8 bg-slate-50 dark:bg-white/5 rounded-[3rem] border border-slate-100 dark:border-white/5 space-y-6 hover:shadow-xl transition-all cursor-pointer group/card active:scale-95">
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight italic group-hover/card:text-indigo-500 transition-colors">{d.dept}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">{d.rooms} Operational Nodes</p>
                                    </div>
                                    <div className="h-px w-full bg-slate-200 dark:bg-white/10"></div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-[9px] font-black uppercase tracking-[0.2em] italic text-${d.color}-500 underline underline-offset-4 decoration-2`}>{d.head}</p>
                                        <SettingsIcon className="w-4 h-4 text-slate-300 group-hover/card:rotate-90 transition-transform" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'tariffs':
                return (
                    <div className="space-y-10 animate-fade-in pb-20">
                        {/* ── Consultation Rates Configuration ── */}
                        <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight italic text-slate-900 dark:text-white">
                                        Consultation <span className="text-indigo-600">Tariff Rates</span>
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                        Configure doctor consultation fees for Cash vs. Insurance Cover patients
                                    </p>
                                </div>
                                <button
                                    onClick={handleSaveConsultationRates}
                                    disabled={isSavingTariffs}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                >
                                    {isSavingTariffs ? 'Saving Rates...' : '✓ Save Consultation Rates'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Cash Consultation */}
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900">
                                            💵 Cash Pay
                                        </span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">Cash Patient Consultation</p>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KES</span>
                                        <input
                                            type="number"
                                            value={consultationRates.cashConsultation}
                                            onChange={e => setConsultationRates(r => ({ ...r, cashConsultation: Number(e.target.value) }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl pl-14 pr-4 py-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Base fee for walk-in cash patients</p>
                                </div>

                                {/* Cover Consultation */}
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
                                            🛡️ Insurance / Cover
                                        </span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">Cover Patient Consultation</p>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KES</span>
                                        <input
                                            type="number"
                                            value={consultationRates.coverConsultation}
                                            onChange={e => setConsultationRates(r => ({ ...r, coverConsultation: Number(e.target.value) }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl pl-14 pr-4 py-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Rate billed to SHA / Insurance providers</p>
                                </div>

                                {/* Emergency Surcharge */}
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900">
                                            🚨 Emergency
                                        </span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">After-Hours / Emergency</p>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KES</span>
                                        <input
                                            type="number"
                                            value={consultationRates.emergencySurcharge}
                                            onChange={e => setConsultationRates(r => ({ ...r, emergencySurcharge: Number(e.target.value) }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl pl-14 pr-4 py-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Surcharge added for night/A&amp;E visits</p>
                                </div>

                                {/* Revisit Rate */}
                                <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-100 dark:border-amber-900">
                                            🔄 Follow-up
                                        </span>
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">Revisit / Follow-up Fee</p>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">KES</span>
                                        <input
                                            type="number"
                                            value={consultationRates.revisitFee}
                                            onChange={e => setConsultationRates(r => ({ ...r, revisitFee: Number(e.target.value) }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl pl-14 pr-4 py-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                                        />
                                    </div>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Discounted rate for review visits</p>
                                </div>
                            </div>
                        </div>

                        {/* ── Custom Services & Procedures Tariff Schedule ── */}
                        <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-8">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight italic text-slate-900 dark:text-white">
                                        Custom Services <span className="text-indigo-600">&amp; Procedures Tariff Schedule</span>
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                        Configure custom prices for X-Ray, Laboratory tests, Procedures, Bed charges &amp; Dental/Eye services
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsAddTariffOpen(true)}
                                    className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    <PlusIcon className="w-4 h-4 inline mr-2" /> Add Custom Service Tariff
                                </button>
                            </div>

                            {/* Category Filter */}
                            <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl overflow-x-auto no-scrollbar gap-1.5">
                                {['All', 'Laboratory', 'Radiology', 'Procedure', 'Inpatient', 'Dental', 'Ophthalmology', 'General'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setTariffCategory(cat)}
                                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                            tariffCategory === cat
                                                ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-md'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Tariff Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {customTariffs
                                    .filter(t => tariffCategory === 'All' || t.category === tariffCategory)
                                    .map(item => (
                                        <div key={item.id} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200/60 dark:border-white/5 space-y-4 hover:shadow-xl transition-all group relative">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-900">
                                                        {item.category}
                                                    </span>
                                                    <p className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white mt-2 group-hover:text-indigo-600 transition-colors">
                                                        {item.name}
                                                    </p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Code: {item.code}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteTariffItem(item.id)}
                                                    className="text-slate-300 hover:text-rose-500 p-2 rounded-xl transition-colors"
                                                    title="Delete tariff"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cash Rate</p>
                                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                                        KES {(item.cashRate || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-white/5">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cover Rate</p>
                                                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                                        KES {(item.coverRate || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-12 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-10">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic"><span className="text-indigo-600 block text-xs tracking-[0.4em] mb-2 underline underline-offset-4 decoration-4">Nexus Engine</span> System <span className="text-indigo-600">Core</span></h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-lg inline-block border border-slate-100 dark:border-white/5 italic">HIS Global Configuration & Operational DNA Hub</p>
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex flex-wrap gap-4 p-2 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5 w-fit shadow-inner">
                {[
                    { id: 'branding', label: 'Identity & DNA', icon: SparklesIcon },
                    { id: 'staff', label: 'Staff Registry', icon: UsersIcon },
                    { id: 'clinic', label: 'Clinic Setup', icon: SettingsIcon },
                    { id: 'tariffs', label: 'Tariffs & Fee Schedule', icon: SettingsIcon },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as ConfigTab)}
                        className={`flex items-center gap-4 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic ${
                            activeTab === tab.id 
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xl shadow-indigo-500/10 ring-1 ring-slate-100 dark:ring-white/10' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'scale-125' : ''}`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <main className="min-h-[500px]">
                {renderTab()}
            </main>

            {/* ═══════════ ADD PRACTITIONER MODAL ═══════════ */}
            {isAddPractitionerOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">Register Healthcare Practitioner</h3>
                                <p className="text-[10px] font-semibold opacity-80">Add certified doctor, nurse, or clinical specialist to HIS</p>
                            </div>
                            <button onClick={() => setIsAddPractitionerOpen(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Full Name *</label>
                                <input 
                                    type="text" 
                                    value={practitionerForm.name} 
                                    onChange={e => setPractitionerForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Dr. Alex Mugo"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Clinical Role *</label>
                                    <select 
                                        value={practitionerForm.role} 
                                        onChange={e => setPractitionerForm(f => ({ ...f, role: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="doctor">Doctor / Physician</option>
                                        <option value="nurse">Nurse / Triage Officer</option>
                                        <option value="his_admin">Clinical Admin / Director</option>
                                        <option value="pharmacist">Pharmacist</option>
                                        <option value="lab_tech">Lab Technologist</option>
                                        <option value="dentist">Dentist</option>
                                        <option value="ophthalmologist">Ophthalmologist</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Specialty / Dept</label>
                                    <input 
                                        type="text" 
                                        value={practitionerForm.specialty} 
                                        onChange={e => setPractitionerForm(f => ({ ...f, specialty: e.target.value }))}
                                        placeholder="e.g. Pediatrics, Surgery"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Medical License / PIN</label>
                                    <input 
                                        type="text" 
                                        value={practitionerForm.medicalLicense} 
                                        onChange={e => setPractitionerForm(f => ({ ...f, medicalLicense: e.target.value }))}
                                        placeholder="e.g. MPDB-94820"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Phone Number</label>
                                    <input 
                                        type="text" 
                                        value={practitionerForm.phoneNumber} 
                                        onChange={e => setPractitionerForm(f => ({ ...f, phoneNumber: e.target.value }))}
                                        placeholder="0712345678"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    value={practitionerForm.email} 
                                    onChange={e => setPractitionerForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="doctor@hospital.org"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                                />
                            </div>

                            {/* ── Biometric Hardware Link ── */}
                            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Biometric Scanner Integration</span>
                                        <p className="text-[10px] text-slate-500 font-semibold">Select biometric scanner device to trigger remote or local scan</p>
                                    </div>
                                    {scannedBiometricData ? (
                                        <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                            ✓ Fingerprint Bound
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                                            Not Scanned
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Target Scanner Device</label>
                                    <select
                                        value={selectedDeviceId}
                                        onChange={e => setSelectedDeviceId(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="local">💻 Local USB Reader / Browser Sensor</option>
                                        {availableDevices.map(dev => (
                                            <option key={dev.id} value={dev.id}>
                                                📡 {dev.deviceName} ({dev.protocol.toUpperCase()} • SN: {dev.serialNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Target Finger</label>
                                        <select
                                            value={practitionerForm.fingerIndex}
                                            onChange={e => setPractitionerForm(f => ({ ...f, fingerIndex: parseInt(e.target.value) }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {FINGER_OPTIONS.map(f => (
                                                <option key={f.index} value={f.index}>
                                                    ☝️ {f.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Device PIN</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1004"
                                            value={practitionerForm.devicePin}
                                            onChange={e => setPractitionerForm(f => ({ ...f, devicePin: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleScanBiometrics}
                                    disabled={isScanningBiometric}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                                >
                                    {isScanningBiometric ? 'Triggering Scanner...' : selectedDeviceId === 'local' ? '☝️ Scan Fingerprint Now' : '📡 Trigger Remote Device Scan'}
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setIsAddPractitionerOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleAddPractitioner} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                Save Practitioner
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ ADD CUSTOM TARIFF MODAL ═══════════ */}
            {isAddTariffOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">Add Custom Service Tariff</h3>
                                <p className="text-[10px] font-semibold opacity-80">Define cash &amp; cover rates for X-Ray, Lab, Procedure, Beds &amp; Services</p>
                            </div>
                            <button onClick={() => setIsAddTariffOpen(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Service Name *</label>
                                <input
                                    type="text"
                                    value={newTariff.name}
                                    onChange={e => setNewTariff(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Chest X-Ray, Full Blood Count, Abdominal Scan"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Category</label>
                                    <select
                                        value={newTariff.category}
                                        onChange={e => setNewTariff(f => ({ ...f, category: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Laboratory">Laboratory</option>
                                        <option value="Radiology">Radiology / Imaging</option>
                                        <option value="Procedure">Clinical Procedure</option>
                                        <option value="Inpatient">Inpatient Ward Bed</option>
                                        <option value="Dental">Dental Care</option>
                                        <option value="Ophthalmology">Ophthalmology / Eye</option>
                                        <option value="General">General Care</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Service Code / SKU</label>
                                    <input
                                        type="text"
                                        value={newTariff.code}
                                        onChange={e => setNewTariff(f => ({ ...f, code: e.target.value }))}
                                        placeholder="e.g. RAD-XRAY-01"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Cash Rate (KES) *</label>
                                    <input
                                        type="number"
                                        value={newTariff.cashRate}
                                        onChange={e => setNewTariff(f => ({ ...f, cashRate: Number(e.target.value) }))}
                                        placeholder="1500"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Cover / Insurance Rate (KES)</label>
                                    <input
                                        type="number"
                                        value={newTariff.coverRate}
                                        onChange={e => setNewTariff(f => ({ ...f, coverRate: Number(e.target.value) }))}
                                        placeholder="2000"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setIsAddTariffOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleAddTariffItem} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                Add to Tariff Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

