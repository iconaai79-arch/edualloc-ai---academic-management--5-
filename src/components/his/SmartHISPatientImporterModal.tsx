import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { DocumentArrowDownIcon } from '../icons/DocumentArrowDownIcon';
import { AlertTriangleIcon } from '../icons/AlertTriangleIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { apiService } from '../../services/apiService';

export type PatientFieldKey =
    | 'fullName'
    | 'admissionNumber'
    | 'gender'
    | 'dob'
    | 'age'
    | 'contact'
    | 'gradeLevel'
    | 'stream'
    | 'bloodGroup'
    | 'emergencyContactName'
    | 'emergencyContactPhone'
    | 'allergies'
    | 'chronicConditions'
    | 'insuranceProvider'
    | 'shaNumber';

interface FieldConfig {
    key: PatientFieldKey;
    label: string;
    description: string;
    required?: boolean;
    aliases: string[];
}

const PATIENT_FIELDS: FieldConfig[] = [
    {
        key: 'fullName',
        label: 'Full Name',
        description: 'Patient First & Last name',
        required: true,
        aliases: ['fullname', 'full name', 'patient name', 'patient_name', 'name', 'first name', 'patient', 'client name']
    },
    {
        key: 'admissionNumber',
        label: 'File / OP Number',
        description: 'Unique patient record identifier',
        required: false,
        aliases: ['file number', 'file no', 'patient file number', 'op number', 'op no', 'admission number', 'admission no', 'adm no', 'patient id', 'patient no', 'reg number', 'reg no', 'id number', 'patient_number', 'custom_patient_id']
    },
    {
        key: 'gender',
        label: 'Gender',
        description: 'Male, Female, or Other',
        required: false,
        aliases: ['gender', 'sex']
    },
    {
        key: 'dob',
        label: 'Date of Birth',
        description: 'YYYY-MM-DD or DD/MM/YYYY',
        required: false,
        aliases: ['date of birth', 'dob', 'birth date', 'birthdate', 'd.o.b', 'date_of_birth']
    },
    {
        key: 'age',
        label: 'Age',
        description: 'Patient age in years (used if DOB is missing)',
        required: false,
        aliases: ['age', 'years', 'age (yrs)', 'age in years']
    },
    {
        key: 'contact',
        label: 'Phone / Contact',
        description: 'Mobile phone or primary contact',
        required: false,
        aliases: ['phone', 'mobile', 'contact', 'telephone', 'phone number', 'cell', 'tel', 'phone_number', 'mobile_number']
    },
    {
        key: 'gradeLevel',
        label: 'Department / Ward',
        description: 'OPD, Maternity, Pediatrics, etc.',
        required: false,
        aliases: ['department', 'dept', 'ward', 'unit', 'grade', 'class', 'clinic ward']
    },
    {
        key: 'stream',
        label: 'Category / Clinic',
        description: 'Outpatient, Inpatient, ANC, etc.',
        required: false,
        aliases: ['category', 'clinic', 'clinic type', 'stream', 'patient type', 'patient category', 'service type']
    },
    {
        key: 'bloodGroup',
        label: 'Blood Group',
        description: 'A+, B+, O+, AB-, etc.',
        required: false,
        aliases: ['blood group', 'blood type', 'blood', 'abo', 'blood_group']
    },
    {
        key: 'emergencyContactName',
        label: 'Emergency Contact Name',
        description: 'Next of kin or guardian name',
        required: false,
        aliases: ['emergency contact', 'emergency contact name', 'next of kin', 'kin name', 'guardian', 'parent name', 'relative', 'guardian name']
    },
    {
        key: 'emergencyContactPhone',
        label: 'Emergency Contact Phone',
        description: 'Next of kin phone number',
        required: false,
        aliases: ['emergency phone', 'emergency contact phone', 'kin phone', 'guardian phone', 'next of kin contact', 'relative phone']
    },
    {
        key: 'allergies',
        label: 'Known Allergies',
        description: 'Comma-separated drug/food allergies',
        required: false,
        aliases: ['allergies', 'allergy', 'known allergies', 'drug allergies']
    },
    {
        key: 'chronicConditions',
        label: 'Chronic Conditions',
        description: 'Pre-existing medical conditions',
        required: false,
        aliases: ['chronic conditions', 'chronic', 'conditions', 'medical history', 'illnesses', 'pre-existing conditions', 'diseases']
    },
    {
        key: 'insuranceProvider',
        label: 'Insurance Provider',
        description: 'SHA, NHIF, Jubilee, APA, Cash, etc.',
        required: false,
        aliases: ['insurance', 'insurance provider', 'scheme', 'payer', 'insurer', 'nhif', 'sha', 'insurance_provider']
    },
    {
        key: 'shaNumber',
        label: 'SHA / Policy Number',
        description: 'Insurance policy or SHA member number',
        required: false,
        aliases: ['sha number', 'sha no', 'nhif number', 'nhif no', 'policy number', 'member number', 'insurance id', 'policy no']
    }
];

