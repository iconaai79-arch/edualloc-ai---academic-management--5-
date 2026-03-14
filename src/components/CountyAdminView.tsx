import React, { useState, useEffect, useMemo } from 'react';
import { User, Institution, County, AllocationRequest, Role, CountyInventoryItem, CountyInventoryCategory, CountyStore, StockTransaction, BursaryApplication, CountyBursaryFund, ActivityLog } from '../types';
import {
    BuildingOfficeIcon,
    UserGroupIcon,
    ChartPieIcon,
    ArrowRightOnRectangleIcon,
    AcademicCapIcon,
    Cog8ToothIcon,
    SparklesIcon,
    ArrowUpTrayIcon,
    PlusIcon,
    EnvelopeIcon,
    PhoneIcon,
    PencilIcon,
    UserIcon,
    XIcon,
    FingerPrintIcon,
    ArchiveBoxIcon,
    TruckIcon,
    QrCodeIcon,
    MapPinIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    CurrencyIcon,
    ClipboardListIcon,
    CheckIcon,
    DocumentArrowDownIcon,
    ShieldIcon,
    TrashIcon,
    BedIcon,
    ChatBubbleBottomCenterTextIcon,
    BookOpenIcon,
    BeakerIcon,
    HomeIcon
} from './icons/index';
import { apiService } from '../services/apiService';
import { SmartInstitutionImporterModal } from './SmartInstitutionImporterModal';
import { SmartInventoryImporterModal } from './SmartInventoryImporterModal';
import { ExternalModuleView } from './ExternalModuleView';

interface CountyAdminViewProps {
    currentUser: User;
    counties: County[];
    institutions: Institution[];
    users: User[];
    onLogout: () => void;
    onUpdateInstitution: (id: string, data: Partial<Institution>) => void;
    onUpdateCounty?: (id: string, data: Partial<County>) => Promise<void>;
    onAddInstitution?: (data: any) => Promise<void>;
    onLoginAsAdmin?: (institutionId: string, initialRole?: Role | null) => void;
    onImportInstitutions?: (data: any[]) => Promise<void>;
    onAddUser?: (data: any) => Promise<void>;
    onUpdateUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    inventoryItems?: CountyInventoryItem[];
    inventoryCategories?: CountyInventoryCategory[];
    onAddInventoryItem?: (data: any) => Promise<void>;
    onUpdateInventoryItem?: (id: string, data: Partial<CountyInventoryItem>) => Promise<void>;
    onDeleteInventoryItem?: (id: string) => Promise<void>;
    onAddInventoryCategory?: (data: any) => Promise<void>;
    onUpdateInventoryCategory?: (id: string, data: Partial<CountyInventoryCategory>) => Promise<void>;
    onDeleteInventoryCategory?: (id: string) => Promise<void>;
    stores?: CountyStore[];
    onAddStore?: (data: any) => Promise<void>;
    onUpdateStore?: (id: string, data: Partial<CountyStore>) => Promise<void>;
    onDeleteStore?: (id: string) => Promise<void>;
    onAddStockTransaction?: (data: any) => Promise<void>;
    stockTransactions?: StockTransaction[];
    bursaryApplications?: BursaryApplication[];
    bursaryFunds?: CountyBursaryFund[];
    onUpdateBursaryApplication?: (id: string, data: Partial<BursaryApplication>) => Promise<void>;
    onAddBursaryFund?: (data: any) => Promise<void>;
    onUpdateBursaryFund?: (id: string, data: Partial<CountyBursaryFund>) => Promise<void>;
    onDeleteBursaryFund?: (id: string) => Promise<void>;
    activityLog?: ActivityLog[];
    onLogAction?: (action: string) => Promise<void>;
}

