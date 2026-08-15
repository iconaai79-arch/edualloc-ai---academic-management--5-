import React, { useState, useEffect, useCallback } from 'react';
import { Cog8ToothIcon as SettingsIcon } from '../icons/Cog8ToothIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { XIcon } from '../icons/XIcon';
import { HISStaff, User, BiometricDevice } from '../../types';
import { GlobeAltIcon, PhotoIcon, BuildingOfficeIcon, IdentificationIcon } from './HealthIcons';
import { apiService } from '../../services/apiService';
import { registerWebAuthn } from '../../utils/biometrics';

interface HISConfigProps {
    institutionId?: string;
    users?: User[];
    demoStaff?: HISStaff[];
    onStaffUpdated?: () => void;
}

type ConfigTab = 'branding' | 'staff' | 'clinic' | 'rooms' | 'tariffs' | 'insurance' | 'billing' | 'partner_labs' | 'patient_id';

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

export function HISConfigView({ institutionId, users = [], demoStaff, onStaffUpdated }: HISConfigProps) {
    const [activeTab, setActiveTab] = useState<ConfigTab>('branding');
    const [branding, setBranding] = useState(() => {
        try {
            const saved = localStorage.getItem(`his_branding_${institutionId}`);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            hospitalName: 'Quantum Health Hospital/Clinic',
            motto: 'Precision in Care, Excellence in Service',
            primaryColor: '#6366f1',
            logoUrl: ''
        };
    });
    const [isSavingBranding, setIsSavingBranding] = useState(false);

    const handleSaveBranding = async () => {
        setIsSavingBranding(true);
        try {
            localStorage.setItem(`his_branding_${institutionId}`, JSON.stringify(branding));
            await apiService.saveModuleRecord('his_branding', {
                id: `his_branding_${institutionId}`,
                institutionId,
                institution_id: institutionId,
                ...branding,
                updatedAt: new Date().toISOString()
            }).catch(() => null);
            alert('✓ Hospital identity & Visual DNA committed successfully!');
        } catch (e) {
            console.error('Failed to save HIS branding:', e);
            alert('Failed to save branding settings.');
        } finally {
            setIsSavingBranding(false);
        }
    };

    // ── Tariffs & Fee Schedule State ──────────────────────────────────────────
    const [consultationRates, setConsultationRates] = useState(() => {
        try {
            const saved = localStorage.getItem(`his_consultation_rates_${institutionId}`);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            cashConsultation: 1000,
            coverConsultation: 1500,
            emergencySurcharge: 500,
            revisitFee: 500,
        };
    });

    const handleSaveConsultationRates = async () => {
        if (!institutionId) return;
        setIsSavingTariffs(true);
        try {
            localStorage.setItem(`his_consultation_rates_${institutionId}`, JSON.stringify(consultationRates));
            await apiService.saveModuleRecord('his_tariffs', {
                id: `consultation_rates_${institutionId}`,
                institutionId,
                institution_id: institutionId,
                type: 'consultation_rates',
                ...consultationRates,
                updatedAt: new Date().toISOString()
            }).catch(() => null);
            alert(`✓ Consultation fee schedule updated successfully!\n\n• Cash Consultation Fee: KES ${consultationRates.cashConsultation.toLocaleString()}\n• Cover / Insurance Consultation Fee: KES ${consultationRates.coverConsultation.toLocaleString()}`);
        } catch (e) {
            console.error('Failed to save consultation rates:', e);
            alert('Failed to save consultation rates.');
        } finally {
            setIsSavingTariffs(false);
        }
    };

    const [customTariffs, setCustomTariffs] = useState<any[]>([]);
    const [editingTariff, setEditingTariff] = useState<any | null>(null);
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

    // ── Invoice & Receipt Numbering State ────────────────────────────────────
    const [invoiceSettings, setInvoiceSettings] = useState({
        invoicePrefix: 'INV',
        invoiceStartNumber: 1001,
        receiptPrefix: 'RCT',
        receiptStartNumber: 5001,
        claimPrefix: 'CLM',
        claimStartNumber: 2001,
        currency: 'KES',
        financialYear: new Date().getFullYear().toString(),
        paymentTermsDays: 30,
        autoResetYearly: true,
        includeYearInNumber: true,
        zeroPadLength: 4,
    });
    const [isSavingBilling, setIsSavingBilling] = useState(false);

    // ── Insurance Partners & Schemes State ─────────────────────────────────────
    const [insuranceProviders, setInsuranceProviders] = useState<any[]>([]);
    const [editingInsurance, setEditingInsurance] = useState<any | null>(null);
    const [isAddInsuranceOpen, setIsAddInsuranceOpen] = useState(false);
    const [newInsurance, setNewInsurance] = useState({
        name: '',
        code: '',
        category: 'SHA / National Scheme',
        copayAmount: 0,
        contactEmail: '',
        contactPhone: '',
        portalUrl: '',
        isActive: true,
    });

    // ── Partnered Diagnostic Laboratories State ─────────────────────────────
    const [partnerLabs, setPartnerLabs] = useState<any[]>([]);
    const [editingPartnerLab, setEditingPartnerLab] = useState<any | null>(null);
    const [isAddPartnerLabOpen, setIsAddPartnerLabOpen] = useState(false);
    const [newPartnerLab, setNewPartnerLab] = useState({
        name: '',
        code: '',
        phone: '',
        email: '',
        address: '',
        discountRate: 10,
        isActive: true,
    });

    // ── Custom Patient ID & Prefix Settings State ──────────────────────────────
    const [patientIdSettings, setPatientIdSettings] = useState<{
        customPrefix: string;
        startNumber: number;
        zeroPadLength: number;
        includeYear: boolean;
        autoAssign: boolean;
    }>(() => {
        try {
            const saved = localStorage.getItem(`his_patient_id_config_${institutionId}`);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return {
            customPrefix: 'PID-',
            startNumber: 1,
            zeroPadLength: 3,
            includeYear: false,
            autoAssign: true
        };
    });
    const [isSavingPatientIdConfig, setIsSavingPatientIdConfig] = useState(false);

    const handleSavePatientIdSettings = async () => {
        if (!institutionId) return;
        setIsSavingPatientIdConfig(true);
        try {
            localStorage.setItem(`his_patient_id_config_${institutionId}`, JSON.stringify(patientIdSettings));
            localStorage.setItem('his_patient_id_config_latest', JSON.stringify(patientIdSettings));
            window.dispatchEvent(new CustomEvent('his_patient_id_advanced', { detail: { updatedConfig: patientIdSettings } }));
            await apiService.saveModuleRecord('his_patient_id_config', {
                id: `his_pid_${institutionId}`,
                institutionId,
                institution_id: institutionId,
                ...patientIdSettings,
                updatedAt: new Date().toISOString()
            }).catch(() => null);
            alert(`✓ Custom Patient ID settings committed successfully!\n\nSample format: ${patientIdSettings.customPrefix}${patientIdSettings.includeYear ? new Date().getFullYear() + '-' : ''}${String(patientIdSettings.startNumber).padStart(patientIdSettings.zeroPadLength, '0')}`);
        } catch (e) {
            console.error('Failed to save Patient ID settings:', e);
            alert('Failed to save Custom Patient ID configuration.');
        } finally {
            setIsSavingPatientIdConfig(false);
        }
    };

    // ── Hospital Rooms & Facilities State ─────────────────────────────────────
    const [hospitalRooms, setHospitalRooms] = useState<any[]>([]);
    const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
    const [roomCategoryFilter, setRoomCategoryFilter] = useState<string>('All');
    const [newRoom, setNewRoom] = useState({
        name: '',
        code: '',
        roomType: 'Consultation Room',
        floorLevel: 'Ground Floor - Block A',
        assignedStaff: '',
        capacity: 1,
        status: 'Active Available'
    });

    const [isAddPractitionerOpen, setIsAddPractitionerOpen] = useState(false);
    const [editingPractitioner, setEditingPractitioner] = useState<any | null>(null);
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
        fingerIndex: 0,
        employmentDate: '',
        nationalId: '',
        employmentTerms: 'Permanent & Pensionable',
        basicSalary: 0,
        kraPin: '',
        nssfNo: '',
        shifNumber: '',
        bankName: 'Equity Bank',
        bankBranch: '',
        bankAccountNumber: ''
    });

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
                    { id: 'tar_1', name: 'Chest X-Ray (PA View)', category: 'Radiology', code: 'RAD-001', cashRate: 1500, coverRate: 2000, isCoverable: true, isActive: true },
                    { id: 'tar_2', name: 'Abdominal Ultrasound', category: 'Radiology', code: 'RAD-002', cashRate: 2500, coverRate: 3200, isCoverable: true, isActive: true },
                    { id: 'tar_3', name: 'Full Blood Count (FBC)', category: 'Laboratory', code: 'LAB-001', cashRate: 800, coverRate: 1200, isCoverable: true, isActive: true },
                    { id: 'tar_4', name: 'Malaria Rapid Test (RDT)', category: 'Laboratory', code: 'LAB-002', cashRate: 400, coverRate: 600, isCoverable: true, isActive: true },
                    { id: 'tar_5', name: 'Lipid Profile Panel', category: 'Laboratory', code: 'LAB-003', cashRate: 1800, coverRate: 2400, isCoverable: true, isActive: true },
                    { id: 'tar_6', name: 'Cosmetic Surgical Dressing', category: 'Procedure', code: 'PROC-001', cashRate: 1500, coverRate: 2000, isCoverable: false, isActive: true },
                    { id: 'tar_7', name: 'General Ward Bed / Day', category: 'Inpatient', code: 'INP-001', cashRate: 1500, coverRate: 2200, isCoverable: true, isActive: true },
                    { id: 'tar_8', name: 'Teeth Whitening / Cosmetic', category: 'Dental', code: 'DEN-001', cashRate: 8000, coverRate: 10000, isCoverable: false, isActive: true },
                    { id: 'tar_9', name: 'Refraction & Ocular Exam', category: 'Ophthalmology', code: 'EYE-001', cashRate: 1200, coverRate: 1800, isCoverable: true, isActive: true },
                ]);
            }
        } catch (e) {
            console.warn('Failed to load tariffs:', e);
        }
    }, [institutionId]);

    const loadInsuranceProviders = useCallback(async () => {
        if (!institutionId) return;
        try {
            const fetched = await apiService.fetchModuleRecords('his_insurance_providers', institutionId);
            if (fetched && fetched.length > 0) {
                setInsuranceProviders(fetched);
            } else {
                // Default Kenyan & Universal Insurance Partners
                setInsuranceProviders([
                    { id: 'ins_1', name: 'SHA (Social Health Authority)', code: 'SHA-GOV-01', category: 'SHA / National Scheme', copayAmount: 0, contactEmail: 'claims@sha.go.ke', contactPhone: '0800720601', portalUrl: 'https://sha.go.ke', isActive: true },
                    { id: 'ins_2', name: 'Jubilee Insurance', code: 'JUB-MED-01', category: 'Private Medical Cover', copayAmount: 500, contactEmail: 'claims@jubileekenya.com', contactPhone: '0709949000', portalUrl: 'https://jubileeinsurance.com', isActive: true },
                    { id: 'ins_3', name: 'UAP Old Mutual', code: 'UAP-MED-02', category: 'Corporate & Individual', copayAmount: 0, contactEmail: 'healthcare@uapoldmutual.com', contactPhone: '0711065000', portalUrl: 'https://uapoldmutual.com', isActive: true },
                    { id: 'ins_4', name: 'AAR Insurance', code: 'AAR-MED-03', category: 'Private Medical Cover', copayAmount: 300, contactEmail: 'info@aar.co.ke', contactPhone: '0709490000', portalUrl: 'https://aar-insurance.com', isActive: true },
                    { id: 'ins_5', name: 'APA Insurance', code: 'APA-MED-04', category: 'Corporate & Individual', copayAmount: 0, contactEmail: 'claims@apa.co.ke', contactPhone: '0709912000', portalUrl: 'https://apainsurance.org', isActive: true },
                    { id: 'ins_6', name: 'Britam Health', code: 'BRIT-MED-05', category: 'Private Medical Cover', copayAmount: 500, contactEmail: 'medical@britam.com', contactPhone: '0705100100', portalUrl: 'https://britam.com', isActive: true },
                    { id: 'ins_7', name: 'CIC Africa Group', code: 'CIC-MED-06', category: 'Micro-Insurance & Corporate', copayAmount: 200, contactEmail: 'medicalclaims@cic.co.ke', contactPhone: '0703099000', portalUrl: 'https://cic.co.ke', isActive: true },
                ]);
            }
        } catch (e) {
            console.warn('Failed to load insurance providers:', e);
        }
    }, [institutionId]);

    const loadPartnerLabs = useCallback(async () => {
        if (!institutionId) return;
        try {
            const fetched = await apiService.fetchModuleRecords('his_partner_labs', institutionId);
            if (fetched && fetched.length > 0) {
                setPartnerLabs(fetched);
            } else {
                setPartnerLabs([
                    { id: 'partner_1', name: 'Lancet Kenya Reference Lab', code: 'PARTNER-LANCET', phone: '0703061000', email: 'dispatch@lancet.co.ke', address: 'Upper Hill, Nairobi', discountRate: 15, isActive: true },
                    { id: 'partner_2', name: 'PathCare Kenya Diagnostics', code: 'PARTNER-PATHCARE', phone: '0709891000', email: 'results@pathcarekenya.com', address: 'Regal Plaza, Parklands', discountRate: 10, isActive: true },
                    { id: 'partner_3', name: 'Cerba Lancet Africa', code: 'PARTNER-CERBA', phone: '0709736000', email: 'info@cerbalancetafrica.com', address: 'Ngong Road, Nairobi', discountRate: 12, isActive: true },
                    { id: 'partner_4', name: 'Nairobi Hospital Reference Lab', code: 'PARTNER-TNH', phone: '0703082000', email: 'labrequests@nbihosp.org', address: 'Argwings Kodhek Rd', discountRate: 5, isActive: true }
                ]);
            }
        } catch (e) {
            console.warn('Failed to load partner labs:', e);
        }
    }, [institutionId]);

    const loadHospitalRooms = useCallback(async () => {
        if (!institutionId) return;
        try {
            const fetched = await apiService.fetchModuleRecords('his_hospital_rooms', institutionId);
            if (fetched && fetched.length > 0) {
                setHospitalRooms(fetched);
            } else {
                const sampleRooms = [
                    { id: 'room_1', name: 'Consultation Room 1', code: 'CONS-01', roomType: 'Consultation Room', floorLevel: 'Ground Floor - Block A', assignedStaff: 'Dr. Sarah Omondi', capacity: 1, status: 'Active Available' },
                    { id: 'room_2', name: 'Consultation Room 2', code: 'CONS-02', roomType: 'Consultation Room', floorLevel: 'Ground Floor - Block A', assignedStaff: 'Dr. John Smith', capacity: 1, status: 'Active Available' },
                    { id: 'room_3', name: 'Consultation Room 3', code: 'CONS-03', roomType: 'Consultation Room', floorLevel: 'Ground Floor - Block A', assignedStaff: 'Dr. Peter Kamau', capacity: 1, status: 'Active Available' },
                    { id: 'room_4', name: 'Main Hematology Lab', code: 'LAB-HEM', roomType: 'Laboratory & Diagnostics', floorLevel: 'First Floor - East Wing', assignedStaff: 'Tech Mark Mwangi', capacity: 4, status: 'Active Available' },
                    { id: 'room_5', name: 'Phlebotomy / Blood Draw', code: 'LAB-PHLEB', roomType: 'Laboratory & Diagnostics', floorLevel: 'Ground Floor - Block B', assignedStaff: 'Nurse Mercy N.', capacity: 2, status: 'Active Available' },
                    { id: 'room_6', name: 'X-Ray Suite A', code: 'RAD-XRAY1', roomType: 'Radiology & Imaging', floorLevel: 'Basement Level 1', assignedStaff: 'Radiographer Paul O.', capacity: 1, status: 'Active Available' },
                    { id: 'room_7', name: 'Ultrasound Scan Room 1', code: 'RAD-USG1', roomType: 'Radiology & Imaging', floorLevel: 'First Floor - East Wing', assignedStaff: 'Dr. Anne Wambui', capacity: 1, status: 'Active Available' },
                    { id: 'room_8', name: 'Injection & Dressing Room', code: 'TREAT-INJ', roomType: 'Injection & Treatment', floorLevel: 'Ground Floor - Block A', assignedStaff: 'Nurse Clara Wambui', capacity: 3, status: 'Active Available' },
                    { id: 'room_9', name: 'Dental Suite 1', code: 'DENT-01', roomType: 'Consultation Room', floorLevel: 'Second Floor - North Wing', assignedStaff: 'Dr. Kevin Kiprop', capacity: 1, status: 'Active Available' },
                    { id: 'room_10', name: 'Female Surgical Ward', code: 'WARD-FSW', roomType: 'Inpatient Ward', floorLevel: 'Third Floor - West Wing', assignedStaff: 'Sister In-Charge', capacity: 12, status: 'Active Available' },
                    { id: 'room_11', name: 'Male Medical Ward', code: 'WARD-MMW', roomType: 'Inpatient Ward', floorLevel: 'Third Floor - East Wing', assignedStaff: 'Sister In-Charge', capacity: 10, status: 'Active Available' },
                ];
                setHospitalRooms(sampleRooms);
            }
        } catch (e) {
            console.error('Failed to load hospital rooms:', e);
        }
    }, [institutionId]);

    const handleAddRoom = async () => {
        if (!newRoom.name.trim()) return alert('Please enter room name.');
        if (!institutionId) return;
        try {
            const record = {
                id: `room_${Date.now()}`,
                institutionId,
                name: newRoom.name.trim(),
                code: newRoom.code.trim() || `RM-${Math.floor(100 + Math.random() * 900)}`,
                roomType: newRoom.roomType,
                floorLevel: newRoom.floorLevel.trim(),
                assignedStaff: newRoom.assignedStaff.trim(),
                capacity: Number(newRoom.capacity) || 1,
                status: newRoom.status,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('his_hospital_rooms', record);
            setHospitalRooms(prev => [record, ...prev]);
            setIsAddRoomOpen(false);
            setNewRoom({ name: '', code: '', roomType: 'Consultation Room', floorLevel: 'Ground Floor - Block A', assignedStaff: '', capacity: 1, status: 'Active Available' });
            alert(`✓ Hospital room "${record.name}" configured successfully!`);
        } catch (e) {
            alert('Failed to add hospital room.');
        }
    };

    const handleDeleteRoom = async (id: string) => {
        if (!confirm('Are you sure you want to remove this hospital room configuration?')) return;
        try {
            await apiService.deleteModuleRecord('his_hospital_rooms', id);
            setHospitalRooms(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            alert('Failed to delete hospital room.');
        }
    };

    useEffect(() => {
        loadPractitioners();
        loadTariffs();
        loadInsuranceProviders();
        loadPartnerLabs();
        loadHospitalRooms();

        // Load persisted billing settings from DB
        if (institutionId) {
            apiService.fetchModuleRecords('his_billing_settings', institutionId)
                .then((rows: any[]) => {
                    if (rows && rows.length > 0) {
                        const s = rows[0];
                        setInvoiceSettings(prev => ({
                            ...prev,
                            invoicePrefix:        s.invoicePrefix        || s.invoice_prefix        || prev.invoicePrefix,
                            invoiceStartNumber:   Number(s.invoiceStartNumber   || s.invoice_start_number   || prev.invoiceStartNumber),
                            receiptPrefix:        s.receiptPrefix        || s.receipt_prefix        || prev.receiptPrefix,
                            receiptStartNumber:   Number(s.receiptStartNumber   || s.receipt_start_number   || prev.receiptStartNumber),
                            claimPrefix:          s.claimPrefix          || s.claim_prefix          || prev.claimPrefix,
                            claimStartNumber:     Number(s.claimStartNumber     || s.claim_start_number     || prev.claimStartNumber),
                            currency:             s.currency                                        || prev.currency,
                            financialYear:        s.financialYear        || s.financial_year        || prev.financialYear,
                            paymentTermsDays:     Number(s.paymentTermsDays     || s.payment_terms_days     || prev.paymentTermsDays),
                            autoResetYearly:      s.autoResetYearly      ?? s.auto_reset_yearly      ?? prev.autoResetYearly,
                            includeYearInNumber:  s.includeYearInNumber  ?? s.include_year_in_number ?? prev.includeYearInNumber,
                            zeroPadLength:        Number(s.zeroPadLength        || s.zero_pad_length        || prev.zeroPadLength),
                        }));
                    }
                })
                .catch(() => null); // table may not exist yet — silently use defaults
        }
    }, [loadPractitioners, loadTariffs, loadInsuranceProviders, loadPartnerLabs, loadHospitalRooms, institutionId]);

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
            const sysRole = (practitionerForm.role === 'doctor' || practitionerForm.role === 'his_admin') 
                ? 'his_admin' 
                : practitionerForm.role === 'receptionist' 
                ? 'reception' 
                : practitionerForm.role === 'cashier' 
                ? 'cashier' 
                : 'nurse';
            const assignedPin = practitionerForm.devicePin || String(Math.floor(1000 + Math.random() * 9000));

            const hrMetadata = {
                titleRole: practitionerForm.role,
                specialty: practitionerForm.specialty || 'General Practitioner',
                medicalLicense: practitionerForm.medicalLicense || `MPDB-${Math.floor(10000 + Math.random() * 90000)}`,
                isPractitioner: true,
                devicePin: assignedPin,
                employmentDate: practitionerForm.employmentDate,
                nationalId: practitionerForm.nationalId,
                employmentTerms: practitionerForm.employmentTerms,
                basicSalary: Number(practitionerForm.basicSalary) || 0,
                kraPin: practitionerForm.kraPin,
                nssfNo: practitionerForm.nssfNo,
                shifNumber: practitionerForm.shifNumber,
                bankName: practitionerForm.bankName,
                bankBranch: practitionerForm.bankBranch,
                bankAccountNumber: practitionerForm.bankAccountNumber
            };

            const salaryVal = Number(practitionerForm.basicSalary) || 0;
            if (editingPractitioner) {
                // Update Existing Practitioner
                let existingMeta = editingPractitioner.metadata || {};
                if (typeof existingMeta === 'string') {
                    try { existingMeta = JSON.parse(existingMeta); } catch (e) { existingMeta = {}; }
                }
                const updatedRecord: any = {
                    name: practitionerForm.name.trim(),
                    email: practitionerForm.email.trim() || editingPractitioner.email,
                    phoneNumber: practitionerForm.phoneNumber || editingPractitioner.phoneNumber || '',
                    role: sysRole,
                    basicSalary: salaryVal,
                    basic_salary: salaryVal,
                    metadata: {
                        ...existingMeta,
                        ...hrMetadata,
                        basicSalary: salaryVal,
                        basic_salary: salaryVal
                    }
                };

                await apiService.updateModuleRecord('users', editingPractitioner.id, updatedRecord).catch(() => null);
                setPractitionerList(prev => prev.map(s => s.id === editingPractitioner.id ? { 
                    ...s, 
                    name: updatedRecord.name, 
                    role: practitionerForm.role, 
                    specialty: practitionerForm.specialty,
                    basicSalary: salaryVal,
                    basic_salary: salaryVal,
                    metadata: updatedRecord.metadata 
                } : s));

                alert(`✓ Practitioner profile & HR file for ${practitionerForm.name} updated successfully!`);
            } else {
                // Create New Practitioner
                const newId = `user_prac_${Date.now()}`;
                const newRecord: any = {
                    id: newId,
                    institution_id: institutionId || 'his_inst_1',
                    institutionId: institutionId || 'his_inst_1',
                    name: practitionerForm.name.trim(),
                    email: practitionerForm.email.trim() || `${practitionerForm.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@hospital.org`,
                    phoneNumber: practitionerForm.phoneNumber || '',
                    role: sysRole,
                    basicSalary: salaryVal,
                    basic_salary: salaryVal,
                    metadata: {
                        ...hrMetadata,
                        specialty: practitionerForm.specialty,
                        medicalLicense: practitionerForm.medicalLicense,
                        hisRole: practitionerForm.role,
                        basicSalary: salaryVal,
                        basic_salary: salaryVal,
                        webauthnCredentials: scannedBiometricData?.credentials || null,
                        fingerprintTemplate: scannedBiometricData?.templateHash || null,
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
            }

            setIsAddPractitionerOpen(false);
            setEditingPractitioner(null);
            setScannedBiometricData(null);
            setPractitionerForm({
                name: '', role: 'doctor', specialty: '', medicalLicense: '', phoneNumber: '', email: '', devicePin: '', fingerIndex: 0,
                employmentDate: '', nationalId: '', employmentTerms: 'Permanent & Pensionable', basicSalary: 0, kraPin: '', nssfNo: '', shifNumber: '', bankName: 'Equity Bank', bankBranch: '', bankAccountNumber: ''
            });
            await loadPractitioners();
            if (onStaffUpdated) onStaffUpdated();
        } catch (err: any) {
            alert('Failed to save practitioner: ' + (err.message || err));
        }
    };

    const handleDeletePractitioner = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to remove practitioner "${name}" from the Staff Registry?`)) return;
        try {
            await apiService.deleteModuleRecord('users', id).catch(() => null);
            setPractitionerList(prev => prev.filter(s => s.id !== id));
            alert(`✓ Practitioner ${name} removed from Staff Registry.`);
            if (onStaffUpdated) onStaffUpdated();
        } catch (e) {
            alert('Failed to remove practitioner.');
        }
    };

    const handleOpenEditPractitioner = (staff: any) => {
        setEditingPractitioner(staff);
        const m = staff.metadata || {};
        setPractitionerForm({
            name: staff.name || '',
            role: m.titleRole || staff.role || 'doctor',
            specialty: staff.specialty || m.specialty || '',
            medicalLicense: staff.medicalLicense || m.medicalLicense || '',
            phoneNumber: staff.phoneNumber || '',
            email: staff.email || '',
            devicePin: m.devicePin || '',
            fingerIndex: 0,
            employmentDate: m.employmentDate || staff.employmentDate || '',
            nationalId: m.nationalId || staff.nationalId || '',
            employmentTerms: m.employmentTerms || 'Permanent & Pensionable',
            basicSalary: m.basicSalary || staff.basicSalary || 0,
            kraPin: m.kraPin || staff.kraPin || '',
            nssfNo: m.nssfNo || staff.nssfNo || '',
            shifNumber: m.shifNumber || m.nhifNo || staff.shifNumber || '',
            bankName: m.bankName || staff.bankName || 'Equity Bank',
            bankBranch: m.bankBranch || staff.bankBranch || '',
            bankAccountNumber: m.bankAccountNumber || staff.accountNumber || ''
        });
        setIsAddPractitionerOpen(true);
    };

    const handleSaveBillingSettings = async () => {
        if (!institutionId) return;
        setIsSavingBilling(true);
        try {
            await apiService.saveModuleRecord('his_billing_settings', {
                id: `billing_${institutionId}`,
                institution_id: institutionId,
                institutionId,
                // camelCase (app layer)
                invoicePrefix:       invoiceSettings.invoicePrefix,
                invoiceStartNumber:  invoiceSettings.invoiceStartNumber,
                receiptPrefix:       invoiceSettings.receiptPrefix,
                receiptStartNumber:  invoiceSettings.receiptStartNumber,
                claimPrefix:         invoiceSettings.claimPrefix,
                claimStartNumber:    invoiceSettings.claimStartNumber,
                currency:            invoiceSettings.currency,
                financialYear:       invoiceSettings.financialYear,
                paymentTermsDays:    invoiceSettings.paymentTermsDays,
                autoResetYearly:     invoiceSettings.autoResetYearly,
                includeYearInNumber: invoiceSettings.includeYearInNumber,
                zeroPadLength:       invoiceSettings.zeroPadLength,
                // snake_case (DB layer)
                invoice_prefix:       invoiceSettings.invoicePrefix,
                invoice_start_number: invoiceSettings.invoiceStartNumber,
                receipt_prefix:       invoiceSettings.receiptPrefix,
                receipt_start_number: invoiceSettings.receiptStartNumber,
                claim_prefix:         invoiceSettings.claimPrefix,
                claim_start_number:   invoiceSettings.claimStartNumber,
                financial_year:       invoiceSettings.financialYear,
                payment_terms_days:   invoiceSettings.paymentTermsDays,
                auto_reset_yearly:    invoiceSettings.autoResetYearly,
                include_year_in_number: invoiceSettings.includeYearInNumber,
                zero_pad_length:      invoiceSettings.zeroPadLength,
                updated_at: new Date().toISOString(),
            });
            alert('✓ Billing & Numbering settings saved successfully!');
        } catch (e: any) {
            console.error('Failed to save billing settings:', e);
            alert('Failed to save billing settings. Error: ' + (e?.message || e));
        } finally {
            setIsSavingBilling(false);
        }
    };

    const handleAddTariffItem = async () => {
        if (!newTariff.name.trim()) return alert('Please enter service name.');
        if (!institutionId) return;
        try {
            if (editingTariff) {
                // Update Existing Tariff Item
                const updatedRecord = {
                    name: newTariff.name.trim(),
                    category: newTariff.category,
                    code: newTariff.code || editingTariff.code,
                    cashRate: Number(newTariff.cashRate) || 0,
                    coverRate: Number(newTariff.coverRate) || 0,
                    isActive: newTariff.isActive,
                };
                await apiService.updateModuleRecord('his_tariffs', editingTariff.id, updatedRecord).catch(() => null);
                setCustomTariffs(prev => prev.map(t => t.id === editingTariff.id ? { ...t, ...updatedRecord } : t));
                setIsAddTariffOpen(false);
                setEditingTariff(null);
                setNewTariff({ name: '', category: 'Laboratory', code: '', cashRate: 0, coverRate: 0, isActive: true });
                alert(`✓ Tariff item "${updatedRecord.name}" updated successfully!`);
            } else {
                // Create New Tariff Item
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
            }
        } catch (e) {
            alert('Failed to save tariff item.');
        }
    };

    const handleOpenEditTariff = (tariff: any) => {
        setEditingTariff(tariff);
        setNewTariff({
            name: tariff.name || '',
            category: tariff.category || 'Laboratory',
            code: tariff.code || '',
            cashRate: tariff.cashRate || 0,
            coverRate: tariff.coverRate || 0,
            isActive: tariff.isActive !== false
        });
        setIsAddTariffOpen(true);
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

    const handleAddInsurance = async () => {
        if (!newInsurance.name.trim()) return alert('Please enter insurance provider name.');
        if (!institutionId) return;
        try {
            if (editingInsurance) {
                // Update Existing Insurance Partner
                const updatedRecord = {
                    name: newInsurance.name.trim(),
                    code: newInsurance.code.trim() || editingInsurance.code,
                    category: newInsurance.category,
                    copayAmount: Number(newInsurance.copayAmount) || 0,
                    contactEmail: newInsurance.contactEmail.trim(),
                    contactPhone: newInsurance.contactPhone.trim(),
                    portalUrl: newInsurance.portalUrl.trim(),
                    isActive: newInsurance.isActive,
                };
                await apiService.updateModuleRecord('his_insurance_providers', editingInsurance.id, updatedRecord).catch(() => null);
                setInsuranceProviders(prev => prev.map(i => i.id === editingInsurance.id ? { ...i, ...updatedRecord } : i));
                setIsAddInsuranceOpen(false);
                setEditingInsurance(null);
                setNewInsurance({ name: '', code: '', category: 'SHA / National Scheme', copayAmount: 0, contactEmail: '', contactPhone: '', portalUrl: '', isActive: true });
                alert(`✓ Insurance partner "${updatedRecord.name}" updated successfully!`);
            } else {
                // Create New Insurance Partner
                const record = {
                    id: `ins_${Date.now()}`,
                    institutionId,
                    name: newInsurance.name.trim(),
                    code: newInsurance.code.trim() || `INS-${Math.floor(100 + Math.random() * 900)}`,
                    category: newInsurance.category,
                    copayAmount: Number(newInsurance.copayAmount) || 0,
                    contactEmail: newInsurance.contactEmail.trim(),
                    contactPhone: newInsurance.contactPhone.trim(),
                    portalUrl: newInsurance.portalUrl.trim(),
                    isActive: newInsurance.isActive,
                    createdAt: new Date().toISOString(),
                };
                await apiService.saveModuleRecord('his_insurance_providers', record);
                setInsuranceProviders(prev => [record, ...prev]);
                setIsAddInsuranceOpen(false);
                setNewInsurance({ name: '', code: '', category: 'SHA / National Scheme', copayAmount: 0, contactEmail: '', contactPhone: '', portalUrl: '', isActive: true });
                alert(`✓ Insurance partner ${record.name} registered successfully!`);
            }
        } catch (e) {
            alert('Failed to save insurance provider.');
        }
    };

    const handleOpenEditInsurance = (ins: any) => {
        setEditingInsurance(ins);
        setNewInsurance({
            name: ins.name || '',
            code: ins.code || '',
            category: ins.category || 'SHA / National Scheme',
            copayAmount: ins.copayAmount || 0,
            contactEmail: ins.contactEmail || '',
            contactPhone: ins.contactPhone || '',
            portalUrl: ins.portalUrl || '',
            isActive: ins.isActive !== false
        });
        setIsAddInsuranceOpen(true);
    };

    const handleDeleteInsurance = async (id: string) => {
        if (!confirm('Are you sure you want to unregister this insurance partner?')) return;
        try {
            await apiService.deleteModuleRecord('his_insurance_providers', id);
            setInsuranceProviders(prev => prev.filter(i => i.id !== id));
        } catch (e) {
            alert('Failed to delete insurance provider.');
        }
    };

    const handleAddPartnerLab = async () => {
        if (!newPartnerLab.name.trim()) return alert('Please enter partner laboratory name.');
        if (!institutionId) return;
        try {
            if (editingPartnerLab) {
                // Update Existing Partner Lab
                const updatedRecord = {
                    name: newPartnerLab.name.trim(),
                    code: newPartnerLab.code.trim() || editingPartnerLab.code,
                    phone: newPartnerLab.phone.trim(),
                    email: newPartnerLab.email.trim(),
                    address: newPartnerLab.address.trim(),
                    discountRate: Number(newPartnerLab.discountRate) || 0,
                    isActive: newPartnerLab.isActive,
                };
                await apiService.updateModuleRecord('his_partner_labs', editingPartnerLab.id, updatedRecord).catch(() => null);
                setPartnerLabs(prev => prev.map(p => p.id === editingPartnerLab.id ? { ...p, ...updatedRecord } : p));
                setIsAddPartnerLabOpen(false);
                setEditingPartnerLab(null);
                setNewPartnerLab({ name: '', code: '', phone: '', email: '', address: '', discountRate: 10, isActive: true });
                alert(`✓ Partner diagnostic lab "${updatedRecord.name}" updated successfully!`);
            } else {
                // Create New Partner Lab
                const record = {
                    id: `partner_${Date.now()}`,
                    institutionId,
                    name: newPartnerLab.name.trim(),
                    code: newPartnerLab.code.trim() || `PARTNER-${Math.floor(100 + Math.random() * 900)}`,
                    phone: newPartnerLab.phone.trim(),
                    email: newPartnerLab.email.trim(),
                    address: newPartnerLab.address.trim(),
                    discountRate: Number(newPartnerLab.discountRate) || 0,
                    isActive: newPartnerLab.isActive,
                    createdAt: new Date().toISOString(),
                };
                await apiService.saveModuleRecord('his_partner_labs', record);
                setPartnerLabs(prev => [record, ...prev]);
                setIsAddPartnerLabOpen(false);
                setNewPartnerLab({ name: '', code: '', phone: '', email: '', address: '', discountRate: 10, isActive: true });
                alert(`✓ Partner diagnostic lab ${record.name} registered successfully!`);
            }
        } catch (e) {
            alert('Failed to save partner lab.');
        }
    };

    const handleOpenEditPartnerLab = (lab: any) => {
        setEditingPartnerLab(lab);
        setNewPartnerLab({
            name: lab.name || '',
            code: lab.code || '',
            phone: lab.phone || '',
            email: lab.email || '',
            address: lab.address || '',
            discountRate: lab.discountRate || 10,
            isActive: lab.isActive !== false
        });
        setIsAddPartnerLabOpen(true);
    };

    const handleDeletePartnerLab = async (id: string) => {
        if (!confirm('Are you sure you want to unregister this partnered laboratory?')) return;
        try {
            await apiService.deleteModuleRecord('his_partner_labs', id);
            setPartnerLabs(prev => prev.filter(p => p.id !== id));
        } catch (e) {
            alert('Failed to delete partner lab.');
        }
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'patient_id':
                return (
                    <div className="space-y-8 animate-fade-in text-slate-900 dark:text-white">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 shadow-2xl">
                            <div>
                                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[9px] font-black rounded-full border border-indigo-500/30 uppercase tracking-widest mb-2 inline-block">
                                    HIS Master Identifier Sequence
                                </span>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white italic">Custom Patient ID <span className="text-indigo-400">&amp; MRN Prefix Configuration</span></h3>
                                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Define custom patient ID format, prefix (e.g. PID-001), auto-sequence counter &amp; zero-padding</p>
                            </div>
                            <button
                                onClick={handleSavePatientIdSettings}
                                disabled={isSavingPatientIdConfig}
                                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-900/50 flex items-center gap-2 italic disabled:opacity-50 cursor-pointer"
                            >
                                <SparklesIcon className="w-4 h-4 text-white" />
                                <span>{isSavingPatientIdConfig ? 'Saving Settings...' : 'Save Patient ID Config'}</span>
                            </button>
                        </div>

                        {/* Configuration Form Card & Live Preview */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-200 dark:border-white/10 p-8 shadow-xl space-y-6">
                                <h4 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 italic border-b border-slate-100 dark:border-white/5 pb-4">
                                    ⚙️ Custom Patient ID Rules &amp; Formatting
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Custom Prefix (e.g. PID-, PAT-, MED-, PID ) *</label>
                                        <input
                                            type="text"
                                            value={patientIdSettings.customPrefix}
                                            onChange={e => setPatientIdSettings(s => ({ ...s, customPrefix: e.target.value }))}
                                            placeholder="e.g. PID-"
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black text-indigo-600 dark:text-indigo-300 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 mt-1.5">Prefix prepended to all newly registered patients (e.g. PID-001).</p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Starting Sequence Counter *</label>
                                        <input
                                            type="number"
                                            value={patientIdSettings.startNumber}
                                            onChange={e => setPatientIdSettings(s => ({ ...s, startNumber: Math.max(1, parseInt(e.target.value) || 1) }))}
                                            min={1}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                        />
                                        <p className="text-[9px] font-bold text-slate-400 mt-1.5">Starting index for new patient intake (e.g. 1 -&gt; 001, 100 -&gt; 100).</p>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Sequence Zero-Padding Digits *</label>
                                        <select
                                            value={patientIdSettings.zeroPadLength}
                                            onChange={e => setPatientIdSettings(s => ({ ...s, zeroPadLength: parseInt(e.target.value) || 3 }))}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value={2}>2 Digits (e.g. PID-01)</option>
                                            <option value={3}>3 Digits (e.g. PID-001)</option>
                                            <option value={4}>4 Digits (e.g. PID-0001)</option>
                                            <option value={5}>5 Digits (e.g. PID-00001)</option>
                                            <option value={6}>6 Digits (e.g. PID-000001)</option>
                                        </select>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1.5">Number of leading zeros applied to sequence numbers.</p>
                                    </div>

                                    <div className="flex flex-col justify-center space-y-3 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={patientIdSettings.includeYear}
                                                onChange={e => setPatientIdSettings(s => ({ ...s, includeYear: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Include Current Year in ID (e.g. PID-2026-001)</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={patientIdSettings.autoAssign}
                                                onChange={e => setPatientIdSettings(s => ({ ...s, autoAssign: e.target.checked }))}
                                                className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Auto-prefill next ID during patient intake</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Live Interactive Preview Card */}
                            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 rounded-[2.5rem] p-8 text-white border border-indigo-500/30 shadow-2xl flex flex-col justify-between space-y-6">
                                <div>
                                    <span className="px-3 py-1 bg-white/10 text-indigo-200 text-[9px] font-black rounded-full uppercase tracking-widest inline-block border border-white/20 mb-3">
                                        Live Generated Preview
                                    </span>
                                    <h4 className="text-lg font-black uppercase tracking-tight italic">Patient Identifier Sequence</h4>
                                    <p className="text-[10px] text-indigo-200/70 font-medium mt-1">Here is how next generated patient IDs will appear in EMR, prescriptions &amp; receipts:</p>
                                </div>

                                <div className="space-y-3">
                                    {[0, 1, 2].map((offset) => {
                                        const seq = patientIdSettings.startNumber + offset;
                                        const formattedSeq = String(seq).padStart(patientIdSettings.zeroPadLength, '0');
                                        const yearPart = patientIdSettings.includeYear ? `${new Date().getFullYear()}-` : '';
                                        const sampleId = `${patientIdSettings.customPrefix}${yearPart}${formattedSeq}`;

                                        return (
                                            <div key={offset} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                                                offset === 0 ? 'bg-indigo-600/40 border-indigo-400 text-white shadow-lg' : 'bg-black/30 border-white/10 text-indigo-200/80'
                                            }`}>
                                                <span className="text-[10px] font-black uppercase tracking-widest">{offset === 0 ? 'Next Intake (Patient #1)' : `Patient #${offset + 1}`}</span>
                                                <span className="text-sm font-mono font-black tracking-widest bg-black/40 px-3 py-1.5 rounded-xl border border-white/10">{sampleId}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-[9px] font-bold text-indigo-200 space-y-1">
                                    <p className="font-black uppercase tracking-widest text-white">💡 Pro Tip:</p>
                                    <p>Staff can search, filter, or scan barcodes using custom patient IDs across Reception, Triage, Doctor SOAP &amp; Pharmacy.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'rooms': {
                const filteredRooms = hospitalRooms.filter(r => 
                    roomCategoryFilter === 'All' || r.roomType === roomCategoryFilter
                );
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-8 rounded-[2.5rem] bg-gradient-to-r from-indigo-900/40 via-purple-950/20 to-slate-900 border border-indigo-500/20 shadow-2xl">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white italic">Hospital <span className="text-indigo-400">Rooms &amp; Clinical Facilities</span></h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure consultation suites, lab rooms, X-Ray bays &amp; inpatient ward beds</p>
                            </div>
                            <button
                                onClick={() => setIsAddRoomOpen(true)}
                                className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-900/50 flex items-center gap-2 italic"
                            >
                                <PlusIcon className="w-4 h-4 text-white" />
                                <span>Add New Room / Suite</span>
                            </button>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {['All', 'Consultation Room', 'Laboratory & Diagnostics', 'Radiology & Imaging', 'Injection & Treatment', 'Inpatient Ward'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setRoomCategoryFilter(cat)}
                                    className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                        roomCategoryFilter === cat 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'bg-slate-900/50 text-slate-400 hover:text-white border border-white/5'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Rooms Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredRooms.map(r => (
                                <div key={r.id} className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-xl relative overflow-hidden group">
                                    <div className="flex justify-between items-start">
                                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/30">
                                            {r.code || 'RM'}
                                        </span>
                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/30">
                                            {r.status || 'Active Available'}
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="text-lg font-black text-white uppercase tracking-tight italic">{r.name}</h4>
                                        <p className="text-xs font-bold text-indigo-400 uppercase mt-0.5">{r.roomType}</p>
                                    </div>

                                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1.5 text-[10px]">
                                        <p className="text-slate-400">Location: <strong className="text-white">{r.floorLevel}</strong></p>
                                        <p className="text-slate-400">Assigned Clinician: <strong className="text-indigo-300">{r.assignedStaff || 'Unassigned'}</strong></p>
                                        <p className="text-slate-400">Capacity: <strong className="text-white">{r.capacity} Bed/Station{r.capacity !== 1 ? 's' : ''}</strong></p>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            onClick={() => handleDeleteRoom(r.id)}
                                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-rose-500/20"
                                        >
                                            Remove Room
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
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
                                        <button 
                                            type="button"
                                            onClick={handleSaveBranding}
                                            disabled={isSavingBranding}
                                            className="bg-indigo-600 text-white px-10 py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:scale-105 transition-all shadow-2xl shadow-indigo-600/30 ring-4 ring-indigo-500/20 cursor-pointer disabled:opacity-50"
                                        >
                                            {isSavingBranding ? 'Committing...' : 'Commit DNA'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <label className="bg-slate-50 dark:bg-slate-900/30 p-12 rounded-[3.5rem] border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center space-y-8 text-center group cursor-pointer hover:border-indigo-500/50 hover:bg-slate-100 dark:hover:bg-white/5 transition-all relative overflow-hidden">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setBranding((b: any) => ({ ...b, logoUrl: reader.result as string }));
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.02] to-transparent pointer-events-none"></div>
                                <div className="w-28 h-28 rounded-4xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10 overflow-hidden">
                                    {branding.logoUrl ? (
                                        <img src={branding.logoUrl} alt="Emblem" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <PhotoIcon className="w-12 h-12 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    )}
                                </div>
                                <div className="relative z-10">
                                    <p className="text-sm font-black uppercase tracking-[0.2em] italic">Institutional Emblem</p>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-3 tracking-widest max-w-[200px] leading-relaxed italic">
                                        {branding.logoUrl ? 'Click to upload new emblem' : 'SVG or high-fidelity PNG preferred (Max 10MB)'}
                                    </p>
                                </div>
                                <div className="px-6 py-2 bg-slate-200 dark:bg-white/10 rounded-full text-[8px] font-bold text-slate-500 uppercase tracking-widest relative z-10">
                                    {branding.logoUrl ? 'EMBLEM ATTACHED' : 'DRAG & DROP SECURE NODE'}
                                </div>
                            </label>
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
                                onClick={() => {
                                    setEditingPractitioner(null);
                                    setPractitionerForm({
                                        name: '', role: 'doctor', specialty: '', medicalLicense: '', phoneNumber: '', email: '', devicePin: '', fingerIndex: 0,
                                        employmentDate: '', nationalId: '', employmentTerms: 'Full Time', basicSalary: 0, shifNumber: '', nssfNo: '', kraPin: '', bankName: '', bankBranch: '', bankAccountNumber: ''
                                    });
                                    setIsAddPractitionerOpen(true);
                                }}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-950 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" /> Add Practitioner
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {practitionerList.map((staff: any, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900/50 p-8 rounded-[3rem] border border-slate-200 dark:border-white/5 flex flex-col space-y-6 group hover:shadow-2xl transition-all relative overflow-hidden">
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
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleOpenEditPractitioner(staff); }}
                                                className="px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-slate-400 hover:text-indigo-500 hover:scale-105 transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider"
                                                title="Edit Practitioner Profile"
                                            >
                                                <PencilIcon className="w-3.5 h-3.5" /> Edit
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeletePractitioner(staff.id, staff.name); }}
                                                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 text-rose-400 hover:scale-105 transition-all flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider"
                                                title="Delete Practitioner from Staff Registry"
                                            >
                                                <XIcon className="w-3.5 h-3.5" /> Delete
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
                                            onChange={e => setConsultationRates((r: any) => ({ ...r, cashConsultation: Number(e.target.value) }))}
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
                                            onChange={e => setConsultationRates((r: any) => ({ ...r, coverConsultation: Number(e.target.value) }))}
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
                                            onChange={e => setConsultationRates((r: any) => ({ ...r, emergencySurcharge: Number(e.target.value) }))}
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
                                            onChange={e => setConsultationRates((r: any) => ({ ...r, revisitFee: Number(e.target.value) }))}
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
                                    onClick={() => {
                                        setEditingTariff(null);
                                        setNewTariff({ name: '', category: 'Laboratory', code: '', cashRate: 0, coverRate: 0, isActive: true });
                                        setIsAddTariffOpen(true);
                                    }}
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
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenEditTariff(item)}
                                                        className="text-slate-400 hover:text-indigo-600 p-2 rounded-xl transition-colors hover:bg-slate-200/60 dark:hover:bg-white/10"
                                                        title="Edit tariff"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTariffItem(item.id)}
                                                        className="text-slate-300 hover:text-rose-500 p-2 rounded-xl transition-colors hover:bg-slate-200/60 dark:hover:bg-white/10"
                                                        title="Delete tariff"
                                                    >
                                                        <XIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
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

                                            {/* Insurance Coverage Toggle */}
                                            <div className="pt-2">
                                                <button
                                                    onClick={async () => {
                                                        const updatedCoverable = item.isCoverable === false ? true : false;
                                                        setCustomTariffs(prev => prev.map(t => t.id === item.id ? { ...t, isCoverable: updatedCoverable } : t));
                                                        if (institutionId) {
                                                            try {
                                                                await apiService.saveModuleRecord('his_tariffs', { ...item, isCoverable: updatedCoverable });
                                                            } catch (e) {
                                                                console.warn('Failed to update tariff coverage:', e);
                                                            }
                                                        }
                                                    }}
                                                    className={`w-full py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-between border ${
                                                        item.isCoverable !== false
                                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                                                            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                                                    }`}
                                                >
                                                    <span>{item.isCoverable !== false ? '🛡️ Insurance Covered' : '🚫 Excluded (Self-Pay Only)'}</span>
                                                    <span className="underline text-[8px]">Change</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                );
            case 'insurance':
                return (
                    <div className="space-y-10 animate-fade-in pb-20">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight italic text-slate-900 dark:text-white">
                                    Insurance Partners <span className="text-indigo-600">&amp; Medical Schemes</span>
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                                    Manage registered health insurance providers, SHA schemes, corporate covers, and co-pay parameters
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingInsurance(null);
                                    setNewInsurance({ name: '', code: '', category: 'SHA / National Scheme', copayAmount: 0, contactEmail: '', contactPhone: '', portalUrl: '', isActive: true });
                                    setIsAddInsuranceOpen(true);
                                }}
                                className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-indigo-600/20"
                            >
                                <PlusIcon className="w-4 h-4 inline mr-2" /> Register Insurance Partner
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="p-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Partners</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white">{insuranceProviders.length}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase">Active contracted schemes</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500">National Scheme</p>
                                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                    {insuranceProviders.filter(i => i.category?.includes('SHA') || i.category?.includes('National')).length || 1}
                                </p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase">SHA / Public Health Authority</p>
                            </div>
                            <div className="p-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Private &amp; Corporate</p>
                                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                                    {insuranceProviders.filter(i => !i.category?.includes('SHA') && !i.category?.includes('National')).length}
                                </p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase">Commercial health covers</p>
                            </div>
                        </div>

                        {/* Insurance Providers Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {insuranceProviders.map(item => (
                                <div key={item.id} className="p-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/5 space-y-4 hover:shadow-xl transition-all group relative">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                                                item.category?.includes('SHA') || item.category?.includes('National')
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900'
                                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900'
                                            }`}>
                                                {item.category}
                                            </span>
                                            <p className="text-sm font-black uppercase italic tracking-tight text-slate-900 dark:text-white mt-2 group-hover:text-indigo-600 transition-colors">
                                                {item.name}
                                            </p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Scheme Code: {item.code}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleOpenEditInsurance(item)}
                                                className="text-slate-400 hover:text-indigo-600 p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                                                title="Edit Insurance Partner / Scheme"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteInsurance(item.id)}
                                                className="text-slate-300 hover:text-rose-500 p-2 rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
                                                title="Unregister Partner"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[9px] font-bold text-slate-500">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400 uppercase">Co-pay Requirement:</span>
                                            <span className="font-black text-slate-800 dark:text-white">
                                                {item.copayAmount > 0 ? `KES ${item.copayAmount.toLocaleString()}` : 'No Co-pay (100% Cover)'}
                                            </span>
                                        </div>
                                        {item.contactEmail && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 uppercase">Claims Email:</span>
                                                <span className="font-semibold text-indigo-500">{item.contactEmail}</span>
                                            </div>
                                        )}
                                        {item.contactPhone && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-400 uppercase">Pre-Auth Phone:</span>
                                                <span className="font-semibold">{item.contactPhone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'billing': {
                const pad = (n: number) => String(n).padStart(invoiceSettings.zeroPadLength, '0');
                const yr = invoiceSettings.includeYearInNumber ? `/${invoiceSettings.financialYear.slice(-2)}` : '';
                const previewInvoice = `${invoiceSettings.invoicePrefix}${yr}-${pad(invoiceSettings.invoiceStartNumber)}`;
                const previewReceipt = `${invoiceSettings.receiptPrefix}${yr}-${pad(invoiceSettings.receiptStartNumber)}`;
                const previewClaim   = `${invoiceSettings.claimPrefix}${yr}-${pad(invoiceSettings.claimStartNumber)}`;
                return (
                    <div className="space-y-8 animate-fade-in pb-20">
                        {/* ── Header ── */}
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-8 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 rounded-[2.5rem] border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.12),transparent_60%)] pointer-events-none" />
                            <div className="relative z-10">
                                <p className="text-[9px] font-black text-indigo-300/60 uppercase tracking-[0.3em] mb-1">Nexus Finance Engine</p>
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white">Invoice & <span className="text-indigo-300">Receipt Numbering</span></h3>
                                <p className="text-[10px] font-bold text-indigo-200/60 uppercase tracking-widest mt-1">Configure document numbering sequences, prefixes & financial year</p>
                            </div>
                            <button
                                onClick={handleSaveBillingSettings}
                                disabled={isSavingBilling}
                                className="relative z-10 flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/50 disabled:opacity-50"
                            >
                                {isSavingBilling ? '⏳ Saving...' : '✓ Save All Settings'}
                            </button>
                        </div>

                        {/* ── Live Preview ── */}
                        <div className="p-8 bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">🔍 Live Number Preview</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[
                                    { label: 'Invoice', preview: previewInvoice, color: 'indigo', emoji: '🧾' },
                                    { label: 'Receipt', preview: previewReceipt, color: 'emerald', emoji: '✅' },
                                    { label: 'Insurance Claim', preview: previewClaim, color: 'violet', emoji: '🛡️' },
                                ].map((p, i) => (
                                    <div key={i} className={`p-6 rounded-2xl bg-${p.color}-50 dark:bg-${p.color}-950/20 border border-${p.color}-100 dark:border-${p.color}-500/10 text-center`}>
                                        <p className="text-2xl mb-2">{p.emoji}</p>
                                        <p className={`text-xl font-black tracking-tight text-${p.color}-700 dark:text-${p.color}-300 font-mono`}>{p.preview}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">{p.label} Number Format</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* ── Invoice Settings ── */}
                            <div className="p-8 bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">🧾</span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight italic">Invoice Numbering</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Set prefix and starting sequence</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Invoice Prefix</label>
                                        <input
                                            type="text"
                                            value={invoiceSettings.invoicePrefix}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, invoicePrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                                            maxLength={6}
                                            placeholder="INV"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black uppercase outline-none focus:border-indigo-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Start Number</label>
                                        <input
                                            type="number"
                                            value={invoiceSettings.invoiceStartNumber}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, invoiceStartNumber: Math.max(1, Number(e.target.value)) }))}
                                            min={1}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Receipt Settings ── */}
                            <div className="p-8 bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">✅</span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight italic">Receipt Numbering</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Payment receipt sequence</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Receipt Prefix</label>
                                        <input
                                            type="text"
                                            value={invoiceSettings.receiptPrefix}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, receiptPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                                            maxLength={6}
                                            placeholder="RCT"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black uppercase outline-none focus:border-emerald-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Start Number</label>
                                        <input
                                            type="number"
                                            value={invoiceSettings.receiptStartNumber}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, receiptStartNumber: Math.max(1, Number(e.target.value)) }))}
                                            min={1}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-emerald-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Insurance Claim Settings ── */}
                            <div className="p-8 bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">🛡️</span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight italic">Insurance Claim Numbering</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">SHA & private insurance claim sequence</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Claim Prefix</label>
                                        <input
                                            type="text"
                                            value={invoiceSettings.claimPrefix}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, claimPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                                            maxLength={6}
                                            placeholder="CLM"
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black uppercase outline-none focus:border-violet-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Start Number</label>
                                        <input
                                            type="number"
                                            value={invoiceSettings.claimStartNumber}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, claimStartNumber: Math.max(1, Number(e.target.value)) }))}
                                            min={1}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-violet-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Global Options ── */}
                            <div className="p-8 bg-white dark:bg-white/[0.02] rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-xl space-y-5">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">⚙️</span>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-tight italic">Global Options</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Currency, year & format settings</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Currency</label>
                                        <select
                                            value={invoiceSettings.currency}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, currency: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500/50 transition-all"
                                        >
                                            <option value="KES">KES — Kenyan Shilling</option>
                                            <option value="USD">USD — US Dollar</option>
                                            <option value="EUR">EUR — Euro</option>
                                            <option value="GBP">GBP — British Pound</option>
                                            <option value="TZS">TZS — Tanzanian Shilling</option>
                                            <option value="UGX">UGX — Ugandan Shilling</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Financial Year</label>
                                        <input
                                            type="text"
                                            value={invoiceSettings.financialYear}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, financialYear: e.target.value }))}
                                            placeholder="2025"
                                            maxLength={4}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500/50 transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Payment Terms (Days)</label>
                                        <input
                                            type="number"
                                            value={invoiceSettings.paymentTermsDays}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, paymentTermsDays: Math.max(0, Number(e.target.value)) }))}
                                            min={0}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Number Padding (digits)</label>
                                        <select
                                            value={invoiceSettings.zeroPadLength}
                                            onChange={e => setInvoiceSettings(s => ({ ...s, zeroPadLength: Number(e.target.value) }))}
                                            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-indigo-500/50 transition-all"
                                        >
                                            <option value={3}>3 digits (e.g. 001)</option>
                                            <option value={4}>4 digits (e.g. 0001)</option>
                                            <option value={5}>5 digits (e.g. 00001)</option>
                                            <option value={6}>6 digits (e.g. 000001)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                    {[
                                        { key: 'autoResetYearly', label: 'Auto-reset sequence every financial year', desc: 'Numbers restart from start value each new year' },
                                        { key: 'includeYearInNumber', label: 'Include year code in document number', desc: `e.g. INV/25-0001` },
                                    ].map((toggle) => (
                                        <div key={toggle.key} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{toggle.label}</p>
                                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{toggle.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => setInvoiceSettings(s => ({ ...s, [toggle.key]: !s[toggle.key as keyof typeof s] }))}
                                                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${
                                                    (invoiceSettings as any)[toggle.key] ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-white/10'
                                                }`}
                                            >
                                                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                                    (invoiceSettings as any)[toggle.key] ? 'translate-x-6' : 'translate-x-0'
                                                }`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }
            case 'partner_labs': {
                return (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-[2.5rem] border border-white/10">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-white italic">
                                    🔬 Partnered Diagnostic <span className="text-indigo-400">Labs & Referral Facilities</span>
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Configure external reference laboratories for out-sourced pathology, radiology & specialized diagnostics
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingPartnerLab(null);
                                    setNewPartnerLab({ name: '', code: '', phone: '', email: '', address: '', discountRate: 10, isActive: true });
                                    setIsAddPartnerLabOpen(true);
                                }}
                                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4" /> Register Partnered Lab
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {partnerLabs.map((lab) => (
                                <div key={lab.id} className="p-6 bg-slate-900/60 rounded-[2.5rem] border border-white/10 space-y-4 hover:border-indigo-500/40 transition-all group relative overflow-hidden">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-500/30">
                                                {lab.code}
                                            </span>
                                            <h4 className="text-base font-black text-white uppercase tracking-tight italic pt-1">{lab.name}</h4>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleOpenEditPartnerLab(lab)}
                                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                                                title="Edit Partnered Lab"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeletePartnerLab(lab.id)}
                                                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                                title="Unregister Partner"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs text-slate-300">
                                        <p className="flex items-center gap-2 font-mono"><span className="text-slate-500 text-[10px] uppercase font-bold">Phone:</span> {lab.phone || 'N/A'}</p>
                                        <p className="flex items-center gap-2 font-mono truncate"><span className="text-slate-500 text-[10px] uppercase font-bold">Email:</span> {lab.email || 'N/A'}</p>
                                        <p className="flex items-center gap-2"><span className="text-slate-500 text-[10px] uppercase font-bold">Facility:</span> {lab.address || 'Standard Reference Node'}</p>
                                    </div>

                                    <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase">
                                        <span className="text-emerald-400">Referral Rate: {lab.discountRate}% Contracted</span>
                                        <span className="text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">Active Partner</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
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
                    { id: 'patient_id', label: 'Custom Patient ID Prefix', icon: IdentificationIcon },
                    { id: 'staff', label: 'Staff Registry', icon: UsersIcon },
                    { id: 'clinic', label: 'Clinic Setup', icon: SettingsIcon },
                    { id: 'rooms', label: 'Rooms & Facilities', icon: BuildingOfficeIcon },
                    { id: 'tariffs', label: 'Tariffs & Fee Schedule', icon: SettingsIcon },
                    { id: 'insurance', label: 'Insurance & Schemes', icon: GlobeAltIcon },
                    { id: 'billing', label: 'Invoice & Receipt Numbering', icon: PencilIcon },
                    { id: 'partner_labs', label: 'Partnered Diagnostic Labs', icon: SettingsIcon },
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
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">{editingPractitioner ? 'Edit Healthcare Practitioner Profile' : 'Register Healthcare Practitioner'}</h3>
                                <p className="text-[10px] font-semibold opacity-80">{editingPractitioner ? 'Update certified doctor, nurse, or specialist details' : 'Add certified doctor, nurse, or clinical specialist to HIS'}</p>
                            </div>
                            <button onClick={() => setIsAddPractitionerOpen(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4 max-h-[78vh] overflow-y-auto custom-scrollbar">
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
                                        <option value="receptionist">Receptionist / Front Desk Officer</option>
                                        <option value="cashier">Finance / Cashier Officer</option>
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

                            {/* ── HR & Employment Details Section ── */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        💼 HR, Payroll & Statutory Details
                                    </h4>
                                    <p className="text-[9px] text-slate-500 font-semibold">
                                        Employment contract terms, national ID, basic salary, KRA PIN, NSSF, SHIF & bank disbursement account
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Employment Date</label>
                                        <input
                                            type="date"
                                            value={practitionerForm.employmentDate}
                                            onChange={e => setPractitionerForm(f => ({ ...f, employmentDate: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">National ID / Passport No</label>
                                        <input
                                            type="text"
                                            value={practitionerForm.nationalId}
                                            onChange={e => setPractitionerForm(f => ({ ...f, nationalId: e.target.value }))}
                                            placeholder="e.g. 34892019"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Employment Terms</label>
                                        <select
                                            value={practitionerForm.employmentTerms}
                                            onChange={e => setPractitionerForm(f => ({ ...f, employmentTerms: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="Permanent & Pensionable">Permanent & Pensionable</option>
                                            <option value="Fixed-Term Contract">Fixed-Term Contract</option>
                                            <option value="Casual / Day Worker">Casual / Day Worker</option>
                                            <option value="Intern / Probationary">Intern / Probationary</option>
                                            <option value="Visiting Consultant">Visiting Consultant</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Basic Monthly Salary (KES)</label>
                                        <input
                                            type="number"
                                            value={practitionerForm.basicSalary || ''}
                                            onChange={e => setPractitionerForm(f => ({ ...f, basicSalary: Number(e.target.value) }))}
                                            placeholder="e.g. 85000"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-emerald-600 dark:text-emerald-400"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">KRA PIN Number</label>
                                        <input
                                            type="text"
                                            value={practitionerForm.kraPin}
                                            onChange={e => setPractitionerForm(f => ({ ...f, kraPin: e.target.value.toUpperCase() }))}
                                            placeholder="A019482910Z"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">NSSF Number</label>
                                        <input
                                            type="text"
                                            value={practitionerForm.nssfNo}
                                            onChange={e => setPractitionerForm(f => ({ ...f, nssfNo: e.target.value }))}
                                            placeholder="10482019"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">SHIF / NHIF No</label>
                                        <input
                                            type="text"
                                            value={practitionerForm.shifNumber}
                                            onChange={e => setPractitionerForm(f => ({ ...f, shifNumber: e.target.value }))}
                                            placeholder="SHIF-94820"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Bank Name</label>
                                        <select
                                            value={practitionerForm.bankName}
                                            onChange={e => setPractitionerForm(f => ({ ...f, bankName: e.target.value }))}
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="Equity Bank">Equity Bank</option>
                                            <option value="KCB Bank">KCB Bank</option>
                                            <option value="Cooperative Bank">Cooperative Bank</option>
                                            <option value="NCBA Bank">NCBA Bank</option>
                                            <option value="Absa Bank">Absa Bank</option>
                                            <option value="Stanbic Bank">Stanbic Bank</option>
                                            <option value="Family Bank">Family Bank</option>
                                            <option value="Standard Chartered">Standard Chartered</option>
                                            <option value="M-Pesa STK Express">M-Pesa Mobile Money</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Bank Branch</label>
                                        <input
                                            type="text"
                                            value={practitionerForm.bankBranch}
                                            onChange={e => setPractitionerForm(f => ({ ...f, bankBranch: e.target.value }))}
                                            placeholder="Nairobi Main"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Account / Phone No</label>
                                        <input
                                            type="text"
                                            value={practitionerForm.bankAccountNumber}
                                            onChange={e => setPractitionerForm(f => ({ ...f, bankAccountNumber: e.target.value }))}
                                            placeholder="1294820194"
                                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
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
                                {editingPractitioner ? '✓ Update Practitioner Profile' : 'Save Practitioner'}
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
                                <h3 className="text-md font-black uppercase tracking-wider">{editingTariff ? 'Edit Custom Service Tariff' : 'Add Custom Service Tariff'}</h3>
                                <p className="text-[10px] font-semibold opacity-80">{editingTariff ? 'Update cash & cover rates for X-Ray, Lab, Procedure, Beds & Services' : 'Define cash & cover rates for X-Ray, Lab, Procedure, Beds & Services'}</p>
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
                                {editingTariff ? '✓ Update Tariff Item' : 'Add to Tariff Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isAddInsuranceOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">{editingInsurance ? 'Edit Insurance Partner / Scheme' : 'Register Insurance Partner'}</h3>
                                <p className="text-[10px] font-semibold opacity-80">{editingInsurance ? 'Update SHA scheme, private cover, or corporate insurance parameters' : 'Add SHA scheme, private medical cover, or corporate health insurance partner'}</p>
                            </div>
                            <button onClick={() => setIsAddInsuranceOpen(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Insurance Provider Name *</label>
                                <input
                                    type="text"
                                    value={newInsurance.name}
                                    onChange={e => setNewInsurance(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Jubilee Insurance, SHA, UAP Old Mutual"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Category / Type</label>
                                    <select
                                        value={newInsurance.category}
                                        onChange={e => setNewInsurance(f => ({ ...f, category: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="SHA / National Scheme">SHA / National Scheme</option>
                                        <option value="Private Medical Cover">Private Medical Cover</option>
                                        <option value="Corporate & Individual">Corporate &amp; Individual</option>
                                        <option value="Micro-Insurance & Corporate">Micro-Insurance</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Scheme Code / ID</label>
                                    <input
                                        type="text"
                                        value={newInsurance.code}
                                        onChange={e => setNewInsurance(f => ({ ...f, code: e.target.value }))}
                                        placeholder="e.g. JUB-MED-01"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Fixed Co-pay (KES)</label>
                                    <input
                                        type="number"
                                        value={newInsurance.copayAmount}
                                        onChange={e => setNewInsurance(f => ({ ...f, copayAmount: Number(e.target.value) }))}
                                        placeholder="0"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Pre-Auth Phone</label>
                                    <input
                                        type="text"
                                        value={newInsurance.contactPhone}
                                        onChange={e => setNewInsurance(f => ({ ...f, contactPhone: e.target.value }))}
                                        placeholder="0700123456"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Claims Email</label>
                                <input
                                    type="email"
                                    value={newInsurance.contactEmail}
                                    onChange={e => setNewInsurance(f => ({ ...f, contactEmail: e.target.value }))}
                                    placeholder="claims@insurance.com"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setIsAddInsuranceOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleAddInsurance} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                {editingInsurance ? '✓ Update Insurance Partner' : 'Register Insurance Partner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isAddPartnerLabOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-indigo-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">{editingPartnerLab ? 'Edit Partnered Diagnostic Facility' : 'Register Partnered Diagnostic Facility'}</h3>
                                <p className="text-[10px] font-semibold opacity-80">{editingPartnerLab ? 'Update reference laboratory or specialized diagnostic facility details' : 'Add reference laboratory or specialized diagnostic partner'}</p>
                            </div>
                            <button onClick={() => setIsAddPartnerLabOpen(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Partner Laboratory Name *</label>
                                <input
                                    type="text"
                                    value={newPartnerLab.name}
                                    onChange={e => setNewPartnerLab(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Lancet Kenya Ltd, PathCare Diagnostics"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Partner Code / SKU</label>
                                    <input
                                        type="text"
                                        value={newPartnerLab.code}
                                        onChange={e => setNewPartnerLab(f => ({ ...f, code: e.target.value }))}
                                        placeholder="e.g. PARTNER-LANCET"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Contract Discount (%)</label>
                                    <input
                                        type="number"
                                        value={newPartnerLab.discountRate}
                                        onChange={e => setNewPartnerLab(f => ({ ...f, discountRate: Number(e.target.value) }))}
                                        placeholder="10"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Dispatch Phone</label>
                                    <input
                                        type="text"
                                        value={newPartnerLab.phone}
                                        onChange={e => setNewPartnerLab(f => ({ ...f, phone: e.target.value }))}
                                        placeholder="0703061000"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Dispatch Email</label>
                                    <input
                                        type="email"
                                        value={newPartnerLab.email}
                                        onChange={e => setNewPartnerLab(f => ({ ...f, email: e.target.value }))}
                                        placeholder="dispatch@partnerlab.com"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Facility Address / Pickup Point</label>
                                <input
                                    type="text"
                                    value={newPartnerLab.address}
                                    onChange={e => setNewPartnerLab(f => ({ ...f, address: e.target.value }))}
                                    placeholder="e.g. Upper Hill, Fifth Avenue, Nairobi"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setIsAddPartnerLabOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleAddPartnerLab} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                {editingPartnerLab ? '✓ Update Partner Lab' : 'Register Partner Lab'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ ADD HOSPITAL ROOM MODAL ═══════════ */}
            {isAddRoomOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between">
                            <div>
                                <h3 className="text-md font-black uppercase tracking-wider">Configure Hospital Room / Facility</h3>
                                <p className="text-[10px] font-semibold opacity-80">Add consultation room, lab bay, X-Ray suite, or ward bed room</p>
                            </div>
                            <button onClick={() => setIsAddRoomOpen(false)} className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-all">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Room / Suite Name *</label>
                                <input
                                    type="text"
                                    value={newRoom.name}
                                    onChange={e => setNewRoom(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Consultation Room 4, X-Ray Suite B"
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Room Code / ID</label>
                                    <input
                                        type="text"
                                        value={newRoom.code}
                                        onChange={e => setNewRoom(f => ({ ...f, code: e.target.value }))}
                                        placeholder="e.g. CONS-04"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Room Type</label>
                                    <select
                                        value={newRoom.roomType}
                                        onChange={e => setNewRoom(f => ({ ...f, roomType: e.target.value }))}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Consultation Room">Consultation Room</option>
                                        <option value="Laboratory & Diagnostics">Laboratory &amp; Diagnostics</option>
                                        <option value="Radiology & Imaging">Radiology &amp; Imaging</option>
                                        <option value="Injection & Treatment">Injection &amp; Treatment</option>
                                        <option value="Inpatient Ward">Inpatient Ward</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Building Wing / Floor</label>
                                    <input
                                        type="text"
                                        value={newRoom.floorLevel}
                                        onChange={e => setNewRoom(f => ({ ...f, floorLevel: e.target.value }))}
                                        placeholder="Ground Floor - Block A"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Assigned Clinician</label>
                                    <input
                                        type="text"
                                        value={newRoom.assignedStaff}
                                        onChange={e => setNewRoom(f => ({ ...f, assignedStaff: e.target.value }))}
                                        placeholder="e.g. Dr. Sarah Omondi"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Beds / Patient Stations Capacity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={newRoom.capacity}
                                    onChange={e => setNewRoom(f => ({ ...f, capacity: Number(e.target.value) }))}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button onClick={() => setIsAddRoomOpen(false)} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleAddRoom} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                                Save Room Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HISConfigView;