interface SmartHISPatientImporterModalProps {
    onClose: () => void;
    onImportCompleted: () => void;
    institutionId?: string;
    existingPatients?: any[];
}

export function SmartHISPatientImporterModal({
    onClose,
    onImportCompleted,
    institutionId = 'default_inst',
    existingPatients = []
}: SmartHISPatientImporterModalProps) {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'success'>('upload');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<PatientFieldKey, string | null>>(() => {
        return PATIENT_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: null }), {} as Record<PatientFieldKey, string | null>);
    });
    const [processedRows, setProcessedRows] = useState<any[]>([]);
    const [previewSearch, setPreviewSearch] = useState('');
    const [importProgress, setImportProgress] = useState(0);
    const [importedCount, setImportedCount] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate and download a formatted sample Excel template
    const handleDownloadTemplate = () => {
        const sampleRows = [
            {
                'Full Name': 'John Kimani Doe',
                'Patient File Number': 'PAT-00101',
                'Gender': 'Male',
                'Date of Birth': '1992-05-14',
                'Age': 32,
                'Phone Number': '+254712345678',
                'Department / Ward': 'General OPD',
                'Category / Clinic': 'Outpatient',
                'Blood Group': 'O+',
                'Emergency Contact Name': 'Mary Kimani',
                'Emergency Contact Phone': '+254722987654',
                'Known Allergies': 'Penicillin, Peanuts',
                'Chronic Conditions': 'Hypertension',
                'Insurance Provider': 'SHA (NHIF)',
                'SHA / Policy Number': 'SHA-884920'
            },
            {
                'Full Name': 'Grace Achieng Omondi',
                'Patient File Number': 'PAT-00102',
                'Gender': 'Female',
                'Date of Birth': '1998-11-20',
                'Age': 26,
                'Phone Number': '+254733456789',
                'Department / Ward': 'Maternity & Child Health',
                'Category / Clinic': 'ANC Clinic',
                'Blood Group': 'A+',
                'Emergency Contact Name': 'David Omondi',
                'Emergency Contact Phone': '+254701234567',
                'Known Allergies': 'None',
                'Chronic Conditions': 'Asthma',
                'Insurance Provider': 'Jubilee Insurance',
                'SHA / Policy Number': 'JUB-55421'
            },
            {
                'Full Name': 'Samuel Kiprono Cheruiyot',
                'Patient File Number': '',
                'Gender': 'Male',
                'Date of Birth': '',
                'Age': 45,
                'Phone Number': '+254790112233',
                'Department / Ward': 'Dental Clinic',
                'Category / Clinic': 'Specialized Clinic',
                'Blood Group': 'B+',
                'Emergency Contact Name': 'Sarah Cheruiyot',
                'Emergency Contact Phone': '+254720998877',
                'Known Allergies': 'Aspirin',
                'Chronic Conditions': 'Diabetes Type 2',
                'Insurance Provider': 'Cash / Self',
                'SHA / Policy Number': ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(sampleRows);

        // Set column widths for clean appearance
        ws['!cols'] = [
            { wch: 28 }, // Full Name
            { wch: 20 }, // File Number
            { wch: 12 }, // Gender
            { wch: 16 }, // DOB
            { wch: 8 },  // Age
            { wch: 18 }, // Phone
            { wch: 24 }, // Department
            { wch: 20 }, // Category
            { wch: 14 }, // Blood Group
            { wch: 24 }, // Emergency Contact Name
            { wch: 22 }, // Emergency Contact Phone
            { wch: 24 }, // Allergies
            { wch: 24 }, // Chronic Conditions
            { wch: 20 }, // Insurance Provider
            { wch: 22 }  // SHA Number
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Patient_Registry_Template');
        XLSX.writeFile(wb, 'EduAI_Patient_Import_Template.xlsx');
    };

    // Auto-match headers to field definitions
    const autoMapHeaders = (detectedHeaders: string[]) => {
        const newMapping: Record<PatientFieldKey, string | null> = { ...mapping };

        PATIENT_FIELDS.forEach(field => {
            const matchedHeader = detectedHeaders.find(h => {
                const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                return field.aliases.some(alias => {
                    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
                    return clean === cleanAlias || clean.includes(cleanAlias) || cleanAlias.includes(clean);
                });
            });
            if (matchedHeader) {
                newMapping[field.key] = matchedHeader;
            }
        });

        setMapping(newMapping);
    };

    // Process selected Excel or CSV file
    const handleFileProcess = (file: File) => {
        setErrorMessage('');
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) throw new Error('The uploaded workbook contains no sheets.');

                const worksheet = workbook.Sheets[firstSheetName];
                const sheetRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                if (!sheetRows || sheetRows.length < 2) {
                    throw new Error('Spreadsheet must contain a header row and at least one data row.');
                }

                const rawHeaders = (sheetRows[0] || []).map((h: any) => String(h || '').trim()).filter(Boolean);
                if (rawHeaders.length === 0) {
                    throw new Error('Could not find valid column headers in the first row.');
                }

                const rowsJson = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });
                if (rowsJson.length === 0) {
                    throw new Error('No patient data records found in spreadsheet.');
                }

                setHeaders(rawHeaders);
                setRawData(rowsJson);
                autoMapHeaders(rawHeaders);
                setStep('mapping');
            } catch (err: any) {
                setErrorMessage(err.message || 'Failed to read spreadsheet file.');
            }
        };

        reader.onerror = () => {
            setErrorMessage('File read error. Please ensure the file is a valid Excel or CSV spreadsheet.');
        };

        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileProcess(e.dataTransfer.files[0]);
        }
    };

    // Clean and validate parsed rows
    const buildProcessedRows = () => {
        if (!mapping.fullName) {
            setErrorMessage("Please map the required 'Full Name' field.");
            return;
        }

        let nextSequenceNumber = 1001;
        // Check highest existing number to avoid collisions
        existingPatients.forEach(p => {
            const adm = p.admissionNumber || p.admission_number || p.patientNumber || '';
            const match = adm.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num >= nextSequenceNumber) {
                    nextSequenceNumber = num + 1;
                }
            }
        });

        const processed = rawData.map((row, index) => {
            const getVal = (key: PatientFieldKey) => {
                const colName = mapping[key];
                if (!colName || row[colName] === undefined) return '';
                return String(row[colName]).trim();
            };

            const fullName = getVal('fullName');
            let admissionNumber = getVal('admissionNumber');
            const genderRaw = getVal('gender').toLowerCase();
            let gender = 'Male';
            if (genderRaw.startsWith('f') || genderRaw.includes('female') || genderRaw.includes('woman') || genderRaw.includes('girl')) {
                gender = 'Female';
            } else if (genderRaw.startsWith('o') || genderRaw.includes('other')) {
                gender = 'Other';
            } else if (genderRaw.startsWith('m') || genderRaw.includes('male') || genderRaw.includes('man') || genderRaw.includes('boy')) {
                gender = 'Male';
            }

            // Calculate or format DOB
            let dob = getVal('dob');
            const ageStr = getVal('age');
            if (dob) {
                // If it's an Excel numeric date serial
                if (/^\d{5}$/.test(dob)) {
                    const parsedDate = new Date(Math.round((Number(dob) - 25569) * 86400 * 1000));
                    if (!isNaN(parsedDate.getTime())) {
                        dob = parsedDate.toISOString().split('T')[0];
                    }
                } else {
                    const parsedDate = new Date(dob);
                    if (!isNaN(parsedDate.getTime())) {
                        dob = parsedDate.toISOString().split('T')[0];
                    }
                }
            } else if (ageStr && !isNaN(Number(ageStr))) {
                const ageNum = parseInt(ageStr, 10);
                if (ageNum > 0 && ageNum < 125) {
                    const currentYear = new Date().getFullYear();
                    dob = `${currentYear - ageNum}-01-01`;
                }
            }

            // If file number is absent, auto-generate sequential identifier
            let isAutoFileNumber = false;
            if (!admissionNumber) {
                admissionNumber = `PAT-${String(nextSequenceNumber++).padStart(5, '0')}`;
                isAutoFileNumber = true;
            }

            const allergiesRaw = getVal('allergies');
            const allergies = allergiesRaw && allergiesRaw.toLowerCase() !== 'none' && allergiesRaw.toLowerCase() !== 'nil' ? allergiesRaw : '';

            const chronicRaw = getVal('chronicConditions');
            const chronicConditions = chronicRaw && chronicRaw.toLowerCase() !== 'none' && chronicRaw.toLowerCase() !== 'nil' ? chronicRaw : '';

            const bloodGroupRaw = getVal('bloodGroup').toUpperCase().replace(/\s+/g, '');
            const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            const bloodGroup = validBloodGroups.includes(bloodGroupRaw) ? bloodGroupRaw : (bloodGroupRaw ? bloodGroupRaw : '');

            const isValid = Boolean(fullName && fullName.length >= 2);

            return {
                id: `his_p_${Date.now()}_${index}`,
                institutionId,
                institution_id: institutionId,
                fullName,
                name: fullName,
                admissionNumber,
                admission_number: admissionNumber,
                customPatientId: admissionNumber,
                custom_patient_id: admissionNumber,
                patientNumber: admissionNumber,
                patient_number: admissionNumber,
                opNumber: admissionNumber,
                op_number: admissionNumber,
                gender,
                dob: dob || null,
                contact: getVal('contact'),
                gradeLevel: getVal('gradeLevel') || 'General OPD',
                grade_level: getVal('gradeLevel') || 'General OPD',
                stream: getVal('stream') || 'Outpatient',
                bloodGroup,
                blood_group: bloodGroup,
                emergencyContactName: getVal('emergencyContactName'),
                emergency_contact_name: getVal('emergencyContactName'),
                emergencyContactPhone: getVal('emergencyContactPhone'),
                emergency_contact_phone: getVal('emergencyContactPhone'),
                allergies,
                chronicConditions,
                chronic_conditions: chronicConditions,
                insuranceProvider: getVal('insuranceProvider'),
                insurance_provider: getVal('insuranceProvider'),
                shaNumber: getVal('shaNumber'),
                sha_number: getVal('shaNumber'),
                status: 'Active',
                isAutoFileNumber,
                isValid,
                selected: isValid,
                createdAt: new Date().toISOString(),
                created_at: new Date().toISOString()
            };
        });

        setProcessedRows(processed);
        setStep('preview');
    };

    // Execute bulk insertion
    const handleExecuteImport = async () => {
        const rowsToImport = processedRows.filter(r => r.selected && r.isValid);
        if (rowsToImport.length === 0) {
            setErrorMessage('No valid rows selected for import.');
            return;
        }

        setStep('importing');
        setImportProgress(0);
        let successCount = 0;

        try {
            const batchSize = 10;
            const totalBatches = Math.ceil(rowsToImport.length / batchSize);

            for (let i = 0; i < totalBatches; i++) {
                const chunk = rowsToImport.slice(i * batchSize, (i + 1) * batchSize);
                
                await Promise.all(
                    chunk.map(patient => {
                        const { isAutoFileNumber, isValid, selected, ...payload } = patient;
                        return apiService.saveModuleRecord('his_patients', payload);
                    })
                );

                successCount += chunk.length;
                setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
            }

            setImportedCount(successCount);
            setStep('success');
            onImportCompleted();
        } catch (err: any) {
            setErrorMessage(err.message || 'An error occurred during batch patient import.');
            setStep('preview');
        }
    };

    const validRowsCount = processedRows.filter(r => r.isValid).length;
    const selectedRowsCount = processedRows.filter(r => r.selected && r.isValid).length;
    const autoFileCount = processedRows.filter(r => r.selected && r.isAutoFileNumber).length;

    const filteredPreviewRows = processedRows.filter(r => {
        if (!previewSearch) return true;
        const q = previewSearch.toLowerCase();
        return (
            r.fullName.toLowerCase().includes(q) ||
            r.admissionNumber.toLowerCase().includes(q) ||
            (r.contact || '').includes(q) ||
            (r.gradeLevel || '').toLowerCase().includes(q)
        );
    });

    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-zoom-in">

                {/* Header */}
                <div className="p-7 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shadow-lg backdrop-blur-md">
                            <ArrowUpTrayIcon className="w-6 h-6 text-emerald-100" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-black uppercase tracking-tight italic">
                                    Smart Patient <span className="text-emerald-200">Excel Importer</span>
                                </h2>
                                <span className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white tracking-widest">
                                    HIS v2.4
                                </span>
                            </div>
                            <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-0.5 opacity-90">
                                {step === 'upload' && 'Step 1: Upload Excel or CSV patient register'}
                                {step === 'mapping' && 'Step 2: Verify & match spreadsheet column headers'}
                                {step === 'preview' && 'Step 3: Review data preview & confirm bulk import'}
                                {step === 'importing' && 'Step 4: Registering patients into clinical registry...'}
                                {step === 'success' && 'Import complete! Patient records are now live.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDownloadTemplate}
                            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/20 shadow-sm"
                            title="Download formatted sample template"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            <span>Download Template</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-white/20 rounded-xl text-white transition-all"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-8 overflow-y-auto flex-1 space-y-6">

                    {errorMessage && (
                        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 animate-shake">
                            <AlertTriangleIcon className="w-5 h-5 flex-shrink-0" />
                            <p className="text-[10px] font-black uppercase tracking-wider">{errorMessage}</p>
                        </div>
                    )}

                    {/* Step 1: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-6">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-[2.5rem] p-12 text-center cursor-pointer transition-all ${
                                    isDragging
                                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]'
                                        : 'border-slate-300 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50 dark:bg-white/5 hover:bg-slate-100/80 dark:hover:bg-white/10'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileProcess(e.target.files[0]);
                                        }
                                    }}
                                />

                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white mx-auto mb-5 shadow-xl shadow-emerald-500/20">
                                    <ArrowUpTrayIcon className="w-10 h-10 animate-pulse" />
                                </div>

                                <h3 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                    Drag & Drop your Patient Spreadsheet here
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files
                                </p>

                                <div className="mt-6 flex items-center justify-center gap-3">
                                    <span className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">
                                        Browse Computer
                                    </span>
                                </div>
                            </div>

                            {/* Quick Instructions & Template callout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-800/30 flex items-start gap-4">
                                    <div className="p-3 bg-indigo-600 rounded-xl text-white">
                                        <SparklesIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-tight text-indigo-900 dark:text-indigo-300">
                                            Smart Column Detection
                                        </h4>
                                        <p className="text-[10px] text-indigo-700/80 dark:text-indigo-300/70 font-bold uppercase tracking-wider mt-1">
                                            The system automatically recognizes headers like Patient Name, File No, Phone, Gender, Ward, and Allergies.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 flex items-start gap-4">
                                    <div className="p-3 bg-emerald-600 rounded-xl text-white">
                                        <DocumentArrowDownIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-300">
                                            Automatic File Numbering
                                        </h4>
                                        <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/70 font-bold uppercase tracking-wider mt-1">
                                            If patient file numbers are missing in your spreadsheet, unique sequential IDs (e.g. PAT-01001) will be generated automatically.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Mapping */}
                    {step === 'mapping' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-200 dark:border-white/10">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white">
                                        Spreadsheet Loaded: <span className="text-emerald-500">{rawData.length} rows</span>
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                        Map each system field to the corresponding column from your file.
                                    </p>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest self-start sm:self-auto"
                                >
                                    📥 View standard column layout
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {PATIENT_FIELDS.map((field) => {
                                    const isMapped = Boolean(mapping[field.key]);
                                    return (
                                        <div
                                            key={field.key}
                                            className={`p-4 rounded-2xl border transition-all ${
                                                isMapped
                                                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30'
                                                    : field.required
                                                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-500/30'
                                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                        <span>{field.label}</span>
                                                        {field.required && (
                                                            <span className="text-rose-500 text-xs">*</span>
                                                        )}
                                                    </label>
                                                    <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                                                        {field.description}
                                                    </p>
                                                </div>
                                                {isMapped && (
                                                    <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <CheckCircleIcon className="w-3 h-3" /> Mapped
                                                    </span>
                                                )}
                                            </div>

                                            <select
                                                value={mapping[field.key] || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value || null;
                                                    setMapping(prev => ({ ...prev, [field.key]: val }));
                                                }}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-[10px] font-black uppercase tracking-wider outline-none focus:border-emerald-500 text-slate-900 dark:text-white"
                                            >
                                                <option value="">-- DO NOT MAP / AUTO-GENERATE --</option>
                                                {headers.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                                <button
                                    onClick={() => setStep('upload')}
                                    className="px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    ◄ Change File
                                </button>
                                <button
                                    onClick={buildProcessedRows}
                                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <span>Preview Data ({rawData.length} Rows)</span>
                                    <SparklesIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 'preview' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Stats Summary Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Rows</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{processedRows.length}</p>
                                </div>
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-500/20">
                                    <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Ready to Import</p>
                                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{selectedRowsCount}</p>
                                </div>
                                <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-2xl border border-indigo-500/20">
                                    <p className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Auto File Numbers</p>
                                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{autoFileCount}</p>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-500/20">
                                    <p className="text-[9px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">Invalid Rows</p>
                                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{processedRows.length - validRowsCount}</p>
                                </div>
                            </div>

                            {/* Search & Actions in Preview */}
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                                <div className="relative flex-1">
                                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="SEARCH PREVIEW BY PATIENT NAME, OP NO, PHONE..."
                                        value={previewSearch}
                                        onChange={(e) => setPreviewSearch(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-[9px] font-black uppercase tracking-wider outline-none focus:border-emerald-500 dark:text-white"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setProcessedRows(prev => prev.map(r => ({ ...r, selected: r.isValid })));
                                        }}
                                        className="px-3.5 py-2 bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200"
                                    >
                                        Select All Valid
                                    </button>
                                    <button
                                        onClick={() => {
                                            setProcessedRows(prev => prev.map(r => ({ ...r, selected: false })));
                                        }}
                                        className="px-3.5 py-2 bg-slate-100 dark:bg-white/5 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            {/* Table Preview */}
                            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                                <table className="w-full text-left text-[9px]">
                                    <thead className="bg-slate-100 dark:bg-white/5 text-slate-400 font-black uppercase tracking-wider sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 w-10 text-center">Inc</th>
                                            <th className="p-3">Patient Name</th>
                                            <th className="p-3">File / OP No</th>
                                            <th className="p-3">Gender</th>
                                            <th className="p-3">DOB</th>
                                            <th className="p-3">Phone</th>
                                            <th className="p-3">Department</th>
                                            <th className="p-3">Insurance</th>
                                            <th className="p-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-bold">
                                        {filteredPreviewRows.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                                                    !row.isValid
                                                        ? 'opacity-40 bg-rose-50/20'
                                                        : row.selected
                                                        ? ''
                                                        : 'opacity-50'
                                                }`}
                                            >
                                                <td className="p-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={row.selected}
                                                        disabled={!row.isValid}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            setProcessedRows(prev => prev.map((r, i) => i === idx ? { ...r, selected: isChecked } : r));
                                                        }}
                                                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="p-3 font-black text-slate-900 dark:text-white uppercase">
                                                    {row.fullName || <span className="text-rose-500">[Missing Name]</span>}
                                                </td>
                                                <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400">
                                                    {row.admissionNumber}
                                                    {row.isAutoFileNumber && (
                                                        <span className="ml-1 text-[7px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-1 py-0.5 rounded font-black">
                                                            AUTO
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3">{row.gender}</td>
                                                <td className="p-3">{row.dob || '—'}</td>
                                                <td className="p-3">{row.contact || '—'}</td>
                                                <td className="p-3">{row.gradeLevel}</td>
                                                <td className="p-3">{row.insuranceProvider || 'Cash'}</td>
                                                <td className="p-3">
                                                    {row.isValid ? (
                                                        <span className="text-emerald-500 text-[8px] uppercase font-black">Ready</span>
                                                    ) : (
                                                        <span className="text-rose-500 text-[8px] uppercase font-black">Invalid Name</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center">
                                <button
                                    onClick={() => setStep('mapping')}
                                    className="px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                >
                                    ◄ Adjust Mapping
                                </button>
                                <button
                                    onClick={handleExecuteImport}
                                    disabled={selectedRowsCount === 0}
                                    className="px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:scale-105 transition-all disabled:opacity-40 flex items-center gap-2"
                                >
                                    <span>Import {selectedRowsCount} Patients</span>
                                    <CheckCircleIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Importing Progress */}
                    {step === 'importing' && (
                        <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center animate-fade-in">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-4 border-emerald-500 border-t-transparent animate-spin flex items-center justify-center">
                                <SparklesIcon className="w-8 h-8 text-emerald-500 animate-pulse" />
                            </div>

                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Registering Patients in Batch...
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    Synchronizing with clinical registry and Supabase cloud cache
                                </p>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full max-w-md bg-slate-100 dark:bg-white/10 rounded-full h-3 overflow-hidden p-0.5">
                                <div
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${importProgress}%` }}
                                ></div>
                            </div>
                            <span className="text-[10px] font-mono font-black text-emerald-500">{importProgress}% Completed</span>
                        </div>
                    )}

                    {/* Step 5: Success */}
                    {step === 'success' && (
                        <div className="py-10 flex flex-col items-center justify-center space-y-6 text-center animate-bounce-in">
                            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>

                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Import Successfully Completed!
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                                    <span className="text-emerald-500 font-black">{importedCount} patients</span> have been added to the health registry.
                                </p>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={onClose}
                                    className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/30 hover:scale-105 transition-all"
                                >
                                    Open Patient Registry →
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}

export default SmartHISPatientImporterModal;