export const CountyAdminView: React.FC<CountyAdminViewProps> = ({
    currentUser,
    counties,
    institutions,
    users,
    onLogout,
    onUpdateInstitution,
    onUpdateCounty,
    onAddInstitution,
    onLoginAsAdmin,
    onImportInstitutions,
    onAddUser,
    onUpdateUser,
    onDeleteUser,
    inventoryItems = [],
    inventoryCategories = [],
    stores = [],
    onAddInventoryItem,
    onUpdateInventoryItem,
    onDeleteInventoryItem,
    onAddInventoryCategory,
    onUpdateInventoryCategory,
    onDeleteInventoryCategory,
    onAddStore,
    onUpdateStore,
    onDeleteStore,
    onAddStockTransaction,
    stockTransactions = [],
    bursaryApplications = [],
    bursaryFunds = [],
    onUpdateBursaryApplication,
    onAddBursaryFund,
    onUpdateBursaryFund,
    onDeleteBursaryFund,
    activityLog = [],
    onLogAction
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'institutions' | 'staff' | 'inventory' | 'bursaries' | 'settings' | 'external_module'>('dashboard');
    const [inventorySubTab, setInventorySubTab] = useState<'items' | 'categories' | 'stores' | 'dispatch' | 'reports'>('items');
    const [bursarySubTab, setBursarySubTab] = useState<'applications' | 'vetting' | 'disbursement' | 'funds' | 'reports'>('applications');
    const [settingsSubTab, setSettingsSubTab] = useState<'branding'>('branding');
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [isPerspectiveModalOpen, setIsPerspectiveModalOpen] = useState(false);
    const [selectedTenantForPerspective, setSelectedTenantForPerspective] = useState<Institution | null>(null);

    // Institution Registration State
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerData, setRegisterData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        type: 'University',
        adminName: '',
        adminEmail: '',
        subCounty: '',
        constituency: '',
        ward: ''
    });

    // Logic to find the admin's county. 
    // We match by direct admin association or via the institution's county registration.
    const myCounty = useMemo(() => {
        const directMatch = counties.find(c =>
            (c.adminName && c.adminName.toLowerCase() === currentUser.name.toLowerCase()) ||
            (c.email && c.email.toLowerCase() === currentUser.email.toLowerCase())
        );
        if (directMatch) return directMatch;

        // Alternative check: find user's institution and check its countyId
        const myInst = institutions.find(i => i.id === currentUser.institutionId);
        if (myInst?.countyId) {
            return counties.find(c => c.id === myInst.countyId) || null;
        }
        return null;
    }, [counties, currentUser, institutions]);

    const myInstitutions = institutions.filter(i => i.countyId === myCounty?.id);
    const myStaff = users.filter(u => u.institutionId === (myCounty?.id || '') && u.role.startsWith('county_'));
    const myInventory = (inventoryItems || []).filter(i => i.countyId === myCounty?.id);
    const myStores = (stores || []).filter(s => s.countyId === myCounty?.id);
    const myCategories = (inventoryCategories || []).filter(c => c.countyId === myCounty?.id);
    const myStockTransactions = (stockTransactions || []).filter(tx =>
        myInstitutions.some(inst => inst.id === tx.institutionId)
    );

    const formatRole = (role: string) => {
        if (role === 'county_admin') return 'County Admin';
        if (role === 'county_staff') return 'County Staff';
        if (role === 'county_secretary') return 'Secretary';
        if (role === 'county_driver') return 'Driver';
        if (role === 'county_store_keeper') return 'Store Keeper';
        if (role === 'county_teacher') return 'Teacher';
        if (role === 'county_director') return 'Director';
        if (role === 'county_co') return 'CO';
        if (role === 'county_cec') return 'CEC';
        if (role === 'county_deputy_governor') return 'Deputy Governor';
        if (role === 'county_governor') return 'Governor';
        return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const [showStaffModal, setShowStaffModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<User | null>(null);
    const [staffForm, setStaffForm] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        role: 'county_staff' as Role,
        staffId: ''
    });

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myCounty) return;

        try {
            if (editingStaff) {
                if (onUpdateUser) {
                    await onUpdateUser(editingStaff.id, staffForm);
                    onLogAction?.(`Updated staff member: ${staffForm.name} (${staffForm.role})`);
                }
            } else {
                if (onAddUser) {
                    await onAddUser({
                        ...staffForm,
                        institutionId: myCounty.id,
                        expertise: ['County Management'],
                        password: Math.random().toString(36).slice(-8) // Temporary password
                    });
                    onLogAction?.(`Added new staff member: ${staffForm.name} as ${staffForm.role}`);
                }
            }
            setShowStaffModal(false);
            setEditingStaff(null);
            setStaffForm({ name: '', email: '', phoneNumber: '', role: 'county_staff', staffId: '' });
        } catch (err) {
            alert("Failed to save staff record.");
        }
    };

    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [showInventoryImportModal, setShowInventoryImportModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingInventory, setEditingInventory] = useState<CountyInventoryItem | null>(null);
    const [editingCategory, setEditingCategory] = useState<CountyInventoryCategory | null>(null);
    const [showQrModal, setShowQrModal] = useState<CountyInventoryItem | null>(null);
    const [showDispatchModal, setShowDispatchModal] = useState<CountyInventoryItem | null>(null);
    const [dispatchForm, setDispatchForm] = useState({ recipientName: '' });
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [inventoryForm, setInventoryForm] = useState({
        name: '',
        category: '',
        quantity: 1,
        unit: 'Units',
        supplierName: '',
        targetInstitutionId: '',
        deliveryMethod: 'driver' as 'driver' | 'parcel',
        driverName: '',
        trackingNumber: ''
    });

    const [categoryForm, setCategoryForm] = useState({
        name: '',
        description: ''
    });

    const [showStoreModal, setShowStoreModal] = useState(false);
    const [editingStore, setEditingStore] = useState<CountyStore | null>(null);
    const [storeForm, setStoreForm] = useState({
        name: '',
        locationName: '',
        latitude: 0,
        longitude: 0,
        description: ''
    });

    const openPerspectiveSelection = (tenant: Institution) => {
        setSelectedTenantForPerspective(tenant);
        setIsPerspectiveModalOpen(true);
    };

    const perspectiveOptions = [
        { role: 'admin', label: 'Timetable', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'security', label: 'Security Module', icon: <ShieldIcon className="w-6 h-6" />, color: 'bg-red-50 text-red-600' },
        { role: 'store', label: 'Inventory Module', icon: <ArchiveBoxIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
        { role: 'transport_assistant', label: 'Transport Module', icon: <MapPinIcon className="w-6 h-6" />, color: 'bg-teal-50 text-teal-600' },
        { role: 'boarding_master', label: 'Boarding Module', icon: <BedIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
        { role: 'info_desk', label: 'Info Desk Module', icon: <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />, color: 'bg-sky-50 text-sky-600' },
        { role: 'librarian', label: 'Library Module', icon: <BookOpenIcon className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600' },
        { role: 'parent', label: 'Parent Portal', icon: <UserGroupIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { role: 'student', label: 'Student Portal', icon: <AcademicCapIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'lecturer', label: 'Teacher/Lecturer Portal', icon: <UserIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
        { role: 'agrovet_admin', label: 'Agrovet Module', icon: <BeakerIcon className="w-6 h-6" />, color: 'bg-green-50 text-green-600' },
        { role: 'property_admin', label: 'Property Module', icon: <HomeIcon className="w-6 h-6" />, color: 'bg-cyan-50 text-cyan-600' },
        { role: 'carwash_admin', label: 'Car Wash Module', icon: <SparklesIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-400' }
    ].filter(opt => {
        const isEdu = ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'HIS', 'TVET', 'Kindergarten'].includes(selectedTenantForPerspective?.institutionType || '');
        if (isEdu) {
            return !['agrovet_admin', 'property_admin', 'carwash_admin'].includes(opt.role);
        }
        return true;
    });

    const [showFundModal, setShowFundModal] = useState(false);
    const [editingFund, setEditingFund] = useState<CountyBursaryFund | null>(null);
    const [fundForm, setFundForm] = useState({
        name: '',
        totalBudget: 0,
        financialYear: new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString(),
        publicParticipationLink: ''
    });

    const handleFundSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myCounty) return;

        try {
            if (editingFund) {
                if (onUpdateBursaryFund) {
                    await onUpdateBursaryFund(editingFund.id, {
                        ...fundForm,
                        allocatedAmount: editingFund.allocatedAmount, // Keep existing
                        remainingAmount: fundForm.totalBudget - (editingFund.allocatedAmount - editingFund.remainingAmount)
                    });
                    onLogAction?.(`Updated bursary fund: ${fundForm.name} for FY ${fundForm.financialYear}`);
                }
            } else {
                if (onAddBursaryFund) {
                    await onAddBursaryFund({
                        ...fundForm,
                        countyId: myCounty.id,
                        allocatedAmount: 0,
                        remainingAmount: fundForm.totalBudget
                    });
                    onLogAction?.(`Created new bursary fund: ${fundForm.name} with budget KES ${fundForm.totalBudget.toLocaleString()}`);
                }
            }
            setShowFundModal(false);
            setEditingFund(null);
            setFundForm({ name: '', totalBudget: 0, financialYear: new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString(), publicParticipationLink: '' });
        } catch (err) {
            alert("Failed to save fund.");
        }
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myCounty) return;

        try {
            if (editingCategory) {
                if (onUpdateInventoryCategory) {
                    await onUpdateInventoryCategory(editingCategory.id, categoryForm);
                    onLogAction?.(`Updated inventory category: ${categoryForm.name}`);
                }
            } else {
                if (onAddInventoryCategory) {
                    await onAddInventoryCategory({
                        ...categoryForm,
                        countyId: myCounty.id
                    });
                    onLogAction?.(`Created new inventory category: ${categoryForm.name}`);
                }
            }
            setShowCategoryModal(false);
            setEditingCategory(null);
            setCategoryForm({ name: '', description: '' });
        } catch (err) {
            alert("Failed to save category.");
        }
    };

    const handleStoreSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myCounty) return;

        try {
            if (editingStore) {
                if (onUpdateStore) {
                    await onUpdateStore(editingStore.id, storeForm);
                    onLogAction?.(`Updated store/location: ${storeForm.name} at ${storeForm.locationName}`);
                }
            } else {
                if (onAddStore) {
                    await onAddStore({
                        ...storeForm,
                        countyId: myCounty.id
                    });
                    onLogAction?.(`Registered new store/location: ${storeForm.name} at ${storeForm.locationName}`);
                }
            }
            setShowStoreModal(false);
            setEditingStore(null);
            setStoreForm({ name: '', locationName: '', latitude: 0, longitude: 0, description: '' });
        } catch (err) {
            alert("Failed to save store.");
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        // Show loading state or feedback could be nice, but simple alert on error works for now
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setStoreForm(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }));
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve your location. Please ensure you have granted location permissions.");
            },
            { enableHighAccuracy: true }
        );
    };

    const handleInventorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myCounty) return;

        try {
            if (editingInventory) {
                if (onUpdateInventoryItem) {
                    await onUpdateInventoryItem(editingInventory.id, inventoryForm);
                    onLogAction?.(`Updated inventory item: ${inventoryForm.name} (${inventoryForm.quantity} ${inventoryForm.unit})`);
                }
            } else {
                if (onAddInventoryItem) {
                    const itemId = `cinv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    await onAddInventoryItem({
                        ...inventoryForm,
                        id: itemId,
                        countyId: myCounty.id,
                        status: 'at_hq',
                        atHqDate: new Date().toISOString(),
                        qrCode: `INV-${Date.now()}`
                    });

                    // Record HQ Receipt Transaction
                    if (onAddStockTransaction) {
                        await onAddStockTransaction({
                            itemId: itemId,
                            itemName: inventoryForm.name,
                            type: 'Receipt',
                            quantity: inventoryForm.quantity,
                            recipientOrSupplier: inventoryForm.supplierName || 'HQ',
                            date: new Date().toISOString(),
                            recordedBy: currentUser.id,
                            countyId: myCounty.id
                        });
                    }

                    onLogAction?.(`Logged HQ receipt: ${inventoryForm.name} (${inventoryForm.quantity} ${inventoryForm.unit}) from ${inventoryForm.supplierName}`);
                }
            }
            setShowInventoryModal(false);
            setEditingInventory(null);
            setInventoryForm({
                name: '', category: '', quantity: 1, unit: 'Units',
                supplierName: '', targetInstitutionId: '',
                deliveryMethod: 'driver', driverName: '', trackingNumber: ''
            });
        } catch (err) {
            alert("Failed to save inventory record.");
        }
    };

    const handleDispatch = (item: CountyInventoryItem) => {
        setDispatchForm({ recipientName: item.driverName || '' });
        setShowDispatchModal(item);
    };

    const confirmDispatch = async () => {
        if (!showDispatchModal || !onUpdateInventoryItem || !myCounty) return;

        const canvas = canvasRef.current;
        const signature = canvas ? canvas.toDataURL() : undefined;

        try {
            await onUpdateInventoryItem(showDispatchModal.id, {
                status: 'in_transit',
                dispatchedDate: new Date().toISOString(),
                recipientName: dispatchForm.recipientName,
                recipientSignature: signature
            });

            // Create stock transaction
            if (onAddStockTransaction) {
                await onAddStockTransaction({
                    itemId: showDispatchModal.id,
                    itemName: showDispatchModal.name,
                    type: 'Dispatch',
                    quantity: showDispatchModal.quantity,
                    recipientOrSupplier: institutions.find(i => i.id === showDispatchModal.targetInstitutionId)?.name || 'Institution',
                    date: new Date().toISOString(),
                    recordedBy: currentUser.id,
                    countyId: myCounty.id
                });
            }

            onLogAction?.(`Dispatched inventory: ${showDispatchModal.name} to ${institutions.find(i => i.id === showDispatchModal.targetInstitutionId)?.name || 'institution'}`);
            setShowDispatchModal(null);
        } catch (err) {
            alert("Failed to dispatch item.");
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();

        // Prevent scrolling when drawing on touch devices
        if ('touches' in e) {
            (e as any).preventDefault();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    useEffect(() => {
        if (currentUser.role === 'county_store_keeper') {
            setActiveTab('inventory');
        }
    }, [currentUser.role]);

    useEffect(() => {
        if (myCounty?.logoUrl) setLogoPreview(myCounty.logoUrl);
        if (myCounty?.letterheadUrl) setLetterheadPreview(myCounty.letterheadUrl);
    }, [myCounty]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead') => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview First
        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'logo') setLogoPreview(reader.result as string);
            else setLetterheadPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        if (!myCounty || !onUpdateCounty) {
            console.warn("Cannot save upload: County context missing or update handler not provided.");
            return;
        }

        setIsUploading(true);
        try {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'png';
            const path = `counties/${myCounty.id}/branding/${type}_${timestamp}.${ext}`;

            const publicUrl = await apiService.uploadFile('eduai', path, file);

            if (publicUrl) {
                await onUpdateCounty(myCounty.id, {
                    [type === 'logo' ? 'logoUrl' : 'letterheadUrl']: publicUrl
                });
                onLogAction?.(`Updated county branding: ${type === 'logo' ? 'Official Logo' : 'Official Letterhead Header'}`);
                alert(`${type === 'logo' ? 'Logo' : 'Letterhead'} updated successfully!`);
            } else {
                alert("Upload failed. Ensure you have created the 'eduai' bucket in Supabase storage and set it to 'Public'.");
            }
        } catch (error: any) {
            console.error("Upload error:", error);
            alert(`An error occurred: ${error.message || 'Check your internet connection'}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!onAddInstitution || !myCounty) {
            alert("Registration not available");
            return;
        }

        if (!registerData.name || !registerData.email || !registerData.adminEmail) {
            alert("Please fill in required fields");
            return;
        }

        try {
            await onAddInstitution({
                name: registerData.name,
                email: registerData.email,
                phoneNumber: registerData.phoneNumber,
                institutionType: registerData.type,
                adminName: registerData.adminName,
                adminEmail: registerData.adminEmail,
                countyId: myCounty.id,
                subCounty: registerData.subCounty,
                constituency: registerData.constituency,
                ward: registerData.ward
            });
            onLogAction?.(`Registered new institution: ${registerData.name} (${registerData.type})`);
            setShowRegisterModal(false);
            setRegisterData({ name: '', email: '', phoneNumber: '', type: 'University', adminName: '', adminEmail: '', subCounty: '', constituency: '', ward: '' });
        } catch (error) {
            console.error(error);
            // Alert handled by parent usually, but just in case
        }
    };

    // Calculate stats
    const totalStudents = users.filter(u =>
        u.role === 'student' &&
        myInstitutions.some(i => i.id === u.institutionId)
    ).length;

    const totalLecturers = users.filter(u =>
        u.role === 'lecturer' &&
        myInstitutions.some(i => i.id === u.institutionId)
    ).length;

    if (!myCounty) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BuildingOfficeIcon className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">No County Assigned</h2>
                    <p className="text-slate-500 mb-6">
                        We couldn't match your account to any county.<br />
                        Please ensure your name ({currentUser.name}) matches the "County Administrator" field in the county record.
                    </p>
                    <button
                        onClick={onLogout}
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900 text-white p-6 flex flex-col z-50">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/50">
                        <BuildingOfficeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tight">County Portal</h1>
                        <p className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest">
                            {myCounty.name}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                    >
                        <ChartPieIcon className="w-5 h-5" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('institutions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'institutions'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                    >
                        <AcademicCapIcon className="w-5 h-5" />
                        Institutions
                        <span className="ml-auto bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded-full">
                            {myInstitutions.length}
                        </span>
                    </button>
                    {currentUser.role !== 'county_store_keeper' && (
                        <button
                            onClick={() => setActiveTab('staff')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'staff'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                                }`}
                        >
                            <UserGroupIcon className="w-5 h-5" />
                            County Staff
                            <span className="ml-auto bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded-full">
                                {myStaff.length}
                            </span>
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'inventory'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                    >
                        <ArchiveBoxIcon className="w-5 h-5" />
                        Inventory
                        <span className="ml-auto bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded-full">
                            {inventoryItems.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('bursaries')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'bursaries'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                    >
                        <CurrencyIcon className="w-5 h-5" />
                        Bursaries
                        <span className="ml-auto bg-slate-800 text-white text-[10px] py-0.5 px-2 rounded-full">
                            {bursaryApplications.filter(a => a.status === 'pending').length}
                        </span>
                    </button>
                    {currentUser.role !== 'county_store_keeper' && (
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                                }`}
                        >
                            <Cog8ToothIcon className="w-5 h-5" />
                            Settings
                        </button>
                    )}
                    <button
                        onClick={() => setActiveTab('external_module')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'external_module'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20 font-bold'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                            }`}
                    >
                        <SparklesIcon className="w-5 h-5" />
                        External
                    </button>
                </nav>

                <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <span className="font-bold text-indigo-300">{currentUser.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{currentUser.name}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-72 flex-1 p-8">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                {myCounty.name} Overview
                            </h2>
                            <p className="text-slate-500 font-medium">
                                Manage education resources for county code: {myCounty.code}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                        <AcademicCapIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">{myInstitutions.length}</h3>
                                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Registered Schools</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <UserGroupIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">{totalStudents}</h3>
                                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Active Students</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                                        <CurrencyIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bursary</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">
                                    {bursaryApplications.filter(a => a.status === 'vetted' || a.status === 'approved').length}
                                </h3>
                                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Ready for Payout</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                                        <ShieldIcon className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Claims</span>
                                </div>
                                <h3 className="text-4xl font-black text-slate-900">
                                    {bursaryApplications.filter(a => a.status === 'pending').length}
                                </h3>
                                <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest font-black">Pending Vetting</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                            <SparklesIcon className="w-6 h-6 text-indigo-600" />
                                            Recent System Activity
                                        </h3>
                                        <div className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500">
                                            Live Trail
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-50">
                                        {activityLog.length > 0 ? (
                                            activityLog.slice(0, 8).map(log => (
                                                <div key={log.id} className="p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0 font-bold border border-slate-200">
                                                        {(log.userName || 'U').charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-slate-900">{log.action}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">{log.userName || 'System'}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">[{log.institutionName || 'SYSTEM'}]</span>
                                                            <span className="text-[9px] text-slate-400">•</span>
                                                            <span className="text-[9px] text-slate-400 uppercase font-medium">
                                                                {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-12 text-center">
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No recent activity recorded.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200 overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                        <CurrencyIcon className="w-32 h-32" />
                                    </div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-6 font-mono">Financial Snapshot</h4>
                                    <div className="space-y-6 relative z-10">
                                        <div>
                                            <p className="text-3xl font-black tracking-tight">
                                                KES {bursaryFunds.reduce((acc, f) => acc + (f.totalBudget || 0), 0).toLocaleString()}
                                            </p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Total Allocated Budget</p>
                                        </div>
                                        <div className="pt-6 border-t border-white/10">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Disbursement Progress</span>
                                                <span className="text-xs font-black text-indigo-400">
                                                    {Math.round((bursaryFunds.reduce((acc, f) => acc + (f.allocatedAmount || 0), 0) / (bursaryFunds.reduce((acc, f) => acc + (f.totalBudget || 0), 0) || 1)) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full"
                                                    style={{ width: `${(bursaryFunds.reduce((acc, f) => acc + (f.allocatedAmount || 0), 0) / (bursaryFunds.reduce((acc, f) => acc + (f.totalBudget || 0), 0) || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setActiveTab('bursaries'); setBursarySubTab('funds'); }}
                                            className="w-full py-3 bg-white hover:bg-indigo-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all mt-4"
                                        >
                                            Manage Funds
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Quick Actions</h4>
                                    <div className="space-y-3">
                                        <button onClick={() => setShowRegisterModal(true)} className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 flex items-center gap-3 group text-left">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <PlusIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase">Register School</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Add to county registry</p>
                                            </div>
                                        </button>
                                        <button onClick={() => { setActiveTab('bursaries'); setBursarySubTab('vetting'); }} className="w-full p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all border border-slate-100 flex items-center gap-3 group text-left">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <ShieldIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 uppercase">Vetting Board</p>
                                                <p className="text-[10px] text-slate-400 font-medium">Review applications</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'institutions' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    Institutions
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    Schools and colleges within {myCounty.name}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2"
                                >
                                    <SparklesIcon className="w-5 h-5 text-indigo-400" /> Bulk Import
                                </button>
                                <button
                                    onClick={() => setShowRegisterModal(true)}
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                >
                                    <PlusIcon className="w-5 h-5 text-white" /> Register New
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Institution</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Type & Code</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Details</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {myInstitutions.map(inst => (
                                            <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                            🏫
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{inst.name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">{inst.id}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700 uppercase">{inst.institutionType}</span>
                                                        <span className="text-[10px] font-mono text-slate-400">{inst.institutionCode}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                            <span className="opacity-70 text-[10px]">📧</span> {inst.email}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                            <span className="opacity-70 text-[10px]">📞</span> {inst.phoneNumber}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${inst.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        inst.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {inst.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openPerspectiveSelection(inst)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                                        title="Perspective View"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => onLoginAsAdmin && onLoginAsAdmin(inst.id)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                                    >
                                                        Enter Portal
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {myInstitutions.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-12 text-center">
                                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No institutions found in this county.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'staff' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    County Staff
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    Manage administrators and support staff for {myCounty.name}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingStaff(null);
                                    setStaffForm({ name: '', email: '', phoneNumber: '', role: 'county_staff', staffId: '' });
                                    setShowStaffModal(true);
                                }}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            >
                                <PlusIcon className="w-5 h-5 text-white" /> Add Staff Member
                            </button>
                        </div>

                        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff Member</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role & ID</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {myStaff.map(staff => (
                                            <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
                                                            👤
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{staff.name}</div>
                                                            <div className="text-[10px] font-bold text-slate-400">{staff.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${staff.role === 'county_admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                            {formatRole(staff.role)}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-400 mt-1">{staff.staffId || 'No ID'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs font-medium text-slate-600">{staff.phoneNumber || 'No Phone'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingStaff(staff);
                                                                setStaffForm({
                                                                    name: staff.name,
                                                                    email: staff.email,
                                                                    phoneNumber: staff.phoneNumber || '',
                                                                    role: staff.role,
                                                                    staffId: staff.staffId || ''
                                                                });
                                                                setShowStaffModal(true);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        {staff.id !== currentUser.id && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm("Remove this staff member?")) {
                                                                        await onDeleteUser?.(staff.id);
                                                                        onLogAction?.(`Removed staff member: ${staff.name}`);
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <XIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'inventory' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    County Inventory
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    Manage supplies from HQ to schools via drivers and parcels
                                </p>
                            </div>
                            <div className="flex gap-3">
                                {inventorySubTab === 'items' && (
                                    <>
                                        <button
                                            onClick={() => setShowInventoryImportModal(true)}
                                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2"
                                        >
                                            <SparklesIcon className="w-5 h-5 text-indigo-400" /> Bulk Import
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingInventory(null);
                                                setInventoryForm({
                                                    name: '', category: '', quantity: 1, unit: 'Units',
                                                    supplierName: '', targetInstitutionId: '',
                                                    deliveryMethod: 'driver', driverName: '', trackingNumber: ''
                                                });
                                                setShowInventoryModal(true);
                                            }}
                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                        >
                                            <PlusIcon className="w-5 h-5 text-white" /> Log HQ Receipt
                                        </button>
                                    </>
                                )}
                                {inventorySubTab === 'categories' && (
                                    <button
                                        onClick={() => {
                                            setEditingCategory(null);
                                            setCategoryForm({ name: '', description: '' });
                                            setShowCategoryModal(true);
                                        }}
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-5 h-5 text-white" /> New Category
                                    </button>
                                )}
                                {inventorySubTab === 'stores' && (
                                    <button
                                        onClick={() => {
                                            setEditingStore(null);
                                            setStoreForm({ name: '', locationName: '', latitude: 0, longitude: 0, description: '' });
                                            setShowStoreModal(true);
                                        }}
                                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-5 h-5 text-white" /> Add Store/Location
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 p-1.5 bg-slate-100 rounded-2xl w-fit mb-8">
                            <button
                                onClick={() => setInventorySubTab('items')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'items'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Inventory Items
                            </button>
                            <button
                                onClick={() => setInventorySubTab('categories')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'categories'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Categories
                            </button>
                            <button
                                onClick={() => setInventorySubTab('stores')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'stores'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Stores & Locations
                            </button>
                            <button
                                onClick={() => setInventorySubTab('dispatch')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'dispatch'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Dispatch Log
                            </button>
                            <button
                                onClick={() => setInventorySubTab('reports')}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${inventorySubTab === 'reports'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Analytics & Reports
                            </button>
                        </div>

                        {inventorySubTab === 'items' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                                            <ArchiveBoxIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-slate-900">{myInventory.filter(i => i.status === 'at_hq').length}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">At Headquarters</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                            <TruckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-slate-900">{myInventory.filter(i => i.status === 'in_transit').length}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">In Transit</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                                            <CheckCircleIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-slate-900">{myInventory.filter(i => i.status === 'received').length}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivered</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Detail</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status & Path</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Logistics</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {myInventory.map(item => (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                                                    <ArchiveBoxIcon className="w-5 h-5" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.name}</div>
                                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.quantity} {item.unit} • {item.category}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1">
                                                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full w-fit ${item.status === 'at_hq' ? 'bg-slate-100 text-slate-600' :
                                                                    item.status === 'in_transit' ? 'bg-indigo-100 text-indigo-700' :
                                                                        'bg-emerald-100 text-emerald-700'
                                                                    }`}>
                                                                    {item.status.replace('_', ' ')}
                                                                </span>
                                                                <div className="text-[10px] font-medium text-slate-400 flex items-center gap-1 uppercase tracking-tight">
                                                                    HQ <ChevronRightIcon className="w-3 h-3" /> {institutions.find(inst => inst.id === item.targetInstitutionId)?.name || 'Pending Destination'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                                    {item.deliveryMethod === 'driver' ? <UserIcon className="w-3 h-3" /> : <MapPinIcon className="w-3 h-3" />}
                                                                    {item.deliveryMethod === 'driver' ? (item.driverName || 'No Driver') : (item.trackingNumber || 'No Parcel ID')}
                                                                </div>
                                                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                                                    {item.deliveryMethod} delivery
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                                            <div className="flex justify-end gap-2">
                                                                {item.status === 'at_hq' && (
                                                                    <button
                                                                        onClick={() => handleDispatch(item)}
                                                                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors shadow-sm"
                                                                    >
                                                                        Dispatch
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setShowQrModal(item)}
                                                                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                                                    title="View QR Code"
                                                                >
                                                                    <QrCodeIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingInventory(item);
                                                                        setInventoryForm({
                                                                            name: item.name,
                                                                            category: item.category,
                                                                            quantity: item.quantity,
                                                                            unit: item.unit,
                                                                            supplierName: item.supplierName,
                                                                            targetInstitutionId: item.targetInstitutionId || '',
                                                                            deliveryMethod: item.deliveryMethod,
                                                                            driverName: item.driverName || '',
                                                                            trackingNumber: item.trackingNumber || ''
                                                                        });
                                                                        setShowInventoryModal(true);
                                                                    }}
                                                                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                                                >
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (window.confirm("Delete this inventory record?")) {
                                                                            await onDeleteInventoryItem?.(item.id);
                                                                            onLogAction?.(`Deleted inventory record: ${item.name}`);
                                                                        }
                                                                    }}
                                                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                                >
                                                                    <XIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {myInventory.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium" >
                                                            No inventory items found.Add items received at HQ to get started.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                        {inventorySubTab === 'categories' && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Category Name</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Description</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {myCategories.map(cat => (
                                                <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-bold text-slate-900">{cat.name}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm text-slate-500">{cat.description}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingCategory(cat);
                                                                    setCategoryForm({ name: cat.name, description: cat.description });
                                                                    setShowCategoryModal(true);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm("Delete this category?")) {
                                                                        await onDeleteInventoryCategory?.(cat.id);
                                                                        onLogAction?.(`Deleted inventory category: ${cat.name}`);
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <XIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {myCategories.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium">
                                                        No categories found. Create a category to organize your inventory.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {inventorySubTab === 'stores' && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Store Name</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Location</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">GPRS Coordinates</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {myStores.map(store => (
                                                <tr key={store.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-bold text-slate-900">{store.name}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-sm text-slate-500 font-medium">{store.locationName}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">GPS Fix</span>
                                                            <span className="text-xs font-bold font-mono text-slate-600">
                                                                {store.latitude.toFixed(6)}, {store.longitude.toFixed(6)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingStore(store);
                                                                    setStoreForm({
                                                                        name: store.name,
                                                                        locationName: store.locationName,
                                                                        latitude: store.latitude,
                                                                        longitude: store.longitude,
                                                                        description: store.description
                                                                    });
                                                                    setShowStoreModal(true);
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (window.confirm("Delete this store record?")) {
                                                                        await onDeleteStore?.(store.id);
                                                                        onLogAction?.(`Deleted store record: ${store.name}`);
                                                                    }
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <XIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {myStores.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">
                                                        No stores or locations registered yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {inventorySubTab === 'dispatch' && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-8 border-b border-slate-100">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Dispatch History</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Movement Log • In Transit & Delivered</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Dispatched</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Destination</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Logistics</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {myInventory.filter(i => i.status !== 'at_hq').map(item => (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="text-xs font-mono font-bold text-slate-600">
                                                            {item.dispatchedDate ? new Date(item.dispatchedDate).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                        <div className="text-[10px] text-slate-400">
                                                            {item.dispatchedDate ? new Date(item.dispatchedDate).toLocaleTimeString() : ''}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="font-bold text-slate-900 block">{item.name}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase tracking-wide">{item.quantity} {item.unit}</span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                                <BuildingOfficeIcon className="w-3 h-3" />
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">
                                                                {institutions.find(i => i.id === item.targetInstitutionId)?.name || 'Unknown'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-slate-700">
                                                                {item.deliveryMethod === 'driver' ? (item.driverName || 'No Driver') : (item.trackingNumber || 'No ID')}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.deliveryMethod}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${item.status === 'received' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                                            {item.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {myInventory.filter(i => i.status !== 'at_hq').length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                                                        No dispatch history found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {inventorySubTab === 'reports' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                <ChartPieIcon className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Distribution by Category</h3>
                                        </div>
                                        <div className="space-y-4">
                                            {myCategories.map(cat => {
                                                const catItems = myInventory.filter(i => i.category === cat.name);
                                                const totalQty = catItems.reduce((acc, curr) => acc + curr.quantity, 0);
                                                const totalCount = myInventory.reduce((acc, curr) => acc + curr.quantity, 0);
                                                const percentage = totalCount > 0 ? (totalQty / totalCount) * 100 : 0;

                                                return (
                                                    <div key={cat.id}>
                                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2">
                                                            <span className="text-slate-600">{cat.name}</span>
                                                            <span className="text-slate-400">{totalQty} units ({percentage.toFixed(1)}%)</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percentage}%` }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {myCategories.length === 0 && (
                                                <p className="text-center text-slate-400 text-xs py-4">No data available.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                <BuildingOfficeIcon className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Top Destinations</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {Object.entries(
                                                myInventory.filter(i => i.targetInstitutionId).reduce((acc, item) => {
                                                    acc[item.targetInstitutionId!] = (acc[item.targetInstitutionId!] || 0) + 1;
                                                    return acc;
                                                }, {} as Record<string, number>)
                                            )
                                                .sort(([, a], [, b]) => b - a)
                                                .slice(0, 5)
                                                .map(([instId, count]) => {
                                                    const inst = institutions.find(i => i.id === instId);
                                                    return (
                                                        <div key={instId} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-xs">🏫</div>
                                                                <span className="text-xs font-bold text-slate-700">{inst?.name || 'Unknown'}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black bg-white px-2 py-1 rounded-md shadow-sm">{count} Items</span>
                                                        </div>
                                                    );
                                                })}
                                            {myInventory.every(i => !i.targetInstitutionId) && (
                                                <p className="text-center text-slate-400 text-xs py-4">No distribution data available yet.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                                <ChartPieIcon className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Receiving Schools Summary</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">School</th>
                                                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Total Items</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {Object.entries(
                                                        myInventory.filter(i => i.targetInstitutionId).reduce((acc, item) => {
                                                            acc[item.targetInstitutionId!] = (acc[item.targetInstitutionId!] || 0) + item.quantity;
                                                            return acc;
                                                        }, {} as Record<string, number>)
                                                    ).map(([instId, qty]) => {
                                                        const inst = institutions.find(i => i.id === instId);
                                                        return (
                                                            <tr key={instId} className="hover:bg-slate-50/50">
                                                                <td className="px-4 py-3 text-xs font-bold text-slate-700">{inst?.name || 'Unknown'}</td>
                                                                <td className="px-4 py-3 text-xs font-mono font-bold text-slate-600 text-right">{qty}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {myInventory.every(i => !i.targetInstitutionId) && (
                                                        <tr>
                                                            <td colSpan={2} className="px-6 py-6 text-center text-slate-400 text-xs text-[10px] uppercase font-bold tracking-widest">No receiving schools recorded.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                                                <ArchiveBoxIcon className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Low Stock / Needs Restocking</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {myInventory.filter(i => i.status === 'at_hq' && i.quantity < 50).map(item => (
                                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-700">{item.name}</div>
                                                        <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Only {item.quantity} {item.unit} left</div>
                                                    </div>
                                                    <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded shadow-sm">
                                                        Restock
                                                    </button>
                                                </div>
                                            ))}
                                            {myInventory.filter(i => i.status === 'at_hq' && i.quantity < 50).length === 0 && (
                                                <div className="text-center py-6">
                                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-50 rounded-full text-green-600 mb-2">
                                                        <SparklesIcon className="w-6 h-6" />
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock levels look healthy!</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                            <UserGroupIcon className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">School-Level Issuance History</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">School</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {myStockTransactions.filter(tx => tx.type === 'Issue').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
                                                    const inst = institutions.find(i => i.id === tx.institutionId);
                                                    return (
                                                        <tr key={tx.id} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-3 text-[10px] font-mono font-bold text-slate-500">{new Date(tx.date).toLocaleDateString()}</td>
                                                            <td className="px-4 py-3 text-xs font-bold text-slate-700">{inst?.name || 'Unknown'}</td>
                                                            <td className="px-4 py-3 text-xs font-bold text-slate-900">{tx.itemName}</td>
                                                            <td className="px-4 py-3 text-xs font-mono font-black text-indigo-600">{tx.quantity}</td>
                                                            <td className="px-4 py-3 text-xs font-medium text-slate-600">{tx.recipientOrSupplier}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {myStockTransactions.filter(tx => tx.type === 'Issue').length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-6 text-center text-slate-400 text-xs text-[10px] uppercase font-bold tracking-widest">No issuance history found @ schools.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'bursaries' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="mb-8 flex justify-between items-end">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    Bursary & Financial Aid
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    Manage applications, vetting, and disbursement for {myCounty.name}
                                </p>
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'applications', label: 'Applications', icon: ClipboardListIcon },
                                { id: 'vetting', label: 'Vetting', icon: ShieldIcon },
                                { id: 'disbursement', label: 'Disbursement', icon: CheckIcon },
                                { id: 'funds', label: 'County Funds', icon: CurrencyIcon },
                                { id: 'reports', label: 'Reports', icon: ChartPieIcon },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setBursarySubTab(tab.id as any)}
                                    className={`px-4 py-2 border-b-2 font-bold text-sm uppercase tracking-wide transition-colors whitespace-nowrap flex items-center gap-2 ${bursarySubTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {bursarySubTab === 'applications' && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                        <ClipboardListIcon className="w-6 h-6 text-indigo-600" />
                                        Recent Applications
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Institution</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-[13px]">
                                            {bursaryApplications.length > 0 ? (
                                                bursaryApplications.map(app => (
                                                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-900">{app.studentName}</td>
                                                        <td className="px-6 py-4 font-medium text-slate-600">{app.institutionName}</td>
                                                        <td className="px-6 py-4 font-black text-indigo-600">KES {app.amountRequested.toLocaleString()}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${app.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                app.status === 'vetted' ? 'bg-blue-100 text-blue-700' :
                                                                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                        'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {app.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex gap-2">
                                                                <button className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                                                                    <PencilIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">No applications found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {bursarySubTab === 'vetting' && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                            <ShieldIcon className="w-6 h-6 text-indigo-600" />
                                            Verification & Vetting
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Review & Score Applications</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {bursaryApplications.filter(a => a.status === 'pending').length} Pending
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Applicant</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Score/Rank</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Decision</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {bursaryApplications.filter(a => a.status === 'pending' || a.status === 'vetted').map(app => (
                                                <tr key={app.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900">{app.studentName}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium uppercase">{app.institutionName}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500" style={{ width: '65%' }}></div>
                                                            </div>
                                                            <span className="text-[11px] font-black text-slate-700">65/100</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex gap-2 justify-end">
                                                            <button
                                                                onClick={() => onUpdateBursaryApplication?.(app.id, { status: 'vetted' })}
                                                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all font-bold"
                                                            >
                                                                Approve Vetting
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {bursaryApplications.filter(a => a.status === 'pending' || a.status === 'vetted').length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-400 text-[10px] uppercase font-bold tracking-widest">No vetting tasks found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {bursarySubTab === 'disbursement' && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                            <CheckIcon className="w-6 h-6 text-emerald-600" />
                                            Disbursement Tracker
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending Payouts • Bank Batch Ready</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const ready = bursaryApplications.filter(a => a.status === 'vetted' || a.status === 'approved');
                                            if (ready.length === 0) return;
                                            if (window.confirm(`Process batch disbursement for ${ready.length} students?`)) {
                                                ready.forEach(app => {
                                                    onUpdateBursaryApplication?.(app.id, { status: 'disbursed' });
                                                });
                                                onLogAction?.(`Processed batch disbursement for ${ready.length} students.`);
                                            }
                                        }}
                                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                                    >
                                        Disburse All Ready
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Beneficiary</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Institution</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Amount (KES)</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {bursaryApplications.filter(a => a.status === 'vetted' || a.status === 'approved' || a.status === 'disbursed').map(app => (
                                                <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="font-bold text-slate-900 uppercase tracking-tight text-xs">{app.studentName}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono">{app.studentId}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-xs font-bold text-slate-600 uppercase">{app.institutionName}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-slate-900 text-xs">
                                                        {app.amountRequested.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${app.status === 'disbursed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            {app.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        {app.status !== 'disbursed' && (
                                                            <button
                                                                onClick={() => {
                                                                    onUpdateBursaryApplication?.(app.id, { status: 'disbursed' });
                                                                    onLogAction?.(`Disbursed KES ${app.amountRequested.toLocaleString()} to ${app.studentName}`);
                                                                }}
                                                                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition-all"
                                                            >
                                                                Confirm Payout
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {bursaryApplications.filter(a => a.status === 'vetted' || a.status === 'approved' || a.status === 'disbursed').length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                                        No disbursement records found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {bursarySubTab === 'funds' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-3">
                                            <CurrencyIcon className="w-6 h-6 text-indigo-600" />
                                            County Bursary Funds
                                        </h3>
                                        <button
                                            onClick={() => {
                                                setEditingFund(null);
                                                setFundForm({ name: '', totalBudget: 0, financialYear: new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString(), publicParticipationLink: '' });
                                                setShowFundModal(true);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                                        >
                                            <PlusIcon className="w-4 h-4" /> New Fund
                                        </button>
                                    </div>
                                    <div className="p-8">
                                        <div className="space-y-4">
                                            {bursaryFunds.map(fund => (
                                                <div key={fund.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="font-black text-slate-900 uppercase tracking-tight">{fund.name}</h4>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Year {fund.financialYear}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFund(fund);
                                                                    setFundForm({
                                                                        name: fund.name,
                                                                        totalBudget: fund.totalBudget,
                                                                        financialYear: fund.financialYear,
                                                                        publicParticipationLink: fund.publicParticipationLink || ''
                                                                    });
                                                                    setShowFundModal(true);
                                                                }}
                                                                className="p-2 bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all shadow-sm border border-slate-100"
                                                            >
                                                                <PencilIcon className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm('Are you sure you want to delete this fund? This action cannot be undone.')) {
                                                                        onDeleteBursaryFund?.(fund.id);
                                                                        onLogAction?.(`Deleted bursary fund: ${fund.name}`);
                                                                    }
                                                                }}
                                                                className="p-2 bg-white text-slate-400 hover:text-red-600 rounded-xl transition-all shadow-sm border border-slate-100"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest self-start">
                                                                {((fund.allocatedAmount - fund.remainingAmount) / fund.allocatedAmount * 100).toFixed(1)}% DISBURSED
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {fund.publicParticipationLink && (
                                                        <div className="mb-2">
                                                            <a href={fund.publicParticipationLink} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                                                <span className="underline">Public Participation Link</span>
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                            </a>
                                                        </div>
                                                    )}
                                                    <div className="mb-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Application Link</span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(`${window.location.origin}/apply/bursary?fundId=${fund.id}`);
                                                                    alert('Application link copied to clipboard!');
                                                                }}
                                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-1 rounded shadow-sm flex items-center gap-1"
                                                            >
                                                                <ClipboardListIcon className="w-3 h-3" /> Copy Link
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                            <span className="text-slate-400">Allocation Tracker</span>
                                                            <span className="text-slate-900">KES {fund.remainingAmount.toLocaleString()} Left</span>
                                                        </div>
                                                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                                                                style={{ width: `${(fund.allocatedAmount - fund.remainingAmount) / fund.allocatedAmount * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {bursaryFunds.length === 0 && (
                                                <div className="text-center py-8">
                                                    <CurrencyIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active bursary funds configured.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                                            <ShieldIcon className="w-4 h-4 text-indigo-400" /> Vetting Policy
                                        </h4>
                                        <p className="text-sm font-medium text-slate-300 leading-relaxed mb-6">
                                            Applications are automatically ranked based on socioeconomic factors and academic performance records registered in the portal.
                                        </p>
                                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                            Configure Scoring
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {bursarySubTab === 'reports' && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-12 text-center">
                                <div className="max-w-xs mx-auto space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                        <ChartPieIcon className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Bursary Analytics</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generate distribution reports by Ward or Institution type.</p>
                                    <button className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                                        Export CSV
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {
                    activeTab === 'settings' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="mb-8">
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                    Portal Settings
                                </h2>
                                <p className="text-slate-500 font-medium">
                                    Configure portal preferences and appearance
                                </p>
                            </div>

                            <div className="flex border-b border-slate-200 mb-6">
                                <button
                                    onClick={() => setSettingsSubTab('branding')}
                                    className={`px-4 py-2 border-b-2 font-bold text-sm uppercase tracking-wide transition-colors ${settingsSubTab === 'branding'
                                        ? 'border-indigo-600 text-indigo-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                        }`}
                                >
                                    <SparklesIcon className="w-4 h-4 inline mr-2" />
                                    Branding
                                </button>
                            </div>

                            {settingsSubTab === 'branding' && (
                                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 max-w-2xl">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                                            <SparklesIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Visual Identity</h3>
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Manage Logo & Colors</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Logo Section */}
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Official Logo / Coat of Arms</h4>
                                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors group cursor-pointer relative min-h-[160px] flex flex-col items-center justify-center">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileUpload(e, 'logo')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    {logoPreview ? (
                                                        <div className="relative z-0 w-full">
                                                            <img src={logoPreview} alt="Logo Preview" className="h-24 mx-auto object-contain mb-2" />
                                                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide bg-green-50 inline-block px-2 py-1 rounded-full">Image Selected</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3 pointer-events-none">
                                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mx-auto group-hover:bg-indigo-100 transition-colors">
                                                                <ArrowUpTrayIcon className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700">Click to Upload Logo</p>
                                                                <p className="text-[10px] text-slate-400">PNG, SVG or JPG (Max 2MB)</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Or use Image URL</label>
                                                    <input type="url" placeholder="https://example.com/logo.png" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-600" />
                                                </div>
                                            </div>

                                            {/* Letterhead Section */}
                                            <div>
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Official Letterhead Header</h4>
                                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors group cursor-pointer relative min-h-[160px] flex flex-col items-center justify-center">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileUpload(e, 'letterhead')}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    {letterheadPreview ? (
                                                        <div className="relative z-0 w-full">
                                                            <img src={letterheadPreview} alt="Letterhead Preview" className="h-24 w-full object-cover rounded-lg mb-2 opacity-90" />
                                                            <p className="text-[10px] text-green-600 font-bold uppercase tracking-wide bg-green-50 inline-block px-2 py-1 rounded-full">Header Selected</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3 pointer-events-none">
                                                            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mx-auto group-hover:bg-slate-100 transition-colors">
                                                                <ArrowUpTrayIcon className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700">Upload Header Graphic</p>
                                                                <p className="text-[10px] text-slate-400">Full Width Banner (PNG/JPG)</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    <p className="text-[10px] text-slate-400 leading-relaxed">
                                                        This header image will appear on all official PDF reports generated by institutions within your county.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Primary Brand Color</label>
                                                <div className="flex items-center gap-3">
                                                    <input type="color" className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent" defaultValue="#4f46e5" />
                                                    <div className="flex-1">
                                                        <input type="text" defaultValue="#4f46e5" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Secondary Brand Color</label>
                                                <div className="flex items-center gap-3">
                                                    <input type="color" className="w-12 h-12 rounded-xl cursor-pointer border-none p-0 bg-transparent" defaultValue="#1e293b" />
                                                    <div className="flex-1">
                                                        <input type="text" defaultValue="#1e293b" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                                            <button className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wide rounded-xl shadow-xl shadow-indigo-500/20 transition-all">
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Registration Modal */}
                {
                    showRegisterModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
                            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                                <div className="bg-indigo-600 px-8 py-6 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-black text-white p-0 m-0 leading-tight">New Institution</h3>
                                        <p className="text-indigo-200 text-xs font-medium mt-1">Register a new school in {myCounty.name}</p>
                                    </div>
                                    <button
                                        onClick={() => setShowRegisterModal(false)}
                                        className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                <form onSubmit={handleRegisterSubmit} className="p-8 space-y-5">
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">School Details</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder="Institution Name"
                                                    value={registerData.name}
                                                    onChange={e => setRegisterData({ ...registerData, name: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    required
                                                    type="email"
                                                    placeholder="Official Email"
                                                    value={registerData.email}
                                                    onChange={e => setRegisterData({ ...registerData, email: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    required
                                                    type="tel"
                                                    placeholder="Phone Number"
                                                    value={registerData.phoneNumber}
                                                    onChange={e => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <select
                                                    value={registerData.type}
                                                    onChange={e => setRegisterData({ ...registerData, type: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer appearance-none"
                                                >
                                                    <option value="Primary">Primary School</option>
                                                    <option value="Secondary">Secondary School</option>
                                                    <option value="University">University</option>
                                                    <option value="College">College</option>
                                                    <option value="Polytechnic">Polytechnic</option>
                                                    <option value="Institute">Institute</option>
                                                    <option value="ECD">ECD Center</option>
                                                    <option value="International">International School</option>
                                                    <option value="HIS">Health Information System (HIS)</option>
                                                </select>
                                            </div>

                                            <div className="col-span-2 grid grid-cols-3 gap-4">
                                                <div>
                                                    <input
                                                        type="text"
                                                        placeholder="Sub-County"
                                                        value={registerData.subCounty}
                                                        onChange={e => setRegisterData({ ...registerData, subCounty: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        placeholder="Constituency"
                                                        value={registerData.constituency}
                                                        onChange={e => setRegisterData({ ...registerData, constituency: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        type="text"
                                                        placeholder="Ward"
                                                        value={registerData.ward}
                                                        onChange={e => setRegisterData({ ...registerData, ward: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:font-medium placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Administrator Account</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <input
                                                        required
                                                        type="text"
                                                        placeholder="Admin Full Name"
                                                        value={registerData.adminName}
                                                        onChange={e => setRegisterData({ ...registerData, adminName: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        required
                                                        type="email"
                                                        placeholder="Admin Email"
                                                        value={registerData.adminEmail}
                                                        onChange={e => setRegisterData({ ...registerData, adminEmail: e.target.value })}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium">
                                                * A temporary password will be generated and shown after registration.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowRegisterModal(false)}
                                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase tracking-wide transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-wide shadow-lg shadow-indigo-200 transition-colors"
                                        >
                                            Create Account
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    showImportModal && myCounty && (
                        <SmartInstitutionImporterModal
                            onClose={() => setShowImportModal(false)}
                            onImport={async (data) => {
                                if (onImportInstitutions) {
                                    await onImportInstitutions(data);
                                    onLogAction?.(`Bulk imported ${data.length} institutions to county registry`);
                                }
                            }}
                            countyId={myCounty.id}
                        />
                    )
                }

                {
                    showInventoryImportModal && myCounty && (
                        <SmartInventoryImporterModal
                            onClose={() => setShowInventoryImportModal(false)}
                            onImport={async (items) => {
                                if (onAddInventoryItem) {
                                    for (const item of items) {
                                        await onAddInventoryItem(item);
                                    }
                                    onLogAction?.(`Bulk imported ${items.length} inventory items to HQ records`);
                                }
                                setShowInventoryImportModal(false);
                            }}
                            countyId={myCounty.id}
                            institutions={institutions}
                        />
                    )
                }

                {
                    showStaffModal && (
                        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                                            {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">County Internal Registry</p>
                                    </div>
                                    <button onClick={() => setShowStaffModal(false)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
                                        <XIcon className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                <form onSubmit={handleStaffSubmit} className="p-8 space-y-5">
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1 group-focus-within:text-indigo-600 transition-colors">Full Name</label>
                                            <div className="relative">
                                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={staffForm.name}
                                                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                                                    placeholder="e.g. John Doe"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1 group-focus-within:text-indigo-600 transition-colors">Email Address</label>
                                                <div className="relative">
                                                    <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                                    <input
                                                        type="email"
                                                        required
                                                        value={staffForm.email}
                                                        onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                                                        placeholder="john@county.go.ke"
                                                    />
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1 group-focus-within:text-indigo-600 transition-colors">Phone Number</label>
                                                <div className="relative">
                                                    <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                                    <input
                                                        type="tel"
                                                        value={staffForm.phoneNumber}
                                                        onChange={e => setStaffForm({ ...staffForm, phoneNumber: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                                                        placeholder="0712 345 678"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1 group-focus-within:text-indigo-600 transition-colors">Role</label>
                                                <select
                                                    required
                                                    value={staffForm.role}
                                                    onChange={e => setStaffForm({ ...staffForm, role: e.target.value as Role })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="county_staff">County Staff</option>
                                                    <option value="county_admin">County Admin</option>
                                                    <option value="county_secretary">Secretary</option>
                                                    <option value="county_driver">Driver</option>
                                                    <option value="county_store_keeper">Store Keeper</option>
                                                    <option value="county_teacher">Teacher</option>
                                                    <option value="county_director">Director</option>
                                                    <option value="county_co">CO</option>
                                                    <option value="county_cec">CEC</option>
                                                    <option value="county_deputy_governor">Deputy Governor</option>
                                                    <option value="county_governor">Governor</option>
                                                </select>
                                            </div>
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1 group-focus-within:text-indigo-600 transition-colors">Staff ID</label>
                                                <div className="relative">
                                                    <FingerPrintIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={staffForm.staffId}
                                                        onChange={e => setStaffForm({ ...staffForm, staffId: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium uppercase"
                                                        placeholder="CS-001"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowStaffModal(false)}
                                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase tracking-wide transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-wide shadow-lg shadow-indigo-200 transition-colors"
                                        >
                                            {editingStaff ? 'Update Record' : 'Create Account'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }
                {
                    showStoreModal && (
                        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                                            {editingStore ? 'Edit Store/Location' : 'New Store/Location'}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Infrastructure • GPS Mapping</p>
                                    </div>
                                    <button onClick={() => setShowStoreModal(false)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
                                        <XIcon className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                <form onSubmit={handleStoreSubmit} className="p-8 space-y-5">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Store Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={storeForm.name}
                                                    onChange={e => setStoreForm({ ...storeForm, name: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                                                    placeholder="e.g. Central Warehouse"
                                                />
                                            </div>
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Location Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={storeForm.locationName}
                                                    onChange={e => setStoreForm({ ...storeForm, locationName: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                                                    placeholder="e.g. HQ Basement"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5 ml-1">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Coordinates</label>
                                                <button
                                                    type="button"
                                                    onClick={handleGetLocation}
                                                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors bg-indigo-50 px-2 py-1 rounded-lg active:scale-95"
                                                >
                                                    <MapPinIcon className="w-3 h-3" /> Auto-Detect
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    required
                                                    value={storeForm.latitude}
                                                    onChange={e => setStoreForm({ ...storeForm, latitude: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono font-bold text-xs"
                                                    placeholder="Latitude"
                                                />
                                                <input
                                                    type="number"
                                                    step="any"
                                                    required
                                                    value={storeForm.longitude}
                                                    onChange={e => setStoreForm({ ...storeForm, longitude: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-mono font-bold text-xs"
                                                    placeholder="Longitude"
                                                />
                                            </div>
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Description</label>
                                            <textarea
                                                value={storeForm.description}
                                                onChange={e => setStoreForm({ ...storeForm, description: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                                                placeholder="Access details, storage capacity etc..."
                                                rows={2}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowStoreModal(false)}
                                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase tracking-wide transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-wide shadow-lg shadow-indigo-200 transition-colors"
                                        >
                                            {editingStore ? 'Update Location' : 'Register Location'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    showCategoryModal && (
                        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                                            {editingCategory ? 'Edit Category' : 'New Category'}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Inventory Structure</p>
                                    </div>
                                    <button onClick={() => setShowCategoryModal(false)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
                                        <XIcon className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                <form onSubmit={handleCategorySubmit} className="p-8 space-y-5">
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Category Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={categoryForm.name}
                                                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                                                placeholder="e.g. Stationery, Furniture"
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Description</label>
                                            <textarea
                                                value={categoryForm.description}
                                                onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                                                placeholder="Briefly describe what this category includes..."
                                                rows={3}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowCategoryModal(false)}
                                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase tracking-wide transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-wide shadow-lg shadow-indigo-200 transition-colors"
                                        >
                                            {editingCategory ? 'Update' : 'Create'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    showInventoryModal && (
                        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                                            {editingInventory ? 'Edit Inventory Log' : 'Log HQ Receipt'}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">HQ Registry • Supplies Management</p>
                                    </div>
                                    <button onClick={() => setShowInventoryModal(false)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
                                        <XIcon className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                <form onSubmit={handleInventorySubmit} className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Item Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={inventoryForm.name}
                                                    onChange={e => setInventoryForm({ ...inventoryForm, name: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                                                    placeholder="e.g. Science Lab Kits"
                                                />
                                            </div>
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Category</label>
                                                <select
                                                    required
                                                    value={inventoryForm.category}
                                                    onChange={e => setInventoryForm({ ...inventoryForm, category: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select Category</option>
                                                    {myCategories.map(cat => (
                                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="group">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Quantity</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        min="1"
                                                        value={inventoryForm.quantity}
                                                        onChange={e => setInventoryForm({ ...inventoryForm, quantity: parseInt(e.target.value) })}
                                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold"
                                                    />
                                                </div>
                                                <div className="group">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Unit</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={inventoryForm.unit}
                                                        onChange={e => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                                                        placeholder="Boxes"
                                                    />
                                                </div>
                                            </div>
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Supplier</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={inventoryForm.supplierName}
                                                    onChange={e => setInventoryForm({ ...inventoryForm, supplierName: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                                                    placeholder="e.g. Apex Scientific Ltd"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Target School/Institution</label>
                                                <select
                                                    required
                                                    value={inventoryForm.targetInstitutionId}
                                                    onChange={e => setInventoryForm({ ...inventoryForm, targetInstitutionId: e.target.value })}
                                                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                                                >
                                                    <option value="">Select Destination</option>
                                                    {institutions.filter(inst => inst.countyId === myCounty?.id).map(inst => (
                                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="group">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Delivery Method</label>
                                                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setInventoryForm({ ...inventoryForm, deliveryMethod: 'driver' })}
                                                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inventoryForm.deliveryMethod === 'driver' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                                    >
                                                        County Driver
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setInventoryForm({ ...inventoryForm, deliveryMethod: 'parcel' })}
                                                        className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inventoryForm.deliveryMethod === 'parcel' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                                                    >
                                                        Parcel Service
                                                    </button>
                                                </div>
                                            </div>
                                            {inventoryForm.deliveryMethod === 'driver' ? (
                                                <div className="group">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Driver Name</label>
                                                    <input
                                                        type="text"
                                                        value={inventoryForm.driverName}
                                                        onChange={e => setInventoryForm({ ...inventoryForm, driverName: e.target.value })}
                                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                                                        placeholder="Enter driver name"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="group">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Tracking/Parcel ID</label>
                                                    <input
                                                        type="text"
                                                        value={inventoryForm.trackingNumber}
                                                        onChange={e => setInventoryForm({ ...inventoryForm, trackingNumber: e.target.value })}
                                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium"
                                                        placeholder="e.g. G4S-12345"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowInventoryModal(false)}
                                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase tracking-wide transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-wide shadow-lg shadow-indigo-200 transition-colors"
                                        >
                                            {editingInventory ? 'Update Record' : 'Log Receipt'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {
                    showQrModal && (
                        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                                <div className="p-8 text-center bg-slate-50/50">
                                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">QR Receipt Code</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Scan at Destination</p>
                                </div>
                                <div className="p-10 flex flex-col items-center gap-8">
                                    <div className="p-4 bg-white rounded-3xl shadow-xl border border-slate-100">
                                        {/* Using a simple container for the QR. In a real app we'd use a canvas renderer */}
                                        <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 group relative">
                                            <QrCodeIcon className="w-24 h-24 text-slate-300" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-white/90 transition-opacity rounded-2xl p-4 text-center">
                                                <p className="text-[10px] font-bold text-slate-600 uppercase leading-loose">
                                                    ID: {showQrModal.qrCode}<br />
                                                    Click to Print Label
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-1">{showQrModal.name}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{showQrModal.quantity} {showQrModal.unit}</div>
                                    </div>
                                    <button
                                        onClick={() => setShowQrModal(null)}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    showDispatchModal && (
                        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Confirm Dispatch</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Proof of Handover</p>
                                    </div>
                                    <button onClick={() => setShowDispatchModal(null)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
                                        <XIcon className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Received By / Driver Name</label>
                                            <input
                                                type="text"
                                                value={dispatchForm.recipientName}
                                                onChange={e => setDispatchForm({ ...dispatchForm, recipientName: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium"
                                                placeholder="Enter recipient's name"
                                            />
                                        </div>

                                        <div className="group">
                                            <div className="flex justify-between items-center mb-1.5 ml-1">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient Signature</label>
                                                <button
                                                    type="button"
                                                    onClick={clearSignature}
                                                    className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:text-indigo-800"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                            <div className="border-2 border-slate-100 rounded-2xl overflow-hidden bg-slate-50 touch-none">
                                                <canvas
                                                    ref={canvasRef}
                                                    width={400}
                                                    height={160}
                                                    className="w-full h-40 cursor-crosshair"
                                                    onMouseDown={startDrawing}
                                                    onMouseMove={draw}
                                                    onMouseUp={stopDrawing}
                                                    onMouseLeave={stopDrawing}
                                                    onTouchStart={startDrawing}
                                                    onTouchMove={draw}
                                                    onTouchEnd={stopDrawing}
                                                />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium mt-2 text-center">Sign within the box above to confirm receipt</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowDispatchModal(null)}
                                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase tracking-wide transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={confirmDispatch}
                                            disabled={!dispatchForm.recipientName}
                                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black uppercase tracking-wide shadow-lg shadow-indigo-200 transition-colors"
                                        >
                                            Confirm Dispatch
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    showFundModal && (
                        <div className="fixed inset-0 bg-black/60 z-[130] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">
                                            {editingFund ? 'Edit Fund' : 'New Bursary Fund'}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Budget Allocation • {myCounty.name}</p>
                                    </div>
                                    <button onClick={() => setShowFundModal(false)} className="p-2 rounded-xl hover:bg-slate-200 transition-colors">
                                        <XIcon className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>

                                <form onSubmit={handleFundSubmit} className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="group">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Fund Name</label>
                                            <input
                                                type="text"
                                                required
                                                value={fundForm.name}
                                                onChange={e => setFundForm({ ...fundForm, name: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold placeholder:text-slate-300"
                                                placeholder="e.g. County Bursary 2024"
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Total Budget (KES)</label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                value={fundForm.totalBudget}
                                                onChange={e => setFundForm({ ...fundForm, totalBudget: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-black text-indigo-600"
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Financial Year</label>
                                            <input
                                                type="text"
                                                required
                                                value={fundForm.financialYear}
                                                onChange={e => setFundForm({ ...fundForm, financialYear: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold"
                                                placeholder="2024/2025"
                                            />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">Public Participation Link (Optional)</label>
                                        <input
                                            type="url"
                                            value={fundForm.publicParticipationLink}
                                            onChange={e => setFundForm({ ...fundForm, publicParticipationLink: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all font-medium text-slate-600"
                                            placeholder="https://meeting-link.com"
                                        />
                                    </div>


                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowFundModal(false)}
                                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-black uppercase tracking-wide transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black uppercase tracking-wide shadow-lg shadow-indigo-200 transition-colors"
                                        >
                                            {editingFund ? 'Save Changes' : 'Initialize Fund'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div >
                    )
                }
                {activeTab === 'external_module' && (
                    <div className="animate-fade-in-up h-[calc(100vh-8rem)]">
                        <ExternalModuleView
                            title="EduAI Advanced Analytics & Support Portal"
                            url="https://support.edualloc.com"
                            description="Independent portal for system-wide analytics, support tickets, and advanced platform configuration."
                        />
                    </div>
                )}
            </main >

            {/* Perspective Switching Modal */}
            {isPerspectiveModalOpen && selectedTenantForPerspective && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPerspectiveModalOpen(false)}>
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">Perspective Switcher</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Impersonate {selectedTenantForPerspective.name}</p>
                            </div>
                            <button onClick={() => setIsPerspectiveModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                                <XIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {perspectiveOptions.map(opt => (
                                <button
                                    key={opt.role}
                                    onClick={() => {
                                        onLoginAsAdmin?.(selectedTenantForPerspective.id, opt.role as Role);
                                        setIsPerspectiveModalOpen(false);
                                    }}
                                    className={`flex items-center gap-4 p-5 rounded-3xl border-2 border-transparent transition-all text-left group hover:border-indigo-500 ${opt.color}`}
                                >
                                    <div className="p-3 bg-white rounded-2xl shadow-sm transition-transform group-hover:scale-110">
                                        {opt.icon}
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                            <p className="text-xs text-slate-400 font-medium">Selecting a perspective will instantly launch that module's view for this institution.</p>
                        </div>
                    </div>
                </div>
            )}

            {showImportModal && onImportInstitutions && (
                <SmartInstitutionImporterModal
                    countyId={myCounty.id}
                    onClose={() => setShowImportModal(false)}
                    onImport={async (data) => {
                        await onImportInstitutions(data);
                        setShowImportModal(false);
                    }}
                />
            )}
        </div>
    );
};
